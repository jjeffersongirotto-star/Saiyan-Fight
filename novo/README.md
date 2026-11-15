# Saiyan Fight — novo (Phaser 3 + TypeScript)

O jogo refeito em Phaser — desde a v0.121 é o jogo do site e do app. O plano completo, o inventário e as medidas
das imagens estão em [PLANO.md](PLANO.md). O jogo antigo (HTML/JS da raiz) foi apagado na v0.128; as fontes das imagens ficam em `fontes/` (pacotes de sprites e efeitos, lidos por `scripts/gerar-atlas.py` e `scripts/gerar-efeitos.py`).

```bash
npm install && npm run dev   # http://localhost:5173
npm test                     # Vitest
npm run build                # novo/dist
```
