"""와이번 머리 도트 — 11월 18일 사용자가 직접 그린 머리(design/wyvern-job/ref/head-user.png)를 우리 와이번 색으로 바꿔 줄인다.
1) 바둑판 바탕(흰색 · 밝은 회색)을 가장자리에서부터 지운다 2) 머리와 목 앞쪽만 오린다
3) 초록 몸 → 녹슨 붉은 갈색(pose.BODY), 옅은 배 · 턱 밑 → pose.BELLY 로 밝기를 지켜 옮긴다(눈 · 입속 · 이빨은 그대로)
4) 주둥이가 오른쪽을 보게 돌리고 게임 크기로 줄인다. 결과 head.png 와 기준점(목 붙는 자리 · 입 · 눈)을 pose.py 가 쓴다."""
import colorsys, math, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "wyvern-job", "ref", "head-user.png")

CROP = (24, 18, 85, 128)      # 원본에서 머리 · 목 앞쪽(왼쪽 위 → 오른쪽 아래)
ROT = 50                      # 반시계로 돌려 아래를 보던 주둥이를 오른쪽 조금 아래로
SCALE = 0.54                  # 돌린 뒤 줄이는 배율 — 머리 길이 40px 안팎(1배 시트), 목 굵기와 맞춤
# 원본(자르기 전) 좌표의 기준점 — 돌리고 줄인 뒤 자리를 계산한다
P_NECK = (34, 70)             # 목이 붙는 자리(머리 뒤 아래)
P_MOUTH = (60, 108)           # 벌린 입 안쪽(불이 나오는 곳)
P_EYE = (57, 86)              # 호박색 눈


def _hex(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


BODY = [_hex(c) for c in ("#1d0f0b", "#3a1f16", "#5a3324", "#7a4a34", "#9c6448")]
BELLY = [_hex(c) for c in ("#5a3a2a", "#7d5a42", "#a07a5a", "#c09a74")]


def ramp(pal, t):
    t = min(max(t, 0.0), 1.0) * (len(pal) - 1)
    i = min(int(t), len(pal) - 2); f = t - i
    return tuple(round(pal[i][k] * (1 - f) + pal[i + 1][k] * f) for k in range(3))


def clear_bg(a):
    h, w, _ = a.shape
    rgb = a[..., :3].astype(int)
    bg = (np.abs(rgb[..., 0] - rgb[..., 1]) < 5) & (np.abs(rgb[..., 1] - rgb[..., 2]) < 5) & (rgb[..., 0] >= 228)
    seen = np.zeros((h, w), bool)
    st = [(y, x) for y in range(h) for x in (0, w - 1)] + [(y, x) for x in range(w) for y in (0, h - 1)]
    while st:
        y, x = st.pop()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not bg[y, x]: continue
        seen[y, x] = True
        st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    a[seen, 3] = 0
    # 바탕과 섞인 밝은 가장자리 한 줄도 걷는다
    soft = (rgb.min(-1) > 205) & (rgb.max(-1) - rgb.min(-1) < 14)
    edge = np.zeros_like(seen)
    edge[1:] |= seen[:-1]; edge[:-1] |= seen[1:]; edge[:, 1:] |= seen[:, :-1]; edge[:, :-1] |= seen[:, 1:]
    a[soft & edge, 3] = 0
    return a


def recolor(a):
    out = a.copy()
    for y in range(a.shape[0]):
        for x in range(a.shape[1]):
            r, g, b, al = a[y, x]
            if al == 0: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            hd = h * 360
            if 45 <= hd <= 170 and s > 0.08 and not (hd < 62 and l > 0.5):                     # 초록 몸 · 뿔 → 붉은 갈색
                c = ramp(BODY, (l - 0.08) / 0.55)
            elif 20 <= hd < 62 and l > 0.35:          # 옅은 배 · 턱 밑 → 밝은 배색
                c = ramp(BELLY, (l - 0.35) / 0.45)
            elif s < 0.12 and l < 0.35:                            # 어두운 선 → 짙은 갈색
                c = ramp(BODY, l / 0.6)
            else:
                continue                                           # 눈 · 입속 · 이빨은 그대로
            out[y, x, :3] = c
    return out


def build():
    im = Image.open(SRC).convert("RGBA")
    a = clear_bg(np.array(im))
    a = recolor(a)
    im = Image.fromarray(a).crop(CROP)
    w0, h0 = im.size
    big = im.resize((w0 * 4, h0 * 4), Image.NEAREST).rotate(ROT, resample=Image.BICUBIC, expand=True)
    W, H = big.size
    sm = big.resize((max(1, round(W / 4 * SCALE)), max(1, round(H / 4 * SCALE))), Image.LANCZOS)
    al = np.array(sm)[..., 3]
    al = np.where(al > 110, 255, 0).astype(np.uint8)     # 도트처럼 가장자리를 딱 끊는다
    sa = np.array(sm); sa[..., 3] = al
    # 바탕과 섞여 남은 밝은 회색 테두리 점을 걷는다(이빨처럼 안쪽 밝은 점은 남는다)
    rgb = sa[..., :3].astype(int); op = al > 0
    out = np.zeros_like(op); out[1:] |= ~op[:-1]; out[:-1] |= ~op[1:]; out[:, 1:] |= ~op[:, :-1]; out[:, :-1] |= ~op[:, 1:]
    grey = (rgb.min(-1) > 150) & (rgb.max(-1) - rgb.min(-1) < 40)
    sa[op & out & grey, 3] = 0
    sm = Image.fromarray(sa)

    def pt(p):   # 원본 좌표 → 결과 좌표
        x, y = (p[0] - CROP[0]) * 4 - w0 * 2, (p[1] - CROP[1]) * 4 - h0 * 2
        t = math.radians(ROT); c, s = math.cos(t), math.sin(t)
        rx, ry = x * c + y * s, -x * s + y * c                # PIL rotate 는 반시계
        return ((rx + W / 2) / 4 * SCALE, (ry + H / 2) / 4 * SCALE)
    return sm, pt(P_NECK), pt(P_MOUTH), pt(P_EYE)


if __name__ == "__main__":
    sm, n, m, e = build()
    sm.save(os.path.join(HERE, "head.png"))
    print(sm.size, [tuple(round(v, 1) for v in q) for q in (n, m, e)])
