# 에르덴 광장 바닥 포석 — 원형 배열 · 고리 반지름 · 돌 크기는 그대로 두고 돌마다 명암을 다시 그린다.
#   python3 design/plaza-floor/make.py
# 입력: design/plaza-floor/plaza-orig.webp (예전 바닥, 원본 보관)
# 출력: public/assets/game/rpg/plaza.webp (1800 × 1200 그대로) · design/plaza-floor/preview.png
# 기준(쉐이더-온오프-계획서 3 · 4장 「광장 바닥」):
#   돌마다 밝기 3~4단 · 모서리 일부를 깎는다 · 줄눈은 한 단 어둡게.
#   햇빛은 화면 왼쪽 위 — 돌 윗 · 왼 가장자리는 밝고 아래 · 오른 가장자리는 어둡다.
#   상점 앞 반원은 밝고 매끈한 닳은 돌. 이끼는 바깥 두 고리의 줄눈에만(가운데 이동로 · 분수 둘레에는 없다).
#   돌 무늬 대비는 캐릭터 윤곽보다 낮게 둔다(예고선 · 사거리 원이 묻히지 않게).
# 바깥 톱니 고리 · 풀밭 · 가운데 원판 바깥 것은 예전 그림을 그대로 쓴다.
import os, numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, "plaza-orig.webp")
OUT = os.path.join(D, "..", "..", "public", "assets", "game", "rpg", "plaza.webp")

# 예전 그림에서 잰 값 — 원형 배열을 그대로 두기 위해 바꾸지 않는다
CX, CY, SQ = 899.5, 639.5, 0.78          # 고리 중심 · 세로 비율
R0, STEP, RINGS = 149.5, 44.0, 9          # 가운데 원판 반지름 · 고리 너비 · 돌 고리 수(바깥 톱니 고리 제외)
STONE_LEN = 62                            # 돌 한 개의 호 길이(예전 돌 크기와 비슷하게)

# 예전 그림의 돌 색 네 단(밝기 3~4단을 이 안에서 고른다)
TONES = np.array([[178, 169, 145], [189, 179, 155], [200, 188, 164], [208, 198, 174]], np.float32)
DISC = np.array([183, 173, 151], np.float32)       # 가운데 원판
JOINT = np.array([150, 140, 119], np.float32)      # 줄눈 — 돌보다 한 단 어둡게
MOSS = np.array([118, 132, 86], np.float32)        # 이끼 — 톤다운 올리브

BEVEL = 9.0          # 가장자리 밝기 차(빛 쪽 +, 반대쪽 −). 캐릭터 윤곽보다 낮은 대비
BEVEL_PX = 2.2       # 가장자리 너비(화면 화소)
JOINT_PX = 1.1       # 줄눈 반너비(화면 화소)
CHIP_PX = 4.0        # 깎인 모서리 크기
SPECK = 2.2          # 돌 표면 결 세기
L2 = np.array([-0.70, -0.71])                       # 화면에서 빛이 오는 쪽(왼쪽 위)

# 상점 앞 닳은 돌 — 상점 자리(shopData.js) 앞쪽 반원. (x, y) 는 상점 발밑
SHOPS = [(135, 310), (300, 310), (465, 310), (1170, 310), (1335, 310), (1500, 310), (1665, 310)]
WORN = dict(dy=70, rx=110, ry=60)          # 반원 가운데(발밑 아래) · 가로 · 세로 반지름
WORN_LIGHT = 7.0                            # 닳아 밝아지는 양
MOSS_RINGS = (7, 8)                         # 이끼가 생기는 고리(바깥 둘)

SS = 2               # 계단 없애기용 덧그리기

def h1(i, s):
    return (np.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1.0

def main():
    src = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
    H, W = src.shape[:2]
    yy, xx = np.mgrid[0:H * SS, 0:W * SS].astype(np.float32)
    X = (xx + 0.5) / SS - 0.5; Y = (yy + 0.5) / SS - 0.5
    dx, dy = X - CX, (Y - CY) / SQ
    r = np.hypot(dx, dy); th = np.arctan2(dy, dx)
    c, s = np.cos(th), np.sin(th)
    pr = np.sqrt(c * c + (SQ * s) ** 2)            # r 한 단위가 화면에서 몇 화소인가
    pa = np.sqrt(s * s + (SQ * c) ** 2)            # 호 한 단위가 화면에서 몇 화소인가
    out = np.empty((H * SS, W * SS, 3), np.float32)

    ring = np.floor((r - R0) / STEP).astype(np.int32)
    inner = R0 + ring * STEP
    in_ring = (ring >= 0) & (ring < RINGS)
    # 고리마다 돌 수 · 엇갈림
    rm = inner + STEP / 2
    n = np.maximum(np.round(2 * np.pi * rm / STONE_LEN), 8)
    off = h1(ring.astype(np.float32), 4)
    t = ((th / (2 * np.pi)) % 1.0) * n + off
    j = np.floor(t); f = t - j
    jm = j % n                                      # 0 각도를 넘는 돌도 같은 번호
    sid = ring * 1000 + jm                          # 돌 번호
    # 돌 밝기 3~4단 — 이웃과 같은 단이 이어지지 않게 섞는다
    tone = TONES[(np.floor(h1(sid, 1) * 4).astype(np.int32) + (jm.astype(np.int32) % 2) * 2) % 4]
    col = tone.copy()
    # 가장자리까지의 화면 거리
    d_in = (r - inner) * pr; d_out = (inner + STEP - r) * pr
    arc = rm * 2 * np.pi / n
    d_l = f * arc * pa; d_r = (1 - f) * arc * pa
    # 가장자리 명암 — 그 가장자리 바깥쪽 방향이 빛을 향하면 밝게
    def edge(dist, nx, ny):
        k = np.clip(1 - dist / BEVEL_PX, 0, 1)
        lit = nx * L2[0] + ny * L2[1]
        return k * lit
    # 화면 방향: 지름 방향 (c, SQ·s), 호 방향 (−s, SQ·c)
    nr = np.stack([c, SQ * s]); nr /= np.linalg.norm(nr, axis=0)
    na = np.stack([-s, SQ * c]); na /= np.linalg.norm(na, axis=0)
    bev = edge(d_in, -nr[0], -nr[1]) + edge(d_out, nr[0], nr[1]) + edge(d_l, -na[0], -na[1]) + edge(d_r, na[0], na[1])
    # 상점 앞 닳은 돌
    worn = np.zeros_like(r)
    for sx, sy in SHOPS:
        e = ((X - sx) / WORN["rx"]) ** 2 + ((Y - sy - WORN["dy"]) / WORN["ry"]) ** 2
        worn = np.maximum(worn, np.clip((1 - e) * 1.6, 0, 1) * (Y > sy - 6))
    # 표면 결(아주 옅은 점) — 닳은 돌은 매끈하다
    speck = (h1(np.floor(X / 2) * 131 + np.floor(Y / 2), 2) - 0.5) * 2 * SPECK
    col = col + (BEVEL * bev * (1 - 0.55 * worn) + speck * (1 - 0.7 * worn))[..., None]
    col = col + (WORN_LIGHT * worn)[..., None] + (tone.mean(-1, keepdims=True) * 0 + (TONES[2] - col) * 0.25 * worn[..., None])
    # 깎인 모서리 — 돌마다 0~2 곳, 닳은 돌은 둥글게 크게
    chip = np.zeros_like(r)
    for corner, (a, b) in enumerate(((d_in, d_l), (d_in, d_r), (d_out, d_l), (d_out, d_r))):
        on = h1(sid, 10 + corner) > 0.62
        size = CHIP_PX * (0.7 + 0.6 * h1(sid, 20 + corner)) * (1 + worn)
        chip = np.maximum(chip, on * np.clip(1 - (a + b) / size, 0, 1))
    chip = np.clip(chip * 3, 0, 1)
    col = col * (1 - chip[..., None]) + (JOINT + 14)[None, None] * chip[..., None]
    # 줄눈 — 고리 선 · 돌 사이 선
    jline = np.clip(1.5 - np.minimum.reduce([d_in, d_out, d_l, d_r]) / JOINT_PX, 0, 1)
    # 이끼 — 바깥 두 고리, 상점 앞은 뺀다. 돌 사이 줄눈을 따라 짧게, 무리 지어
    moss_on = np.isin(ring, MOSS_RINGS) & (h1(np.floor(th * 18), 6) > 0.55) & (worn < 0.05)
    near_end = np.clip(1 - np.minimum(d_in, d_out) / (6 + 10 * h1(sid, 32)), 0, 1)       # 줄눈 끝에서만 짧게
    mclump = np.clip(1 - np.minimum(d_l, d_r) / (2.5 + 3.5 * h1(sid, 30)), 0, 1) * (h1(sid, 31) > 0.45) * near_end
    mclump = np.maximum(mclump, np.clip(1 - d_out / 2.8, 0, 1) * (h1(np.floor(th * 60), 7) > 0.8))
    moss = moss_on * mclump * (0.55 + 0.45 * (h1(np.floor(X) * 7 + np.floor(Y) * 13, 8) > 0.4))
    col = col * (1 - jline[..., None]) + JOINT[None, None] * jline[..., None]
    col = col * (1 - moss[..., None] * 0.85) + MOSS[None, None] * (moss[..., None] * 0.85)
    # 가운데 원판 — 옅은 결만, 바깥 테 선 하나
    disc = r < R0
    dcol = DISC[None, None] + speck[..., None] * 0.6
    dline = np.clip(1.5 - np.abs(r - R0) * pr / JOINT_PX, 0, 1)
    # 합치기 — 돌 고리 · 원판 안쪽만 새 그림, 바깥은 예전 그림
    big = np.repeat(np.repeat(src, SS, 0), SS, 1)
    out[:] = big
    out = np.where(in_ring[..., None], col, out)
    out = np.where(disc[..., None], dcol, out)
    edge_line = np.clip(1.5 - np.abs(r - R0) * pr / JOINT_PX, 0, 1) + np.clip(1.5 - np.abs(r - (R0 + RINGS * STEP)) * pr / JOINT_PX, 0, 1)
    edge_line = np.clip(edge_line, 0, 1) * (r < R0 + RINGS * STEP + 3)
    out = out * (1 - edge_line[..., None]) + JOINT[None, None] * edge_line[..., None]
    out = out.reshape(H, SS, W, SS, 3).mean((1, 3))
    im = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8), "RGB")
    im.save(OUT, "WEBP", quality=92, method=6)
    im.crop((1000, 200, 1500, 700)).save(os.path.join(D, "preview.png"))
    print("저장", OUT, im.size)

if __name__ == "__main__":
    main()
