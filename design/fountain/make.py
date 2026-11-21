# 에르덴 광장 분수(2D) — 원형 · 크기 · 기준점은 예전 그대로 두고 그림만 다시 그린다.
#   python3 design/fountain/make.py            (전체 시트, 몇 분 걸린다)
#   python3 design/fountain/make.py preview    (첫 칸만 preview.png)
# 출력: public/assets/game/rpg/fountain.webp (무손실, 36칸 6줄 — manifest.json "rpg/fountain" 그대로)
#        design/fountain/preview.png (첫 칸 확대)
# 칸 하나 = 논리 220 × 185, 기준점(110, 95) = 분수 가운데(900, 620). 1단위 2px(440 × 370).
# 기준(쉐이더-온오프-계획서 3 · 4장):
#   햇빛은 화면 왼쪽 위에서(그림자는 오른쪽 아래) — 상점 매대와 같은 값.
#   돌 테두리 안쪽 얇은 그늘 · 물 떨어지는 자리의 잔물결 · 수면 한쪽 반사. 수면은 채도를 낮춘 청록.
#   화면 효과를 꺼도 돌 테두리 · 수면 · 기둥이 구분되게 명암을 그림에 넣는다.
import os, sys, numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, "..", "..", "public", "assets", "game", "rpg", "fountain.webp")

FW, FH, OX, OY = 220, 185, 110, 95     # 논리 칸 · 기준점(README 표와 같다)
K = 2                                   # 1단위 2px
SS = 3                                  # 계단 없애기용 덧그리기 배수
N, COLS = 36, 6                         # 칸 수 · 한 줄 칸 수(ANIM_T 4.5초를 36등분)
SQ = 0.78                               # RPG.squash — 비스듬히 내려다본 세로 비율

# 모양(논리 단위). 바깥 지름 · 물 지름은 예전 그림과 같다(바깥 100 · 안쪽 82).
R_OUT, R_IN = 100, 83                   # 돌 테두리 바깥 · 안쪽
H_RIM = 11                              # 테두리 높이
Z_WATER = 4                             # 수면 높이(테두리보다 낮아 안쪽 벽이 보인다)
R_COL, Z_COLTOP = 11, 44                # 가운데 기둥
R_BOWL, Z_BOWL, T_BOWL = 29, 50, 6      # 위 접시: 반지름 · 윗면 높이 · 두께
R_FALL = 31                             # 접시에서 떨어진 물이 닿는 반지름
BLOCKS = 20                             # 테두리 돌 수

# 색(톤다운). 돌은 상점 기둥 · 판매대와 어울리는 따뜻한 회갈색, 물은 낮은 채도 청록.
STONE = np.array([206, 194, 170]) / 255
STONE_DARK = np.array([150, 136, 116]) / 255
LINE = np.array([74, 58, 44]) / 255     # 윤곽(상점 그림의 짙은 갈색 선)
MORTAR = np.array([118, 104, 86]) / 255
WATER_DEEP = np.array([70, 108, 110]) / 255
WATER_MID = np.array([100, 142, 138]) / 255
WATER_LIGHT = np.array([150, 182, 172]) / 255
FOAM = np.array([222, 232, 224]) / 255
SHADOW = np.array([44, 36, 28]) / 255

L = np.array([-0.62, -0.5, 0.6]); L /= np.linalg.norm(L)   # 빛 방향(화면 왼쪽 위) — 면 밝기용
LS = np.array([-0.62, -0.5, 2.2]); LS /= np.linalg.norm(LS) # 그림자용 해 — 높이의 0.5배 안쪽으로 눕게(계획서 4장)

W, H = FW * K * SS, FH * K * SS
py, px = np.mgrid[0:H, 0:W].astype(np.float32)
GX = (px + 0.5) / (K * SS) - OX           # 논리 x(가운데 0)
GY = (py + 0.5) / (K * SS) - OY           # 논리 화면 y(가운데 0)
U = 1 / (K * SS)                          # 화면 한 점의 논리 크기

def plane(z):
    """높이 z 인 평면 위의 땅 좌표(wx, wy)와 반지름 · 각도."""
    wy = (GY + z) / SQ
    return GX, wy, np.hypot(GX, wy), np.arctan2(wy, GX)

def hash1(i, s=0):
    return (np.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1.0

def over(img, rgb, a):
    a = np.clip(a, 0, 1)[..., None]
    rgb = np.broadcast_to(rgb, img[..., :3].shape) if np.ndim(rgb) == 1 else rgb
    img[..., :3] = rgb * a + img[..., :3] * (1 - a)
    img[..., 3:4] = a + img[..., 3:4] * (1 - a)

def soft(d, w):
    """d<0 안쪽 · d>0 바깥, 너비 w 로 부드럽게."""
    return np.clip(0.5 - d / w, 0, 1)

def cyl_wall(R, z0, z1, front=True):
    """반지름 R 원기둥 옆면 — 화면에 보이는 앞쪽 반(또는 안쪽 벽이면 뒤쪽 반)."""
    inside = np.abs(GX) < R
    c = np.sqrt(np.clip(R * R - GX * GX, 0, None)) * SQ
    yc = c if front else -c
    top, bot = yc - z1, yc - z0
    m = inside & (GY >= top) & (GY <= bot)
    zz = np.clip(yc - GY, z0, z1)
    th = np.arctan2(yc / SQ, GX)
    return m, th, zz

def disc(R, z, edge=1.0):
    _, _, r, th = plane(z)
    return soft(r - R, edge * U * 2.0 / 1.0 * 1.5), r, th

def static_layers():
    img = np.zeros((H, W, 4), np.float32)

    # 1) 땅 그림자 — 오른쪽 아래로 눕는다
    wy = (GY - 7) / SQ
    rs = np.hypot(GX - 9, wy)
    over(img, SHADOW, 0.30 * np.clip((R_OUT + 6 - rs) / 10, 0, 1))

    # 2) 바깥 벽(앞쪽 반) — 왼쪽이 밝고 오른쪽이 어둡다
    m, th, zz = cyl_wall(R_OUT, 0, H_RIM, True)
    n = np.stack([np.cos(th), np.sin(th), np.zeros_like(th)], -1)
    dif = np.clip(n @ L, 0, 1)
    blk = np.floor((th % (2 * np.pi)) / (2 * np.pi) * BLOCKS * 1.5 + 0.5)
    var = (hash1(blk, 3) - 0.5) * 0.08
    shade = 0.58 + 0.32 * dif + var - 0.10 * (zz < 2)          # 땅에 닿는 아래 띠는 어둡다
    col = STONE_DARK[None, None] * 0.35 + STONE[None, None] * 0.65
    col = col * shade[..., None]
    joint = (np.abs(((th % (2 * np.pi)) / (2 * np.pi) * BLOCKS * 1.5 + 0.5) % 1 - 0.5) > 0.47)
    col = np.where(joint[..., None], MORTAR * 0.85, col)
    over(img, col, m.astype(np.float32))

    # 3) 테두리 윗면 — 돌 20개, 돌마다 밝기 · 모서리 차이, 줄눈은 한 단 어둡게
    a_out, r, th = disc(R_OUT, H_RIM)
    ring = a_out * soft(R_IN - r, U * 3)
    t = (th % (2 * np.pi)) / (2 * np.pi) * BLOCKS
    bi = np.floor(t)
    f = t - bi
    var = (hash1(bi, 1) - 0.5) * 0.13                          # 돌마다 밝기 3~4단
    radial = (r - R_IN) / (R_OUT - R_IN)                       # 0 안쪽 · 1 바깥
    # 바깥 가장자리: 빛 쪽(왼쪽 위)은 밝은 모서리, 반대쪽은 어둡게
    lit = np.cos(th) * L[0] + np.sin(th) * L[1]
    edge = np.where(radial > 0.82, 0.10 * lit, 0) + np.where(radial < 0.16, -0.06 * lit, 0)
    shade = 0.93 + var + edge
    # 모서리 깎임 — 돌 끝 몇 점을 어둡게 둥글린다
    chip = (hash1(bi, 7) > 0.55) & (f > 0.86) & (radial > 0.7)
    chip |= (hash1(bi, 9) > 0.6) & (f < 0.12) & (radial < 0.3)
    shade = shade - 0.10 * chip
    col = STONE[None, None] * shade[..., None]
    # 표면 결 — 아주 옅은 점
    grain = (hash1(np.floor(GX * 1.3) * 31 + np.floor(GY * 1.3 / SQ), 5) - 0.5) * 0.035
    col = col * (1 + grain[..., None])
    jw = 0.11 * (16.5 / (r + 1e-3))                             # 줄눈 너비(각도 칸 기준)
    joint = (f < jw) | (f > 1 - jw)
    col = np.where(joint[..., None], MORTAR, col)
    over(img, col, ring)

    # 4) 안쪽 벽(뒤쪽 반) — 테두리 그늘 쪽이라 어둡다
    m, th, zz = cyl_wall(R_IN, Z_WATER, H_RIM, False)
    n = np.stack([-np.cos(th), -np.sin(th), np.zeros_like(th)], -1)
    dif = np.clip(n @ L, 0, 1)
    shade = 0.50 + 0.28 * dif - 0.12 * (zz < Z_WATER + 2.5)
    col = STONE_DARK[None, None] * shade[..., None]
    a_in, _, _ = disc(R_IN, H_RIM)
    over(img, col, m * a_in)
    return img

def water_base():
    """수면 — 가장자리 짙고 가운데 옅은 청록, 테두리 그늘 · 기둥 그늘."""
    a, r, th = disc(R_IN, Z_WATER)
    wx, wy, _, _ = plane(Z_WATER)
    k = np.clip(r / R_IN, 0, 1)
    col = WATER_MID[None, None] * (1 - k[..., None] ** 2) + WATER_DEEP[None, None] * (k[..., None] ** 2)
    col = col + (WATER_LIGHT - WATER_MID)[None, None] * np.clip(1 - r / 40, 0, 1)[..., None] * 0.35
    # 테두리 안쪽 얇은 그늘 띠(가장자리 둘레 전체) + 빛 쪽 테두리가 던지는 그늘
    ao = np.clip((r - (R_IN - 9)) / 9, 0, 1) ** 1.6
    sx, sy = wx + LS[0] / LS[2] * (H_RIM - Z_WATER) * 2.2, wy + LS[1] / LS[2] * (H_RIM - Z_WATER) * 2.2
    rim_sh = soft(R_IN - np.hypot(sx, sy), 2.5)                # 빛 쪽으로 옮긴 점이 테두리 밖이면 그늘
    # 기둥 · 접시 그늘(오른쪽 아래로)
    t = (Z_BOWL - Z_WATER) / LS[2]
    bx, by = wx + LS[0] * t, wy + LS[1] * t
    bowl_sh = soft(np.hypot(bx, by) - R_BOWL, 3)
    col_sh = np.zeros_like(r)
    for zc in np.linspace(Z_WATER, Z_BOWL, 12):
        tt = (zc - Z_WATER) / LS[2]
        col_sh = np.maximum(col_sh, soft(np.hypot(wx + LS[0] * tt, wy + LS[1] * tt) - R_COL, 2))
    shadow = np.clip(0.30 * ao + 0.26 * rim_sh + 0.16 * np.maximum(bowl_sh, col_sh), 0, 0.5)
    col = col * (1 - shadow[..., None])
    return col, a, r, th, wx, wy, rim_sh

def bowl_and_column(img, time):
    # 기둥 받침(물에 닿는 넓은 돌) — 기둥보다 먼저 그려 기둥이 윗면을 가린다
    m2, th2, zz2 = cyl_wall(R_COL + 4, Z_WATER, Z_WATER + 4, True)
    dif2 = np.clip(np.stack([np.cos(th2), np.sin(th2), np.zeros_like(th2)], -1) @ L, 0, 1)
    over(img, STONE[None, None] * (0.5 + 0.4 * dif2)[..., None], m2.astype(np.float32))
    a_top, r_t, _ = disc(R_COL + 4, Z_WATER + 4)
    over(img, STONE * 0.9, a_top)
    over(img, LINE, np.clip(1 - np.abs(r_t - (R_COL + 4)) / (U * 2.2), 0, 1) * 0.6)
    # 기둥 — 원기둥, 왼쪽이 밝다. 가는 띠 둘.
    m, th, zz = cyl_wall(R_COL, Z_WATER + 4, Z_COLTOP + 6, True)
    n = np.stack([np.cos(th), np.sin(th), np.zeros_like(th)], -1)
    dif = np.clip(n @ L, 0, 1)
    shade = 0.55 + 0.42 * dif - 0.10 * (zz < Z_WATER + 7)
    col = STONE[None, None] * shade[..., None]
    band = (np.abs(zz - 16) < 1.0) | (np.abs(zz - 36) < 0.8)
    col = np.where(band[..., None], col * 0.82, col)
    over(img, col, m.astype(np.float32))
    edge = m & ((np.abs(np.abs(GX) - R_COL) < U * 2.2))
    over(img, LINE, edge * 0.8)

    # 접시 아래면(옆 띠) — 어둡다
    m, th, zz = cyl_wall(R_BOWL, Z_BOWL - T_BOWL, Z_BOWL, True)
    n = np.stack([np.cos(th), np.sin(th), np.zeros_like(th)], -1)
    dif = np.clip(n @ L, 0, 1)
    shade = 0.50 + 0.35 * dif
    col = STONE[None, None] * shade[..., None]
    over(img, col, m.astype(np.float32))
    # 접시 아래 둥근 밑동(기둥과 이어지는 곳)
    a_u, r_u, _ = disc(R_BOWL - 4, Z_BOWL - T_BOWL)
    over(img, STONE_DARK * 0.8, a_u * (GY > -(Z_BOWL - T_BOWL)) * 0.9)

    # 접시 윗면 테두리 + 안의 물
    a_b, r_b, th_b = disc(R_BOWL, Z_BOWL)
    lit = (np.cos(th_b) * L[0] + np.sin(th_b) * L[1])
    rimc = STONE[None, None] * (0.95 + 0.08 * lit * (r_b > R_BOWL - 2.5))[..., None]
    over(img, rimc, a_b)
    a_bw, r_bw, _ = disc(R_BOWL - 4.5, Z_BOWL - 1)
    wcol = WATER_MID[None, None] * np.ones_like(r_bw)[..., None]
    wcol = wcol * (1 - 0.25 * np.clip((r_bw - (R_BOWL - 9)) / 5, 0, 1))[..., None]
    rr = (time / 4.5 * 3) % 1                                  # 접시 안 작은 물결
    for k in range(2):
        rad = ((rr + k * 0.5) % 1) * (R_BOWL - 6)
        ring = np.clip(1 - np.abs(r_bw - rad) / 0.9, 0, 1) * (1 - (rad / (R_BOWL - 6)))
        wcol = wcol + (WATER_LIGHT - WATER_MID)[None, None] * ring[..., None] * 0.9
    over(img, wcol, a_bw)
    # 윤곽
    for R, z in ((R_BOWL, Z_BOWL), (R_BOWL - 4.5, Z_BOWL - 1)):
        _, r_e, _ = disc(R, z)
        over(img, LINE, np.clip(1 - np.abs(r_e - R) / (U * 2.2), 0, 1) * 0.75)
    mb, _, _ = cyl_wall(R_BOWL, Z_BOWL - T_BOWL, Z_BOWL, True)
    c = np.sqrt(np.clip(R_BOWL ** 2 - GX ** 2, 0, None)) * SQ
    bottom = (np.abs(GY - (c - (Z_BOWL - T_BOWL))) < U * 2.2) & (np.abs(GX) < R_BOWL)
    over(img, LINE, bottom * 0.75)

    # 가운데 꼭지(작은 돌 봉오리)
    m, th, zz = cyl_wall(4, Z_BOWL - 1, Z_BOWL + 7, True)
    dif = np.clip(np.stack([np.cos(th), np.sin(th), np.zeros_like(th)], -1) @ L, 0, 1)
    over(img, STONE[None, None] * (0.55 + 0.42 * dif)[..., None], m.astype(np.float32))
    a_k, _, _ = disc(4, Z_BOWL + 7)
    over(img, STONE * 1.02, a_k)

def dot(img, x, y, rad, rgb, a):
    d = np.hypot(GX - x, (GY - y))
    over(img, rgb, soft(d - rad, U * 3) * a)

def frame(static, wbase, i):
    time = i / N * 4.5
    img = static.copy()
    col, a, r, th, wx, wy, rim_sh = wbase
    col = col.copy()
    # 잔물결 — 물이 떨어지는 자리(R_FALL)에서 바깥으로 퍼진다. 한 바퀴(4.5초)에 3번
    for k in range(3):
        p = (i / N * 3 + k / 3) % 1
        rad = R_FALL + 2 + p * (R_IN - R_FALL - 8)
        fade = (1 - p) ** 1.3
        wob = rad + 0.8 * np.sin(th * 7 + k * 2.1)
        crest = np.clip(1 - np.abs(r - wob) / 1.1, 0, 1)
        trough = np.clip(1 - np.abs(r - (wob - 2.4)) / 1.3, 0, 1)
        col = col + (WATER_LIGHT - col) * (crest * 0.55 * fade)[..., None]
        col = col * (1 - trough * 0.10 * fade)[..., None]
    # 반사 — 수면 오른쪽 뒤(빛 반대편 테두리 아래)에 옅은 하늘빛 조각, 가는 줄로 일렁인다
    # 테두리 오른쪽 안을 따라 초승달 모양으로 밝고, 짧은 반짝임 몇 줄이 천천히 흐른다
    cres = np.clip(1 - np.abs(r - (R_IN - 13)) / 7, 0, 1) * np.clip(np.cos(th + 0.55) * 1.6 - 0.35, 0, 1)
    glint = 0.5 + 0.5 * np.sin(th * 26 + r * 0.9 - time * 2 * np.pi / 4.5 * 2)
    refl = (cres * 0.20 + cres * (glint > 0.82) * 0.30) * (1 - rim_sh)
    col = col + (np.array([214, 226, 222]) / 255 - col) * refl[..., None]
    # 물 떨어지는 자리 거품(점)
    foam_band = np.clip(1 - np.abs(r - R_FALL) / 2.4, 0, 1)
    sparkle = hash1(np.floor(th * 40) + np.floor(r * 0.8) * 97 + i * 13, 2) > 0.55
    col = col + (FOAM - col) * (foam_band * sparkle * 0.40)[..., None]
    over(img, col, a)
    # 테두리 안쪽 · 바깥 윤곽(물과 돌 사이 선, 돌 바깥 선)
    _, _, r_t, _ = plane(H_RIM)
    over(img, LINE, np.clip(1 - np.abs(r_t - R_IN) / (U * 2.2), 0, 1) * 0.6)
    outer = np.clip(1 - np.abs(r_t - R_OUT) / (U * 2.2), 0, 1) * (r_t < R_OUT + 2)
    over(img, LINE, outer * 0.85)
    c = np.sqrt(np.clip(R_OUT ** 2 - GX ** 2, 0, None)) * SQ
    base = (np.abs(GY - c) < U * 2.4) & (np.abs(GX) < R_OUT)
    side = (np.abs(np.abs(GX) - R_OUT) < U * 2.4) & (GY > -H_RIM) & (GY < 2)
    over(img, LINE, (base | side) * 0.85)

    # 뒤쪽 물줄기 커튼(접시에서 떨어지는 물, 뒤 반) — 기둥 · 접시보다 먼저
    curtain(img, i, back=True)
    bowl_and_column(img, time)
    curtain(img, i, back=False)
    # 꼭지에서 솟는 물과 물방울
    for j in range(14):
        ph = (i / N * 4 + j / 14) % 1
        ang = j / 14 * 2 * np.pi + 0.4
        rad = ph * (R_BOWL - 7)
        x = np.cos(ang) * rad
        y = np.sin(ang) * rad * SQ - (Z_BOWL + 9 + np.sin(ph * np.pi) * 15 - ph * 8)
        dot(img, x, y, 1.25, FOAM, 0.85 * (1 - ph * 0.4))
    m, _, _ = cyl_wall(1.6, Z_BOWL + 7, Z_BOWL + 17, True)
    over(img, FOAM, m * 0.75)
    return img

def curtain(img, i, back):
    """접시 가장자리에서 물이 얇은 줄로 떨어진다 — 줄마다 밝기가 흐른다."""
    for s in range(18):
        ang = s / 18 * 2 * np.pi + 0.12
        isfront = np.sin(ang) > 0
        if isfront == back:
            continue
        x = np.cos(ang) * (R_BOWL + 0.5)
        y0 = np.sin(ang) * R_BOWL * SQ - (Z_BOWL - T_BOWL + 1)
        y1 = np.sin(ang) * R_FALL * SQ - Z_WATER
        x1 = np.cos(ang) * R_FALL
        tline = np.clip((GY - y0) / max(y1 - y0, 1e-3), 0, 1)
        lx = x + (x1 - x) * tline ** 2
        m = (GY >= y0) & (GY <= y1) & (np.abs(GX - lx) < 0.5)
        flow = 0.5 + 0.5 * np.sin((tline * 3 - i / N * 6 + s * 0.37) * 2 * np.pi)
        a = m * (0.15 + 0.45 * flow ** 2) * (0.45 if back else 0.75)
        over(img, FOAM, a)

def down(img):
    a = img.reshape(FH * K, SS, FW * K, SS, 4)
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    pm = pm.mean(axis=(1, 3))
    al = pm[..., 3:4]
    pm[..., :3] = np.where(al > 1e-4, pm[..., :3] / np.maximum(al, 1e-4), 0)
    return pm

def main():
    static = static_layers()
    wbase = water_base()
    if "preview" in sys.argv:                                  # 첫 칸만 빨리 본다
        f = down(frame(static, wbase, 0))
        Image.fromarray((np.clip(f, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(D, "preview.png"))
        return
    sheet = np.zeros((FH * K * (N // COLS), FW * K * COLS, 4), np.float32)
    for i in range(N):
        f = down(frame(static, wbase, i))
        r, c = divmod(i, COLS)
        sheet[r * FH * K:(r + 1) * FH * K, c * FW * K:(c + 1) * FW * K] = f
        print("칸", i + 1, "/", N, flush=True)
    im = Image.fromarray((np.clip(sheet, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    im.save(OUT, "WEBP", lossless=True, quality=100, method=6)
    im.crop((0, 0, FW * K, FH * K)).save(os.path.join(D, "preview.png"))
    print("저장", OUT, im.size)

if __name__ == "__main__":
    main()
