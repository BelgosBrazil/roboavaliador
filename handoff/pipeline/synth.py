"""Trilha ambiente tech para o vídeo do Roboavaliador.
Uso: python3 synth.py <duração_segundos> <saida.wav> [marcas_de_transição "t1,t2,..."]
Pad de acordes suave + sub + arpejo esparso + swells nas transições. Tudo sintetizado, sem samples.
"""
import sys, wave, struct
import numpy as np

DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 140.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "music.wav"
MARKS = [float(x) for x in sys.argv[3].split(",") if x.strip()] if len(sys.argv) > 3 else []

SR = 44100
N = int(DUR * SR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)

def midi_hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def soft_tone(freq, n, detune=0.0):
    """Tom quente: primeiros 7 harmônicos decaindo, levemente destunado."""
    x = np.zeros(n)
    tt = np.arange(n) / SR
    f = freq * (1 + detune)
    for h in range(1, 8):
        x += np.sin(2 * np.pi * f * h * tt + rng.uniform(0, 6.283)) / (h ** 1.9)
    return x

def env_ar(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    na, nr = min(na, n), min(nr, n)
    if na > 0: e[:na] = np.linspace(0, 1, na)
    if nr > 0: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def onepole_lp(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    # filtro em blocos para velocidade
    from numpy import frombuffer
    y = np.copy(x)
    coef = 1 - a
    for i in range(1, len(y)):
        y[i] = y[i - 1] * coef + x[i] * a
    return y

# ---------- progressão: Dm9, Bbmaj7, Fmaj7, Cadd9 (2 compassos cada, 88 bpm) ----------
BPM = 88
BEAT = 60 / BPM
BAR = BEAT * 4
CHORD_LEN = BAR * 2
CHORDS = [
    [50, 57, 60, 64, 69],   # D  A  C  E  A' (Dm9)
    [46, 53, 57, 60, 65],   # Bb F  A  C  F' (Bbmaj7)
    [41, 53, 57, 60, 64],   # F  F  A  C  E  (Fmaj7)
    [48, 55, 60, 62, 67],   # C  G  C  D  G  (Cadd9)
]

padL = np.zeros(N)
padR = np.zeros(N)
pos = 0.0
ci = 0
xfade = int(1.4 * SR)
while pos < DUR:
    n0 = int(pos * SR)
    seg = min(int(CHORD_LEN * SR) + xfade, N - n0)
    if seg <= 0: break
    chord = CHORDS[ci % len(CHORDS)]
    e = env_ar(seg, 1.3, 1.5)
    for m in chord:
        f = midi_hz(m)
        padL[n0:n0 + seg] += soft_tone(f, seg, detune=+0.0013) * e
        padR[n0:n0 + seg] += soft_tone(f, seg, detune=-0.0013) * e
    ci += 1
    pos += CHORD_LEN

padL = onepole_lp(padL, 1050) * 0.16
padR = onepole_lp(padR, 1050) * 0.16

# ---------- sub nos tempos 1 e 3 ----------
sub = np.zeros(N)
roots = [38, 34, 29, 36]  # D1, Bb0, F0... (raiz - 12)
pos = 0.0
ci = 0
while pos < DUR:
    root = midi_hz(roots[ci % 4])
    for b in (0, 2):
        s0 = int((pos + b * BEAT) * SR)
        if s0 >= N: break
        n = min(int(BEAT * 1.6 * SR), N - s0)
        tt = np.arange(n) / SR
        sub[s0:s0 + n] += np.sin(2 * np.pi * root * tt) * env_ar(n, 0.02, 0.45) * 0.10
    ci += 1
    pos += CHORD_LEN

# ---------- arpejo esparso (entra aos 25%) ----------
arp = np.zeros(N)
scale = [74, 77, 79, 81, 84, 86, 89]  # pentatônica D menor estendida, oitava alta
step = BEAT / 2
start = DUR * 0.22
k = 0
pos = start
while pos < DUR - 3:
    if rng.random() < 0.42:
        m = scale[int(rng.integers(0, len(scale)))]
        f = midi_hz(m)
        s0 = int(pos * SR)
        n = min(int(0.5 * SR), N - s0)
        tt = np.arange(n) / SR
        note = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(4 * np.pi * f * tt)) * env_ar(n, 0.006, 0.42) * 0.045
        arp[s0:s0 + n] += note
        # eco simples
        d = int(step * 1.5 * SR)
        if s0 + d + n < N:
            arp[s0 + d:s0 + d + n] += note * 0.45
    pos += step
    k += 1

# fade-in do arpejo
fi0, fi1 = int(start * SR), int(min(start + 8, DUR) * SR)
ramp = np.zeros(N); ramp[fi1:] = 1
if fi1 > fi0: ramp[fi0:fi1] = np.linspace(0, 1, fi1 - fi0)
arp *= ramp

# ---------- swells de transição ----------
swell = np.zeros(N)
noise = rng.standard_normal(N) * 0.5
noise = onepole_lp(noise, 1400)
for mk in MARKS:
    n1 = int(mk * SR)
    n0 = max(0, n1 - int(1.1 * SR))
    if n1 <= 0 or n0 >= N: continue
    n = n1 - n0
    e = (np.linspace(0, 1, n) ** 2.2) * 0.10
    tail = min(int(0.25 * SR), N - n1)
    swell[n0:n1] += noise[n0:n1] * e
    if tail > 0:
        swell[n1:n1 + tail] += noise[n1:n1 + tail] * np.linspace(0.10, 0, tail)

# ---------- mix ----------
L = padL + sub + arp * 0.9 + swell
R = padR + sub + arp + swell * 0.9
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.4)

# fades globais
fade_in = int(2.2 * SR); fade_out = int(5.0 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
mix[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

peak = np.abs(mix).max()
mix = mix / peak * 0.5  # ~ -6 dBFS de pico, trilha de fundo

pcm = (mix * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", OUT, f"{DUR}s")
