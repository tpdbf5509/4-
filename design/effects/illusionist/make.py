# 히든 직업 Illusionist 005(마술사) 도트 이펙트 시트 — 이 스크립트가 한 칸 한 칸 직접 그린다(11월 17일).
# Engineer 003 과 같은 방식(design/effects/engineer/make.py 의 점 · 선 · 타원 도구를 옮겨 씀) — 외부 이펙트 라이브러리 없이 Pillow · numpy 로 찍는다.
# 쓰는 법: python3 design/effects/illusionist/make.py  →  public/assets/game/rpg/effects/hidden-jobs/illusionist/px/*.webp + manifest.json(칸 규격)
#          python3 design/effects/illusionist/make.py preview <폴더>  →  확대한 확인 그림(PNG)도 함께
# 칸 규격은 src/game/illusionPxData.js 에 손으로 옮긴다(manifest.json 과 같아야 한다 — tools/illusion.test.mjs 가 본다).
# 1배 픽셀로 그리고 게임이 정수 배(보통 2배)로 키운다. 팔레트(기획안 제안) 기본 #B7A9D8 · 보조 #FFF4E6 · 강조 #6B3F95 — 카드 · 거울 · 백색 절단선.
import numpy as np
from PIL import Image
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "game", "rpg", "effects", "hidden-jobs", "illusionist", "px")
TAU = math.pi * 2
SQ = 0.78   # 땅 비율(RPG.squash) — 바닥에 깔리는 그림은 세로를 이만큼 누른다

def rgb(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
W = rgb("#FFFFFF")
def al(c, a): return (c[0], c[1], c[2], int(max(0, min(255, round(a * 255)))))

BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) + .5) / 16.0

class Cv:
    def __init__(s, w, h): s.w, s.h = w, h; s.a = np.zeros((h, w, 4), np.uint8)
    def px(s, x, y, c):
        x, y = int(math.floor(x)), int(math.floor(y))
        if 0 <= x < s.w and 0 <= y < s.h:
            if c[3] >= 255: s.a[y, x] = c
            elif c[3] > 0:   # 반투명 — 아래 색 위에 얹는다
                d = s.a[y, x].astype(float); k = c[3] / 255.0; da = d[3] / 255.0
                oa = k + da * (1 - k)
                if oa > 0:
                    for i in range(3): d[i] = (c[i] * k + d[i] * da * (1 - k)) / oa
                    d[3] = oa * 255; s.a[y, x] = np.round(d)
    def rect(s, x, y, w, h, c):
        for j in range(int(h)):
            for i in range(int(w)): s.px(x + i, y + j, c)
    def line(s, x0, y0, x1, y1, c, dash=0):
        x0, y0, x1, y1 = int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))
        dx, dy = abs(x1 - x0), -abs(y1 - y0); sx = 1 if x0 < x1 else -1; sy = 1 if y0 < y1 else -1; e = dx + dy; n = 0
        while True:
            if not dash or (n // dash) % 2 == 0: s.px(x0, y0, c)
            n += 1
            if x0 == x1 and y0 == y1: break
            e2 = 2 * e
            if e2 >= dy: e += dy; x0 += sx
            if e2 <= dx: e += dx; y0 += sy
    def disc(s, cx, cy, rx, ry, c):
        if rx <= 0 or ry <= 0: return
        for y in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1):
            for x in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1):
                if ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1: s.px(x, y, c)
    def ring(s, cx, cy, rx, ry, c, a0=0.0, a1=TAU, gap=0):
        # 1px 타원 테두리 — 둘레를 촘촘히 돌며 찍는다. gap > 0 이면 점선(픽셀 수)
        if rx <= 0 or ry <= 0: return
        n = max(8, int((rx + ry) * 4)); seen = set(); k = 0
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            q = (int(math.floor(cx + math.cos(a) * rx)), int(math.floor(cy + math.sin(a) * ry)))
            if q in seen: continue
            seen.add(q); k += 1
            if gap and (k // gap) % 2: continue
            s.px(q[0], q[1], c)
    def band(s, cx, cy, rx, ry, r0, r1, c, dens=1.0):
        # 타원 띠(반지름 비율 r0~r1)를 채운다. dens < 1 이면 4×4 체크 무늬(오더드 디더)로 성기게 — 도트 그림의 옅어짐
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        d = np.sqrt(((xx + .5 - cx) / rx) ** 2 + ((yy + .5 - cy) / ry) ** 2)
        dn = dens(d) if callable(dens) else dens
        m = (d >= r0) & (d <= r1) & (BAYER[yy % 4, xx % 4] < dn)
        s.a[m] = c
    def poly(s, pts, c, close=True, dash=0):
        for i in range(len(pts) - (0 if close else 1)):
            a, b = pts[i], pts[(i + 1) % len(pts)]; s.line(a[0], a[1], b[0], b[1], c, dash)
    def fillpoly(s, pts, c):
        ys = [p[1] for p in pts]
        for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
            xs = []; yy = y + .5
            for i in range(len(pts)):
                (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % len(pts)]
                if (y0 <= yy < y1) or (y1 <= yy < y0): xs.append(x0 + (yy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for i in range(0, len(xs) - 1, 2):
                for x in range(int(math.ceil(xs[i] - .5)), int(math.floor(xs[i + 1] - .5)) + 1): s.px(x, y, c)
    def paste(s, o, x, y):
        for j in range(o.h):
            for i in range(o.w):
                c = o.a[j, i]
                if c[3]: s.px(x + i, y + j, tuple(int(v) for v in c))
    def rows(s, rows, pal, x, y):
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != "." and ch in pal: s.px(x + i, y + j, pal[ch])

def rnd(seed, i, k=0):   # 씨앗 고정 난수(0~1) — 같은 그림이 다시 나온다
    v = math.sin(seed * 12.9898 + i * 78.233 + k * 37.719) * 43758.5453
    return v - math.floor(v)
def ez(k): k = max(0.0, min(1.0, k)); return 1 - (1 - k) ** 3
def star(c, x, y, arm, col, tip=None):   # 십자 반짝임 — 가운데가 가장 밝다
    x, y = int(round(x)), int(round(y))
    for i in range(1, int(arm) + 1):
        cc = tip if tip and i == int(arm) else col
        c.px(x + i, y, cc); c.px(x - i, y, cc); c.px(x, y + i, cc); c.px(x, y - i, cc)
    if arm >= 1: c.px(x, y, W if arm >= 2 else col)

    else: c.px(x, y, col)

def outline(c, col):   # 그린 것 둘레에 1px 윤곽(투명한 칸에만)
    a = c.a[..., 3] > 0
    m = np.zeros_like(a)
    m[1:, :] |= a[:-1, :]; m[:-1, :] |= a[1:, :]; m[:, 1:] |= a[:, :-1]; m[:, :-1] |= a[:, 1:]
    m &= ~a
    c.a[m] = col

def pack(name, cells, cols=None, man=None, cx=None, cy=None, loop=0, rows=1, **extra):
    w, h = cells[0].w, cells[0].h; cols = cols or len(cells); R = math.ceil(len(cells) / cols)
    im = np.zeros((R * h, cols * w, 4), np.uint8)
    for i, c in enumerate(cells): im[(i // cols) * h:(i // cols) * h + h, (i % cols) * w:(i % cols) * w + w] = c.a
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(im, "RGBA").save(os.path.join(OUT, name + ".webp"), lossless=True, quality=100, method=6)
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(cells) // rows, "cx": w // 2 if cx is None else cx, "cy": h // 2 if cy is None else cy, **({"loop": 1} if loop else {}), **({"rows": rows} if rows > 1 else {}), **extra}
    return im

# ── 팔레트 — 라벤더 · 짙은 보라 · 크림 흰색 · 푸른 테두리 · 카드 무늬 붉은색 ──
P = [rgb(c) for c in ["#1A1124", "#2A1C3A", "#46305F", "#6B3F95", "#9A7CC4", "#B7A9D8", "#DCD3EE"]]
C = [rgb(c) for c in ["#7D6D5C", "#C9B79F", "#EEDFCA", "#FFF4E6", "#FFFFFF"]]
B = [rgb(c) for c in ["#35557A", "#5F88B6", "#9CC3E8", "#D6EBFB"]]
R = [rgb(c) for c in ["#7E3248", "#B9536B"]]
TINTS = ["white", "blue", "mirror"]
def rim(tint):   # 카드 테두리 — 75 부터 푸른빛
    return C[4] if tint == "white" else B[2]

# 카드 한 장(앞 · 뒤) — w × h 를 (x, y) 왼쪽 위에. face 앞면이면 크림 바탕에 붉은 무늬, 뒷면은 보라(130 이면 거울 무늬)
def card(c, x, y, w, h, tint="white", face=True, pip=True):
    w, h = max(1, int(round(w))), max(1, int(round(h)))
    x, y = int(round(x)), int(round(y))
    if face:
        c.rect(x, y, w, h, C[3])
        if w >= 3 and h >= 4:
            c.rect(x + 1, y + h - 1, w - 1, 1, C[1]); c.rect(x + w - 1, y + 1, 1, h - 1, C[1])
            if pip: c.px(x + w // 2, y + h // 2, R[1]); c.px(x + w // 2, y + h // 2 - 1, R[1]) if h >= 7 else None; c.px(x + 1, y + 1, R[0])
    else:
        c.rect(x, y, w, h, P[3])
        if tint == "mirror":
            for j in range(h):
                for i in range(w):
                    if (i + j) % 3 == 0: c.px(x + i, y + j, P[5])
                    elif (i - j) % 4 == 0: c.px(x + i, y + j, B[3])
        else:
            for j in range(1, h - 1, 2):
                for i in range(1 + (j // 2) % 2, w - 1, 2): c.px(x + i, y + j, P[4])
    c.poly([(x - 1, y - 1), (x + w, y - 1), (x + w, y + h), (x - 1, y + h)], rim(tint))
    return c

# ── 절단 카드(16×16) — 8칸 회전(가로 폭이 줄었다 늘며 앞 · 뒤가 바뀐다). 줄 = 연마 색 ──
def card_cells():
    out = []
    for tint in TINTS:
        for f in range(8):
            c = Cv(16, 16); a = f * TAU / 8; k = math.cos(a); w = max(1, round(7 * abs(k)))
            card(c, 8 - w / 2, 3, w, 10, tint, face=k >= 0, pip=w >= 4)
            if f in (0, 4): c.px(15, 8, al(C[4], .6)); c.px(14, 8, al(P[5], .5))
            out.append(c)
    return out

# ── 카드 조각(32×32) — 흰 절단선이 번쩍이고 카드가 네 조각으로 흩어진다 ──
def shard_cells():
    out = []
    for f in range(7):
        c = Cv(32, 32); u = f / 6
        if f < 2:
            c.line(4, 28, 28, 4, C[4]); c.line(5, 28, 28, 5, al(P[5], .7)); c.line(4, 27, 27, 4, al(P[5], .7))
            star(c, 16, 16, 4 - f * 2, C[4], P[5])
        d = ez(u) * 11
        for q, (sx, sy) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
            x = 16 + sx * (2 + d) - 2; y = 16 + sy * (2 + d * .8) - 3 + u * u * 6
            if f < 6: card(c, x, y, 4 - (f > 3), 5 - (f > 3), "white", face=q % 2 == 0, pip=False)
        for j in range(5):
            a = rnd(5, j) * TAU; r = 3 + d * 1.2
            if f < 5: c.px(16 + math.cos(a) * r, 16 + math.sin(a) * r, P[5] if j % 2 else C[4])
        out.append(c)
    return out

# ── 절단선 마디(8×6) — 가로로 늘려 그린다. 줄 0 흰 선 · 1 보라 선(덱 슬래시 두 번째) ──
def cut_cells():
    out = []
    for row in range(2):
        hi, mid = (C[4], P[5]) if row == 0 else (P[6], P[3])
        for f in range(3):
            c = Cv(8, 6)
            a = [1, .7, .35][f]
            c.rect(0, 3, 8, 1, al(hi, a)); c.rect(0, 2, 8, 1, al(mid, a * .7)); c.rect(0, 4, 8, 1, al(mid, a * .5))
            if f == 0: c.rect(0, 1, 8, 1, al(mid, .25)); c.rect(0, 5, 8, 1, al(mid, .25))
            out.append(c)
    return out

# ── 작은 폭발(64×64) — 흰 섬광 → 라벤더 고리 · 카드 조각 → 디더 연기. 그림 속 반지름 28 ──
def burst_cells(seed=3):
    out = []
    for f in range(8):
        c = Cv(64, 64); u = f / 7; cx, cy = 32, 34
        r = 6 + ez(u) * 22
        if f < 3: c.disc(cx, cy, 10 - f * 2, 8 - f * 2, C[4]); c.band(cx, cy, 14 - f, 12 - f, .6, 1, P[6], dens=.8)
        c.band(cx, cy, r, r * SQ, .82, 1, al(P[5], 1 - u * .6), dens=1 - u * .6)
        c.band(cx, cy, r * .9, r * .9 * SQ, .7, .82, al(P[3], 1 - u * .5), dens=.7 - u * .5)
        c.band(cx, cy - 3 - u * 6, r * .7, r * .55, 0, .6, al(P[2], .8), dens=max(0, .35 - u * .35) if f > 2 else 0)
        for j in range(9):
            a = rnd(seed, j) * TAU; d = r * (.5 + rnd(seed, j, 1) * .6)
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * SQ - (1 - (2 * u - 1) ** 2) * 8 * rnd(seed, j, 2)
            if f < 7:
                if j % 3 == 0: card(c, x - 1, y - 2, 2, 3, "white", face=j % 2 == 0, pip=False)
                else: star(c, x, y, 1 if f < 4 else 0, C[4] if j % 2 else P[6], P[4])
        out.append(c)
    return out

# ── 카드 부채(40×32) — 손 위에서 카드가 하나씩 펼쳐진다 · 기준점 손 ──
def fan_cells():
    out = []
    for f in range(5):
        c = Cv(40, 32)
        n = f + 1
        for i in range(n):
            a = -0.9 + 1.8 * (i + .5) / 5
            x = 20 + math.sin(a) * 9 - 3; y = 22 - math.cos(a) * 12 - 5
            card(c, x, y, 6, 9, "white", face=True, pip=True)
        out.append(c)
    return out

# ── 덱 슬래시 호(112×72) — 카드 조각으로 이어진 초승달 참격(오른쪽). 줄 0 흰빛 · 1 보랏빛(역방향) ──
def arc_cells():
    out = []
    for row in range(2):
        hi, mid, lo = (C[4], P[6], P[4]) if row == 0 else (P[6], P[4], P[3])
        for f in range(6):
            c = Cv(112, 72); u = f / 5; cx, cy = 40, 40
            sweep = min(1, (f + 1) / 3); fade = max(0, (f - 2) / 3)
            a0 = -1.25; a1 = a0 + 2.5 * sweep
            for k in range(3):
                R0 = 46 + k * 6
                n = 40
                for i in range(n + 1):
                    a = a0 + (a1 - a0) * i / n
                    if rnd(row * 9 + k, i) < fade: continue
                    x = cx + math.cos(a) * R0; y = cy + math.sin(a) * R0 * .62
                    col = hi if k == 1 else mid if k == 0 else lo
                    c.px(x, y, col); c.px(x + 1, y, col)
            for i in range(7):
                a = a0 + (a1 - a0) * (i + .5) / 7
                if rnd(row + 4, i) < fade: continue
                x = cx + math.cos(a) * 52; y = cy + math.sin(a) * 52 * .62
                card(c, x - 2, y - 3, 3, 5, "white", face=(i + row) % 2 == 0, pip=False)
            for j in range(10):
                a = a0 + (a1 - a0) * rnd(row * 3 + 1, j); d = 40 + rnd(row, j, 2) * 26
                if f >= 1 and f < 5: star(c, cx + math.cos(a) * d, cy + math.sin(a) * d * .62, 1 if j % 3 == 0 else 0, hi, mid)
            out.append(c)
    return out

# ── 카드 상자(128×112) — 0~3 면이 하나씩 · 4~7 유지(테두리 반짝임) · 8~11 접히며 번쩍. 그림 속 반지름 56 ──
def box_cells():
    out = []
    cx, cy = 64, 64
    def cube(c, s, col_e, col_f, a_face):
        # 비스듬히 본 정육면체 — 앞면 사각 · 뒷면은 위로 밀린 사각(카드 무늬 면)
        w = 52 * s; hgt = 40 * s; off = 26 * s
        fr = [(cx - w * .7, cy - hgt * .3), (cx + w * .7, cy - hgt * .3), (cx + w * .7, cy + hgt * .55), (cx - w * .7, cy + hgt * .55)]
        bk = [(x + off * .55, y - off) for x, y in fr]
        return fr, bk
    for f in range(12):
        c = Cv(128, 112)
        if f < 4: s = 1.0; faces = f + 1; flash = 0
        elif f < 8: s = 1.0; faces = 6; flash = 0
        else: s = 1 - (f - 7) / 5; faces = 6; flash = f - 8
        fr, bk = cube(c, s, None, None, 1)
        c.band(cx, cy + 20 * s, 60 * s, 60 * s * SQ, 0, 1, al(P[2], .5), dens=.35 if f < 8 else .2)   # 바닥 그늘
        # 면을 카드 격자로 채운다(반투명 · 디더) — 뒷면 · 옆면 먼저
        quads = [bk, [fr[0], fr[1], bk[1], bk[0]], [fr[1], fr[2], bk[2], bk[1]], [fr[0], fr[3], bk[3], bk[0]], [fr[3], fr[2], bk[2], bk[3]], fr]
        for qi, q in enumerate(quads[:faces]):
            m = Cv(128, 112); m.fillpoly(q, al(P[3] if qi % 2 else P[4], .38 if qi < 5 else .22))
            msk = m.a[..., 3] > 0
            yy, xx = np.mgrid[0:112, 0:128]
            grid = ((xx // 6 + yy // 8) % 2 == 0) & msk & (BAYER[yy % 4, xx % 4] < .55)
            c.a[grid] = np.array(al(P[4] if qi % 2 else P[5], .55), np.uint8)
        for q in quads[:faces]:
            c.poly(q, C[4] if (f >= 4 and f < 8 and (f % 2 == 0)) else P[6])
        for i in range(4):   # 꼭짓점 카드
            if faces > i: card(c, fr[i][0] - 2, fr[i][1] - 3, 4, 6, "white", face=True, pip=False); card(c, bk[i][0] - 2, bk[i][1] - 3, 4, 6, "white", face=False, pip=False)
        if 4 <= f < 8:
            for j in range(6):
                a = rnd(31, j, f) * TAU; d = rnd(32, j, f) * 30
                star(c, cx + math.cos(a) * d, cy - 10 + math.sin(a) * d * .7, 1, C[4], P[5])
        if flash >= 0 and f >= 8:
            star(c, cx, cy, 6 + flash * 3, C[4], P[5])
            c.band(cx, cy, 10 + flash * 10, (10 + flash * 10) * .8, .75, 1, al(C[4], .8 - flash * .18), dens=.8)
        out.append(c)
    return out

# ── 팬텀 피스트(112×96) — 0~3 카드가 모여 주먹 · 4~7 내지름(뒤로 흐르는 카드 줄) · 8~9 흩어짐. 오른쪽을 본다 ──
def fist_shape(c, x, y, s, col, rimc):
    # 카드를 겹쳐 만든 주먹 — 손가락 마디 넷(위에서 아래) · 엄지 · 손목
    for i in range(4):
        card(c, x + 10 * s, y - 16 * s + i * 8 * s, 14 * s, 7 * s, "white", face=True, pip=False)
    card(c, x - 2 * s, y - 14 * s, 13 * s, 30 * s, "white", face=False, pip=False)
    card(c, x + 2 * s, y + 10 * s, 14 * s, 6 * s, "white", face=True, pip=False)
    c.rect(x - 14 * s, y - 8 * s, 12 * s, 16 * s, P[3]); c.poly([(x - 14 * s, y - 8 * s), (x - 2 * s, y - 8 * s), (x - 2 * s, y + 8 * s), (x - 14 * s, y + 8 * s)], rimc)
def fist_cells():
    out = []
    for f in range(10):
        c = Cv(112, 96); cx, cy = 40, 56
        if f < 4:
            k = (f + 1) / 4
            for j in range(14):
                a = rnd(41, j) * TAU; d = (1 - k) * 34 + 4
                card(c, cx + 8 + math.cos(a) * d - 2, cy + math.sin(a) * d * .8 - 3, 4, 6, "white", face=j % 2 == 0, pip=False)
            if f >= 2: fist_shape(c, cx, cy, .6 + .2 * (f - 2), P[3], C[4])
        elif f < 8:
            px = cx + (f - 4) * 4
            for j in range(9):   # 뒤로 흐르는 카드 줄 · 바람선
                y = cy - 18 + j * 4.5; L = 14 + rnd(43, j, f) * 22
                c.line(px - 18 - L, y, px - 18, y, al(C[4] if j % 2 else P[5], .8))
            fist_shape(c, px, cy, 1.0, P[3], C[4] if f % 2 else B[3])
            star(c, px + 26, cy - 4, 2 + (f - 4), C[4], P[5])
        else:
            u = (f - 7) / 2
            for j in range(18):
                a = rnd(47, j) * TAU; d = 6 + u * 34 * (.5 + rnd(48, j))
                card(c, cx + 10 + math.cos(a) * d - 2, cy + math.sin(a) * d * .8 - 3 + u * u * 8, 3, 5, "white", face=j % 2 == 1, pip=False)
            star(c, cx + 18, cy - 2, 5 - f + 7, C[4], P[5])
        out.append(c)
    return out

# ── 거울 프레임(24×40) — 0~3 솟아오름 · 4~7 유리 위 빛줄기가 흐른다 · 발밑 기준 ──
def mirror_draw(c, x, y, s=1.0, shine=-1, crack=0.0):
    w, h = 16 * s, 26 * s
    c.disc(x, y - h / 2 - 4 * s, w / 2 + 1, h / 2 + 1, P[3])
    c.disc(x, y - h / 2 - 4 * s, w / 2, h / 2, B[1])
    c.band(x, y - h / 2 - 4 * s, w / 2, h / 2, 0, .85, al(B[2], .9), dens=.55)
    c.ring(x, y - h / 2 - 4 * s, w / 2 + 1, h / 2 + 1, P[5])
    if shine >= 0:   # 유리 위 빛줄기 — 거울 안쪽만 남긴다
        t = Cv(c.w, c.h)
        for k in range(3):
            sx = x - w / 2 + (shine + k * 3) % (w + 6) - 3
            t.line(sx, y - h + 1, sx + 6, y - 6, al(C[4], .8 - k * .25))
        yy, xx = np.mgrid[0:c.h, 0:c.w]
        ins = ((xx + .5 - x) / (w / 2)) ** 2 + ((yy + .5 - (y - h / 2 - 4 * s)) / (h / 2)) ** 2 <= 1
        m = (t.a[..., 3] > 0) & ins; c.a[m] = t.a[m]
    c.rect(x - 1, y - 4 * s, 2, 4 * s, P[4]); c.rect(x - 5 * s, y - 1, 10 * s, 1, P[5])
    if crack:
        for k in range(5):
            a = rnd(91, k) * TAU; L = crack * 10 * s
            c.line(x, y - h / 2 - 4 * s, x + math.cos(a) * L, y - h / 2 - 4 * s + math.sin(a) * L * 1.4, C[4])
def mirror_cells():
    out = []
    for f in range(8):
        c = Cv(24, 40)
        if f < 4:
            k = (f + 1) / 4; m = Cv(24, 40); mirror_draw(m, 12, 38, 1.0)
            cut = int(40 - 38 * k)   # 아래에서 위로 드러난다
            m.a[:cut] = 0
            for j in range(4): c.px(12 + (rnd(7, j, f) - .5) * 18, 38 - rnd(8, j, f) * 30 * k, C[4] if j % 2 else P[6])
            c.paste(m, 0, 0) if False else None
            c.a[m.a[..., 3] > 0] = m.a[m.a[..., 3] > 0]
        else:
            mirror_draw(c, 12, 38, 1.0, shine=(f - 4) * 6)
        out.append(c)
    return out

# ── 큰 거울(112×144) — 0~3 카드가 가운데로 모여 거울이 선다 · 4 빛나는 거울 · 5~11 부서진다. 땅 기준 ──
def big_cells():
    out = []
    cx, by = 56, 136
    for f in range(12):
        c = Cv(112, 144)
        if f < 4:
            k = (f + 1) / 4
            for j in range(12):
                a = j * TAU / 12 + k * 1.2; d = (1 - k) * 48 + 8
                card(c, cx + math.cos(a) * d - 3, by - 60 + math.sin(a) * d * .9 - 5, 6, 9, "white", face=j % 2 == 0, pip=True)
            if f >= 2:
                m = Cv(112, 144); mirror_draw_big(m, cx, by, .5 + .25 * (f - 2))
                c.a[m.a[..., 3] > 0] = m.a[m.a[..., 3] > 0]
        elif f == 4:
            mirror_draw_big(c, cx, by, 1.0, glow=1)
        else:
            u = (f - 4) / 7
            for j in range(26):
                a = rnd(61, j) * TAU; d = 4 + ez(u) * 60 * (.4 + rnd(62, j))
                x = cx + math.cos(a) * d; y = by - 62 + math.sin(a) * d * .8 + u * u * 30 * rnd(63, j)
                s = 2 + int(rnd(64, j) * 4)
                col = B[3] if j % 3 == 0 else B[2] if j % 3 == 1 else C[4]
                tri = [(x, y - s), (x + s * .7, y + s * .5), (x - s * .6, y + s * .4)]
                c.fillpoly(tri, B[1] if j % 2 else B[2]); c.poly(tri, col)
                if j % 4 == 0 and f < 10: star(c, x, y, 1, C[4], P[5])
            if f < 8: star(c, cx, by - 62, 10 - (f - 5) * 3, C[4], P[5]); c.band(cx, by - 62, 20 + (f - 5) * 16, (20 + (f - 5) * 16) * .9, .8, 1, al(C[4], .8 - (f - 5) * .25), dens=.75)
        out.append(c)
    return out
def mirror_draw_big(c, x, by, s, glow=0):
    w, h = 64 * s, 100 * s; cy = by - 12 - h / 2
    c.disc(x, cy, w / 2 + 3, h / 2 + 3, P[3]); c.ring(x, cy, w / 2 + 3, h / 2 + 3, P[6]); c.ring(x, cy, w / 2 + 1, h / 2 + 1, P[5])
    c.disc(x, cy, w / 2, h / 2, B[1])
    c.band(x, cy, w / 2, h / 2, 0, .9, al(B[2], .9), dens=.5)
    c.band(x, cy, w / 2, h / 2, 0, .5, al(B[3], .9), dens=.3 + .4 * glow)
    for k in range(3): c.line(x - w / 3 + k * 6, cy - h / 3, x - w / 6 + k * 6, cy + h / 4, al(C[4], .7))
    c.rect(x - 2, by - 12, 4, 12, P[4]); c.rect(x - 14 * s, by - 2, 28 * s, 2, P[5])
    for i in range(6):   # 테두리의 카드 장식
        a = -math.pi / 2 + (i - 2.5) * .45
        card(c, x + math.cos(a) * (w / 2 + 3) - 2, cy + math.sin(a) * (h / 2 + 3) - 3, 4, 6, "white", face=i % 2 == 0, pip=False)
    if glow:
        for j in range(8):
            a = j * TAU / 8; star(c, x + math.cos(a) * (w / 2 + 10), cy + math.sin(a) * (h / 2 + 8), 2, C[4], P[5])

# ── 잔상(64×64) — 반투명 카드 실루엣이 X 로 그어진다. 줄 0 트릭(라벤더) · 1 거울(청백) ──
def ghost_cells():
    out = []
    for row in range(2):
        hi, mid, lo = (C[4], P[5], P[3]) if row == 0 else (B[3], B[2], B[0])
        for f in range(6):
            c = Cv(64, 64); u = f / 5; a = 1 - u * .8
            for k, (x0, y0, x1, y1) in enumerate([(14, 14, 50, 50), (50, 14, 14, 50)]):
                if f == 0 and k == 1: continue
                c.line(x0, y0, x1, y1, al(hi, a)); c.line(x0 + 1, y0, x1 + 1, y1, al(mid, a * .8)); c.line(x0 - 1, y0, x1 - 1, y1, al(mid, a * .8))
                c.line(x0 + 2, y0, x1 + 2, y1, al(lo, a * .5)); c.line(x0 - 2, y0, x1 - 2, y1, al(lo, a * .5))
            m = Cv(64, 64); card(m, 26 - u * 4, 22 - u * 4, 12 + u * 8, 18 + u * 10, "mirror" if row else "white", face=False, pip=False)
            m.a[..., 3] = (m.a[..., 3] * (.55 * a)).astype(np.uint8)
            msk = (m.a[..., 3] > 0) & (BAYER[np.mgrid[0:64, 0:64][0] % 4, np.mgrid[0:64, 0:64][1] % 4] < .6 * a + .1)
            c.a[msk & (c.a[..., 3] == 0)] = m.a[msk & (c.a[..., 3] == 0)]
            for j in range(8):
                ang = rnd(71 + row, j) * TAU; d = 6 + u * 22
                if f < 5: star(c, 32 + math.cos(ang) * d, 32 + math.sin(ang) * d, 1 if j % 3 == 0 else 0, hi, mid)
            out.append(c)
    return out

# ── 순간이동 섬광(32×32) — 십자 빛 · 회전하는 작은 카드 넷 ──
def flash_cells():
    out = []
    for f in range(6):
        c = Cv(32, 32); u = f / 5
        star(c, 16, 16, max(0, 7 - f * 1.5), C[4], P[5])
        c.ring(16, 16, 3 + u * 11, 3 + u * 11, al(P[6], 1 - u))
        for j in range(4):
            a = j * TAU / 4 + u * 2; d = 4 + u * 10
            if f < 5: card(c, 16 + math.cos(a) * d - 1, 16 + math.sin(a) * d - 2, 2, 3, "white", face=j % 2 == 0, pip=False)
        out.append(c)
    return out

# ── 작은 입자(16×16) — 범위를 촘촘히 채운다. 줄 0 크림 카드 · 1 보라 카드(칸 = 회전) · 2 라벤더 반짝임 · 3 크림 반짝임 · 4 유리 조각(칸 = 회전) · 5 라벤더 연기 ──
BIT_KINDS = ["cardw", "cardp", "spkl", "spkc", "glass", "smk"]
def bit_cells():
    out = []
    for kind in BIT_KINDS:
        for f in range(8):
            c = Cv(16, 16); u = f / 7
            if kind in ("cardw", "cardp"):
                a = f * TAU / 8; k = math.cos(a); w = max(1, round(4 * abs(k)))
                if kind == "cardw": card(c, 8 - w / 2, 5, w, 6, "white", face=k >= 0, pip=False)
                else: card(c, 8 - w / 2, 5, w, 6, "white", face=False, pip=False)
            elif kind in ("spkl", "spkc"):
                k = [P[3], P[5], P[6]] if kind == "spkl" else [C[1], C[3], C[4]]
                arm = max(0, 4 - f)
                if f < 6:
                    star(c, 8, 8, arm, k[1], k[0])
                    if f < 3: c.px(8 + arm + 2, 8 - arm - 1, k[2]); c.px(8 - arm - 2, 8 + arm, k[1])
                else: c.px(8, 8, al(k[1], .6))
            elif kind == "glass":
                a = f * TAU / 8; s = 4
                pts = [(8 + math.cos(a) * s, 8 + math.sin(a) * s), (8 + math.cos(a + 2.4) * s * .7, 8 + math.sin(a + 2.4) * s * .7), (8 + math.cos(a + 3.9) * s * .8, 8 + math.sin(a + 3.9) * s * .8)]
                c.fillpoly(pts, B[2]); c.poly(pts, B[3]); c.px(pts[0][0], pts[0][1], C[4])
            else:
                r = 2.5 + 4.5 * ez(u)
                c.band(8, 9, r, r * .85, 0, 1, al(P[4], .8), dens=.9 - u * .75)
                c.band(7, 7, r * .55, r * .5, 0, 1, al(P[5], .75), dens=.75 - u * .7)
            out.append(c)
    return out

# ── 스킬 아이콘(24×24) 8칸 — 절단 카드 · 폭렬 셔플 · 덱 슬래시 · 카드 프리즌 · 카드 블링크 · 팬텀 피스트 · 미러 하우스 · 최후의 셔플 ──
def icon_cells():
    def base():
        c = Cv(24, 24); c.rect(1, 1, 22, 22, P[1]); c.rect(1, 1, 22, 1, P[3]); c.rect(1, 22, 22, 1, P[0])
        c.poly([(1, 1), (22, 1), (22, 22), (1, 22)], P[2]); return c
    out = []
    c = base(); card(c, 8, 6, 7, 11, "white"); c.line(3, 20, 20, 3, C[4]); c.line(3, 19, 19, 3, al(P[5], .8)); out.append(c)                       # 절단 카드
    c = base()
    for i in range(5): card(c, 4 + i * 3, 7 + abs(i - 2) * 2, 5, 8, "white", face=i % 2 == 0, pip=False)
    star(c, 18, 5, 2, C[4], P[5]); out.append(c)                                                                                                # 폭렬 셔플
    c = base(); c.ring(9, 12, 10, 8, C[4], -1.2, 1.2); c.ring(9, 12, 8, 6, P[5], -1.2, 1.2); card(c, 15, 4, 4, 6, "white", pip=False); card(c, 16, 14, 4, 6, "white", face=False, pip=False); out.append(c)   # 덱 슬래시
    c = base(); fr = [(5, 9), (16, 9), (16, 20), (5, 20)]; bk = [(x + 3, y - 5) for x, y in fr]
    for q in [bk, [fr[0], fr[1], bk[1], bk[0]], [fr[1], fr[2], bk[2], bk[1]], fr]: c.poly(q, P[6])
    c.fillpoly(fr, al(P[4], .5)); c.px(10, 14, C[4]); out.append(c)                                                                              # 카드 프리즌
    c = base(); card(c, 3, 8, 5, 8, "white", face=False, pip=False); c.line(9, 12, 14, 12, al(C[4], .7)); star(c, 17, 12, 3, C[4], P[5]); out.append(c)   # 카드 블링크
    c = base(); m = Cv(112, 96); fist_shape(m, 40, 56, 1.0, P[3], C[4])
    for y in range(20):
        for x in range(20):
            p = m.a[36 + y * 2 - 4, 22 + x * 2]
            if p[3]: c.px(x + 2, y + 2, tuple(int(v) for v in p))
    out.append(c)                                                                                                                                # 팬텀 피스트
    c = base(); mirror_draw(c, 8, 21, .7, shine=4); mirror_draw(c, 16, 21, .7); out.append(c)                                                    # 미러 하우스
    c = base()
    for i in range(8): a = i * TAU / 8; card(c, 12 + math.cos(a) * 8 - 1, 12 + math.sin(a) * 8 - 2, 3, 4, "white", face=i % 2 == 0, pip=False)
    star(c, 12, 12, 3, C[4], P[5]); out.append(c)                                                                                                 # 최후의 셔플
    return out

def main():
    man = {}; sheets = {}
    sheets["il_card"] = pack("il_card", card_cells(), 8, man, loop=1, rows=3)
    sheets["il_shard"] = pack("il_shard", shard_cells(), None, man)
    sheets["il_cut"] = pack("il_cut", cut_cells(), 3, man, cx=0, cy=3, rows=2)
    sheets["il_burst"] = pack("il_burst", burst_cells(), 4, man, cx=32, cy=34, r=28)
    sheets["il_fan"] = pack("il_fan", fan_cells(), None, man, cx=20, cy=26)
    sheets["il_arc"] = pack("il_arc", arc_cells(), 6, man, cx=40, cy=40, rows=2, r=52)
    sheets["il_box"] = pack("il_box", box_cells(), 6, man, cx=64, cy=64, r=56)
    sheets["il_fist"] = pack("il_fist", fist_cells(), 5, man, cx=40, cy=56)
    sheets["il_mirror"] = pack("il_mirror", mirror_cells(), None, man, cx=12, cy=38)
    sheets["il_big"] = pack("il_big", big_cells(), 6, man, cx=56, cy=136)
    sheets["il_ghost"] = pack("il_ghost", ghost_cells(), 6, man, rows=2)
    sheets["il_flash"] = pack("il_flash", flash_cells(), None, man)
    sheets["il_bits"] = pack("il_bits", bit_cells(), 8, man, rows=len(BIT_KINDS))
    sheets["il_icons"] = pack("il_icons", icon_cells(), None, man, cx=0, cy=0)
    json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        os.makedirs(sys.argv[2], exist_ok=True)
        for k, im in sheets.items():
            z = 4 if im.shape[1] < 300 else 2 if im.shape[1] < 900 else 1
            bg = np.zeros((im.shape[0], im.shape[1], 4), np.uint8); bg[..., :3] = (58, 74, 52); bg[..., 3] = 255   # 풀밭 비슷한 바탕
            a = im[..., 3:4].astype(float) / 255; bg[..., :3] = (im[..., :3] * a + bg[..., :3] * (1 - a)).astype(np.uint8)
            Image.fromarray(bg, "RGBA").resize((im.shape[1] * z, im.shape[0] * z), Image.NEAREST).save(os.path.join(sys.argv[2], k + ".png"))
    for k, v in man.items(): print(k, v, os.path.getsize(os.path.join(OUT, k + ".webp")))

main()
