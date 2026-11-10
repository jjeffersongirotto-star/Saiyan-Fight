"""Gera os ícones e as telas de abertura do app Android a partir de icons/icon-512.png
(recorte quadrado da arte icons/capa-original.webp: rostos e punhos do Goku x Vegeta).

Rodar na raiz do projeto: python3 scripts/android/icones.py   (precisa do Pillow)

- ic_launcher: a arte quadrada com cantos levemente arredondados; ic_launcher_round: a arte num círculo.
- Ícone adaptável (Android 8+): a frente é a arte inteira ocupando os 108 dp (sem transparência, então a máscara
  do celular — círculo, "squircle" — mostra o meio: os punhos se chocando); o fundo é a cor do jogo (#121214).
- Telas de abertura (splash.png): fundo do jogo com o ícone redondo no centro, no tamanho de cada arquivo.
"""
from pathlib import Path
from PIL import Image, ImageDraw

SRC = Path('icons/icon-512.png')
RES = Path('android/app/src/main/res')
BG = (18, 18, 20)  # background_color do manifest (#121214)
DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

art = Image.open(SRC).convert('RGBA')


def mask(size: int, radius: float) -> Image.Image:
    """Máscara com cantos arredondados (`radius` em fração do lado; 0.5 = círculo), suavizada."""
    big = size * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, big - 1, big - 1), radius=int(big * radius), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def shaped(size: int, radius: float) -> Image.Image:
    out = art.resize((size, size), Image.LANCZOS)
    out.putalpha(mask(size, radius))
    return out


for dens, f in DENS.items():
    d = RES / f'mipmap-{dens}'
    shaped(round(48 * f), 0.12).save(d / 'ic_launcher.png')
    shaped(round(48 * f), 0.5).save(d / 'ic_launcher_round.png')
    art.resize((round(108 * f),) * 2, Image.LANCZOS).save(d / 'ic_launcher_foreground.png')

(RES / 'values' / 'ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#121214</color>\n</resources>\n')

for splash in RES.glob('drawable*/splash.png'):
    w, h = Image.open(splash).size
    s = round(min(w, h) * 0.38)
    out = Image.new('RGB', (w, h), BG)
    icon = shaped(s, 0.5)
    out.paste(icon, ((w - s) // 2, (h - s) // 2), icon)
    out.save(splash, optimize=True)
print('ícones e telas de abertura gerados em', RES)
