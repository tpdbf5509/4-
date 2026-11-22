"""별이슬숲 나무 시트(바탕을 지운 4 × 2, 칸 512)를 낱장 512 그림으로 자른다.
칸마다 그림 덩어리를 가운데 · 발밑(y 496)에 다시 앉힌다 — 게임 그림 규격(story/places, 발 기준 256, 496).
바탕 지우기: python3 tools/key-green.py <시트.png> design/wilds/dew-trees-keyed.webp --cols 4 --rows 2
자르기: python3 design/wilds/cut-trees.py"""
from PIL import Image
import os
HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', '..', 'public', 'assets', 'game', 'rpg', 'story', 'places')
KINDS = ['oak', 'spruce', 'birch', 'round', 'old', 'young', 'shrub', 'fern']   # 칸 차례(왼쪽 위부터)
CELL, FOOT = 512, 496
sheet = Image.open(os.path.join(HERE, 'dew-trees-keyed.webp')).convert('RGBA')
for i, k in enumerate(KINDS):
    c = sheet.crop(((i % 4) * CELL, (i // 4) * CELL, (i % 4 + 1) * CELL, (i // 4 + 1) * CELL))
    a = c.split()[3].point(lambda v: 255 if v > 40 else 0)
    l, t, r, b = a.getbbox()
    body = c.crop((l, t, r, b))
    out = Image.new('RGBA', (CELL, CELL))
    # 줄기 밑동을 가운데에 — 아래 20px 의 무게 중심
    base = a.crop((l, b - 20, r, b))
    xs = [x for x in range(base.width) for y in range(base.height) if base.getpixel((x, y))]
    cx = l + (sum(xs) / len(xs) if xs else (r - l) / 2)
    ox = round(CELL / 2 - cx) + l
    ox = max(0, min(CELL - body.width, ox))
    out.alpha_composite(body, (ox, FOOT - body.height))
    out.save(os.path.join(OUT, f'prop-dew-{k}.webp'), lossless=False, quality=90)
    print(k, body.size)
