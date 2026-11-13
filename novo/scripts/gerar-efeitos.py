#!/usr/bin/env python3
"""Gera o atlas dos efeitos (auras, tiros, raios, sol, escudo, parry, explosão) a partir de ../efeitos/*.png.

Uso (da pasta novo/):  python3 scripts/gerar-efeitos.py

Cada PNG do jogo antigo tem os quadros da animação lado a lado (n quadros de w x h; a tabela EFEITOS do menu.js,
copiada em src/dados/efeitos.ts). Cada quadro é cortado no que tem desenho (trim; o Phaser devolve o quadro
inteiro ao desenhar) e empacotado em páginas de no máximo 2048x2048. Saída: public/efeitos/efeitos.json
("multiatlas" do Phaser, quadros "<nome>/<i>") + efeitos-<n>.webp.
"""
import json, os, re
from PIL import Image

LARGURA_MAX = 2048
MARGEM = 1
QUALIDADE = 85

AQUI = os.path.dirname(os.path.abspath(__file__))
ORIGEM = os.path.normpath(os.path.join(AQUI, "..", "..", "efeitos"))
SAIDA = os.path.normpath(os.path.join(AQUI, "..", "public", "efeitos"))
TABELA = os.path.normpath(os.path.join(AQUI, "..", "src", "dados", "efeitos.ts"))


def ler_tabela():
    """{nome: (n, w, h)} lido de src/dados/efeitos.ts (uma linha por efeito: nome: { n: 7, w: 133, h: 192, ...})."""
    t = {}
    for m in re.finditer(r"(\w+): \{ n: (\d+), w: (\d+), h: (\d+)", open(TABELA, encoding="utf-8").read()):
        t[m.group(1)] = tuple(int(m.group(i)) for i in (2, 3, 4))
    return t


def main():
    tabela = ler_tabela()
    pedacos = []
    for nome, (n, w, h) in sorted(tabela.items()):
        tira = Image.open(os.path.join(ORIGEM, nome + ".png")).convert("RGBA")
        if tira.size[0] < n * w or tira.size[1] < h:
            raise SystemExit(f"{nome}.png é {tira.size}, esperado {n}x{w} por {h}")
        for i in range(n):
            q = tira.crop((i * w, 0, (i + 1) * w, h))
            caixa = q.getbbox() or (0, 0, 1, 1)
            pedacos.append((f"{nome}/{i}", q.crop(caixa), caixa, (w, h)))

    # prateleiras (mais altos primeiro); abre página nova quando passa de 2048 de altura
    paginas, atual = [], []
    x = y = alt = 0
    for chave, img, caixa, orig in sorted(pedacos, key=lambda p: (-p[1].size[1], p[0])):
        w, h = img.size
        if x + w > LARGURA_MAX:
            x, y, alt = 0, y + alt + MARGEM, 0
        if y + h > LARGURA_MAX:
            paginas.append(atual)
            atual, x, y, alt = [], 0, 0, 0
        atual.append((chave, img, caixa, orig, x, y))
        x += w + MARGEM
        alt = max(alt, h)
    paginas.append(atual)

    os.makedirs(SAIDA, exist_ok=True)
    for f in os.listdir(SAIDA):
        os.remove(os.path.join(SAIDA, f))
    texturas = []
    for n, pg in enumerate(paginas):
        L = max(px + im.size[0] for _, im, _, _, px, _ in pg)
        A = max(py + im.size[1] for _, im, _, _, _, py in pg)
        folha = Image.new("RGBA", (L, A), (0, 0, 0, 0))
        quadros = []
        for chave, img, caixa, (ow, oh), px, py in pg:
            folha.paste(img, (px, py))
            w, h = img.size
            quadros.append({
                "filename": chave, "rotated": False, "trimmed": (w, h) != (ow, oh),
                "frame": {"x": px, "y": py, "w": w, "h": h},
                "spriteSourceSize": {"x": caixa[0], "y": caixa[1], "w": w, "h": h},
                "sourceSize": {"w": ow, "h": oh},
            })
        arquivo = f"efeitos-{n}.webp"
        folha.save(os.path.join(SAIDA, arquivo), "WEBP", quality=QUALIDADE, alpha_quality=90, method=6)
        texturas.append({"image": arquivo, "format": "RGBA8888", "size": {"w": L, "h": A}, "scale": 1, "frames": quadros})
    json.dump({"textures": texturas, "meta": {"app": "scripts/gerar-efeitos.py"}},
              open(os.path.join(SAIDA, "efeitos.json"), "w"), separators=(",", ":"))
    total = sum(os.path.getsize(os.path.join(SAIDA, f)) for f in os.listdir(SAIDA))
    print(f"{len(pedacos)} quadros de {len(tabela)} efeitos em {len(paginas)} página(s), {total // 1024} KB")


if __name__ == "__main__":
    main()
