"""결전 이펙트 시트에서 이펙트만 떼어 낸다.

두 장을 다룬다. 1차 오우거 지휘관(`boss`)과 2차 대군주(`titan`)다.
둘 다 배경이 이미 투명하다. 그래서 하는 일은 셋뿐이다.

  1) 칸마다 잘라 낸다 — 좌표는 SHEETS 의 box 에 적어 두었다.
  2) 설명 라벨을 지운다.
  3) 칸 안에 함께 그려진 보스를 지운다 — 게임은 제 보스를 따로 그린다.

픽셀 자체는 건드리지 않는다. 늘리거나 돌리거나 색을 고치지 않는다.
지우는 것은 라벨과 보스뿐이고, 나머지는 원본 그대로 둔다.

    python3 design/effects/cut.py
"""

import os

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'public', 'assets', 'fx'))

SHEETS = {
    # ── 2차 대군주 ────────────────────────────────────────────
    'titan': {
        'file': 'titan-fx-sheet.webp',
        'labels': 'rows',                  # 라벨이 칸 위쪽에 걸쳐 있다
        # 시트에서 각 칸이 있는 자리 (x0, y0, x1, y1)
        'box': {
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
        },
        # 보스가 함께 그려진 칸. 가장 크고 가장 어두운 덩어리가 보스다.
        'with_boss': {'leap', 'rush', 'sweep', 'swipe', 'gore', 'pulse', 'spin'},
        'anchor': {
            'leap': 'bright', 'swipe': 'bright', 'pulse': 'center', 'rift': 'center',
            'track1': (20, 110),
        },
        # 한 칸에 여러 개가 늘어선 것은 낱개로 한 번 더 뗀다.
        # 게임에서 자리마다 따로 떨어지기 때문이다.
        'single': {
            'hail1':  ('hail',  (21, 15, 105, 150)),
            'track1': ('track', (32, 2, 68, 124)),
        },
    },
    # ── 1차 오우거 지휘관 ─────────────────────────────────────
    'boss': {
        'file': 'ogre-fx-sheet.webp',
        # 라벨이 네모 딱지로 따로 떠 있다. 이펙트와 알파가 같아 자동으로 가려낼 수 없어
        # 딱지 자리를 그대로 적어 둔다 (x0, y0, x1, y1).
        'labels': [
            (20, 39, 153, 79), (484, 39, 633, 78), (897, 39, 1013, 78), (1229, 39, 1339, 78),
            (20, 413, 104, 453), (470, 411, 570, 451), (897, 414, 1012, 454), (1243, 427, 1344, 466),
        ],
        'box': {
            'cross': (200, 60, 490, 410),      # 십자 가르기 (오른쪽 큰 것)
            'xcut':  (468, 50, 855, 410),      # 엇갈려 가르기
            'slam':  (858, 58, 1238, 396),     # 내리치기
            'leap':  (1238, 20, 1536, 428),    # 내려찍기
            'rush':  (24, 444, 472, 582),      # 돌진 (맨 위 한 줄)
            'sweep': (482, 456, 876, 710),     # 휩쓸기
            'stomp': (873, 442, 1230, 724),    # 발구르기
            'swipe': (1230, 464, 1528, 726),   # 후려치기
            'rock':  (10, 740, 740, 872),      # 낱개 돌
            'smoke': (755, 765, 998, 886),     # 낱개 연기
            'spark': (1050, 740, 1520, 990),   # 낱개 충격 자국
            'slash': (20, 866, 1040, 985),     # 낱개 베인 자국
        },
        'with_boss': set(),                # 이 시트에는 보스가 없다
        'anchor': {
            'cross': 'bright', 'xcut': 'bright', 'rush': 'center',
            'rock': 'center', 'smoke': 'center', 'spark': 'center', 'slash': 'center',
        },
        'single': {
            'stomp1': ('stomp', (0, 0, 150, 282)),
        },
    },
}


def _drop_label_rows(a):
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


def _drop_label_boxes(a, boxes):
    """적어 둔 라벨 딱지를 시트에서 통째로 지운다. 가장자리까지 두 칸 넉넉히 지운다."""
    for x0, y0, x1, y1 in boxes:
        a[max(0, y0 - 2):y1 + 2, max(0, x0 - 2):x1 + 2] = 0
    return len(boxes)


def _hole(a):
    """가운데가 비어 있는 그림(고리·파문)의 빈 구멍 한가운데."""
    m = a[:, :, 3] > 24
    lb, n = ndi.label(~m)
    if not n:
        return None
    edge = set(lb[0].tolist() + lb[-1].tolist() + lb[:, 0].tolist() + lb[:, -1].tolist())
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    best, area = None, 0
    for i in range(1, n + 1):
        if i in edge:                      # 바깥 여백은 구멍이 아니다
            continue
        if sz[i - 1] > area:
            best, area = i, sz[i - 1]
    if not best or area < 400:
        return None
    cy, cx = ndi.center_of_mass(lb == best)
    return float(cx), float(cy)


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
        return 0, None
    idx = range(1, n + 1)
    area_of = ndi.sum(np.ones_like(lb), lb, idx)
    lum_of = ndi.mean(lum, lb, idx)
    best, score = 0, 0
    for i in idx:
        area = int(area_of[i - 1])
        if area < 1200:
            continue
        # 넓으면서 어두울수록 보스에 가깝다. 돌무더기도 넓지만 보스만큼 어둡지는 않아
        # 어두운 정도에 무게를 더 둔다.
        s = area * (130 - min(130, lum_of[i - 1])) ** 2
        if s > score:
            best, score = i, s
    if not best:
        return 0, None
    m = ndi.binary_dilation(lb == best, np.ones((5, 5)))
    ys, xs = np.where(m)
    a[m] = 0
    return int(m.sum()), (float(xs.mean()), float(ys.mean()))


def _one(a):
    """상자 안에 이웃이 조금 걸쳐 있으면 가장 큰 덩어리만 남긴다."""
    lb, n = ndi.label(ndi.binary_closing(a[:, :, 3] > 24, np.ones((5, 5))))
    if n > 1:
        sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
        a[lb != int(np.argmax(sz)) + 1] = 0
    return a


def _anchor(cfg, key, a, spot):
    want = cfg['anchor'].get(key)
    if isinstance(want, tuple):
        return want
    if want == 'bright':
        return _bright(a)
    if want == 'center':
        return (a.shape[1] / 2, a.shape[0] / 2)
    return spot


def _tight(a):
    ys, xs = np.where(a[:, :, 3] > 8)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], int(xs.min()), int(ys.min())


def cut_sheet(name):
    cfg = SHEETS[name]
    out = os.path.join(OUT, name)
    os.makedirs(out, exist_ok=True)
    sheet = np.asarray(Image.open(os.path.join(HERE, cfg['file'])).convert('RGBA')).copy()
    labels = 0
    if isinstance(cfg['labels'], list):
        labels = _drop_label_boxes(sheet, cfg['labels'])   # 딱지를 한 번에 걷는다
    rows = []
    for key, (x0, y0, x1, y1) in cfg['box'].items():
        a = sheet[y0:y1, x0:x1].copy()
        lab = _drop_label_rows(a) if cfg['labels'] == 'rows' else 0  # noqa: E501
        boss, spot = (0, None)
        if key in cfg['with_boss']:
            boss, spot = _drop_boss(a)
        if key in ('cross',):                # 옆 칸이 조금 걸쳐 있으면 한 덩이만
            a = _one(a)
        a, x0c, y0c = _tight(a)
        im = Image.fromarray(a)
        im.save(os.path.join(out, key + '.webp'), lossless=True, quality=100, method=4)
        # 그림을 어디에 맞춰 얹을지 — 보스가 섰던 자리, 없으면 빈 구멍, 그것도 없으면 가장 밝은 곳
        if spot is None:
            spot = _hole(a) or _bright(a)
        else:
            spot = (spot[0] - x0c, spot[1] - y0c)
        rows.append((key, im.size, lab, boss, _anchor(cfg, key, a, spot)))
    for key, (base, (x0, y0, x1, y1)) in cfg['single'].items():
        src = np.asarray(Image.open(os.path.join(out, base + '.webp')).convert('RGBA'))
        a = _one(src[y0:y1, x0:x1].copy())
        a, _, _ = _tight(a)
        im = Image.fromarray(a)
        im.save(os.path.join(out, key + '.webp'), lossless=True, quality=100, method=4)
        rows.append((key, im.size, 0, 0, _anchor(cfg, key, a, _bright(a))))
    print(f'── {name} ({cfg["file"]}) · 걷어낸 라벨 딱지 {labels}개')
    for key, size, lab, boss, spot in rows:
        print(f'  {key:7s} {size[0]:4d}x{size[1]:<4d} 라벨 {lab:2d}줄  보스 {boss:6d}px'
              f'  ax {spot[0]:5.0f} ay {spot[1]:5.0f}')


if __name__ == '__main__':
    for name in SHEETS:
        cut_sheet(name)
