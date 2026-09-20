"""세 칸짜리 시트(보급소·성기사탑·번개탑)에서 캐릭터만 떼어 낸다.

세 칸 모두 배경이 종이색에 가깝고, 캐릭터의 옅은 부분(금발·흰 갑옷·살갗)이
배경과 밝기 차이가 거의 없다. 선화만 따라가면 그 부분이 통째로 빠진다.
그래서 선화로 뼈대를 잡은 뒤, 뼈대에서 가까운 곳을 더 받아들이고,
그래도 안 잡히는 자리(검날·뻗은 손·머리)는 구역을 정해 따로 살린다.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEET = 'trio.png'
PANEL = {'supply': (0, 505), 'paladin': (505, 1032), 'bolt': (1032, 1536)}
PAGE = np.array([252., 250., 249.])
# 선화에 안 걸리는 자리 — 칸 안 좌표
RESCUE = {
    'supply':  [(326, 432, 432, 552)],    # 옆으로 뻗은 손
    'paladin': [(0, 158, 152, 408)],      # 검날
    'bolt':    [(38, 344, 288, 648)],     # 머리 왼쪽 절반
}

def _fill_small(m, maxa=4000):
    """작은 구멍만 메운다. 통째로 메우면 살린 구역의 모서리가 네모로 남는다."""
    lb, n = ndi.label(~m)
    if not n: return m
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    return m | np.isin(lb, [i + 1 for i, s in enumerate(sz) if s <= maxa])

def _biggest(m):
    lb, n = ndi.label(m)
    if not n: return m
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    return lb == int(np.argmax(sz)) + 1

def cut(name, ink_t=185, reach=14, tol=10, cold=None, boxtol=None, holes=4000):
    a = np.asarray(Image.open(SHEET).convert('RGB')).astype(float)
    x0, x1 = PANEL[name]
    sub = a[:, x0:x1]
    lum = sub.mean(axis=2)
    ink = ndi.binary_fill_holes(ndi.binary_closing(lum < ink_t, np.ones((5, 5))))
    core = _biggest(ink)
    diff = np.abs(sub - PAGE).max(axis=2)
    content = diff > tol
    d = ndi.distance_transform_edt(~core)
    m = _fill_small(core | (content & (d <= reach)))
    # 살릴 구역 — 종이색만 아니면 받아들인다
    ok = diff > (boxtol if boxtol is not None else tol)
    if cold is not None:                      # 푸른 번개는 빼고 받는다
        ok = ok & ((sub[:, :, 2] - sub[:, :, 0]) < cold)
    for (bx0, by0, bx1, by1) in RESCUE.get(name, ()):
        box = np.zeros_like(core); box[by0:by1, bx0:bx1] = True
        m |= ok & box
    m = _fill_small(_biggest(_fill_small(ndi.binary_closing(m, np.ones((5, 5))), holes)), holes)
    ys, xs = np.where(m)
    rgba = np.dstack([sub.astype(np.uint8), (m * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA').crop(
        (max(0, xs.min()-4), max(0, ys.min()-4), xs.max()+5, ys.max()+5))

def cut_all():
    return {'supply': cut('supply'),
            'paladin': cut('paladin'),
            'bolt': cut('bolt', reach=22, tol=6, cold=12, boxtol=22, holes=26000)}

if __name__ == '__main__':
    for k, im in cut_all().items():
        im.save(f'fix_{k}.png')
        print(k, im.size)
