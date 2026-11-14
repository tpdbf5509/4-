"""히든 직업 BLOOD-001 캐릭터 그림 — 사용자가 준 투명 시트(design/blood-job/char/blood-<m|f>-sheet.webp, 4열 × 4줄)를 방향별로 떼어 낸다.
   줄: 앞 · 뒤 · 옆(왼쪽을 본다) · 비스듬히(왼쪽). 열은 걷는 4칸 — 지금은 첫 칸만 쓴다. 넷째 줄은 옆으로 걷는 모습이라 turn 에는 앞 그림을 쓴다.
   크기: 앞 그림 키를 기존 암살자 앞 그림 키에 맞춘 배율을 그 성별 모든 방향에 쓴다. 여성은 왕관이 있어 몸이 작아지지 않게 CROWN 만큼 더 키운다.
   무기를 들지 않은 그림이라 <보기>-bare.webp 도 같은 그림으로 둔다(무기 숨기기 · 특별 무기).
   실행: python3 tools/cut-blood-char.py → public/assets/characters/rpg/blood-<m|f>/<front|side|back|turn>(-bare).webp"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/blood-job/char")
OUT = os.path.join(ROOT, "public/assets/characters/rpg")
ROWS = ["front", "back", "side", "turn"]
FAINT = 24        # 이 아래 알파는 지운다(시트 둘레의 옅은 얼룩)
SOLID = 60
PAD = 6
MIN_RUN = 4       # 몸으로 칠 줄의 진한 픽셀 수
CROWN = {"m": 1.06, "f": 1.14}   # 머리 · 몸 크기를 암살자와 맞춘 배율(여성은 왕관만큼 키가 더 크다) — 비교 그림으로 맞췄다

def cell(im, r, c):
    H, W = im.shape[:2]
    y0, y1 = r * H // 4, (r + 1) * H // 4
    x0, x1 = c * W // 4, (c + 1) * W // 4
    a = im[y0:y1, x0:x1].copy()
    a[..., 3] = np.where(a[..., 3] < FAINT, 0, a[..., 3])
    solid = a[..., 3] > SOLID
    # 떨어진 부스러기(옅은 붉은 점)를 빼고 캐릭터 몸이 있는 가로 · 세로 줄만 — 진한 픽셀이 MIN_RUN 개 넘는 줄
    rows = np.where(solid.sum(1) >= MIN_RUN)[0]
    cols = np.where(solid.sum(0) >= MIN_RUN)[0]
    ys0, ys1, xs0, xs1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    a = a[ys0:ys1, xs0:xs1]
    ys, xs = np.where(a[..., 3] > 0)
    return Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")

def place(crop, s):
    w2, h2 = max(1, round(crop.size[0] * s)), max(1, round(crop.size[1] * s))
    im = crop.resize((w2, h2), Image.LANCZOS)
    out = Image.new("RGBA", (w2 + PAD * 2, h2 + PAD * 2), (0, 0, 0, 0))
    out.alpha_composite(im, (PAD, PAD))
    return out

if __name__ == "__main__":
    for g in ["m", "f"]:
        im = np.asarray(Image.open(os.path.join(SRC, f"blood-{g}-sheet.webp")).convert("RGBA"))
        crops = {v: cell(im, r, 0) for r, v in enumerate(ROWS)}
        # 게임의 turn 은 "아래로 가며 왼쪽을 본다" — 거의 앞모습이어야 한다. 시트 넷째 줄은 옆으로 걷는 모습이라
        # 아래로 갈 때 옆으로 걷는 것처럼 보였다(11월 15일 사용자 영상) → 앞 그림을 쓴다
        crops["turn"] = crops["front"]
        ref = Image.open(os.path.join(OUT, f"assassin-{g}", "front.webp")).size[1] - PAD * 2
        s = ref / crops["front"].size[1] * CROWN[g]
        d = os.path.join(OUT, f"blood-{g}")
        os.makedirs(d, exist_ok=True)
        for v, cr in crops.items():
            o = place(cr, s)
            o.save(os.path.join(d, f"{v}.webp"), quality=92, method=6)
            o.save(os.path.join(d, f"{v}-bare.webp"), quality=92, method=6)
            print(g, v, o.size)
