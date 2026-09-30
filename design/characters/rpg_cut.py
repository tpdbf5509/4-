"""RPG 기본 캐릭터 시트를 캐릭터·방향별로 떼어 낸다 (배경이 이미 투명한 시트).
   세 줄(전사·마법사·궁수) × 두 무리(남·여) × 네 방향(앞 · 옆 · 뒤 · 비스듬히)."""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
a = np.asarray(im)
solid = a[..., 3] > 20
lab, n = ndimage.label(solid)
objs = ndimage.find_objects(lab)
sizes = ndimage.sum(solid, lab, range(1, n + 1))
JOBS = ["warrior", "mage", "archer"]
VIEWS = ["front", "side", "back", "turn"]
big = [i for i in range(n) if sizes[i] > 10000]
rows = {}
for i in big:
    o = objs[i]
    cy = (o[0].start + o[0].stop) / 2
    r = 0 if cy < 380 else 1 if cy < 700 else 2
    rows.setdefault(r, []).append(i)
PAD = 6
for r, ids in rows.items():
    ids.sort(key=lambda i: objs[i][1].start)
    assert len(ids) == 8, (r, len(ids))
    for k, i in enumerate(ids):
        g = "m" if k < 4 else "f"
        v = VIEWS[k % 4]
        o = objs[i]
        # 덩어리 둘레의 작은 조각(떨어진 머리카락 끝 등)도 함께 — 상자 안에서 다른 큰 덩어리만 뺀다
        y0, y1, x0, x1 = o[0].start, o[0].stop, o[1].start, o[1].stop
        mask = np.zeros_like(solid)
        box = lab[y0:y1, x0:x1]
        keep = (box == i + 1) | ((box > 0) & ~np.isin(box, [j + 1 for j in big]))
        mask[y0:y1, x0:x1] = keep
        px = a.copy()
        px[..., 3] = np.where(mask | ((a[..., 3] > 0) & ndimage.binary_dilation(mask, iterations=2)), a[..., 3], 0)
        crop = Image.fromarray(px).crop((max(0, x0 - PAD), max(0, y0 - PAD), min(a.shape[1], x1 + PAD), min(a.shape[0], y1 + PAD)))
        d = os.path.join(out, f"{JOBS[r]}-{g}")
        os.makedirs(d, exist_ok=True)
        crop.save(os.path.join(d, f"{v}.webp"), "WEBP", quality=92, alpha_quality=100, method=6)
        print(JOBS[r], g, v, crop.size)
