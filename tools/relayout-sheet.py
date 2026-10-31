"""Codex 시트의 그림을 칸마다 가운데 · 발밑(FOOT) 에 다시 앉힌다 — 칼 · 날개가 칸 밖으로 나간 시트용. key-green.py 로 바탕을 지운 투명 WebP 를 넣는다.
사용: python3 tools/relayout-sheet.py 입력.webp 출력.webp  (3열 × 2행 · 512px · 발밑 0.94 가 기본 — 위쪽 상수를 고친다). 옆에 -layout.png(칸 선 · 발밑선)로 확인한다"""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
src, dst = sys.argv[1], sys.argv[2]
FOOT, MARGIN, CELL, COLS, ROWS = 0.94, 8, 512, 3, 2
im = Image.open(src).convert("RGBA"); A = np.array(im)
alpha = A[..., 3] > 24
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))   # 서로 닿은 것만 한 덩어리(떨어진 불씨 · 돌조각은 자기 칸 몫으로 따로 배정)
# 덩어리를 가장 많이 걸친 칸에 배정
cell_of = {}
for k in range(1, n + 1):
    ys, xs = np.nonzero((lab == k) & alpha)
    if len(xs) == 0: continue
    cells = (ys // CELL) * COLS + (xs // CELL)
    cell_of[k] = int(np.bincount(cells, minlength=COLS * ROWS).argmax())
# 작은 알갱이(불씨 · 꽃잎)는 가장 가까운 큰 덩어리의 칸으로 — 칸 경계를 넘어간 꽃잎이 옆 칸 크기를 흔들지 않게
area = ndimage.sum(alpha, lab, range(1, n + 1))
big = {k: c for k, c in cell_of.items() if area[k - 1] >= 400}
dist = []
for ci in range(COLS * ROWS):
    m = np.isin(lab, [k for k, c in big.items() if c == ci])
    dist.append(ndimage.distance_transform_edt(~m) if m.any() else np.full(alpha.shape, 1e9))
for k in list(cell_of):
    if k in big: continue
    ys, xs = np.nonzero(lab == k)
    cell_of[k] = int(np.argmin([d[ys, xs].min() for d in dist]))
out = Image.new("RGBA", im.size, (0, 0, 0, 0))
for ci in range(COLS * ROWS):
    mask = np.isin(lab, [k for k, c in cell_of.items() if c == ci]) & (A[..., 3] > 0)
    ys, xs = np.nonzero(mask)
    if not len(xs): continue
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    piece = np.zeros_like(A); piece[mask] = A[mask]
    crop = Image.fromarray(piece[y0:y1, x0:x1], "RGBA")
    w = alpha[y0:y1, x0:x1].astype(float)
    cx = (w.sum(0) * np.arange(x1 - x0)).sum() / w.sum()      # 무게 중심 가로(칼 · 날개가 한쪽으로 뻗어도 몸이 가운데에 오게)
    s = min(1.0, (CELL - 2 * MARGIN) / crop.width, (CELL * FOOT - MARGIN) / crop.height)
    if s < 1: crop = crop.resize((round(crop.width * s), round(crop.height * s)), Image.LANCZOS); cx *= s
    px = round(CELL / 2 - cx); px = max(MARGIN, min(CELL - MARGIN - crop.width, px))
    py = round(CELL * FOOT - crop.height)
    out.alpha_composite(crop, ((ci % COLS) * CELL + px, (ci // COLS) * CELL + py))
    print(ci, "원래", (x0, y0, x1, y1), "배율", round(s, 3), "→ 칸 안", (px, py, px + crop.width, py + crop.height))
out.save(dst, quality=90, method=6)
chk = Image.new("RGBA", out.size, (60, 50, 70, 255)); chk.alpha_composite(out)
d = chk.convert("RGB")
from PIL import ImageDraw
g = ImageDraw.Draw(d)
for c in range(1, COLS): g.line([(c * CELL, 0), (c * CELL, out.height)], fill=(255, 255, 255), width=1)
for r in range(1, ROWS): g.line([(0, r * CELL), (out.width, r * CELL)], fill=(255, 255, 255), width=1)
for r in range(ROWS): g.line([(0, r * CELL + int(CELL * FOOT)), (out.width, r * CELL + int(CELL * FOOT))], fill=(255, 220, 0), width=1)
d.save(dst.rsplit(".", 1)[0] + "-layout.png")
