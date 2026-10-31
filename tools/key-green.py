#!/usr/bin/env python3
"""초록(#00FF00) 바탕 시트의 바탕을 지워 투명 WebP 로 쓴다 — Codex 로 뽑은 캐릭터 · 몹 · 정령 그림용.
가장자리에서 퍼지는 방식이라 몸 속의 초록(독 정령 · 숲 옷)은 남는다. 칸마다 방식을 고른다.
  python3 tools/key-green.py 입력.png 출력.webp --cols 3 --rows 2 [--cell 384] [--mode edge|strict|pocket|0:edge,1:pocket,...]
방식: edge   — 가장자리에서 닿는 바탕만(몸이 초록이어도 안전. 팔 사이 갇힌 틈은 남을 수 있다)
      pocket — edge + 순수 초록 덩어리(60점 이상) 틈까지(몸이 노랑 · 연두 계열일 때)
      strict — 초록기가 강한 점은 모두 — 팔 사이 · 뒤에 갇힌 초록까지(기본. 몸에 초록이 없을 때)
검은 바탕 효과 시트는 지우지 않는다 — 그대로 RGB WebP 로 저장하고 게임에서 lighter 로 그린다(--black). """
import argparse
from collections import deque
import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--cols", type=int, default=1); ap.add_argument("--rows", type=int, default=1)
ap.add_argument("--mode", default="strict", help="edge|strict|pocket 하나, 또는 '3:edge,4:pocket' 처럼 칸마다(없는 칸은 strict)")
ap.add_argument("--black", action="store_true", help="검은 바탕 효과 시트 — 지우지 않고 RGB 로 저장")
ap.add_argument("--size", help="가로x세로 로 크기를 맞춘다(예 1152x768)")
ap.add_argument("--quality", type=int, default=88)
a = ap.parse_args()

im = Image.open(a.src).convert("RGBA")
if a.size:
    w, h = map(int, a.size.lower().split("x")); im = im.resize((w, h), Image.LANCZOS)
if a.black:
    im.convert("RGB").save(a.dst, quality=a.quality, method=6); print("검은 바탕 시트 저장", a.dst, im.size); raise SystemExit

modes = {}
if ":" in a.mode:
    for p in a.mode.split(","): k, v = p.split(":"); modes[int(k)] = v
default = "strict" if ":" in a.mode else a.mode
A = np.array(im).astype(int)
H, W = A.shape[:2]; cw, ch = W // a.cols, H // a.rows

def flood(loose):
    h, w = loose.shape; seen = np.zeros_like(loose); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if loose[y, x]: seen[y, x] = 1; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if loose[y, x] and not seen[y, x]: seen[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and loose[yy, xx] and not seen[yy, xx]: seen[yy, xx] = 1; q.append((yy, xx))
    return seen

BG = np.zeros((H, W), bool)
for ci in range(a.cols * a.rows):
    x0, y0 = (ci % a.cols) * cw, (ci // a.cols) * ch
    c = A[y0:y0 + ch, x0:x0 + cw]; r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mode = modes.get(ci, default)
    edge = flood((r < 80) & (g > 190) & (b < 80))
    if mode == "edge": bg = flood((r < 28) & (g > 238) & (b < 28))   # 몸이 초록이면 엄격하게 — 새어 들어가지 않게
    elif mode == "strict": bg = edge | ((g > 150) & (g - np.maximum(r, b) > 75) & (r < 110))
    else:
        pure = (r < 45) & (g > 215) & (b < 45)
        lab, n = ndimage.label(pure)
        sizes = ndimage.sum(pure, lab, range(1, n + 1)) if n else []
        bg = edge | np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 60])
    BG[y0:y0 + ch, x0:x0 + cw] = bg

# 가장자리 2px — 초록기를 빼고 반투명으로 부드럽게
near = ndimage.binary_dilation(BG, iterations=2) & ~BG
r, g, b = A[..., 0], A[..., 1], A[..., 2]
spill = np.maximum(0, g - np.maximum(r, b))
out = A.copy()
out[..., 1] = np.where(near, np.minimum(g, np.maximum(r, b) + 25), g)
al = np.full(BG.shape, 255); al[BG] = 0; al[near] = np.clip(255 - spill[near] * 1.2, 90, 255)
out[..., 3] = al
res = Image.fromarray(out.astype("uint8"), "RGBA")
res.save(a.dst, quality=a.quality, method=6)
chk = Image.new("RGBA", res.size, (60, 50, 70, 255)); chk.alpha_composite(res)
chk.convert("RGB").save(a.dst.rsplit(".", 1)[0] + "-check.png")
print("저장", a.dst, res.size, "· 확인용", a.dst.rsplit(".", 1)[0] + "-check.png")
