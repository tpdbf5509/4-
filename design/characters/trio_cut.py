"""세 칸짜리 시트(보급소·성기사탑·번개탑)에서 캐릭터만 떼어 낸다."""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEET = 'trio.png'
PANEL = {'supply': (0, 505), 'paladin': (505, 1032), 'bolt': (1032, 1536)}
PAGE = np.array([252., 250., 249.])

def _core(sub, ink_t):
    """선화로 뼈대를 잡는다 — 가장 큰 덩어리가 캐릭터다"""
    lum = sub.mean(axis=2)
    ink = ndi.binary_fill_holes(ndi.binary_closing(lum < ink_t, np.ones((5, 5))))
    lb, n = ndi.label(ink)
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    return lb == int(np.argmax(sz)) + 1

def _biggest(m):
    lb, n = ndi.label(m)
    if not n: return m
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    return ndi.binary_fill_holes(lb == int(np.argmax(sz)) + 1)

def cut(name, ink_t=185, reach=14, tol=10, boxes=()):
    a = np.asarray(Image.open(SHEET).convert('RGB')).astype(float)
    x0, x1 = PANEL[name]
    sub = a[:, x0:x1]
    core = _core(sub, ink_t)
    content = np.abs(sub - PAGE).max(axis=2) > tol
    d = ndi.distance_transform_edt(~core)
    m = core | (content & (d <= reach))
    for (bx0, by0, bx1, by1) in boxes:      # 옅어서 안 잡히는 자리는 따로 받아 준다
        box = np.zeros_like(core); box[by0:by1, bx0:bx1] = True
        m |= content & box
    m = _biggest(ndi.binary_fill_holes(ndi.binary_closing(m, np.ones((7, 7)))))
    return _crop(sub, m)

def cut_bolt(ink_t=185, tol=6, lim=22):
    """번개탑만 다르다. 금발과 살갗이 흰 배경과 밝기가 거의 같아 선화가 끊긴다.
       그래서 종이색만 아니면 모두 받아들이되, 뼈대에서 22픽셀 안으로 잘라 낸다.
       몸을 감싼 번개는 남는다 — 작게 줄였을 때 번개탑임을 알려 주는 것이 그 번개다."""
    a = np.asarray(Image.open(SHEET).convert('RGB')).astype(float)
    x0, x1 = PANEL['bolt']
    sub = a[:, x0:x1]
    core = _core(sub, ink_t)
    d = ndi.distance_transform_edt(~core)
    dist = np.abs(sub - PAGE).max(axis=2)
    m = ndi.binary_closing(dist > tol, np.ones((5, 5))) & (d <= lim)
    m = _biggest(ndi.binary_fill_holes(m))
    return _crop(sub, m)

def _crop(sub, m):
    ys, xs = np.where(m)
    rgba = np.dstack([sub.astype(np.uint8), (m * 255).astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA').crop(
        (max(0, xs.min()-4), max(0, ys.min()-4), xs.max()+5, ys.max()+5))

if __name__ == '__main__':
    out = {'supply': cut('supply'), 'paladin': cut('paladin'), 'bolt': cut_bolt()}
    for k, im in out.items():
        im.save(f'trio_{k}.png')
        print(k, im.size)
