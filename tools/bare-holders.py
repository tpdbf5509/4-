"""마법사 · 궁수 그림에서 원래 지팡이 · 활을 지운 그림을 만든다 — 특별 지팡이 · 활을 장착하면 이 그림 위에 그 무기를 손에 들려 그린다.

  python3 tools/bare-holders.py            # public/assets/characters/rpg/<직업>-<성별>/<보기>-bare.webp 를 만든다

무기가 보이는 보기만 만든다(마법사 옆 · 뒤, 남자 궁수 옆 · 뒤는 무기가 몸에 가려 보이지 않는다).
1) 무기를 따라 그은 선(STROKES, 원래 그림 크기 기준) 둘레 반폭 안을 지운다. 손(KEEP) 둘레는 남긴다 — 새 무기가 그 위에 그려진다.
2) 지운 곳 가운데 몸 안쪽(양옆이 몸)은 둘레 색으로 메우고, 바깥은 투명하게 둔다.
3) 지팡이 머리의 파란 수정은 색으로 찾아 지운다.
손 · 무기 방향 · 길이는 src/game/rpgArt.js 의 HOLDER_HAND 에 옮겨 적는다.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent / "public/assets/characters/rpg"
SPECK = 60          # 이보다 작은 떨어진 조각은 지운다

# 그림 → (선들 [(점들, 반폭)], 남길 손 (x, y, 반지름), 통째로 지울 상자들 [(x0, y0, x1, y1)] — 지팡이 머리처럼 몸과 떨어진 곳)
STROKES = {
    "mage-m/front": ([([(162, 168), (150, 200), (143, 230), (140, 274)], 5)], (148, 200, 7), [(150, 124, 194, 174)]),
    "mage-m/turn": ([([(40, 176), (40, 200), (43, 218)], 5)], (40, 200, 7), [(26, 134, 55, 179)]),
    "mage-f/front": ([([(166, 168), (159, 188), (152, 194), (144, 224), (137, 264)], 5)], (152, 193, 7), [(152, 120, 196, 172)]),
    "mage-f/turn": ([([(28, 160), (37, 186), (44, 212), (48, 236)], 5)], (37, 186, 7), [(8, 122, 33, 170), (33, 128, 39, 162)]),
    "archer-m/front": ([([(161, 120), (156, 140), (148, 162), (138, 182), (128, 196), (122, 214), (128, 232), (135, 250)], 6),
                        ([(161, 120), (135, 250)], 3)], (126, 196, 8), None),
    "archer-m/turn": ([([(144, 120), (141, 140), (134, 160), (125, 180), (116, 196), (110, 212)], 6),
                       ([(144, 120), (110, 212)], 3)], (117, 194, 8), None),
    "archer-f/front": ([([(176, 108), (178, 125), (176, 142), (171, 158), (164, 172), (155, 186), (148, 196), (145, 207), (151, 219), (157, 228)], 7),
                        ([(176, 108), (157, 228)], 3)], (150, 190, 8), None),
    "archer-f/turn": ([([(14, 120), (16, 140), (20, 158), (26, 175), (27, 190), (25, 210)], 6),
                       ([(14, 120), (25, 210)], 3)], (26, 176, 8), None),
    "archer-f/side": ([([(10, 95), (13, 110), (17, 125), (22, 138), (28, 150), (34, 160), (40, 170), (48, 179), (55, 188)], 7),
                       ([(10, 95), (48, 180)], 3)], (44, 158, 8), None),
    "archer-f/back": ([([(13, 108), (11, 125), (12, 140), (15, 152), (19, 163), (25, 173), (33, 183)], 7),
                       ([(13, 108), (35, 180)], 3)], (30, 166, 7), None),
}


def seg_dist(P, a, b):
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    t = np.clip(((P - a) @ d) / max(d @ d, 1e-6), 0, 1)
    return np.linalg.norm(P - (a + t[..., None] * d), axis=-1)


def bare(name):
    strokes, keep, boxes = STROKES[name]
    im = Image.open(ROOT / f"{name}.webp").convert("RGBA")
    px = np.array(im)
    rgb, a = px[:, :, :3].copy(), px[:, :, 3].copy()
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W]
    P = np.stack([xx, yy], -1).astype(float)
    kill = np.zeros((H, W), bool)
    for pts, hw in strokes:
        for p, q in zip(pts, pts[1:]):
            kill |= seg_dist(P, p, q) < hw
    for x0, y0, x1, y1 in boxes or []:
        kill[y0:y1, x0:x1] = True
    kill &= np.hypot(xx - keep[0], yy - keep[1]) > keep[2]
    kill &= a > 0
    rest = (a > 40) & ~kill
    # 몸 안쪽 — 둘레(지운 곳 빼고)가 거의 다 몸인 곳. 몸 가장자리를 지난 곳은 투명하게 둔다
    win = 2 * max(hw for _, hw in strokes) + 7
    body = ndimage.uniform_filter(rest.astype(float), win)
    known = ndimage.uniform_filter((~kill).astype(float), win)
    inside = kill & (body > 0.85 * np.maximum(known, 1e-6))
    fill = cv2.inpaint(np.ascontiguousarray(rgb[:, :, ::-1]), kill.astype(np.uint8) * 255, 5, cv2.INPAINT_TELEA)[:, :, ::-1]
    rgb[inside] = fill[inside]
    a[kill & ~inside] = 0
    a[inside] = 255
    lab, k = ndimage.label(a > 10)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, k + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < SPECK:
                a[lab == i] = 0
    out = np.dstack([rgb, a]).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(ROOT / f"{name}-bare.webp", "WEBP", quality=92, method=6)
    print("ok", name)


if __name__ == "__main__":
    import sys
    for name in sys.argv[1:] or STROKES:
        bare(name)
