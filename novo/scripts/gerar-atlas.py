#!/usr/bin/env python3
"""Gera os atlas de textura (WebP + JSON no formato "hash" do Phaser) a partir dos pacotes do jogo antigo.

Uso (da pasta novo/):  python3 scripts/gerar-atlas.py            (todas as formas + retratos)
       python3 scripts/gerar-atlas.py goku/normal retratos   (só essas)

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
            "dedo": (d.get("dedo") or {}).get(forma),
            "loop": (d.get("loop") or {}).get(forma, {}),
        },
    }
    json.dump({"frames": frames, "meta": meta}, open(os.path.join(SAIDA, base + ".json"), "w", encoding="utf-8"), separators=(",", ":"))
    tam_antigo = os.path.getsize(caminho)
    tam_novo = os.path.getsize(os.path.join(SAIDA, base + ".webp")) + os.path.getsize(os.path.join(SAIDA, base + ".json"))
    print(f"{base}: {len(pedacos)} quadros, atlas {largura}x{altura}, {tam_antigo // 1024} KB (JSON antigo) -> {tam_novo // 1024} KB")


def gerar_retratos():
    """Primeiro quadro parado de cada personagem (../conjuntos/retratos.json) num atlas pequeno para a tela de
    escolha: a seleção não precisa baixar nenhum pacote inteiro (igual ao conjRetratoUrl do jogo antigo)."""
    d = json.load(open(os.path.join(RAIZ_ANTIGA, "conjuntos", "retratos.json"), encoding="utf-8"))
    celulas = {nome: quadro_na_celula(r, r["q"], "idle") for nome, r in d.items()}
    cw, ch = next(iter(celulas.values())).size
    por_linha = 8
    linhas = math.ceil(len(celulas) / por_linha)
    atlas = Image.new("RGBA", (cw * por_linha, ch * linhas), (0, 0, 0, 0))
    frames = {}
    for i, (nome, cel) in enumerate(celulas.items()):
        x, y = (i % por_linha) * cw, (i // por_linha) * ch
        atlas.paste(cel, (x, y))
        frames[nome] = {"frame": {"x": x, "y": y, "w": cw, "h": ch}, "rotated": False, "trimmed": False,
                        "spriteSourceSize": {"x": 0, "y": 0, "w": cw, "h": ch}, "sourceSize": {"w": cw, "h": ch}}
    os.makedirs(SAIDA, exist_ok=True)
    atlas.save(os.path.join(SAIDA, "retratos.webp"), "WEBP", quality=QUALIDADE, alpha_quality=90, method=6)
    json.dump({"frames": frames, "meta": {"image": "retratos.webp", "size": {"w": atlas.width, "h": atlas.height}, "scale": "1"}},
              open(os.path.join(SAIDA, "retratos.json"), "w", encoding="utf-8"), separators=(",", ":"))
    print(f"retratos: {len(celulas)} personagens, {os.path.getsize(os.path.join(SAIDA, 'retratos.webp')) // 1024} KB")


def todas_as_formas():
    pasta = os.path.join(RAIZ_ANTIGA, "conjuntos")
    return sorted(f"{n}/{f[:-5]}" for n in os.listdir(pasta) if os.path.isdir(os.path.join(pasta, n))
                  for f in os.listdir(os.path.join(pasta, n)) if f.endswith(".json"))


def _gerar(arg):
    n, f = arg.split("/")
    gerar(n, f)


if __name__ == "__main__":
    # sem argumentos (ou "todos"): as 47 formas + os retratos, em paralelo
    args = sys.argv[1:]
    if not args or args == ["todos"]:
        from multiprocessing import Pool
        gerar_retratos()
        with Pool() as pool:
            pool.map(_gerar, todas_as_formas())
    else:
        for arg in args:
            if arg == "retratos":
                gerar_retratos()
            else:
                _gerar(arg)
