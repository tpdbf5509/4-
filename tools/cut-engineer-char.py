"""히든 직업 Engineer 003 엔지니어 외형 — 사용자가 준 시트 둘을 떼어 낸다(design/engineer-job/char/, 11월 17일).
   남 · 여 따로 한 벌씩(여성 11월 17일 처음 · 남성은 같은 날 뒤에 받음).
   서 있는 시트 engineer-<m|f>-standing-sheet.png: 한 줄, 칸 4개 = 앞 · 뒤 · 옆(왼쪽을 본다) · 옆(오른쪽을 본다). 게임은 옆 그림을 뒤집어 쓰므로 셋째 칸만 쓴다.
   걷는 시트 engineer-<m|f>-walk-sheet.png: 4칸 × 4줄. 줄 = 앞 · 뒤 · 왼쪽 · 오른쪽, 칸 = 걷기 4장. 왼쪽 줄만 쓴다.
   결과(public/assets/characters/rpg/engineer-<m|f>/): Gambler 002 와 같은 이름 · 크기 규칙(tools/cut-gambler-char.py).
   엔지니어는 무기를 들지 않아 -bare 도 같은 그림이다.
   실행: python3 tools/cut-engineer-char.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/engineer-job/char")
OUT = os.path.join(ROOT, "public/assets/characters/rpg")
PAD, FAINT = 6, 24
SCALE = {"m": 1.0, "f": 1.0}   # 암살자 앞 키에 대한 배율 — 머리카락 부피가 있어 1.0 으로 두고 연습장 화면으로 확인한다

def body(a):
    """옅은 부스러기를 버리고 가장 큰 덩어리(머리카락 · 몸)만 남긴다 — 가까운 조각은 부풀려 같은 덩어리로 본다"""
    a = a.copy()
    a[..., 3] = np.where(a[..., 3] < FAINT, 0, a[..., 3])
    m = ndimage.binary_dilation(a[..., 3] > 0, iterations=5)
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

for g in ("m", "f"):
    st = np.asarray(Image.open(os.path.join(SRC, f"engineer-{g}-standing-sheet.png")).convert("RGBA"))
    wk = np.asarray(Image.open(os.path.join(SRC, f"engineer-{g}-walk-sheet.png")).convert("RGBA"))
    stand = {"front": body(grid(st, 0, 0, 1, 4)), "back": body(grid(st, 0, 1, 1, 4)), "side": body(grid(st, 0, 2, 1, 4))}
    stand["turn"] = stand["front"]
    ref = Image.open(os.path.join(OUT, f"assassin-{g}", "front.webp")).size[1] - PAD * 2
    s = ref / stand["front"].size[1] * SCALE[g]
    d = os.path.join(OUT, f"engineer-{g}")
    os.makedirs(d, exist_ok=True)
    for v, cr in stand.items():
        o = place(cr, s)
        for name in (f"{v}.webp", f"{v}-bare.webp"):
            o.save(os.path.join(d, name), quality=92, method=6)
        print(g, v, o.size)
    walk = {v: [body(grid(wk, r, c, 4, 4)) for c in range(4)] for r, v in ((0, "front"), (1, "back"), (2, "side"))}
    sw = stand["front"].size[1] * s / walk["front"][0].size[1]
    for v, frames in walk.items():
        for i, cr in enumerate(frames):
            o = place(cr, sw)
            o.save(os.path.join(d, f"walk-{v}-{i}.webp"), quality=92, method=6)
            print(g, "walk", v, i, o.size)
