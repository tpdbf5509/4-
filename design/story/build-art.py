#!/usr/bin/env python3
"""메인 스토리 1부 정식 그림 묶기(11월 6일, Codex 생성) — 인물 7 · 초상화 7 · 건물/장소 46 · 소품 6 · 맵 바닥 10.
입력(scratchpad 에서 key-green.py 로 지운 투명 WebP 4열×2행, 칸 512): people-kk · portraits-k · pl1~pl7-kk
      맵 바닥은 ground-<맵 id>.png (guide-<맵 id>.png 레이아웃 지도를 기준 그림으로 뽑았다)
실행: python3 design/story/build-art.py <작업 폴더>
출력: public/assets/game/rpg/story/{people,portraits,places,ground}/<id>.webp — 규격은 그 폴더의 README.md
사람 · 장소는 칸 안 그림의 경계 상자를 잘라 발밑(아래 끝)이 (256,496)에 오고 가로는 가운데로 오게 앉힌다. 한 변이 472px 를 넘으면 줄인다.
"""
import os, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public/assets/game/rpg/story')
SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
CELL, FOOT, FIT = 512, 496, 472

PEOPLE = ['hangyeol', 'mina', 'bori', 'sera', 'zero', 'arka', 'irion']
PLACES = {
  'pl1': ['erden-guardpost', 'erden-workbench', 'erden-collection', 'convoy-wagon-1', 'convoy-wagon-2', 'convoy-wagon-3', 'convoy-guard', 'vault-desk'],
  'pl2': ['lab7-gate', 'lab7-wing', 'lab7-records', 'lab7-lift', 'lab7-power-1', 'lab7-power-2', 'lab7-power-3', 'lab7-log'],
  'pl3': ['lab7-core', 'core-boundary', 'core-reactor', 'core-module', 'core-sender', 'core-executor', 'relay-tower', 'relay-device'],
  'pl4': ['relay-lock', 'mine-shaft', 'mine-hut', 'mine-plan-1', 'mine-plan-2', 'mine-plan-3'],
  'pl5': ['ruin-north-hall', 'ruin-north-gate', 'ruin-north-device', 'ruin-north-mark', 'ruin-east-hall', 'ruin-east-gate', 'ruin-east-device', 'ruin-east-mark'],
  'pl7': ['prop-crate', 'prop-pillar', 'prop-turret', 'prop-pylon', 'prop-cart', 'prop-shelf'],   # 작은 소품 — 맵 소품(props)의 look 이름
  'pl6': ['ruin-south-hall', 'ruin-south-gate', 'ruin-south-device', 'ruin-south-mark', 'ruin-west-hall', 'ruin-west-gate', 'ruin-west-device', 'ruin-west-mark'],
}
GROUNDS = ['convoy', 'lab7', 'ruin-north', 'ruin-east', 'ruin-south', 'ruin-west', 'core', 'relay', 'mine', 'vault']

def cells(path):
    im = Image.open(os.path.join(SRC, path)).convert('RGBA')
    return [im.crop(((i % 4) * CELL, (i // 4) * CELL, (i % 4) * CELL + CELL, (i // 4) * CELL + CELL)) for i in range(8)]

def anchor(cell):
    bb = cell.getbbox()
    c = cell.crop(bb)
    k = min(1, FIT / max(c.size))
    if k < 1: c = c.resize((round(c.width * k), round(c.height * k)), Image.LANCZOS)
    out = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0))
    out.alpha_composite(c, (round(CELL / 2 - c.width / 2), FOOT - c.height))
    return out

def save(kind, name, im):
    d = os.path.join(OUT, kind); os.makedirs(d, exist_ok=True)
    im.save(os.path.join(d, name + '.webp'), quality=90, method=6)

ONLY = sys.argv[2] if len(sys.argv) > 2 else ''   # 'props' 면 소품만 다시 만든다(전체는 몇 분 걸린다)
if not ONLY:
    for i, n in enumerate(PEOPLE): save('people', n, anchor(cells('people-kk.webp')[i]))
    for i, n in enumerate(PEOPLE): save('portraits', n, cells('portraits-k.webp')[i])   # 하단 정렬한 상반신 — 칸 그대로
for sheet, names in PLACES.items():
    if ONLY == 'props' and sheet != 'pl7': continue
    cs = cells(sheet + '-kk.webp')
    for i, n in enumerate(names): save('places', n, anchor(cs[i]))
for n in ([] if ONLY else GROUNDS):
    p = os.path.join(SRC, f'ground-{n}.png')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); d = os.path.join(OUT, 'ground'); os.makedirs(d, exist_ok=True)
        im.save(os.path.join(d, n + '.webp'), quality=84, method=6)
print('ok')
