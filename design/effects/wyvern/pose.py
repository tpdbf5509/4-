# 와이번 몸 자세 — 11월 18일 사용자 "와이번 자세들이야, 우리 와이번에도 적용해줘"(참고 그림 3장: 날개를 위로 · 아래로 친 옆모습 둘, 날개를 접고 앉은 모습 하나).
# 참고 그림은 자세만 본다(베끼지 않는다). 몸은 뼈대 점(머리 · 목 · 몸통 · 꼬리 · 다리 · 날개 손가락)으로 직접 그리고, 색은 사용자 와이번 그림(wyvern-ref.jpg)의 녹슨 붉은 갈색을 쓴다.
# 4배로 그려 1배로 줄이고(make.py 가 32색 · 1px 윤곽) 기준점(0,0)은 날 때 가슴 가운데 · 앉을 때 몸 아래 땅이다. 머리는 오른쪽.
import math
from PIL import Image, ImageDraw

SS = 4   # 4배로 그려 줄인다
def C(h): h = h.lstrip("#"); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)
def dk(c, k): return (int(c[0] * k), int(c[1] * k), int(c[2] * k), 255)
BODY = [C("#2a1813"), C("#3f241c"), C("#5a3328"), C("#77473a"), C("#93604f")]   # 몸 비늘 어둠 → 밝음
BELLY = [C("#6b4a3c"), C("#8c6a55"), C("#a88a70")]
MEM = [C("#4a1e16"), C("#6a2a1e"), C("#8a3a28"), C("#a44c33"), C("#bd6444")]    # 날개 막
BONE = [C("#24130e"), C("#3a2219"), C("#5a3a2c")]
HORN = [C("#5e4c3c"), C("#9a8670"), C("#c8b69a")]
SPIKE = C("#2a1610")
EYE = C("#ffb04a")

def bez(p, n=24):
    """점 여럿을 지나는 부드러운 선(카트멀-롬) — 몸 · 목 · 꼬리 뼈대"""
    out = []
    P = [p[0]] + list(p) + [p[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in range(2)))
    out.append(p[-1]); return out

class Pose:
    def __init__(s, w, h, ox, oy):
        s.w, s.h, s.ox, s.oy = w, h, ox, oy
        s.im = Image.new("RGBA", (w * SS, h * SS)); s.d = ImageDraw.Draw(s.im)
    def P(s, x, y): return ((x + s.ox) * SS, (y + s.oy) * SS)
    def poly(s, pts, c): s.d.polygon([s.P(*p) for p in pts], fill=c)
    def dot(s, x, y, r, c):
        X, Y = s.P(x, y); R = r * SS; s.d.ellipse((X - R, Y - R, X + R, Y + R), fill=c)
    def line(s, pts, c, w):
        s.d.line([s.P(*p) for p in pts], fill=c, width=max(1, int(w * SS)), joint="curve")
    def tube(s, path, r0, r1, pal, belly=None, spikes=0, seed=0):
        """굵기가 r0 → r1 로 가는 몸통 — 아래 어둠 · 위 밝음 세 겹(둥근 몸), 배 쪽 밝은 띠, 등 가시"""
        pts = bez(path, 18); n = len(pts)
        rad = [r0 + (r1 - r0) * i / (n - 1) for i in range(n)]
        for i, (x, y) in enumerate(pts): s.dot(x, y + rad[i] * 0.15, rad[i], pal[0])
        for i, (x, y) in enumerate(pts): s.dot(x, y - rad[i] * 0.12, rad[i] * 0.82, pal[1])
        for i, (x, y) in enumerate(pts): s.dot(x, y - rad[i] * 0.38, rad[i] * 0.45, pal[2])
        for i, (x, y) in enumerate(pts):
            if i % 3 == 0: s.dot(x, y - rad[i] * 0.55, rad[i] * 0.2, pal[3])
        if belly:
            for i, (x, y) in enumerate(pts): s.dot(x, y + rad[i] * 0.55, rad[i] * 0.42, belly[0] if i % 4 else belly[1])
        if spikes:
            for i in range(2, n - 2, spikes):
                x, y = pts[i]; (ax, ay), (bx, by) = pts[i - 1], pts[i + 1]
                dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1; nx, ny = dy / L, -dx / L   # 등 쪽(위)
                if ny > 0: nx, ny = -nx, -ny
                r = rad[i]; h = r * 0.5 + 1.0
                s.poly([(x + nx * r * 0.8 - dx / L * 1.4, y + ny * r * 0.8 - dy / L * 1.4), (x + nx * (r + h) - dx / L * 2.2, y + ny * (r + h) - dy / L * 2.2), (x + nx * r * 0.8 + dx / L * 1.2, y + ny * r * 0.8 + dy / L * 1.2)], SPIKE)
        return pts, rad
    def limb(s, pts, r0, r1, pal):
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]; n = max(8, int(math.hypot(x1 - x0, y1 - y0) * 2))
            for k in range(n + 1):
                t = k / n; r = r0 + (r1 - r0) * (i + t) / (len(pts) - 1)
                s.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, pal[0])
        for i in range(len(pts) - 1):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]; n = max(8, int(math.hypot(x1 - x0, y1 - y0) * 2))
            for k in range(n + 1):
                t = k / n; r = r0 + (r1 - r0) * (i + t) / (len(pts) - 1)
                s.dot(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - r * 0.3, r * 0.6, pal[2])
    def claws(s, x, y, dirx, n=3, ln=4):
        for k in range(n):
            a = math.radians(70 - k * 28) if dirx > 0 else math.radians(110 + k * 28)
            s.line([(x, y), (x + math.cos(a) * ln, y + math.sin(a) * ln)], HORN[1], 0.9)
    def wing(s, sh, el, wr, tips, root, pal, bone, dark=1.0):
        """날개 — 어깨 · 팔꿈치 · 손목 · 손가락 끝들 · 몸 뿌리. 손가락 사이 막은 안으로 휜 가장자리(물갈퀴처럼)"""
        pal = [dk(c, dark) for c in pal]; bone = [dk(c, dark) for c in bone]
        edge = []
        seq = list(tips) + [root]
        for i in range(len(seq) - 1):
            a, b = seq[i], seq[i + 1]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            # 막 가장자리는 손목 쪽으로 오목하게 들어간다
            k = 0.42 if i < len(seq) - 2 else 0.22
            cx, cy = mx + (wr[0] - mx) * k, my + (wr[1] - my) * k
            for t in (0.0, 0.25, 0.5, 0.75):
                x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * cx + t * t * b[0]
                y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]
                edge.append((x, y))
        edge.append(root)
        main, mdraw = s.im, s.d
        s.im = Image.new("RGBA", main.size); s.d = ImageDraw.Draw(s.im)   # 막 한 겹 — 음영이 가장자리 밖으로 나가지 않게 막 모양으로 자른다
        mask = Image.new("L", main.size); ImageDraw.Draw(mask).polygon([s.P(*p) for p in [sh, el, wr] + edge], fill=255)
        s.poly([sh, el, wr] + edge, pal[2])
        # 막 음영 — 손가락 사이 칸마다 뿌리 쪽 어둡고 가장자리 밝게
        for i, t in enumerate(tips):
            nxt = tips[i + 1] if i + 1 < len(tips) else root
            s.poly([wr, (wr[0] + (t[0] - wr[0]) * 0.55, wr[1] + (t[1] - wr[1]) * 0.55), (wr[0] + (nxt[0] - wr[0]) * 0.5, wr[1] + (nxt[1] - wr[1]) * 0.5)], pal[1])
            s.poly([(t[0] + (nxt[0] - t[0]) * 0.15, t[1] + (nxt[1] - t[1]) * 0.15), (wr[0] + (t[0] - wr[0]) * 0.8, wr[1] + (t[1] - wr[1]) * 0.8), (wr[0] + (nxt[0] - wr[0]) * 0.78, wr[1] + (nxt[1] - wr[1]) * 0.78), (t[0] + (nxt[0] - t[0]) * 0.55, t[1] + (nxt[1] - t[1]) * 0.55)], pal[3])
        s.poly([sh, el, wr, (root[0] * 0.5 + wr[0] * 0.5, root[1] * 0.5 + wr[1] * 0.5), root], pal[1])
        for i in range(len(edge) - 1):   # 가장자리 안쪽 옅은 테(얇은 막이 빛에 비친다)
            s.line([edge[i], edge[i + 1]], pal[4], 1.0)
        lay = s.im; lay.putalpha(Image.composite(lay.getchannel("A"), Image.new("L", lay.size), mask))
        main.alpha_composite(lay); s.im, s.d = main, mdraw
        # 뼈 — 팔(굵게) · 손가락(가늘게)
        s.line([sh, el, wr], bone[1], 2.6); s.line([sh, el, wr], bone[2], 1.2)
        for t in tips: s.line([wr, t], bone[0], 1.3)
        s.line([wr, tips[0]], bone[1], 1.6)
        s.dot(wr[0], wr[1], 2.0, bone[1]); s.dot(wr[0], wr[1], 1.0, HORN[1])
        thumb = (wr[0] + (wr[0] - el[0]) * 0.18 + 2, wr[1] + (wr[1] - el[1]) * 0.18 - 1)
        s.line([wr, thumb], HORN[1], 1.0)
    def head(s, x, y, ang, gape=0.0):
        """머리 — (x,y) 목 끝, ang 바라보는 각도(라디안, 0 = 오른쪽). 11월 18일 사용자 "얼굴 와이번처럼"(참고 그림 둘):
        길고 좁은 주둥이 끝이 아래로 살짝 굽고, 이빨이 드러난 긴 아래턱, 머리 뒤로 왕관처럼 뻗은 가시 다섯, 볼 · 턱 밑 가시, 눈 위 툭 튀어나온 눈두덩"""
        ca, sa = math.cos(ang), math.sin(ang)
        def R(u, v): return (x + u * ca - v * sa, y + u * sa + v * ca)
        g = gape
        # 머리 뒤 가시 왕관(뒤 → 앞으로 작아진다) — 몸보다 먼저(뒤에) 그린다
        for k, (u, v, L, up) in enumerate([(-2, -3, 15, -5), (0, -5, 17, -9), (3, -6, 15, -12), (6, -7, 11, -13), (9, -7, 7, -12)]):
            s.poly([R(u, v + 2), R(u - L, v + up * 0.55), R(u - L + 2, v + up * 0.55 - 1.5), R(u + 3, v)], BONE[2] if k % 2 else HORN[0])
        # 아래턱 — 길고 가늘다, 벌리면 아래로 내려간다
        jaw = [R(0, 3), R(14, 4 + g * 6), R(27, 4 + g * 10), R(28, 6 + g * 10), R(14, 8 + g * 5), R(0, 8)]
        s.poly(jaw, BODY[1]); s.poly([R(2, 6), R(14, 7 + g * 5), R(24, 6 + g * 9)], BELLY[0])
        if g > 0.1:   # 입 속 · 이빨
            s.poly([R(6, 2), R(28, 2), R(27, 4 + g * 9), R(12, 5 + g * 5), R(4, 5)], C("#7a2018"))
            s.poly([R(10, 3), R(26, 3), R(25, 4 + g * 6), R(12, 4 + g * 3)], C("#b8402a"))
            for k in range(5):
                u = 9 + k * 3.6
                s.poly([R(u, 2), R(u + 0.8, 4.2), R(u + 1.6, 2)], HORN[2])                       # 윗니
                s.poly([R(u + 1.5, 4 + g * (5 + k * 0.9)), R(u + 2.3, 1.6 + g * (5 + k * 0.9)), R(u + 3.1, 4 + g * (5 + k * 0.9))], HORN[2])   # 아랫니
        # 윗머리 · 주둥이 — 끝이 아래로 굽은 매부리
        s.poly([R(-4, -3), R(4, -7), R(12, -7), R(22, -4), R(29, -1), R(31, 2), R(29, 4), R(14, 3), R(0, 5)], BODY[2])
        s.poly([R(4, -6), R(12, -6), R(22, -3), R(28, -1), R(16, -2), R(8, -4)], BODY[3])
        s.poly([R(6, -6), R(13, -9), R(16, -6)], BODY[1])   # 눈두덩
        s.poly([R(28, -1), R(31, 2), R(30, 5), R(28, 3)], BODY[1])   # 굽은 코끝
        s.dot(*R(30, 0.5), 0.5, BONE[0])   # 콧구멍
        if g <= 0.1:
            for k in range(4): s.poly([R(12 + k * 4, 3), R(12.8 + k * 4, 5.2), R(13.6 + k * 4, 3)], HORN[2])   # 다문 입에도 엄니가 비친다
        # 볼 가시 · 턱 밑 가시
        s.poly([R(-1, 2), R(-10, 3), R(-1, 5)], HORN[0]); s.poly([R(2, 7), R(-6, 11), R(4, 8)], HORN[0])
        # 눈 — 가늘고 사나운 눈매
        s.poly([R(10, -4), R(15, -4.6), R(14, -3), R(10, -3)], EYE); s.dot(*R(12.5, -3.8), 0.5, C("#fff1c8"))
        return R(29, 3 + g * 5)
    def leg(s, hip, knee, ank, foot, dirx=1):
        s.limb([hip, knee], 4.5, 3.2, BODY); s.limb([knee, ank, foot], 2.6, 1.6, BODY)
        s.claws(foot[0], foot[1], dirx)
    def done(s):
        return s.im.resize((s.w, s.h), Image.BOX)

# ── 날기 — 참고 그림 둘(날개 위 · 아래)을 이어 네 칸 날갯짓. 몸은 거의 수평, 목은 앞으로 조금 들고, 꼬리는 뒤로 길게 물결친다 ──
# 날개 점(어깨 기준): 팔꿈치 · 손목 · 손가락 끝 넷(앞 → 뒤). 먼 날개는 조금 작고 어둡게 몸 뒤에.
FLY_W, FLY_H, FLY_OX, FLY_OY = 244, 232, 140, 128
SH = (2, -6)
WINGS = [   # 0 위로 다 올림(참고 2) · 1 내리치는 중 · 2 아래로 다 내림(참고 1) · 3 접으며 올림 — 날개 길이는 몸통의 세 배쯤(참고 그림 비율)
    dict(el=(-14, -30), wr=(4, -70), tips=[(18, -120), (-22, -108), (-50, -80), (-64, -42)], root=(-36, -2)),
    dict(el=(-18, -16), wr=(6, -40), tips=[(2, -88), (-38, -82), (-68, -56), (-78, -22)], root=(-36, -1)),
    dict(el=(-12, 10), wr=(4, 38), tips=[(-6, 96), (-32, 86), (-56, 60), (-62, 26)], root=(-36, 3)),
    dict(el=(-20, -18), wr=(-8, -50), tips=[(-28, -94), (-56, -78), (-74, -50), (-78, -18)], root=(-36, -1)),
]
FLY_TILT = [-3, 0, 3, 0]          # 몸 들썩임(px) — 날개를 내리치면 몸이 올라간다
def _add(a, b): return (a[0] + b[0], a[1] + b[1])

def fly_pose(f, gape=0.0):
    """f 0~3 날갯짓, gape > 0 이면 입을 벌린다(불 뿜기). 돌려주는 값: 1배 RGBA 그림 · 입 자리(기준점에서)"""
    s = Pose(FLY_W, FLY_H, FLY_OX, FLY_OY)
    wg = WINGS[f]; lift = FLY_TILT[f]
    def W(p, k=1.0, off=(0, 0)): return (SH[0] + p[0] * k + off[0], SH[1] + p[1] * k + off[1] + lift)
    far = dict(sh=W((0, 0), 1, (8, -3)), el=W(wg["el"], 0.82, (8, -3)), wr=W(wg["wr"], 0.82, (8, -3)), tips=[W(t, 0.82, (8, -3)) for t in wg["tips"]], root=W(wg["root"], 0.82, (8, -3)))
    s.wing(far["sh"], far["el"], far["wr"], far["tips"], far["root"], MEM, BONE, 0.62)
    wav = [0, 2, 0, -2][f]
    tail = [(-30, 3 + lift), (-60, 6 + lift + wav), (-90, 2 + lift - wav), (-112, -4 + lift + wav)]
    s.tube(tail, 7, 1.2, BODY, spikes=4)
    tip = tail[-1]; s.poly([(tip[0] + 2, tip[1]), (tip[0] - 7, tip[1] - 4), (tip[0] - 9, tip[1] + 1), (tip[0] - 5, tip[1] + 4)], BODY[1])   # 꼬리 끝 가시
    s.leg((-24, 6 + lift), (-18, 15 + lift), (-30, 20 + lift), (-36, 22 + lift), -1)   # 뒷다리 — 뒤로 접어 붙인다
    s.tube([(-36, 2 + lift), (-12, 1 + lift), (8, -2 + lift)], 12, 10, BODY, belly=BELLY, spikes=3)
    neck = [(6, -4 + lift), (20, -12 + lift), (36, -16 + lift)]
    s.tube(neck, 7, 4.5, BODY, belly=BELLY, spikes=3)
    s.leg((-22, 7 + lift), (-14, 14 + lift), (-24, 19 + lift), (-29, 21 + lift), -1)
    mouth = s.head(neck[-1][0] + 1, neck[-1][1] - 1, math.radians(8 + gape * 6), gape)
    s.wing(W((0, 0)), W(wg["el"]), W(wg["wr"]), [W(t) for t in wg["tips"]], W(wg["root"]), MEM, BONE)
    return s.done(), (round(mouth[0]), round(mouth[1]))

# ── 앉기 — 11월 18일 사용자 참고 그림(엎드린 와이번 둘)대로 다시: 몸을 땅에 낮게 붙이고, 접은 날개 팔로 앞을 짚는다 ──
# 팔꿈치가 몸 위로 가장 높이 솟고, 손목은 앞쪽 땅을 짚어 발톱을 세운다. 손가락 · 막은 몸 옆을 따라 뒤로 접혀 눕는다.
# 목은 앞 위로 들고 머리는 앞을 노려본다(입을 살짝 벌림). 뒷다리는 몸 아래 접고 꼬리는 땅을 따라 뒤로 눕는다. 기준점 = 몸 아래 땅.
SIT_W, SIT_H, SIT_OX, SIT_OY = 210, 110, 122, 104
def sit_pose(breath=0, gape=0.0):
    s = Pose(SIT_W, SIT_H, SIT_OX, SIT_OY)
    b = breath
    def fold(o=(0, 0), dark=1.0):   # 접은 날개 — 어깨 · 팔꿈치(위로 솟음) · 손목(앞 땅) · 손가락 끝(몸 옆을 따라 뒤로)
        P = lambda x, y, by=1: (x + o[0], y + o[1] + b * by)
        sh, el, wr = P(4, -26), P(-12, -50), P(22, -4, 0)
        s.wing(sh, el, wr, [P(-30, -40), P(-42, -34), P(-54, -27), P(-64, -18, 0.5)], P(-30, -14), MEM, BONE, dark)
        pal = [dk(c, dark) for c in BODY]
        s.limb([sh, el], 5, 3.6, pal); s.limb([el, wr], 3.6, 2.6, pal)     # 접은 팔은 굵게 — 앞다리처럼 땅을 짚는다
        s.dot(el[0], el[1], 2.6, pal[1]); s.poly([(el[0] - 1, el[1] - 2), (el[0] - 7, el[1] - 8), (el[0] + 2, el[1] - 2)], HORN[0])   # 팔꿈치 가시
        s.claws(wr[0] + 1, wr[1] + 1, 1, 3, 5)
    fold((7, -3), 0.62)                                                     # 먼 날개
    tail = [(-34, -12), (-60, -6), (-86, -3), (-108, -5)]
    s.tube(tail, 8, 1.2, BODY, spikes=4)
    t = tail[-1]; s.poly([(t[0] + 2, t[1]), (t[0] - 7, t[1] - 4), (t[0] - 9, t[1] + 1), (t[0] - 5, t[1] + 3)], BODY[1])
    s.leg((-24, -14), (-12, -10), (-22, -3), (-14, -1), 1)                  # 먼 뒷다리
    s.tube([(-36, -14 + b * 0.4), (-14, -18 + b), (8, -24 + b)], 13, 11, BODY, belly=BELLY, spikes=3)
    neck = [(6, -26 + b), (18, -40 + b), (30, -50 + b), (40, -54 + b)]
    s.tube(neck, 8, 5, BODY, belly=BELLY, spikes=3)
    mouth = s.head(neck[-1][0] + 1, neck[-1][1] + 1, math.radians(12 + gape * 4), 0.25 + gape * 0.75)
    s.leg((-28, -14), (-14, -8), (-24, -2), (-16, 0), 1)                    # 가까운 뒷다리 — 몸 아래 접어 깔았다
    fold()                                                                 # 가까운 날개
    return s.done(), (round(mouth[0]), round(mouth[1]))
