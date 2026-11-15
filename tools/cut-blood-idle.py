"""히든 직업 BLOOD-001 가만히 서 있는 그림 — 사용자가 준 4방향 시트(design/blood-job/char/blood-f-idle-sheet.png)를 떼어 낸다.
   시트: 왼쪽부터 앞 · 뒤 · 옆(왼쪽을 본다) · 옆(오른쪽을 본다). 게임은 옆 그림을 뒤집어 쓰므로 셋째 칸만 idle-side 로 쓴다. turn 은 앞 그림(cut-blood-char.py 와 같은 결정).
   크기는 cut-blood-char.py 와 같은 배율(앞 그림 키를 암살자 앞 그림에 맞춰 CROWN 을 곱한다). 걷는 그림(front 등)은 건드리지 않는다.
   실행: python3 tools/cut-blood-idle.py → public/assets/characters/rpg/blood-f/idle-<front|back|side|turn>.webp"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/blood-job/char/blood-f-idle-sheet.png")
OUT = os.path.join(ROOT, "public/assets/characters/rpg")
PAD, CROWN, FAINT = 6, 1.14, 24

def crop(im, c):
    H, W = im.shape[:2]
    a = im[:, c * W // 4:(c + 1) * W // 4].copy()
    a[..., 3] = np.where(a[..., 3] < FAINT, 0, a[..., 3])
    ys, xs = np.where(a[..., 3] > 0)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")

def place(cr, s):
    w, h = max(1, round(cr.size[0] * s)), max(1, round(cr.size[1] * s))
    o = Image.new("RGBA", (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
    o.alpha_composite(cr.resize((w, h), Image.LANCZOS), (PAD, PAD))
    return o

im = np.asarray(Image.open(SRC).convert("RGBA"))
cr = {"front": crop(im, 0), "back": crop(im, 1), "side": crop(im, 2)}
cr["turn"] = cr["front"]
ref = Image.open(os.path.join(OUT, "assassin-f", "front.webp")).size[1] - PAD * 2
s = ref / cr["front"].size[1] * CROWN
for v, c in cr.items():
    o = place(c, s)
    o.save(os.path.join(OUT, "blood-f", f"idle-{v}.webp"), quality=92, method=6)
    print(v, o.size)
