#!/usr/bin/env python3
"""Corrige a cor de uma faixa de matiz num pacote de forma (v0.151: a roupa azul do Vegeta God vinha azul-escuro,
apagada; fica com o azul da forma normal). Só os pixels da faixa (matiz em graus, saturação mínima) mudam, com
borda suave; cabelo, pele, armadura branca e dourada ficam iguais. Os alvos (matiz, saturação e brilho medianos)
vêm de outra forma do mesmo personagem.

    python3 scripts/corrigir-cor.py vegeta god normal
"""
import base64
import io
import json
import os
import sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
FAIXA = (190.0, 265.0)       # azuis
SAT_MIN = 0.15
# quadros que ainda mostram a forma anterior (o começo do TRANSFORMAR) ficam como estão
PULAR = {('vegeta', 'god'): {'transform': {0, 1, 2}}}
# e quadros de OUTRA forma que mostram esta (o começo do TRANSFORMAR da forma seguinte) recebem a mesma correção
TAMBEM = {('vegeta', 'god'): [('blue', 'transform', {0, 1, 2})]}
# um pouco mais vivo que a forma de referência (o usuário pediu "um azul mais vivo"): saturação e brilho
VIVO = (1.06, 1.18)


def _hsv(a):
    rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    return h, s, mx


def _rgb(h, s, v):
    h6 = (h % 360) / 60
    i = np.floor(h6).astype(int) % 6
    f = h6 - np.floor(h6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    r = np.choose(i, [v, q, p, p, t, v]); g = np.choose(i, [t, v, v, q, p, p]); b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def _peso(h, s, al):
    dentro = np.clip(np.minimum(h - FAIXA[0], FAIXA[1] - h) / 10, 0, 1)
    return dentro * np.clip((s - SAT_MIN) / 0.12, 0, 1) * (al > 0.02)


def medianas(quadros):
    H, Sx, V = [], [], []
    for im in quadros:
        a = np.asarray(im).astype(np.float32) / 255
        h, s, v = _hsv(a)
        m = _peso(h, s, a[..., 3]) > 0.9
        m &= v > 0.08
        H += list(h[m]); Sx += list(s[m]); V += list(v[m])
    return float(np.median(H)), float(np.median(Sx)), float(np.median(V))


def corrigir(im, de, para):
    a = np.asarray(im).astype(np.float32) / 255
    h, s, v = _hsv(a)
    w = _peso(h, s, a[..., 3])
    h2 = h + (para[0] - de[0])
    s2 = np.clip(s * (para[1] / de[1]), 0, 1)
    v2 = np.clip(v * (para[2] / de[2]), 0, 1)
    novo = _rgb(h2, s2, v2)
    rgb = a[..., :3] * (1 - w[..., None]) + novo * w[..., None]
    out = np.concatenate([rgb, a[..., 3:]], -1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), 'RGBA')


def abrir(q):
    return Image.open(io.BytesIO(base64.b64decode(q[4]))).convert('RGBA')


def main() -> None:
    nome, forma, ref = sys.argv[1:4]
    pasta = os.path.normpath(os.path.join(AQUI, '..', 'fontes', 'conjuntos', nome))
    d = json.load(open(os.path.join(pasta, forma + '.json'), encoding='utf-8'))
    r = json.load(open(os.path.join(pasta, ref + '.json'), encoding='utf-8'))
    m = medianas([abrir(q) for q in r[ref]['idle']])
    para = (m[0], min(1.0, m[1] * VIVO[0]), m[2] * VIVO[1])
    de = medianas([abrir(q) for q in d[forma]['idle']])
    pular = PULAR.get((nome, forma), {})
    n = 0
    for estado, quadros in d[forma].items():
        for i, q in enumerate(quadros):
            if i in pular.get(estado, set()):
                continue
            buf = io.BytesIO()
            corrigir(abrir(q), de, para).save(buf, 'WEBP', quality=92, alpha_quality=100, method=6)
            q[4] = base64.b64encode(buf.getvalue()).decode('ascii')
            n += 1
    json.dump(d, open(os.path.join(pasta, forma + '.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    for outra, estado, idx in TAMBEM.get((nome, forma), []):
        o = json.load(open(os.path.join(pasta, outra + '.json'), encoding='utf-8'))
        for i in idx:
            q = o[outra][estado][i]
            buf = io.BytesIO()
            corrigir(abrir(q), de, para).save(buf, 'WEBP', quality=92, alpha_quality=100, method=6)
            q[4] = base64.b64encode(buf.getvalue()).decode('ascii')
            n += 1
        json.dump(o, open(os.path.join(pasta, outra + '.json'), 'w', encoding='utf-8'), separators=(',', ':'))
    print(f'{nome}/{forma}: {n} quadros, azul {de} -> {para}')


if __name__ == '__main__':
    main()
