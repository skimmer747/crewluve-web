#!/usr/bin/env python3
"""Builds the website icons from the Crewluve app artwork.

Mirrors Crewluv/CrewluveIcon.icon/icon.json: a vertical gradient (blue at the bottom, pink from
30% below the top upward) with the heart artwork on top. Writes PNGs to public/icons/.
Run: python3 -I scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image

ART = Path('~/Dev/Crewluv/CrewluveIcon.icon/Assets/Heart icon.png')
OUT = Path(__file__).resolve().parent.parent / 'public' / 'icons'
SIZE = 1024
BLUE = (106, 191, 255)  # icon.json display-p3 (0.417, 0.749, 1.0), approximated in sRGB
PINK = (255, 177, 233)  # icon.json display-p3 (1.0, 0.694, 0.916)


def background() -> Image.Image:
    column = Image.new('RGBA', (1, SIZE))
    for y in range(SIZE):
        f = min(1.0, (1.0 - y / (SIZE - 1)) / 0.7)  # 0 at the bottom edge, 1 from 30% below the top
        column.putpixel((0, y), tuple(round(BLUE[i] + (PINK[i] - BLUE[i]) * f) for i in range(3)) + (255,))
    return column.resize((SIZE, SIZE))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    heart = Image.open(ART).convert('RGBA')
    icon = background()
    art = heart.resize((round(SIZE * 0.86), round(SIZE * 0.86)), Image.LANCZOS)
    icon.alpha_composite(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
    for name, size in [('apple-touch-icon.png', 180), ('icon-192.png', 192), ('favicon-32.png', 32)]:
        icon.resize((size, size), Image.LANCZOS).save(OUT / name)
    heart.resize((256, 256), Image.LANCZOS).save(OUT / 'heart-256.png')
    print('wrote icons to', OUT)


if __name__ == '__main__':
    main()
