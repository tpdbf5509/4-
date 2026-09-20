import numpy as np
from PIL import Image
from scipy import ndimage as ndi

def cut_chibi(path, region=(0.55, 0.42, 1.0, 0.93), tol=20, soft=11, minH=0.06):
    """시트 오른쪽 '인게임 스타일' 칸에서 작은 캐릭터만 떼어 낸다.

    칼끝이나 머리카락 끝처럼 옅고 가느다란 곳은 칸 바탕색과 거의 같아서
    tol 하나로는 끊어진다. 그래서 확실한 부분(tol)으로 덩어리를 고른 뒤,
    무른 기준(soft)으로 잡은 이웃 조각을 같은 자리에서 다시 붙인다.
    """
    im = Image.open(path).convert('RGB')
    W, H = im.size
    a = np.asarray(im).astype(np.int32)
    x0, y0 = int(W*region[0]), int(H*region[1])
    x1, y1 = int(W*region[2]), int(H*region[3])
    sub = a[y0:y1, x0:x1]
    page = a[2, 2]
    q = (sub // 8 * 8).reshape(-1, 3)
    uniq, cnt = np.unique(q, axis=0, return_counts=True)
    panel = uniq[int(np.argmax(cnt))]

    def maskOf(t):
        m = (np.abs(sub - page).max(axis=2) > t) & (np.abs(sub - panel).max(axis=2) > t)
        return ndi.binary_closing(m, np.ones((3, 3)))

    hard = maskOf(tol)
    lbl, n = ndi.label(hard)
    best = None
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < 1500: continue
        h = ys.max() - ys.min()
        if h < H * minH: continue
        if xs.min() <= 2 or ys.min() <= 2 or ys.max() >= sub.shape[0]-3: continue
        if h > H * 0.42: continue
        if best is None or xs.mean() < best[1]:
            best = (i, xs.mean(), (xs.min(), ys.min(), xs.max(), ys.max()))
    if best is None: return None, None
    i, _, (bx0, by0, bx1, by1) = best
    m = lbl == i

    # 옅은 끝부분 되살리기 — 본체 둘레에 붙어 있는 조각만 받아들인다
    pad = max(6, int(0.012 * H))
    near = np.zeros_like(m)
    near[max(0, by0-pad):by1+pad+1, max(0, bx0-pad):bx1+pad+1] = True
    s = maskOf(soft) & near
    s2, k = ndi.label(s)
    touch = set(np.unique(s2[ndi.binary_dilation(m, np.ones((5, 5)))])) - {0}
    for j in touch:
        piece = s2 == j
        ys, xs = np.where(piece)
        # 칸 가장자리 그라데이션까지 번지지 않게, 본체 상자를 크게 벗어나면 버린다
        if xs.min() < bx0-pad or xs.max() > bx1+pad or ys.min() < by0-pad or ys.max() > by1+pad:
            continue
        if piece.sum() > 0.5 * m.sum(): continue
        m |= piece

    m = ndi.binary_fill_holes(ndi.binary_closing(m, np.ones((3, 3))))
    # 발밑 그림자는 외곽선이 없다 — 가장 아래 선화 픽셀보다 밑은 잘라낸다
    dark = (sub.mean(axis=2) < 115) & m
    if dark.any():
        cut = np.where(dark)[0].max() + 3
        m[cut+1:, :] = False
    ys, xs = np.where(m)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max(), ys.max()
    rgba = np.dstack([sub.astype(np.uint8), (m * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA').crop((max(0, bx0-3), max(0, by0-3), bx1+4, by1+4))
    return img, (x0+bx0, y0+by0, x0+bx1, y0+by1)


def drop_disc(img, band=0.20, ink=150):
    """발밑 그림자만 지운다 — 아래쪽에서 선화와 멀리 떨어진 넓적한 부분.
       그림자에는 외곽선이 없어서 선화까지 거리가 멀다."""
    a = np.asarray(img).astype(np.int32)
    m = a[:, :, 3] > 128
    if not m.any(): return img
    lum = a[:, :, :3].mean(axis=2)
    d = ndi.distance_transform_edt(~((lum < ink) & m))
    ys, _ = np.where(m); y1 = ys.max(); hgt = y1 - ys.min() + 1
    reach = max(2.5, hgt * 0.026)
    low = np.zeros_like(m); low[int(y1 - hgt * band):, :] = True
    m2 = m & ~(low & (d > reach))
    lb, n = ndi.label(m2)
    if n:
        sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
        m2 = lb == int(np.argmax(sz)) + 1
    out = a.copy(); out[:, :, 3] = np.where(m2, a[:, :, 3], 0)
    ys, xs = np.where(m2)
    return Image.fromarray(out.astype(np.uint8), 'RGBA').crop((xs.min(), ys.min(), xs.max()+1, ys.max()+1))
