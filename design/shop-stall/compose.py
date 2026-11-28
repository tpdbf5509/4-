# 에르덴 광장 상점 매대(2D) — 물약 매대에서 통과한 공통 레이어에 상점마다 소품과 차양 색만 바꿔 합친다.
#   python3 design/shop-stall/compose.py
# 공통(1단계 통과본 그대로): layers/0-shadow · 1-posts · 2-counter · 3-shade · 5-awning
# 상점마다: gen/props-<id>.png(Codex 소품, 초록 바탕) → <id>/4-props.png, 차양 색 → <id>/5-awning.png
# 출력: <id>/*.png(레이어 원본) · <id>-front.png · public/assets/game/rpg/shop/<id>.webp(무손실)
# 칸은 게임 좌표 x -110..110, y -150..30(발밑 가운데 기준), 1단위 3px → 660 × 540. 물약 상점은 1단계 통과본을 그대로 쓴다.
import os, numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, "..", "..", "public", "assets", "game", "rpg", "shop")
K = 3; FW, FH = 220 * K, 180 * K
COMMON = ["0-shadow", "1-posts", "2-counter", "3-shade", "5-awning"]

# 상점마다 소품 · 차양 색. 차양 색은 shopData.js 의 color 를 따른다(물약 매대 차양의 줄무늬 색 자리만 바꾼다)
SHOPS = {
    "potion": {"props": None, "awning": None},                # 1단계 통과본 그대로
    "scroll": {"props": "props-scroll.png", "awning": "#9fb0a0", "w": 80},
    "junk":   {"props": "props-junk.png",   "awning": "#b0a088", "w": 80},
}

# 광장 리뉴얼(11월 28일, 테스트 서버) — python3 design/shop-stall/compose.py v2 → public/assets/game/rpg/shop-v2/
# 새 가판 넷을 더하고 차양을 계획서 4-1 구역 색으로: 장비 골목 회청 · 살림 장 세이지 · 황금 모퉁이 탁한 금
SHOPS_V2 = {
    "weapon": {"props": "props-weapon.png", "awning": "#9aaec4", "w": 84},
    "forge":  {"props": "props-forge.png",  "awning": "#9aaec4", "w": 84},
    "skill":  {"props": "props-skill.png",  "awning": "#9aaec4", "w": 84},
    "potion": {"props": None,               "awning": "#a3bfa4"},
    "scroll": {"props": "props-scroll.png", "awning": "#a3bfa4", "w": 80},
    "junk":   {"props": "props-junk.png",   "awning": "#a3bfa4", "w": 80},
    "casino": {"props": "props-casino.png", "awning": "#cdb382", "w": 84},
}

def load(p): return np.asarray(Image.open(p).convert("RGBA")).astype(np.float32) / 255
def save(a, p, webp=False):
    im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    im.save(p, "WEBP", lossless=True, quality=100, method=6) if webp else im.save(p, optimize=True)

def key(a):
    """초록 바탕 지우기 — compose_2d.py 와 같은 규칙."""
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    dom = G - np.maximum(R, B)
    o = a.copy(); o[..., 3] = np.clip((0.55 - dom) / 0.33, 0, 1)
    o[..., 1] = np.where(dom > 0.05, np.maximum(R, B) + 0.05, G)
    return o

def resize(a, w, h):
    """미리 곱한 알파로 줄인다(가장자리에 초록 테가 끼지 않게)."""
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    ch = [np.asarray(Image.fromarray(pm[..., i]).resize((w, h), Image.LANCZOS)) for i in range(4)]
    o = np.clip(np.stack(ch, -1), 0, 1); al = o[..., 3:4]
    o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0)
    return np.clip(o, 0, 1)

def over(dst, src):
    sa, da = src[..., 3:4], dst[..., 3:4]; oa = sa + da * (1 - sa)
    oc = np.where(oa > 1e-4, (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-4), 0)
    return np.concatenate([oc, oa], -1)

def place_props(img, width):
    """소품 줄을 물약 병과 같은 배율(70/825)로 두되 가로가 width 단위를 넘으면 줄인다. 가운데 · 바닥을 판매대 윗면(y -26)에."""
    m = img[..., 3] > 0.5; ys, xs = np.where(m)
    x0, x1, y1 = xs.min(), xs.max(), ys.max()
    s = min(70 / 825, width / (x1 - x0))                    # 게임 단위 / 화소 — 물약 매대 손보정 배율
    h, w = img.shape[:2]; nw, nh = round(w * s * K), round(h * s * K)
    r = resize(img, nw, nh)
    X = round(110 * K - (x0 + x1) / 2 * s * K); Y = round((150 - 26) * K - y1 * s * K)
    out = np.zeros((FH, FW, 4), np.float32)
    a0, b0, a1, b1 = max(0, X), max(0, Y), min(FW, X + nw), min(FH, Y + nh)
    out[b0:b1, a0:a1] = r[b0 - Y:b1 - Y, a0 - X:a1 - X]
    return out

def rgb2hsv(c):
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx, mn = c.max(-1), c.min(-1); d = mx - mn
    h = np.zeros_like(mx); nz = d > 1e-6
    rr = nz & (mx == r); gg = nz & (mx == g) & ~rr; bb = nz & ~rr & ~gg
    h[rr] = ((g - b)[rr] / d[rr]) % 6; h[gg] = (b - r)[gg] / d[gg] + 2; h[bb] = (r - g)[bb] / d[bb] + 4
    return np.stack([h / 6, np.where(mx > 0, d / np.maximum(mx, 1e-6), 0), mx], -1)

def hsv2rgb(t):
    h, s, v = t[..., 0] * 6, t[..., 1], t[..., 2]
    i = np.floor(h) % 6; f = h - np.floor(h)
    p, q, u = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    sel = [i == k for k in range(6)]
    return np.stack([np.select(sel, [v, q, p, p, u, v]), np.select(sel, [u, v, v, q, p, p]), np.select(sel, [p, p, u, v, v, q])], -1)

def recolor(aw, hexc):
    """차양의 색 줄무늬(올리브 · 초록 자리, 색상 50~110°)만 목표 색으로. 크림 줄무늬 · 나무는 그대로."""
    t = rgb2hsv(np.array([int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)[None, None])[0, 0]
    hsv = rgb2hsv(aw[..., :3]); deg = hsv[..., 0] * 360
    w = np.clip(1 - np.abs(deg - 67) / 40, 0, 1) * np.clip((hsv[..., 1] - 0.10) / 0.08, 0, 1)
    ref_s, ref_v = 0.22, 0.68                                 # 물약 차양 색 줄무늬(색상 50~110°)의 평균 채도 · 밝기를 재어 본 값
    nh = np.full_like(deg, t[0]); ns = np.clip(hsv[..., 1] * t[1] / ref_s, 0, 1); nv = np.clip(hsv[..., 2] * t[2] / ref_v, 0, 1)
    new = hsv2rgb(np.stack([nh, ns, nv], -1))
    o = aw.copy(); o[..., :3] = aw[..., :3] * (1 - w[..., None]) + new * w[..., None]
    return o

def main():
    import sys
    v2 = "v2" in sys.argv[1:]
    shops, out_dir = (SHOPS_V2, OUT + "-v2") if v2 else (SHOPS, OUT)
    os.makedirs(out_dir, exist_ok=True)
    L = {k: load(os.path.join(D, "layers", k + ".png")) for k in COMMON + ["4-props"]}
    for sid, cfg in shops.items():
        lay = dict(L)
        if cfg["props"]:
            p = os.path.join(D, "gen", cfg["props"])
            if not os.path.exists(p): print("소품 없음:", sid); continue
            lay["4-props"] = place_props(key(load(p)), cfg["w"])
        if cfg["awning"]: lay["5-awning"] = recolor(L["5-awning"], cfg["awning"])
        if not v2 and cfg["props"]:
            os.makedirs(os.path.join(D, sid), exist_ok=True)
            for k in ("4-props", "5-awning"): save(lay[k], os.path.join(D, sid, k + ".png"))
        out = np.zeros((FH, FW, 4), np.float32)
        for k in sorted(lay): out = over(out, lay[k])
        if not v2: save(out, os.path.join(D, sid + "-front.png"))
        save(out, os.path.join(out_dir, sid + ".webp"), True)
        print("ok", sid)

main()
