#!/usr/bin/env python3
"""Preenche o miolo vazio de uma tira de aura (v0.154: as vermelhas tinham o centro vazio; a verde forte só tinha o
contorno). Só é pintado o que fica DO CONTORNO PARA DENTRO: o lado de fora é tudo o que se alcança a partir da borda do
quadro sem atravessar o desenho (com os vãos estreitos entre as labaredas fechados por um disco de raio FECHA; depois o
lado de fora volta a crescer FECHA+1 px por onde não há desenho, então nada passa do contorno). A base da aura é
aberta (os pés): embaixo, só conta como fora o que está além de BASE da largura a partir do centro. O miolo ganha a cor
da própria aura, mais clara no centro; o desenho original fica igual. Depois: scripts/gerar-efeitos.py.

    python3 scripts/preencher-aura.py aura_vermelha 4 184 192 "255,190,190" [--manter 3 --de <png já preenchido>]
    (--manter: esses quadros são copiados do png de --de em vez de refeitos)
"""
import sys

import numpy as np
from scipy import ndimage
from PIL import Image

FECHA = 6     # raio (px) que fecha os vãos entre as labaredas na hora de achar o lado de fora
BASE = 0.26   # meia-largura da base aberta, em fração da largura da aura


def preencher(fr: Image.Image, claro) -> Image.Image:
    a = np.asarray(fr).astype(np.float32)
    m = a[..., 3] > 30
    ys, xs = np.nonzero(m)
    if not len(ys):
        return fr
    h, w = m.shape
    cx = (xs.min() + xs.max()) / 2
    yy, xx = np.mgrid[-FECHA:FECHA + 1, -FECHA:FECHA + 1]
    paredes = ndimage.binary_dilation(m, structure=xx ** 2 + yy ** 2 <= FECHA ** 2)
    sementes = np.zeros_like(m)
    sementes[0, :] = sementes[:, 0] = sementes[:, -1] = True
    sementes[-1, :] = np.abs(np.arange(w) - cx) > (xs.max() - xs.min()) * BASE
    rot, _ = ndimage.label(~paredes)
    fora = np.isin(rot, list(set(np.unique(rot[sementes & ~paredes])) - {0}))
    fora = ndimage.binary_dilation(fora, iterations=FECHA + 1, mask=~m)
    miolo = ~m & ~fora
    rot, n = ndimage.label(miolo)
    if not n:
        return fr
    miolo = rot == (np.argmax(np.bincount(rot.ravel())[1:]) + 1)  # só o miolo grande
    vy, vx = np.nonzero(miolo)
    forte = a[..., 3] > 200
    cor = np.median(a[forte][:, :3], axis=0) if forte.any() else np.array(claro, np.float32)
    cy = ys.mean() + (ys.max() - ys.mean()) * 0.3
    r = np.clip(np.hypot((vy - cy) / max(1, np.ptp(ys) / 2), (vx - cx) / max(1, np.ptp(xs) / 2)), 0, 1)
    a[vy, vx, :3] = np.array(claro)[None, :] * (1 - r[:, None]) + cor[None, :] * r[:, None]
    a[vy, vx, 3] = 170 + 60 * r
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main() -> None:
    nome, n, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    claro = [int(v) for v in sys.argv[5].split(',')]
    caminho = f'fontes/efeitos/{nome}.png'
    im = Image.open(caminho).convert('RGBA')
    manter = {int(v) for v in sys.argv[sys.argv.index('--manter') + 1].split(',')} if '--manter' in sys.argv else set()
    pronto = Image.open(sys.argv[sys.argv.index('--de') + 1]).convert('RGBA') if '--de' in sys.argv else im
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for i in range(n):
        q = (i * w, 0, (i + 1) * w, h)
        out.alpha_composite(pronto.crop(q) if i in manter else preencher(im.crop(q), claro), (i * w, 0))
    out.save(caminho)
    print(f'{nome}: {n} quadros preenchidos')


if __name__ == '__main__':
    main()
