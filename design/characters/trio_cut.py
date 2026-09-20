"""세 칸짜리 시트(보급소·성기사탑·번개탑)에서 캐릭터만 떼어 낸다.

이 시트는 배경이 이미 투명하다. 그래서 알파를 그대로 쓰고,
덩어리 중 큰 셋(=세 캐릭터)만 남긴다. 남은 작은 것들은 지워지다 만
제목 글씨와 떨어져 나온 물약이다. 색을 재거나 선화를 좇을 일이 없어
원본과 픽셀 하나까지 같다.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SHEET = 'trio-tower-sheet.webp'

def cut_all(path=SHEET):
    a = np.asarray(Image.open(path).convert('RGBA'))
    al = a[:, :, 3]
    lb, n = ndi.label(ndi.binary_closing(al > 24, np.ones((3, 3))))
    sz = ndi.sum(np.ones_like(lb), lb, range(1, n + 1))
    big = np.argsort(sz)[::-1][:3] + 1
    spots = sorted((np.where(lb == k)[1].mean(), k) for k in big)   # 왼쪽부터
    out = {}
    for (_, k), name in zip(spots, ('supply', 'paladin', 'bolt')):
        m = lb == k
        ys, xs = np.where(m)
        px = a.copy()
        px[:, :, 3] = np.where(m, al, 0)
        out[name] = Image.fromarray(px, 'RGBA').crop(
            (xs.min()-3, ys.min()-3, xs.max()+4, ys.max()+4))
    return out

if __name__ == '__main__':
    for k, im in cut_all().items():
        im.save(f'{k}-tower-cut.webp', 'WEBP', lossless=True, method=6, exact=True)
        print(k, im.size)
