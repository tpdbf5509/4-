# 광장 리뉴얼 2단계 바닥(11월 28일) — 새 배치(src/game/plazaLayout.js)용 바닥. 테스트 서버(?test)에서만 쓴다(MAPS.plaza.bg).
#   python3 design/plaza-floor/make_v2.py
# 입력: public/assets/game/rpg/plaza.webp (지금 바닥 — make.py 결과)
# 출력: public/assets/game/rpg/plaza-v2.webp (1800 × 1200 그대로) · design/plaza-floor/preview-v2.png
# 계획서 notes/광장-리뉴얼-계획서.md 4-2 「바닥」:
#   옛 사냥문 흙길 · 꽃밭 8곳을 풀로 덮는다 → 새 사냥문 · 훈련장 문으로 가는 흙길 → 원 안 큰 길 다섯을 닳은 밝은 돌 띠로 → 전체 톤다운.
# 원형 포석 배열 · 바깥 톱니 고리는 그대로 둔다.
import os, math, numpy as np
from PIL import Image, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(D, "..", "..")
SRC = os.path.join(ROOT, "public", "assets", "game", "rpg", "plaza.webp")
OUT = os.path.join(ROOT, "public", "assets", "game", "rpg", "plaza-v2.webp")

W, H = 1800, 1200
CX, CY, SQ = 899.5, 639.5, 0.78
RIM = 590                     # 톱니 고리 바깥까지(가로 반지름) — 이 안은 돌, 밖은 풀

# 옛 흙길(rpgArt.js paintPlaza 와 같은 선) · 꽃밭 자리(같은 식)
OLD_PATH = [(1380, 690), (1560, 670), (1700, 660)]
OLD_BEDS = [(CX + math.cos(i / 8 * 2 * math.pi + 0.3) * 640, CY + math.sin(i / 8 * 2 * math.pi + 0.3) * 640 * SQ) for i in range(8)]
GRASS_TILE = (1480, 860, 160, 140)   # 덮을 풀 — 물건이 없는 풀밭 한 칸(x, y, w, h)을 거울로 이어 붙인다

# 새 흙길 — 원 가장자리에서 문까지(plazaLayout.js 의 사냥문 (1700, 780) · 훈련장 문 (100, 480))
NEW_DIRT = [[(1430, 742), (1560, 762), (1700, 780)], [(375, 548), (240, 512), (100, 480)]]
DIRT_W = 74
DIRT = np.array([184, 160, 120], np.float32)       # 톤다운한 흙
DIRT_EDGE = np.array([150, 128, 94], np.float32)

# 원 안 큰 길 — 닳아 밝아진 돌 띠(처음 자리에서 문 셋 방향이 바닥으로 읽힌다)
ROADS = [[(900, 205), (900, 540)], [(1000, 662), (1300, 705), (1440, 740)], [(800, 600), (560, 565), (370, 548)],
         [(850, 712), (720, 900), (610, 1040)], [(960, 712), (1140, 900), (1230, 1010)]]
ROAD_W, ROAD_LIGHT = 120, 9.0

DESAT, LIFT = 0.15, 4.0       # 전체 채도를 15% 낮추고 밝기를 조금 올린다(파스텔 톤 다듬기)


def seg_dist(px, py, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(px - (ax + t * dx), py - (ay + t * dy))


def line_dist(px, py, pts):
    return np.min([seg_dist(px, py, pts[i], pts[i + 1]) for i in range(len(pts) - 1)], axis=0)


def main():
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ell = np.hypot(xx - CX, (yy - CY) / SQ)
    outside = ell > RIM

    # ⓪ 옛 흙길이 덮었던 톱니 고리 — 서쪽 같은 자리를 좌우로 뒤집어 옮겨 온다(원은 좌우 대칭)
    teeth = (line_dist(xx, yy, OLD_PATH) < 52) & (ell > 540) & (ell < 600)
    ys, xs = np.nonzero(teeth)
    im[ys, xs] = im[ys, np.clip(np.round(2 * CX - xs).astype(int), 0, W - 1)]
    outside = (ell > RIM) & ~teeth

    # ① 옛 흙길 · 꽃밭을 풀로 덮는다 — 옆 풀을 옮겨 붙이고 가장자리는 흐리게 섞는다
    cover = np.zeros((H, W), np.float32)
    cover = np.maximum(cover, (line_dist(xx, yy, OLD_PATH) < 52).astype(np.float32) * outside)
    for bx, by in OLD_BEDS:
        cover = np.maximum(cover, (np.hypot((xx - bx) / 54, (yy - by) / 36) < 1).astype(np.float32))
    soft = np.asarray(Image.fromarray((cover * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)), np.float32)[..., None] / 255
    gx, gy, gw, gh = GRASS_TILE
    tile = im[gy:gy + gh, gx:gx + gw]
    tile = np.concatenate([tile, tile[:, ::-1]], axis=1); tile = np.concatenate([tile, tile[::-1]], axis=0)   # 거울로 이어 붙여 이음매를 없앤다
    grass = np.tile(tile, (H // tile.shape[0] + 1, W // tile.shape[1] + 1, 1))[:H, :W]
    out = im * (1 - soft) + grass * soft

    # ② 새 흙길 — 가장자리 한 단 어둡게, 작은 자갈
    rng = np.random.default_rng(1128)
    for pts in NEW_DIRT:
        d = line_dist(xx, yy, pts) * 1.0
        body = np.clip((DIRT_W / 2 - d) / 2.0, 0, 1)[..., None]
        edge = np.clip(1 - np.abs(d - DIRT_W / 2 + 3) / 3.0, 0, 1)[..., None]
        noise = rng.normal(0, 3.2, (H, W, 1)).astype(np.float32)
        col = DIRT + noise
        out = out * (1 - body) + col * body
        out = out * (1 - edge * 0.8) + DIRT_EDGE * edge * 0.8
        for _ in range(60):
            t = rng.random(); i = min(int(t * (len(pts) - 1)), len(pts) - 2)
            a, b = pts[i], pts[i + 1]; f = t * (len(pts) - 1) - i
            px, py = a[0] + (b[0] - a[0]) * f + rng.normal(0, 14), a[1] + (b[1] - a[1]) * f + rng.normal(0, 9)
            r = rng.uniform(1.2, 2.4)
            m = (np.hypot(xx - px, (yy - py) / 0.7) < r)[..., None]
            out = np.where(m, DIRT_EDGE + 6, out)

    # ③ 원 안 큰 길 — 닳은 돌(밝게, 가운데일수록 더)
    inside = (~outside).astype(np.float32)
    road = np.zeros((H, W), np.float32)
    for pts in ROADS:
        road = np.maximum(road, np.clip(1 - line_dist(xx, yy, pts) / (ROAD_W / 2), 0, 1))
    out = out + (road ** 0.7 * inside)[..., None] * ROAD_LIGHT

    # ④ 파스텔 톤 다듬기 — 채도 낮추고 밝기 살짝
    grey = out.mean(axis=2, keepdims=True)
    out = grey + (out - grey) * (1 - DESAT) + LIFT

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    img.save(OUT, "WEBP", quality=92, method=6)
    img.resize((900, 600)).save(os.path.join(D, "preview-v2.png"))


if __name__ == "__main__":
    main()
