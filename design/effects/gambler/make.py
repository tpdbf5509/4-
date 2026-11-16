# 히든 직업 Gambler 002(도박꾼) 도트 이펙트 시트 — 이 스크립트가 한 칸 한 칸 직접 그린다(11월 16일).
# 사용자 지시: "pixelfx 쓰지 말고 직접 만들어줘" — 외부 이펙트 라이브러리 없이 Pillow · numpy 로 점 · 선 · 타원만 찍는다.
# 쓰는 법: python3 design/effects/gambler/make.py  →  public/assets/game/rpg/effects/hidden-jobs/gambler/px/*.webp + manifest.json(칸 규격)
#          python3 design/effects/gambler/make.py preview <폴더>  →  확대한 확인 그림(PNG)도 함께
# 칸 규격은 src/game/gamblerPxData.js 에 손으로 옮긴다(manifest.json 과 같아야 한다 — tools/gambler.test.mjs 가 본다).
# 1배 픽셀로 그리고 게임이 정수 배(보통 2배)로 키운다. 색은 톤다운 금색 팔레트 · 흰색은 가장 밝은 가운데에만.
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "game", "rpg", "effects", "hidden-jobs", "gambler", "px")
TAU = math.pi * 2
SQ = 0.78   # 땅 비율(RPG.squash) — 바닥에 깔리는 그림은 세로를 이만큼 누른다

def rgb(h, a=255):
    h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
# 금색 7단 · 자주 4단 · 청백 2단 · 크림
G = [rgb(c) for c in ["#241A0C", "#5C4420", "#9A7430", "#D8AD4F", "#EBCB7A", "#F6E5AA", "#FFF6D8"]]
P = [rgb(c) for c in ["#2E1429", "#4A2242", "#7C396D", "#B06AA0", "#E3B5D8"]]
F = [rgb(c) for c in ["#6E97AB", "#A9CADB", "#E2F1F7"]]
BR = [rgb(c) for c in ["#3A2A1C", "#6B4E32", "#8E6B45"]]   # 낮은 결과 — 탁한 청동
RED = [rgb(c) for c in ["#7A2B2B", "#B84A44", "#E08A7A"]]
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

# ── 칩(16×16) — 세로축으로 도는 포커 칩. tint: gold · frost(테두리 청백) · plum(자주 무늬) ──
def chip(c, cx, cy, th, tint="gold", r=7):
    w = abs(math.cos(th)); rx = max(1.0, r * w)
    rim = {"gold": G[1], "frost": F[0], "plum": G[1]}[tint]
    edge = {"gold": G[5], "frost": F[2], "plum": G[5]}[tint]
    mark = {"gold": G[5], "frost": F[2], "plum": P[2]}[tint]
    inner = {"gold": G[2], "frost": G[2], "plum": P[1]}[tint]
    pip = {"gold": G[5], "frost": G[6], "plum": P[3]}[tint]
    if rx <= 1.6:   # 옆면 — 세로 막대에 줄무늬
        for y in range(-r, r + 1):
            col = G[3] if (y + r) % 4 < 2 else mark
            c.px(cx - 1, cy + y, rim if abs(y) == r else col); c.px(cx, cy + y, rim if abs(y) == r else (G[4] if col == G[3] else col))
        return
    c.disc(cx, cy, rx + .5, r + .5, rim)
    c.disc(cx, cy, rx - .5, r - .5, G[3])
    c.disc(cx - rx * .12, cy - r * .12, max(.6, rx - 1.6), r - 1.6, G[4])
    c.disc(cx, cy, max(.6, rx - 1.2), r - 1.2, G[3])
    if rx > 3:
        c.ring(cx, cy, max(1, rx - 2.6), r - 2.6, inner)
        c.disc(cx, cy, max(.6, rx * .26), r * .26, pip)
        # 테두리 눈금 넷
        for a in (0, .25, .5, .75):
            ax, ay = math.cos(a * TAU + .4), math.sin(a * TAU + .4)
            c.px(cx + ax * (rx - .9) - .5, cy + ay * (r - .9) - .5, mark); c.px(cx + ax * (rx - .2) - .5, cy + ay * (r - .2) - .5, mark)
    c.ring(cx, cy, rx - .2, r - .2, edge, math.pi * 1.05, math.pi * 1.55)   # 위 왼쪽 가장자리 빛
    if rx > 4: c.px(cx - rx * .45, cy - r * .5, G[6])

def coin(c, cx, cy, th, tint="gold", r=4):
    w = abs(math.cos(th)); rx = max(.8, r * w)
    rim = F[0] if tint == "frost" else G[1]
    if rx <= 1.2:
        for y in range(-r, r + 1): c.px(cx, cy + y, rim if abs(y) == r else (G[5] if y < 0 else G[3]))
        return
    c.disc(cx, cy, rx + .5, r + .5, rim)
    c.disc(cx, cy, rx - .4, r - .4, G[3])
    c.disc(cx - .4, cy - .6, max(.5, rx - 1.4), r - 1.6, G[4])
    if rx > 2.4: c.rect(cx - .5, cy - 2, 1, 4, P[2] if tint == "plum" else G[2])
    c.px(cx - rx * .5, cy - r * .5, G[6] if tint != "frost" else F[2])

def sheet_spin(fn, n, size, tints, r):
    cells = []
    for t in tints:
        for i in range(n):
            c = Cv(size, size); fn(c, size // 2, size // 2, i / n * math.pi, t, r); cells.append(c)
    return cells, n

# ── 반짝임(9×9, 5칸) · 타격 알갱이(40×40, 6칸) ──
def glint_cells():
    out = []
    for arm, col in ((1, G[5]), (2, G[5]), (4, G[6]), (3, G[5]), (1, G[4])):
        c = Cv(9, 9); star(c, 4, 4, arm, col, G[4]); out.append(c)
    return out
def spark_cells(n=6, size=40, seed=3):
    out = []
    for i in range(n):
        c = Cv(size, size); u = i / (n - 1); cx = cy = size // 2
        if i == 0: c.disc(cx, cy, 4.5, 4.5, G[6]); star(c, cx, cy, 7, G[5], G[4])
        elif i == 1: c.ring(cx, cy, 6, 6, G[5]); star(c, cx, cy, 5, G[6], G[4])
        elif i == 2: c.ring(cx, cy, 9, 9, G[4], gap=2)
        for k in range(6):   # 금색 사각 알갱이 여섯 — 밖으로 날며 작아진다
            a = k / 6 * TAU + rnd(seed, k) * .7; d = 4 + 14 * ez(u * 1.1) * (.7 + .5 * rnd(seed, k, 1))
            s = 3 if u < .3 else 2 if u < .7 else 1
            col = G[6] if u < .2 else G[5] if u < .5 else G[3] if u < .85 else G[2]
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d + 8 * u * u
            if u < 1 or k % 2 == 0: c.rect(x - s / 2, y - s / 2, s, s, col)
            if s > 1 and u < .7: c.px(x - s / 2, y - s / 2, G[6])
        out.append(c)
    return out

# ── 주사위(24×26, 10칸) — 0~3 구르는 중 · 4~9 눈 1~6 ──
PIPS = {1: [(0, 0)], 2: [(-1, -1), (1, 1)], 3: [(-1, -1), (0, 0), (1, 1)], 4: [(-1, -1), (1, -1), (-1, 1), (1, 1)],
        5: [(-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)], 6: [(-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)]}
def die_face(c, cx, cy, n, top=False):
    body, lit, sh, edge = G[5], G[6], G[4], G[1]
    x0, y0 = cx - 8, cy - 6
    c.rect(x0 + 1, y0, 15, 17, edge); c.rect(x0, y0 + 1, 17, 15, edge)        # 둥근 모서리 테두리
    c.rect(x0 + 1, y0 + 1, 15, 15, body)
    c.rect(x0 + 1, y0 + 1, 15, 1, lit); c.rect(x0 + 1, y0 + 1, 1, 15, lit)      # 위 · 왼쪽 빛
    c.rect(x0 + 1, y0 + 15, 15, 1, sh); c.rect(x0 + 15, y0 + 1, 1, 15, sh)      # 아래 · 오른쪽 그늘
    # 윗면 얇은 띠(입체감)
    c.rect(x0 + 3, y0 - 3, 15, 1, edge); c.rect(x0 + 2, y0 - 2, 16, 2, G[6]); c.px(x0 + 1, y0 - 1, edge); c.px(x0 + 2, y0 - 2, edge); c.px(x0 + 18, y0 - 2, edge); c.px(x0 + 18, y0 - 1, edge)
    c.rect(x0 + 17, y0, 1, 14, G[3]); c.px(x0 + 18, y0, edge); c.rect(x0 + 18, y0 + 1, 1, 12, edge)
    pc = P[2] if top else G[0]
    for (i, j) in PIPS[n]:
        px, py = x0 + 8 + i * 4, y0 + 8 + j * 4
        c.rect(px - 1, py - 1, 3, 3, pc); c.px(px - 1, py - 1, P[3] if top else G[1])
def die_tumble(c, cx, cy, k):
    # 구르는 중 — 마름모로 기운 주사위와 잔상 점
    a = k * .9 + .4; r = 10
    pts = [(cx + math.cos(a + i * TAU / 4) * r, cy + 2 + math.sin(a + i * TAU / 4) * r * .9) for i in range(4)]
    c.fillpoly(pts, G[5]); c.poly(pts, G[1])
    mx, my = sum(p[0] for p in pts) / 4, sum(p[1] for p in pts) / 4
    for j in range(1 + k % 3):
        q = rnd(7, k, j) * TAU; c.rect(mx + math.cos(q) * 4 - 1, my + math.sin(q) * 3 - 1, 2, 2, G[0])
    c.line(pts[0][0], pts[0][1], mx, my, G[4])
    for j in range(3): c.px(cx - 11 + j * 2 + (k % 2), cy - 9 + j * 3, G[4])
def dice_cells():
    out = []
    for k in range(4): c = Cv(24, 26); die_tumble(c, 12, 12, k); out.append(c)
    for n in range(1, 7): c = Cv(24, 26); die_face(c, 11, 12, n, n == 6); out.append(c)
    return out

# ── 바닥 육각 문양(100×62, 8칸) — 칩 장막 발밑: 0~3 퍼짐 · 4~7 유지(안쪽 점이 돈다) ──
def hex_pts(cx, cy, r, rot=0.0): return [(cx + math.cos(rot + i * TAU / 6) * r, cy + math.sin(rot + i * TAU / 6) * r * .6) for i in range(6)]
def hex_cells():
    out = []
    for i in range(8):
        c = Cv(76, 48); cx, cy = 38, 24
        if i < 4:
            k = ez((i + 1) / 4); c.poly(hex_pts(cx, cy, 34 * k), G[6] if i < 2 else G[5])
            if i >= 1: c.poly(hex_pts(cx, cy, 34 * k * .72), G[3], dash=2)
            for j in range(6):
                p = hex_pts(cx, cy, 34 * k)[j]; star(c, p[0], p[1], 2 if i < 3 else 1, G[6], G[4])
        else:
            c.poly(hex_pts(cx, cy, 34), G[4]); c.poly(hex_pts(cx, cy, 24), G[2], dash=2)
            for j in range(7):   # 안쪽을 도는 점 일곱
                a = (j / 7 + (i - 4) / 28) * TAU; x, y = cx + math.cos(a) * 29, cy + math.sin(a) * 29 * .6
                c.rect(x - 1, y - 1, 2, 2, G[5] if j % 2 else G[3])
            for j in range(6):
                p = hex_pts(cx, cy, 34)[j]; c.px(p[0], p[1], G[6])
        out.append(c)
    return out

# ── 칩 조각(44×44, 6칸) — 장막이 끝나면 아래로 흩어진다 ──
def shard_cells(n=6, seed=11):
    out = []
    for i in range(n):
        c = Cv(44, 44); u = i / (n - 1)
        for k in range(10):
            a = rnd(seed, k) * TAU; sp = 6 + 12 * rnd(seed, k, 1)
            x = 22 + math.cos(a) * sp * (.4 + u * .8); y = 12 + math.sin(a) * 4 + 26 * u * u * (.6 + .6 * rnd(seed, k, 2)) + 4 * u
            s = 3 if k % 3 == 0 and u < .6 else 2 if u < .8 else 1
            col = (G[5], G[3], G[4], G[2])[k % 4] if u < .7 else G[2]
            if u < .92 or k % 2: c.rect(x - s / 2, y - s / 2, s, s, col)
            if s == 3: c.px(x - 1, y - 1, G[6]); c.px(x + 1, y + 1, G[1])
        out.append(c)
    return out

# ── 금빛 폭발(바닥 고리 + 사각 파편 + 별). R: 1배 반지름 · n 칸 · coins 날아가는 코인 수 · purple 자주 섞기 ──
def burst_cells(R, n, seed, coins=0, purple=False, rings=1, hot=None):
    # 도트 폭발 — 굵은 충격 고리(어두운 테두리 · 밝은 앞날 · 체크 무늬로 흩어지는 꼬리) + 계단식 불빛 + 살 + 파편 · 코인
    w, h = int(R * 2 + 14), int(R * 2 * SQ + 40 + R * .5); cx, cy = w // 2, h - int(R * SQ) - 7
    ry = R * SQ; out = []
    for i in range(n):
        c = Cv(w, h); u = i / (n - 1)
        for q in range(rings):
            uu = u - q * .14
            if uu <= 0 or u >= 1: continue
            ru = ez(uu * 1.25); th = (R * .2 * (1 - uu) ** 1.5 + 1.5) / R
            fade = 1.0 if uu < .4 else max(0.0, 1 - (uu - .4) / .6)
            pal = [P[1], P[2], P[3], P[4]] if (purple and q == 1) else [G[1], G[3], G[4], G[6]]
            lo = max(0.0, ru - th * 2.8)
            c.band(cx, cy, R, ry, lo, ru - th, pal[1], lambda d, lo=lo, th=th, fade=fade: (d - lo) / (th * 1.8) * .6 * fade)   # 안쪽 꼬리 — 체크로 옅어진다
            c.band(cx, cy, R, ry, ru - th, ru, pal[2], fade)
            c.band(cx, cy, R, ry, ru - th * .4, ru, pal[3], fade * 1.05)
            if uu < .55: c.ring(cx, cy, R * ru + 1, ry * ru + 1, pal[0])
        # 가운데 불빛 — 계단식 색 띠 · 어두운 테두리 · 여덟 갈래 살
        if u < .42:
            k = u / .42; rr = R * (.17 + .2 * math.sin(k * math.pi * .85)) * (1 - k * .3)
            for j in range(8):
                a = j * TAU / 8 + .2; L = R * (.5 + .45 * k) * (1 if j % 2 == 0 else .62)
                x0, y0 = cx + math.cos(a) * rr * .8, cy - 4 + math.sin(a) * rr * .7; x1, y1 = cx + math.cos(a) * L, cy - 4 + math.sin(a) * L * .85
                xm, ym = (x0 + x1) / 2, (y0 + y1) / 2
                c.line(x0, y0, x1, y1, G[4] if not (purple and j % 2) else P[3]); c.line(x0, y0, xm, ym, G[6])
                if j % 2 == 0 and k < .6: c.line(x0 + 1, y0, xm + 1, ym, G[5])
            c.disc(cx, cy - 4, rr * 1.25 + 1, rr + 1, G[2])
            c.disc(cx, cy - 4, rr * 1.25, rr, hot or G[4]); c.disc(cx, cy - 4, rr * 1.0, rr * .8, G[5]); c.disc(cx, cy - 4, rr * .7, rr * .56, G[6]); c.disc(cx, cy - 4, rr * .34, rr * .28, W)
        elif u < .7:   # 식는 불빛 — 체크 무늬로 흩어진다
            k = (u - .42) / .28; rr = R * .26 * (1 - k * .4)
            c.band(cx, cy - 4, rr * 1.25, rr, 0, 1, G[3] if not purple else P[3], .5 * (1 - k))
        # 사각 파편 — 포물선으로 튀어 오르다 떨어진다(뒤에 한 점 꼬리)
        m = int(16 + R * .3)
        def at(k, t):
            a = rnd(seed, k) * TAU; sp = R * (.35 + .75 * rnd(seed, k, 1)); d = sp * ez(t * 1.15); lift = R * (.25 + .55 * rnd(seed, k, 4))
            return cx + math.cos(a) * d, cy + math.sin(a) * d * SQ - lift * math.sin(min(1, t * 1.1) * math.pi) - 4
        for k in range(m):
            t = max(0.0, u - rnd(seed, k, 2) * .12)
            if t <= 0 or t > .92 + .08 * rnd(seed, k, 3): continue
            x, y = at(k, t); px0, py0 = at(k, max(0, t - .07))
            s = 3 if (k % 3 == 0 and t < .55) else 2 if t < .8 else 1
            col = (G[6] if t < .2 else G[5] if t < .45 else G[3] if t < .8 else G[2])
            if purple and k % 4 == 0: col = P[4] if t < .3 else P[3] if t < .7 else P[2]
            if t < .7: c.px(px0, py0, G[2] if not (purple and k % 4 == 0) else P[2])
            if s == 3: c.rect(x - 2, y - 2, 4, 4, G[1]); c.rect(x - 1, y - 1, 2, 2, col); c.px(x - 1, y - 1, G[6])
            else:
                c.rect(x - s / 2, y - s / 2, s, s, col)
                if s >= 2 and t < .6: c.px(x - s / 2, y - s / 2, G[6])
        # 날아가는 코인
        cr = 5 if R >= 70 else 4
        for k in range(coins):
            a = (k + rnd(seed, k, 5)) / coins * TAU; t = max(0.0, u - .04)
            if t <= 0 or t > .9: continue
            d = R * (.25 + .7 * ez(t)) ; y = cy + math.sin(a) * d * SQ - R * (.5 + .3 * rnd(seed, k, 6)) * math.sin(min(1, t * 1.05) * math.pi) - 6
            coin(c, int(cx + math.cos(a) * d), int(y), (k * .7 + t * 9), "plum" if purple and k % 3 == 0 else "gold", cr - 1 if t > .75 else cr)
        # 별 반짝임 — 뒤쪽 칸에서 깜박인다
        for k in range(int(5 + R * .06)):
            t0 = .25 + .55 * rnd(seed, k, 7)
            if abs(u - t0) < .11:
                a = rnd(seed, k, 8) * TAU; d = R * (.3 + .6 * rnd(seed, k, 9))
                star(c, cx + math.cos(a) * d, cy + math.sin(a) * d * SQ - R * .25 * rnd(seed, k, 10) - 6, 3 if abs(u - t0) < .05 else 1, G[6] if not (purple and k % 2) else P[4], G[4])
        out.append(c)
    return out, (w, h, cx, cy)

# ── 카드 문양(36×48, 6칸 반복) — 하우스 엣지: 등 뒤의 금빛 카드. 빛줄기가 비스듬히 지나간다 ──
def card_cells():
    out = []
    for i in range(6):
        c = Cv(36, 48); x0, y0, w, h = 4, 3, 28, 42
        c.rect(x0 + 2, y0, w - 4, h, G[1]); c.rect(x0, y0 + 2, w, h - 4, G[1]); c.rect(x0 + 1, y0 + 1, w - 2, h - 2, G[1])
        c.rect(x0 + 2, y0 + 1, w - 4, h - 2, G[5]); c.rect(x0 + 1, y0 + 2, w - 2, h - 4, G[5])
        c.rect(x0 + 3, y0 + 3, w - 6, h - 6, G[3])
        c.rect(x0 + 3, y0 + 3, w - 6, 1, G[2]); c.rect(x0 + 3, y0 + h - 4, w - 6, 1, G[2]); c.rect(x0 + 3, y0 + 3, 1, h - 6, G[2]); c.rect(x0 + w - 4, y0 + 3, 1, h - 6, G[2])
        cx, cy = x0 + w // 2, y0 + h // 2
        for j in range(-3, 4):   # 마름모 격자
            for k in range(-5, 6):
                if (j + k) % 2 == 0 and abs(j) + abs(k) > 2: c.px(cx + j * 3, cy + k * 3, G[2])
        d = [(cx, cy - 9), (cx + 6, cy), (cx, cy + 9), (cx - 6, cy)]   # 가운데 자주 마름모
        c.fillpoly(d, P[2]); c.poly(d, P[0]); c.px(cx - 1, cy - 3, P[4]); c.px(cx - 2, cy - 1, P[3]); c.px(cx, cy - 6, P[3])
        for (qx, qy) in ((x0 + 5, y0 + 6), (x0 + w - 6, y0 + h - 7)): c.rect(qx - 1, qy - 1, 3, 3, P[2]); c.px(qx, qy, P[4])
        s = -14 + i * 13   # 비스듬한 빛줄기
        for y in range(y0 + 2, y0 + h - 2):
            for dx in (0, 1, 2):
                x = x0 + s + dx + (y0 + h - y) // 2
                if x0 + 2 <= x < x0 + w - 2: c.px(x, y, al(G[6], .75 if dx == 1 else .4))
        if i in (1, 4): star(c, x0 + (6 if i == 1 else w - 7), y0 + (5 if i == 1 else h - 8), 2, G[6], G[4])
        out.append(c)
    return out

# ── 슬롯 릴(28×38, 7칸) — 0~3 도는 중 · 4 금색 7 · 5 빗나감(체리) · 6 자주 7(잭팟) ──
SEVEN = ["#######", "#######", ".....##", "....##.", "...##..", "..##...", "..##...", ".##....", ".##...."]
def reel(c, kind, k=0):
    c.rect(1, 0, 26, 38, G[0]); c.rect(0, 1, 28, 36, G[0])
    c.rect(1, 1, 26, 36, G[3]); c.rect(2, 2, 24, 34, G[1]); c.rect(3, 3, 22, 32, rgb("#1A130B"))
    c.rect(1, 1, 26, 1, G[5]); c.rect(1, 1, 1, 36, G[5]); c.rect(1, 36, 26, 1, G[2]); c.rect(26, 1, 1, 36, G[2])
    if kind == "spin":
        for j in range(5):   # 세로로 흐르는 잔상
            y = (j * 9 + k * 5) % 34 + 2; col = (G[3], G[5], P[2], G[4], RED[1])[(j + k) % 5]
            c.rect(7, y, 14, 3, al(col, .9)); c.rect(9, y + 3, 10, 2, al(col, .45)); c.rect(9, y - 2, 10, 2, al(col, .3))
        c.rect(3, 3, 22, 2, rgb("#1A130B")); c.rect(3, 33, 22, 2, rgb("#1A130B"))
    elif kind == "miss":
        c.disc(10, 23, 4.5, 4.5, RED[1]); c.disc(18, 25, 4.5, 4.5, RED[1]); c.px(8, 21, RED[2]); c.px(16, 23, RED[2])
        c.line(10, 18, 15, 10, G[2]); c.line(18, 20, 15, 10, G[2]); c.rect(15, 8, 4, 2, rgb("#6F8F4E"))
    else:
        pal = (G[5], G[3], G[1]) if kind == "seven" else (P[4], P[3], P[1])
        for j, r in enumerate(SEVEN):
            for i, ch in enumerate(r):
                if ch == "#":
                    c.rect(7 + i * 2, 10 + j * 2, 2, 2, pal[0] if j < 2 else pal[1]); c.px(8 + i * 2, 11 + j * 2, pal[2] if j >= 2 else pal[1])
        if kind == "top": star(c, 21, 8, 3, W, P[4]); star(c, 7, 30, 2, G[6], P[4])
        else: c.px(20, 9, G[6])
    c.rect(3, 18, 2, 2, G[5]); c.rect(23, 18, 2, 2, G[5])   # 당첨선 표시
def slot_cells():
    out = []
    for k in range(4): c = Cv(28, 38); reel(c, "spin", k); out.append(c)
    for kind in ("seven", "miss", "top"): c = Cv(28, 38); reel(c, kind); out.append(c)
    return out

# ── 황금 테이블(1배 반지름 140, 세로 0.78) — 0~4 펼침 · 5~8 유지(반복) · 9~13 접힘 ──
def table_draw(c, cx, cy, R, k, phase, fr):
    hs = R * .70 * k                       # 사각 반 변 — 원 안에 들어간다(대각선 = 0.99R)
    def P2(x, y): return (cx + x, cy + y * SQ)
    sqr = lambda s: [P2(-s, -s), P2(s, -s), P2(s, s), P2(-s, s)]
    felt = al(P[0], .34)
    c.fillpoly(sqr(hs), felt)
    c.poly(sqr(hs), G[4]); c.poly(sqr(hs - 3), G[2], dash=3); c.poly(sqr(hs - 6), G[3])
    d = hs * .86; dia = [P2(0, -d), P2(d, 0), P2(0, d), P2(-d, 0)]
    c.poly(dia, G[3], dash=2)
    rr = hs * .46                           # 가운데 룰렛 고리 · 살 여덟
    c.ring(cx, cy, rr, rr * SQ, G[4]); c.ring(cx, cy, rr * .62, rr * .62 * SQ, G[2], gap=2); c.ring(cx, cy, rr * .2, rr * .2 * SQ, G[5])
    rot = fr * TAU / 32
    for j in range(8):
        a = j / 8 * TAU + rot
        c.line(cx + math.cos(a) * rr * .2, cy + math.sin(a) * rr * .2 * SQ, cx + math.cos(a) * rr, cy + math.sin(a) * rr * SQ, G[2] if j % 2 else P[2])
        x, y = cx + math.cos(a + TAU / 16) * rr * .82, cy + math.sin(a + TAU / 16) * rr * .82 * SQ
        c.rect(x - 1, y - 1, 2, 2, G[5] if j % 2 else P[3])
    for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):   # 네 귀퉁이 마름모 무늬
        x, y = P2(sx * hs * .74, sy * hs * .74); q = max(2, int(5 * k))
        m = [(x, y - q * SQ), (x + q, y), (x, y + q * SQ), (x - q, y)]
        c.fillpoly(m, P[2] if (sx * sy > 0) else G[3]); c.poly(m, G[5])
    for (sx, sy) in ((0, -1), (1, 0), (0, 1), (-1, 0)):     # 변 가운데 칩 자리
        x, y = P2(sx * hs * .74, sy * hs * .74)
        c.ring(x, y, 5 * k + 1, (5 * k + 1) * SQ, G[4]); c.disc(x, y, 2 * k + .5, (2 * k + .5) * SQ, G[3])
    if phase == "hold":                     # 테두리를 도는 빛
        per = 8 * hs; pos = (fr / 4) * per / 4
        for q in range(4):
            t = (pos + q * per / 4) % per; side = int(t // (2 * hs)); o = t % (2 * hs) - hs
            x, y = [(o, -hs), (hs, o), (-o, hs), (-hs, -o)][side]
            X, Y = P2(x, y); star(c, X, Y, 3, G[6], G[4])
    for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        X, Y = P2(sx * hs, sy * hs); c.px(X, Y, G[6])
def table_cells(R=140):
    w, h = R * 2 + 8, int(R * 2 * SQ) + 8; cx, cy = w // 2, h // 2; out = []
    for i in range(5):
        c = Cv(w, h); k = .25 + .75 * ez((i + 1) / 5); table_draw(c, cx, cy, R, k, "open", 0)
        if i < 3: c.ring(cx, cy, R * k * .99, R * k * .99 * SQ, G[6] if i < 2 else G[4], gap=0 if i < 2 else 2)
        out.append(c)
    for i in range(4): c = Cv(w, h); table_draw(c, cx, cy, R, 1, "hold", i); out.append(c)
    for i in range(5):
        c = Cv(w, h); k = 1 - .82 * ez((i + 1) / 5) ; table_draw(c, cx, cy, R, k, "fold", i * 3)
        hs = R * .70 * k
        for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)): star(c, cx + sx * hs, cy + sy * hs * SQ, 2 + i, G[6], G[4])
        out.append(c)
    return out, (w, h, cx, cy)

# ── 금빛 기둥(52×150, 8칸) — 잭팟: 기둥이 솟고 자주 번개가 한 번 친다. 바닥 = 아래 끝 ──
def pillar_cells(n=8, seed=21):
    out = []
    for i in range(n):
        c = Cv(52, 150); u = i / (n - 1); cx = 26; base = 146
        hgt = 140 * ez(u * 3) ; wid = 9 * (1 - max(0, u - .45) / .55) + 1
        top = base - hgt
        if u < .98:
            for y in range(int(top), base):
                k = (y - top) / max(1, hgt); wob = (1 if (y // 3 + i) % 4 == 0 else 0)
                ww = wid * (.55 + .45 * k) + wob
                c.rect(cx - ww - 2, y, 2, 1, al(G[3], .55)); c.rect(cx + ww, y, 2, 1, al(G[3], .55))
                c.rect(cx - ww, y, ww * 2, 1, G[4] if (y + i) % 6 else G[5])
                c.rect(cx - ww * .55, y, ww * 1.1, 1, G[5]); c.rect(cx - ww * .22, y, max(1, ww * .44), 1, G[6] if u < .7 else G[5])
            c.disc(cx, base - 1, wid + 9, 4, G[5]); c.disc(cx, base - 1, wid + 4, 2.5, G[6])
        if .2 <= u <= .62:   # 자주 번개 — 양옆으로 꺾이며 내려온다
            for sgn in (-1, 1):
                x, y = cx + sgn * (14 + 3 * rnd(seed, i, sgn + 2)), top + 6
                while y < base - 4:
                    nx = x + (rnd(seed, int(y), i * 3 + sgn) - .5) * 14; ny = y + 9 + 6 * rnd(seed, int(y), 5)
                    nx = max(3, min(48, nx)); c.line(x, y, nx, min(base - 3, ny), P[4] if u < .45 else P[3])
                    if rnd(seed, int(y), 9) > .6: c.line(x, y, x + sgn * 5, y + 4, P[3])
                    x, y = nx, ny
        for k in range(8):   # 떠오르는 사각 알갱이
            t = (u * 1.4 + rnd(seed, k)) % 1.0
            if u > .9: continue
            x = cx + (rnd(seed, k, 1) - .5) * 40; y = base - 130 * t
            c.rect(x, y, 2, 2, G[6] if t < .4 else G[4] if k % 3 else P[3])
        out.append(c)
    return out

# ── 스킬 아이콘(24×24, 8칸) — 황금 칩 · 칩 장막 · 운명의 눈 · 코인 폭우 · 더블 다운 · 황금 테이블 · 하우스 엣지 · 777 ──
def icon_cells():
    out = []
    def base():
        c = Cv(24, 24); c.rect(0, 0, 24, 24, rgb("#2A2014")); c.rect(0, 0, 24, 1, rgb("#4A3920")); c.rect(0, 0, 1, 24, rgb("#4A3920")); c.rect(0, 23, 24, 1, rgb("#17110A")); c.rect(23, 0, 1, 24, rgb("#17110A")); return c
    c = base(); chip(c, 12, 12, 0, "gold", 8); out.append(c)                                   # 황금 칩
    c = base(); c.poly([(12 + math.cos(i * TAU / 6 + TAU / 12) * 10, 12 + math.sin(i * TAU / 6 + TAU / 12) * 10) for i in range(6)], G[5])
    c.poly([(12 + math.cos(i * TAU / 6 + TAU / 12) * 8, 12 + math.sin(i * TAU / 6 + TAU / 12) * 8) for i in range(6)], G[2]); chip(c, 12, 12, 0, "gold", 5); out.append(c)   # 칩 장막
    c = base(); die_face(c, 11, 12, 5); out.append(c)                                             # 운명의 눈
    c = base()                                                                                    # 코인 폭우
    for (x, y, t) in ((6, 6, 0), (16, 4, .9), (11, 12, .4), (5, 17, 1.2), (18, 15, 0)): coin(c, x, y, t, "gold", 3); c.px(x, y - 5, G[2]); c.px(x, y - 7, G[1])
    out.append(c)
    c = base(); chip(c, 9, 10, 0, "gold", 6); chip(c, 15, 14, 0, "plum", 6); out.append(c)         # 더블 다운
    c = base(); c.poly([(3, 12), (12, 5), (20, 12), (12, 19)], G[4]); c.poly([(6, 12), (12, 7), (17, 12), (12, 17)], G[2]); c.disc(12, 12, 2.5, 2, P[2]); c.px(11, 11, P[4])
    for (x, y) in ((3, 12), (12, 5), (20, 12), (12, 19)): c.px(x, y, G[6])
    out.append(c)                                                                                 # 황금 테이블
    c = base(); c.rect(7, 3, 11, 18, G[1]); c.rect(8, 4, 9, 16, G[5]); c.rect(9, 5, 7, 14, G[3]); c.fillpoly([(12, 8), (15, 12), (12, 16), (9, 12)], P[2]); c.px(12, 10, P[4]); out.append(c)   # 하우스 엣지
    c = base()                                                                                    # 777
    for k, x in enumerate((2, 9, 16)):
        col = (G[5], G[4], P[3])[k]
        c.rect(x, 7, 6, 2, col); c.rect(x + 4, 9, 2, 2, col); c.rect(x + 3, 11, 2, 2, col); c.rect(x + 2, 13, 2, 4, col)
    star(c, 20, 5, 2, G[6], G[4]); out.append(c)
    return out

def pack(name, cells, cols=None, man=None, cx=None, cy=None, loop=0, rows=1, **extra):
    w, h = cells[0].w, cells[0].h; cols = cols or len(cells); R = math.ceil(len(cells) / cols)
    im = np.zeros((R * h, cols * w, 4), np.uint8)
    for i, c in enumerate(cells): im[(i // cols) * h:(i // cols) * h + h, (i % cols) * w:(i % cols) * w + w] = c.a
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(im, "RGBA").save(os.path.join(OUT, name + ".webp"), lossless=True, quality=100, method=6)
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(cells) // rows, "cx": w // 2 if cx is None else cx, "cy": h // 2 if cy is None else cy, **({"loop": 1} if loop else {}), **({"rows": rows} if rows > 1 else {}), **extra}
    return im

def main():
    man = {}; sheets = {}
    TINTS = ["gold", "frost", "plum"]
    cells, n = sheet_spin(chip, 8, 16, TINTS, 7); sheets["gm_chip"] = pack("gm_chip", cells, 8, man, loop=1, rows=3)
    cells, n = sheet_spin(coin, 6, 10, TINTS, 4); sheets["gm_coin"] = pack("gm_coin", cells, 6, man, loop=1, rows=3)
    sheets["gm_glint"] = pack("gm_glint", glint_cells(), None, man)
    sheets["gm_spark"] = pack("gm_spark", spark_cells(), None, man)
    sheets["gm_dice"] = pack("gm_dice", dice_cells(), None, man, cx=11, cy=13)
    sheets["gm_hex"] = pack("gm_hex", hex_cells(), 4, man)
    sheets["gm_shard"] = pack("gm_shard", shard_cells(), None, man, cx=22, cy=12)
    cells, (w, h, cx, cy) = burst_cells(46, 8, 5, coins=0); sheets["gm_burst"] = pack("gm_burst", cells, 4, man, cx=cx, cy=cy, r=46)
    cells, (w, h, cx, cy) = burst_cells(80, 9, 9, coins=6); sheets["gm_rainhit"] = pack("gm_rainhit", cells, 3, man, cx=cx, cy=cy, r=80)
    cells, (w, h, cx, cy) = burst_cells(150, 10, 13, coins=14, rings=2); sheets["gm_jack"] = pack("gm_jack", cells, 5, man, cx=cx, cy=cy, r=150)
    cells, (w, h, cx, cy) = burst_cells(150, 10, 17, coins=18, rings=2, purple=True, hot=P[4]); sheets["gm_jacktop"] = pack("gm_jacktop", cells, 5, man, cx=cx, cy=cy, r=150)
    sheets["gm_card"] = pack("gm_card", card_cells(), None, man, loop=1)
    sheets["gm_slot"] = pack("gm_slot", slot_cells(), None, man)
    cells, (w, h, cx, cy) = table_cells(); sheets["gm_table"] = pack("gm_table", cells, 7, man, cx=cx, cy=cy, r=140)
    sheets["gm_pillar"] = pack("gm_pillar", pillar_cells(), None, man, cx=26, cy=146)
    sheets["gm_icons"] = pack("gm_icons", icon_cells(), None, man, cx=0, cy=0)
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
