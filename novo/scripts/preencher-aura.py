#!/usr/bin/env python3
"""Preenche o miolo vazio de uma tira de aura (v0.154: a verde forte só tinha o contorno; as vermelhas tinham
buracos entre as labaredas). Em cada quadro, os vãos pequenos do desenho são fechados e um miolo em forma de chama
(abaixo das pontas, arredondado embaixo) é preenchido atrás do corpo; o que estava vazio dentro dele
ganha a cor do miolo, mais clara no centro e mais forte perto da borda, meio transparente. O desenho original fica
por cima, igual. Depois: scripts/gerar-efeitos.py.

    python3 scripts/preencher-aura.py aura_vermelha 4 189 192 "255,190,180" "230,60,60"
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

TOPO = 0.22      # o miolo começa abaixo das pontas das labaredas
LARGURA = 0.30   # meia-largura do miolo, em fração da largura do desenho


def preencher(fr: Image.Image, centro, borda) -> Image.Image:
    a = np.asarray(fr).astype(np.float32)
    m = a[..., 3] > 30
    h, w = m.shape
    ys, xs = np.nonzero(m)
    if not len(ys):
        return fr
    # miolo em forma de chama (um ovo mais fino em cima), atrás do corpo; mais os buracos fechados do desenho
    forma = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))) > 0
    topo, base = ys.min(), ys.max()
    cx, alt = (xs.min() + xs.max()) / 2, base - topo
    yy, xx = np.mgrid[0:h, 0:w]
    t = np.clip((yy - topo - alt * TOPO) / max(1, alt * (1 - TOPO)), 0, 1)       # 0 no alto do miolo, 1 na base
    meia = (xs.max() - xs.min()) * LARGURA * np.sqrt(np.clip(t * (2 - t), 0, 1))  # largura cresce e arredonda
    forma |= (yy >= topo + alt * TOPO) & (yy <= base - alt * 0.02) & (np.abs(xx - cx) <= meia)
    vazio = forma & ~m
    vy, vx = np.nonzero(vazio)
    if len(vy):
        cy, cx = ys.mean(), xs.mean()
        r = np.clip(np.hypot((vy - cy) / max(1, np.ptp(ys) / 2), (vx - cx) / max(1, np.ptp(xs) / 2)), 0, 1)
        cor = np.array(centro)[None, :] * (1 - r[:, None]) + np.array(borda)[None, :] * r[:, None]
        a[vy, vx, :3] = cor
        a[vy, vx, 3] = 165 + 60 * r
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main() -> None:
    nome, n, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    centro = [int(v) for v in sys.argv[5].split(',')]
    borda = [int(v) for v in sys.argv[6].split(',')]
    caminho = f'fontes/efeitos/{nome}.png'
    im = Image.open(caminho).convert('RGBA')
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for i in range(n):
        out.alpha_composite(preencher(im.crop((i * w, 0, (i + 1) * w, h)), centro, borda), (i * w, 0))
    out.save(caminho)
    print(f'{nome}: {n} quadros preenchidos')


if __name__ == '__main__':
    main()
