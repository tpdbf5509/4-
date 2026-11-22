"""관리자 전용 스킨 — 사용자가 직접 그린 시트 둘을 떼어 낸다(design/admin-skin/, 11월 22일).
   Necromancer 004 와 같은 규칙(tools/cut-necro-char.py). 원본은 이미 투명 배경이고 둘레에 옅은 부스러기가 있다.
   서 있는 시트 admin-standing-sheet.png: 한 줄, 칸 4개 = 앞 · 뒤 · 옆(왼쪽을 본다) · 옆(오른쪽을 본다). 게임은 옆 그림을 뒤집어 쓰므로 셋째 칸만 쓴다.
   걷는 시트 admin-walk-sheet.png: 4칸 × 4줄. 줄 = 앞 · 뒤 · 왼쪽 · 오른쪽, 칸 = 걷기 4장. 왼쪽 줄만 쓴다.
   흰 옷 · 흰 신발은 알파로만 자르므로 지워지지 않는다(흰색을 지우는 색 조건이 없다).
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
SCALE = 1.25   # 암살자(여) 앞 키에 대한 배율 — 머리가 큰 2등신이라 다른 히든 직업(1.2~1.4) 사이로 맞춘다

def body(a):
    """옅은 부스러기를 버리고 가장 큰 덩어리(머리카락 · 몸)만 남긴다"""
    a = a.copy()
    a[..., 3] = np.where(a[..., 3] < FAINT, 0, a[..., 3])
    m = ndimage.binary_dilation(a[..., 3] > 0, iterations=4)
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        a[..., 3] = np.where(lab == (1 + int(np.argmax(sizes))), a[..., 3], 0)
    ys, xs = np.where(a[..., 3] > 0)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")

def place(cr, s):
    w, h = max(1, round(cr.size[0] * s)), max(1, round(cr.size[1] * s))
    o = Image.new("RGBA", (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
    o.alpha_composite(cr.resize((w, h), Image.LANCZOS), (PAD, PAD))
    return o

def grid(im, r, c, rows, cols):
    H, W = im.shape[:2]
    return im[r * H // rows:(r + 1) * H // rows, c * W // cols:(c + 1) * W // cols]

st = np.asarray(Image.open(os.path.join(SRC, "admin-standing-sheet.png")).convert("RGBA"))
wk = np.asarray(Image.open(os.path.join(SRC, "admin-walk-sheet.png")).convert("RGBA"))
stand = {"front": body(grid(st, 0, 0, 1, 4)), "back": body(grid(st, 0, 1, 1, 4)), "side": body(grid(st, 0, 2, 1, 4))}
stand["turn"] = stand["front"]
ref = Image.open(os.path.join(os.path.dirname(OUT), "assassin-f", "front.webp")).size[1] - PAD * 2
s = ref / stand["front"].size[1] * SCALE
os.makedirs(OUT, exist_ok=True)
for v, cr in stand.items():
    o = place(cr, s)
    for name in (f"{v}.webp", f"{v}-bare.webp"):
        o.save(os.path.join(OUT, name), quality=92, method=6)
    print(v, o.size)
walk = {v: [body(grid(wk, r, c, 4, 4)) for c in range(4)] for r, v in ((0, "front"), (1, "back"), (2, "side"))}
for v, frames in walk.items():
    sw = stand[v].size[1] * s / max(f.size[1] for f in frames)   # 보기마다 서 있는 키에 맞춘다
    for i, cr in enumerate(frames):
        o = place(cr, sw)
        o.save(os.path.join(OUT, f"walk-{v}-{i}.webp"), quality=92, method=6)
        print("walk", v, i, o.size)
