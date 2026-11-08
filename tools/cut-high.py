"""800~1200 사냥터 그림 — 바탕을 지운 시트(key-green.py 결과)를 칸마다 가운데 · 발밑에 앉히고 칸 높이를 채운다.
몹 시트는 일반 · 정예 · 보스를 같은 높이로 맞춘다(크기 차이는 게임의 m.size 가 낸다). 분신 칸의 초록 번짐은 걷어낸다.
사용: python3 tools/cut-high.py 입력.webp 출력.webp --cols 3 --cell 512 --foot 0.95 [--despill 3,4]"""
import argparse, numpy as np
from PIL import Image
from scipy import ndimage
ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--cols", type=int, default=3); ap.add_argument("--cell", type=int, default=512)
ap.add_argument("--foot", type=float, default=0.95); ap.add_argument("--margin", type=int, default=10)
ap.add_argument("--despill", default="", help="초록 번짐을 걷을 칸 번호(쉼표)")
a = ap.parse_args()
C, F, M = a.cell, a.foot, a.margin
A = np.array(Image.open(a.src).convert("RGBA")).astype(np.int32)
for ci in [int(x) for x in a.despill.split(",") if x]:
    s = A[:, ci * C:(ci + 1) * C]
    cap = np.maximum(s[..., 0], s[..., 2])
    s[..., 1] = np.minimum(s[..., 1], cap)              # 초록이 빨강 · 파랑보다 세면 눌러 둔다
A = A.astype(np.uint8)
out = Image.new("RGBA", (C * a.cols, C), (0, 0, 0, 0))
# 시트 전체에서 덩어리를 찾고, 가장 많이 걸친 칸에 배정한다(칸 경계를 넘은 꼬리 · 칼도 제 몹과 함께 옮긴다)
alpha = A[..., 3] > 24
lab, n = ndimage.label(alpha, structure=np.ones((3, 3)))
area = ndimage.sum(alpha, lab, range(1, n + 1))
cell_of = {}
for k in range(1, n + 1):
    if area[k - 1] < max(60, area.max() * 0.004): continue   # 티끌은 버린다
    xs = np.nonzero(lab == k)[1]
    cell_of[k] = int(np.bincount(np.minimum(xs // C, a.cols - 1), minlength=a.cols).argmax())
for ci in range(a.cols):
    mask = np.isin(lab, [k for k, c in cell_of.items() if c == ci])
    if not mask.any(): continue
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    piece = np.zeros_like(A); piece[mask] = A[mask]
    crop = Image.fromarray(piece[y0:y1, x0:x1], "RGBA")
    w = mask[y0:y1, x0:x1].astype(float)
    cx = (w.sum(0) * np.arange(x1 - x0)).sum() / w.sum()
    s = min((C - 2 * M) / crop.width, (C * F - M) / crop.height)
    crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS); cx *= s
    px = max(M, min(C - M - crop.width, round(C / 2 - cx)))
    out.alpha_composite(crop, (ci * C + px, round(C * F - crop.height)))
    print(ci, "배율", round(s, 3))
out.save(a.dst, quality=88, method=6)
chk = Image.new("RGBA", out.size, (60, 50, 70, 255)); chk.alpha_composite(out)
chk.convert("RGB").save(a.dst.rsplit(".", 1)[0] + "-layout.png")
