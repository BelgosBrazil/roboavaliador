# Site da Belgos

Arquivo único e autocontido: `index.html` (fontes embutidas, sem dependências externas).

## Publicar

Qualquer hospedagem estática serve. Exemplos:

- **Vercel**: `npx vercel deploy site/` e aponte o domínio belgos.co no painel.
- **Netlify**: arraste a pasta `site/` no app.netlify.com.
- **Cloudflare Pages**: crie um projeto apontando para a pasta `site/`.

## Antes de publicar

- Troque os links de LinkedIn e Instagram no rodapé (estão com `href="#"`).
- Revise os números da faixa de telemetria do hero (40+ operações etc.).
- O botão de contato usa `mailto:contato@belgos.co`. Se preferir WhatsApp, troque por `https://wa.me/55XXXXXXXXXXX`.

O tema segue o sistema do visitante, com toggle manual no menu (persistido em localStorage).
