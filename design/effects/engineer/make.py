# 히든 직업 Engineer 003(엔지니어) 도트 이펙트 시트 — 이 스크립트가 한 칸 한 칸 직접 그린다(11월 17일).
# Gambler 002 와 같은 방식(design/effects/gambler/make.py 의 점 · 선 · 타원 도구를 옮겨 씀) — 외부 이펙트 라이브러리 없이 Pillow · numpy 로 찍는다.
# 쓰는 법: python3 design/effects/engineer/make.py  →  public/assets/game/rpg/effects/hidden-jobs/engineer/px/*.webp + manifest.json(칸 규격)
#          python3 design/effects/engineer/make.py preview <폴더>  →  확대한 확인 그림(PNG)도 함께
# 칸 규격은 src/game/engineerPxData.js 에 손으로 옮긴다(manifest.json 과 같아야 한다 — tools/engineer.test.mjs 가 본다).
# 1배 픽셀로 그리고 게임이 정수 배(보통 2배)로 키운다. 팔레트(기획안) 기본 #4FA7B2 · 보조 #C6F3FF · 최고 연마 강조 #FFD37A — 전류 · 금속 · 육각 격자.
import numpy as np
from PIL import Image
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "game", "rpg", "effects", "hidden-jobs", "engineer", "px")
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



# ── 팔레트 — 청록 강철 · 회색 금속 · 금빛 전류 · 과열 주황 ──
T = [rgb(c) for c in ["#12262A", "#1E3B40", "#2F6168", "#4FA7B2", "#8FD3DB", "#C6F3FF", "#EFFFFF"]]
M = [rgb(c) for c in ["#1D1E22", "#33363C", "#4E525A", "#737881", "#A2A7AE", "#C9CCD0"]]
Y = [rgb(c) for c in ["#6B4E1E", "#B98A3A", "#FFD37A", "#FFF0C2"]]
O = [rgb(c) for c in ["#7A3A1E", "#C0652F", "#E39A5B", "#F6C79A"]]
RW = [rgb(c) for c in ["#7A2B2B", "#D9605A"]]
TINTS = ["teal", "pale", "gold"]
def core(tint):   # 기계 핵 색 [어두운 · 가운데 · 밝은] — 연마 75 부터 청백
    return [T[3], T[4], T[5]] if tint == "teal" else [T[4], T[5], T[6]]
def edge(tint):   # 윤곽 강조 — 연마 130 이면 금빛 전류
    return Y[2] if tint == "gold" else None

def shadow(c, cx, cy, rx, ry):   # 발밑 그림자 — 이미 그린 칸은 덮지 않는다(윤곽을 그린 뒤에 깐다)
    sh = Cv(c.w, c.h); sh.disc(cx, cy, rx, ry, al(M[0], .5))
    m = (c.a[..., 3] == 0) & (sh.a[..., 3] > 0); c.a[m] = sh.a[m]

def outline(c, col):   # 그린 것 둘레에 1px 윤곽(투명한 칸에만)
    a = c.a[..., 3] > 0
    m = np.zeros_like(a)
    m[1:, :] |= a[:-1, :]; m[:-1, :] |= a[1:, :]; m[:, 1:] |= a[:, :-1]; m[:, :-1] |= a[:, 1:]
    m &= ~a
    c.a[m] = col

# ── 펄스 발진(12×12) — 사각 전기탄. 4칸 반복 · 줄 = 연마 색 ──
def pulse_cells():
    out = []
    for tint in TINTS:
        k = core(tint)
        for f in range(4):
            c = Cv(12, 12)
            c.band(6, 6, 5.5, 5.5, 0, 1, al(T[3], .55), dens=lambda d: 0.7 * (1 - d))
            c.rect(4, 4, 4, 4, k[1]); c.rect(5, 5, 2, 2, W)
            for i in range(3):   # 둘레를 도는 전류 점
                a = f * TAU / 8 + i * TAU / 3
                c.px(6 + math.cos(a) * 4.6, 6 + math.sin(a) * 4.6, k[2])
            if tint == "gold": c.px(6 + math.cos(f * 1.6) * 5, 6 + math.sin(f * 1.6) * 5, Y[2])
            out.append(c)
    return out

# ── 작은 타격 불꽃(24×24) — 푸른 픽셀 3~5개가 흩어진다 ──
def spark_cells(n=6, seed=4):
    out = []
    for f in range(n):
        u = f / (n - 1); c = Cv(24, 24)
        if f < 2: star(c, 12, 12, 3 - f, T[5], T[4])
        for i in range(5):
            a = rnd(seed, i) * TAU; d = 2 + ez(u) * (7 + rnd(seed, i, 1) * 4)
            col = T[6] if u < .3 else T[4] if u < .7 else T[3]
            x, y = 12 + math.cos(a) * d, 12 + math.sin(a) * d
            if u < .85: c.px(x, y, col)
            if u < .4: c.px(x - math.cos(a), y - math.sin(a), T[3])
        out.append(c)
    return out

# ── 총구 섬광(14×14) ──
def flash_cells():
    out = []
    for f in range(3):
        c = Cv(14, 14); r = [5, 4, 2][f]
        c.fillpoly([(7, 7 - r), (7 + r, 7), (7, 7 + r), (7 - r, 7)], T[5] if f < 2 else T[4])
        if f < 2: c.rect(6, 6, 2, 2, W)
        out.append(c)
    return out

# ── 짧은 레이저 마디(8×5) — 가로로 늘려 쓴다 ──
def laser_cells():
    out = []
    for f in range(3):
        c = Cv(8, 5)
        if f < 2: c.rect(0, 1, 8, 3, al(T[4], .8 - f * .3))
        c.rect(0, 2, 8, 1, W if f == 0 else T[5] if f == 1 else T[4])
        out.append(c)
    return out

# ── 센트리 터렛(32×36, 발밑 16,33) — 0~3 솟음 · 4~11 여덟 방향 · 12~14 접힘. 줄 = 연마 색 ──
TUR_W, TUR_H, TUR_FX, TUR_FY = 32, 36, 16, 33
def turret_draw(c, tint, ang, rise=1.0, fold=0.0):
    k = core(tint); e = edge(tint)
    fx, fy = TUR_FX, TUR_FY
    # 육각 기단
    base = [(fx + math.cos(i * TAU / 6) * 10, fy - 2 + math.sin(i * TAU / 6) * 4) for i in range(6)]
    c.fillpoly(base, M[2]); c.poly(base, M[1])
    c.line(fx - 8, fy - 3, fx + 8, fy - 3, M[3])
    c.px(fx - 6, fy - 2, k[1]); c.px(fx + 6, fy - 2, k[1])
    h = int(round(14 * rise * (1 - fold)))
    if h <= 0: return
    # 기둥
    c.rect(fx - 2, fy - 4 - h + 6, 4, h - 4 if h > 6 else 2, M[2]); c.line(fx - 2, fy - 3 - h + 6, fx - 2, fy - 4, M[3])
    if rise < 0.6: return
    # 머리(포신 각에 따라 앞 · 뒤)
    hy = fy - 6 - h + 2
    dx, dy = math.cos(ang), math.sin(ang) * 0.6
    L = 9 * (1 - fold)
    def barrel():
        if L <= 1: return
        x0, y0 = fx + dx * 3, hy + dy * 3; x1, y1 = fx + dx * (3 + L), hy + dy * (3 + L)
        c.line(x0, y0 - 1, x1, y1 - 1, M[4]); c.line(x0, y0, x1, y1, M[3]); c.line(x0, y0 + 1, x1, y1 + 1, M[1])
        c.px(x1, y1, k[2])
    if dy < 0: barrel()
    c.rect(fx - 5, hy - 4, 10, 8, M[2]); c.rect(fx - 5, hy - 4, 10, 1, M[4]); c.rect(fx - 5, hy + 3, 10, 1, M[1])
    c.rect(fx - 4, hy - 3, 1, 6, M[3])
    c.rect(fx - 2 + round(dx * 1.5), hy - 1, 4, 2, k[1]); c.px(fx - 1 + round(dx * 1.5), hy - 1, k[2])   # 핵(렌즈)
    if e: c.px(fx - 5, hy - 4, e); c.px(fx + 4, hy - 4, e); c.px(fx - 5, hy + 3, e); c.px(fx + 4, hy + 3, e)
    if dy >= 0: barrel()
def turret_cells():
    out = []
    for tint in TINTS:
        for f in range(4):   # 솟음
            c = Cv(TUR_W, TUR_H); turret_draw(c, tint, 0, rise=(f + 1) / 4); shadow(c, TUR_FX, TUR_FY, 11, 3.5)
            if f < 3: c.ring(TUR_FX, TUR_FY - 2, 12 - f, 4.5 - f * .3, T[4], gap=0)
            out.append(c)
        for d in range(8):   # 여덟 방향(0 오른쪽부터 시계 방향)
            c = Cv(TUR_W, TUR_H); turret_draw(c, tint, d * TAU / 8)
            if tint == "gold": outline(c, al(Y[1], .55))
            shadow(c, TUR_FX, TUR_FY, 11, 3.5)
            out.append(c)
        for f in range(3):   # 접힘 — 작은 빛으로
            c = Cv(TUR_W, TUR_H); turret_draw(c, tint, 0, fold=(f + 1) / 3.5); shadow(c, TUR_FX, TUR_FY, 11, 3.5)
            star(c, TUR_FX, TUR_FY - 10, 2 - f * 0.7, T[5], T[4])
            out.append(c)
    return out

# ── 지원 드론(26×18, 가운데 13,9) — 4칸 반복(날개 회전). 줄 = 연마 색 ──
def drone_cells():
    out = []
    for tint in TINTS:
        k = core(tint); e = edge(tint)
        for f in range(4):
            c = Cv(26, 18); cx, cy = 13, 9
            c.line(cx - 9, cy - 1, cx + 9, cy - 1, M[2])                  # 팔
            for sx in (-9, 9):                                            # 날개 — 돌며 모양이 바뀐다
                w = [6, 3, 1, 3][(f + (0 if sx < 0 else 2)) % 4]
                c.line(cx + sx - w, cy - 3, cx + sx + w, cy - 3, M[4]); c.px(cx + sx, cy - 2, M[3])
            c.disc(cx, cy, 5, 4, M[2]); c.ring(cx, cy, 5, 4, M[1])
            c.rect(cx - 4, cy - 3, 8, 1, M[4])
            c.disc(cx + 1, cy + 1, 2.2, 2, k[1]); c.px(cx + 1, cy, k[2]); c.px(cx, cy, W if f % 2 == 0 else k[2])   # 렌즈
            c.px(cx - 1, cy + 4, M[1]); c.px(cx + 2, cy + 4, M[1])
            if e: outline(c, al(e, .7))
            out.append(c)
    return out

# ── 강철 수호자(56×64, 발밑 28,61) — 0 서 있기 · 1~4 걷기 · 5~7 주먹. 오른쪽을 본다(왼쪽은 뒤집기). 줄 = 연마 색 ──
MECH_W, MECH_H, MECH_FX, MECH_FY = 64, 64, 28, 61
def mech_draw(c, tint, leg=(0, 0), bob=0, punch=0.0):
    k = core(tint); e = edge(tint)
    fx, fy = MECH_FX, MECH_FY
    # 다리 — 둘이 번갈아
    for i, (lx, off) in enumerate(((-8, leg[0]), (6, leg[1]))):
        x = fx + lx + off
        col = M[1] if i == 0 else M[2]
        c.rect(x - 3, fy - 18 + bob, 7, 12, col); c.rect(x - 3, fy - 18 + bob, 7, 1, M[3])
        c.rect(x - 5, fy - 6, 10, 5, M[2] if i else M[1]); c.rect(x - 5, fy - 6, 10, 1, M[3])   # 발
        c.px(x, fy - 12 + bob, k[0])
    by = fy - 20 + bob
    # 몸통 — 큰 상자 · 가운데 엔진 핵
    c.rect(fx - 13, by - 22, 26, 22, M[2]); c.rect(fx - 13, by - 22, 26, 2, M[4]); c.rect(fx - 13, by - 1, 26, 1, M[1])
    c.rect(fx - 13, by - 20, 2, 19, M[3]); c.rect(fx + 11, by - 20, 2, 19, M[1])
    c.disc(fx + 1, by - 11, 5, 5, M[1]); c.disc(fx + 1, by - 11, 4, 4, k[0]); c.disc(fx + 1, by - 11, 2.5, 2.5, k[1]); c.rect(fx, by - 12, 2, 2, k[2])
    for i in range(3): c.px(fx - 9 + i * 2, by - 5, k[1])
    # 머리 — 띠 모양 눈
    c.rect(fx - 6, by - 31, 13, 9, M[2]); c.rect(fx - 6, by - 31, 13, 1, M[4]); c.rect(fx - 4, by - 28, 10, 2, k[1]); c.px(fx + 4, by - 28, k[2]); c.px(fx + 5, by - 28, W)
    c.line(fx - 3, by - 34, fx - 3, by - 31, M[3]); c.px(fx - 3, by - 35, k[2])   # 안테나
    # 팔 — 뒤 팔(왼쪽) · 앞 팔(오른쪽, 주먹)
    c.rect(fx - 19, by - 21, 6, 8, M[1]); c.rect(fx - 19, by - 13, 6, 12, M[1]); c.rect(fx - 20, by - 2, 8, 6, M[2])
    reach = int(round(punch * 8))
    ax = fx + 13
    c.rect(ax, by - 21, 7, 8, M[3]); c.rect(ax, by - 21, 7, 1, M[4])
    if reach > 2:
        c.rect(ax + 2, by - 14, 6 + reach, 6, M[2]); c.rect(ax + 2, by - 14, 6 + reach, 1, M[4])
        c.rect(ax + 6 + reach, by - 16, 8, 9, M[3]); c.rect(ax + 6 + reach, by - 16, 8, 1, M[4]); c.px(ax + 12 + reach, by - 12, k[2])
    else:
        c.rect(ax + 1, by - 13, 6, 12, M[2]); c.rect(ax, by - 2, 8, 6, M[3]); c.rect(ax, by - 2, 8, 1, M[4])
    c.px(ax + 3, by - 18, k[1])
    if e: outline(c, al(e, .6))
def mech_cells():
    out = []
    for tint in TINTS:
        frames = [dict(), dict(leg=(-3, 3), bob=0), dict(leg=(0, 0), bob=-1), dict(leg=(3, -3), bob=0), dict(leg=(0, 0), bob=-1),
                  dict(punch=0.0, bob=1), dict(punch=1.0), dict(punch=0.5)]
        for fr in frames:
            c = Cv(MECH_W, MECH_H); mech_draw(c, tint, **fr); shadow(c, MECH_FX, MECH_FY, 17, 4)
            if fr.get("punch") == 1.0: star(c, MECH_FX + 13 + 6 + 8 + 9, MECH_FY - 20 - 12, 2, T[5], T[4])
            out.append(c)
    return out

# ── 육각 소환 표시(48×30, 가운데 24,15) — 0~3 나타남 · 4~7 반복 ──
def hexmark(c, cx, cy, r, col, rot=0.0, dash=0):
    pts = [(cx + math.cos(rot + i * TAU / 6) * r, cy + math.sin(rot + i * TAU / 6) * r * SQ * .75) for i in range(6)]
    c.poly(pts, col, dash=dash); return pts
def hex_cells():
    out = []
    for f in range(8):
        c = Cv(48, 30); cx, cy = 24, 15
        if f < 4:
            k = (f + 1) / 4
            hexmark(c, cx, cy, 21 * k, T[4] if f < 3 else T[5])
            if f == 3: hexmark(c, cx, cy, 14, al(T[3], .8), dash=2)
        else:
            j = f - 4
            pts = hexmark(c, cx, cy, 21, T[4]); hexmark(c, cx, cy, 14, al(T[3], .8), rot=j * TAU / 24, dash=2)
            for i, p in enumerate(pts):   # 꼭짓점 빛이 차례로 돈다
                c.px(p[0], p[1], W if i % 4 == j else T[5])
            c.band(cx, cy, 14, 14 * SQ * .75, 0, 1, al(T[3], .5), dens=0.25)
        out.append(c)
    return out

# ── 자기장 포획(210×168, 가운데 105,84 · 그림 속 반지름 100) — 0~2 퍼짐 · 3~4 전자기장 · 5~7 끊어져 흩어짐 ──
FR, FRY = 100, 100 * SQ
def field_cells(seed=7):
    out = []
    W_, H_ = 210, 168; cx, cy = 105, 84
    for f in range(8):
        c = Cv(W_, H_)
        if f <= 2:
            k = ez((f + 1) / 3); r = FR * k
            c.band(cx, cy, r, r * SQ, 0.86, 1.0, al(T[3], .7), dens=0.6)
            c.ring(cx, cy, r, r * SQ, T[5]); c.ring(cx, cy, r - 3, (r - 3) * SQ, al(T[4], .8), gap=3)
        elif f <= 4:
            c.band(cx, cy, FR, FRY, 0, 1.0, al(T[2], .55), dens=lambda d: 0.18 + 0.25 * d)
            c.ring(cx, cy, FR, FRY, T[5]); c.ring(cx, cy, FR - 2, FRY - 2, T[4])
            c.ring(cx, cy, FR * .55, FRY * .55, al(T[4], .7), gap=4)
            for i in range(9):   # 가는 전류선 — 둘레에서 가운데로 꺾이며
                a = i * TAU / 9 + f * 0.3; x, y = cx + math.cos(a) * FR, cy + math.sin(a) * FRY
                for s in range(5):
                    k = 1 - (s + 1) / 6; nx = cx + math.cos(a + (rnd(seed, i, s + f) - .5) * .5) * FR * k; ny = cy + math.sin(a + (rnd(seed, i, s + f) - .5) * .5) * FRY * k
                    c.line(x, y, nx, ny, T[6] if s < 2 else T[4]); x, y = nx, ny
            star(c, cx, cy, 3, W, T[5])
        else:
            u = (f - 4) / 3
            for i in range(14):   # 끊어진 고리 조각
                a0 = i * TAU / 14 + rnd(seed, i) * .2; a1 = a0 + TAU / 14 * (1 - u) * .7
                rr = FR * (1 + u * .06)
                c.ring(cx, cy, rr, rr * SQ, T[5] if u < .5 else T[4], a0, a1)
            for i in range(10):
                a = rnd(seed + 3, i) * TAU; d = FR * (0.2 + rnd(seed + 3, i, 1) * 0.8)
                if rnd(seed + 5, i, f) < 1 - u * .8: c.px(cx + math.cos(a) * d, cy + math.sin(a) * d * SQ, T[5])
        out.append(c)
    return out

# ── 레일포 마디(16×12) — 가로로 늘려 쓴다. 0 가장 밝음 → 3 잔광 ──
def rail_cells():
    out = []
    for f in range(4):
        c = Cv(16, 12)
        a = [1, .8, .5, .3][f]
        c.band(8, 6, 40, 6, 0, 1, al(T[3], a * .7), dens=lambda d: 1 - d if f < 2 else .5 * (1 - d))
        if f < 3: c.rect(0, 4, 16, 4, al(T[4], a))
        c.rect(0, 5, 16, 2, W if f == 0 else T[6] if f == 1 else T[5] if f == 2 else al(T[4], .6))
        if f < 2:
            for i in range(0, 16, 5): c.px(i + f * 2, 3, T[5]); c.px(i + 2 + f, 8, T[5])
        out.append(c)
    return out

# ── 폭발(100×100, 가운데 50,58 · 그림 속 반지름 46) — 수호자 코어 폭발 ──
def boom_cells(seed=9):
    out = []; R = 46; cx, cy = 50, 58
    for f in range(8):
        u = f / 7; c = Cv(100, 100)
        r = R * ez(min(1, u * 1.6))
        if f < 6 and r >= 1: c.band(cx, cy, r, r * SQ, 0.75, 1.0, al(T[4], 1 - u), dens=0.7 * (1 - u) + .2)
        if f < 4:
            cr = 18 * (1 - u * .8)
            c.disc(cx, cy - 10, cr, cr, T[3]); c.disc(cx, cy - 10, cr * .7, cr * .7, T[5]); c.disc(cx, cy - 10, cr * .35, cr * .35, W)
        for i in range(12):   # 금속 파편
            a = rnd(seed, i) * TAU; d = 6 + ez(u) * (20 + rnd(seed, i, 1) * 26)
            x, y = cx + math.cos(a) * d, cy - 10 + math.sin(a) * d * .8 - math.sin(u * math.pi) * 10 + u * u * 12
            if u < .95: c.rect(x, y, 2, 1 if i % 2 else 2, M[4] if i % 3 else T[5])
        if f < 3: star(c, cx, cy - 10, 5 - f, W, T[5])
        out.append(c)
    return out

# ── 궤도 포격 한 번(40×72, 바닥 20,66) — 가는 빛이 내려와 땅에서 터진다 ──
def strike_cells(seed=13):
    out = []; bx, by = 20, 66
    for f in range(7):
        c = Cv(40, 72)
        if f <= 2:
            top = 0; bot = by * (f + 1) / 3
            c.line(bx, top, bx, bot, T[5]); c.line(bx - 1, top, bx - 1, bot, al(T[4], .7)); c.line(bx + 1, top, bx + 1, bot, al(T[4], .7))
        if f >= 2:
            u = (f - 2) / 4; r = 6 + u * 13
            c.band(bx, by, r, r * SQ, .6, 1, al(T[4], 1 - u), dens=.8 - u * .5)
            if f < 5: star(c, bx, by - 3, 4 - (f - 2), W, T[5])
            for i in range(6):
                a = -math.pi * rnd(seed, i); d = 4 + u * (10 + rnd(seed, i, 1) * 8)
                if u < .9: c.px(bx + math.cos(a) * d, by - 2 + math.sin(a) * d, T[5] if i % 2 else M[4])
        out.append(c)
    return out

# ── 궤도 광선(44×220, 바닥 22,214) — 0~2 가는 선이 내려옴 · 3~6 굵은 청백 광선 · 7~9 사라짐 ──
def beam_cells():
    out = []; bx, by = 22, 214
    for f in range(10):
        c = Cv(44, 220)
        if f <= 2:
            bot = by * (f + 1) / 3
            c.line(bx, 0, bx, bot, T[6]); c.line(bx - 1, 0, bx - 1, bot, al(T[4], .6)); c.line(bx + 1, 0, bx + 1, bot, al(T[4], .6))
        else:
            k = [1, 1, .85, .7, .5, .3, .15][f - 3]; w = 16 * k
            c.band(bx, by / 2, w + 4, 400, 0, 1, al(T[3], .6 * k), dens=lambda d: 1 - d)
            c.rect(bx - w / 2, 0, w, by, al(T[4], .9 * k))
            c.rect(bx - w / 4, 0, max(1, w / 2), by, T[6] if k > .6 else T[5])
            c.disc(bx, by, w * 1.2, w * .45, al(T[5], k))
            for i in range(8):
                y = (i * 29 + f * 13) % by
                c.px(bx - w / 2 - 2, y, T[5]); c.px(bx + w / 2 + 1, (y + 60) % by, T[5])
        out.append(c)
    return out

# ── 지면 충격파(360×290, 가운데 180,145 · 그림 속 반지름 175) ──
def shock_cells():
    out = []; R = 175; cx, cy = 180, 145
    for f in range(8):
        u = f / 7; c = Cv(360, 290); r = R * ez(0.25 + u * 0.75)
        c.band(cx, cy, r, r * SQ, 0.88, 1.0, al(T[4], 1 - u * .8), dens=0.8 - u * .6)
        c.ring(cx, cy, r, r * SQ, T[5] if u < .6 else T[4])
        c.ring(cx, cy, r * .7, r * .7 * SQ, al(T[4], .7 * (1 - u)), gap=4)
        for i in range(12):   # 육각 격자 조각
            a = i * TAU / 12 + .2; d = r * (.4 + .5 * rnd(3, i))
            if rnd(5, i, f) < 1 - u: hexmark(c, cx + math.cos(a) * d, cy + math.sin(a) * d * SQ, 7, al(T[5], .8))
        out.append(c)
    return out

# ── 오버클럭 전류 테두리(20×20, 4칸 반복) — 줄 0 푸른 번개 · 1 과열 주황 ──
def zap_cells(seed=17):
    out = []
    for row, cols in enumerate(([T[5], T[4]], [O[3], O[2]])):
        for f in range(4):
            c = Cv(20, 20)
            for i in range(3):
                a = rnd(seed, i, f) * TAU; x, y = 10 + math.cos(a) * 8, 10 + math.sin(a) * 8
                for s in range(3):
                    nx = x + (rnd(seed, i, s + f * 3) - .5) * 6; ny = y + (rnd(seed + 1, i, s + f * 3) - .5) * 6
                    c.line(x, y, nx, ny, cols[0] if s == 0 else cols[1]); x, y = nx, ny
            out.append(c)
    return out

# ── 스킬 아이콘(24×24) — 펄스 · 터렛 · 드론 · 자기장 · 레일포 · 수호자 · 오버클럭 · 궤도 ──
def icon_cells():
    def base():
        c = Cv(24, 24); c.rect(1, 1, 22, 22, T[0]); c.rect(1, 1, 22, 1, T[2]); c.rect(1, 22, 22, 1, M[0])
        c.poly([(1, 1), (22, 1), (22, 22), (1, 22)], T[1]); return c
    out = []
    c = base(); c.rect(4, 13, 6, 5, M[3]); c.rect(4, 13, 6, 1, M[4]); c.rect(10, 14, 3, 3, M[2])                 # 펄스 — 손목 장치와 전기탄
    c.rect(15, 9, 4, 4, T[4]); c.rect(16, 10, 2, 2, W); c.px(14, 8, T[5]); c.px(20, 8, T[5]); c.px(14, 14, T[5]); c.px(20, 14, T[5]); out.append(c)
    c = base(); t = Cv(32, 36); turret_draw(t, "teal", -TAU / 8)                                                # 터렛
    for y in range(20):
        for x in range(20):
            p = t.a[y + 14, x + 6]
            if p[3]: c.px(x + 2, y + 2, tuple(int(v) for v in p))
    out.append(c)
    c = base(); d = Cv(26, 18); dd = drone_cells()[0]; c.paste(dd, -1, 3); c.paste(dd, 4, 9); out.append(c)            # 드론 둘
    c = base(); c.ring(12, 13, 9, 7, T[5]); c.ring(12, 13, 5, 4, T[4], gap=2); star(c, 12, 13, 2, W, T[5])          # 자기장
    c.line(3, 6, 8, 10, T[5]); c.line(21, 6, 16, 10, T[5]); out.append(c)
    c = base(); c.rect(2, 11, 20, 3, T[4]); c.rect(2, 12, 20, 1, W); c.rect(3, 9, 6, 7, M[3]); c.rect(3, 9, 6, 1, M[4]); out.append(c)   # 레일포
    c = base(); m = Cv(MECH_W, MECH_H); mech_draw(m, "teal")                                                    # 수호자 머리 · 가슴
    for y in range(20):
        for x in range(20):
            p = m.a[y * 2 + 12, x * 2 + 9]
            if p[3]: c.px(x + 2, y + 2, tuple(int(v) for v in p))
    out.append(c)
    c = base(); c.poly([(13, 3), (7, 13), (12, 13), (10, 21), (17, 10), (12, 10)], Y[2]); c.fillpoly([(13, 3), (7, 13), (12, 13), (10, 21), (17, 10), (12, 10)], Y[2])   # 오버클럭 — 번개
    c.line(13, 5, 9, 12, Y[3]); out.append(c)
    c = base(); c.ring(12, 15, 8, 5, T[5]); c.line(12, 2, 12, 20, T[6]); c.line(11, 2, 11, 17, T[4]); c.line(13, 2, 13, 17, T[4])   # 궤도 — 하늘에서 광선
    c.line(4, 15, 20, 15, al(T[5], .7)); c.px(12, 15, W); out.append(c)
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
    sheets["en_pulse"] = pack("en_pulse", pulse_cells(), 4, man, loop=1, rows=3)
    sheets["en_spark"] = pack("en_spark", spark_cells(), None, man)
    sheets["en_flash"] = pack("en_flash", flash_cells(), None, man)
    sheets["en_laser"] = pack("en_laser", laser_cells(), None, man, cx=0, cy=2)
    sheets["en_turret"] = pack("en_turret", turret_cells(), 15, man, cx=TUR_FX, cy=TUR_FY, rows=3)
    sheets["en_drone"] = pack("en_drone", drone_cells(), 4, man, loop=1, rows=3)
    sheets["en_mech"] = pack("en_mech", mech_cells(), 8, man, cx=MECH_FX, cy=MECH_FY, rows=3)
    sheets["en_hex"] = pack("en_hex", hex_cells(), None, man)
    sheets["en_field"] = pack("en_field", field_cells(), 4, man, r=100)
    sheets["en_rail"] = pack("en_rail", rail_cells(), None, man, cx=0, cy=6)
    sheets["en_boom"] = pack("en_boom", boom_cells(), 4, man, cx=50, cy=58, r=46)
    sheets["en_strike"] = pack("en_strike", strike_cells(), None, man, cx=20, cy=66)
    sheets["en_beam"] = pack("en_beam", beam_cells(), None, man, cx=22, cy=214)
    sheets["en_shock"] = pack("en_shock", shock_cells(), 4, man, r=175)
    sheets["en_zap"] = pack("en_zap", zap_cells(), 4, man, loop=1, rows=2)
    sheets["en_icons"] = pack("en_icons", icon_cells(), None, man, cx=0, cy=0)
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
