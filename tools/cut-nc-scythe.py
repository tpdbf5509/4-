"""Necromancer 004 전용 무기 그림자 낫 — 사용자 그림(11월 20일, 초록 바탕)의 바탕을 지워 투명 PNG 로 만든다.
   원본 design/necro-job/ref/scythe-user.jpg → design/necro-job/ref/scythe-clean.png(원래 크기, 낫 둘레로 잘라냄).
   손에 든 시트 nc_scythe(design/effects/necromancer/make.py)와 가방 그림(tools/make-nc-scythe-icon.py)이 이 파일을 쓴다.
   실행: python3 tools/cut-nc-scythe.py"""
import os
import numpy as np
from PIL import Image
from nc_unteal import unteal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/necro-job/ref/scythe-user.jpg")
OUT = os.path.join(ROOT, "design/necro-job/ref/scythe-clean.png")
BG = np.array([143, 212, 149], float)    # 바탕 초록
G0, G1 = 12, 52                           # 초록기(g - max(r, b))가 G1 이상이면 바탕, G0 아래면 낫 — 사이는 반투명(연기 · 가장자리)
SPILL = 0.9                               # 초록 상한 = max(빨강, 파랑) × 이 값
MARK = (1245, 625, 1330, 715)             # 오른쪽 아래 생성기 표식(반짝이) — 지운다

a = np.asarray(Image.open(SRC).convert("RGB")).astype(float)
green = a[:, :, 1] - np.maximum(a[:, :, 0], a[:, :, 2])
al = np.clip((G1 - green) / (G1 - G0), 0, 1)
x0, y0, x1, y1 = MARK; al[y0:y1, x0:x1] = 0
# 바탕과 섞인 색을 풀어낸다: 화면 색 = 낫 × α + 바탕 × (1 − α)
safe = np.maximum(al, 1e-3)[:, :, None]
rgb = np.clip((a - BG * (1 - al[:, :, None])) / safe, 0, 255)
# 초록 기운 빼기(11월 20일 사용자 "녹색 끼 없애줘") — 낫에는 초록이 없으니 초록을 빨강 · 파랑 중 큰 값 아래로 누른다(연기는 회보라가 된다)
rgb[:, :, 1] = np.minimum(rgb[:, :, 1], np.maximum(rgb[:, :, 0], rgb[:, :, 2]) * SPILL)
rgb = unteal(rgb)
al[al < 0.08] = 0
im = np.dstack([rgb, al * 255]).astype(np.uint8)
out = Image.fromarray(im, "RGBA")
out = out.crop(out.getbbox())
out.save(OUT)
print(OUT, out.size)
