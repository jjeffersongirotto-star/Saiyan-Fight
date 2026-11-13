#!/usr/bin/env python3
"""Gera os atlas de textura (WebP + JSON no formato "hash" do Phaser) a partir dos pacotes do jogo antigo.

Uso (da pasta novo/):  python3 scripts/gerar-atlas.py goku/normal vegeta/normal

Lê ../conjuntos/<nome>/<forma>.json (cada quadro = [x, y, w, h, webp em base64] no recorte original) e faz a
MESMA conta de posição do conjEmbrulharQuadro (conjuntos.js): desenho 96x112, pés na linha 103, centro em x=48.
Cada quadro vai para uma célula lógica de 96x112 desenhada a ESCALA px por unidade; a parte vazia é cortada
(trim) e o Phaser devolve a célula inteira ao desenhar (sourceSize/spriteSourceSize), então os pés continuam
no mesmo lugar em todos os movimentos. Saída: public/atlas/<nome>-<forma>.webp e .json (+ fps por movimento).
Precisa de Pillow com WebP (pip install pillow).
"""
import base64, io, json, math, os, sys
from PIL import Image

ESCALA = 1.5          # 96x112 unidades -> células de 144x168 px (o mesmo tamanho dos SVGs do jogo antigo)
LARGURA_MAX = 2048    # cabe em qualquer GPU de celular
MARGEM = 1            # 1 px vazio entre quadros (evita "sangrar" o vizinho ao filtrar)
QUALIDADE = 82       # o WebP original já era com perda; 82 + alfa 90 fica igual a olho e bem menor

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ_ANTIGA = os.path.normpath(os.path.join(AQUI, "..", ".."))
SAIDA = os.path.normpath(os.path.join(AQUI, "..", "public", "atlas"))


def quadro_na_celula(d, q, estado):
    """Mesma conta do conjEmbrulharQuadro: devolve a imagem já posicionada numa célula 96x112*ESCALA."""
    x, y, w, h, b64 = q
    s, apoio_y = (d.get("escala") or {}).get(estado, [1, d["pesY"]])
    k_base = d.get("k") or 1
    k = k_base / s
    y_base = 103 + (apoio_y - d["pesY"]) / k_base
    gx, gy = 48 + (x - d["centroX"]) / k, y_base + (y - apoio_y) / k
    gw, gh = w / k, h / k
    img = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
    alvo = (max(1, round(gw * ESCALA)), max(1, round(gh * ESCALA)))
    img = img.resize(alvo, Image.NEAREST)   # pixel art: sem borrar
    cel = Image.new("RGBA", (round(96 * ESCALA), round(112 * ESCALA)), (0, 0, 0, 0))
    cel.paste(img, (round(gx * ESCALA), round(gy * ESCALA)), img)   # aceita posição negativa (corta a sobra)
    return cel


def gerar(nome, forma):
    caminho = os.path.join(RAIZ_ANTIGA, "conjuntos", nome, forma + ".json")
    d = json.load(open(caminho, encoding="utf-8"))
    estados = d[forma]
    pedacos = []   # (chave, imagem cortada, caixa do corte)
    for estado, quadros in estados.items():
        for i, q in enumerate(quadros):
            cel = quadro_na_celula(d, q, estado)
            caixa = cel.getbbox() or (0, 0, 1, 1)
            pedacos.append((f"{estado}/{i}", cel.crop(caixa), caixa, cel.size))
    # empacota em prateleiras (mais altos primeiro)
    ordem = sorted(pedacos, key=lambda p: -p[1].size[1])
    x = y = alt_linha = 0
    pos = {}
    for chave, img, _, _ in ordem:
        w, h = img.size
        if x + w > LARGURA_MAX:
            x, y, alt_linha = 0, y + alt_linha + MARGEM, 0
        pos[chave] = (x, y)
        x += w + MARGEM
        alt_linha = max(alt_linha, h)
    altura = y + alt_linha
    largura = min(LARGURA_MAX, max(pos[c][0] + img.size[0] for c, img, _, _ in pedacos))
    atlas = Image.new("RGBA", (largura, altura), (0, 0, 0, 0))
    frames = {}
    for chave, img, caixa, tam in pedacos:
        px, py = pos[chave]
        atlas.paste(img, (px, py))
        w, h = img.size
        frames[chave] = {
            "frame": {"x": px, "y": py, "w": w, "h": h},
            "rotated": False, "trimmed": True,
            "spriteSourceSize": {"x": caixa[0], "y": caixa[1], "w": w, "h": h},
            "sourceSize": {"w": tam[0], "h": tam[1]},
        }
    base = f"{nome}-{forma}"
    os.makedirs(SAIDA, exist_ok=True)
    atlas.save(os.path.join(SAIDA, base + ".webp"), "WEBP", quality=QUALIDADE, alpha_quality=90, method=6)
    meta = {
        "image": base + ".webp", "size": {"w": largura, "h": altura}, "scale": "1",
        # dados do jogo: quadros por movimento, fps (fpsMov sobrescreve fps) e o ponto da mão do especial
        "saiyan": {
            "personagem": nome, "forma": forma, "escala": ESCALA,
            "movimentos": {e: len(q) for e, q in estados.items()},
            "fps": d.get("fps", 12), "fpsMov": d.get("fpsMov", {}),
            "mao": (d.get("mao") or {}).get(forma),
            "loop": (d.get("loop") or {}).get(forma, {}),
        },
    }
    json.dump({"frames": frames, "meta": meta}, open(os.path.join(SAIDA, base + ".json"), "w", encoding="utf-8"), separators=(",", ":"))
    tam_antigo = os.path.getsize(caminho)
    tam_novo = os.path.getsize(os.path.join(SAIDA, base + ".webp")) + os.path.getsize(os.path.join(SAIDA, base + ".json"))
    print(f"{base}: {len(pedacos)} quadros, atlas {largura}x{altura}, {tam_antigo // 1024} KB (JSON antigo) -> {tam_novo // 1024} KB")


if __name__ == "__main__":
    for arg in sys.argv[1:] or ["goku/normal", "vegeta/normal"]:
        n, f = arg.split("/")
        gerar(n, f)
