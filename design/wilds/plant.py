"""바깥 장소 나무 심기 — 바닥 그림에서 길(과 너덜 · 연못)을 찾아 비우고, 나머지에 나무를 빼곡히 심는다.
결과는 src/game/wildsPlant.js(맵마다 [종류 차례, x, y, 크기 배율], 맵 좌표). 같은 씨앗이라 다시 돌려도 같은 숲이 나온다.
python3 design/wilds/plant.py   (scipy · numpy 필요)"""
import os, random
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

HERE = os.path.dirname(__file__)
MAP_W, MAP_H = 3200, 2100

# 맵마다 — ground: 바닥 그림 · open: 길로 볼 색(흐린 그림 기준) · keep_all: 크기가 이만큼 넘는 덩어리는 모두 비움(없으면 가장 큰 덩어리만)
# tree/edge: 종류 비율(wildsData.js WILD_PLANTS 묶음 차례), keep: 비울 원(출구 둘레 등), lamps: 길 따라 등불(종류 번호 · 간격)
MAPS = {
    'DEW_PLANTS': dict(ground='dew-forest-ground.webp', blur=0, open=lambda r, g, b: (r > g + 8) & (r > 110), keep_all=None, seed=1122,
                       tree=[16, 20, 14, 16, 6, 10, 0, 0], edge=[0, 0, 0, 0, 0, 3, 6, 6],
                       keep=[(110, 1135, 280), (1600, 230, 220), (3090, 1240, 280), (1958, 875, 200)]),
    'LANTERN_PLANTS': dict(ground='lantern-forest-ground.webp', blur=0, open=lambda r, g, b: (r > g + 25) & (r > 150), keep_all=1500, seed=1123,
                           tree=[22, 18, 8, 10, 8, 0, 0, 4], edge=[0, 0, 0, 0, 4, 6, 0, 3],
                           keep=[(1545, 2010, 260), (1590, 230, 240)], lamps=(6, 300)),
    'SCREE_PLANTS': dict(ground='scree-forest-ground.webp', blur=4, open=lambda r, g, b: (g - b < 52) & (r - g > 24), keep_all=1500, seed=1124,
                         tree=[18, 12, 10, 10, 10, 0, 0, 6], edge=[0, 0, 0, 0, 3, 6, 4, 2],
                         keep=[(110, 1140, 280), (3090, 800, 280)]),
    # 서리봉 — 산자락 풀밭에만 드문드문(floor 위는 바위 벼랑이라 심지 않는다)
    'FROST_PLANTS': dict(ground='frost-ground.webp', blur=2, open=lambda r, g, b: (r > g + 15) & (r - b > 35), keep_all=None, seed=1125,
                         tree=[10, 12, 8, 8, 8, 6, 4, 2], edge=[0, 0, 0, 2, 5, 4, 3, 3], floor=760, sparse=.5,
                         keep=[(1530, 2030, 240), (1390, 1880, 160), (1590, 740, 220)]),
}
# 칼등산 — 밝은 능선만 걷는다. 능선 바로 밖 벼랑 끝에 바위 · 나무, 능선 위엔 풀만, 그 밖은 보이지 않는 막힘(RIDGE_BLOCKS)
RIDGE = dict(ground='ridge-ground.webp', blur=4, open=lambda r, g, b: (r > 150) & (g > 140) & (b > 120) & (r - b < 50), seed=1126,
             rim=[2, 6, 5, 3, 4, 4, 0, 1], keep=[(110, 1510, 200), (300, 1465, 150), (2900, 580, 160)],
             block_step=80, block_r=56, block_band=(34, 420))

def mask(c):
    pic = Image.open(os.path.join(HERE, c['ground'])).convert('RGB')
    if c['blur']: pic = pic.filter(ImageFilter.GaussianBlur(c['blur']))
    im = np.asarray(pic).astype(int)
    m = c['open'](im[..., 0], im[..., 1], im[..., 2])
    m = nd.binary_opening(nd.binary_closing(m, iterations=3), structure=np.ones((9, 9)))
    lab, n = nd.label(m)
    sz = nd.sum(m, lab, range(1, n + 1))
    keep = [i + 1 for i in range(n) if c.get('keep_all') and sz[i] > c['keep_all']] or [int(np.argmax(sz)) + 1]
    return im, np.isin(lab, keep)

def plant(name, c):
    im, path = mask(c)
    k = im.shape[1] / MAP_W
    dist = nd.distance_transform_edt(~path) / k
    far = lambda x, y: dist[min(im.shape[0] - 1, int(y * k)), min(im.shape[1] - 1, int(x * k))]
    rnd = random.Random(c['seed'])
    out, step = [], 96
    if c.get('lamps'):                                   # 길 가장자리에 등불 — 줄마다 길 가운데를 찾아 번갈아 왼쪽 · 오른쪽
        kind, gap = c['lamps']
        for i, y in enumerate(range(380, MAP_H - 120, gap)):
            xs = np.where(path[int(y * k)])[0]
            if not len(xs): continue
            side = 1 if i % 2 else -1
            x = (xs.max() / k + 70) if side > 0 else (xs.min() / k - 70)
            out.append([kind, round(x), y, 1.0])
    lamp_at = [(t[1], t[2]) for t in out]
    for gy in range(60, MAP_H + 40, step):
        for gx in range(-20, MAP_W + 40, step):
            x, y = gx + rnd.uniform(-38, 38) + (step / 2 if (gy // step) % 2 else 0), gy + rnd.uniform(-30, 30)
            if not (0 <= x <= MAP_W and c.get('floor', 0) <= y <= MAP_H + 30): continue
            if c.get('sparse') and rnd.random() < c['sparse']: continue   # 기존 숲의 난수 차례는 그대로
            if any((x - a) ** 2 + (y - b) ** 2 < rr * rr for a, b, rr in c['keep']): continue
            if any((x - a) ** 2 + (y - b) ** 2 < 90 ** 2 for a, b in lamp_at): continue
            d = far(x, min(y, MAP_H - 1))
            if d < 40: continue                                    # 길 위 · 바로 옆은 비운다
            w = c['edge'] if d < 130 else c['tree']
            if d < 130 and rnd.random() < .45: continue            # 길가 띠는 듬성듬성
            out.append([rnd.choices(range(len(w)), weights=w)[0], round(x), round(y), round(rnd.uniform(.88, 1.12), 2)])
    out.sort(key=lambda t: t[2])
    print(name, len(out))
    return table(name, out)

table = lambda name, out: f'export const {name} = [\n' + ',\n'.join('  [' + ','.join(str(v) for v in t) + ']' for t in out) + ',\n];\n'

def ridge(c):
    im, path = mask(c)
    k = im.shape[1] / MAP_W
    out_d = nd.distance_transform_edt(~path) / k          # 능선 밖으로 얼마나
    in_d = nd.distance_transform_edt(path) / k            # 능선 안으로 얼마나
    at = lambda a, x, y: a[min(im.shape[0] - 1, max(0, int(y * k))), min(im.shape[1] - 1, max(0, int(x * k)))]
    rnd = random.Random(c['seed'])
    near = lambda x, y: any((x - a) ** 2 + (y - b) ** 2 < rr * rr for a, b, rr in c['keep'])
    plants, blocks = [], []
    for gy in range(40, MAP_H, 70):                         # 벼랑 끝 바위 · 나무, 능선 위 풀
        for gx in range(0, MAP_W, 70):
            x, y = gx + rnd.uniform(-26, 26), gy + rnd.uniform(-22, 22)
            if near(x, y): continue
            o, i = at(out_d, x, y), at(in_d, x, y)
            if 6 < o < 60 and rnd.random() < .55:
                plants.append([rnd.choices(range(8), weights=c['rim'])[0], round(x), round(y), round(rnd.uniform(.85, 1.15), 2)])
            elif i > 30 and rnd.random() < .07:
                plants.append([6, round(x), round(y), round(rnd.uniform(.8, 1.1), 2)])
    s, (lo, hi) = c['block_step'], c['block_band']
    for gy in range(0, MAP_H + s, s):                       # 능선 밖 막힘 — 걸을 수 있는 쪽 가장자리만 깐다
        for gx in range(0, MAP_W + s, s):
            if lo <= at(out_d, gx, gy) <= hi: blocks.append([gx, gy, c['block_r']])
    plants.sort(key=lambda t: t[2])
    print('RIDGE', len(plants), 'blocks', len(blocks))
    return table('RIDGE_PLANTS', plants) + table('RIDGE_BLOCKS', blocks)

body = ''.join(plant(n, c) for n, c in MAPS.items()) + ridge(RIDGE)
with open(os.path.join(HERE, '..', '..', 'src', 'game', 'wildsPlant.js'), 'w') as f:
    f.write('/* 바깥 장소 나무 자리 — design/wilds/plant.py 가 바닥 그림의 길을 비우고 만든 표. 손으로 고치지 않는다.\n'
            '   [종류 차례(wildsData.js WILD_SETS 묶음 안 차례), x, y, 크기 배율] */\n' + body)
