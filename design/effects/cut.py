"""이펙트 시트에서 이펙트만 떼어 낸다.

세 장을 다룬다. 1차 오우거 지휘관(`boss`), 2차 대군주(`titan`),
그리고 병과 캐릭터의 평타·스킬(`hero`)이다.

  1) 칸마다 잘라 낸다 — 좌표는 SHEETS 의 box 에 적어 두었다.
  2) 설명 라벨을 지운다.
  3) 칸 안에 함께 그려진 보스를 지운다 — 게임은 제 보스를 따로 그린다.
  4) 깔려 있는 배경 안개를 걷는다 (`wash`).

보스 시트 둘은 배경이 이미 투명해 4)가 없다. 병과 시트는 줄마다 옅은
색 안개가 깔려 있어, 그 안개만 걷어 내고 그림은 그대로 둔다.

픽셀 자체는 건드리지 않는다. 늘리거나 돌리거나 색을 고치지 않는다.
지우는 것은 라벨·보스·배경뿐이고, 나머지는 원본 그대로 둔다.

    python3 design/effects/cut.py
"""

import os

import numpy as np
import scipy.ndimage as ndi
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', '..', 'public', 'assets', 'effects'))

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
    # ── 병과 캐릭터 (궁수탑·저격탑·대포탑) ────────────────────
    # 한 장에 세 줄이다. 위가 초록(궁수탑), 가운데가 파랑(저격탑), 아래가 주황(대포탑).
    # 라벨도 보스도 없고, 대신 줄마다 옅은 색 안개가 깔려 있어 그것만 걷는다.
    'hero': {
        'file': 'hero-fx-sheet.webp',
        'labels': None,
        'wash': True,
        # 칸 이름에 이미 병과가 붙어 있어 시트 이름으로 한 겹 더 싸지 않는다
        'root': True,
        'box': {
            # 궁수탑 — 초록
            'archer/arrow':  (148, 207, 440, 291),    # 날아가는 화살
            'archer/volley': (452, 66, 848, 412),     # 집중 사격 — 화살 무리
            'archer/hit':    (834, 77, 1048, 413),    # 크게 꽂힌 자국
            'archer/hit1':   (1042, 244, 1154, 404),  # 한 대 꽂힌 자국
            'archer/ring':   (1173, 312, 1328, 396),  # 땅에 남는 고리
            # 저격탑 — 파랑
            'sniper/slug':   (24, 598, 278, 682),     # 날아가는 탄
            'sniper/mark':   (737, 414, 1093, 578),   # 결정타 — 겨누어 꿰뚫는다
            'sniper/hit':    (1118, 418, 1322, 616),  # 꽂힌 자국
            'sniper/spark':  (1340, 427, 1385, 498),  # 튀는 빛
            # 대포탑 — 주황
            'cannon/shell':  (360, 762, 510, 834),    # 날아가는 포탄
            'cannon/boom':   (715, 734, 897, 898),    # 터진 자국
            'cannon/rain1':  (1158, 700, 1204, 788),  # 융단 폭격 — 떨어지는 포탄 하나
            'cannon/hit':    (1306, 840, 1398, 904),  # 땅에 터진 자국
            'cannon/trail':  (24, 898, 396, 992),     # 불꼬리
            'cannon/smoke':  (786, 898, 886, 996),    # 포연
        },
        'with_boss': set(),
        'anchor': {
            # 날아가는 것은 머리 끝에 맞춘다
            'archer/arrow': 'tip', 'sniper/slug': 'tip', 'cannon/shell': 'tip',
            'cannon/trail': 'tip', 'sniper/mark': 'tip',
            # 터지는 것은 가장 밝은 한가운데
            'archer/hit': 'bright', 'archer/hit1': 'bright',
            'sniper/hit': 'bright', 'cannon/boom': 'bright', 'cannon/hit': 'bright',
            # 떨어지는 포탄은 닿는 발끝
            'cannon/rain1': 'foot',
            'archer/volley': 'center', 'sniper/spark': 'center', 'cannon/smoke': 'center',
        },
        'single': {},
    },
    # ── 병과 캐릭터 둘째 장 (번개탑·화염탑·독탑) ──────────────
    # 위가 번개(파랑·노랑), 가운데가 불(주황·빨강), 아래가 독(초록·보라).
    'hero2': {
        'file': 'hero2-fx-sheet.webp',
        'labels': None,
        'wash': True,
        'root': True,
        'box': {
            # 번개탑
            'bolt/fly':     (909, 110, 1162, 202),   # 날아가는 번개
            'bolt/hit':     (588, 92, 706, 200),     # 꽂힌 자국
            'bolt/strike':  (6, 12, 138, 290),       # 뇌우 — 하늘에서 내리꽂힌다
            'bolt/arc':     (250, 55, 520, 250),     # 이어지는 줄기
            'bolt/ring':    (710, 84, 910, 264),     # 땅에 남는 고리
            'bolt/storm':   (1140, 5, 1534, 355),    # 뇌우 — 크게 휘몰아친다
            # 화염탑은 hero4 로 옮겼다 (이펙트를 새로 받았다)
            # 독탑
            'poison/fly':   (24, 797, 241, 864),     # 날아가는 독구슬
            'poison/hit':   (253, 752, 420, 900),    # 터진 자국
            'poison/cloud': (466, 755, 663, 908),    # 퍼지는 독무
            'poison/pool':  (673, 776, 912, 910),    # 땅에 고인 독
            'poison/drop':  (937, 800, 991, 900),    # 떨어지는 독방울
            'poison/storm': (1150, 715, 1520, 938),  # 역병 — 크게 퍼진다
            'poison/ring':  (795, 935, 1047, 1013),  # 땅에 남는 고리
        },
        'with_boss': set(),
        'anchor': {
            'bolt/fly': 'tip', 'poison/fly': 'tip',
            'bolt/hit': 'bright', 'poison/hit': 'bright',
            'bolt/strike': 'foot', 'poison/drop': 'foot',
            'bolt/arc': 'center', 'bolt/storm': 'center',
            'poison/cloud': 'center', 'poison/storm': 'center',
            # 고리와 고인 자리는 빈 구멍 한가운데 (기본값)
        },
        'single': {},
    },
    # ── 병과 캐릭터 셋째 장 (서리탑·중력탑·보급소) ────────────
    'hero3': {
        'file': 'hero3-fx-sheet.webp',
        'labels': None, 'wash': True, 'root': True,
        'box': {
            # 서리탑 — 파랑
            'frost/fly':     (210, 100, 400, 168),   # 날아가는 얼음살
            'frost/hit':     (438, 100, 700, 370),   # 솟는 얼음
            'frost/big':     (712, 42, 1128, 406),   # 한파 — 크게 얼어붙는다
            'frost/sigil':   (1120, 136, 1322, 370), # 얼음 결정
            'frost/ring':    (1320, 250, 1518, 382), # 땅에 남는 고리
            # 중력탑 — 보라
            'gravity/pull':  (18, 436, 152, 570),    # 빨아들이는 소용돌이
            'gravity/crush': (498, 388, 776, 726),   # 짓누르며 솟는 파편
            'gravity/field': (782, 444, 1140, 762),  # 돌아가는 중력장
            'gravity/hole':  (1136, 448, 1390, 730), # 블랙홀
            'gravity/swirl': (1394, 442, 1522, 732), # 감아올리는 기둥
            # 보급소 — 분홍
            'supply/beam':   (20, 766, 258, 986),    # 빛기둥
            'supply/dome':   (266, 778, 482, 976),   # 감싸는 보호막
            'supply/bless':  (488, 766, 656, 980),   # 축복
            'supply/ring':   (652, 800, 812, 962),   # 땅에 남는 고리
            'supply/wave':   (820, 790, 1040, 972),  # 흐르는 띠
            'supply/spark':  (1050, 780, 1240, 972), # 반짝이는 십자
            'supply/up':     (1250, 766, 1420, 980), # 솟는 빛
        },
        'with_boss': set(),
        'anchor': {
            'frost/fly': 'tip',
            'frost/hit': 'foot', 'frost/big': 'foot', 'gravity/crush': 'foot',
            'supply/beam': 'foot', 'supply/bless': 'foot', 'supply/up': 'foot',
            'frost/sigil': 'center', 'gravity/hole': 'bright', 'gravity/swirl': 'center',
            'supply/dome': 'center', 'supply/wave': 'center', 'supply/spark': 'center',
        },
        'single': {},
    },
    # ── 병과 캐릭터 넷째 장 (부식탑·성기사탑·화염탑) ──────────
    'hero4': {
        'file': 'hero4-fx-sheet.webp',
        'labels': None, 'wash': True, 'root': True,
        'box': {
            # 부식탑 — 초록·보라
            'corrode/fly':   (284, 156, 446, 254),   # 날아가는 부식구
            'corrode/hit':   (460, 90, 646, 288),    # 녹아드는 자국
            'corrode/pool':  (662, 92, 916, 286),    # 땅에 고인 부식
            'corrode/up':    (920, 56, 1200, 296),   # 솟는 기둥
            'corrode/storm': (1214, 16, 1510, 336),  # 산성비 — 휘몰아친다
            # 성기사탑 — 금색
            'paladin/fly':   (32, 448, 244, 502),    # 날아가는 검기
            'paladin/slash': (242, 466, 502, 612),   # 베어 넘기는 호
            'paladin/blade': (530, 384, 712, 620),   # 내리꽂는 검
            'paladin/orb':   (700, 392, 944, 608),   # 감싸는 구체
            'paladin/ring':  (938, 388, 1254, 610),  # 휘도는 고리
            'paladin/sigil': (1248, 370, 1516, 676), # 성역 — 방패 문장
            # 화염탑 — 빨강 (새로 받은 이펙트)
            'flame/fly':     (24, 740, 190, 820),    # 날아가는 불꽃
            'flame/hit':     (494, 708, 740, 932),   # 솟구치는 불길
            'flame/boom':    (748, 730, 1000, 928),  # 터진 자국
            'flame/up':      (1030, 732, 1298, 926), # 두 줄기 불기둥
            'flame/storm':   (1280, 690, 1520, 930), # 화염 폭풍 — 회오리
            'flame/ring':    (1216, 944, 1372, 996), # 발밑 불고리
        },
        'with_boss': set(),
        'anchor': {
            'corrode/fly': 'tip', 'paladin/fly': 'tip', 'flame/fly': 'tip',
            'corrode/hit': 'bright', 'flame/boom': 'bright',
            'corrode/up': 'foot', 'flame/hit': 'foot', 'flame/up': 'foot',
            'paladin/blade': 'foot',
            'corrode/storm': 'center', 'flame/storm': 'center',
            'paladin/slash': 'center', 'paladin/orb': 'center',
            'paladin/ring': 'center', 'paladin/sigil': 'center',
        },
        'single': {},
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


def _drop_wash(sheet):
    """줄마다 깔려 있는 옅은 색 안개를 걷는다.

    안개는 넓고 매끈하다. 작게 줄여 낮은 분위수를 재면 이펙트에 휘둘리지 않고
    그 언저리의 바탕값이 나온다. 그만큼 알파에서 덜어 내고, 남은 아주 옅은
    자락은 부드럽게 0 으로 보낸다. 색(RGB)은 건드리지 않는다.
    """
    al = sheet[:, :, 3].astype(np.float64)
    h, w = al.shape
    small = np.asarray(Image.fromarray(sheet[:, :, 3]).resize((w // 8, h // 8), Image.BOX))
    bg = ndi.gaussian_filter(ndi.percentile_filter(small.astype(np.float64), 12,
                                                   size=21, mode='nearest'), 3)
    bg = np.asarray(Image.fromarray(bg.astype(np.uint8)).resize((w, h), Image.BICUBIC))
    left = np.clip(al - bg, 0, 255)
    t = np.clip((left - 18) / 24, 0, 1)            # 18 아래는 안개, 42 위는 그림
    sheet[:, :, 3] = (left * (t * t * (3 - 2 * t))).astype(np.uint8)
    return int(bg.max())


def _tip(a):
    """날아가는 것의 머리 끝 — 가장 밝은 무리 중 가장 앞(오른쪽)."""
    al = a[:, :, 3].astype(float)
    lum = a[:, :, :3].astype(float).mean(2) * (al / 255)
    if not (al > 40).any():
        return float(a.shape[1]), a.shape[0] / 2.0
    ys, xs = np.where(lum > np.percentile(lum[al > 40], 96))
    edge = xs.max()
    near = xs > edge - 6
    return float(xs[near].mean()), float(ys[near].mean())


def _foot(a):
    """떨어지는 것이 닿는 자리 — 아래 끝 한가운데."""
    ys, xs = np.where(a[:, :, 3] > 24)
    low = ys > ys.max() - 8
    return float(xs[low].mean()), float(ys.max())


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
    if want == 'tip':
        return _tip(a)
    if want == 'foot':
        return _foot(a)
    if want == 'center':
        return (a.shape[1] / 2, a.shape[0] / 2)
    return spot


def _tight(a):
    ys, xs = np.where(a[:, :, 3] > 8)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], int(xs.min()), int(ys.min())


def cut_sheet(name):
    cfg = SHEETS[name]
    out = OUT if cfg.get('root') else os.path.join(OUT, name)
    os.makedirs(out, exist_ok=True)
    sheet = np.asarray(Image.open(os.path.join(HERE, cfg['file'])).convert('RGBA')).copy()
    wash = _drop_wash(sheet) if cfg.get('wash') else 0
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
        dst = os.path.join(out, key + '.webp')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im.save(dst, lossless=True, quality=100, method=4)
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
    note = f'걷어낸 라벨 딱지 {labels}개' if labels else ''
    if wash:
        note = f'배경 안개 최대 알파 {wash} 걷어 냄'
    print(f'── {name} ({cfg["file"]}) · {note}')
    for key, size, lab, boss, spot in rows:
        print(f'  {key:14s} {size[0]:4d}x{size[1]:<4d} 라벨 {lab:2d}줄  보스 {boss:6d}px'
              f'  ax {spot[0]:5.0f} ay {spot[1]:5.0f}')


if __name__ == '__main__':
    for name in SHEETS:
        cut_sheet(name)
