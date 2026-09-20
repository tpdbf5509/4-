import numpy as np, glob
from PIL import Image
from scipy import ndimage as ndi

def cut_chibi(path, region=(0.55, 0.42, 1.0, 0.93), tol=20, minH=0.06):
    """시트 오른쪽 '인게임 스타일' 칸에서 작은 캐릭터만 떼어 낸다"""
    im = Image.open(path).convert('RGB')
    W, H = im.size
    a = np.asarray(im).astype(np.int32)
    x0, y0 = int(W*region[0]), int(H*region[1])
    x1, y1 = int(W*region[2]), int(H*region[3])
    sub = a[y0:y1, x0:x1]
    page = a[2, 2]
    # 칸 바탕 = 이 구역에서 가장 흔한 색
    q = (sub // 8 * 8).reshape(-1, 3)
    uniq, cnt = np.unique(q, axis=0, return_counts=True)
    panel = uniq[int(np.argmax(cnt))]
    content = (np.abs(sub - page).max(axis=2) > tol) & (np.abs(sub - panel).max(axis=2) > tol)
    content = ndi.binary_closing(content, np.ones((3, 3)))
    lbl, n = ndi.label(content)
    best = None
    for i in range(1, n + 1):
        ys, xs = np.where(lbl == i)
        if len(ys) < 1500: continue
        h = ys.max() - ys.min()
        if h < H * minH: continue          # 딱지 글씨는 걸러진다
        if xs.min() <= 2 or ys.min() <= 2 or ys.max() >= sub.shape[0]-3: continue   # 잘린 것(왼쪽 본체 등)은 제외
        if h > H * 0.42: continue          # 너무 큰 것은 칸이 아니라 본체
        if best is None or xs.mean() < best[1]:
            best = (i, xs.mean(), (xs.min(), ys.min(), xs.max(), ys.max()))
    if best is None: return None, None
    i, _, (bx0, by0, bx1, by1) = best
    m = lbl == i
    m = ndi.binary_fill_holes(ndi.binary_closing(m, np.ones((5, 5))))
    rgba = np.dstack([sub.astype(np.uint8), (m * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, 'RGBA').crop((max(0, bx0-4), max(0, by0-4), bx1+5, by1+5))
    return img, (x0+bx0, y0+by0, x0+bx1, y0+by1)
