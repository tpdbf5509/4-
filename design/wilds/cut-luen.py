"""루엔 마을 시트(바탕을 지운 칸 512)를 게임 낱장 512 그림으로 자른다.
건물 4 × 2 → story/places/luen-*.webp · 인물 3 × 2 → story/people/ · 초상 3 × 2 → story/portraits/
python3 design/wilds/cut-luen.py"""
from PIL import Image
import os
HERE = os.path.dirname(__file__)
ART = os.path.join(HERE, '..', '..', 'public', 'assets', 'game', 'rpg', 'story')
BUILD = ['luen-elder', 'luen-library', 'luen-inn', 'luen-smith', 'luen-herb', 'luen-bakery', 'luen-cottage-a', 'luen-cottage-b']
PEOPLE = ['luen-elder', 'luen-innkeeper', 'luen-smith', 'luen-herbalist', 'luen-librarian']
CELL = 512

def cut(sheet, cols, names, folder, box, foot):
    im = Image.open(os.path.join(HERE, sheet)).convert('RGBA')
    for i, n in enumerate(names):
        c = im.crop(((i % cols) * CELL, (i // cols) * CELL, (i % cols + 1) * CELL, (i // cols + 1) * CELL))
        body = c.crop(c.split()[3].point(lambda v: 255 if v > 40 else 0).getbbox())
        k = min(1, box[0] / body.width, box[1] / body.height)   # 칸을 넘으면 줄인다
        if k < 1: body = body.resize((round(body.width * k), round(body.height * k)), Image.LANCZOS)
        out = Image.new('RGBA', (CELL, CELL))
        out.alpha_composite(body, ((CELL - body.width) // 2, foot - body.height))
        out.save(os.path.join(ART, folder, n + '.webp'), quality=90)
        print(folder, n, body.size)

cut('luen-buildings-keyed.webp', 4, BUILD, 'places', (472, 446), 496)
cut('luen-people-keyed.webp', 3, PEOPLE, 'people', (470, 472), 496)
cut('luen-portraits-keyed.webp', 3, PEOPLE, 'portraits', (512, 503), 512)
