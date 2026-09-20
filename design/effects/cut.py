"""대군주 이펙트 시트에서 이펙트만 떼어 낸다.

시트는 배경이 이미 투명하다. 그래서 하는 일은 셋뿐이다.
  1) 칸마다 잘라 낸다 — 좌표는 BOX 에 적어 두었다.
  2) 설명 라벨이 걸친 줄을 지운다.
  3) 칸 안에 함께 그려진 보스를 지운다 — 게임은 제 대군주를 따로 그린다.

픽셀 자체는 건드리지 않는다. 늘리거나 돌리거나 색을 고치지 않는다.
지우는 것은 라벨과 보스뿐이고, 나머지는 원본 그대로 둔다.

    python3 design/effects/cut.py
"""

import os

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET = os.path.join(HERE, 'titan-fx-sheet.webp')
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'public', 'assets', 'fx', 'titan'))

# 시트에서 각 칸이 있는 자리 (x0, y0, x1, y1)
BOX = {
    'wake':  (5, 62, 365, 248),        # 겹파문
    'hail':  (368, 55, 645, 248),      # 쏟아지기
    'slam':  (645, 48, 880, 250),      # 내리치기
    'leap':  (876, 48, 1120, 252),     # 내려찍기
    'rush':  (5, 312, 205, 438),       # 돌진
    'sweep': (205, 308, 490, 458),     # 휩쓸기
    'swipe': (487, 303, 700, 460),     # 후려치기
    'gore':  (700, 303, 905, 464),     # 뿔찍기
    'rift':  (900, 298, 1120, 464),    # 대지균열
    'pulse': (0, 518, 305, 662),       # 분노의 파동
    'track': (283, 498, 462, 660),     # 추적 낙석
    'spin':  (468, 498, 728, 674),     # 광폭 회전
    'rock':  (0, 668, 400, 750),       # 낱개 돌과 연기
    'spark': (395, 668, 732, 750),     # 낱개 충격 자국
}

# 그림을 얹을 때 맞출 자리를 따로 정해 주는 칸.
#   bright  터져 나오는 한가운데 (보스가 아니라 땅이 기준인 기술)
#   center  그림 한가운데 (여러 개가 늘어선 칸)
ANCHOR = {
    'leap': 'bright', 'swipe': 'bright', 'pulse': 'center', 'rift': 'center',
    'track1': (20, 110),
}

# 보스가 함께 그려진 칸. 가장 크고 가장 어두운 덩어리가 보스다.
WITH_BOSS = {'leap', 'rush', 'sweep', 'swipe', 'gore', 'pulse', 'spin'}


def _drop_label(a):
    """위쪽에 걸친 라벨 띠를 지운다 — 납작하고 고르게 어두운 줄이다."""
    al, lum = a[:, :, 3], a[:, :, :3].mean(2)
    bar = ((al > 200) & (lum < 80)).mean(1) > 0.35
    cut = 0
    for y in range(min(24, len(bar))):
        if bar[y]:
            cut = y + 1
    if cut:
        a[:cut] = 0
    return cut


def _hole(a):
    """가운데가 비어 있는 그림(고리·파문)의 빈 구멍 한가운데."""
    m = a[:, :, 3] > 24
    lb, n = ndi.label(~m)
    if not n:
        return None
    h, w = m.shape
    edge = set(lb[0].tolist() + lb[-1].tolist() + lb[:, 0].tolist() + lb[:, -1].tolist())
    best, area = None, 0
    for i in range(1, n + 1):
        if i in edge:                      # 바깥 여백은 구멍이 아니다
            continue
        c = int((lb == i).sum())
        if c > area:
            best, area = i, c
    if not best or area < 400:
        return None
    ys, xs = np.where(lb == best)
    return float(xs.mean()), float(ys.mean())


def _bright(a):
    """가장 밝은 자리 — 터져 나오는 중심."""
    al = a[:, :, 3].astype(float)
    lum = a[:, :, :3].astype(float).mean(2) * (al / 255)
    if not (al > 40).any():
        return 0.0, 0.0
    ys, xs = np.where(lum > np.percentile(lum[al > 40], 99.5))
    return float(xs.mean()), float(ys.mean())


def _drop_boss(a):
    """칸 안에 그려진 보스를 지운다.

    돌과 보스가 둘 다 어둡지만, 보스는 그중 가장 넓고 가장 어두운 덩어리다.
    가장자리 반투명까지 같이 지우려고 두 칸 부풀려 잘라 낸다.
    """
    al, lum = a[:, :, 3], a[:, :, :3].mean(2)
    dark = ndi.binary_closing((al > 60) & (lum < 110), np.ones((3, 3)))
    lb, n = ndi.label(dark)
    if not n:
        return 0
    best, score = 0, 0
    for i in range(1, n + 1):
        m = lb == i
        area = int(m.sum())
        if area < 1200:
            continue
        # 넓으면서 어두울수록 보스에 가깝다. 돌무더기도 넓지만 보스만큼 어둡지는 않아
        # 어두운 정도에 무게를 더 둔다.
        s = area * (130 - min(130, lum[m].mean())) ** 2
        if s > score:
            best, score = i, s
    if not best:
        return 0
    m = ndi.binary_dilation(lb == best, np.ones((5, 5)))
    ys, xs = np.where(m)
    a[m] = 0
    return int(m.sum()), (float(xs.mean()), float(ys.mean()))


# 한 칸에 여러 개가 늘어선 것은 낱개로 한 번 더 뗀다.
# 쏟아지기와 추적 낙석은 게임에서 자리마다 따로 떨어지기 때문이다.
SINGLE = {
    'hail1':  ('hail',  (21, 15, 104, 149)),
    'track1': ('track', (32, 2, 67, 123)),
}


def _one(a):
    """상자 안에 이웃이 조금 걸쳐 있으면 가장 큰 덩어리만 남긴다."""
    lb, n = ndi.label(ndi.binary_closing(a[:, :, 3] > 24, np.ones((5, 5))))
    if n > 1:
        sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
        a[lb != int(np.argmax(sz)) + 1] = 0
    return a


def _anchor(key, a, spot):
    want = ANCHOR.get(key)
    if isinstance(want, tuple):
        return want
    if want == 'bright':
        return _bright(a)
    if want == 'center':
        return (a.shape[1] / 2, a.shape[0] / 2)
    return spot


def cut_all():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.open(SHEET).convert('RGBA')
    rows = []
    for key, (x0, y0, x1, y1) in BOX.items():
        a = np.asarray(sheet.crop((x0, y0, x1, y1))).copy()
        lab = _drop_label(a)
        boss, spot = 0, None
        if key in WITH_BOSS:
            boss, spot = _drop_boss(a)
        ys, xs = np.where(a[:, :, 3] > 8)          # 남은 그림에 바짝 붙여 자른다
        x0c, y0c = int(xs.min()), int(ys.min())
        a = a[y0c:ys.max() + 1, x0c:xs.max() + 1]
        im = Image.fromarray(a)
        im.save(os.path.join(OUT, key + '.webp'), lossless=True, quality=100, method=6)
        # 그림을 어디에 맞춰 얹을지 — 보스가 섰던 자리, 없으면 빈 구멍, 그것도 없으면 가장 밝은 곳
        if spot is None:
            spot = _hole(a) or _bright(a)
        else:
            spot = (spot[0] - x0c, spot[1] - y0c)
        spot = _anchor(key, a, spot)
        rows.append((key, im.size, lab, boss, spot))
    for key, (base, (x0, y0, x1, y1)) in SINGLE.items():
        src = np.asarray(Image.open(os.path.join(OUT, base + '.webp')).convert('RGBA'))
        a = _one(src[y0:y1 + 1, x0:x1 + 1].copy())
        ys, xs = np.where(a[:, :, 3] > 8)
        a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(a)
        im.save(os.path.join(OUT, key + '.webp'), lossless=True, quality=100, method=6)
        rows.append((key, im.size, 0, 0, _anchor(key, a, _bright(a))))
    for key, size, lab, boss, spot in rows:
        print(f'{key:7s} {size[0]:4d}x{size[1]:<4d} 라벨 {lab:2d}줄  보스 {boss:6d}px'
              f'  ax {spot[0]:5.0f} ay {spot[1]:5.0f}')


if __name__ == '__main__':
    cut_all()
