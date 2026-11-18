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

# ── 와이번(72×56) — 옆모습 · 오른쪽을 본다. 0~3 날갯짓 반복 · 4~6 불을 뿜는 공격. 줄 0 그대로 · 1 연마 75 붉은 선 ──
# ── 와이번 몸(244×124, 1배로 그린다) — 11월 18일 사용자 그림(design/wyvern-job/ref/wyvern-ref.jpg)을 그대로 도트로 옮긴다 ──
# 흰 바탕을 가장자리부터 지우고(몸 안 흰 반점은 둘레 색으로 메움) 좌우를 뒤집어 머리를 오른쪽에 둔다(게임 기준).
# 0~3 날갯짓 — 어깨선 위 날개를 세로로 1.0 · 0.6 · 0.25 · 0.6 배(PIV 를 축으로). 4~6 공격 — 입 속 불빛.
# 줄 0 기본 · 줄 1 연마 75(날개 윗선에 붉은 선). 32색으로 묶고 1px 윤곽.
WY_REF = os.path.join(HERE, "..", "..", "wyvern-job", "ref", "wyvern-ref.jpg")
WY_SC, WY_CW, WY_CH, WY_M = 0.6, 244, 124, 2
WY_PIV = 122                                            # 날갯짓 축(원본 y)
WY_MOUTH = (197, 105)                                   # 칸 안 입 자리(공격 불빛)
def wy_base(x): return 119 if x < 210 else 125 if x < 300 else 130   # 원본 x 마다 날개 · 몸 경계(꼬리 · 머리를 날개로 치지 않게)

def wy_ref_cut():
    from collections import deque
    a = np.array(Image.open(WY_REF).convert("RGB")).astype(int); H, W_ = a.shape[:2]
    light = (a.min(2) > 200) & ((a.max(2) - a.min(2)) < 45)
    bg = np.zeros((H, W_), bool); q = deque()
    for x in range(W_):
        for y in (0, H - 1):
            if light[y, x]: bg[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W_ - 1):
            if light[y, x] and not bg[y, x]: bg[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W_ and not bg[ny, nx] and light[ny, nx]: bg[ny, nx] = 1; q.append((ny, nx))
    hole = light & ~bg; rgb = a.astype(float)
    for _ in range(6):
        ys, xs = np.nonzero(hole)
        if not len(ys): break
        nh = hole.copy()
        for y, x in zip(ys, xs):
            nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if 0 <= y + dy < H and 0 <= x + dx < W_ and not hole[y + dy, x + dx] and not bg[y + dy, x + dx]]
            if nb: rgb[y, x] = np.mean([rgb[p] for p in nb], 0); nh[y, x] = 0
        hole = nh
    return np.dstack([rgb, np.where(bg, 0.0, 255.0)])[:, ::-1]

def wy_flap(src, s):
    H, W_ = src.shape[:2]; ys = np.arange(H)[:, None]
    base = np.array([wy_base(x) for x in range(W_)])[None, :]
    wm = (ys < base) & (src[..., 3] > 0)
    body = src.copy(); body[wm] = 0; wing = src.copy(); wing[~wm] = 0
    out = body.copy()
    for ty in range(H):
        iy = int(round(WY_PIV - (WY_PIV - ty) / s))
        if 0 <= iy < H:
            row = wing[iy]; m = row[:, 3] > 0; out[ty][m] = row[m]
    return out

def wy_shrink(a):
    H, W_ = a.shape[:2]; pm = a.copy(); pm[..., :3] *= pm[..., 3:4] / 255
    w, h = round(W_ * WY_SC), round(H * WY_SC)
    r = np.array(Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.BOX)).astype(float)
    al_ = r[..., 3]; col = np.where(al_[..., None] > 0, r[..., :3] * 255 / np.maximum(al_[..., None], 1), 0)
    out = np.zeros((WY_CH, WY_CW, 4), np.uint8)
    out[WY_M:WY_M + h, WY_M:WY_M + w, :3] = np.clip(col, 0, 255).astype(np.uint8)
    out[WY_M:WY_M + h, WY_M:WY_M + w, 3] = np.where(al_ > 140, 255, 0)
    out[out[..., 3] == 0] = 0
    return out

def wyvern_cells():
    src = wy_ref_cut()
    base = [wy_shrink(wy_flap(src, s)) for s in (1.0, 0.6, 0.25, 0.6)]
    atk = [wy_shrink(wy_flap(src, 0.8))] * 3
    frames = base + atk
    big = np.concatenate(frames, 1)
    q = Image.fromarray(big[..., :3]).quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    big[..., :3] = np.array(q.convert("RGB")); big[big[..., 3] == 0] = 0
    out = []
    for line in (False, True):
        for f in range(7):
            c = Cv(WY_CW, WY_CH); c.a = big[:, f * WY_CW:(f + 1) * WY_CW].copy()
            if line:   # 연마 75 — 날개 윗선을 따라 붉은 선(2칸 아래까지)
                for x in range(WY_CW):
                    col = np.nonzero(c.a[:, x, 3])[0]
                    if len(col) and col[0] < WY_MOUTH[1] - 30:
                        y0 = col[0]; c.px(x, y0 + 1, LINE)
                        if x % 3: c.px(x, y0 + 2, al(LINE, .6))
            if f >= 4:   # 공격 — 입 속 불빛
                k = [0.5, 1.0, 0.6][f - 4]; mx, my = WY_MOUTH
                c.disc(mx, my, 3 + k * 4, 2 + k * 3, al(F[3], .85)); c.disc(mx, my, 1.5 + k * 2, 1 + k * 1.5, F[5]); c.px(mx, my, F[6])
            outline(c, R[0]); out.append(c)
    return out

# ── 와이번 그림자(64×20) — 땅에 비친 날개 그림자 · 날갯짓 4칸 ──
# ── 앉은 와이번(1배) — 11월 18일 사용자 "움직이지 않을 때는 앉아있는 모습". 같은 사용자 그림을 조각내 다시 맞춘다 ──
# 날개는 어깨에서 접고(가로 0.38 · 0.32 배) 몸 · 머리는 24° 들어 올리고, 꼬리는 두 마디로 꺾어 끝을 땅에 눕힌다(정한 자세 — 앉은 그림이 따로 없어서).
# 칸 0 · 1 숨쉬기(1은 몸이 1px 내려앉음) · 2 앉은 채 불 뿜기. 줄 0 기본 · 줄 1 연마 75. 기준점은 몸 아래 땅(cx, cy = 바닥).
SIT_BODY, SIT_TAIL, SIT_PAD = -24, -40, (40, 120)
def wy_sit_layers(breath=0):
    import math as m_
    src = wy_ref_cut(); H, W_ = src.shape[:2]; ys = np.arange(H)[:, None]; xs = np.arange(W_)[None, :]
    base = np.array([wy_base(x) for x in range(W_)])[None, :]; op = src[..., 3] > 0
    wing = op & (ys < base); near = wing & (xs < 250); far = wing & (xs >= 250)
    tail = op & ~wing & (xs < 200); tail2 = tail & (xs < 110); tail = tail & ~tail2; body = op & ~wing & ~tail & ~tail2
    OX, OY = SIT_PAD; SZ = (W_ + 80, H + 200)
    def lay(msk, dark=1.0):
        a = src.copy(); a[~msk] = 0; a[..., :3] *= dark
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")
    def tf(img, sx=1, sy=1, rot=0, px=0, py=0, tx=0, ty=0):
        a = m_.radians(rot); c, s_ = m_.cos(a), m_.sin(a)
        A = np.array([[c * sx, -s_ * sy], [s_ * sx, c * sy]]); Ai = np.linalg.inv(A)
        piv = np.array([px, py]); b = piv - Ai @ (piv + np.array([tx, ty]) + np.array([OX, OY]))
        return img.transform(SZ, Image.AFFINE, (Ai[0, 0], Ai[0, 1], b[0], Ai[1, 0], Ai[1, 1], b[1]), resample=Image.BILINEAR)
    a_ = m_.radians(SIT_TAIL); J = (205 + (110 - 205) * m_.cos(a_) - (138 - 140) * m_.sin(a_), 140 + (110 - 205) * m_.sin(a_) + (138 - 140) * m_.cos(a_))
    out = Image.new("RGBA", SZ)
    for L in (tf(lay(far, 0.7), sx=0.32, sy=0.85, rot=SIT_BODY, px=265, py=122, ty=breath),
              tf(lay(tail2), rot=6, px=110, py=138, tx=J[0] - 110, ty=J[1] - 138),
              tf(lay(tail), rot=SIT_TAIL, px=205, py=140),
              tf(lay(body), rot=SIT_BODY, px=245, py=150, ty=breath),
              tf(lay(near), sx=0.38, sy=0.8, rot=SIT_BODY - 8, px=232, py=122, tx=-6, ty=6 + breath)):
        out.alpha_composite(L)
    a = m_.radians(SIT_BODY); mx, my = 330 - 245, 172 - 150   # 입(원본) → 몸 회전
    mouth = (245 + mx * m_.cos(a) - my * m_.sin(a) + OX, 150 + mx * m_.sin(a) + my * m_.cos(a) + OY)
    return np.array(out).astype(float), mouth

def drop_specks(f, keep=12):   # 조각을 다시 맞추다 남은 작은 점(덩어리 12칸 미만)을 지운다
    from collections import deque
    on = f[..., 3] > 0; seen = np.zeros_like(on); H, W_ = on.shape
    for y0 in range(H):
        for x0 in range(W_):
            if on[y0, x0] and not seen[y0, x0]:
                q = deque([(y0, x0)]); seen[y0, x0] = 1; got = []
                while q:
                    y, x = q.popleft(); got.append((y, x))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = y + dy, x + dx
                            if 0 <= ny < H and 0 <= nx < W_ and on[ny, nx] and not seen[ny, nx]: seen[ny, nx] = 1; q.append((ny, nx))
                if len(got) < keep:
                    for y, x in got: f[y, x] = 0

WY_SIT_BOX = (50, 166, 392, 348)        # 앉은 그림을 담는 원본 캔버스 범위(여백 포함 — 바닥 = 아래 끝)
WY_SIT_CX = 245 + SIT_PAD[0]            # 몸 축이 오는 x(원본 캔버스)
def wy_sit_cells():
    x0, y0, x1, y1 = WY_SIT_BOX; w, h = round((x1 - x0) * WY_SC), round((y1 - y0) * WY_SC)
    frames = []; mouth = None
    for br in (0, 2, 0):
        a, mouth = wy_sit_layers(br); a = a[y0:y1, x0:x1]
        pm = a.copy(); pm[..., :3] *= pm[..., 3:4] / 255
        r = np.array(Image.fromarray(np.clip(pm, 0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.BOX)).astype(float)
        al_ = r[..., 3]; col = np.where(al_[..., None] > 0, r[..., :3] * 255 / np.maximum(al_[..., None], 1), 0)
        f = np.zeros((h + 4, w + 4, 4), np.uint8); f[2:2 + h, 2:2 + w, :3] = np.clip(col, 0, 255).astype(np.uint8); f[2:2 + h, 2:2 + w, 3] = np.where(al_ > 140, 255, 0)
        f[f[..., 3] == 0] = 0; drop_specks(f); frames.append(f)
    big = np.concatenate(frames, 1); q = Image.fromarray(big[..., :3]).quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    big[..., :3] = np.array(q.convert("RGB")); big[big[..., 3] == 0] = 0
    cw = w + 4; mx, my = (mouth[0] - x0) * WY_SC + 2, (mouth[1] - y0) * WY_SC + 2
    out = []
    for line in (False, True):
        for f in range(3):
            c = Cv(cw, h + 4); c.a = big[:, f * cw:(f + 1) * cw].copy()
            if line:
                for x in range(cw):
                    col = np.nonzero(c.a[:, x, 3])[0]
                    if len(col) and col[0] < my - 10: c.px(x, col[0] + 1, LINE)
            if f == 2:
                c.disc(mx, my, 6, 4.5, al(F[3], .85)); c.disc(mx, my, 3, 2.5, F[5]); c.px(mx, my, F[6])
            outline(c, R[0]); out.append(c)
    cx = round((WY_SIT_CX - x0) * WY_SC) + 2
    return out, cx, h + 2, (round(mx) - cx, round(my) - (h + 2))

def shade_cells():   # 122×24 — 사용자 그림 와이번 날개 폭(1배 244)에 맞춰 2배로 그린다
    out = []
    for f, sc in enumerate([1.0, 0.6, 0.25, 0.6]):
        c = Cv(122, 24); col = al(S[0], .55)
        c.disc(61, 12, 14, 4, col)                                                     # 몸(칸 가운데 = 와이번 자리)
        c.fillpoly([(50, 11), (2, 10), (2, 12), (50, 15)], col)                        # 꼬리
        c.disc(86, 14, 6, 3, col)                                                      # 머리
        sp = 0.55 + 0.45 * sc
        c.fillpoly([(58, 11), (58 - 56 * sp, 6 - 3 * sc), (36, 15), (62, 15)], col)    # 가까운 날개
        c.fillpoly([(68, 10), (68 + 44 * sp, 4 - 3 * sc), (80, 13)], col)              # 먼 날개
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

# ══ 11월 18일 사용자 "모든 스킬이 어색해 · 간지도 없어 · 천공강습이 비어 보여" — 굵은 참격 · 별빛 타격 · 비늘 방벽 · 등에 붙은 날개 · 손에 드는 아르카디온 ══
# 굵은 참격 한 줄 — (cx, cy) 를 중심으로 반지름 R 의 호. 앞쪽(끝)이 굵고 밝으며 꼬리는 가늘다. 바깥 가장자리가 가장 밝다(흰 심 → 금빛 → 주황 → 붉은 → 검붉은 테)
def slash_arc(c, cx, cy, R, a0, a1, width, sq, pal, sweep=1.0, fade=0.0, seed=1, ghost=True):
    span = (a1 - a0) * sweep
    if abs(span) < 1e-3: return
    def wof(t):
        w = width * (math.sin(math.pi * min(1, t * 1.15)) ** 0.6) * (0.3 + 0.7 * t)   # 머리 쪽이 굵다
        if t > 0.86: w = min(w, width * (1 - t) / 0.14)                                # 머리 끝은 뾰족하게
        return w
    lo = R - width - 2
    x0, x1 = int(cx - R - 2), int(cx + R + 3); y0, y1 = int(cy - (R + 2) * sq), int(cy + (R + 2) * sq) + 1
    for y in range(max(0, y0), min(c.h, y1)):
        for x in range(max(0, x0), min(c.w, x1)):
            dx, dy = x + .5 - cx, (y + .5 - cy) / sq
            r = math.hypot(dx, dy)
            if r > R + .5 or r < lo * (0.7 if ghost else 1): continue
            a = math.atan2(dy, dx)
            t = ((a - a0) % TAU) / span if span > 0 else ((a0 - a) % TAU) / -span
            if t > 1: continue
            w = wof(t)
            k = (R - r) / w if w > 0.5 else 9
            if 0 <= k <= 1:
                if fade and BAYER[y % 4, x % 4] < fade * (0.5 + k * 0.9): continue
                col = pal[min(len(pal) - 1, int(k * len(pal)))]
                if t < 0.3 and k < 0.25: col = pal[2]   # 꼬리는 덜 밝다
                c.px(x, y, col)
            elif ghost and fade < 0.9 and k > 1:   # 잔상 — 안쪽에 성긴 띠
                g = (R - r - w) / max(1, w)
                dn = (0.5 if g < .8 else 0.25 if g < 1.6 else 0) * (1 - fade) * math.sin(math.pi * t)
                if BAYER[y % 4, x % 4] < dn: c.px(x, y, pal[4] if g < .8 else pal[6 if len(pal) > 6 else -1])

SLASH_FIRE = [W, F[6], F[5], F[4], F[3], F[2], F[1], R[3], R[2]]
SLASH_VIO = [W, F[6], F[5], R[4], R[3], V[3], V[2], V[1], V[0]]

def speed_lines(c, cx, cy, R, a0, a1, sq, col, seed, n=10, ln=10):
    for i in range(n):
        a = a0 + (a1 - a0) * rnd(seed, i); r = R * (1.02 + rnd(seed, i, 2) * 0.14)
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * sq
        tx, ty = -math.sin(a), math.cos(a) * sq
        if a1 < a0: tx, ty = -tx, -ty
        L = ln * (0.5 + rnd(seed, i, 3))
        c.line(x, y, x - tx * L, y - ty * L, col)

# ── 용조격(112×80, 기준점 10,40 · 반지름 88) — 굵은 발톱 세 줄이 겹쳐 휘몰아친다. 6칸 ──
def claw_cells():
    out = []
    for f in range(6):
        c = Cv(112, 96); sweep = ez(min(1, (f + 1) / 2.6)); fade = 0 if f < 3 else (f - 2) / 3.2
        for k, (rr, wd) in enumerate([(88, 13), (72, 10), (56, 7)]):
            slash_arc(c, 10 - k * 2, 48, rr, -0.95 + k * .08, 0.95 - k * .05, wd, 0.62, SLASH_FIRE, sweep, fade, seed=3 + k, ghost=(k == 0))
        if f < 4: speed_lines(c, 10, 48, 88, -0.9, -0.9 + 1.8 * sweep, 0.62, al(F[5], .9), 11 + f, n=8, ln=12)
        if f < 5:
            for i in range(14):
                a = -0.9 + 1.8 * sweep * rnd(3, i, f); d = 60 + rnd(5, i, f) * 36
                star(c, 10 + math.cos(a) * d, 48 + math.sin(a) * d * .62, 1 if (i + f) % 3 == 0 and f < 3 else 0, F[5] if f < 2 else F[3])
        outline(c, al(R[0], .75))
        out.append(c)
    return out

# ── 타격(64×64) — 흰 섬광 · 길고 짧은 가시 여덟 · 불꽃 고리 · 사방 불씨. 8칸 ──
def hit_cells():
    out = []
    for f in range(8):
        c = Cv(64, 64); u = f / 7; cx, cy = 32, 32
        if f < 4:   # 가시 — 가운데에서 뻗었다가 들어간다
            L0 = [12, 26, 22, 12][f]
            for i in range(8):
                a = i * TAU / 8 + 0.2; L = L0 * (1 if i % 2 == 0 else 0.55); w = 2.4 if i % 2 == 0 else 1.6
                px_, py_ = -math.sin(a) * w, math.cos(a) * w
                tip = (cx + math.cos(a) * L, cy + math.sin(a) * L)
                c.fillpoly([(cx + px_, cy + py_), tip, (cx - px_, cy - py_)], F[4] if f < 2 else F[2])
                c.line(cx, cy, tip[0] * .85 + cx * .15, tip[1] * .85 + cy * .15, F[6] if f < 2 else F[4])
        rr = 4 + 22 * ez(u)
        if 1 <= f <= 6:
            c.band(cx, cy, rr, rr * .82, .8, 1, F[3] if f < 4 else R[3], dens=1.0 - u * .7)
            c.ring(cx, cy, rr, rr * .82, F[5] if f < 4 else F[2], gap=0 if f < 5 else 2)
        if f < 5: flame(c, cx, cy + 1, 5 + 6 * (1 - u) + (3 if f == 1 else 0), min(1, u * 1.3), seed=11 + f)
        if f < 2: c.disc(cx, cy, 5 - f * 2, 5 - f * 2, W)
        for i in range(16):
            a = i * TAU / 16 + rnd(7, i) * .4; d = 6 + 26 * ez(u) * (.55 + rnd(9, i) * .55)
            if 2 <= f < 7: star(c, cx + math.cos(a) * d, cy + math.sin(a) * d - u * 4, 1 if f < 4 and i % 3 == 0 else 0, F[5] if f < 4 else F[2])
        if f >= 5: smoke(c, cx, cy - (f - 5) * 2, 8 + (f - 5) * 3, (f - 5) / 3)
        outline(c, al(R[0], .6))
        out.append(c)
    return out

# ── 용린 수호(76×96, 발밑 기준 38,90) — 몸을 감싼 붉은 용비늘 방벽. 0~5 아래부터 비늘이 쌓여 올라온다 · 6~11 빛이 비늘을 훑고 지나간다(반복) · 12~15 깨져 흩어진다 ──
SC_CX, SC_CY, SC_RX, SC_RY = 38, 50, 32, 42
def scale_px(c, f, rise=1.0, sweep=None, crack=0.0):
    sx, sy = 9, 7
    for y in range(c.h):
        for x in range(c.w):
            dx, dy = (x + .5 - SC_CX) / SC_RX, (y + .5 - SC_CY) / SC_RY
            d = math.sqrt(dx * dx + dy * dy)
            if d > 1: continue
            top = SC_CY + SC_RY - (2 * SC_RY + 2) * rise
            if y < top: continue
            r_ = int((y - (SC_CY - SC_RY)) // sy); ly = (y - (SC_CY - SC_RY)) - r_ * sy
            sh = (r_ % 2) * sx / 2; lx = ((x - SC_CX - sh) % sx) - sx / 2
            q = math.hypot(lx, (ly - 1) * sx / sy / 1.2)
            edge = ly >= 1 and abs(q - sx / 2) < .8
            fres = 1.0 if d > .86 else max(0.0, (d - .66) / .2) ** 1.5   # 가장자리만 비늘로 덮고 가운데(몸)는 비운다
            lit = sweep is not None and abs((x - SC_CX) * .6 + (y - SC_CY) - sweep) < 6
            if crack and rnd(x // 6, y // 6, 99) < crack: continue
            if y >= top and y < top + 2 and rise < 1: c.px(x, y, F[5]); continue
            if edge:
                col = F[6] if lit else (F[4] if dx < -.1 and dy < .2 else F[2] if dy < .5 else R[3])
                if BAYER[y % 4, x % 4] < fres or (lit and d > .4): c.px(x, y, col)
            elif BAYER[y % 4, x % 4] < fres * .8 or (lit and d > .4 and BAYER[y % 4, x % 4] < .3):
                c.px(x, y, al(F[3] if lit else (R[3] if dx < 0 else R[2]), .85))
    # 테 — 위 · 왼쪽은 밝게, 아래 · 오른쪽은 붉게
    if rise >= 1:
        for i in range(260):
            a = i / 260 * TAU; x, y = SC_CX + math.cos(a) * SC_RX, SC_CY + math.sin(a) * SC_RY
            if crack and rnd(i // 12, 3, 97) < crack: continue
            c.px(x, y, F[5] if math.sin(a) < -.1 or math.cos(a) < -.4 else R[3])
        c.ring(SC_CX, 90, 28, 6, F[3] if not crack else R[3], gap=2 if crack else 0)   # 발밑 비늘 고리
def scale_cells():
    out = []
    for f in range(16):
        c = Cv(76, 96)
        if f < 6: scale_px(c, f, rise=ez((f + 1) / 6))
        elif f < 12: scale_px(c, f, sweep=-70 + (f - 6) * 26)
        else: scale_px(c, f, crack=.22 + (f - 12) * .24)
        if f >= 12:
            for i in range(18):
                a = rnd(41, i) * TAU; d = 20 + (f - 11) * 8 * (.6 + rnd(43, i))
                x, y = SC_CX + math.cos(a) * d, SC_CY + math.sin(a) * d * .9
                c.fillpoly([(x, y - 2), (x + 2, y), (x, y + 2), (x - 2, y)], R[3] if i % 3 else F[4])
        outline(c, al(R[0], .7))
        out.append(c)
    return out

# ── 반격 — 불붙은 비늘 창(64×20, 기준점 4,10). 0~1 돋음 · 2~4 날아감 · 5 꺼짐 ──
def spike_cells():
    out = []
    for f in range(6):
        c = Cv(64, 20); L = [20, 44, 58, 58, 52, 40][f]; tail = [0, 8, 22, 34, 40, 38][f]
        for i in range(int(tail)):   # 뒤 불꼬리
            t = i / max(1, tail); x = 4 + L * .3 - i * .9
            w = 4 * (1 - t)
            c.rect(x, 10 - w / 2, 1, max(1, w), al(F[3] if t < .4 else F[1], .9 * (1 - t)))
        c.fillpoly([(4 + L * .25, 10 - 4), (4 + L, 10), (4 + L * .25, 10 + 4), (4 + L * .15, 10)], R[3] if f < 5 else R[2])
        c.fillpoly([(4 + L * .3, 10 - 2), (4 + L * .96, 10), (4 + L * .3, 10)], F[4] if f < 5 else F[2])
        c.line(4 + L * .3, 10, 4 + L * .97, 10, F[6] if f < 4 else F[3])
        if f < 5: star(c, 4 + L, 10, 2 if f in (1, 2) else 1, F[5])
        outline(c, al(R[0], .8))
        out.append(c)
    return out

# ── 반룡 날개(128×80, 어깨 사이 기준 64,46) — 등에 붙는 용 날개 한 쌍. 팔뼈 · 손가락뼈 셋 · 막 · 엄지 발톱.
#    0~5 펼쳐짐 · 6~9 날갯짓(반복). 줄 0 검붉은 · 1 보라 잔상(연마 130) — 몸 높이 75 에 맞춰 1배로 그린다 ──
def wing_draw(c, ox, oy, side, u, beat, pal):
    mem, mem2, bone, hi, edge = pal
    rot = (-1.25 + 0.6 * u) + beat                   # 팔뼈 각(위로 접힘 → 비스듬히 펼침)
    L1 = 10 + 20 * u
    S = (ox + side * 3, oy)
    Wr = (S[0] + side * math.cos(rot) * L1, S[1] + math.sin(rot) * L1)
    fing = [(0.25, 40), (0.85, 34), (1.4, 24)]
    tips = []
    for fa, fl in fing:
        a = rot + (fa * (0.35 + 0.65 * u)) + beat * 0.6
        L = fl * (0.35 + 0.65 * u)
        tips.append((Wr[0] + side * math.cos(a) * L, Wr[1] + math.sin(a) * L))
    B = (ox + side * 2, oy + 16)
    # 막 — 손가락 끝 사이를 안으로 휘어 들어간 물결 모양으로
    pts = [S, Wr, tips[0]]
    for i in range(len(tips)):
        a_ = tips[i]; b_ = tips[i + 1] if i + 1 < len(tips) else B
        mx, my = (a_[0] + b_[0]) / 2, (a_[1] + b_[1]) / 2
        cx_, cy_ = (Wr[0] * .3 + mx * .7), (Wr[1] * .3 + my * .7)
        for k in range(1, 6):
            t = k / 6; q = 4 * t * (1 - t)
            pts.append((a_[0] + (b_[0] - a_[0]) * t + (cx_ - mx) * q * .5, a_[1] + (b_[1] - a_[1]) * t + (cy_ - my) * q * .5))
        pts.append(b_)
    c.fillpoly(pts, mem)
    # 막 위쪽은 밝게(디더)
    tmp = Cv(c.w, c.h); tmp.fillpoly([S, Wr, tips[0], tips[1]], mem2)
    m = (tmp.a[..., 3] > 0)
    yy, xx = np.mgrid[0:c.h, 0:c.w]
    m &= BAYER[yy % 4, xx % 4] < .5
    c.a[m] = mem2
    # 뼈 — 팔 · 손가락(2px) · 끝 발톱
    def bone_line(a_, b_, w2=True):
        c.line(a_[0], a_[1], b_[0], b_[1], bone)
        if w2: c.line(a_[0], a_[1] - 1, b_[0], b_[1] - 1, hi)
    bone_line(S, Wr)
    for t_ in tips: bone_line(Wr, t_, False); c.px(t_[0], t_[1], edge)
    c.disc(Wr[0], Wr[1], 1.6, 1.6, hi)
    th = (Wr[0] + side * 3, Wr[1] - 5); c.line(Wr[0], Wr[1], th[0], th[1], edge); c.px(th[0] + side, th[1] + 1, edge)   # 엄지 발톱
def awake_cells():
    out = []
    pals = [(R[1], R[2], R[4], F[3], G[4]), (al(V[1], .75), al(V[2], .75), al(V[3], .9), al(V[4], .9), al(V[4], .9))]
    for row in range(2):
        for f in range(10):
            c = Cv(128, 80); u = ez(min(1, (f + 1) / 6)) if f < 6 else 1
            beat = [0, 0, 0, 0, 0, 0, -0.16, 0, 0.14, 0][f]
            for side in (-1, 1): wing_draw(c, 64, 46, side, u, beat, pals[row])
            if row == 0 and f < 6:
                for i in range(10):
                    a = rnd(31, i, f) * TAU; d = 20 + u * 34 * rnd(33, i)
                    c.px(64 + math.cos(a) * d, 40 + math.sin(a) * d * .6, F[5] if i % 2 else F[3])
            outline(c, al(R[0] if row == 0 else V[0], .8))
            out.append(c)
    return out

# ── 아르카디온(손에 드는 용의 대검, 92×30, 손잡이 기준 14,15 · 오른쪽을 가리킨다) — 금빛 날개 코등이 · 붉은 용옥 · 검붉은 날 · 가운데 흐르는 불빛 홈 · 등의 용 이빨.
#    줄 0 기본(불빛 0~3 흐름 반복) · 줄 1 역린 해방(보라 테) ──
def arcadion_cells():
    out = []
    for row in range(2):
        for f in range(4):
            c = Cv(92, 30); gx, gy = 14, 15
            c.disc(gx - 10, gy, 2.6, 2.6, G[3]); c.disc(gx - 10, gy, 1.4, 1.4, R[4])      # 끝 장식(용옥)
            c.rect(gx - 8, gy - 1, 9, 3, R[0]);
            for i in range(0, 9, 2): c.px(gx - 8 + i, gy - 1, R[2])                     # 감긴 손잡이
            # 코등이 — 뒤로 젖힌 금빛 날개 한 쌍
            for s in (-1, 1):
                c.fillpoly([(gx + 1, gy + s * 1), (gx - 3, gy + s * 10), (gx + 1, gy + s * 8), (gx + 4, gy + s * 11), (gx + 5, gy + s * 2)], rgb("#C9932E"))
                c.line(gx + 1, gy + s * 2, gx - 2, gy + s * 9, rgb("#F3D37A"))
            c.disc(gx + 3, gy, 2.2, 2.2, R[3]); c.px(gx + 2, gy - 1, F[6])                # 가운데 용옥
            # 칼날 — 넓고 끝이 뾰족하다. 등에 용 이빨
            L = 72; x0 = gx + 6
            c.fillpoly([(x0, gy - 6), (x0 + L * .78, gy - 5), (x0 + L, gy), (x0 + L * .78, gy + 6), (x0, gy + 6)], rgb("#3B1418"))
            c.fillpoly([(x0, gy - 5), (x0 + L * .76, gy - 4), (x0 + L * .97, gy), (x0, gy)], rgb("#6E2228"))
            for i in range(7):   # 등 이빨
                tx = x0 + 6 + i * 8; c.fillpoly([(tx, gy - 6), (tx + 3, gy - 9 + (i % 2)), (tx + 5, gy - 6)], rgb("#56191E"))
            c.line(x0, gy + 6, x0 + L * .78, gy + 6, rgb("#F1C9A8")); c.line(x0 + L * .78, gy + 6, x0 + L, gy, rgb("#F1C9A8"))   # 날 빛
            c.line(x0, gy - 6, x0 + L * .78, gy - 5, rgb("#A1464A"))
            for i in range(int(L * .8)):   # 가운데 불빛 홈 — 손잡이에서 끝으로 흐른다
                x = x0 + 2 + i; ph = (i / 10 - f / 4 * 1.0) % 1
                c.px(x, gy + 1, F[6] if ph < .2 else F[4] if ph < .5 else F[2])
                if ph < .35: c.px(x, gy, al(F[3], .8))
            if row == 1:
                outline(c, al(V[3], .95))
            outline(c, R[0])
            out.append(c)
    return out

# ── 큰 참격(160×120, 기준점 20,60 · 반지름 100) — 아르카디온 · 천공강습. 줄 0 불꽃 · 1 보라(2타 · 역린). 7칸 ──
def arc_cells():
    out = []
    for row in range(2):
        pal = SLASH_FIRE if row == 0 else SLASH_VIO
        for f in range(7):
            c = Cv(160, 120); sweep = ez(min(1, (f + 1) / 2.5)); fade = 0 if f < 3 else (f - 2) / 4.2
            slash_arc(c, 20, 60, 100, -1.35, 1.35, 26 if row else 22, 0.62, pal, sweep, fade, seed=7 + row)
            slash_arc(c, 20, 60, 64, -1.15, 1.15, 9, 0.62, pal[1:], sweep * .95, min(1, fade + .2), seed=9, ghost=False)
            if f < 5: speed_lines(c, 20, 60, 100, -1.3, -1.3 + 2.6 * sweep, 0.62, al(pal[2], .9), 13 + f + row, n=12, ln=16)
            if f < 6:
                for i in range(20):
                    a = -1.3 + 2.6 * sweep * rnd(87 + row, i, f); d = 80 + rnd(89, i, f) * 34
                    star(c, 20 + math.cos(a) * d, 60 + math.sin(a) * d * .62, 1 if i % 4 == 0 and f < 3 else 0, pal[2] if f < 3 else pal[4])
            outline(c, al(R[0] if row == 0 else V[0], .7))
            out.append(c)
    return out

# ── 회오리 베기(120×80, 가운데 기준 · 반지름 54) — 천공강습. 둥근 참격 두 겹이 돌며 불꽃을 흩뿌린다. 6칸 ──
def spin_cells():
    out = []
    for f in range(6):
        c = Cv(120, 80); sweep = ez(min(1, (f + 1) / 2.2)); fade = 0 if f < 3 else (f - 2) / 3.5
        a0 = f * 0.9
        slash_arc(c, 60, 40, 56, a0, a0 + 5.2, 15, 0.62, SLASH_FIRE, sweep, fade, seed=21)
        slash_arc(c, 60, 40, 36, a0 + 3.1, a0 + 3.1 + 4.0, 8, 0.62, SLASH_FIRE[1:], sweep, min(1, fade + .15), seed=23, ghost=False)
        if f < 5:
            for i in range(18):
                a = rnd(25, i, f) * TAU; d = 46 + rnd(27, i, f) * 14
                star(c, 60 + math.cos(a) * d, 40 + math.sin(a) * d * .62, 1 if i % 5 == 0 else 0, F[5] if f < 3 else F[3])
        outline(c, al(R[0], .7))
        out.append(c)
    return out

# ── 돌진 불꼬리 한 마디(64×32, 가운데 기준 · 오른쪽으로 나아간다) — 0~1 타오름 · 2~5 꺼져 감. 길 따라 이어 붙인다 ──
def trail_cells():
    out = []
    for f in range(6):
        c = Cv(64, 32); u = f / 5
        for x in range(64):
            t = x / 63
            w = (9 - u * 5) * (0.55 + 0.45 * math.sin(t * math.pi)) + math.sin(x * .7 + f * 2) * 1.4
            for y in range(int(16 - w), int(16 + w) + 1):
                k = abs(y - 16) / max(1, w)
                if BAYER[y % 4, x % 4] < u * .8 + k * .3: continue
                col = (W if k < .15 and f < 2 else F[5] if k < .35 else F[3] if k < .65 else F[1]) if f < 3 else (F[3] if k < .3 else F[1] if k < .7 else R[2])
                c.px(x, y - u * 3 * k, col)
        for i in range(10):
            if f > 4: break
            x = rnd(31, i, f) * 64; y = 16 + (rnd(33, i, f) - .5) * 20 - u * 6
            c.px(x, y, F[5] if i % 2 else F[3])
        out.append(c)
    return out

# ── 땅 충격파 고리(200×120, 그림 속 반지름 92) — 바닥을 쓸고 나가는 불길 띠 · 1px 밝은 테. 7칸 ──
def wave_cells():
    out = []
    for f in range(7):
        c = Cv(200, 120); u = f / 6; rr = 20 + 72 * ez(u)
        c.band(100, 60, rr, rr * SQ, .8, 1, al(F[2] if f < 3 else R[3], .9), dens=lambda d: (1 - u * .9) * (d - .8) / .2)
        c.band(100, 60, rr, rr * SQ, .9, 1, F[4] if f < 4 else F[2], dens=1 - u * .6)
        c.ring(100, 60, rr, rr * SQ, F[6] if f < 3 else F[4], gap=0 if f < 5 else 2)
        for i in range(int(16 + rr * .3)):
            if f > 5: break
            a = i * TAU / (16 + rr * .3) + rnd(5, i) * .2
            x, y = 100 + math.cos(a) * rr, 60 + math.sin(a) * rr * SQ
            hh = (6 - f) * (1 + rnd(7, i))
            c.line(x, y, x, y - hh, F[3] if i % 2 else F[2])
        out.append(c)
    return out

# ── 솟는 불길(28×48, 바닥 기준 14,46) — 범위 안을 촘촘히 채우는 큰 불혀. 8칸 ──
def flare_cells():
    out = []
    for f in range(8):
        c = Cv(28, 48); u = f / 7
        hgt = 40 * math.sin(min(1, (f + 1) / 4) * math.pi / 2) * (1 - max(0, u - .6) * 1.6)
        for y in range(int(hgt)):
            t = y / max(1, hgt)
            w = 7.5 * (1 - t) ** .9 * (1 - u * .3) + math.sin(y * .35 + f) * .5
            for x in range(int(14 - w), int(14 + w) + 1):
                k = abs(x - 14) / max(1, w)
                if u > .6 and BAYER[y % 4, x % 4] < (u - .6) * 2.2: continue
                col = W if (k < .2 and t < .3 and f < 4) else F[5] if k < .4 and t < .6 else F[3] if k < .7 else F[1]
                c.px(x + math.sin(t * 3 + f) * t * 3, 46 - y, col)
        if f >= 5: smoke(c, 14, 46 - hgt - 4, 5 + (f - 5) * 2, (f - 5) / 3)
        outline(c, al(R[0], .5))
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
    sheets["wy_claw"] = pack("wy_claw", claw_cells(), None, man, cx=10, cy=48, r=88)
    sheets["wy_hit"] = pack("wy_hit", hit_cells(), None, man)
    sheets["wy_wyvern"] = pack("wy_wyvern", wyvern_cells(), 7, man, cx=146, cy=92, rows=2)
    sit, scx, scy, smouth = wy_sit_cells()
    sheets["wy_sit"] = pack("wy_sit", sit, 3, man, cx=scx, cy=scy, rows=2, mouth=list(smouth))
    sheets["wy_shade"] = pack("wy_shade", shade_cells(), None, man, loop=1)
    sheets["wy_ball"] = pack("wy_ball", ball_cells(), None, man, cx=12, cy=10, loop=1)
    sheets["wy_sigil"] = pack("wy_sigil", sigil_cells(), None, man)
    sheets["wy_portal"] = pack("wy_portal", portal_cells(), None, man, cx=18, cy=36)
    sheets["wy_puff"] = pack("wy_puff", puff_cells(), None, man, cy=18)
    sheets["wy_crack"] = pack("wy_crack", crack_cells(), 4, man, r=90)
    sheets["wy_drop"] = pack("wy_drop", drop_cells(), None, man, cx=20, cy=104)
    sheets["wy_scale"] = pack("wy_scale", scale_cells(), 8, man, cx=38, cy=90)
    sheets["wy_spike"] = pack("wy_spike", spike_cells(), None, man, cx=4, cy=10)
    sheets["wy_awake"] = pack("wy_awake", awake_cells(), 10, man, cx=64, cy=46, rows=2)
    sheets["wy_pillar"] = pack("wy_pillar", pillar_cells(), None, man, cx=36, cy=152)
    sheets["wy_icons"] = pack("wy_icons", icon_cells(), None, man, cx=0, cy=0)
    sheets["wy_bits"] = pack("wy_bits", bit_cells(), 8, man, rows=len(BIT_KINDS))
    sheets["wy_blade"] = pack("wy_blade", arcadion_cells(), 4, man, cx=14, cy=15, rows=2)
    sheets["wy_arc"] = pack("wy_arc", arc_cells(), 7, man, cx=20, cy=60, rows=2, r=100)
    sheets["wy_spin"] = pack("wy_spin", spin_cells(), None, man, r=54)
    sheets["wy_trail"] = pack("wy_trail", trail_cells(), None, man)
    sheets["wy_wave"] = pack("wy_wave", wave_cells(), 4, man, r=92)
    sheets["wy_flare"] = pack("wy_flare", flare_cells(), None, man, cx=14, cy=46)
    # 가방 · 상점 그림(128×128) — 아르카디온 한 칸을 대각선으로 세워 키운다(rpg/weapons/wy_arcadion.webp, shop.js specialArt)
    bl = Image.fromarray(sheets["wy_blade"][:30, :92], "RGBA").rotate(35, Image.NEAREST, expand=True)
    bb = bl.getbbox(); bl = bl.crop(bb); k = max(1, int(118 // max(bl.size)))
    bl = bl.resize((bl.size[0] * k, bl.size[1] * k), Image.NEAREST)
    ic = Image.new("RGBA", (128, 128), (0, 0, 0, 0)); ic.paste(bl, ((128 - bl.size[0]) // 2, (128 - bl.size[1]) // 2), bl)
    ic.save(os.path.join(OUT, "..", "..", "..", "..", "weapons", "wy_arcadion.webp"), lossless=True, quality=100, method=6)
    json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        os.makedirs(sys.argv[2], exist_ok=True)
        for k, im in sheets.items():
            z = 4 if im.shape[1] < 300 else 2 if im.shape[1] < 900 else 1
            bg = np.zeros((im.shape[0], im.shape[1], 4), np.uint8); bg[..., :3] = (58, 74, 52); bg[..., 3] = 255
            a = im[..., 3:4].astype(float) / 255; bg[..., :3] = (im[..., :3] * a + bg[..., :3] * (1 - a)).astype(np.uint8)
            Image.fromarray(bg, "RGBA").resize((im.shape[1] * z, im.shape[0] * z), Image.NEAREST).save(os.path.join(sys.argv[2], k + ".png"))
    for k, v in man.items(): print(k, v, os.path.getsize(os.path.join(OUT, k + ".webp")))

if __name__ == "__main__": main()
