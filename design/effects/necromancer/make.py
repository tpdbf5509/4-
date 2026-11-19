# 히든 직업 Necromancer 004(그림자 군주) 도트 시트 — 이 스크립트가 한 칸 한 칸 직접 그린다(11월 17일).
# Gambler 002 와 같은 방식: 외부 이펙트 라이브러리(pixelfx) 없이 Pillow · numpy 로 점 · 선 · 타원만 찍는다(도트형 RPG 느낌).
# 쓰는 법: python3 design/effects/necromancer/make.py  →  public/assets/game/rpg/effects/hidden-jobs/necromancer/px/*.webp + manifest.json(칸 규격)
#          python3 design/effects/necromancer/make.py preview <폴더>  →  확대한 확인 그림(PNG)도 함께
# 칸 규격은 src/game/necroPxData.js 에 손으로 옮긴다(manifest.json 과 같아야 한다 — tools/necro.test.mjs 가 본다).
# 그림자 병사 다섯(nc_knight · assassin · archer · caster · giant)은 오른쪽을 보고 게임이 뒤집는다. 한 줄 16칸 = 걷기 4 · 공격 4 · 솟아오름 4 · 흩어짐 4,
# 줄 셋 = 연마 합계 색(0 기본 · 75 진한 보라 눈과 중심 · 130 은색 테두리).
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "..", "public", "assets", "game", "rpg", "effects", "hidden-jobs", "necromancer", "px")
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


# 그림자 군주 팔레트(기획안 기본 #351B53 · 보조 #9271C4 · 최고 연마 #D4D1EA) — 검보라 10단 · 핏빛 4단 · 은색 3단. 흰색은 쓰지 않는다
N = [rgb(c) for c in ["#07050B", "#120C1A", "#1E1329", "#2B1A3D", "#351B53", "#4E2F78", "#6C4CA0", "#9271C4", "#B9A5DE", "#D4D1EA"]]
RD = [rgb(c) for c in ["#4A141C", "#8E2A34", "#C9505A", "#E8909A"]]
SV = [rgb(c) for c in ["#8F8AA8", "#BDB8D2", "#E6E3F2"]]
DEEPV = rgb("#8A3FD1"); DEEPV2 = rgb("#B98AF0")   # 연마 75 — 진한 보라 눈 · 중심

def thick(c, x0, y0, x1, y1, col, w=2):
    for k in range(w):
        c.line(x0 + (k if abs(y1 - y0) >= abs(x1 - x0) else 0), y0 + (0 if abs(y1 - y0) >= abs(x1 - x0) else k),
               x1 + (k if abs(y1 - y0) >= abs(x1 - x0) else 0), y1 + (0 if abs(y1 - y0) >= abs(x1 - x0) else k), col)

def finish(c, tint, eyes, core=None):
    """그림자 몸 마무리 자리만 적어 둔다 — 실제 빛 · 윤곽 · 번개는 여백을 붙인 뒤 glow() 가 그린다(11월 17일 사용자 참고 그림: 검은 몸 · 보라 윤곽 빛 · 번개 줄기)"""
    c.meta = (tint, eyes, core)

# 보라 빛 5단(어두운 빛 → 심지) · 푸른 기운 3단 — 사용자 참고 그림의 보라 번개 · 푸른 뒷빛
GV = [rgb(c) for c in ["#3B1F6E", "#6A3FD0", "#9C6BFF", "#C9A8FF", "#F1E6FF"]]
BL = [rgb(c) for c in ["#2E4F9E", "#5F8FE8", "#A9C8FF"]]
PAD, PADT = 3, 7                                   # 그림자 병사 칸 여백 — 바깥 빛 · 머리 위 연기 자리
DARK = {}
for i, col in enumerate(N): DARK[tuple(col[:3])] = [N[0], N[0], N[1], N[1], N[2], N[2], GV[1], GV[2], GV[3], GV[4]][i]

def jag(c, x, y, steps, dx, dy, col, tip, seed, m=None):
    """번개 줄기 — 한 칸씩 꺾이며 나아간다(m 이 있으면 몸 안에서만)"""
    for k in range(steps):
        x += dx + (1 if rnd(seed, k, 1) > 0.66 else -1 if rnd(seed, k, 1) < 0.33 else 0)
        y += dy + (1 if rnd(seed, k, 2) > 0.8 else 0)
        if m is not None and not (0 <= y < m.shape[0] and 0 <= x < m.shape[1] and m[int(y), int(x)]): break
        c.px(x, y, tip if k == steps - 1 else col)
    return x, y

def glow(c, seed):
    """검은 몸 · 안쪽 윤곽 보라 빛(연마 75 는 푸른 뒷빛 · 130 은 은빛) · 바깥 보라 번짐 · 몸 위 번개 줄기 · 빛나는 눈과 가슴 문양 · 머리 위 연기"""
    tint, eyes, core = c.meta
    a = c.a; m = a[..., 3] > 0; H, Wd = m.shape
    for y, x in zip(*np.nonzero(m)):                                         # 몸은 거의 검게
        k = tuple(a[y, x][:3])
        if k in DARK: a[y, x] = DARK[k]
    pad = np.pad(m, 1)
    up, dn, lf, rt = ~pad[:-2, 1:-1], ~pad[2:, 1:-1], ~pad[1:-1, :-2], ~pad[1:-1, 2:]
    edge = m & (up | dn | lf | rt)
    for y, x in zip(*np.nonzero(edge)):                                      # 안쪽 윤곽 — 위 · 오른쪽은 밝게, 왼쪽은 연마에 따라 푸른 뒷빛
        lit = up[y, x] or rt[y, x]
        col = GV[2] if lit else GV[1]
        if tint == 1 and lf[y, x] and not lit: col = BL[1]
        if tint == 2 and lit: col = SV[2] if (x + y) % 3 == 0 else GV[3]
        a[y, x] = col
    o1 = np.zeros_like(m); o1[1:] |= m[:-1]; o1[:-1] |= m[1:]; o1[:, 1:] |= m[:, :-1]; o1[:, :-1] |= m[:, 1:]; o1 &= ~m
    o2 = np.zeros_like(m); o2[1:] |= o1[:-1]; o2[:-1] |= o1[1:]; o2[:, 1:] |= o1[:, :-1]; o2[:, :-1] |= o1[:, 1:]; o2 &= ~m & ~o1
    for y, x in zip(*np.nonzero(o1)): c.px(x, y, al(GV[1], 0.75))            # 바깥 번짐 두 겹
    for y, x in zip(*np.nonzero(o2)):
        if BAYER[y % 4, x % 4] < 0.55: c.px(x, y, al(GV[0], 0.55))
    if core:                                                                  # 몸 위 번개 줄기 — 가슴에서 사방으로
        cx, cy = core
        for v in range(3 + tint):
            ang = rnd(seed, v, 3) * TAU
            dx = 1 if math.cos(ang) > 0.4 else -1 if math.cos(ang) < -0.4 else 0
            dy = 1 if math.sin(ang) > 0.2 else -1
            jag(c, cx, cy, 3 + int(rnd(seed, v, 4) * 6), dx, dy, GV[3] if v % 2 else GV[2], GV[4], seed * 7 + v, m)
        c.px(cx, cy - 1, GV[3]); c.px(cx, cy + 1, GV[3]); c.px(cx - 1, cy, GV[3]); c.px(cx + 1, cy, GV[3]); c.px(cx, cy, GV[4])   # 가슴 문양
        if tint >= 1: c.px(cx, cy - 2, GV[3]); c.px(cx, cy + 2, GV[2])
    for i, (x, y) in enumerate(eyes):                                         # 빛나는 눈
        c.px(x, y, GV[4]); c.px(x, y - 1, al(GV[2], 0.8))
        if i == len(eyes) - 1: c.px(x + 1, y, al(GV[3], 0.9)); c.px(x + 2, y, al(GV[2], 0.6))
    top = np.nonzero(m.any(axis=1))[0]
    if len(top):                                                              # 머리 위 · 어깨에서 오르는 보라 연기
        t0 = top[0]; cols = np.nonzero(m[t0 + 2] if t0 + 2 < H else m[t0])[0]
        xs = np.nonzero(m.any(axis=0))[0]
        for i in range(7):
            x = xs[0] + rnd(seed, i, 5) * (xs[-1] - xs[0]); y = t0 + 2 + rnd(seed, i, 6) * 8
            for j in range(2 + int(rnd(seed, i, 7) * 4)):
                yy = y - j * 1.5; xx = x + math.sin(j * 0.9 + seed + i) * 1.2
                if 0 <= int(yy) < H and 0 <= int(xx) < Wd and not m[int(yy), int(xx)]: c.px(xx, yy, al(GV[1] if j < 2 else GV[0], 0.75 - j * 0.12))

def padded(c):
    o = Cv(c.w + PAD * 2, c.h + PAD + PADT); o.a[PADT:PADT + c.h, PAD:PAD + c.w] = c.a
    t, e, k = c.meta
    o.meta = (t, [(x + PAD, y + PADT) for x, y in e], (k[0] + PAD, k[1] + PADT) if k else None)
    return o

def smoke(c, cx, fy, w, ph):
    # 발밑 연기 — 그림자가 땅에서 완전히 떨어지지 않게 성긴 띠
    for i in range(-w, w + 1):
        h = 1 + int(2 * rnd(7, i + ph * 3))
        for j in range(h):
            if (i + j + ph) % 2 == 0: c.px(cx + i, fy - j, N[3] if j else N[2])

WALK = [-2, 0, 2, 0]

# ── 그림자 병사 다섯 — 오른쪽을 본다(게임이 뒤집는다). pose: ("walk", p) · ("atk", a) ──
def knight(c, pose, tint):
    kind, p = pose; cx, fy = 15, 37
    sw = WALK[p] if kind == "walk" else [0, -1, 2, 2][p]
    thick(c, cx - 1, 28, cx - 1 + sw, fy, N[1]); thick(c, cx + 2, 28, cx + 2 - sw, fy, N[2])
    c.fillpoly([(cx - 4, 17), (cx - 9, 31 + (p % 2)), (cx - 2, 29)], N[1])                       # 망토
    c.fillpoly([(cx - 4, 16), (cx + 5, 16), (cx + 4, 28), (cx - 3, 28)], N[2])                   # 몸통
    c.fillpoly([(cx - 3, 17), (cx + 4, 17), (cx + 3, 22), (cx - 2, 22)], N[3])
    c.disc(cx + 1, 11, 4.2, 4.6, N[2]); c.rect(cx - 2, 8, 6, 2, N[3])                             # 투구
    c.line(cx + 1, 6, cx - 4, 4, N[3]); c.line(cx, 6, cx - 5, 5, N[2])                             # 뿔 장식
    c.rect(cx + 2, 11, 4, 1, N[0])                                                                 # 눈구멍
    if kind == "atk":                                                                              # 검 — 뒤에서 위로 올렸다 앞으로 벤다
        ang = [-2.2, -1.3, 0.15, 0.6][p]; hx, hy = cx + 5, 19
        ex, ey = hx + math.cos(ang) * 14, hy + math.sin(ang) * 14
        thick(c, hx, hy, ex, ey, N[4]); c.line(hx, hy, ex, ey, N[6])
        c.rect(cx + 3, 18, 3, 3, N[2])
        if p == 2:
            for k in range(9):
                a2 = -1.4 + k * 0.18; c.px(hx + math.cos(a2) * 15, hy + math.sin(a2) * 15, N[7] if k % 2 else N[5])
    else:
        thick(c, cx - 5, 22, cx - 8, 9, N[4]); c.line(cx - 6, 22, cx - 9, 9, N[6]); c.rect(cx - 7, 21, 4, 1, N[3])   # 등 뒤 검
        c.fillpoly([(cx + 4, 17), (cx + 9, 18), (cx + 9, 27), (cx + 5, 29)], N[3])                  # 방패
        c.line(cx + 9, 18, cx + 9, 27, N[5]); c.px(cx + 7, 22, N[6])
    smoke(c, cx + 1, fy + 1, 6, p)
    finish(c, tint, [(cx + 3, 11), (cx + 5, 11)], (cx, 20))

def assassin(c, pose, tint):
    kind, p = pose; cx, fy = 13, 31
    sw = WALK[p] if kind == "walk" else [0, 2, 4, 3][p]; lean = 0 if kind == "walk" else [0, 2, 4, 2][p]
    thick(c, cx - 2, 23, cx - 4 + sw, fy, N[1]); thick(c, cx + 1, 23, cx + 3 - sw, fy, N[2])
    for k in range(8):                                                                              # 목도리 — 뒤로 날린다
        c.px(cx - 4 - k, 14 + k // 2 + int(math.sin(k * 0.9 + p * 1.6) * 1.5), N[2] if k % 3 else N[3])
    c.fillpoly([(cx - 3 + lean, 13), (cx + 4 + lean, 14), (cx + 3, 24), (cx - 3, 24)], N[2])
    c.fillpoly([(cx - 1 + lean, 4), (cx + 5 + lean, 9), (cx + 4 + lean, 14), (cx - 3 + lean, 14), (cx - 3 + lean, 8)], N[2])   # 두건
    c.fillpoly([(cx + lean, 8), (cx + 4 + lean, 10), (cx + 3 + lean, 13), (cx - 1 + lean, 13)], N[1])
    if kind == "atk":
        L = [3, 7, 11, 6][p]; c.line(cx + 4 + lean, 18, cx + 4 + lean + L, 17 - p % 2, N[6]); c.line(cx + 4 + lean, 19, cx + 3 + lean + L, 18, N[4])
        if p == 2:
            for k in range(5): c.px(cx + 8 + lean + k * 2, 15 + (k % 2), N[7])
    else:
        c.line(cx + 4, 18, cx + 7, 22, N[6]); c.line(cx + 5, 18, cx + 8, 22, N[4])                 # 거꾸로 쥔 단검 둘
        c.line(cx - 3, 18, cx - 6, 22, N[5])
    smoke(c, cx, fy + 1, 5, p)
    finish(c, tint, [(cx + 2 + lean, 10), (cx + 4 + lean, 11)], (cx, 18))

def archer(c, pose, tint):
    kind, p = pose; cx, fy = 14, 37
    sw = WALK[p] if kind == "walk" else 0
    thick(c, cx - 1, 27, cx - 1 + sw, fy, N[1]); thick(c, cx + 2, 27, cx + 2 - sw, fy, N[2])
    c.rect(cx - 6, 14, 3, 12, N[3]); c.line(cx - 6, 13, cx - 7, 10, N[5]); c.line(cx - 4, 13, cx - 4, 10, N[5])   # 화살통
    c.fillpoly([(cx - 3, 15), (cx + 4, 15), (cx + 4, 28), (cx - 3, 28)], N[2])
    c.fillpoly([(cx - 3, 6), (cx + 4, 7), (cx + 5, 13), (cx - 3, 14)], N[2]); c.fillpoly([(cx - 3, 6), (cx, 3), (cx + 2, 6)], N[2])   # 두건
    pull = [0, 3, 6, 1][p] if kind == "atk" else 0
    bx = cx + 9; c.ring(bx - 4, 20, 5, 10, N[5], -1.25, 1.25); c.ring(bx - 4, 20, 4, 10, N[3], -1.2, 1.2)        # 활
    sx = bx - 3 - pull
    c.line(bx - 2, 10, sx, 20, N[6]); c.line(sx, 20, bx - 2, 30, N[6])                              # 시위
    thick(c, cx + 3, 19, sx, 20, N[2])
    if kind == "atk" and p in (1, 2): c.line(sx, 20, bx + 4, 20, N[7]); c.px(bx + 5, 20, N[9] if tint == 2 else N[8])
    if kind == "atk" and p == 3:
        for k in range(4): c.px(bx + 2 + k * 3, 20, N[7])
    smoke(c, cx + 1, fy + 1, 6, p)
    finish(c, tint, [(cx + 2, 10), (cx + 4, 10)], (cx, 20))

def caster(c, pose, tint):
    kind, p = pose; cx, fy = 14, 39
    sway = [0, 1, 0, -1][p] if kind == "walk" else 0
    c.fillpoly([(cx - 4, 16), (cx + 4, 16), (cx + 8 + sway, fy), (cx - 7 + sway, fy)], N[2])        # 겉옷
    c.fillpoly([(cx - 3, 18), (cx + 3, 18), (cx + 5, 30), (cx - 4, 30)], N[3])
    for k in range(-6, 8, 3): c.px(cx + k + sway, fy, N[1])
    c.fillpoly([(cx - 4, 7), (cx, 2), (cx + 5, 7), (cx + 5, 15), (cx - 4, 16)], N[2]); c.fillpoly([(cx - 1, 9), (cx + 4, 9), (cx + 4, 14), (cx - 1, 14)], N[1])
    lift = [0, -3, -5, -2][p] if kind == "atk" else 0; fwd = [0, 1, 3, 2][p] if kind == "atk" else 0
    sx = cx + 8 + fwd
    thick(c, sx, 9 + lift, sx - 1, fy, N[3]); c.line(sx + 1, 9 + lift, sx, fy, N[5])               # 지팡이
    thick(c, cx + 3, 20, sx, 20 + lift // 2, N[2])
    oy = 6 + lift
    c.disc(sx + .5, oy + .5, 2.6, 2.6, N[5]); c.disc(sx + .5, oy + .5, 1.6, 1.6, N[7]); c.px(sx, oy, N[9] if (kind == "atk" and p >= 1) else N[8])
    if kind == "atk" and p == 2:
        for k in range(6): a2 = k * TAU / 6; c.px(sx + math.cos(a2) * 5, oy + math.sin(a2) * 5, N[7] if k % 2 else N[6])
    finish(c, tint, [(cx + 1, 11), (cx + 3, 11)], (cx, 22))

def giant(c, pose, tint):
    kind, p = pose; cx, fy = 21, 47
    sw = WALK[p] if kind == "walk" else 0
    thick(c, cx - 5, 36, cx - 6 + sw, fy, N[1], 4); thick(c, cx + 3, 36, cx + 4 - sw, fy, N[2], 4)
    c.disc(cx, 30, 12, 11, N[2]); c.disc(cx + 1, 26, 9, 7, N[3])                                    # 등 굽은 몸
    c.disc(cx - 3, 22, 7, 5, N[2])                                                                  # 혹 같은 어깨
    c.disc(cx + 8, 19, 4.6, 4.2, N[2]); c.rect(cx + 6, 15, 6, 2, N[3])                              # 작은 머리
    c.line(cx + 6, 16, cx + 4, 12, N[3]); c.line(cx + 11, 16, cx + 13, 12, N[3])                    # 뿔
    ang = [0.9, -1.9, -1.2, 0.85][p] if kind == "atk" else 0.95 + [0, 0.06, 0, -0.06][p]
    hx, hy = cx + 9, 28
    ex, ey = hx + math.cos(ang) * 15, hy + math.sin(ang) * 15
    thick(c, cx + 5, 25, hx, hy, N[2], 3)
    thick(c, hx, hy, ex, ey, N[3], 3); c.disc(ex, ey, 4, 4, N[4]); c.px(ex + 1, ey - 2, N[6])        # 몽둥이
    if kind == "atk" and p == 3:
        for k in range(7): c.px(ex - 6 + k * 2, fy, N[7] if k % 2 else N[5]); c.px(ex - 7 + k * 2, fy - 1 - (k % 3), N[5])
    thick(c, cx - 8, 26, cx - 11, 37, N[1], 3)
    smoke(c, cx, fy + 1, 10, p)
    finish(c, tint, [(cx + 9, 19), (cx + 11, 19)], (cx + 1, 27))

SOLDIER = {"knight": (knight, 32, 40, 15, 38), "assassin": (assassin, 28, 34, 13, 32), "archer": (archer, 30, 40, 14, 38),
           "caster": (caster, 30, 42, 14, 40), "giant": (giant, 44, 50, 21, 48)}

def rise_frame(base, k, cx, fy):
    """0~3 — 발밑 웅덩이에서 발부터 올라온다(아래에서 위로 드러남) · 웅덩이 둘레 보라 고리"""
    c = Cv(base.w, base.h)
    show = int(base.h * (k + 1) / 4.6)
    c.a[base.h - show:, :] = base.a[base.h - show:, :]
    rx = 7 + k * 2 + base.w // 8
    c.band(cx, fy, rx, rx * .35, 0, 1, N[1], dens=.85)
    c.ring(cx, fy, rx, rx * .35, GV[2] if k % 2 == 0 else GV[1], 0, TAU, 2)
    for i in range(3):
        x = cx - rx + 2 + i * rx * .9; h = 3 + int(rnd(k, i) * 5) + k
        c.line(x, fy - 1, x + (1 if i % 2 else -1), fy - h, GV[2]); c.px(x + (1 if i % 2 else -1), fy - h - 1, GV[4])
    return c

def fade_frame(base, k):
    """0~3 — 흩어진다(체크 무늬로 비우며 위로 떠오르고 옅은 보라 연기로)"""
    c = Cv(base.w, base.h); up = k * 2
    yy, xx = np.mgrid[0:base.h, 0:base.w]
    keep = (base.a[..., 3] > 0) & (BAYER[yy % 4, xx % 4] >= (k + 1) / 4.6)
    for y, x in zip(*np.nonzero(keep)):
        if y - up >= 0:
            col = base.a[y, x].copy()
            if k >= 2: col = np.array(N[4] if (x + y) % 2 else N[5])
            c.a[y - up, x] = col
    for i in range(4 + k * 2):
        c.px(base.w * rnd(k, i, 1), base.h * (0.2 + 0.6 * rnd(k, i, 2)) - up * 2, N[6] if i % 2 else N[7])
    return c

def soldier_cells(kind):
    fn, w, h, cx, fy = SOLDIER[kind]; cells = []
    for tint in range(3):
        row = []
        for p in range(4): c = Cv(w, h); fn(c, ("walk", p), tint); c = padded(c); glow(c, p + tint * 11 + 1); row.append(c)
        for p in range(4): c = Cv(w, h); fn(c, ("atk", p), tint); c = padded(c); glow(c, p + tint * 11 + 5); row.append(c)
        for k in range(4): row.append(rise_frame(row[0], k, cx + PAD, fy + PADT))
        for k in range(4): row.append(fade_frame(row[0], k))
        cells += row
    return cells, (w + PAD * 2, h + PAD + PADT, cx + PAD, fy + PADT)

# ── 주술형 구체(14×14, 돌며 반복) · 작은 타격(검은 사각 다섯) ──
def orb_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(14, 14); a = i / n * TAU
        c.disc(7, 7, 5.2, 5.2, GV[1]); c.disc(7, 7, 4.2, 4.2, N[1]); c.disc(6.5, 6.5, 2.2, 2.2, N[0])
        c.ring(7, 7, 4.8, 4.8, GV[3], a, a + 2.2); c.px(7 + math.cos(a + 1.1) * 4.5, 7 + math.sin(a + 1.1) * 4.5, GV[4])
        c.px(7 + math.cos(a + 3.8) * 5.5, 7 + math.sin(a + 3.8) * 5.5, GV[2]); c.px(5, 5, GV[3])
        out.append(c)
    return out

def hit_cells(n=6, size=40, seed=5):
    """타격 — 가운데 섬광 · 사방으로 꺾여 뻗는 보라 번개 · 검은 조각(11월 17일 사용자: 이펙트 더 많이)"""
    out = []
    for i in range(n):
        c = Cv(size, size); u = (i + 1) / n; m = size // 2
        if i < 3: c.disc(m, m, 5 - i * 1.5, 5 - i * 1.5, GV[3 - i]); c.disc(m, m, 2.5 - i, 2.5 - i, GV[4])
        if i < 2: c.ring(m, m, 6 + i * 6, 6 + i * 6, GV[2] if i == 0 else GV[1], 0, TAU, 0 if i == 0 else 2)
        if i < 4:
            for j in range(6):
                ang = j / 6 * TAU + rnd(seed, j) * 0.6
                dx = 1 if math.cos(ang) > 0.38 else -1 if math.cos(ang) < -0.38 else 0
                dy = 1 if math.sin(ang) > 0.38 else -1 if math.sin(ang) < -0.38 else 0
                st = 4 + i * 3 + int(rnd(seed, j, i) * 4)
                x, y = m + dx * 2, m + dy * 2
                for k in range(st):
                    x += dx + (1 if rnd(seed + i, j, k) > 0.7 else -1 if rnd(seed + i, j, k) < 0.3 else 0) * (dy != 0)
                    y += dy + (1 if rnd(seed + i, j, k + 9) > 0.7 else -1 if rnd(seed + i, j, k + 9) < 0.3 else 0) * (dx != 0)
                    if k >= i * 2: c.px(x, y, GV[4] if k == st - 1 else GV[3] if i < 2 else GV[2])
        for j in range(6):
            ang = j / 6 * TAU + rnd(seed, j) * 0.8; d = 4 + ez(u) * 15
            x, y = m + math.cos(ang) * d, m + math.sin(ang) * d - u * 3
            sz = 3 if u < .5 else 2 if u < .85 else 1
            c.rect(x - sz // 2, y - sz // 2, sz, sz, N[0])
            if sz >= 2: c.px(x + sz // 2, y - sz // 2, GV[2])
        out.append(c)
    return out

# ── 추출 가능 흔적 — 땅의 작은 검은 원(반복) ──
def trace_cells(n=4):
    out = []
    for i in range(n):
        c = Cv(26, 14); k = .85 + .15 * math.sin(i / n * TAU)
        c.band(13, 7, 11 * k, 5 * k, 0, 1, N[0], dens=.7); c.band(13, 7, 7 * k, 3.2 * k, 0, 1, N[1], dens=1)
        c.ring(13, 7, 11 * k, 5 * k, N[6], 0, TAU, 2)
        c.px(13 + math.cos(i / n * TAU) * 9, 7 + math.sin(i / n * TAU) * 4, N[8])
        out.append(c)
    return out

# ── 흔적 추출(40×72) — 0~2 원 · 3~6 그림자 줄기가 솟음 · 7~9 가늘어지며 꺼짐. 발밑(20, 66) 기준 ──
def extract_cells():
    out = []
    for i in range(10):
        c = Cv(40, 72); cx, fy = 20, 66
        r = min(1, (i + 1) / 3)
        c.band(cx, fy, 14 * r, 5.5 * r, 0, 1, N[0], dens=.9); c.ring(cx, fy, 14 * r, 5.5 * r, N[6], 0, TAU, 0 if i < 3 else 2)
        if i >= 3:
            hgt = [14, 32, 50, 58, 58, 52, 40][i - 3]; wid = [4, 5, 6, 6, 4, 3, 2][i - 3]
            for y in range(int(hgt)):
                yy = fy - 2 - y; sway = math.sin(y * 0.25 + i) * 2 * (y / 58)
                w2 = max(1, wid * (1 - y / (hgt + 8)))
                c.rect(cx - w2 + sway, yy, w2 * 2, 1, N[1])
                c.px(cx + w2 + sway, yy, N[6] if y % 3 else N[7]); c.px(cx - w2 - 1 + sway, yy, N[3])
            c.disc(cx + math.sin(hgt * .25 + i) * 2, fy - 2 - hgt, 2.5, 2.5, N[7]); c.px(cx, fy - 3 - hgt, N[9])
        out.append(c)
    return out

def wisp_cells(n=4):
    out = []
    for i in range(n):
        c = Cv(10, 10); c.disc(5, 5, 3.2, 3.2, N[5]); c.disc(5, 5, 2, 2, N[7]); c.px(4 + (i % 2), 4, N[9])
        c.px(5 - (i % 3), 8 + (i % 2), N[6]); out.append(c)
    return out

def absorb_cells(n=5):
    out = []
    for i in range(n):
        c = Cv(48, 24); r = 20 * (1 - i / n) + 3
        c.ring(24, 12, r, r * .42, N[7] if i % 2 else N[6], 0, TAU, 0 if i < 3 else 2); c.band(24, 12, r * .6, r * .25, 0, 1, N[1], dens=.6)
        out.append(c)
    return out

# ── 그림자 소집 — 발밑 그림자 다섯이 여러 쪽으로 늘어난다(120×60) ──
def stretch_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(120, 60); u = ez((i + 1) / n)
        c.band(60, 30, 14, 6, 0, 1, N[0], dens=.9)
        for j in range(5):
            a = j / 5 * TAU + .6; L = 52 * u
            for k in range(int(L)):
                x = 60 + math.cos(a) * k; y = 30 + math.sin(a) * k * .45; w = max(1, 4 * (1 - k / 56))
                c.rect(x - w / 2, y, w, 1, N[1]);
                if k % 4 == 0: c.px(x + w / 2, y, N[5])
            c.px(60 + math.cos(a) * L, 30 + math.sin(a) * L * .45, N[7])
        out.append(c)
    return out

# ── 그림자 공격 연출 — 베기(36×30) · 사수 화살(14×6) · 주술 터짐(r35) · 거수 내려찍기(r48) ──
def slash_cells(n=5):
    out = []
    for i in range(n):
        c = Cv(36, 30); u = i / (n - 1)
        a0, a1 = -1.9 + u * .6, .4 + u * .6
        for k in range(4):
            col = [GV[4] if i < 2 else GV[3], GV[3], GV[2], GV[1]][k]
            c.ring(14, 18, 15 - k, 11 - k * .7, col, a0 + k * .12, a1 - k * .08)
        if i <= 2:
            ex, ey = 14 + math.cos(a1) * 15, 18 + math.sin(a1) * 11
            jag(c, ex, ey, 4, 1, 0, GV[3], GV[4], 31 + i)
        if i >= 3: c.a[..., 3][BAYER[np.mgrid[0:30, 0:36][0] % 4, np.mgrid[0:30, 0:36][1] % 4] < (i - 2) / 3] = 0
        out.append(c)
    return out

def bolt_cells():
    out = []
    for i in range(2):
        c = Cv(16, 6); c.line(1, 3, 12, 3, N[1]); c.line(2, 2, 11, 2, N[5] if i else N[4]); c.px(13, 3, N[8]); c.px(12, 2, N[7]); c.px(12, 4, N[7])
        c.px(0, 2 + i, N[6]); out.append(c)
    return out

def burst_cells(R, n, seed, cy_extra=0, red=False, big=False):
    w, h = int(R * 2 + 16), int(R * 2 * SQ + 16 + cy_extra); cx, cy = w // 2, h - int(R * SQ) - 8
    out = []
    for i in range(n):
        c = Cv(w, h); u = (i + 1) / n
        r = R * ez(min(1, u * 1.6))
        dens = max(0, 1 - u * 1.1)
        c.band(cx, cy, r, r * SQ, 0, 1, N[0], dens=lambda d: (1 - d) * dens * 1.3)
        c.ring(cx, cy, r, r * SQ, GV[3] if i < n * .5 else GV[1], 0, TAU, 0 if i < n * .6 else 2)
        if i < n * .5: c.ring(cx, cy, r + 1, (r + 1) * SQ, al(GV[1], .7))
        if big and i > 1: c.ring(cx, cy, r * .65, r * .65 * SQ, SV[1] if i % 2 else N[8], 0, TAU, 3)
        core = R * .55 * (1 - u)
        if core > 1.5:
            c.disc(cx, cy - R * .3 * (1 - u), core, core * .9, RD[1] if red else GV[1])
            c.disc(cx, cy - R * .3 * (1 - u), core * .55, core * .5, RD[2] if red else GV[3])
            c.disc(cx, cy - R * .3 * (1 - u), core * .25, core * .22, RD[3] if red else GV[4])
        if i < n * .6:                                                                      # 밖으로 뻗는 보라 번개
            for j in range(6):
                ang = j / 6 * TAU + rnd(seed, j, 11)
                dx = 1 if math.cos(ang) > .38 else -1 if math.cos(ang) < -.38 else 0
                dy = 1 if math.sin(ang) > .38 else -1 if math.sin(ang) < -.38 else 0
                jag(c, cx + math.cos(ang) * r * .3, cy + math.sin(ang) * r * .3 * SQ, int(r * .5), dx, dy, GV[3], GV[4], seed * 13 + j + i)
        for j in range(int(R / 4)):
            a = rnd(seed, j) * TAU; d = r * (.5 + .55 * rnd(seed, j, 3)); s = 2 if rnd(seed, j, 4) > .5 else 1
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * SQ - u * R * .35 * rnd(seed, j, 5)
            if u < .95: c.rect(x, y, s, s, N[0] if j % 3 else (RD[2] if red else GV[3]))
        out.append(c)
    return out, (w, h, cx, cy)

# ── 그림자 교환 — 검은 세로선 셋이 솟는다(20×60, 발밑 (10, 56)) ──
def swap_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(20, 60); u = i / (n - 1)
        c.ring(10, 56, 8, 3, N[6], 0, TAU)
        for j, x in enumerate((5, 10, 15)):
            hgt = (44 - j * 6) * (ez(min(1, u * 2.2)) if u < .7 else (1 - (u - .7) / .3 * .9)); top = 55 - hgt
            if hgt < 1: continue
            c.line(x, 55, x, top, N[0]); c.line(x + 1, 55, x + 1, top + 3, N[2]); c.px(x, top, N[8]); c.px(x, top + 1, N[6])
        out.append(c)
    return out

# ── 군주의 영역 — 땅의 어두운 원(r160, 게임이 2배로 r320). 0~3 퍼짐 · 4~7 유지(문양 고리가 돈다) ──
DOMAIN_FILL = 0.55          # 군주의 영역 바닥 채움 진하기(0 투명 ~ 1 꽉 참)
DOMAIN_SOFT = 0.72          # 영역 채움이 이 비율부터 가장자리까지 점점 흩어진다(11월 20일 사용자 "원 끝을 자연스럽게")
def domain_cells(R=160):
    w, h = R * 2 + 16, int(R * 2 * SQ) + 16; cx, cy = w // 2, h // 2
    out = []
    for i in range(8):
        c = Cv(w, h)
        r = R * (ez((i + 1) / 4) if i < 4 else 1)
        # 11월 20일 사용자 "장판 밀도가 부족해" — 바닥 전체를 반투명 검정으로 먼저 채운다.
        # 같은 날 "원 끝을 딱 자르지 말고 자연스럽게" — 채움은 DOMAIN_SOFT 부터 점점 성기게 흩어져 사라지고, 또렷한 테두리 고리는 뺐다(끝은 necroArt 의 그림자 불꽃이 덮는다)
        c.disc(cx, cy, r * DOMAIN_SOFT, r * DOMAIN_SOFT * SQ, al(N[0], DOMAIN_FILL))
        c.band(cx, cy, r, r * SQ, DOMAIN_SOFT, 1, al(N[0], DOMAIN_FILL), dens=lambda d: np.clip(1 - (d - DOMAIN_SOFT) / (1 - DOMAIN_SOFT), 0, 1) ** 1.5)
        c.band(cx, cy, r, r * SQ, .5, 1, N[1], dens=lambda d: np.where(d < .8, .5 + .4 * (d - .5) / .3, .9 * np.clip(1 - (d - .8) / .2, 0, 1) ** 1.5))  # 가장자리 앞에서 가장 짙고 끝으로 흩어진다
        c.band(cx, cy, r, r * SQ, 0, .5, N[1], dens=.45)
        c.band(cx, cy, r, r * SQ, .78, .95, GV[0], dens=lambda d: .3 * np.clip(1 - np.abs(d - .86) / .09, 0, 1))
        if i >= 2:
            rot = (i - 4) * TAU / 32 if i >= 4 else 0
            rr = r * .8
            c.ring(cx, cy, rr, rr * SQ, GV[1], 0, TAU, 3)
            for k in range(12):                                                              # 고리 위 문양 열둘
                ang = rot + k * TAU / 12; x, y = cx + math.cos(ang) * rr, cy + math.sin(ang) * rr * SQ
                c.rect(x - 1, y - 1, 3, 3, N[0]); c.px(x, y - 1, GV[4] if k % 3 == 0 else GV[3]); c.px(x, y + 1, GV[1])
            for k in range(7):                                                               # 땅을 가르는 번개 금 — 가장자리에서 가운데로(칸마다 깜빡인다)
                ang = rot * 2 + k * TAU / 7 + .26 + rnd(i, k) * .2
                x, y = cx + math.cos(ang) * r * .95, cy + math.sin(ang) * r * .95 * SQ
                L = int(r * (.35 + .25 * rnd(k, i, 3)))
                for t in range(L):
                    fwd = t / max(1, L)
                    x += -math.cos(ang) * 1.0 + (rnd(k, t, i) - .5) * 1.6
                    y += (-math.sin(ang) * 1.0 + (rnd(k, t, i + 5) - .5) * 1.6) * SQ
                    if (i + k) % 3 == 0 or fwd < .7: c.px(x, y, GV[3] if (t + i) % 5 else GV[4])
            for k in range(14):                                                              # 바닥에 깔린 보라 빛 알갱이
                ang = rnd(k, i, 8) * TAU; d = rnd(k, i, 9) * r * .9
                c.px(cx + math.cos(ang) * d, cy + math.sin(ang) * d * SQ, GV[2] if k % 2 else GV[3])
        out.append(c)
    return out, (w, h, cx, cy)

# ── 일제 진군 표적(28×28, 반복) ──
def mark_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(28, 28); k = 1 + (i % 3) * .08; r = 10 * k
        c.ring(14, 14, r, r, N[0], 0, TAU); c.ring(14, 14, r - 1, r - 1, N[6], 0, TAU, 2)
        for a in range(4):
            ang = a * TAU / 4 + i / n * TAU / 4; x, y = 14 + math.cos(ang) * (r + 3), 14 + math.sin(ang) * (r + 3)
            c.rect(x - 1, y - 1, 3, 3, N[0]); c.px(x, y, N[8])
        c.rect(13, 13, 2, 2, N[7]); out.append(c)
    return out

# ── 영혼 소각 균열(그림자 몸 위에 겹친다, 30×40, 발밑 (15, 38)) ──
def crack_cells(n=4):
    out = []
    for i in range(n):
        c = Cv(30, 40); x, y = 15, 22
        for j in range(3 + i * 2):
            a = rnd(9, j) * TAU; L = 4 + i * 2 + rnd(9, j, 1) * 4
            x1, y1 = x + math.cos(a) * L, y + math.sin(a) * L * 1.2
            c.line(x, y, x1, y1, RD[1 + (j % 2)]); c.px(x1, y1, RD[3])
        c.disc(x, y, 1.5 + i * .4, 1.5 + i * .4, RD[2]); out.append(c)
    return out

# ── 무명의 군세 — 뒤의 문양(96×72) · 파동 앞머리(72×84) · 가시(12×46) ──
def sigil_cells(n=8):
    out = []
    for i in range(n):
        c = Cv(96, 72); cx, cy = 48, 36; u = min(1, (i + 1) / 6)
        c.band(cx, cy, 34 * u, 30 * u, 0, 1, N[0], dens=.55)
        c.ring(cx, cy, 34 * u, 30 * u, N[6]); c.ring(cx, cy, 31 * u, 27 * u, N[3])
        if u > .4:
            c.ring(cx, cy, 22 * u, 19 * u, N[5], 0, TAU, 2)
            for k in range(8):
                a = k * TAU / 8 + (i - 6) * .08 * (i >= 6)
                c.line(cx + math.cos(a) * 22 * u, cy + math.sin(a) * 19 * u, cx + math.cos(a) * 31 * u, cy + math.sin(a) * 27 * u, N[4])
                c.px(cx + math.cos(a) * 34 * u, cy + math.sin(a) * 30 * u, N[8] if k % 2 else N[7])
            c.fillpoly([(cx, cy - 12 * u), (cx + 9 * u, cy + 7 * u), (cx - 9 * u, cy + 7 * u)], N[1])   # 가운데 세모 문양
            c.poly([(cx, cy - 12 * u), (cx + 9 * u, cy + 7 * u), (cx - 9 * u, cy + 7 * u)], N[7] if i >= 6 and i % 2 else N[6])
            c.disc(cx, cy, 2.2, 2.2, N[8] if i >= 6 else N[6])
        out.append(c)
    return out

def wave_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(72, 84); fy = 80
        for x in range(72):
            hgt = 30 + 26 * math.sin(x * .09 + i * .9) * math.sin(x * .03) + (x / 72) * 20
            for y in range(int(hgt)):
                d = y / hgt
                edge = min(1, x / 14, (71 - x) / 14)                                              # 좌우 끝은 옅게 — 네모난 덩어리로 보이지 않게
                if BAYER[(fy - y) % 4, x % 4] < ((1 - d) * 1.1 - (1 - x / 72) * .5) * edge: c.px(x, fy - y, N[1] if d < .6 else N[3])
            if x % 2 == 0: c.px(x, fy - hgt, N[6] if x % 6 else N[8])
        for k in range(4):                                                                     # 군세 실루엣(창 끝)
            x = 18 + k * 14 + (i * 3) % 7; c.line(x, fy - 52 + (k % 2) * 6, x, fy - 30, N[0]); c.px(x, fy - 53 + (k % 2) * 6, N[7])
        out.append(c)
    return out

def spike_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(12, 46); hgt = [10, 28, 42, 42, 30, 12][i]
        for y in range(hgt):
            w = max(0, 3.6 * (1 - y / hgt)); yy = 44 - y
            c.rect(6 - w, yy, w * 2, 1, N[0]); c.px(6 + w, yy, N[5])
        c.px(6, 44 - hgt, N[8] if i < 4 else N[6]); c.ring(6, 44, 5, 1.6, N[3]); out.append(c)
    return out

# ── 그림자 기운(48×64, 반복) — 병사 뒤에서 오르는 보라 연기 불꽃 · 가끔 튀는 번개. 발밑 (24, 60) ──
def aura_cells(n=8):
    out = []
    for i in range(n):
        c = Cv(48, 64); cx, fy = 24, 60
        c.band(cx, fy, 16, 5, 0, 1, al(GV[0], .8), dens=.5)
        for j in range(30):                                                                  # 오르며 흔들리는 연기 기둥
            bx = cx + (rnd(j, 1) - .5) * 32; ph = (i / n + rnd(j, 2)) % 1
            y = fy - ph * 54; x = bx + math.sin(ph * 6 + j) * 3 - (bx - cx) * ph * .3
            sz = 4 if ph < .3 else 3 if ph < .6 else 2 if ph < .85 else 1
            col = GV[1] if ph < .45 else GV[0]
            c.rect(x - sz // 2, y - sz // 2, sz, sz, al(col, .95 - ph * .55))
            if ph < .3 and j % 3 == 0: c.px(x, y - 1, al(GV[2], .8))
        if i in (1, 2, 5):                                                                   # 번개 튐
            sx = cx + (rnd(i, 3) - .5) * 26; sy = fy - 10 - rnd(i, 4) * 30
            jag(c, sx, sy, 6, 0, -1, GV[3], GV[4], 50 + i)
        out.append(c)
    return out

# ── 하늘 번개(30×140) — 0~1 가는 줄기 · 2~3 굵게 내리친다(가지) · 4 땅 섬광 · 5~6 불똥. 땅 (15, 136) ──
def thunder_cells(n=7):
    out = []; fy = 136; cx = 15
    path = []; x = cx
    for y in range(0, fy):
        if y % 4 == 0: x = max(4, min(26, x + (1 if rnd(y, 1) > .6 else -1 if rnd(y, 1) < .4 else 0) * 2))
        path.append((x, y))
    for i in range(n):
        c = Cv(30, 140)
        if i <= 3:
            top = 0 if i >= 1 else 60
            for (x, y) in path[top:]:
                if i >= 2: c.px(x - 1, y, al(GV[1], .8)); c.px(x + 1, y, al(GV[1], .8)); c.px(x, y, GV[4] if i == 2 else GV[3])
                else: c.px(x, y, GV[3])
            if i >= 2:
                for b in range(4):                                                           # 가지
                    y0 = 20 + b * 25; x0 = path[y0][0]
                    jag(c, x0, y0, 6 + b, 1 if b % 2 else -1, 1, GV[2], GV[3], 70 + b + i)
        if 3 <= i <= 5:
            r = 6 + (i - 3) * 4
            c.band(cx, fy, r, r * .35, 0, 1, al(GV[3] if i == 3 else GV[2], .9), dens=1 if i == 3 else .6)
            c.ring(cx, fy, r + 2, (r + 2) * .35, GV[2] if i < 5 else GV[1], 0, TAU, 0 if i == 3 else 2)
        if i >= 4:
            for k in range(8):
                ang = -math.pi * rnd(k, 5); d = (i - 3) * 4 + rnd(k, 6) * 4
                c.px(cx + math.cos(ang) * d, fy - 4 + math.sin(ang) * d - (i - 4) * 3, GV[3] if i == 4 else GV[1])
        out.append(c)
    return out

# ── 걸을 때 끌리는 연기 한 줌(16×12) — 커지며 옅어진다 ──
def puff_cells(n=6):
    out = []
    for i in range(n):
        c = Cv(16, 12); u = i / (n - 1); r = 2 + u * 5
        c.band(8, 7 - u * 2, r, r * .7, 0, 1, al(GV[0] if u > .4 else GV[1], .85 - u * .5), dens=.8 - u * .55)
        if i < 2: c.px(8, 6, GV[2])
        out.append(c)
    return out

# ── 그림자 군주의 낫(64×62) — 쥔 손 (42, 22). 0 기본 · 1 날에 번개가 흐른다(번갈아 반복) ──
# 11월 19일 사용자 참고 그림(낫을 비스듬히 든 자세) — 자루는 손 위 뒤쪽(오른쪽 위)에서 몸 앞 아래(왼쪽 아래)로 길게 내려가고,
# 아래 끝 날 뿌리에서 큰 낫날이 바깥으로 불룩하게 휘며 위로 솟는다(날은 안쪽 · 자루 쪽). 그림은 따라 그리지 않고 자세 · 날 방향만 본다.
SCY_GRIP = (42, 22)
def scythe_cells():
    out = []
    gx, gy = SCY_GRIP
    L = math.hypot(.68, .73); dx, dy = -.68 / L, .73 / L                                 # 손 → 날 뿌리 방향(왼쪽 아래)
    bx, by = gx - dx * 23, gy - dy * 23                                                  # 자루 위 끝(물미)
    hx, hy = gx + dx * 40, gy + dy * 40                                                  # 날 뿌리
    R, a0, a1 = 21, math.radians(118), math.radians(258)
    ox, oy = hx - math.cos(a0) * R, hy - math.sin(a0) * R                                 # 날 둘레 가운데(날 뿌리에서 오른쪽 위)
    for i in range(2):
        c = Cv(64, 62)
        thick(c, bx, by, hx, hy, N[1], 2)                                                # 자루
        c.line(bx + 1, by, hx + 1, hy, N[3])
        for k in range(0, 41, 9): c.px(gx + dx * k + 1, gy + dy * k, GV[0])                # 자루 마디
        for k in (-3, -1, 1, 3): c.px(gx + dx * k, gy + dy * k - 1, N[5])                  # 손잡이 감은 끈
        c.rect(bx - 1, by - 1, 3, 3, N[0]); c.px(bx, by, GV[2])                           # 물미 — 보라 구슬
        pts = []
        for k in range(34):
            u = k / 33; ang = a0 + (a1 - a0) * u
            pts.append((ox + math.cos(ang) * R, oy + math.sin(ang) * R, u, ang))
        for k, (x, y, u, ang) in enumerate(pts):
            th = 6 if u < .3 else 5 if u < .55 else 4 if u < .75 else 3 if u < .88 else 2 if u < .96 else 1
            for d in range(th):                                                          # 등(바깥)에서 안쪽(날)으로 두께
                c.px(x - math.cos(ang) * d, y - math.sin(ang) * d, N[0] if d == 0 else N[2] if d < th - 1 else N[4])
            ex, ey = x - math.cos(ang) * th, y - math.sin(ang) * th                       # 날 — 안쪽 빛 줄
            c.px(ex, ey, GV[3] if (i == 1 and k % 3 == 0) else GV[2])
            if k % 7 == 3 and u < .8: c.px(x + math.cos(ang), y + math.sin(ang), N[3])     # 등의 톱니
        tx, ty = pts[-1][0], pts[-1][1]; c.px(tx, ty - 1, GV[4]); c.px(tx + 1, ty - 2, GV[3])
        c.line(hx, hy, hx + 5, hy + 4, N[1]); c.px(hx + 6, hy + 5, GV[2])                 # 날 뿌리 반대쪽 짧은 가시
        c.rect(hx - 2, hy - 2, 4, 4, N[0]); c.px(hx - 1, hy - 1, GV[4] if i else GV[3]); c.px(hx, hy - 1, GV[2])   # 날 뿌리의 보라 구슬
        if i == 1:
            jag(c, pts[8][0] - 2, pts[8][1], 6, 0, -1, GV[3], GV[4], 91)
            jag(c, pts[20][0] + 1, pts[20][1] - 2, 5, 1, -1, GV[3], GV[4], 37)
        out.append(c)
    return out

# ── 낫 베기(132×122) — 시전자 손 (22, 60) 기준 오른쪽 둘레를 위에서 아래로 크게 벤다. 반지름 R(그림 속) ──
def reap_cells(n=7, R=64):
    out = []; cx, cy = 22, 60
    for i in range(n):
        c = Cv(132, 122); u = i / (n - 1)
        head = -1.5 + min(1, u / .55) * 2.5                                                  # 날 끝이 지나가는 각도(위 → 앞 → 아래)
        tail = max(-1.5, head - 1.6)
        fade = max(0, (u - .55) / .45)
        for k in range(7):                                                                   # 겹친 반달 — 바깥이 가장 밝다
            rr = R + 6 - k * 2
            col = [GV[4], GV[3], GV[3], GV[2], GV[2], GV[1], GV[0]][k]
            if fade > 0 and k < 3: col = GV[2] if k == 0 else GV[1]
            a0 = tail + k * .05 + fade * 1.2
            if a0 < head: c.ring(cx, cy, rr, rr * .82, al(col, 1 - fade * .8), a0, head)
        if u <= .6:                                                                          # 날 끝 섬광 · 번개
            ex, ey = cx + math.cos(head) * (R + 6), cy + math.sin(head) * (R + 6) * .82
            star(c, ex, ey, 2, GV[3]); jag(c, ex, ey, 6, 1, 1 if head > 0 else 0, GV[3], GV[4], 101 + i)
        for k in range(10):                                                                  # 흩날리는 그림자 연기
            ang = tail + rnd(k, 1) * (head - tail); d = R * (.6 + rnd(k, 2) * .5)
            x, y = cx + math.cos(ang) * d + u * 6, cy + math.sin(ang) * d * .82 - u * 6
            c.px(x, y, al(GV[1] if k % 2 else N[1], .8 - fade * .6))
        out.append(c)
    return out, (cx, cy)

# ── 작은 알갱이 넷(11월 17일 사용자: "범위는 큰데 자잘한 것이 없어 비어 보인다") — 코드가 범위 안에 많이 흩뿌린다 ──
def ember_cells(n=6):        # 보라 불씨(9×9) — 반짝였다 사그라든다
    out = []
    for i in range(n):
        c = Cv(9, 9); u = i / (n - 1)
        if u < .35: star(c, 4, 4, 2, GV[3], GV[2]); c.px(4, 4, GV[4])
        elif u < .7: c.rect(3, 3, 3, 3, GV[2]); c.px(4, 4, GV[4]); c.px(4, 2, al(GV[1], .8)); c.px(4, 6, al(GV[1], .8))
        else: c.rect(3, 4, 2, 2, GV[1]); c.px(4, 4, GV[2])
        out.append(c)
    return out

def shard_cells(n=6):        # 검은 파편(8×8) — 보라 가장자리가 돌며 반짝인다
    out = []
    for i in range(n):
        c = Cv(8, 8); a = i / n * math.pi
        pts = [(4 + math.cos(a + k * TAU / 3) * (3.4 if k == 0 else 2.2), 4 + math.sin(a + k * TAU / 3) * (3.4 if k == 0 else 2.2)) for k in range(3)]
        c.fillpoly(pts, N[0]); c.px(pts[0][0], pts[0][1], GV[3] if i % 2 == 0 else GV[2]); c.px(pts[1][0], pts[1][1], GV[1])
        out.append(c)
    return out

def zap_cells(n=4):          # 번개 조각(12×18) — 짧게 번쩍인다
    out = []
    for i in range(n):
        c = Cv(12, 18)
        if i < 3:
            x, y = 6, 1
            for k in range(14):
                x += (1 if rnd(i, k, 21) > .62 else -1 if rnd(i, k, 21) < .38 else 0); y += 1
                if i == 0: c.px(x - 1, y, al(GV[1], .7)); c.px(x + 1, y, al(GV[1], .7))
                c.px(x, y, GV[4] if i == 0 else GV[3] if i == 1 else GV[2])
                if k == 6: jag(c, x, y, 4, 1 if i % 2 else -1, 1, GV[2], GV[3], 33 + i)
        else:
            for k in range(4): c.px(5 + k % 2, 6 + k * 3, GV[1])
        out.append(c)
    return out

def smoke_cells(n=8):        # 그림자 연기 한 덩이(18×16) — 말리며 커지고 옅어진다
    out = []
    for i in range(n):
        c = Cv(18, 16); u = i / (n - 1); r = 3 + u * 5
        c.band(9, 9 - u * 3, r, r * .8, 0, 1, al(N[1], .9 - u * .4), dens=.95 - u * .6)
        c.band(9 + r * .3, 8 - u * 3, r * .55, r * .5, 0, 1, al(GV[0], .9 - u * .5), dens=.8 - u * .55)
        if u < .5: c.px(9 - r * .4, 9 - u * 3 - r * .4, al(GV[1], .9))
        out.append(c)
    return out

# ── 스킬 아이콘(24×24) — 그림자 낫 · 흔적 추출 · 그림자 소집 · 그림자 교환 · 군주의 영역 · 일제 진군 · 영혼 소각 · 무명의 군세 ──
def icon_cells():
    out = []
    def frame(c):
        c.rect(0, 0, 24, 24, N[2]); c.rect(1, 1, 22, 22, N[1]); c.ring(12, 12, 10.5, 10.5, N[3]); c.rect(0, 0, 24, 1, N[4]); c.rect(0, 0, 1, 24, N[4])
    c = Cv(24, 24); frame(c)                                                              # 그림자 낫
    c.line(6, 20, 15, 5, N[0]); c.line(7, 20, 16, 5, GV[1])
    for k in range(10): u = k / 9; c.px(15 - u * 9, 5 + math.sin(u * 2.4) * 4 - u * 0, GV[3] if k < 8 else GV[4]); c.px(15 - u * 9, 6 + math.sin(u * 2.4) * 4, N[0])
    c.px(16, 4, GV[4]); c.ring(12, 12, 9, 9, GV[1], 2.2, 3.4); out.append(c)
    c = Cv(24, 24); frame(c); c.band(12, 19, 7, 2.5, 0, 1, N[0]); c.ring(12, 19, 7, 2.5, N[6])
    for y in range(4, 18): c.rect(11 + math.sin(y * .5), y, 2, 1, N[0]); c.px(13 + math.sin(y * .5), y, N[7])
    c.disc(12, 4, 2, 2, N[8]); out.append(c)
    c = Cv(24, 24); frame(c)
    for k, x in enumerate((6, 12, 18)):
        h2 = 10 if k == 1 else 8; c.rect(x - 2, 19 - h2, 4, h2, N[0]); c.disc(x, 19 - h2 - 2, 2.2, 2.2, N[0]); c.px(x + 1, 19 - h2 - 2, N[7])
    c.ring(12, 20, 9, 2, N[6]); out.append(c)
    c = Cv(24, 24); frame(c)
    for x in (6, 9, 15, 18): c.line(x, 18, x, 7, N[0]); c.px(x, 6, N[8])
    c.line(8, 12, 16, 12, N[6]); c.px(15, 11, N[7]); c.px(15, 13, N[7]); c.px(9, 11, N[7]); c.px(9, 13, N[7]); out.append(c)
    c = Cv(24, 24); frame(c); c.band(12, 14, 9, 6, 0, 1, N[0], dens=.7); c.ring(12, 14, 9, 6, N[6]); c.ring(12, 14, 6, 4, N[5], 0, TAU, 2)
    c.rect(11, 6, 2, 8, N[0]); c.px(11, 7, N[8]); c.px(12, 7, N[8]); out.append(c)
    c = Cv(24, 24); frame(c)
    for k in range(3): c.line(4, 7 + k * 5, 15, 12, N[6]); c.px(4, 7 + k * 5, N[0])
    c.ring(17, 12, 4, 4, N[0]); c.ring(17, 12, 3, 3, N[7]); c.px(17, 12, N[8]); out.append(c)
    c = Cv(24, 24); frame(c); c.disc(12, 13, 7, 7, RD[0]); c.disc(12, 13, 4.5, 4.5, RD[1]); c.disc(12, 13, 2, 2, RD[3])
    for k in range(6): a = k * TAU / 6; c.line(12, 13, 12 + math.cos(a) * 9, 13 + math.sin(a) * 9, N[0])
    out.append(c)
    c = Cv(24, 24); frame(c)
    for k in range(5):
        x = 4 + k * 4; h2 = 7 + (k % 2) * 4; c.rect(x, 20 - h2, 3, h2, N[0]); c.disc(x + 1.5, 20 - h2 - 1, 1.6, 1.6, N[0]); c.px(x + 2, 20 - h2 - 1, N[7])
    c.ring(12, 6, 5, 3, N[8] if True else N[6]); c.px(12, 6, N[9]); out.append(c)
    return out

# ── 연출 색 — 11월 20일 사용자 "보라색보다 더 어두운 검정에 가깝게 · 곳곳에 빛나는 보라색 하이라이트" ──
# 그린 뒤 시트 전체를 다시 칠한다: 밝기에 따라 검보라 4단으로 누르고, 밝던 자리 중 일부(점점이 · 칸마다 같은 자리)만 빛나는 보라로 남긴다.
# 영혼 소각의 붉은 색도 같이 누른다. 그림자 병사 · 아이콘 · 손에 든 낫은 이미 검은 몸이라 다시 칠하지 않는다(DARK_SKIP).
DARK = [rgb(c) for c in ["#08050D", "#140B20", "#221233", "#34194D"]]   # 검보라 4단(어두움 → 밝음)
GLOW = [rgb(c) for c in ["#9B4DFF", "#C792FF", "#F0E0FF"]]              # 빛나는 보라 하이라이트(옅음 → 심지)
DARK_HI, DARK_RATE, DARK_EDGE = 0.55, 0.3, 0.12   # 하이라이트가 될 수 있는 밝기 · 밝은 자리 중 남길 몫 · 가장자리 몫
DARK_SKIP = {"nc_icons", "nc_scythe"}
def darken(im, w, h):
    a = im[..., 3] > 0
    rgbf = im[..., :3].astype(float)
    lum = (rgbf[..., 0] * .3 + rgbf[..., 1] * .59 + rgbf[..., 2] * .11) / 255
    yy, xx = np.mgrid[0:im.shape[0], 0:im.shape[1]]
    hx = ((xx % w) * 73856093 ^ (yy % h) * 19349663) % 1000 / 1000.0           # 칸 안 자리마다 정해진 값 — 프레임마다 같은 자리가 빛난다
    m = a
    out = im.copy()
    k = np.clip((lum / max(DARK_HI, 1e-3)) * len(DARK), 0, len(DARK) - 1).astype(int)
    for i, c in enumerate(DARK): out[m & (k == i), :3] = c[:3]
    edge = np.zeros_like(a)                                                     # 바깥 가장자리 — 투명한 이웃이 있는 칸
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): edge |= a & ~np.roll(np.roll(a, dy, 0), dx, 1)
    hi = m & (lum >= DARK_HI) & ((hx < DARK_RATE) | (edge & (hx < DARK_RATE + DARK_EDGE)))
    gi = np.clip(((lum - DARK_HI) / (1 - DARK_HI)) * len(GLOW), 0, len(GLOW) - 1).astype(int)
    for i, c in enumerate(GLOW): out[hi & (gi == i), :3] = c[:3]
    out[hi, 3] = np.maximum(out[hi, 3], 200)
    return out

def pack(name, cells, cols=None, man=None, cx=None, cy=None, loop=0, rows=1, **extra):
    w, h = cells[0].w, cells[0].h; cols = cols or len(cells); R = math.ceil(len(cells) / cols)
    im = np.zeros((R * h, cols * w, 4), np.uint8)
    for i, c in enumerate(cells): im[(i // cols) * h:(i // cols) * h + h, (i % cols) * w:(i % cols) * w + w] = c.a
    if name not in DARK_SKIP and not name[3:] in SOLDIER: im = darken(im, w, h)
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(im, "RGBA").save(os.path.join(OUT, name + ".webp"), lossless=True, quality=100, method=6)
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(cells) // rows, "cx": w // 2 if cx is None else cx, "cy": h // 2 if cy is None else cy, **({"loop": 1} if loop else {}), **({"rows": rows} if rows > 1 else {}), **extra}
    return im

def main():
    man = {}; sheets = {}
    for k in SOLDIER:
        cells, (w, h, cx, fy) = soldier_cells(k)
        sheets["nc_" + k] = pack("nc_" + k, cells, 16, man, cx=cx, cy=fy, rows=3)
    sheets["nc_orb"] = pack("nc_orb", orb_cells(), None, man, loop=1)
    sheets["nc_hit"] = pack("nc_hit", hit_cells(), None, man)
    sheets["nc_trace"] = pack("nc_trace", trace_cells(), None, man, loop=1)
    sheets["nc_extract"] = pack("nc_extract", extract_cells(), None, man, cx=20, cy=66)
    sheets["nc_wisp"] = pack("nc_wisp", wisp_cells(), None, man, loop=1)
    sheets["nc_absorb"] = pack("nc_absorb", absorb_cells(), None, man)
    sheets["nc_stretch"] = pack("nc_stretch", stretch_cells(), None, man)
    sheets["nc_slash"] = pack("nc_slash", slash_cells(), None, man, cx=14, cy=18)
    sheets["nc_bolt"] = pack("nc_bolt", bolt_cells(), None, man, loop=1, cx=13, cy=3)
    cells, (w, h, cx, cy) = burst_cells(35, 6, 4); sheets["nc_pop"] = pack("nc_pop", cells, None, man, cx=cx, cy=cy, r=35)
    cells, (w, h, cx, cy) = burst_cells(48, 6, 8); sheets["nc_slam"] = pack("nc_slam", cells, None, man, cx=cx, cy=cy, r=48)
    cells, (w, h, cx, cy) = burst_cells(70, 8, 12, cy_extra=30, red=True); sheets["nc_boom"] = pack("nc_boom", cells, 4, man, cx=cx, cy=cy, r=70)
    cells, (w, h, cx, cy) = burst_cells(100, 10, 17, cy_extra=40, big=True); sheets["nc_blast"] = pack("nc_blast", cells, 5, man, cx=cx, cy=cy, r=100)
    sheets["nc_swap"] = pack("nc_swap", swap_cells(), None, man, cx=10, cy=56)
    cells, (w, h, cx, cy) = domain_cells(); sheets["nc_domain"] = pack("nc_domain", cells, 4, man, cx=cx, cy=cy, r=160)
    sheets["nc_mark"] = pack("nc_mark", mark_cells(), None, man, loop=1)
    sheets["nc_crack"] = pack("nc_crack", crack_cells(), None, man, cx=15, cy=38)
    sheets["nc_sigil"] = pack("nc_sigil", sigil_cells(), None, man)
    sheets["nc_wave"] = pack("nc_wave", wave_cells(), None, man, cx=36, cy=80)
    sheets["nc_spike"] = pack("nc_spike", spike_cells(), None, man, cx=6, cy=44)
    sheets["nc_aura"] = pack("nc_aura", aura_cells(), None, man, loop=1, cx=24, cy=60)
    sheets["nc_thunder"] = pack("nc_thunder", thunder_cells(), None, man, cx=15, cy=136)
    sheets["nc_puff"] = pack("nc_puff", puff_cells(), None, man)
    sheets["nc_scythe"] = pack("nc_scythe", scythe_cells(), None, man, loop=1, cx=SCY_GRIP[0], cy=SCY_GRIP[1])
    cells, (cx, cy) = reap_cells(); sheets["nc_reap"] = pack("nc_reap", cells, None, man, cx=cx, cy=cy, r=70)
    sheets["nc_ember"] = pack("nc_ember", ember_cells(), None, man)
    sheets["nc_shard"] = pack("nc_shard", shard_cells(), None, man, loop=1)
    sheets["nc_zap"] = pack("nc_zap", zap_cells(), None, man)
    sheets["nc_smoke"] = pack("nc_smoke", smoke_cells(), None, man)
    sheets["nc_icons"] = pack("nc_icons", icon_cells(), None, man, cx=0, cy=0)
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
