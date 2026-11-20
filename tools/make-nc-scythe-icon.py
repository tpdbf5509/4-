"""Necromancer 004 전용 무기 그림자 낫의 가방 · 상점 그림(128×128, 11월 20일 사용자 "낫도 전용무기로").
   손에 든 낫 시트 nc_scythe 첫 칸(necroPxData.js 규격 64×62)을 떼어 세워 정수 배로 키운다 — 아르카디온 가방 그림과 같은 방식.
   결과 public/assets/game/rpg/weapons/nc_scythe.webp(shop.js specialArt). 실행: python3 tools/make-nc-scythe-icon.py"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public/assets/game/rpg/effects/hidden-jobs/necromancer/px/nc_scythe.webp")
OUT = os.path.join(ROOT, "public/assets/game/rpg/weapons/nc_scythe.webp")
W, H, ROT = 64, 62, 180            # 한 칸 크기 · 돌릴 각도(도 — 뒤집어 날이 위로 오게, 그대로 두 배)

im = Image.open(SRC).convert("RGBA").crop((0, 0, W, H)).rotate(ROT, Image.NEAREST, expand=True)
im = im.crop(im.getbbox())
k = max(1, 128 // max(im.size))
im = im.resize((im.size[0] * k, im.size[1] * k), Image.NEAREST)
ic = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
ic.paste(im, ((128 - im.size[0]) // 2, (128 - im.size[1]) // 2), im)
ic.save(OUT, lossless=True, quality=100, method=6)
print(OUT, im.size)
