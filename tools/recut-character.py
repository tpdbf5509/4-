"""캐릭터 그림의 누끼(투명 배경)를 다시 딴다 — 윤곽선 바깥에 남은 옅은 초록빛 흰 테두리를 지우고 가장자리를 부드럽게 만든다.
   쓰는 법:  python3 tools/recut-character.py <원본.webp> <결과.webp> [깊이=120] [pockets 최소크기]
   - 깊이: 바깥에서 안으로 옅은 테두리를 따라 들어갈 최대 거리(px)
   - pockets: 활과 팔 사이처럼 닫힌 윤곽 안에 갇힌 옅은 배경 조각도 지운다(최소크기 px 이상인 덩어리만)
   결과는 무손실이라 파일이 크다. 게임에 쓸 때는 Pillow 로 WEBP quality=92, alpha_quality=100 으로 다시 저장한다.
   (numpy · scipy · Pillow 필요) """
import sys, numpy as np
from PIL import Image, ImageFilter
from collections import deque
src, dst = sys.argv[1], sys.argv[2]
DEPTH = int(sys.argv[3]) if len(sys.argv) > 3 else 120
im = Image.open(src).convert("RGBA")
a = np.asarray(im).astype(np.float32)
rgb, al = a[..., :3], a[..., 3]
H, W = al.shape
lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
mn = rgb.min(axis=2)
solid = al > 127
# 바깥에서 안으로: 옅고 밝은 픽셀만 타고 들어가되 어두운 윤곽선에서 멈춘다
g = rgb[..., 1]; rb = np.maximum(rgb[..., 0], rgb[..., 2])
# 테두리 잔여물은 초록빛이 도는 흰색 · 순백이고, 캐릭터의 흰 부분(깃털 · 화살깃 · 셔츠)은 분홍 · 보랏빛이라 색으로 가른다
pale = solid & (lum > 190) & (mn > 150) & (g >= rb - 3)
dist = np.full((H, W), -1, np.int16)
q = deque()
for y in range(H):
    for x in range(W):
        if not solid[y, x]:
            dist[y, x] = 0; q.append((y, x))
removed = np.zeros((H, W), bool)
while q:
    y, x = q.popleft()
    d = dist[y, x]
    if d >= DEPTH: continue
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and dist[ny, nx] < 0 and pale[ny, nx]:
            dist[ny, nx] = d + 1; removed[ny, nx] = True; q.append((ny, nx))
keep = solid & ~removed
pk = np.zeros((H, W), bool)
# 닫힌 윤곽 안에 갇힌 옅은 배경 조각(활과 팔 사이 등)도 지운다 — 크기가 어느 정도 이상인 초록빛 흰색 덩어리만
if len(sys.argv) > 4 and sys.argv[4] == "pockets":
    from scipy import ndimage as _nd
    lab0, n0 = _nd.label(pale & keep)
    for i in range(1, n0 + 1):
        comp = lab0 == i
        if comp.sum() >= int(sys.argv[5]) if len(sys.argv) > 5 else 150:
            keep &= ~comp
            pk |= comp
# 떨어진 작은 조각 지우기
from scipy import ndimage
lab, n = ndimage.label(keep)
sizes = ndimage.sum(keep, lab, range(1, n+1))
big = sizes.max()
for i, s in enumerate(sizes, 1):
    if s < big * 0.004: keep[lab == i] = False
# 윤곽선 바로 바깥에 남은 한 겹짜리 밝은 테두리(뒤에 어두운 윤곽선이 받치고 있을 때만)를 두 번 깎는다
for _ in range(4):
    edge = keep & ~ndimage.binary_erosion(keep, iterations=1, border_value=0)
    l2 = np.where(keep, lum, 255).astype(np.float32)
    behind = ndimage.minimum_filter(l2, size=5)
    keep = keep & ~(edge & (lum > 165) & (behind < 120))
# 구멍 메우기(캐릭터 안쪽)
keep = ndimage.binary_fill_holes(keep) & ~pk      # 지운 갇힌 조각은 구멍으로 다시 메우지 않는다
# 부드러운 가장자리: 마스크를 살짝 흐려 알파로 (색은 원래 윤곽선 색을 그대로 둔다)
m = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
m = np.asarray(m).astype(np.float32) / 255
alpha = np.clip((m - 0.25) / 0.5, 0, 1)
alpha = np.minimum(alpha, np.where(keep, 1, alpha))
res = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
Image.fromarray(res, "RGBA").save(dst, "WEBP", lossless=True, quality=100, method=6)
print("제거한 옅은 테두리 픽셀", int(removed.sum()), "· 남은 조각 수", int(ndimage.label(keep)[1]))
