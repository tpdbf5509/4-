# 히든 직업 Wyvern Knight 006(와이번 나이트) 도트 이펙트 시트 — 이 스크립트가 한 칸 한 칸 직접 그린다(11월 17일).
# Engineer 003 · Necromancer 004 와 같은 방식(점 · 선 · 타원 도구는 design/effects/engineer/make.py 에서 옮겨 씀) — 외부 이펙트 라이브러리 없이 Pillow · numpy 로 찍는다.
# 쓰는 법: python3 design/effects/wyvern/make.py  →  public/assets/game/rpg/effects/hidden-jobs/wyvern/px/*.webp + manifest.json(칸 규격)
#          python3 design/effects/wyvern/make.py preview <폴더>  →  확대한 확인 그림(PNG)도 함께
# 칸 규격은 src/game/wyvernPxData.js 에 손으로 옮긴다(manifest.json 과 같아야 한다 — tools/wyvern.test.mjs 가 본다).
# 1배 픽셀로 그리고 게임이 정수 배(보통 2배)로 키운다. 팔레트(기획안) 기본 #BB3D3D · 보조 #EF9757 · 최고 연마 강조 #2C174F — 용비늘 · 화염 · 날개 · 용 그림자.
import numpy as np
from PIL import Image
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "game", "rpg", "effects", "hidden-jobs", "wyvern", "px")
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


# ── 팔레트 — 붉은 용비늘 · 불꽃 · 보라 날개 · 뼈 · 연기 ──
R = [rgb(c) for c in ["#24090D", "#45171C", "#742428", "#BB3D3D", "#D9654A"]]
F = [rgb(c) for c in ["#6E2410", "#B8401F", "#E06A35", "#EF9757", "#F8C27A", "#FFE3AC", "#FFF8E6"]]
V = [rgb(c) for c in ["#140824", "#2C174F", "#4B2C7A", "#7A55B0", "#B99DE6"]]
G = [rgb(c) for c in ["#2B2421", "#4A3F3A", "#7A6C63", "#B8A99A", "#E8DECF"]]
S = [rgb(c) for c in ["#1F191B", "#362D30", "#54484A", "#74686A"]]
LINE = rgb("#FF5E4A")   # 연마 75 — 비늘의 붉은 선

def outline(c, col):   # 그린 것 둘레에 1px 윤곽(투명한 칸에만)
    a = c.a[..., 3] > 0
    m = np.zeros_like(a)
    m[1:, :] |= a[:-1, :]; m[:-1, :] |= a[1:, :]; m[:, 1:] |= a[:, :-1]; m[:, :-1] |= a[:, 1:]
    m &= ~a
    c.a[m] = col

def flame(c, cx, cy, r, u, seed=1, up=0.0):
    """불꽃 덩어리 — 바깥 붉은 테 · 가운데 밝은 심 · 디더로 옅어진다. u 0(뜨거움) → 1(꺼짐)"""
    if r <= 0.5: return
    outer = F[1] if u < .5 else R[2]
    c.band(cx, cy, r, r * .9, 0, 1, al(outer, .95), dens=lambda d: (1.05 - d) * (1.2 - u))
    c.band(cx, cy - r * .1, r * .72, r * .64, 0, 1, al(F[2] if u < .6 else F[1], 1), dens=lambda d: (1.1 - d) * (1.25 - u * 1.1))
    if u < .75: c.band(cx, cy - r * .18, r * .45, r * .4, 0, 1, F[4] if u < .35 else F[3], dens=lambda d: (1.15 - d) * (1.3 - u * 1.3))
    if u < .4: c.disc(cx, cy - r * .22, r * .22, r * .2, F[6] if u < .2 else F[5])
    for i in range(int(r * .9)):   # 혀처럼 위로 솟는 끝
        a = -math.pi / 2 + (rnd(seed, i) - .5) * 2.2; d = r * (.75 + rnd(seed, i, 2) * .5)
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d - up
        if rnd(seed, i, 3) < .8 - u * .6: c.px(x, y, F[2] if rnd(seed, i, 4) < .5 else F[1])

def smoke(c, cx, cy, r, u):
    c.band(cx, cy, r, r * .85, 0, 1, al(S[2], .8), dens=lambda d: (1 - d) * (.95 - u * .8))
    c.band(cx - r * .2, cy - r * .2, r * .5, r * .45, 0, 1, al(S[3], .7), dens=lambda d: (1 - d) * (.8 - u * .7))

# ── 용조격(96×64) — 오른쪽을 보는 세 줄 발톱 참격. 기준점(8, 32) = 시전자 손. 반지름 80(1배) = 사거리 160(2배) ──
def claw_cells():
    out = []
    for f in range(6):
        c = Cv(96, 64); u = f / 5
        sweep = ez(min(1, (f + 1) / 3))   # 0~2 칸에 휘둘러 나가고 3~5 칸은 잔상
        fade = 0 if f < 3 else (f - 2) / 3
        for k, (rr, col) in enumerate([(78, F[5]), (66, F[3]), (54, F[2])]):
            a0 = -0.83; a1 = a0 + 1.66 * sweep
            for j in range(3):   # 한 줄 굵기 3px, 바깥이 밝다
                cc = col if j == 0 else (F[2] if j == 1 else R[3])
                if fade > .66 and j == 0: cc = R[3]
                n = int(rr * 3)
                for i in range(n):
                    a = a0 + (a1 - a0) * i / n
                    taper = math.sin(i / n * math.pi)   # 끝은 가늘다
                    if j >= 1 and taper < .35: continue
                    if fade and BAYER[i % 4, (j + k) % 4] < fade: continue
                    c.px(8 + math.cos(a) * (rr - j - k * .4), 32 + math.sin(a) * (rr - j), cc)
        # 발톱 끝 불씨
        if f < 5:
            for i in range(10):
                a = -0.83 + 1.66 * sweep * rnd(3, i, f); d = 50 + rnd(5, i, f) * 32
                c.px(8 + math.cos(a) * d, 32 + math.sin(a) * d, F[5] if f < 2 else F[3])
        out.append(c)
    return out

# ── 타격(48×48) — 불꽃 터짐 · 붉은 고리 · 사방 불씨 ──
def hit_cells():
    out = []
    for f in range(7):
        c = Cv(48, 48); u = f / 6
        flame(c, 24, 26, 6 + ez(u) * 9, u, seed=11 + f)
        c.ring(24, 24, 6 + 16 * ez(u), 5 + 13 * ez(u), F[4] if f < 3 else R[3], gap=0 if f < 4 else 2)
        for i in range(12):
            a = i * TAU / 12 + rnd(7, i) * .4; d = 6 + 19 * ez(u) * (.6 + rnd(9, i) * .5)
            if f < 6: star(c, 24 + math.cos(a) * d, 24 + math.sin(a) * d, 1 if f < 3 else 0, F[5] if f < 2 else F[3])
        out.append(c)
    return out

# ── 와이번(72×56) — 옆모습 · 오른쪽을 본다. 0~3 날갯짓 반복 · 4~6 불을 뿜는 공격. 줄 0 그대로 · 1 연마 75 붉은 선 ──
def wyvern_draw(c, flap, atk=0.0, line=False):
    cx, cy = 34, 34
    # 먼 날개(어둡게) — 날갯짓 각도 flap(-1 아래 ~ 1 위)
    def wing(dx, dark):
        sh = (R[1], R[2]) if dark else (R[2], R[3])
        tip = (cx - 26 + dx, cy - 8 - 22 * flap); elb = (cx - 6 + dx, cy - 12 - 10 * flap)
        mem = [(cx + 2 + dx, cy - 4), elb, tip, (cx - 24 + dx, cy - 2 - 8 * flap), (cx - 18 + dx, cy - 1 - 3 * flap), (cx - 12 + dx, cy + 2), (cx - 6 + dx, cy + 1)]
        c.fillpoly(mem, sh[0])
        c.fillpoly([(cx + 1 + dx, cy - 4), elb, ((elb[0] + tip[0]) / 2, (elb[1] + tip[1]) / 2 + 3), (cx - 10 + dx, cy - 1)], sh[1])
        bone = G[3] if not dark else G[2]
        c.line(cx + 2 + dx, cy - 4, elb[0], elb[1], bone); c.line(elb[0], elb[1], tip[0], tip[1], bone)
        for p_ in mem[3:6]: c.line(elb[0], elb[1], p_[0], p_[1], R[1] if not dark else R[0])
        if line and not dark: c.line(cx - 2 + dx, cy - 4, (elb[0] + tip[0]) / 2, (elb[1] + tip[1]) / 2 + 2, LINE); c.line(elb[0], elb[1] + 2, tip[0] + 2, tip[1] + 4, LINE)
    wing(6, True)
    # 꼬리
    for i in range(18):
        t = i / 17; x = cx - 8 - t * 26; y = cy + 4 + math.sin(t * 3 + flap) * 3 + t * 4
        c.disc(x, y, 3.5 * (1 - t) + .8, 3 * (1 - t) + .8, R[3] if i % 3 else R[2])
    c.fillpoly([(cx - 34, cy + 7), (cx - 40, cy + 3), (cx - 38, cy + 11)], R[3])   # 꼬리 끝 가시
    # 몸 · 배
    c.disc(cx - 2, cy + 2, 11, 7, R[3]); c.disc(cx - 1, cy + 5, 8, 3.5, F[3]); c.disc(cx - 4, cy - 1, 7, 3, R[4])
    for i in range(5): c.px(cx - 8 + i * 3, cy - 5, R[2])   # 등 가시 점
    if line:
        for i in range(4): c.px(cx - 9 + i * 4, cy - 2, LINE); c.px(cx - 8 + i * 4, cy - 2, LINE)
    # 다리
    c.line(cx - 2, cy + 8, cx - 4, cy + 13, R[2]); c.line(cx + 4, cy + 7, cx + 3, cy + 12, R[2])
    c.px(cx - 5, cy + 13, G[4]); c.px(cx + 2, cy + 12, G[4])
    # 목 · 머리
    nk = [(cx + 6, cy - 2), (cx + 12, cy - 9), (cx + 16, cy - 13)]
    for (x, y) in nk: c.disc(x, y, 4, 3.5, R[3])
    hx, hy = cx + 21, cy - 14
    c.disc(hx, hy, 6, 4, R[3]); c.disc(hx + 1, hy + 1, 4, 2, R[4])
    jaw = 2 + atk * 4
    c.fillpoly([(hx + 3, hy - 1), (hx + 12, hy + 1), (hx + 3, hy + 3)], R[3])            # 윗턱
    c.fillpoly([(hx + 2, hy + 3), (hx + 10, hy + 3 + jaw), (hx + 1, hy + 5)], R[2])       # 아래턱
    c.line(hx - 4, hy - 3, hx - 9, hy - 8, G[3]); c.line(hx - 2, hy - 4, hx - 6, hy - 10, G[4])   # 뿔
    c.px(hx + 2, hy - 1, F[6]); c.px(hx + 3, hy - 1, F[5])                                 # 눈
    if atk > 0:   # 입 속 불빛
        c.disc(hx + 9, hy + 2 + jaw * .5, 2 + atk * 2.5, 1.5 + atk * 2, F[4]); c.px(hx + 9, hy + 2 + jaw * .5, F[6])
    wing(0, False)
    outline(c, R[0])

def wyvern_cells():
    out = []
    for line in (False, True):
        for f, fl in enumerate([1.0, 0.35, -0.8, -0.2]):
            c = Cv(72, 56); wyvern_draw(c, fl, 0, line); out.append(c)
        for f, a in enumerate([0.5, 1.0, 0.6]):
            c = Cv(72, 56); wyvern_draw(c, 0.2, a, line); out.append(c)
    return out

# ── 와이번 그림자(64×20) — 땅에 비친 날개 그림자 · 날갯짓 4칸 ──
def shade_cells():
    out = []
    for f, fl in enumerate([1.0, 0.35, -0.8, -0.2]):
        c = Cv(64, 20); col = al(S[0], .55)
        c.disc(32, 10, 9, 3.5, col)
        span = 26 * (0.6 + 0.4 * abs(math.cos(fl)))
        c.fillpoly([(30, 9), (30 - span, 6 - fl * 2), (26 - span * .6, 12), (30, 12)], col)
        c.fillpoly([(36, 9), (36 + span * .5, 5 - fl * 2), (38 + span * .3, 12)], col)
        c.disc(46, 9, 3, 2, col); c.disc(14, 11, 3, 1.5, col)
        out.append(c)
    return out

# ── 화염탄(20×20) — 오른쪽으로 나는 불덩이 · 꼬리 · 4칸 반복 ──
def ball_cells():
    out = []
    for f in range(4):
        c = Cv(20, 20)
        for i in range(7):
            x = 12 - i * 1.6; r = 3.6 - i * .45
            c.disc(x, 10 + math.sin(f * 1.6 + i) * .9, r, r * .85, [F[5], F[4], F[3], F[2], F[1], R[3], R[2]][i])
        c.disc(13, 10, 2.2, 2, F[6])
        for i in range(3): c.px(4 - i * 1.5 + rnd(f, i) * 2, 10 + (rnd(f, i, 2) - .5) * 7, F[3])
        out.append(c)
    return out

# ── 소환 문양(96×56) — 붉은 용 문양 · 0~3 나타남 · 4~7 반복 ──
def sigil_cells():
    out = []
    for f in range(8):
        c = Cv(96, 56); u = min(1, (f + 1) / 4); rot = f * .25
        cx, cy = 48, 28
        c.band(cx, cy, 44 * u, 44 * SQ * .7 * u, 0, 1, al(R[3], .5), dens=lambda d: (1 - d) * .45)
        c.ring(cx, cy, 44 * u, 44 * SQ * .7 * u, F[3])
        c.ring(cx, cy, 34 * u, 34 * SQ * .7 * u, R[3], gap=2)
        c.ring(cx, cy, 16 * u, 16 * SQ * .7 * u, F[4])
        for i in range(6):   # 비늘 모양 표식 여섯
            a = rot + i * TAU / 6; x, y = cx + math.cos(a) * 39 * u, cy + math.sin(a) * 39 * SQ * .7 * u
            c.fillpoly([(x, y - 3), (x + 3, y), (x, y + 2), (x - 3, y)], F[4] if (i + f) % 2 else F[2])
        for i in range(3):   # 날개 모양 줄
            a = -rot + i * TAU / 3
            c.line(cx + math.cos(a) * 16 * u, cy + math.sin(a) * 16 * SQ * .7 * u, cx + math.cos(a + .6) * 34 * u, cy + math.sin(a + .6) * 34 * SQ * .7 * u, F[2])
        if f >= 4:
            for i in range(8):
                a = rnd(31, i, f) * TAU; d = rnd(33, i, f) * 40
                c.px(cx + math.cos(a) * d, cy + math.sin(a) * d * .55 - rnd(35, i, f) * 6, F[5])
        out.append(c)
    return out

# ── 포탈 · 용 머리(80×72) — 0~3 포탈이 열림 · 4~7 용 머리가 나와 입을 벌린다. 오른쪽을 본다, 기준점(18, 36) ──
def portal_cells():
    out = []
    for f in range(8):
        c = Cv(80, 72); u = min(1, (f + 1) / 4); px_, py = 18, 36
        c.band(px_, py, 9 * u, 26 * u, 0, 1, al(V[1], .95), dens=lambda d: 1.2 - d)
        c.band(px_, py, 6 * u, 20 * u, 0, 1, V[2], dens=lambda d: 1 - d)
        c.ring(px_, py, 10 * u, 27 * u, F[2]); c.ring(px_, py, 11 * u, 28 * u, R[3], gap=3)
        for i in range(10):
            a = f * .5 + i * TAU / 10
            c.px(px_ + math.cos(a) * 12 * u, py + math.sin(a) * 30 * u, F[4] if i % 2 else V[4])
        if f >= 4:
            e = (f - 4) / 3; hx = px_ + 8 + e * 26; hy = py
            # 목 — 포탈에서 이어진다
            for i in range(8):
                t = i / 7; c.disc(px_ + 2 + (hx - px_ - 2) * t, hy + 4 - t * 2, 8 - t * 2, 7 - t * 2, R[3] if i % 2 else R[2])
            c.disc(hx, hy - 2, 11, 8, R[3]); c.disc(hx + 2, hy, 8, 5, R[4])
            jaw = 4 + e * 8
            c.fillpoly([(hx + 4, hy - 6), (hx + 24, hy - 3), (hx + 22, hy + 1), (hx + 4, hy + 1)], R[3])     # 윗턱
            c.fillpoly([(hx + 3, hy + 3), (hx + 20, hy + 3 + jaw), (hx + 16, hy + 6 + jaw), (hx + 1, hy + 7)], R[2])   # 아래턱
            for i in range(4): c.px(hx + 8 + i * 4, hy + 2, G[4]); c.px(hx + 8 + i * 4, hy + 3 + jaw * (i + 1) / 5, G[4])   # 이빨
            c.line(hx - 6, hy - 6, hx - 16, hy - 16, G[3]); c.line(hx - 4, hy - 7, hx - 10, hy - 20, G[4]); c.line(hx - 6, hy - 5, hx - 18, hy - 10, G[2])  # 뿔
            c.disc(hx + 4, hy - 4, 1.6, 1.2, F[6]); c.px(hx + 5, hy - 4, F[5])
            c.disc(hx + 22, hy + 1 + jaw * .5, 3 + e * 4, 2 + e * 3, F[4]); c.disc(hx + 23, hy + 1 + jaw * .5, 1.5 + e * 2, 1 + e * 1.5, F[6])
            outline(c, R[0])
        out.append(c)
    return out

# ── 불꽃 덩어리(32×32) — 범위를 채우는 큰 형상. 0 뜨거운 심 → 7 연기 ──
def puff_cells():
    out = []
    for f in range(8):
        c = Cv(32, 32); u = f / 7
        if f < 6: flame(c, 16, 18, 7 + ez(u) * 6, u, seed=41 + f, up=u * 2)
        if f >= 4: smoke(c, 16, 14 - (f - 4), 5 + (f - 4) * 2, (f - 4) / 3)
        out.append(c)
    return out

# ── 바닥 균열 · 화염 충격파(200×120, 그림 속 반지름 90) — 0~1 균열 · 2~5 불길 고리 · 6~7 잔불 ──
def crack_cells():
    out = []
    cx, cy, R0 = 100, 60, 90
    for f in range(8):
        c = Cv(200, 120); u = f / 7
        k = ez(min(1, (f + 1) / 3))
        # 균열 — 가운데에서 갈라진 선
        for i in range(9):
            a = i * TAU / 9 + rnd(51, i) * .5; x, y = cx, cy
            L = R0 * (.4 + rnd(53, i) * .5) * k
            for j in range(6):
                a2 = a + (rnd(55, i, j) - .5) * .8; nx, ny = x + math.cos(a2) * L / 6, y + math.sin(a2) * L / 6 * SQ
                c.line(x, y, nx, ny, F[4] if f < 4 else R[3]); c.line(x + 1, y, nx + 1, ny, R[1])
                x, y = nx, ny
        # 불길 고리
        if 1 <= f <= 6:
            rr = R0 * ez((f - 1) / 5)
            c.band(cx, cy, rr, rr * SQ, .82, 1, F[2] if f < 4 else R[3], dens=lambda d: .9 - u * .6)
            c.ring(cx, cy, rr, rr * SQ, F[5] if f < 4 else F[3])
            for i in range(int(18 + rr * .25)):
                a = i * TAU / (18 + rr * .25) + rnd(57, i) * .3
                x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr * SQ
                if rnd(59, i, f) < .7: flame(c, x, y - 2, 3 + rnd(61, i) * 3, min(1, u + .2), seed=i + f)
        if f < 3: flame(c, cx, cy - 2, 10 + f * 6, f / 4, seed=63)
        if f >= 5:
            for i in range(14):
                a = rnd(65, i) * TAU; d = rnd(67, i) ** .5 * R0
                c.px(cx + math.cos(a) * d, cy + math.sin(a) * d * SQ, F[3] if (i + f) % 3 else R[3])
        out.append(c)
    return out

# ── 떨어지는 화염탄(40×110, 바닥 기준 cy 104) — 0~3 떨어짐 · 4~6 땅에 닿아 터짐 ──
def drop_cells():
    out = []
    for f in range(7):
        c = Cv(40, 110)
        if f < 4:
            y = 10 + f * 26
            for i in range(10): c.disc(20 + math.sin(i + f) * .8, y - i * 3.2, 5 - i * .4, 5 - i * .4, [F[6], F[5], F[4], F[3], F[2], F[1], R[3], R[2], S[2], S[1]][i])
            c.disc(20, y + 1, 3.5, 3.5, F[6])
        else:
            u = (f - 4) / 2
            flame(c, 20, 96, 9 + u * 7, u, seed=71 + f, up=4)
            c.ring(20, 104, 8 + 10 * u, (8 + 10 * u) * SQ * .6, F[4])
            for i in range(8):
                a = -math.pi * rnd(73, i); d = 6 + 12 * u * (.5 + rnd(75, i))
                c.px(20 + math.cos(a) * d, 100 + math.sin(a) * d, F[5])
        out.append(c)
    return out

# ── 용린 수호(40×56, 발밑 기준) — 몸을 둘러싼 붉은 다각 비늘 · 6칸 반복 반짝임 ──
def scale_cells():
    out = []
    for f in range(6):
        c = Cv(40, 56)
        for i in range(22):
            a = i * TAU / 22; rx, ry = 15, 22
            x, y = 20 + math.cos(a) * rx, 28 + math.sin(a) * ry
            lit = (i + f * 2) % 7 == 0
            c.fillpoly([(x, y - 3), (x + 2.5, y - 1), (x + 2, y + 2), (x - 2, y + 2), (x - 2.5, y - 1)], F[4] if lit else (R[3] if i % 2 else R[2]))
            c.px(x, y - 2, F[6] if lit else R[4])
        outline(c, al(R[0], .8))
        out.append(c)
    return out

# ── 반격 화염 가시(48×24) — 오른쪽으로 돋는다. 기준점(4, 12) ──
def spike_cells():
    out = []
    for f in range(6):
        c = Cv(48, 24); u = f / 5; L = 40 * ez(min(1, (f + 1) / 2.5)) * (1 - max(0, u - .6) * 1.5)
        for j, (dy, k) in enumerate([(0, 1), (-6, .7), (6, .7)]):
            l = L * k
            c.fillpoly([(4, 12 + dy - 2), (4 + l, 12 + dy * 1.4), (4, 12 + dy + 2)], F[3] if f < 4 else R[3])
            c.line(4, 12 + dy, 4 + l * .9, 12 + dy * 1.35, F[5] if f < 3 else F[3])
        if f < 4: flame(c, 6, 12, 4, u, seed=81)
        out.append(c)
    return out

# ── 반룡 변신 날개 · 뿔(64×72, 발밑 기준 32,66) — 몸 뒤에 그린다. 0~5 생겨남 · 6~9 반복. 줄 0 검붉은 · 1 보라 잔상(연마 130) ──
def awake_cells():
    out = []
    for row in range(2):
        for f in range(10):
            c = Cv(64, 72); u = min(1, (f + 1) / 6); beat = math.sin(f * 1.3) * 2 if f >= 6 else 0
            col = (R[2], R[3], F[2]) if row == 0 else (al(V[2], .8), al(V[3], .8), al(V[4], .9))
            for side in (-1, 1):
                X = lambda d: 32 + side * d * u
                tipy = 4 - beat
                mem = [(32 + side * 4, 36), (X(9), 16 - beat * .4), (X(30), tipy), (X(27), 18), (X(22), 22), (X(18), 30), (X(12), 33), (X(7), 42)]
                c.fillpoly(mem, col[0])
                c.fillpoly([(32 + side * 4, 34), (X(9), 18 - beat * .4), (X(26), tipy + 4), (X(16), 26), (X(8), 36)], col[1])
                c.line(32 + side * 4, 36, X(9), 16 - beat * .4, col[2]); c.line(X(9), 16 - beat * .4, X(30), tipy, col[2])
                for d_, e_ in [(27, 18), (18, 30), (7, 42)]: c.line(X(9), 16 - beat * .4, X(d_), e_, col[1] if row else R[1])
            if row == 0 and f >= 3:   # 뿔 — 머리 높이(66 - 46)
                k = min(1, (f - 2) / 3)
                for side in (-1, 1):
                    c.line(32 + side * 3, 20, 32 + side * (5 + 4 * k), 20 - 7 * k, G[3]); c.px(32 + side * (5 + 4 * k), 20 - 7 * k, G[4])
            outline(c, al(R[0] if row == 0 else V[0], .7))
            out.append(c)
    return out

# ── 화염 기둥 · 용성 충돌(72×160, 바닥 기준 cy 152) — 0~2 내려꽂힘 · 3~5 굵은 기둥 · 6~7 흩어짐 ──
def pillar_cells():
    out = []
    for f in range(8):
        c = Cv(72, 160); u = f / 7
        top = 0 if f >= 3 else 152 - (f + 1) * 50
        w = [6, 9, 12, 18, 20, 16, 10, 5][f]
        for y in range(int(top), 152):
            t = (y - top) / max(1, 152 - top)
            ww = w * (.55 + .45 * t) + math.sin(y * .3 + f) * 1.5
            c.rect(36 - ww, y, ww * 2, 1, al(F[2] if f < 6 else R[3], .9))
            c.rect(36 - ww * .55, y, ww * 1.1, 1, F[4] if f < 6 else F[2])
            if f < 5: c.rect(36 - ww * .2, y, max(1, ww * .4), 1, F[6])
        if f >= 2: flame(c, 36, 144, 14 + min(3, f - 2) * 4, max(0, u - .2), seed=91 + f, up=3)
        out.append(c)
    return out

# ── 아이콘(24×24 × 10) — 용조격 · 계약 · 포효 · 급강하 · 용린 · 천공 지배 · 역린 · 용성 · 천공강습 · 아르카디온 ──
def icon_cells():
    def base():
        c = Cv(24, 24); c.rect(1, 1, 22, 22, R[1]); c.rect(2, 2, 20, 20, R[0])
        c.band(12, 12, 11, 11, 0, 1, al(R[2], .7), dens=lambda d: .8 - d * .6); return c
    out = []
    c = base()   # 0 용조격 — 세 줄 발톱
    for i in range(3): c.line(6 + i * 4, 18, 10 + i * 4, 5, F[4]); c.line(7 + i * 4, 18, 11 + i * 4, 5, F[2])
    out.append(c)
    c = base(); c.ring(12, 15, 9, 4, F[3]); c.fillpoly([(5, 9), (12, 5), (19, 9), (12, 12)], R[3]); c.px(14, 8, F[6]); c.line(12, 12, 12, 18, R[3]); out.append(c)   # 1 계약
    c = base(); c.band(7, 12, 4, 8, 0, 1, V[2]); c.ring(7, 12, 4, 8, F[2])   # 2 포효 — 포탈 · 불
    for i in range(6): c.line(10, 12, 21, 6 + i * 2.4, F[4] if i % 2 else F[2])
    out.append(c)
    c = base(); c.line(12, 3, 12, 15, F[4]); c.line(11, 3, 11, 14, F[2]); c.fillpoly([(7, 12), (12, 18), (17, 12)], F[4]); c.ring(12, 19, 8, 2.5, F[3]); out.append(c)   # 3 급강하
    c = base()   # 4 용린 — 비늘
    for (x, y) in [(8, 8), (16, 8), (12, 12), (8, 16), (16, 16)]: c.fillpoly([(x, y - 3), (x + 3, y), (x, y + 3), (x - 3, y)], R[3]); c.px(x, y - 1, F[5])
    out.append(c)
    c = base()   # 5 천공 지배 — 떨어지는 화염탄
    for (x, y) in [(6, 7), (12, 11), (18, 6)]:
        c.line(x - 2, y - 5, x, y, F[2]); c.disc(x, y, 2, 2, F[4]); c.px(x, y, F[6])
    c.ring(12, 19, 8, 2.5, F[2], gap=2); out.append(c)
    c = base(); c.disc(12, 12, 4, 5, R[3]); c.fillpoly([(12, 10), (3, 4), (6, 14)], R[2]); c.fillpoly([(12, 10), (21, 4), (18, 14)], R[2])   # 6 역린
    c.line(10, 8, 8, 3, G[4]); c.line(14, 8, 16, 3, G[4]); c.px(11, 11, F[6]); c.px(13, 11, F[6]); out.append(c)
    c = base(); c.disc(12, 16, 7, 4, F[2]); c.disc(12, 15, 4, 2.5, F[5]); c.line(12, 2, 12, 12, F[4]); c.line(6, 4, 10, 12, F[3]); c.line(18, 4, 14, 12, F[3]); out.append(c)   # 7 용성
    c = base()   # 8 천공강습 — 돌진 회전 베기
    c.ring(14, 12, 7, 7, F[4], 0, 4.5); c.ring(14, 12, 5, 5, F[2], 1, 5.5)
    for i in range(3): c.line(2, 9 + i * 3, 8, 9 + i * 3, F[3])
    out.append(c)
    c = base()   # 9 아르카디온 — 용의 대검
    c.line(5, 19, 19, 5, G[4]); c.line(6, 19, 20, 5, G[3]); c.line(4, 18, 18, 4, F[3]); c.line(4, 16, 8, 20, F[4]); c.px(19, 4, F[6]); out.append(c)
    return out

# ── 작은 입자(16×16 × 8칸, 줄 여섯) — 범위를 촘촘히 채우는 장식 ──
BIT_KINDS = ["emb", "spk", "smk", "shard", "wisp", "lick"]
def bit_cells():
    out = []
    for kind in BIT_KINDS:
        for f in range(8):
            c = Cv(16, 16); u = f / 7
            if kind == "emb":
                cs = [F[6], F[5], F[4], F[3], F[2], F[1], R[3], R[2]]
                r = 2.6 - u * 1.6
                c.disc(8, 8, r, r, cs[f]); c.px(8, 7, F[6] if f < 3 else cs[f])
                if f < 5: c.px(8, 10 + f // 2, al(F[1], .6))
            elif kind == "spk":
                arm = max(0, 4 - f)
                if f < 6: star(c, 8, 8, arm, F[4], F[2])
                else: c.px(8, 8, al(F[3], .6))
            elif kind == "smk":
                r = 3 + 4 * ez(u); c.band(8, 9, r, r * .85, 0, 1, al(S[2], .85), dens=.95 - u * .75); c.band(7, 7, r * .5, r * .45, 0, 1, al(S[3], .8), dens=.8 - u * .7)
            elif kind == "shard":
                a = f * TAU / 8; x0, y0 = 8 + math.cos(a) * 3, 8 + math.sin(a) * 3
                c.fillpoly([(x0, y0), (8 + math.cos(a + 2.2) * 3, 8 + math.sin(a + 2.2) * 3), (8 + math.cos(a + 4) * 3, 8 + math.sin(a + 4) * 3)], R[3])
                c.px(x0, y0, F[5])
            elif kind == "wisp":
                r = 2.4 - u * 1.4; c.disc(8, 8 - u * 3, r, r * 1.3, al(V[3], .9 - u * .5)); c.px(8, 7 - u * 3, V[4])
            else:   # lick — 위로 솟는 작은 불길
                h_ = 9 * math.sin(min(1, u * 1.3) * math.pi)
                for y in range(int(h_)):
                    t = y / max(1, h_); w = 2.6 * (1 - t)
                    c.rect(8 - w, 13 - y, max(1, w * 2), 1, F[4] if t < .4 else F[2] if t < .75 else R[3])
            out.append(c)
    return out

# ── 아르카디온 대검(96×28, 손잡이 기준 10,14) — 용뼈 칼날 · 붉은 날 빛. 0~2 빚어짐 · 3 다 됨 ──
def blade_cells():
    out = []
    for f in range(4):
        c = Cv(96, 28); u = min(1, (f + 1) / 4); L = 82 * u
        c.rect(2, 12, 10, 4, R[1]); c.rect(3, 13, 8, 2, G[2])                       # 손잡이
        c.fillpoly([(11, 6), (15, 14), (11, 22), (13, 14)], G[3])                     # 날개 모양 코등이
        c.fillpoly([(13, 8), (13 + L * .9, 10), (13 + L, 14), (13 + L * .9, 18), (13, 20)], G[3])   # 칼날
        c.fillpoly([(13, 10), (13 + L * .85, 12), (13 + L * .95, 14), (13, 14)], G[4])
        c.line(13, 20, 13 + L * .9, 18, F[3] if f == 3 else F[2]); c.line(13, 19, 13 + L * .88, 17, F[4] if f == 3 else R[3])   # 붉은 날
        for i in range(int(L / 10)): c.px(18 + i * 10, 15, R[3]); c.px(19 + i * 10, 15, R[2])   # 뼈 마디
        if f < 3:
            for i in range(10): c.px(13 + L + rnd(83, i, f) * 6 - 3, 14 + (rnd(85, i, f) - .5) * 12, F[5])
        outline(c, R[0])
        out.append(c)
    return out

# ── 가로 참격(128×80, 기준점 16,40 · 반지름 90) — 줄 0 1타 주황 · 1 2타 붉은 + 보라 테. 6칸 ──
def arc_cells():
    out = []
    for row in range(2):
        for f in range(6):
            c = Cv(128, 80); u = f / 5; sweep = ez(min(1, (f + 1) / 3)); fade = 0 if f < 3 else (f - 2) / 3
            th = 7 if row else 5
            for j in range(th):
                rr = 90 - j * 1.2
                cc = (F[6] if j < 2 else F[4] if j < 4 else F[2]) if row == 0 else (F[5] if j < 2 else R[4] if j < 4 else V[3] if j < 6 else V[2])
                n = 200
                for i in range(n):
                    a = -1.3 + 2.6 * sweep * i / n
                    taper = math.sin(i / n * math.pi)
                    if j > th * taper: continue
                    if fade and BAYER[i % 4, j % 4] < fade: continue
                    c.px(16 + math.cos(a) * rr, 40 + math.sin(a) * rr * .45, cc)
            for i in range(14):
                if f > 4: break
                a = -1.3 + 2.6 * sweep * rnd(87 + row, i, f); d = 70 + rnd(89, i, f) * 26
                c.px(16 + math.cos(a) * d, 40 + math.sin(a) * d * .45, F[5] if row == 0 else V[4])
            out.append(c)
    return out

def pack(name, cells, cols=None, man=None, cx=None, cy=None, loop=0, rows=1, **extra):
    w, h = cells[0].w, cells[0].h; cols = cols or len(cells) // rows; R_ = math.ceil(len(cells) / cols)
    im = np.zeros((R_ * h, cols * w, 4), np.uint8)
    for i, c in enumerate(cells): im[(i // cols) * h:(i // cols) * h + h, (i % cols) * w:(i % cols) * w + w] = c.a
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(im, "RGBA").save(os.path.join(OUT, name + ".webp"), lossless=True, quality=100, method=6)
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(cells) // rows, "cx": w // 2 if cx is None else cx, "cy": h // 2 if cy is None else cy, **({"loop": 1} if loop else {}), **({"rows": rows} if rows > 1 else {}), **extra}
    return im

def main():
    man = {}; sheets = {}
    sheets["wy_claw"] = pack("wy_claw", claw_cells(), None, man, cx=8, cy=32, r=80)
    sheets["wy_hit"] = pack("wy_hit", hit_cells(), None, man)
    sheets["wy_wyvern"] = pack("wy_wyvern", wyvern_cells(), 7, man, cx=36, cy=36, rows=2)
    sheets["wy_shade"] = pack("wy_shade", shade_cells(), None, man, loop=1)
    sheets["wy_ball"] = pack("wy_ball", ball_cells(), None, man, cx=12, cy=10, loop=1)
    sheets["wy_sigil"] = pack("wy_sigil", sigil_cells(), None, man)
    sheets["wy_portal"] = pack("wy_portal", portal_cells(), None, man, cx=18, cy=36)
    sheets["wy_puff"] = pack("wy_puff", puff_cells(), None, man, cy=18)
    sheets["wy_crack"] = pack("wy_crack", crack_cells(), 4, man, r=90)
    sheets["wy_drop"] = pack("wy_drop", drop_cells(), None, man, cx=20, cy=104)
    sheets["wy_scale"] = pack("wy_scale", scale_cells(), None, man, cx=20, cy=54, loop=1)
    sheets["wy_spike"] = pack("wy_spike", spike_cells(), None, man, cx=4, cy=12)
    sheets["wy_awake"] = pack("wy_awake", awake_cells(), 10, man, cx=32, cy=66, rows=2)
    sheets["wy_pillar"] = pack("wy_pillar", pillar_cells(), None, man, cx=36, cy=152)
    sheets["wy_icons"] = pack("wy_icons", icon_cells(), None, man, cx=0, cy=0)
    sheets["wy_bits"] = pack("wy_bits", bit_cells(), 8, man, rows=len(BIT_KINDS))
    sheets["wy_blade"] = pack("wy_blade", blade_cells(), None, man, cx=10, cy=14)
    sheets["wy_arc"] = pack("wy_arc", arc_cells(), 6, man, cx=16, cy=40, rows=2, r=90)
    json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        os.makedirs(sys.argv[2], exist_ok=True)
        for k, im in sheets.items():
            z = 4 if im.shape[1] < 300 else 2 if im.shape[1] < 900 else 1
            bg = np.zeros((im.shape[0], im.shape[1], 4), np.uint8); bg[..., :3] = (58, 74, 52); bg[..., 3] = 255
            a = im[..., 3:4].astype(float) / 255; bg[..., :3] = (im[..., :3] * a + bg[..., :3] * (1 - a)).astype(np.uint8)
            Image.fromarray(bg, "RGBA").resize((im.shape[1] * z, im.shape[0] * z), Image.NEAREST).save(os.path.join(sys.argv[2], k + ".png"))
    for k, v in man.items(): print(k, v, os.path.getsize(os.path.join(OUT, k + ".webp")))

main()
