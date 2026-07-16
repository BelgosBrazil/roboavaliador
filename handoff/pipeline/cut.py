"""Corta screen-main.webm nos slates pretos e gera os clipes VP9 do vídeo v2.
Segmentos esperados, na ordem: A (brief), E (RD), B (DNS), C (auditoria), D (scroll), idle (pdf).
clipF vem de screen-pdf.webm. Imprime a sugestão de DUR por slide no final.
"""
import json, re, subprocess, sys

SP = "/tmp/claude-0/-home-user-roboavaliador/39d9ebd5-71cc-5d2a-a6a5-6b2a7c4dea23/scratchpad"
FF = "/opt/node22/lib/node_modules/@ffmpeg-installer/ffmpeg/node_modules/@ffmpeg-installer/linux-x64/ffmpeg"
FP = FF.replace("/ffmpeg", "/ffmpeg")  # ffprobe não existe no pacote; medimos com ffmpeg

def sh(args):
    return subprocess.run(args, capture_output=True, text=True)

def duration_of(path):
    r = sh([FF, "-hide_banner", "-i", path])
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    h, mn, s = float(m.group(1)), float(m.group(2)), float(m.group(3))
    return h * 3600 + mn * 60 + s

def blackdetect(path):
    r = sh([FF, "-hide_banner", "-i", path, "-vf", "blackdetect=d=0.35:pix_th=0.02:pic_th=0.95", "-an", "-f", "null", "-"])
    out = r.stderr
    blacks = []
    for m in re.finditer(r"black_start:([0-9.]+) black_end:([0-9.]+)", out):
        blacks.append((float(m.group(1)), float(m.group(2))))
    return blacks

def encode(src, dst, ss, dur, speed=1.0, extra_vf=""):
    vf = f"setpts=PTS/{speed}"
    if extra_vf:
        vf += "," + extra_vf
    args = [FF, "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{ss:.2f}", "-t", f"{dur:.2f}", "-i", src,
            "-vf", vf, "-r", "30",
            "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0", "-cpu-used", "5", "-row-mt", "1", "-threads", "4", "-an", dst]
    r = sh(args)
    if r.returncode != 0:
        print("ERRO", dst, r.stderr[-400:]); sys.exit(1)
    print("ok", dst, f"{duration_of(dst):.1f}s")

def montage_c(src, dst, ss, end):
    """clipC: começo 1x (6s), miolo em timelapse (5s), final 1x (4s)."""
    total = end - ss
    head, tail, mid_target = 6.0, 4.0, 5.0
    mid = max(total - head - tail, 1.0)
    factor = mid / mid_target
    fc = (
        f"[0:v]trim=start={ss:.2f}:end={ss+head:.2f},setpts=PTS-STARTPTS[v1];"
        f"[0:v]trim=start={ss+head:.2f}:end={end-tail:.2f},setpts=(PTS-STARTPTS)/{factor:.3f}[v2];"
        f"[0:v]trim=start={end-tail:.2f}:end={end:.2f},setpts=PTS-STARTPTS[v3];"
        f"[v1][v2][v3]concat=n=3:v=1:a=0,fps=30[v]"
    )
    args = [FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
            "-filter_complex", fc, "-map", "[v]",
            "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0", "-cpu-used", "5", "-row-mt", "1", "-threads", "4", "-an", dst]
    r = sh(args)
    if r.returncode != 0:
        print("ERRO", dst, r.stderr[-400:]); sys.exit(1)
    print("ok", dst, f"{duration_of(dst):.1f}s (miolo {factor:.0f}x)")

main = f"{SP}/screen-main.webm"
pdf = f"{SP}/screen-pdf.webm"
total = duration_of(main)
blacks = blackdetect(main)
print("duração:", round(total, 1), "blacks:", [(round(a,1), round(b,1)) for a, b in blacks])

# segmentos = trechos entre blacks
segs = []
prev_end = 0.0
for (bs, be) in blacks:
    if bs - prev_end >= 2.0:
        segs.append((prev_end, bs))
    prev_end = be
if total - prev_end >= 2.0:
    segs.append((prev_end, total))
print("segmentos:", [(round(a,1), round(b,1)) for a, b in segs])

if len(segs) < 6:
    print("ERRO: menos de 6 segmentos detectados"); sys.exit(1)

# o 1º trecho é o carregamento da página antes do slate inicial; usamos os últimos 6
A, E, B, C, D, _idle = segs[-6:]
subprocess.run(["mkdir", "-p", f"{SP}/clips"])

# A: acelera para ~24s (margens de 0.3s)
a0, a1 = A[0] + 0.25, A[1] - 0.25
encode(main, f"{SP}/clips/a.webm", a0, a1 - a0, speed=(a1 - a0) / 24.0)
# E: leve aceleração para ~8s
e0, e1 = E[0] + 0.2, E[1] - 0.2
encode(main, f"{SP}/clips/e.webm", e0, e1 - e0, speed=max((e1 - e0) / 8.0, 1.0))
# B: tempo real (máx 10s)
b0, b1 = B[0] + 0.2, B[1] - 0.2
encode(main, f"{SP}/clips/b.webm", b0, b1 - b0, speed=max((b1 - b0) / 10.0, 1.0))
# C: montagem com timelapse
montage_c(main, f"{SP}/clips/c.webm", C[0] + 0.2, C[1] - 0.2)
# D: leve aceleração para ~12.5s
d0, d1 = D[0] + 0.2, D[1] - 0.2
encode(main, f"{SP}/clips/d.webm", d0, d1 - d0, speed=max((d1 - d0) / 12.5, 1.0))
# F: pdf popup inteiro (aparado)
fdur = duration_of(pdf)
encode(pdf, f"{SP}/clips/f.webm", 0.3, fdur - 0.5, speed=max((fdur - 0.8) / 9.0, 1.0))

# sugestão de DUR por slide (intro/estáticos fixos + clipes medidos)
clips = {k: duration_of(f"{SP}/clips/{k}.webm") for k in ["a", "e", "b", "c", "d", "f"]}
dur = [7500, 7500, 8500,
       int((clips["a"] + 2.2) * 1000),
       int((clips["e"] + 2.6) * 1000),
       int((clips["b"] + 2.6) * 1000),
       int((clips["c"] + 2.4) * 1000),
       int((clips["d"] + 2.6) * 1000),
       int((clips["f"] + 2.2) * 1000),
       8000, 7000, 9000]
print("CLIPES:", json.dumps({k: round(v, 1) for k, v in clips.items()}))
print("DUR sugerido:", dur, "total:", round(sum(dur) / 1000, 1), "s")
