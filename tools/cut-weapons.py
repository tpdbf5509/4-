"""특별 무기 그림의 바탕을 지워 게임용 아이콘(128px 투명 WebP)으로 만든다.

원본: design/weapons/<id>.webp (512px, 바탕이 흰색 · 검은색 · 가짜 체크무늬 · 액자로 제각각)
결과: public/assets/game/rpg/weapons/<id>.webp
쓰는 법: python3 tools/cut-weapons.py            (모두)
         python3 tools/cut-weapons.py flame star (몇 개만)
새 그림을 더하면 아래 KIND(바탕 종류)와 필요하면 GLOW(빛 띠 폭)에 id 를 적는다.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC = "design/weapons/"
DST = "public/assets/game/rpg/weapons/"
# 그림마다 바탕 — white 흰 바탕 · black 검은 바탕 · checker 흰 바탕 + 가짜 체크무늬 · frame 액자 안 검은 바탕
KIND = {"flame": "black", "thunder": "black", "forest": "black", "viper": "white", "frost": "black",
        "star": "white", "holy": "frame", "clockwork": "black", "coral": "white", "shadow": "white",
        # 지팡이
        "flame_staff": "black", "galaxy_staff": "black", "moon_staff": "black", "ice_staff": "frame",
        "skull_staff": "frame", "holy_staff": "black", "thunder_staff": "white",
        # 활
        "lava_bow": "black", "star_bow": "white", "gold_bow": "frame", "shadow_bow": "black", "thunder_bow": "black"}
GLOW = {"thunder": 18, "forest": 4, "frost": 18, "holy": 18,   # 빛이 번진 그림 — 바탕 쪽 빛 띠의 폭(넓으면 얇은 손잡이까지 밝혀 바랜다)
        "flame_staff": 18, "galaxy_staff": 18, "moon_staff": 22, "ice_staff": 18, "holy_staff": 22,
        "lava_bow": 5, "gold_bow": 18, "shadow_bow": 18, "thunder_bow": 18}
# 흰 바탕 둘레에 검은 띠(그림자 · 구름)가 붙은 그림 — 흰 바탕과 이어진 검은 곳까지 바탕으로 본다
DARK_RIM = {"thunder_staff", "star_bow"}
# 활 안쪽에 어두운 바탕(밤하늘)이 칠해진 그림 — 어두운 곳은 밝기만큼만 남겨 별 · 활대 · 활줄만 보이게 한다. (완전히 지울 밝기, 다 남길 밝기)
DARK_FILL = {"star_bow": (34, 80), "gold_bow": (34, 80)}
# 번개 선에 갇혀 바탕 지우기가 닿지 않은 검은 덩어리 — 원본 좌표 상자 안의 검은 곳만 지운다
ERASE_DARK = {"thunder_staff": [(0, 110, 95, 200), (60, 200, 170, 270)]}
# 검은 바탕과 그림 사이에 얇은 흰 테두리(스티커 선)가 있는 그림 — 바탕과 이어진 흰 선까지 지운다
WHITE_RIM = {"flame"}
# 액자 그림 — 잘라 낼 바깥 폭(px)과 액자 안 바탕
FRAME = {"holy": (44, "black"), "ice_staff": (68, "black"), "skull_staff": (58, "white"), "gold_bow": (112, "black")}

def flood(mask):
    lab, n = nd.label(mask)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(edge))

def cut(i):
    im = np.asarray(Image.open(f"{SRC}{i}.webp").convert("RGB")).astype(np.float32)
    kind = KIND[i]
    if kind == "frame":
        m, kind = FRAME[i]
        im = im[m:-m, m:-m]
    mx, mn = im.max(2), im.min(2)
    sat = mx - mn
    a = np.ones(mx.shape, np.float32)
    rgb = im.copy()
    if kind in ("white", "checker"):
        bg = flood(mn > 232)
        if i in DARK_RIM:
            bg = flood(bg | (mx < 34))
        hole = (mn > 240) & ~bg                      # 손잡이 고리 안처럼 갇힌 바탕
        lab, n = nd.label(hole)
        area = nd.sum(hole, lab, range(1, n + 1))
        bg = bg | np.isin(lab, [j + 1 for j in range(n) if area[j] > 300])
        if kind == "checker":
            # 체크무늬 — 무채색 어두운 칸. 칼 둘레(채도 있거나 밝은 곳에서 8px 안)는 검은 칸만 테두리로 남긴다
            core = (sat > 14) & ~bg                    # 무채색(체크무늬 · 그 테두리)은 칼로 보지 않는다
            lab, n = nd.label(core)
            area = nd.sum(core, lab, range(1, n + 1))
            satm = nd.mean(sat, lab, range(1, n + 1))
            keep = [j + 1 for j in range(n) if area[j] >= 150 or satm[j] > 60]   # 체크무늬 테두리 선은 버리고 불티는 남긴다
            core = np.isin(lab, keep)
            near = nd.binary_dilation(core, iterations=4)   # 칼 테두리(검은 선) 폭만큼만
            neutral = (sat <= 14) & (mx <= 95)
            bg = bg | (neutral & ~near) | (neutral & near & (mx > 30))
            bg = flood(bg) | ~near
        # 흰 바탕에 번진 빛 — 바탕과 닿은 밝은 띠는 흰색을 빼고 반투명으로
        band = flood(mn > 150) & ~bg
        alpha = np.clip((255 - mn) / (255 - 150), 0, 1)
        a[bg] = 0
        a[band] = alpha[band]
        k = band & (a > 0.02)
        for c in range(3):
            rgb[..., c][k] = np.clip((im[..., c][k] - 255 * (1 - a[k])) / a[k], 0, 255)
    else:
        bg = flood(mx < 26)
        if i in WHITE_RIM:
            rim = (mn > 150) & (sat < 50) & nd.binary_dilation(bg, iterations=4)   # 바탕 바로 옆의 흰 선만 — 칼자루의 밝은 쇠는 남긴다
            bg = flood(bg | rim)
        hole = (mx < 18) & ~bg                       # 손잡이 고리 안처럼 갇힌 바탕
        lab, n = nd.label(hole)
        area = nd.sum(hole, lab, range(1, n + 1))
        bg = bg | np.isin(lab, [j + 1 for j in range(n) if area[j] > 300])
        # 검은 바탕에 번진 빛 — 바탕 가까이의 어두운 띠는 밝기만큼만 남긴다. 빛이 없는 그림은 가장자리만
        dist = nd.distance_transform_edt(~bg)
        band = (~bg) & (dist <= GLOW.get(i, 3)) & (mx < 110)
        alpha = np.clip((mx - 26) / (110 - 26), 0, 1)
        a[bg] = 0
        a[band] = alpha[band]
        k = band & (a > 0.02)
        for c in range(3):
            rgb[..., c][k] = np.clip(im[..., c][k] / np.maximum(mx[k] / 110, 0.05), 0, 255)
    for x0, y0, x1, y1 in ERASE_DARK.get(i, []):
        box = np.zeros_like(a, bool)
        box[y0:y1, x0:x1] = True
        a[box & (mx < 40)] = 0
    if i in DARK_FILL:
        lo, hi = DARK_FILL[i]
        a = np.minimum(a, np.clip((mx - lo) / (hi - lo), 0, 1))   # 색은 그대로 두고 비침만 — 밝히면 활대가 바랜다
        a[(sat < 22) & (mx > 105) & (mx < 215)] = 0   # 바깥의 흐린 회색 선 찌꺼기 — 흰 별(더 밝다)은 남긴다
    # 워터마크 별 · 떨어진 티끌 — 오른쪽 아래 구석의 작은 덩어리를 지운다
    lab, n = nd.label(a > 0.05)
    H, W = a.shape
    for j in range(1, n + 1):
        ys, xs = np.where(lab == j)
        if len(ys) < 2600 and ys.min() > H * 0.78 and xs.min() > W * 0.78:
            a[lab == j] = 0
        elif len(ys) < 12:
            a[lab == j] = 0
    out = np.dstack([rgb, a * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    box = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop(box)
    s = max(img.size) + 8
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(img, ((s - img.size[0]) // 2, (s - img.size[1]) // 2))
    return sq.resize((128, 128), Image.LANCZOS)

if __name__ == "__main__":
    for name in (sys.argv[1:] or KIND):
        cut(name).save(f"{DST}{name}.webp", "WEBP", quality=92, method=6)
        print("ok", name)
