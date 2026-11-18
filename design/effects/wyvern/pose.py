# 와이번 몸 자세 — 11월 18일 사용자 "와이번 자세들이야, 우리 와이번에도 적용해줘"(참고 그림 3장: 날개를 위로 · 아래로 친 옆모습 둘, 날개를 접고 앉은 모습 하나).
# 참고 그림은 자세만 본다(베끼지 않는다). 몸은 뼈대 점(머리 · 목 · 몸통 · 꼬리 · 다리 · 날개 손가락)으로 직접 그리고, 색은 사용자 와이번 그림(wyvern-ref.jpg)의 녹슨 붉은 갈색을 쓴다.
# 4배로 그려 1배로 줄이고(make.py 가 32색 · 1px 윤곽) 기준점(0,0)은 날 때 가슴 가운데 · 앉을 때 몸 아래 땅이다. 머리는 오른쪽.
import math
from PIL import Image, ImageDraw

SS = 4   # 4배로 그려 줄인다
HEAD_K = 0.8   # 머리 크기 — 11월 18일 사용자 "머리가 너무 커 비율 생각하면서" 로 1.2 → 0.8(참고 그림들처럼 머리는 몸통 길이의 절반쯤)
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

def _head_sprite():
    """사용자 머리 그림(도트) · 목 붙는 자리 · 입 · 눈 — head_prep.py 가 만든다. 없으면 코드 머리(head_rest)로 그린다."""
    try:
        import head_prep
        out = {}
        for closed in (False, True):   # 벌린 입(불 뿜기 칸) · 다문 입(날갯짓 · 숨쉬기)
            spr, n, m, e = head_prep.build(closed)
            out[closed] = (spr, n, (round(m[0]), round(m[1])), (round(e[0]), round(e[1])))
        return out
    except Exception as err:   # noqa — 원본 그림이 없을 때
        print("head sprite off:", err); return None
HEAD_SPRITE = _head_sprite()

class Pose:
    def __init__(s, w, h, ox, oy):
        s.w, s.h, s.ox, s.oy = w, h, ox, oy
        s.im = Image.new("RGBA", (w * SS, h * SS)); s.d = ImageDraw.Draw(s.im); s.eye = None
    def P(s, x, y): return ((x + s.ox) * SS, (y + s.oy) * SS)
    def poly(s, pts, c): s.d.polygon([s.P(*p) for p in pts], fill=c)
    def dot(s, x, y, r, c):
        X, Y = s.P(x, y); R = r * SS; s.d.ellipse((X - R, Y - R, X + R, Y + R), fill=c)
    def line(s, pts, c, w):
        s.d.line([s.P(*p) for p in pts], fill=c, width=max(1, int(w * SS)), joint="curve")
    def tube(s, path, r0, r1, pal, belly=None, spikes=0, seed=0, spk=1.0):
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
                r = rad[i]; h = (r * 0.5 + 1.0) * spk
                s.poly([(x + nx * r * 0.8 - dx / L * 1.4, y + ny * r * 0.8 - dy / L * 1.4), (x + nx * (r + h) - dx / L * 2.2, y + ny * (r + h) - dy / L * 2.2), (x + nx * r * 0.8 + dx / L * 1.2, y + ny * r * 0.8 + dy / L * 1.2)], SPIKE)
        return pts, rad
    def fin_tail(s, path, r0):
        """꼬리 — 등 가시에 더해 양옆으로 잎 모양 지느러미가 줄지어 나고(참고 그림의 붉은 꼬리 깃), 끝은 지느러미 둘이 달린 창날"""
        pts = bez(path, 18); n = len(pts)
        for i in range(4, n - 3, 5):   # 지느러미 — 몸통 뒤에 먼저
            (ax, ay), (bx, by) = pts[i - 1], pts[i + 1]; x, y = pts[i]
            dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1; dx, dy = dx / L, dy / L; nx, ny = dy, -dx
            if ny > 0: nx, ny = -nx, -ny
            r = r0 * (1 - i / n) + 1.2; h = 2.5 + r * 0.9
            for sg, col in ((1, MEM[2]), (-1, MEM[1])):
                s.poly([(x + dx * 2.2, y + dy * 2.2), (x + sg * nx * (r + h) - dx * 3.5, y + sg * ny * (r + h) - dy * 3.5), (x - dx * 3, y - dy * 3)], col)
        s.tube(path, r0, 1.2, BODY, spikes=4)
        (ax, ay), (x, y) = pts[-4], pts[-1]; dx, dy = x - ax, y - ay; L = math.hypot(dx, dy) or 1; dx, dy = dx / L, dy / L; nx, ny = dy, -dx
        s.poly([(x - dx * 1, y - dy * 1), (x + nx * 6 - dx * 2, y + ny * 6 - dy * 2), (x + dx * 9, y + dy * 9), (x - nx * 6 - dx * 2, y - ny * 6 - dy * 2)], MEM[2])   # 창날 끝 지느러미
        s.poly([(x, y), (x + nx * 2.5, y + ny * 2.5), (x + dx * 8, y + dy * 8), (x - nx * 2.5, y - ny * 2.5)], BODY[1])
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
        # 핏줄 · 줄무늬(참고 그림 — 손가락 뼈에서 막 가장자리로 갈라지는 굵고 가는 줄)
        bones = list(tips) + [root]
        for i in range(len(bones) - 1):
            a, b2 = bones[i], bones[i + 1]
            for k, t in enumerate((0.35, 0.6, 0.82)):
                p0 = (wr[0] + (a[0] - wr[0]) * t, wr[1] + (a[1] - wr[1]) * t)
                q = 0.45 + 0.12 * k; p1 = (a[0] + (b2[0] - a[0]) * q, a[1] + (b2[1] - a[1]) * q)
                p1 = (p0[0] + (p1[0] - p0[0]) * 0.75, p0[1] + (p1[1] - p0[1]) * 0.75)
                pm = ((p0[0] + p1[0]) / 2 + (wr[0] - p0[0]) * 0.06, (p0[1] + p1[1]) / 2 + (wr[1] - p0[1]) * 0.06)
                s.line([p0, pm, p1], pal[0], 0.9 if k == 1 else 0.6)
        mk = ImageDraw.Draw(mask)
        for i in range(2, len(edge) - 2, 3):   # 해진 가장자리 — 막 끝에 작은 찢김
            ex, ey = edge[i]; cx_, cy_ = wr
            dx, dy = cx_ - ex, cy_ - ey; L = math.hypot(dx, dy) or 1; dx, dy = dx / L * 3.2, dy / L * 3.2
            if (i // 3) % 2: mk.polygon([s.P(ex - dy * 0.35, ey + dx * 0.35), s.P(ex + dx, ey + dy), s.P(ex + dy * 0.35, ey - dx * 0.35)], fill=0)
        lay = s.im; lay.putalpha(Image.composite(lay.getchannel("A"), Image.new("L", lay.size), mask))
        main.alpha_composite(lay); s.im, s.d = main, mdraw
        # 뼈 — 팔(굵게) · 손가락(가늘게)
        s.line([sh, el, wr], bone[1], 2.6); s.line([sh, el, wr], bone[2], 1.2)
        for t in tips: s.line([wr, t], bone[0], 1.3)
        s.line([wr, tips[0]], bone[1], 1.6)
        s.dot(wr[0], wr[1], 2.0, bone[1]); s.dot(wr[0], wr[1], 1.0, HORN[1])
        thumb = (wr[0] + (wr[0] - el[0]) * 0.18 + 2, wr[1] + (wr[1] - el[1]) * 0.18 - 1)
        s.line([wr, thumb], HORN[1], 1.0)
    def head(s, x, y, ang, gape=0.0, lay=1.0):
        """머리 — (x,y) 목 끝, ang 바라보는 각도(라디안, 0 = 오른쪽). 11월 18일 사용자 참고 그림(울부짖는 용 얼굴)을 따른다:
        윗주둥이 끝이 매 부리처럼 아래로 굽은 갈고리, 크게 벌어지는 긴 아래턱 끝의 아래로 굽은 턱 가시, 위아래 긴 송곳니 줄,
        분홍빛 입속과 혀, 머리 위 · 뒤로 겹겹이 뻗은 가시 갈기, 볼 · 턱 모서리에서 뒤로 뻗는 가시, 굵은 눈두덩 아래 작은 노란 눈."""
        K = HEAD_K; ca, sa = math.cos(ang), math.sin(ang)
        def R(u, v): u, v = u * K, v * K; return (x + u * ca - v * sa, y + u * sa + v * ca)
        g = gape; op = g * 0.7   # 아래턱이 경첩(2,3)을 축으로 내려가는 각도(라디안)
        def J(u, v):
            du, dv = u - 2, v - 3; c, s_ = math.cos(op), math.sin(op)
            return R(2 + du * c - dv * s_, 3 + du * s_ + dv * c)
        DK, MID, LT = BODY[1], BODY[2], BODY[3]
        # 가시 갈기 — 머리 위에서 뒤로 겹겹이(뒤 줄부터, 길이 · 각도를 섞는다). 볼 · 턱 모서리 가시도 뒤로
        crest = [(-6, 2, 12, 0.35), (-4, -2, 16, -0.2), (-1, -5, 19, -0.5), (3, -7, 20, -0.75), (7, -8, 16, -0.95), (11, -8, 11, -1.15), (14, -7, 7, -1.3),
                 (-3, 4, 11, 0.6), (0, 6, 9, 0.9)]
        for k, (u, v, L, a_) in enumerate(crest):
            a_ *= lay if a_ < 0 else 1; d = math.pi - a_; L *= 1.0;   # lay < 1 — 뿔을 뒤로 눕힌다
            tx, ty = u + math.cos(d) * L, v + math.sin(d) * L   # 뒤쪽(왼쪽)으로, a_ 가 음수면 위 · 양수면 아래로 기운다
            w = 1.8 + L * 0.1; nx, ny = -math.sin(d) * w, math.cos(d) * w
            bend = (u + math.cos(d) * L * 0.6 - nx * 0.4, v + math.sin(d) * L * 0.6 - ny * 0.4 - 1)
            s.poly([R(u + nx, v + ny), R(*bend), R(tx, ty), R(u - nx, v - ny)], HORN[0] if k % 3 == 0 else (BONE[2] if k % 3 == 1 else DK))
            s.poly([R(u + nx * 0.3, v + ny * 0.3), R(bend[0] + 0.5, bend[1] - 0.4), R(tx, ty)], HORN[1] if k % 2 else LT)   # 가시 윗면 빛
        # 입속(벌렸을 때) — 목구멍 · 혀
        if g > 0.05:
            s.poly([R(3, 1), R(26, 2), J(26, 5), J(6, 6)], C("#4a1410"))
            s.poly([R(8, 2.5), R(24, 3), J(22, 4.5), J(9, 5)], C("#a85a4a"))   # 분홍빛 입천장
            s.poly([J(6, 4.6), J(18, 4.2), J(22, 3.0), J(16, 2.6 + g * 1.5), J(8, 3.6)], C("#c46a58"))   # 혀
        # 아래턱 — 길고, 끝에 아래로 굽은 턱 가시
        s.poly([J(1, 3), J(14, 4), J(25, 4.5), J(28, 6), J(27, 8.5), J(16, 8), J(2, 7.5)], DK)
        s.poly([J(4, 6.8), J(16, 7.4), J(25, 6.8)], BELLY[0])
        s.poly([J(24, 7.5), J(28.5, 8), J(26.5, 12)], DK)                     # 턱 끝 갈고리
        s.poly([J(4, 8), J(-4, 12), J(8, 8.6)], HORN[0])                      # 턱 밑 가시
        n = 8
        for k in range(n):   # 아랫니 — 위로 길게
            u = 6 + k * 2.6; L = 1.8 + (k / n) * 1.6 + (1.2 if k == n - 1 else 0)
            s.poly([J(u, 4.5), J(u + 0.6, 4.5 - L), J(u + 1.2, 4.5)], HORN[2])
        # 윗머리 — 이마에서 매부리 갈고리까지
        s.poly([R(-6, -2), R(2, -7), R(11, -8), R(19, -6), R(26, -3), R(31, 0), R(33, 3), R(32, 7), R(29.5, 4.5), R(26, 3.4), R(12, 3), R(0, 4)], MID)
        s.poly([R(2, -6), R(11, -7), R(19, -5), R(26, -2.5), R(30, 0), R(20, -3), R(10, -4.5)], LT)   # 콧등 빛
        s.poly([R(30, 0.5), R(33, 3), R(32, 7.5), R(30, 4.5)], DK)            # 갈고리 끝(아래로 굽음)
        s.poly([R(31.5, 4), R(32.3, 7.8), R(31, 6)], HORN[1])                  # 갈고리 끝 빛
        s.dot(*R(27, -0.8), 0.5, BONE[0])                                      # 콧구멍
        for k in range(n):   # 윗니 — 아래로 길게, 앞 송곳니가 가장 길다
            u = 7 + k * 2.6; L = 1.6 + (k / n) * 1.4 + (1.6 if k == n - 1 else 0)
            s.poly([R(u, 3.2), R(u + 0.6, 3.2 + L), R(u + 1.2, 3.2)], HORN[2])
        # 굵은 눈두덩 · 작은 노란 눈
        s.poly([R(6, -6), R(11, -10), R(18, -8.5), R(19, -5.5), R(12, -5.8)], DK)
        s.poly([R(11, -4.8), R(15.5, -5.2), R(15, -3.6), R(11.4, -3.6)], C("#1a0c08"))
        s.poly([R(12, -4.6), R(15, -4.9), R(14.5, -3.9), R(12.3, -3.9)], EYE)
        e = R(13.5, -4.3); s.eye = (e[0] + s.ox, e[1] + s.oy)   # 눈 자리(칸 좌표) — 32색으로 묶으면 작은 눈빛이 사라져 make.py 가 다시 찍는다
        return R(28, 3 + g * 6)
    def head_rest(s, x, y, ang, gape=0.0, k=1.0, snout=1.0, bare=False):
        """와이번 머리(오른쪽) — 11월 18일 사용자 기획: 2번 사진을 좌우로 뒤집은 옆얼굴. 대기 · 날기 같은 머리.
        주둥이는 눈앞에서 오른쪽으로 길고 낮게. 코끝에서 윗턱 · 아래턱이 거의 같은 자리에서 맞물린다(윗턱 끝이 아래턱 밑으로 꺾이지 않음).
        콧구멍은 코끝 바로 뒤 옆면. 아래턱은 코끝 쪽이 얇고 눈 아래로 갈수록 두껍다. 입선은 눈 아래 턱관절까지.
        턱관절 뒤에서 목 쪽으로 윤곽이 살짝 들어간다. 뿔은 뒤통수 위에서 목을 따라 길게 뒤로(2번 사진 위치 · 길이).
        bare=True 면 뿔 · 비늘 · 무늬 없이 윤곽만(참고 사진과 비교용). gape > 0(불 뿜기 칸)이면 아래턱만 조금 내린다."""
        if not bare and HEAD_SPRITE is not None:   # 11월 18일 사용자가 직접 그린 머리(head_prep.py → head.png)를 그대로 붙인다
            spr, (nx, ny), (mx, my), (ex, ey) = HEAD_SPRITE[gape <= 0.05]   # 공격(불 뿜기) 칸에서만 입을 벌린다
            px, py = round(x + s.ox - nx), round(y + s.oy - ny)
            s.im.alpha_composite(spr.resize((spr.width * SS, spr.height * SS), Image.NEAREST), (px * SS, py * SS))
            s.eye = (px + ex, py + ey)
            return (px + mx - s.ox, py + my - s.oy)
        ca, sa = math.cos(ang), math.sin(ang)
        def R(u, v):
            if u > 16: u = 16 + (u - 16) * snout
            u, v = u * k, v * k; return (x + u * ca - v * sa, y + u * sa + v * ca)
        op = gape * 0.3
        def J(u, v):   # 아래턱 — 턱관절(8,2)을 축으로
            du, dv = u - 8, v - 2; c, s_ = math.cos(op), math.sin(op)
            return R(8 + du * c - dv * s_, 2 + du * s_ + dv * c)
        DK, MID, LT, HI = BODY[0], BODY[2], BODY[3], BODY[4]
        SHADOW = C("#1e0f0a")
        # 윗머리 윤곽: 뒤통수 → 정수리 → 눈썹뼈 → 눈앞에서 한 단 낮아지는 콧등 → 길고 낮은 주둥이 → 코끝(아래로 꺾지 않음)
        upper = [R(-5, 3.5), R(-5, -4), R(-1, -8.5), R(5, -10), R(11, -9.6), R(15, -8),   # 두꺼운 두개골 · 이마
                 R(16.5, -5.6), R(20, -4.8), R(28, -4.0), R(35, -3.1), R(39, -2.1),       # 한 단 낮춘 콧등 → 낮은 주둥이
                 R(40.6, -0.8), R(40.6, 1.0), R(39.6, 1.7),                               # 둥글게 깎인 코끝 — 아래턱 끝과 같은 높이에서 끝난다
                 R(30, 1.9), R(20, 2.1), R(8, 2.0)]                                       # 윗턱 아랫선 = 입선 → 턱관절
        # 아래턱: 코끝 쪽 얇게(두께 1.2) → 눈 아래로 갈수록 두껍게 → 턱 모서리 → 목 쪽으로 살짝 파임
        lower = [J(39.4, 1.8), J(39.8, 2.6), J(38, 3.2), J(30, 4.3), J(21, 5.8), J(13, 7.4), J(7, 8.4),
                 J(4, 8.0), J(2.6, 6.2), J(8, 2.0)]
        notch = [J(2.6, 6.2), J(4, 8.0), R(-1, 8.6), R(-5, 6.5), R(-5, 3.5), R(0, 4.2)]   # 턱관절 뒤 → 목: 안으로 들어간 자리
        if bare:
            s.poly(lower, MID); s.poly(upper, MID); s.poly(notch, BODY[0])
            return R(40, 1.5 + gape * 3)
        # 뒤통수 뿔 — 정수리 뒤에서 목을 따라 길게 뒤로, 끝이 살짝 위로(2번 사진)
        s.poly([R(4, -9.4), R(-4, -12.2), R(-14, -14.0), R(-24, -16.4), R(-16, -10.6), R(-6, -6.0), R(1, -4.6)], BONE_DK[1])
        s.poly([R(2, -9.4), R(-6, -11.8), R(-15, -13.4), R(-22, -15.4), R(-14, -12.4), R(-5, -10.0)], BONE_DK[2])
        s.poly(lower, BODY[1])
        s.poly([J(8, 6.6), J(14, 6.6), J(22, 5.0), J(31, 3.8), J(38, 3.0), J(30, 4.3), J(21, 5.8), J(13, 7.4), J(7, 8.4)], BELLY[1])   # 아래턱 아랫면 — 턱 윤곽이 보이게
        if gape > 0.05: s.poly([R(10, 2.1), R(39, 1.8), J(39, 1.8), J(10, 2.2)], C("#5a1610"))
        s.poly(upper, MID)
        s.poly([R(-3, -7.6), R(2, -9.4), R(8, -9.6), R(13, -8.4), R(7, -8.0), R(1, -6.6)], LT)       # 정수리 빛
        s.poly([R(17.5, -5.0), R(28, -3.7), R(36, -2.8), R(30, -2.6), R(19, -3.6)], LT)               # 콧등 빛
        s.poly([R(38.4, -1.8), R(40.2, -0.7), R(40.2, 0.6), R(39.2, 0.2)], HI)                         # 코끝 빛
        s.poly([R(-4, -1), R(5, -2), R(8, 2.0), R(2.6, 6.2), R(-3, 4)], BODY[1])                       # 볼 · 턱관절 음영
        # 눈썹뼈 — 굵고 앞 끝이 콧등 쪽으로 낮아진다
        s.poly([R(4, -8.8), R(10, -10), R(15, -8.2), R(17, -5.4), R(15, -4.8), R(11, -6.8), R(5, -6.8)], BODY[3])
        s.poly([R(6, -9.2), R(10.5, -9.8), R(14.5, -8.2), R(10.5, -8.4)], HI)
        # 눈썹뼈 아래 짙은 그림자 · 그 안의 가늘고 짧은 호박색 눈(턱관절 바로 위)
        s.poly([R(6, -6.4), R(11, -6.6), R(16, -4.6), R(14.6, -3.0), R(9, -3.0), R(6.4, -4.0)], SHADOW)
        s.poly([R(9.4, -4.8), R(13.8, -4.4), R(13.4, -3.7), R(9.6, -4.0)], EYE)
        e = R(11.6, -4.3); s.eye = (e[0] + s.ox, e[1] + s.oy)
        s.dot(*R(37.6, -1.2), 0.6, SHADOW)                                                       # 콧구멍 — 코끝 바로 뒤 옆면
        # 입선 — 코끝 맞물림에서 눈 아래 턱관절까지
        s.line([R(39.6, 1.7), R(30, 1.95), R(20, 2.15), R(12, 2.15), R(8, 2.0)], SHADOW, 1.2)
        s.dot(*R(8, 2.2), 0.7, SHADOW)                                                           # 턱관절
        s.poly(notch, SHADOW)
        return R(40, 1.5 + gape * 3)
    def leg(s, hip, knee, ank, foot, dirx=1):
        s.limb([hip, knee], 4.5, 3.2, BODY); s.limb([knee, ank, foot], 2.6, 1.6, BODY)
        s.claws(foot[0], foot[1], dirx)
    def done(s):
        im = s.im.resize((s.w, s.h), Image.BOX); im.eye = s.eye; return im

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
    if f == 2:   # 내리친 날개 — 먼 날개는 가까운 날개 뒤에 겹친다
        far = dict(sh=W((0, 0), 1, (8, -3)), el=W(wg["el"], 0.82, (8, -3)), wr=W(wg["wr"], 0.82, (8, -3)), tips=[W(t, 0.82, (8, -3)) for t in wg["tips"]], root=W(wg["root"], 0.82, (8, -3)))
    else:        # 펼친 날개 — 참고 그림처럼 먼 날개는 머리 쪽(앞)으로 펼쳐져 보인다(가까운 날개를 좌우로 뒤집어 줄임)
        def Fw(p): return (SH[0] + 8 - p[0] * 0.72, SH[1] - 3 + p[1] * 0.8 + lift)
        far = dict(sh=Fw((0, 0)), el=Fw(wg["el"]), wr=Fw(wg["wr"]), tips=[Fw(t) for t in wg["tips"]], root=(SH[0] + 14, SH[1] + 4 + lift))
    s.wing(far["sh"], far["el"], far["wr"], far["tips"], far["root"], MEM, BONE, 0.62)
    wav = [0, 2, 0, -2][f]
    tail = [(-30, 3 + lift), (-62, 8 + lift + wav), (-94, 4 + lift - wav), (-118, -2 + lift + wav), (-128, -8 + lift)]   # 길게 물결치는 지느러미 꼬리
    s.fin_tail(tail, 7)
    s.leg((-24, 6 + lift), (-18, 15 + lift), (-30, 20 + lift), (-36, 22 + lift), -1)   # 뒷다리 — 뒤로 접어 붙인다
    s.tube([(-36, 2 + lift), (-12, 1 + lift), (8, -2 + lift)], 12, 10, BODY, belly=BELLY, spikes=3)
    hl = round(lift * 0.34)   # 머리 쪽은 들썩임을 줄인다 — 날갯짓 때 눈 자리가 튀지 않게(1px 안쪽)
    neck = [(6, -4 + lift), (20, -12 + (lift + hl) / 2), (36, -16 + hl)]
    s.tube(neck, 7, 4.2, BODY, belly=BELLY, spikes=3, spk=0.45)   # 목 가시는 낮게 — 뒤통수 뿔과 구분(11월 18일 사용자)
    s.leg((-22, 7 + lift), (-14, 14 + lift), (-24, 19 + lift), (-29, 21 + lift), -1)
    mouth = s.head_rest(neck[-1][0] + 1, neck[-1][1] - 0.5, math.radians(6), gape)   # 대기와 같은 머리(11월 18일 사용자)
    s.wing(W((0, 0)), W(wg["el"]), W(wg["wr"]), [W(t) for t in wg["tips"]], W(wg["root"]), MEM, BONE)
    return s.done(), (round(mouth[0]), round(mouth[1]))

# ── 앉기(지상 대기) — 11월 18일 사용자 기획: 2번 사진(웅크린 와이번)을 좌우로 뒤집은 옆모습 윤곽을 따른다. 1프레임 먼저 ──
# 목은 어깨에서 오른쪽 앞으로 길게 뻗고 머리는 어깨보다 조금만 높다. 주둥이는 길고 낮게, 뿔은 뒤로 눕힌다.
# 가슴 · 배는 땅 가까이, 뒷다리는 몸 아래 접고, 꼬리는 왼쪽으로 길게 가늘어지며 땅에 눕는다(끝을 들지 않는다).
# 앞다리는 날개다(따로 앞발 없음). 가까운 날개: 굵은 날개팔이 어깨에서 뒤 위 팔꿈치로 올라갔다가 앞 아래로 내려와 손목이 가슴 앞 땅을 짚고,
# 손목에서 긴 손가락뼈들이 왼쪽 뒤로 휘어 몸통 옆을 덮는다. 뼈는 짙게, 뼈 사이 접힌 막은 밝게. 기준점 = 몸 아래 땅.
SIT_W, SIT_H, SIT_OX, SIT_OY = 252, 84, 146, 80
BONE_DK = [C("#160a07"), C("#2a1610"), C("#4a2e22")]                   # 접힌 날개뼈 — 몸보다 짙게
MEM_LT = [C("#5e2a1c"), C("#7c3826"), C("#94482e"), C("#a85a3a")]      # 접힌 날개막 — 뼈보다 밝게(몸 갈색 계열)
def _qb(a, c, b, n=10):   # 2차 곡선 점들
    return [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]) for t in (i / n for i in range(n + 1))]
def folded_wing(s, sh, el, wr, fingers, dark=1.0):
    """접힌 날개 — fingers: [(굽은 점, 끝)] 아래(땅) → 위(등) 차례. 뼈 사이 띠마다 막을 칠하고 뼈를 위에 그린다"""
    bone = [dk(c, dark) for c in BONE_DK]; mem = [dk(c, dark) for c in MEM_LT]
    curves = [_qb(wr, c, t) for c, t in fingers]
    for i in range(len(curves) - 1):   # 손가락 사이 막(아래 띠일수록 밝다 — 빛을 받는 쪽). 끝 사이 가장자리는 손목 쪽으로 오목하게
        ta, tb = curves[i][-1], curves[i + 1][-1]; nm = ((ta[0] + tb[0]) / 2 * 0.82 + wr[0] * 0.18, (ta[1] + tb[1]) / 2 * 0.82 + wr[1] * 0.18)
        s.poly(curves[i] + [nm] + curves[i + 1][::-1], mem[2] if i % 2 == 0 else mem[1])
        a, b = curves[i], curves[i + 1]   # 띠 가운데 주름 한 줄
        s.line([((a[k][0] + b[k][0]) / 2, (a[k][1] + b[k][1]) / 2) for k in range(2, len(a))], mem[0], 0.6)
    top = curves[-1]; s.poly(top[:6] + [el], mem[1])   # 맨 위 손가락과 팔 사이 막(팔꿈치 아래만 — 등은 드러난다)
    for c in curves:
        s.line(c, bone[0], 2.4); s.line(c[:6], bone[1], 1.0)
    s.limb([sh, el], 5.2, 3.8, [bone[1], bone[1], bone[2]]); s.limb([el, wr], 3.8, 2.8, [bone[0], bone[1], bone[2]])
    s.dot(el[0], el[1], 3.0, bone[1]); s.poly([(el[0] - 1, el[1] - 2.5), (el[0] - 8, el[1] - 6), (el[0] + 1.5, el[1] - 1)], HORN[0])   # 팔꿈치 가시(뒤로 눕힘)
    s.dot(wr[0], wr[1], 2.6, bone[1]); s.dot(wr[0] - 0.4, wr[1] - 0.6, 1.0, bone[2])
    for k in range(3):   # 손목 발톱 — 땅을 짚는다
        a = math.radians(10 + k * 22); s.line([(wr[0] + 1, wr[1] + 0.5), (wr[0] + 1 + math.cos(a) * 5, wr[1] + 0.5 + math.sin(a) * 2.5)], HORN[1], 1.0)

def sit_pose(breath=0, gape=0.0):
    s = Pose(SIT_W, SIT_H, SIT_OX, SIT_OY)
    b = breath
    # 먼 날개 — 팔꿈치와 내려오는 팔만 몸 위 · 앞에 살짝 보인다(짙게)
    s.limb([(6, -27 + b), (-6, -48 + b), (36, -3)], 3.4, 2.4, [dk(c, 0.55) for c in BONE_DK])
    # 꼬리 — 왼쪽으로 길게, 땅에 눕고 끝으로 갈수록 가늘다
    s.tube([(-40, -13), (-70, -7), (-102, -3.5), (-136, -2)], 7.5, 0.8, BODY, spikes=5)
    s.tube([(-42, -14 + b * 0.4), (-16, -18 + b), (10, -18 + b)], 12, 11.5, BODY, belly=BELLY, spikes=4)   # 몸통 — 가슴 · 배가 땅 가까이
    s.leg((-34, -11), (-20, -5), (-31, -1.5), (-24, 0), 1)                 # 뒷다리 — 몸 아래로 접는다
    neck = [(8, -21 + b), (26, -30 + b), (46, -35 + b), (64, -35 + b)]
    s.tube(neck, 9, 4.2, BODY, belly=BELLY, spikes=4)   # 목 끝은 머리보다 가늘게 — 머리가 시작되는 자리가 보이게                     # 목 — 오른쪽 앞으로 길게
    mouth = s.head_rest(neck[-1][0] - 4, neck[-1][1] + 0.5, math.radians(4), gape)   # 대기 · 날기 같은 머리(11월 18일 사용자 기획)
    folded_wing(s, (4, -25 + b), (-10, -48 + b), (24, -2),   # 손가락: 아래(땅을 따라) → 위(등 아래), 가운데가 처지게 휜다
                [((-12, -7), (-60, -2)), ((-16, -19), (-62, -12)), ((-14, -30), (-55, -22)), ((-6, -40), (-42, -30 + b))])
    return s.done(), (round(mouth[0]), round(mouth[1]))
