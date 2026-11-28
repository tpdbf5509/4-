# Codex 광장 바닥(plaza-v3)의 흙길 두 줄을 다듬는다 — 11월 28일 사용자 "흙길 끝이 돌바닥 위에 둥글게 얹혀 어색해".
#   python3 design/plaza-floor/fix_v3_paths.py
# 입력: design/plaza-floor/codex-plaza-v3.webp (Codex 원본) → 출력: public/assets/game/rpg/plaza-v3.webp (1800 × 1200)
# ① 흙길을 통째로 걷어 내고 그 자리를 위아래로 뒤집은 바닥(원은 위아래 대칭)으로 채운다.
# ② 흙길을 축을 따라 다시 깐다 — 문 쪽 끝은 풀로 흐려지고, 원 쪽은 톱니 고리 밑으로 들어간다(톱니 돌이 흙 위).
# ③ 가장자리는 들쭉날쭉하게, 테두리는 한 단 짙게.
import os, numpy as np
from PIL import Image, ImageFilter

D = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(D, "..", "..")
SRC = os.path.join(D, "codex-plaza-v3.webp")
OUT = os.path.join(ROOT, "public", "assets", "game", "rpg", "plaza-v3.webp")

W, H = 1800, 1200
CX, CY, SQ = 899.5, 639.5, 0.78
TEETH_IN, TEETH_OUT = 548, 604        # 톱니 고리(가로 반지름) — 이 안쪽은 돌만
BOXES = [(30, 420, 440, 620), (1380, 680, 1760, 840)]   # 흙길 두 줄이 있는 칸(x0, y0, x1, y1)
# 흙길 축: 문 쪽 끝 → 원 쪽 방향 점, 흙 무늬를 가져올 깨끗한 토막(축 위 거리), 반폭
AXES = [((62, 470), (440, 561), (90, 230), 38), ((1745, 787), (1380, 735), (90, 230), 37)]
DIRT_EDGE = np.array([176, 140, 98], np.float32)          # 길 가장자리 한 단 짙은 흙


def blur(a, r):
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255


def main():
    im = np.asarray(Image.open(SRC).convert("RGB").resize((W, H), Image.LANCZOS)).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ell = np.hypot(xx - CX, (yy - CY) / SQ)

    # 흙 칸 찾기 — 따뜻한 황토색(R − B 가 큼)
    warm = ((im[..., 0] - im[..., 2]) > 62) & (im[..., 0] > 140)
    box = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in BOXES:
        box[y0:y1, x0:x1] = True
    path = (warm & box).astype(np.float32)
    path = (blur(path, 4) > 0.25).astype(np.float32)          # 자갈 · 어두운 테두리까지 감싼다
    grow = (blur(path, 6) > 0.05).astype(np.float32) * box     # 걷어 낼 자리(테두리 그림자 포함)

    # ① 위아래로 뒤집은 바닥으로 채운다
    flip = im[np.clip(np.round(2 * CY - yy).astype(int), 0, H - 1), xx.astype(int)]
    g = blur(grow, 3)[..., None]
    base = im * (1 - g) + flip * g

    # ② · ③ 흙길을 다시 깐다 — 축을 따라 문 쪽 끝에서 톱니 고리 안쪽까지. 흙 무늬는 원래 길 가운데 토막을 거울로 이어 쓴다
    rng = np.random.default_rng(1128)
    noise = blur(rng.random((H, W)).astype(np.float32), 7)
    noise = (noise - noise.mean()) / (noise.std() + 1e-6)
    green = (flip[..., 1] > flip[..., 0]) & (flip[..., 1] > flip[..., 2])     # 톱니 사이 풀 틈
    dirt_a = np.zeros((H, W), np.float32)
    dirt = np.zeros((H, W, 3), np.float32)
    for (ax, ay), (bx, by), (t0, t1), hw in AXES:
        L = np.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / L, (by - ay) / L
        t = (xx - ax) * ux + (yy - ay) * uy                 # 축 위 거리(문 쪽 0)
        n = -(xx - ax) * uy + (yy - ay) * ux                # 축에서 옆으로 떨어진 거리
        wob = hw + noise * 2.0 + np.sin(t / 53) * 2.0       # 가장자리를 들쭉날쭉하게
        side = np.clip((wob - np.abs(n)) / 5.0, 0, 1)
        head = np.clip(t / 45, 0, 1) ** 0.8                  # 문 쪽 끝이 풀로 흐려진다
        tail = np.clip((ell - TEETH_IN) / 18, 0, 1)          # 고리 안쪽은 돌만
        a = side * head * tail * (t > -20) * (t < L + 200)
        # 흙 무늬: 원래 길의 깨끗한 토막 t0~t1 을 거울로 되풀이
        span = t1 - t0
        k = np.mod(t - t0, 2 * span); k = np.where(k > span, 2 * span - k, k) + t0
        sx = np.clip(np.round(ax + ux * k - uy * n), 0, W - 1).astype(int)
        sy = np.clip(np.round(ay + uy * k + ux * n), 0, H - 1).astype(int)
        nn = np.abs(n) < hw - 4
        tex = np.where(nn[..., None], im[sy, sx], DIRT_EDGE)
        dirt = np.where((a > dirt_a)[..., None], tex, dirt)
        dirt_a = np.maximum(dirt_a, a)
    stone = (ell < TEETH_OUT) & ~green & (flip.mean(axis=2) > 135)   # 톱니 돌(밝은 회색)은 흙 위에 그대로, 그늘진 틈엔 흙
    dirt_a = dirt_a * np.where(stone, 0, 1)
    dirt_a = blur(dirt_a, 0.8)[..., None]
    out = base * (1 - dirt_a) + dirt * dirt_a

    img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    img.save(OUT, "WEBP", quality=90, method=6)


if __name__ == "__main__":
    main()
