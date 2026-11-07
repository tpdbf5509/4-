#!/usr/bin/env python3
"""메인 스토리 정식 그림 묶기 — 1부(11월 6일, Codex 생성) 인물 7 · 초상화 7 · 건물/장소 46 · 소품 6 · 맵 바닥 10.
11월 7일 v3.0 새 그림 자리: 인물 6(people2 · portraits2) · 보스 16(boss1~2) · 장소 96(pl8~pl19) · 맵 바닥 13. 시트가 있는 것만 묶는다.
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
PEOPLE2 = ['lia', 'doyun', 'levan', 'kael', 'serin', 'observer']   # 11월 7일 v3.0 새 인물 — people2-kk · portraits2-k (7 · 8번 칸은 비어 있다)
PLACES = {
  'pl1': ['erden-guardpost', 'erden-workbench', 'erden-collection', 'convoy-wagon-1', 'convoy-wagon-2', 'convoy-wagon-3', 'convoy-guard', 'vault-desk'],
  'pl2': ['lab7-gate', 'lab7-wing', 'lab7-records', 'lab7-lift', 'lab7-power-1', 'lab7-power-2', 'lab7-power-3', None],
  'pl3': ['lab7-core', 'core-boundary', 'core-reactor', 'core-module', 'core-sender', 'core-executor', 'relay-tower', 'relay-device'],
  'pl4': ['relay-lock', 'mine-shaft', 'mine-hut', 'mine-plan-1', 'mine-plan-2', 'mine-plan-3'],
  'pl5': ['ruin-north-hall', 'ruin-north-gate', 'ruin-north-device', None, 'ruin-east-hall', 'ruin-east-gate', 'ruin-east-device', None],
  'pl7': ['prop-crate', 'prop-pillar', 'prop-turret', 'prop-pylon', 'prop-cart', 'prop-shelf'],   # 작은 소품 — 맵 소품(props)의 look 이름
  # 11월 7일 v3.0 — 보스 · 장소(프롬프트: 프로젝트 notes/메인스토리-남은-그림-프롬프트.md)
  'boss1': ['mine-silencer', 'lumen-eraser', 'lumen-giant', 'lib-censor', 'lib-deleter', 'leon-bearer', 'hall-raid', 'karha-forger'],
  'boss2': ['bridge-breaker', 'sky-eye', 'sky-collector', 'sea-eraser', 'sea-cycle', 'reg-offer', 'deck-core', 'br-link'],
  'pl8': ['lab7-assistant', 'lab7-tubes', 'core-cells', 'vault-line-1', 'vault-line-2', 'vault-line-3', 'lumen-lamp', 'lumen-house'],
  'pl9': ['lumen-ledger', 'lumen-ghost', 'lumen-hall', 'lumen-part-1', 'lumen-part-2', 'lib-chronicle', 'lib-sealed', 'lib-memory-1'],
  'pl10': ['lib-memory-2', 'lib-memory-3', 'lib-replay', 'lib-verdict', 'lib-ev-1', 'lib-ev-2', 'lib-ev-3', 'lib-festival'],
  'pl11': ['obs-sphere', 'obs-arka', 'obs-bridge-1', 'obs-bridge-2', 'obs-eye', 'leon-child', 'leon-bomb', 'leon-citizen-1'],
  'pl12': ['leon-citizen-2', 'leon-citizen-3', 'leon-bell', 'leon-front', 'leon-refugees', 'leon-victory', 'hall-gate', 'hall-secret'],
  'pl13': ['hall-crowd', 'hall-council', 'hall-dev-1', 'hall-dev-2', 'hall-dev-3', 'hall-screen', 'hall-mourner', 'karha-power'],
  'pl14': ['karha-guild', 'karha-hands', 'bridge-marker', 'bridge-crew', 'bridge-letter', 'bridge-shadow', 'sky-field-1', 'sky-field-2'],
  'pl15': ['sky-field-3', 'sky-logs', 'sky-room', 'sea-road', 'sea-family', 'sea-fixer', 'sea-door', 'sea-alley'],
  'pl16': ['sea-voice-1', 'sea-voice-2', 'sea-diary', 'reg-terminal', 'reg-key-1', 'reg-key-2', 'reg-key-3', 'reg-door'],
  'pl17': ['deck-scores', 'deck-route', 'deck-records', 'deck-towers', 'plaza-wall', 'plaza-tag-1', 'plaza-tag-2', 'plaza-tag-3'],
  'pl18': ['plaza-night', 'br-mural', 'br-warn', 'br-rescue', 'br-defend', 'br-record', 'br-center', 'br-memory'],
  'pl19': ['br-table', 'br-frag-1', 'br-frag-2', 'br-frag-3', 'br-frag-4', 'br-blank', 'br-alarm', 'br-council'],
  # 11월 7일 맵 장식 소품 — 이름은 storyDecor.js 와 같다(places/prop-d-<이름>.webp)
  'dc1': ['prop-d-rubble', 'prop-d-slab', 'prop-d-boulder', 'prop-d-stump-pillar', 'prop-d-bench-stone', 'prop-d-bricks', 'prop-d-menhir', 'prop-d-pottery'],
  'dc2': ['prop-d-bookstack', 'prop-d-bookstand', 'prop-d-ladder', 'prop-d-writing-desk', 'prop-d-scroll-crate', 'prop-d-globe', 'prop-d-candle-stand', 'prop-d-cabinet'],
  'dc3': ['prop-d-barricade', 'prop-d-tent', 'prop-d-supply-stack', 'prop-d-barrels', 'prop-d-fence', 'prop-d-flag-pole', 'prop-d-campfire', 'prop-d-handcart'],
  'dc4': ['prop-d-cable-spool', 'prop-d-generator', 'prop-d-scrap', 'prop-d-pipes', 'prop-d-junction', 'prop-d-vent', 'prop-d-robot-wreck', 'prop-d-battery-rack'],
  'dc5': ['prop-d-bush', 'prop-d-wildflowers', 'prop-d-stump', 'prop-d-small-tree', 'prop-d-rocks', 'prop-d-fence-post', 'prop-d-hay-bale', 'prop-d-tall-grass'],
  'dc6': ['prop-d-mooring', 'prop-d-traps', 'prop-d-net-rack', 'prop-d-buoy', 'prop-d-crate-sunk', 'prop-d-rock-weed', 'prop-d-pier-lantern', 'prop-d-rowboat'],
  'dc7': ['prop-d-planter', 'prop-d-bench', 'prop-d-statue', 'prop-d-armillary', 'prop-d-star-stand', 'prop-d-fountain', 'prop-d-urn', 'prop-d-banner-stand'],
  'dc8': ['prop-d-pick-stand', 'prop-d-ore-pile', 'prop-d-lantern-post', 'prop-d-mine-beam', 'prop-d-rail', 'prop-d-crystals', 'prop-d-planks-barrels', 'prop-d-scaffold'],
  'pl6': ['ruin-south-hall', 'ruin-south-gate', 'ruin-south-device', None, 'ruin-west-hall', 'ruin-west-gate', 'ruin-west-device', None],
}
GROUNDS = ['convoy', 'lab7', 'ruin-north', 'ruin-east', 'ruin-south', 'ruin-west', 'core', 'relay', 'mine', 'vault',
           'lumen', 'lumen-library', 'lumen-observatory', 'leon', 'leon-hall', 'karha', 'bridge', 'erden-sky', 'nameless-sea', 'registry', 'observer-deck', 'first-plaza', 'boundary-room']

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
have = lambda f: os.path.exists(os.path.join(SRC, f))   # 작업 폴더에 있는 시트만 묶는다(나눠 뽑아도 된다)
if not ONLY:
    for pre, names in (('', PEOPLE), ('2', PEOPLE2)):
        if have(f'people{pre}-kk.webp'):
            for i, n in enumerate(names): save('people', n, anchor(cells(f'people{pre}-kk.webp')[i]))
        if have(f'portraits{pre}-k.webp'):
            for i, n in enumerate(names): save('portraits', n, cells(f'portraits{pre}-k.webp')[i])   # 하단 정렬한 상반신 — 칸 그대로
for sheet, names in PLACES.items():
    if ONLY == 'props' and sheet != 'pl7': continue
    if ONLY == 'decor' and not sheet.startswith('dc'): continue
    if not have(sheet + '-kk.webp'): continue
    cs = cells(sheet + '-kk.webp')
    for i, n in enumerate(names):
        if n: save('places', n, anchor(cs[i]))   # None — 11월 7일에 지운 조사물 칸
for n in ([] if ONLY else GROUNDS):
    p = os.path.join(SRC, f'ground-{n}.png')
    if os.path.exists(p):
        im = Image.open(p).convert('RGB'); d = os.path.join(OUT, 'ground'); os.makedirs(d, exist_ok=True)
        im.save(os.path.join(d, n + '.webp'), quality=84, method=6)
print('ok')
