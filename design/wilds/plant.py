"""별이슬숲 나무 심기 — 바닥 그림(dew-forest-ground.webp)에서 흙길 · 연못을 찾아 비우고, 나머지에 나무를 빼곡히 심는다.
결과는 src/game/wildsPlant.js(종류 차례 · x · y · 크기 배율, 맵 좌표). 같은 씨앗이라 다시 돌려도 같은 숲이 나온다.
python3 design/wilds/plant.py   (scipy · numpy 필요)"""
import os, random
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = os.path.dirname(__file__)
MAP_W, MAP_H = 3200, 2100
KINDS = ['oak', 'spruce', 'birch', 'round', 'old', 'young', 'shrub', 'fern']   # wildsData.js WILD_PLANTS 와 같은 차례
TREE_W = [16, 20, 14, 16, 6, 10, 0, 0]      # 길에서 먼 곳 — 큰 나무 비율
EDGE_W = [0, 0, 0, 0, 0, 3, 6, 6]           # 길 가장자리 띠 — 덤불 · 고사리 · 어린 나무
POND = (1958, 875, 200, 130)                # 연못 둘레(중심 · 반지름) — 비운다
KEEP = [(90, 1135, 260), (1600, 230, 220), (3110, 1240, 260)]   # 출구 셋 둘레 — 비운다

im = np.asarray(Image.open(os.path.join(HERE, 'dew-forest-ground.webp')).convert('RGB')).astype(int)
r, g = im[..., 0], im[..., 1]
path = nd.binary_opening(nd.binary_closing((r > g + 8) & (r > 110), iterations=3), structure=np.ones((9, 9)))
lab, n = nd.label(path)
path = lab == (np.argmax(nd.sum(path, lab, range(1, n + 1))) + 1)
k = im.shape[1] / MAP_W
dist = nd.distance_transform_edt(~path) / k       # 맵 좌표로 흙길까지 거리

def far(x, y):
    xi, yi = min(im.shape[1] - 1, int(x * k)), min(im.shape[0] - 1, int(y * k))
    return dist[yi, xi]

rnd = random.Random(1122)
out, step = [], 96
for gy in range(60, MAP_H + 40, step):
    for gx in range(-20, MAP_W + 40, step):
        x, y = gx + rnd.uniform(-38, 38) + (step / 2 if (gy // step) % 2 else 0), gy + rnd.uniform(-30, 30)
        if not (0 <= x <= MAP_W and 0 <= y <= MAP_H + 30): continue
        if any((x - a) ** 2 + (y - b) ** 2 < rr * rr for a, b, rr in KEEP): continue
        px, py, prx, pry = POND
        if ((x - px) / prx) ** 2 + ((y - py) / pry) ** 2 < 1: continue
        d = far(x, min(y, MAP_H - 1))
        if d < 40: continue                                    # 흙길 위 · 바로 옆은 비운다
        w = EDGE_W if d < 130 else TREE_W
        if d < 130 and rnd.random() < .45: continue            # 길가 띠는 듬성듬성
        kind = rnd.choices(range(len(KINDS)), weights=w)[0]
        out.append([kind, round(x), round(y), round(rnd.uniform(.88, 1.12), 2)])
out.sort(key=lambda t: t[2])
body = ',\n'.join('  [' + ','.join(str(v) for v in t) + ']' for t in out)
with open(os.path.join(HERE, '..', '..', 'src', 'game', 'wildsPlant.js'), 'w') as f:
    f.write('/* 별이슬숲 나무 자리 — design/wilds/plant.py 가 바닥 그림의 흙길 · 연못을 비우고 만든 표. 손으로 고치지 않는다.\n'
            '   [종류 차례(wildsData.js WILD_PLANTS) , x, y, 크기 배율] */\n'
            f'export const DEW_PLANTS = [\n{body},\n];\n')
print(len(out), 'plants')
