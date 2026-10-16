"""던전 보스 그림 시트에서 게임에 쓸 자세를 잘라 바탕을 지운다(투명 WebP).

원본: design/bosses/<보스>.webp  — 흰 바탕 시트(인게임 스프라이트 · 공격 패턴 예시 칸)
결과: public/assets/game/rpg/boss/<보스>-<자세>.webp
      자세: idle 대기 · move 이동 · attack 공격 · hurt 피격 · dead 사망 · slam 대지 강타(망치를 든) · charge 방패 돌진
쓰는 법: python3 tools/cut-bosses.py [보스 ...]
크기는 원본 그대로 둔다 — 시트의 자세들이 같은 배율이라, 게임은 모두 같은 배율로 발밑 가운데에 맞춰 그린다(rpgArt.js BOSS_ART).
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = "design/bosses/"
DST = "public/assets/game/rpg/boss/"
# 자세마다 칸 — (x0, y0, x1, y1), 원본 시트 좌표. 글자 · 칸 선은 빼고 잡는다
BOXES = {
    "gramor": {
        "idle": (916, 122, 1030, 243), "move": (1043, 122, 1154, 243), "attack": (1158, 118, 1282, 243),
        "hurt": (1296, 122, 1404, 243), "dead": (1408, 140, 1520, 243),
        "slam": (1208, 318, 1345, 442), "charge": (1290, 476, 1490, 580),
    },
    "argas": {
        "idle": (916, 124, 1034, 246), "move": (1040, 124, 1156, 246), "attack": (1166, 118, 1294, 246),
        "hurt": (1300, 124, 1394, 246), "dead": (1400, 130, 1504, 246),
        "slam": (1172, 336, 1350, 462), "charge": (1276, 500, 1494, 594),
    },
}


def cut(im):
    im = im.astype(np.float32)
    mx, mn = im.max(2), im.min(2)
    sat = mx - mn
    near_white = (mn > 196) & (sat < 30)
    lab, n = nd.label(near_white)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    hole = (mn > 214) & (sat < 34) & ~bg               # 팔 · 다리 사이에 갇힌 흰 바탕 — 작은 틈도 지운다(그림에 흰 빛은 없다)
    bg |= hole
    a = np.where(bg, 0.0, 1.0)
    # 바탕과 닿은 옅은 테두리 — 흰색을 빼고 반투명으로
    rim = nd.binary_dilation(bg, iterations=2) & ~bg & (mn > 150)
    al = np.clip((255 - mn) / (255 - 150), 0, 1)
    a[rim] = al[rim]
    rgb = im.copy()
    k = rim & (a > 0.02)
    for c in range(3):
        rgb[..., c][k] = np.clip((im[..., c][k] - 255 * (1 - a[k])) / a[k], 0, 255)
    # 떨어진 티끌 · 글자 조각
    lab, n = nd.label(a > 0.05)
    if n:
        sizes = nd.sum(np.ones_like(a), lab, range(1, n + 1))
        big = sizes.max()
        for j in range(1, n + 1):
            if sizes[j - 1] < max(12, big * 0.004):
                a[lab == j] = 0
    out = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    # 아래 · 가운데를 맞추려고 가로는 칸 그대로, 세로는 발밑까지만 자른다
    box = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(box)


def main(names):
    os.makedirs(DST, exist_ok=True)
    for name in names:
        sheet = np.asarray(Image.open(f"{SRC}{name}.webp").convert("RGB"))
        for pose, (x0, y0, x1, y1) in BOXES[name].items():
            img = cut(sheet[y0:y1, x0:x1])
            img.save(f"{DST}{name}-{pose}.webp", "WEBP", quality=92, method=6)
            print(name, pose, img.size)


if __name__ == "__main__":
    main(sys.argv[1:] or list(BOXES))
