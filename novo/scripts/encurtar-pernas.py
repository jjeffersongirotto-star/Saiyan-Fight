#!/usr/bin/env python3
"""Encurta só as pernas de um movimento que veio esticado (v0.155: Piccolo normal, attackKi): acha a linha da cintura
(a faixa azul) em cada quadro e no movimento de referência (idle), e achata só o que fica da cintura para baixo até a
distância cintura→pés ficar igual à da referência. O tronco e a cabeça não mudam; os pés continuam no mesmo lugar.
Depois: scripts/gerar-atlas.py <nome>/<forma>.

    python3 scripts/encurtar-pernas.py piccolo normal attackKi [--ref idle] [--previa saida.png]
"""
import base64, io, json, sys

import numpy as np
from PIL import Image


def imagem(q):
    return Image.open(io.BytesIO(base64.b64decode(q[4]))).convert('RGBA')


def cintura(im):
    """linha da faixa azul da cintura (ou None se a capa cobre)"""
    a = np.asarray(im).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    azul = (al > 200) & (b > r + 40) & (b > g + 10) & (g > r)
    n = azul.sum(1)
    y = int(np.argmax(n))
    return y if n[y] >= 15 else None


def pes(im):
    return int(np.nonzero(np.asarray(im)[..., 3] > 40)[0].max())


def main():
    nome, forma, mov = sys.argv[1], sys.argv[2], sys.argv[3]
    ref = sys.argv[sys.argv.index('--ref') + 1] if '--ref' in sys.argv else 'idle'
    caminho = f'fontes/conjuntos/{nome}/{forma}.json'
    d = json.load(open(caminho))
    est = d[forma]
    perna_ref = float(np.median([pes(im) - c for im in map(imagem, est[ref]) if (c := cintura(im)) is not None]))
    cs = [cintura(imagem(q)) for q in est[mov]]
    mediana = int(np.median([c for c in cs if c is not None]))
    # a capa às vezes cobre a faixa e acha outra coisa azul: longe da mediana, vale a mediana
    cs = [c if c is not None and abs(c - mediana) <= 8 else None for c in cs]
    novos = []
    for q, c in zip(est[mov], cs):
        im = imagem(q)
        c = c if c is not None else mediana
        p = pes(im)
        f = perna_ref / max(1, p - c)
        if f >= 1:
            novos.append(q); continue
        w, h = im.size
        baixo = im.crop((0, c, w, h))
        nh = max(1, round((h - c) * f))
        baixo = baixo.resize((w, nh), Image.LANCZOS)
        out = Image.new('RGBA', (w, c + nh), (0, 0, 0, 0))
        out.paste(im.crop((0, 0, w, c)), (0, 0))
        out.alpha_composite(baixo, (0, c))
        buf = io.BytesIO(); out.save(buf, 'WEBP', quality=95)
        delta = (h - (c + nh)) * (q[3] / h)  # em unidades do recorte (h do quadro)
        novos.append([q[0], q[1] + delta, q[2], q[3] - delta, base64.b64encode(buf.getvalue()).decode()])
        print(f'{mov}: cintura {c}, pernas {p - c} -> {nh - (h - p)} (x{f:.2f})')
    if '--previa' in sys.argv:
        d2 = dict(d); d2[forma] = dict(est); d2[forma][mov] = novos
        json.dump(d2, open(sys.argv[sys.argv.index('--previa') + 1], 'w'))
    else:
        est[mov] = novos
        json.dump(d, open(caminho, 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
