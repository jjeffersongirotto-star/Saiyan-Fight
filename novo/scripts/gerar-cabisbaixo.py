#!/usr/bin/env python3
"""Pose CABISBAIXO da tela FIM DE JOGO (v0.148), só da forma base de cada personagem.

Parte de um quadro já desenhado em que o lutador está de braços baixos (escolhido à mão em BASE), recorta a cabeça
(o topo do desenho), inclina-a para baixo, para a frente, escurece um pouco o rosto e assenta os pés no chão da
célula. Sai um atlas pequeno, public/atlas/cabisbaixo.webp/.json: uma célula 144x168 por personagem (mesma escala
1,5 e mesmos pés das formas: y 103/112 da célula). Rodar de novo quando o pacote da forma base mudar:
    python3 scripts/gerar-cabisbaixo.py
"""
import json
from pathlib import Path
from PIL import Image, ImageEnhance

RAIZ = Path(__file__).resolve().parent.parent
ATLAS = RAIZ / 'public' / 'atlas'
CEL_L, CEL_A = 144, 168
PES_Y = round(103 / 112 * CEL_A)   # linha dos pés na célula
INCLINACAO = 17                    # graus (cabeça para baixo, olhando para o chão à frente)

# personagem: (forma base, quadro de partida com os braços baixos)
BASE = {
    'goku': ('normal', 'chargeKi/0'), 'vegeta': ('normal', 'flyDown/1'), 'piccolo': ('normal', 'flyDown/0'),
    'freeza': ('f1', 'flyDown/1'), 'trunks': ('normal', 'flyDown/0'), 'gohan': ('normal', 'flyUp/0'),
    'kaioshin': ('normal', 'flyDown/0'), 'vegetto': ('normal', 'flyDown/0'), 'bardock': ('normal', 'flyDown/0'),
    'android17': ('normal', 'flyDown/0'), 'android18': ('normal', 'flyDown/0'), 'buu': ('kid', 'flyDown/0'),
    'raditz': ('normal', 'flyUp/0'), 'broly': ('normal', 'flyDown/0'), 'gotenks': ('normal', 'chargeKi/0'),
    'cell': ('f1', 'flyDown/0'),
}


def quadro(chave: str, nome: str) -> Image.Image:
    d = json.loads((ATLAS / f'{chave}.json').read_text())
    fr = d['frames'] if isinstance(d['frames'], dict) else {f['filename']: f for f in d['frames']}
    f = fr[nome]['frame']
    im = Image.open(ATLAS / f'{chave}.webp').convert('RGBA')
    return im.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


def cabisbaixo(im: Image.Image) -> Image.Image:
    caixa = im.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    if not caixa:
        return im
    x0, y0, x1, y1 = caixa
    alt = y1 - y0
    corte = y0 + round(alt * 0.24)               # o topo do desenho ~ cabeça e cabelo
    cabeca = im.crop((0, 0, im.width, corte))
    corpo = im.copy()
    corpo.paste((0, 0, 0, 0), (0, 0, im.width, corte))
    # pivô no pescoço: o meio do que está desenhado na linha do corte
    linha = [x for x in range(im.width) if im.getpixel((x, corte - 1))[3] > 40]
    px = (min(linha) + max(linha)) / 2 if linha else (x0 + x1) / 2
    cabeca = ImageEnhance.Brightness(cabeca).enhance(0.88)  # rosto um pouco na sombra
    girada = cabeca.rotate(-INCLINACAO, resample=Image.BICUBIC, center=(px, corte), translate=(3, 3))
    saida = corpo.copy()
    saida.alpha_composite(girada)
    return saida


def assentar(im: Image.Image) -> Image.Image:
    """centro do desenho no meio da célula e o ponto mais baixo na linha dos pés"""
    a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    x0, y0, x1, y1 = a.getbbox()
    cel = Image.new('RGBA', (CEL_L, CEL_A), (0, 0, 0, 0))
    cel.alpha_composite(im, (round(CEL_L / 2 - (x0 + x1) / 2), PES_Y - y1))
    return cel


def main() -> None:
    ids = list(BASE)
    folha = Image.new('RGBA', (CEL_L * 8, CEL_A * ((len(ids) + 7) // 8)), (0, 0, 0, 0))
    frames = {}
    for i, pid in enumerate(ids):
        forma, nome = BASE[pid]
        cel = assentar(cabisbaixo(quadro(f'{pid}-{forma}', nome)))
        x, y = (i % 8) * CEL_L, (i // 8) * CEL_A
        folha.alpha_composite(cel, (x, y))
        frames[pid] = {'frame': {'x': x, 'y': y, 'w': CEL_L, 'h': CEL_A}, 'rotated': False, 'trimmed': False,
                       'spriteSourceSize': {'x': 0, 'y': 0, 'w': CEL_L, 'h': CEL_A}, 'sourceSize': {'w': CEL_L, 'h': CEL_A}}
    folha.save(ATLAS / 'cabisbaixo.webp', 'WEBP', quality=88, method=6)
    meta = {'image': 'cabisbaixo.webp', 'size': {'w': folha.width, 'h': folha.height}, 'scale': '1', 'saiyan': {'escala': 1.5}}
    (ATLAS / 'cabisbaixo.json').write_text(json.dumps({'frames': frames, 'meta': meta}, separators=(',', ':')))
    print(f'cabisbaixo: {len(ids)} personagens, {(ATLAS / "cabisbaixo.webp").stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
