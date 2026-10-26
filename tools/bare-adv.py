"""1차 전직 그림에서 무기를 지운 그림(<보기>-bare.webp)과 빈 손 자리를 만든다 — 특별 무기를 장착하면 이 그림 위에 그 무기를 손에 들려 그린다.

  python3 tools/bare-adv.py [전직 ...]

원본: design/advance/bare/<전직>.webp — 전직 시트(design/advance/classes)를 Codex 로 고쳐 무기만 지우고(10월 26일),
빈 주먹 가운데에 자홍(#FF00FF) 점을 하나씩 찍은 그림. 바탕은 초록(#00FF00).
1) 자홍 점을 찾아 자리를 적고 둘레 색으로 메운다. 2) 초록 바탕을 지운다(치유사 시트와 같은 셈).
3) cut-adv-classes.py 와 같은 셈으로 떼어 내고 같은 배율(검투사 시트)로 줄인다.
4) 손 자리를 줄인 그림 기준으로 바꿔 출력한다 — src/game/rpgArt.js ADV_HAND 에 옮겨 적는다.
"""
import importlib.util
import json
import os
import sys
import tempfile
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("cut", os.path.join(ROOT, "tools/cut-adv-classes.py"))
cut = importlib.util.module_from_spec(spec)
sys.argv, args = sys.argv[:1], sys.argv[1:]   # cut 모듈이 sys.argv 를 전직 목록으로 읽지 않게
spec.loader.exec_module(cut)
SRC = os.path.join(ROOT, "design/advance/bare")
DOT = 30          # 이보다 작은 자홍 조각은 점이 아니다(가장자리 번짐)


def key(path):
    """초록 바탕 지우기 + 자홍 점 찾기 · 메우기 → (RGBA 배열, 점 [(x, y)])"""
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    mag = (r > 170) & (b > 170) & (g < 110)
    lab, n = ndimage.label(mag)
    dots = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if (lab[sl] == i).sum() >= DOT:
            ys, xs = np.where(lab == i)
            dots.append((float(xs.mean()), float(ys.mean())))
    fill = ndimage.binary_dilation(mag, iterations=3).astype(np.uint8)
    im = cv2.inpaint(im.astype(np.uint8), fill, 5, cv2.INPAINT_TELEA).astype(float)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    spill = g - np.maximum(r, b)
    a = np.clip(1 - (spill - 35) / (150 - 35), 0, 1)
    bg = np.array([0, 255, 0.])
    out = im.copy()
    m = (a > 0) & (a < 1)
    out[m] = (im[m] - (1 - a[m, None]) * bg) / a[m, None]
    out = np.clip(out, 0, 255)
    out[..., 1] = np.minimum(out[..., 1], np.maximum(out[..., 0], out[..., 2]))   # 남은 초록 빛 번짐
    return np.dstack([out, a * 255]).astype(np.uint8), dots


def run(cls, scale):
    rgba, dots = key(os.path.join(SRC, f"{cls}.webp"))
    with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as f:
        tmp = f.name
    Image.fromarray(rgba, "RGBA").save(tmp, "WEBP", lossless=True)
    hands = {}
    for r, c, crop, feet, y0, x0 in cut.figures(tmp):
        g = "m" if r == 0 else "f"
        s = scale[(g, c)]
        w, h = crop.size
        al = np.asarray(crop)[..., 3]
        # 그 그림의 몸 위에 있는 점만 — 옆 그림의 상자와 겹친 곳의 점을 가져오지 않게
        mine = [(x, y) for x, y in dots if x0 <= x < x0 + w and y0 <= y < y0 + h and al[int(y - y0), int(x - x0)] > 128]
        outim = cut.place(crop, feet, s)
        dpath = os.path.join(cut.OUT, f"{cls}-{g}")
        outim.save(os.path.join(dpath, f"{cut.VIEWS[c]}-bare.webp"), "WEBP", quality=92, alpha_quality=100, method=6)
        if mine:
            x, y = mine[0]
            hands.setdefault(g, {})[cut.VIEWS[c]] = [round((x - x0) * s + cut.PAD), round((y - y0) * s + cut.PAD)]
        print(cls, g, cut.VIEWS[c], outim.size, "손", hands.get(g, {}).get(cut.VIEWS[c]), f"점 {len(mine)}")
    os.unlink(tmp)
    return hands


if __name__ == "__main__":
    scale = cut.scales()
    todo = args or [c for c in cut.CLASSES if os.path.exists(os.path.join(SRC, f"{c}.webp"))]
    print(json.dumps({c: run(c, scale) for c in todo}, ensure_ascii=False))
