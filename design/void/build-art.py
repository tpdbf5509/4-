#!/usr/bin/env python3
"""공허의 관측자 정식 그림 묶기(11월 5일, Codex 생성) — 보스 몸 · 장비 시트 5행.
원본은 scratchpad 에서 key-green.py 로 지운 투명 WebP: boss-k.webp(1024x512) · weapons-k.webp(1200x400, 3칸) · armor-k.webp(1600x400, 4칸).
실행: python3 design/void/build-art.py <원본 폴더>   (장비 시트는 design/void/world-equipment-4rows.webp 에 5행을 새로 붙인다)
"""
import os, sys, json
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSET = os.path.join(ROOT, 'public/assets/game/rpg')
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
CELL_W, CELL_H, FIT = 1916 / 7, 1369 / 5, 252   # 칸 크기 · 아이콘이 들어갈 최대 크기

def defringe(im):
    """초록 바탕을 지운 가장자리의 연두 테두리를 없앤다(G 가 R · B 보다 튀면 눌러 준다)"""
    a = np.array(im.convert('RGBA')).astype(int)
    m = np.maximum(a[..., 0], a[..., 2])
    a[..., 1] = np.minimum(a[..., 1], m)
    return Image.fromarray(a.astype('uint8'), 'RGBA')

def load(n):
    return defringe(Image.open(os.path.join(SRC, n)))

# 보스 몸 — 그대로(1024x512 · 2열)
defringe(Image.open(os.path.join(SRC, 'boss-k.webp'))).save(os.path.join(ASSET, 'boss/void-observer.webp'), quality=92, method=6)

def fit(cell_im):
    """칸 그림을 알파 경계 상자로 잘라 FIT 안에 맞춰 키운다. 변환(자른 좌우 · 위 · 배율)도 돌려준다"""
    bb = cell_im.getbbox()
    c = cell_im.crop(bb)
    s = FIT / max(c.size)
    c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    return c, bb, s

weap = load('weapons-k.webp'); arm = load('armor-k.webp')
cells = [weap.crop((i * 400, 0, i * 400 + 400, 400)) for i in range(3)] + [arm.crop((i * 400, 0, i * 400 + 400, 400)) for i in range(4)]
base = Image.open(os.path.join(ROOT, 'design/void/world-equipment-4rows.webp')).convert('RGBA')
assert base.size == (1916, 1095), base.size
atlas = Image.new('RGBA', (1916, 1369), (0, 0, 0, 0)); atlas.alpha_composite(base)
y0 = 1095; info = []
for i, cell in enumerate(cells):
    c, bb, s = fit(cell)
    cx = round(i * CELL_W + (CELL_W - c.width) / 2); cy = round(y0 + (CELL_H - c.height) / 2)
    atlas.alpha_composite(c, (cx, cy))
    info.append(dict(i=i, bb=bb, s=s, cx=cx, cy=cy))
atlas.save(os.path.join(ASSET, 'items/world-equipment.webp'), quality=92, method=6)
# 손잡이 계산용 — 원본 칸 좌표 → 128 기준 칸 좌표
def to128(i, x, y):
    t = info[i]; X = t['cx'] + (x - t['bb'][0]) * t['s'] - i * CELL_W; Y = t['cy'] + (y - t['bb'][1]) * t['s'] - y0
    return round(X / CELL_W * 128), round(Y / CELL_H * 128)
if len(sys.argv) > 2:   # 손잡이 점 — python3 build-art.py <폴더> '{"0":[100,290,370,25]}' (원본 칸 좌표)
    pts = json.loads(sys.argv[2])
    for k, (gx, gy, tx, ty) in pts.items():
        print(k, to128(int(k), gx, gy) + to128(int(k), tx, ty))
print('bbox', [(t['i'], t['bb']) for t in info])
