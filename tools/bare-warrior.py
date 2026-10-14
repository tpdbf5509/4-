"""전사 그림에서 원래 칼을 지운 그림을 만든다 — 특별 무기를 장착하면 이 그림 위에 그 무기를 손에 들려 그린다.

  python3 tools/bare-warrior.py            # public/assets/characters/rpg/warrior-*/<view>-bare.webp 를 만든다

1) 손 → 칼끝 대강의 선 둘레(폭 FIT_W)에서 칼날 바깥쪽 절반의 픽셀로 칼날 선을 다시 맞춘다.
2) 맞춘 선을 따라 칼날 폭만큼 지운다. 손 바로 아래(start 비율)부터 지워 장갑은 남긴다.
3) 지우고 남은 작은 조각(외곽선 부스러기)은 몸과 이어져 있지 않으면 지운다.
마지막에 손 · 칼끝 · 칼날 방향을 출력한다 — src/game/rpgArt.js 의 WARRIOR_HAND 에 옮겨 적는다.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / "public/assets/characters/rpg"
FIT_W = 16          # 칼날 선을 찾는 띠 반폭
SPECK = 120         # 이보다 작은 떨어진 조각은 지운다

# 성별 → 보기 → (대강의 손, 대강의 칼끝, 지우기 시작 비율)
BLADES = {
    "m": {
        "front": ((52, 207), (8, 290), 0.18),
        "turn": ((124, 199), (169, 251), 0.16),
        "side": ((74, 196), (9, 259), 0.16),
        "back": ((107, 186), (141, 252), 0.14),
    },
    "f": {
        "front": ((92, 203), (51, 272), 0.18),
        "turn": ((76, 202), (22, 251), 0.16),
        "side": ((45, 196), (7, 251), 0.16),
        "back": ((106, 192), (126, 253), 0.14),
    },
}


def main():
    for g, views in BLADES.items():
        for view, (hand, tip, start) in views.items():
            src = ROOT / f"warrior-{g}" / f"{view}.webp"
            im = Image.open(src).convert("RGBA")
            px = np.array(im)
            a = px[:, :, 3]
            ys, xs = np.nonzero(a > 40)
            pts = np.stack([xs, ys], 1).astype(float)
            h, t = np.array(hand, float), np.array(tip, float)
            d = (t - h) / np.linalg.norm(t - h)
            n = np.array([-d[1], d[0]])
            rel = pts - h
            along, perp = rel @ d, rel @ n
            L = np.linalg.norm(t - h)
            # 1) 칼날 바깥쪽 절반으로 선을 다시 맞춘다
            sel = (along > L * 0.5) & (along < L + 10) & (np.abs(perp) < FIT_W)
            q = pts[sel]
            c = q.mean(0)
            u, s, vt = np.linalg.svd(q - c)
            d2 = vt[0] if vt[0] @ d > 0 else -vt[0]
            n2 = np.array([-d2[1], d2[0]])
            rel2 = pts - c
            al2, pp2 = rel2 @ d2, rel2 @ n2
            band = (np.abs(pp2) < FIT_W) & (al2 > -L)
            tip2 = pts[band][np.argmax(al2[band])]
            hand2 = c + d2 * ((h - c) @ d2)          # 손을 맞춘 선 위로
            outer = band & (al2 > (L * 0.3 - (c - hand2) @ d2) * 0) & ((pts - hand2) @ d2 > L * 0.5)
            half = np.percentile(np.abs(pp2[outer]), 98) + 2.5
            # 2) 손 아래부터 칼끝 너머까지 지운다
            yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
            P = np.stack([xx, yy], -1).astype(float) - hand2
            al3, pp3 = P @ d2, P @ n2
            Lb = (tip2 - hand2) @ d2
            kill = (al3 > Lb * start) & (al3 < Lb + 6) & (np.abs(pp3) < half)
            a = a.copy()
            a[kill] = 0
            # 3) 몸과 떨어진 작은 부스러기를 지운다
            lab, k = ndimage.label(a > 10)
            if k > 1:
                sizes = ndimage.sum(np.ones_like(a), lab, range(1, k + 1))
                for i, sz in enumerate(sizes, 1):
                    if sz < SPECK:
                        a[lab == i] = 0
            px[:, :, 3] = a
            out = src.with_name(f"{view}-bare.webp")
            Image.fromarray(px).save(out, "WEBP", quality=92, method=6)
            ang = np.degrees(np.arctan2(d2[1], d2[0]))
            print(f'{g} {view}: hand [{hand2[0]:.0f}, {hand2[1]:.0f}] tip [{tip2[0]:.0f}, {tip2[1]:.0f}] angle {ang:.0f} half {half:.1f} size {im.size}')


if __name__ == "__main__":
    main()
