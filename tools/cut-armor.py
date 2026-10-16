"""방어구 그림을 잘라 바탕을 지워 게임용 아이콘(128px 투명 WebP)으로 만든다.

원본: design/armor/sheet-123.jpg  — 초급 · 희귀 · 영웅 × 투구 · 갑옷 · 바지 · 신발 (흰 바탕 · 회색 칸 선 · 글자)
      design/armor/sheet-legend.webp — 전설 투구 · 갑옷 · 바지 · 신발 (흰 바탕)
결과: public/assets/game/rpg/armor/<부위>-<등급>.webp  (부위 head · body · legs · feet, 등급 0 초급 ~ 3 전설)
쓰는 법: python3 tools/cut-armor.py
"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd

DST = "public/assets/game/rpg/armor/"
SLOTS = ["head", "body", "legs", "feet"]
# 칸 — (x0, y0, x1, y1). 첫 장은 부위가 열, 등급이 행이다(글자 칸은 뺀다)
SHEET = "design/armor/sheet-123.jpg"
COLS = [(322, 658), (668, 1092), (1102, 1542), (1552, 1998)]
ROWS = [(86, 330), (338, 580), (588, 840)]
LEGEND = "design/armor/sheet-legend.webp"
LEG_COLS = [(40, 430), (450, 970), (990, 1440), (1500, 1960)]
LEG_ROW = (60, 620)


def flood(mask):
    lab, n = nd.label(mask)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(edge))


def cut(im):
    im = im.astype(np.float32)
    mx, mn = im.max(2), im.min(2)
    sat = mx - mn
    bg = flood((mn > 196) & (sat < 26))              # 흰 바탕과 그에 붙은 옅은 칸 선
    hole = (mn > 236) & (sat < 16) & ~bg               # 갇힌 흰 바탕(손잡이 고리 안처럼)
    lab, n = nd.label(hole)
    if n:
        area = nd.sum(hole, lab, range(1, n + 1))
        bg |= np.isin(lab, [j + 1 for j in range(n) if area[j] > 200])
    a = np.where(bg, 0.0, 1.0)
    # 바탕과 닿은 옅은 테두리는 흰색을 빼고 반투명으로(흰 바탕에 번진 가장자리)
    edge = nd.binary_dilation(bg, iterations=2) & ~bg & (mn > 150)
    al = np.clip((255 - mn) / (255 - 150), 0, 1)
    a[edge] = al[edge]
    rgb = im.copy()
    k = edge & (a > 0.02)
    for c in range(3):
        rgb[..., c][k] = np.clip((im[..., c][k] - 255 * (1 - a[k])) / a[k], 0, 255)
    # 떨어진 작은 티끌 · 글자 조각
    lab, n = nd.label(a > 0.05)
    if n:
        sizes = nd.sum(np.ones_like(a), lab, range(1, n + 1))
        big = sizes.max()
        for j in range(1, n + 1):
            if sizes[j - 1] < max(30, big * 0.004):
                a[lab == j] = 0
    out = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    box = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    out = out.crop(box)
    s = max(out.size) + 10
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(out, ((s - out.size[0]) // 2, (s - out.size[1]) // 2))
    return sq.resize((128, 128), Image.LANCZOS)


def main():
    import os
    os.makedirs(DST, exist_ok=True)
    sheet = np.asarray(Image.open(SHEET).convert("RGB"))
    for g, (y0, y1) in enumerate(ROWS):
        for s, (x0, x1) in enumerate(COLS):
            cut(sheet[y0:y1, x0:x1]).save(f"{DST}{SLOTS[s]}-{g}.webp", "WEBP", quality=92, method=6)
    leg = np.asarray(Image.open(LEGEND).convert("RGB"))
    for s, (x0, x1) in enumerate(LEG_COLS):
        cut(leg[LEG_ROW[0]:LEG_ROW[1], x0:x1]).save(f"{DST}{SLOTS[s]}-3.webp", "WEBP", quality=92, method=6)
    print("ok", len(ROWS) * len(COLS) + len(LEG_COLS))


if __name__ == "__main__":
    main()
