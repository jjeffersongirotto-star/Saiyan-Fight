#!/usr/bin/env python3
"""Encorpa uma forma cujo desenho veio mais magro que as outras do mesmo personagem (v0.150: Piccolo SEM CAPA).

Em cada quadro do pacote fontes/conjuntos/<nome>/<forma>.json, do pescoço para baixo TUDO (tronco, braços e pernas)
fica `pct`% mais largo, com 4 linhas de passagem; a cabeça e a altura ficam iguais. O desenho continua centrado no
mesmo ponto (o x do quadro é corrigido). Quadros listados em PULAR ficam como estão (ex.: o começo do TRANSFORMAR,
ainda com a capa). Depois: python3 scripts/gerar-atlas.py <nome>/<forma>.

    python3 scripts/alargar-forma.py piccolo semcapa 20
"""
import base64
import io
import json
import os
import sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
PULAR = {('piccolo', 'semcapa'): {'transform': {0, 1, 2}}}


def pescoco(im: Image.Image) -> int:
    """a linha mais estreita entre a cabeça e os ombros (6% a 25% da altura do quadro)"""
    a = im.getchannel('A')
    melhor = (10 ** 9, int(im.height * 0.15))
    for r in range(int(im.height * 0.06), max(int(im.height * 0.06) + 1, int(im.height * 0.25))):
        xs = [x for x in range(im.width) if a.getpixel((x, r)) > 60]
        if xs:
            melhor = min(melhor, (max(xs) - min(xs), r))
    return melhor[1]


def encorpar(im: Image.Image, k: float) -> tuple[Image.Image, float]:
    """devolve o quadro mais largo e o deslocamento em x (px do quadro) para manter o centro do desenho"""
    caixa = im.getchannel('A').getbbox()
    if not caixa:
        return im, 0.0
    cx = (caixa[0] + caixa[2]) / 2
    n = pescoco(im)
    largura = round(im.width * k) + 2
    out = Image.new('RGBA', (largura, im.height), (0, 0, 0, 0))
    for r in range(im.height):
        t = min(1.0, max(0.0, (r - n) / 4))
        kk = 1 + (k - 1) * t
        linha = im.crop((0, r, im.width, r + 1)).resize((max(1, round(im.width * kk)), 1), Image.LANCZOS)
        out.alpha_composite(linha, (round(largura / 2 - cx * kk), r))
    return out, cx - largura / 2


def main() -> None:
    nome, forma, pct = sys.argv[1], sys.argv[2], float(sys.argv[3])
    caminho = os.path.normpath(os.path.join(AQUI, '..', 'fontes', 'conjuntos', nome, forma + '.json'))
    d = json.load(open(caminho, encoding='utf-8'))
    pular = PULAR.get((nome, forma), {})
    n = 0
    for estado, quadros in d[forma].items():
        for i, q in enumerate(quadros):
            if i in pular.get(estado, set()):
                continue
            x, y, w, h, b64 = q
            im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
            novo, dx = encorpar(im, 1 + pct / 100)
            buf = io.BytesIO()
            novo.save(buf, 'WEBP', quality=92, alpha_quality=100, method=6)  # o pacote já era WebP com perda
            q[0], q[2] = round(x + dx, 2), novo.width
            q[4] = base64.b64encode(buf.getvalue()).decode('ascii')
            n += 1
    # o ponto da mão do especial (fração da célula 96x112) acompanha o braço, que também alargou
    for chave in ('mao', 'dedo'):
        p = (d.get(chave) or {}).get(forma)
        if p:
            p[0] = round(0.5 + (p[0] - 0.5) * (1 + pct / 100), 4)
    json.dump(d, open(caminho, 'w', encoding='utf-8'), separators=(',', ':'))
    print(f'{nome}/{forma}: {n} quadros {pct:g}% mais largos')


if __name__ == '__main__':
    main()
