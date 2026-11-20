"""그림자 낫 그림의 초록 · 청록 기운 지우기 — cut-nc-scythe.py · make-nc-scythe-icon.py · design/effects/necromancer/make.py 가 함께 쓴다."""
import numpy as np

PURPLE_GREY = (1.04, 0.9, 1.14)           # 회색 · 청록 점을 칠할 보라 회색 비율(빨강 · 초록 · 파랑)

def unteal(rgb):
    """회색 · 청록 · 초록빛 점을 보라빛 회색으로 바꾼다(11월 20일 사용자 "녹색 완전하게 지워줘").
       초록이 빨강 · 파랑 중 작은 값보다 높으면 화면에서 청록 · 초록으로 보인다 — 밝기는 두고 보라 회색(PURPLE_GREY 비율)으로 칠한다.
       보라 · 검정 점(초록이 가장 낮다)은 그대로. make.py scythe_cells · make-nc-scythe-icon.py 도 줄인 뒤 같은 식을 다시 쓴다"""
    rgb = rgb.astype(float); r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m = g > np.minimum(r, b) - 2
    L = 0.3 * r + 0.59 * g + 0.11 * b
    for i, k in enumerate(PURPLE_GREY): rgb[..., i] = np.where(m, np.clip(L * k, 0, 255), rgb[..., i])
    return rgb
