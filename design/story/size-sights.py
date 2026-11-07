#!/usr/bin/env python3
"""이야기 맵 조사물 크기 — 사람 키(H = 64px)를 1로 두고 사물마다 '긴 쪽 길이'(E, 사람 키의 몇 배)를 정해 두면
실제 그림에서 투명 여백을 뺀 긴 쪽을 재서 그리는 크기(size)와 부딪히는 반지름(r)을 계산해 src/game/storySizes.js 를 쓴다.
기준(웹 검색 정리): 캐릭터 키를 먼저 정하고, 문은 캐릭터보다 조금 크게, 건물은 그보다 훨씬 크게 잡는다.
그림을 바꾸거나 E 를 고친 뒤:  python3 design/story/size-sights.py
"""
import os
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PL = os.path.join(ROOT, 'public/assets/game/rpg/story/places')
H = 64                       # 사람(주인공) 키 px
E = {
  # 1부 — 어색했던 것만
  'convoy-guard': 1.5, 'lab7-assistant': 1.0, 'lab7-core': 3.0,
  # 7장 루멘
  'lumen-lamp': 2.8, 'lumen-house': 2.2, 'lumen-ledger': 1.7, 'lumen-ghost': 1.2, 'lumen-hall': 3.6, 'lumen-giant': 4.5,
  'lumen-part-1': 1.0, 'lumen-part-2': 1.6, 'lumen-eraser': 2.4,
  # 8장 대도서관
  'lib-chronicle': 2.4, 'lib-sealed': 1.0, 'lib-censor': 2.0, 'lib-memory-1': 1.6, 'lib-memory-2': 1.6, 'lib-memory-3': 1.6,
  'lib-replay': 1.6, 'lib-verdict': 2.8, 'lib-ev-1': 0.9, 'lib-ev-2': 1.6, 'lib-ev-3': 1.6, 'lib-deleter': 2.2, 'lib-festival': 2.0,
  # 10장 천문대
  'obs-sphere': 2.2, 'obs-arka': 1.7, 'obs-bridge-1': 2.8, 'obs-bridge-2': 2.8, 'obs-eye': 1.9,
  # 13장 레온
  'leon-child': 1.0, 'leon-bomb': 1.3, 'leon-citizen-1': 2.0, 'leon-citizen-2': 1.3, 'leon-citizen-3': 1.3, 'leon-bell': 6.0,
  'leon-front': 2.2, 'leon-refugees': 2.2, 'leon-bearer': 4.2, 'leon-victory': 5.0,
  # 14장 회담장
  'hall-gate': 2.6, 'hall-secret': 2.6, 'hall-raid': 2.4, 'hall-crowd': 1.2, 'hall-council': 2.0, 'hall-dev-1': 1.4,
  'hall-dev-2': 1.2, 'hall-dev-3': 1.4, 'hall-screen': 2.2, 'hall-mourner': 1.2,
  # 15 · 16장
  'karha-power': 2.6, 'karha-guild': 2.0, 'karha-forger': 1.4, 'karha-hands': 1.8,
  'bridge-marker': 2.0, 'bridge-crew': 1.8, 'bridge-breaker': 4.5, 'bridge-letter': 0.9, 'bridge-shadow': 2.2,
  # 19장 북쪽 언덕
  'sky-field-1': 2.6, 'sky-field-2': 2.6, 'sky-field-3': 2.6, 'sky-eye': 3.2, 'sky-logs': 1.8, 'sky-room': 2.8, 'sky-collector': 1.6,
  # 21장 무명해역
  'sea-road': 3.2, 'sea-family': 2.4, 'sea-fixer': 3.6, 'sea-eraser': 3.0, 'sea-door': 2.6, 'sea-alley': 4.0,
  'sea-voice-1': 1.1, 'sea-voice-2': 1.1, 'sea-diary': 1.0, 'sea-cycle': 4.6,
  # 23 · 24 · 25장
  'reg-terminal': 1.7, 'reg-key-1': 0.9, 'reg-key-2': 0.9, 'reg-key-3': 0.9, 'reg-offer': 2.4, 'reg-door': 1.6,
  'deck-scores': 2.0, 'deck-route': 2.4, 'deck-records': 2.4, 'deck-towers': 2.6, 'deck-core': 4.2,
  'plaza-wall': 3.8, 'plaza-tag-1': 0.9, 'plaza-tag-2': 0.9, 'plaza-tag-3': 0.9, 'plaza-night': 1.6,
  # 26장 중앙 경계 설계실
  'br-mural': 3.2, 'br-warn': 1.8, 'br-rescue': 1.8, 'br-defend': 1.8, 'br-record': 1.8, 'br-center': 2.6, 'br-memory': 1.6,
  'br-table': 2.0, 'br-frag-1': 0.9, 'br-frag-2': 0.9, 'br-frag-3': 0.9, 'br-frag-4': 0.9, 'br-blank': 1.8,
  'br-alarm': 3.2, 'br-council': 3.2, 'br-link': 3.4,
}

# 맵 장식 소품(storyDecor.js) — 이름: 긴 쪽 길이(사람 키의 몇 배). 파일은 places/prop-d-<이름>.webp
D = {
  'rubble': 1.6, 'slab': 1.4, 'boulder': 1.5, 'stump-pillar': 1.1, 'bench-stone': 1.3, 'bricks': 1.0, 'menhir': 1.6, 'pottery': 0.9,
  'bookstack': 1.1, 'bookstand': 1.0, 'ladder': 1.8, 'writing-desk': 1.5, 'scroll-crate': 1.0, 'globe': 1.2, 'candle-stand': 1.3, 'cabinet': 1.4,
  'barricade': 2.0, 'tent': 2.4, 'supply-stack': 1.4, 'barrels': 1.2, 'fence': 1.8, 'flag-pole': 2.6, 'campfire': 1.0, 'handcart': 1.6,
  'cable-spool': 1.3, 'generator': 1.6, 'scrap': 1.3, 'pipes': 2.0, 'junction': 1.0, 'vent': 1.4, 'robot-wreck': 1.3, 'battery-rack': 1.6,
  'bush': 1.3, 'wildflowers': 1.2, 'stump': 1.0, 'small-tree': 2.6, 'rocks': 1.5, 'fence-post': 1.0, 'hay-bale': 1.1, 'tall-grass': 1.2,
  'mooring': 1.2, 'traps': 1.2, 'net-rack': 1.8, 'buoy': 0.9, 'crate-sunk': 1.2, 'rock-weed': 1.4, 'pier-lantern': 1.8, 'rowboat': 2.4,
  'planter': 1.3, 'bench': 1.6, 'statue': 2.0, 'armillary': 1.8, 'star-stand': 1.7, 'fountain': 2.0, 'urn': 1.4, 'banner-stand': 2.2,
  'pick-stand': 1.5, 'ore-pile': 1.2, 'lantern-post': 2.0, 'mine-beam': 2.0, 'rail': 1.6, 'crystals': 1.5, 'planks-barrels': 1.5, 'scaffold': 2.4,
}
SOLID = {'boulder', 'tent', 'barricade', 'generator', 'small-tree', 'fountain', 'statue', 'scaffold', 'rubble', 'menhir', 'rowboat'}   # 이것만 몸이 막힌다(작게)
R_K = 0.26                   # 부딪히는 반지름 = 긴 쪽 길이 × 0.26 (그림의 발밑 폭에 가깝게)
R_MAX = 56                   # 말 걸 수 있는 거리(RPG.talkR 100) 안에 설 수 있도록 — 큰 건축물도 부딪힘은 이만큼까지만
out = {}
dec_out = {}
for k, e in E.items():
    im = Image.open(os.path.join(PL, k + '.webp')).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    longest = max(bb[2] - bb[0], bb[3] - bb[1])
    size = round(e * H * 512 / longest / 10) * 10
    out[k] = [size, min(R_MAX, max(16, round(e * H * R_K)))]
for k, e in D.items():
    im = Image.open(os.path.join(PL, 'prop-d-' + k + '.webp')).convert('RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    longest = max(bb[2] - bb[0], bb[3] - bb[1])
    dec_out[k] = [round(e * H * 512 / longest / 10) * 10, min(24, round(e * H * .16)) if k in SOLID else 0]
lines = ["// 이야기 맵 조사물 크기 — design/story/size-sights.py 가 만든다(사람 키 64px 기준). 직접 고치지 말고 그 스크립트의 E 를 고친다.",
         "// id: [그리는 크기(칸 한 변 px), 부딪히는 반지름]", "export const STORY_SIGHT_SIZE = {"]
lines += [f"  '{k}': [{v[0]}, {v[1]}]," for k, v in out.items()] + ["};", "// 맵 장식 소품 — d-<이름>: [그리는 크기, 부딪히는 반지름(0 이면 막지 않는다)]", "export const STORY_DECOR_SIZE = {"]
lines += [f"  'd-{k}': [{v[0]}, {v[1]}]," for k, v in dec_out.items()] + ["};", ""]
open(os.path.join(ROOT, 'src/game/storySizes.js'), 'w', encoding='utf-8').write('\n'.join(lines))
print(len(out), 'ok')
