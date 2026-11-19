#!/usr/bin/env python3
"""Preenche o miolo vazio de uma tira de aura (v0.154: as vermelhas tinham buracos entre as labaredas; a verde
forte só tinha o contorno). Em cada linha do quadro, o vão entre a primeira labareda da esquerda e a da direita (a partir
do centro, e só onde há desenho acima) ganha a cor da própria aura, mais clara no centro, abaixo das pontas (TOPO). Nada é pintado fora do contorno; o desenho original fica igual
por cima. Depois: scripts/gerar-efeitos.py.

    python3 scripts/preencher-aura.py aura_vermelha 4 184 192 "255,190,190"
"""
import sys
from collections import deque

import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

TOPO = 0.18       # o miolo começa abaixo das pontas das labaredas (fração da altura)
LARGURA = 0.30    # meia-largura do miolo na base, em fração da largura da aura


def _fora(m: np.ndarray) -> np.ndarray:
    """o que é alcançável a partir da borda do quadro sem atravessar `m`"""
    h, w = m.shape
    ext = np.zeros_like(m)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not m[y, x] and not ext[y, x]:
                ext[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not m[y, x] and not ext[y, x]:
                ext[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not m[yy, xx] and not ext[yy, xx]:
                ext[yy, xx] = True; q.append((yy, xx))
    return ext


def preencher(fr: Image.Image, claro) -> Image.Image:
    a = np.asarray(fr).astype(np.float32)
    m = a[..., 3] > 30
    ys, xs = np.nonzero(m)
    if not len(ys):
        return fr
    # o miolo: em cada linha, do centro até a primeira labareda de cada lado (as duas precisam existir) e só onde
    # há desenho acima na mesma coluna (não vaza para cima, entre as pontas) — nada fora do contorno
    h, w = m.shape
    cx = int(round((xs.min() + xs.max()) / 2))
    # paredes = só o contorno principal (o maior pedaço ligado); pedacinhos soltos no meio não param o preenchimento
    rot, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
    paredes = m & (rot == (np.argmax(np.bincount(rot.ravel())[1:]) + 1)) if n else m
    acima = np.maximum.accumulate(paredes, axis=0)
    topo = ys.min() + (ys.max() - ys.min()) * TOPO
    # 1) dentro das bordas EXTERNAS da aura em cada linha (as labaredas de dentro ficam desenhadas por cima)
    dentro = np.zeros_like(m)
    for y in range(int(topo), ys.max() + 1):
        c = np.nonzero(paredes[y])[0]
        if len(c) >= 2:
            dentro[y, c.min():c.max() + 1] = True
    # 2) um miolo arredondado (mais fino em cima): não entra nos vãos entre as pontas dos lados
    yy, xx = np.mgrid[0:h, 0:w]
    alt = ys.max() - topo
    t = np.clip((yy - topo) / max(1, alt), 0, 1)
    meia = (xs.max() - xs.min()) * LARGURA * np.sqrt(np.clip(t * (2.2 - t), 0, 1.21))
    miolo = (yy >= topo) & (np.abs(xx - cx) <= meia)
    vazio = dentro & miolo & acima & ~m
    vy, vx = np.nonzero(vazio)
    if len(vy):
        forte = a[..., 3] > 200
        cor = np.median(a[forte][:, :3], axis=0) if forte.any() else np.array(claro, np.float32)
        cy, cx = ys.mean() + (ys.max() - ys.mean()) * 0.3, (xs.min() + xs.max()) / 2
        r = np.clip(np.hypot((vy - cy) / max(1, np.ptp(ys) / 2), (vx - cx) / max(1, np.ptp(xs) / 2)), 0, 1)
        a[vy, vx, :3] = np.array(claro)[None, :] * (1 - r[:, None]) + cor[None, :] * r[:, None]
        a[vy, vx, 3] = 170 + 60 * r
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main() -> None:
    nome, n, w, h = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    claro = [int(v) for v in sys.argv[5].split(',')]
    caminho = f'fontes/efeitos/{nome}.png'
    im = Image.open(caminho).convert('RGBA')
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    for i in range(n):
        out.alpha_composite(preencher(im.crop((i * w, 0, (i + 1) * w, h)), claro), (i * w, 0))
    out.save(caminho)
    print(f'{nome}: {n} quadros preenchidos')


if __name__ == '__main__':
    main()
