#!/usr/bin/env python3
"""Centraliza os quadros fora do lugar (v0.154): a aura é desenhada no centro do lutador, então um quadro do PARADO,
CARREGAR KI ou PARRY com o corpo deslocado faz o corpo "pular" dentro da aura (ex.: Piccolo sem capa, 4 dos 7
quadros do parado ~14 px à direita). Mede o centro da metade de baixo do corpo (quadril e pernas: braços e cabelo
não puxam) em cada quadro do atlas, compara com a mediana da forma e, se passar de LIMITE px da célula, corrige o x
do quadro no pacote fontes/conjuntos/<nome>/<forma>.json. Depois: scripts/gerar-atlas.py <nome>/<forma>.

    python3 scripts/centralizar-quadros.py            (só mostra)
    python3 scripts/centralizar-quadros.py --gravar   (corrige os pacotes)
"""
import glob
import json
import os
import statistics
import sys

import numpy as np
from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.normpath(os.path.join(AQUI, '..'))
MOVIMENTOS = ('idle', 'chargeKi', 'parry')        # os que ficam parados no lugar (a aura em volta)
REFERENCIA = ('idle', 'chargeKi', 'parry', 'flyUp', 'flyDown')
LIMITE = 7.0                                       # px da célula 144x168 (escala 1,5)


def centros(atlas: str) -> dict:
    d = json.load(open(atlas))
    alfa = np.asarray(Image.open(atlas[:-5] + '.webp').convert('RGBA'))[..., 3]
    out = {}
    for k, v in d['frames'].items():
        if k.split('/')[0] not in REFERENCIA:
            continue
        f, s = v['frame'], v['spriteSourceSize']
        a = alfa[f['y']:f['y'] + f['h'], f['x']:f['x'] + f['w']] > 60
        ys, xs = np.nonzero(a)
        if len(xs):
            baixo = ys >= np.percentile(ys, 45)
            out[k] = s['x'] + xs[baixo].mean() - 72
    return out


def main() -> None:
    gravar = '--gravar' in sys.argv
    for atlas in sorted(glob.glob(os.path.join(RAIZ, 'public', 'atlas', '*-*.json'))):
        nome, forma = os.path.basename(atlas)[:-5].split('-', 1)
        pacote = os.path.join(RAIZ, 'fontes', 'conjuntos', nome, forma + '.json')
        if not os.path.exists(pacote):
            continue
        c = centros(atlas)
        if not c:
            continue
        ref = statistics.median(c.values())
        fora = {k: v - ref for k, v in c.items() if k.split('/')[0] in MOVIMENTOS and abs(v - ref) > LIMITE}
        if not fora:
            continue
        print(f'{nome}/{forma}: ' + ', '.join(f'{k} {d:+.1f}' for k, d in sorted(fora.items())))
        if not gravar:
            continue
        p = json.load(open(pacote, encoding='utf-8'))
        for k, desvio in fora.items():
            estado, i = k.split('/')
            s = ((p.get('escala') or {}).get(estado) or [1])[0]
            fator = (p.get('k') or 1) / s / 1.5     # px da célula -> px do quadro original
            p[forma][estado][int(i)][0] = round(p[forma][estado][int(i)][0] - desvio * fator, 2)
        json.dump(p, open(pacote, 'w', encoding='utf-8'), separators=(',', ':'))


if __name__ == '__main__':
    main()
