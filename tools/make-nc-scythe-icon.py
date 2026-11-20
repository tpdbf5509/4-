"""Necromancer 004 전용 무기 그림자 낫의 가방 · 상점 그림(128×128).
   11월 20일 사용자 그림 — tools/cut-nc-scythe.py 가 바탕을 지운 design/necro-job/ref/scythe-clean.png 전체를 그대로 줄인다(원본 방향 그대로).
   결과 public/assets/game/rpg/weapons/nc_scythe.webp(shop.js specialArt). 실행: python3 tools/make-nc-scythe-icon.py"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/necro-job/ref/scythe-clean.png")
OUT = os.path.join(ROOT, "public/assets/game/rpg/weapons/nc_scythe.webp")
SIZE, PAD = 128, 4                 # 그림 크기 · 가장자리 여백

im = Image.open(SRC).convert("RGBA")
k = (SIZE - PAD * 2) / max(im.size)
im = im.convert("RGBa").resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS).convert("RGBA")
import numpy as np
from nc_unteal import unteal
a = np.asarray(im).copy(); a[:, :, :3] = unteal(a[:, :, :3]).astype(np.uint8); im = Image.fromarray(a, "RGBA")   # 줄일 때 생기는 초록 · 청록 기운을 다시 지운다
ic = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
ic.paste(im, ((SIZE - im.size[0]) // 2, (SIZE - im.size[1]) // 2), im)
ic.save(OUT, lossless=True, quality=100, method=6)
print(OUT, im.size)
