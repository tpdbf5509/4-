"""관리자 전용 스킨 — 사용자가 직접 그린 시트 둘을 떼어 낸다(design/admin-skin/, 11월 22일).
   서기 admin-standing-v2.png: 흰 바탕 한 줄 4명 = 앞 · 뒤 · 옆(왼쪽을 본다) · 옆(오른쪽을 본다). 게임은 옆 그림을 뒤집어 쓰므로 셋째만 쓴다.
     흰 바탕은 가장자리에서 이어진 흰 점만 지운다 — 흰 슈트 · 흰 신발은 윤곽선에 막혀 남는다. 칸을 4등분하지 않고 덩어리로 나눈다(옆모습 발이 옆 칸으로 넘어가 잘렸다).
   걷기 admin-walk-sheet-v2.png(투명 배경 · 11월 22일 사용자 새 시트, 옛 시트는 admin-walk-sheet.png): 4칸 × 4줄. 줄 = 앞 · 뒤 · 왼쪽 · 오른쪽, 칸 = 걷기 4장. 오른쪽 줄은 쓰지 않는다.
     움찔거림 방지 — 한 줄의 네 장을 같은 창(칸 안 좌표의 합집합)으로 잘라 크기 · 발 기준선 · 가로 중심이 프레임마다 같다.
   결과: public/assets/characters/rpg/admin-skin/ — 무기를 들지 않아 -bare 도 같은 그림.
   실행: python3 tools/cut-admin-skin.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/admin-skin")
OUT = os.path.join(ROOT, "public/assets/characters/rpg/admin-skin")
PAD, FAINT = 6, 40
SCALE = 1.25     # 암살자(여) 앞 키에 대한 배율 — 머리가 큰 2등신이라 다른 히든 직업(1.2~1.4) 사이로 맞춘다
WHITE = 236      # 이보다 밝고 색이 거의 없는 점이 바탕 후보
HALO = 150       # 걷기 시트에서 이보다 옅은 점은 번짐으로 보고 지운다
EDGE = 2         # 바탕과 닿은 이 폭 안의 밝은 점은 흰 바탕을 빼고 반투명으로 푼다

def unwhite(rgb):
    """흰 바탕 → 투명. 가장자리에서 이어진 밝은 점만 바탕으로 본다"""
    a = rgb.astype(np.float32)
    lo, hi = a.min(2), a.max(2)
    cand = (lo >= WHITE) & (hi - lo <= 12)
    lab, _ = ndimage.label(cand)
    border = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, border[border > 0])
    alpha = np.where(bg, 0.0, 1.0)
    near = ndimage.binary_dilation(bg, iterations=EDGE) & ~bg
    soft = np.clip((255 - lo) / (255 - WHITE + 30), 0, 1)       # 밝을수록 더 투명
    alpha = np.where(near, np.minimum(alpha, soft), alpha)
    k = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((a - 255 * (1 - k)) / k, 0, 255)              # 흰색과 섞인 테두리 색을 되돌린다
    return np.dstack([col, alpha * 255]).astype(np.uint8)

def blobs(a, n):
    """큰 덩어리 n개 — (자르기 창, 그 덩어리만 남긴 그림) 을 x 순서로"""
    m = a[..., 3] >= FAINT
    lab, k = ndimage.label(ndimage.binary_dilation(m, iterations=4))
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    ids = [i + 1 for i in np.argsort(-sizes)[:n]]
    out = []
    for i in ids:
        sl = ndimage.find_objects(lab)[i - 1]
        b = a.copy()
        b[..., 3] = np.where((lab == i) & m, b[..., 3], 0)
        out.append((sl, b))
    return sorted(out, key=lambda t: t[0][1].start)

def trim(b):
    ys, xs = np.where(b[..., 3] > 0)
    return Image.fromarray(b[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")

def suit_x(im):
    """흰 슈트(밝고 색이 옅은 점)의 가로 중심 — 머리카락이 흩날려도 몸 자리를 잡는다"""
    a = np.asarray(im).astype(int)
    lo, hi = a[..., :3].min(2), a[..., :3].max(2)
    ys, xs = np.where((a[..., 3] > 200) & (lo > 170) & (hi - lo < 40))
    return xs.mean() if len(xs) else im.size[0] / 2

def place(cr, s, cx=None):
    """줄여 여백을 둔다. cx 를 주면 그 점(줄이기 전 좌표)이 그림 가운데에 오게 좌우 여백을 늘린다 — 게임은 그림 가운데를 발 자리에 둔다"""
    w, h = max(1, round(cr.size[0] * s)), max(1, round(cr.size[1] * s))
    dx = 0 if cx is None else round(w / 2 - cx * s)
    o = Image.new("RGBA", (w + PAD * 2 + abs(dx), h + PAD * 2), (0, 0, 0, 0))
    o.alpha_composite(cr.resize((w, h), Image.LANCZOS), (PAD + max(dx, 0), PAD))
    return o

st = unwhite(np.asarray(Image.open(os.path.join(SRC, "admin-standing-v2.png")).convert("RGB")))
front, back, side, _ = [trim(b) for _, b in blobs(st, 4)]
stand = {"front": front, "back": back, "side": side, "turn": front}
ref = Image.open(os.path.join(os.path.dirname(OUT), "assassin-f", "front.webp")).size[1] - PAD * 2
s = ref / front.size[1] * SCALE
os.makedirs(OUT, exist_ok=True)
for v, cr in stand.items():
    o = place(cr, s, suit_x(cr))
    for name in (f"{v}.webp", f"{v}-bare.webp"):
        o.save(os.path.join(OUT, name), quality=92, method=6)
    print(v, o.size)

wk = np.asarray(Image.open(os.path.join(SRC, "admin-walk-sheet-v2.png")).convert("RGBA")).copy()
wk[..., 3] = np.where(wk[..., 3] < HALO, 0, wk[..., 3])      # 새 시트는 둘레에 반투명 회색 번짐이 있어 어두운 바닥에서 테두리처럼 보였다
H, W = wk.shape[:2]
ch, cw = H // 4, W // 4
for r, v in ((0, "front"), (1, "back"), (2, "side")):
    row = wk[r * ch:(r + 1) * ch]
    frames = blobs(row, 4)                       # 한 줄 네 장 — 칸 안 좌표로 합집합 창을 잡는다
    rel = [(sl[0].start, sl[0].stop, sl[1].start - c * cw, sl[1].stop - c * cw) for c, (sl, _) in enumerate(frames)]
    y0 = min(t[0] for t in rel)
    y1 = max(np.where(b[..., 3].max(1) >= 128)[0].max() + 1 for _, b in frames)   # 발바닥 — 옅은 번짐이 아니라 진한 점으로 잡아 서기와 같은 기준선
    x0, x1 = min(t[2] for t in rel), max(t[3] for t in rel)
    tall = np.median([t[1] - t[0] for t in rel])  # 한 장의 키 — 서 있는 키에 맞춘다
    sw = stand[v].size[1] * s / tall
    crs = [Image.fromarray(b[y0:y1, c * cw + x0:c * cw + x1], "RGBA") for c, (_, b) in enumerate(frames)]
    cx = np.mean([suit_x(cr) for cr in crs])     # 네 장 평균 몸 중심 하나로 — 프레임마다 같은 자리
    for c, cr in enumerate(crs):
        o = place(cr, sw, cx)
        o.save(os.path.join(OUT, f"walk-{v}-{c}.webp"), quality=92, method=6)
        print("walk", v, c, o.size)
