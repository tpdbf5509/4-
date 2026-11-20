"""히든 직업 Necromancer 004 — 무기를 든 보스 그림자에서 팔 + 무기를 떼어 낸다(11월 20일 사용자 "무기와 몸을 분리해서 휘두르는 모습, 팔도 관절로").
   tools/cut-necro-boss.py 가 만든 boss/<몹 종류>.webp(같은 크기 · 같은 좌표) 를 읽어
   - boss/<몹 종류>-arm<i>.webp : 다각형 POLY 안의 팔 · 무기만(나머지 투명, 원본과 같은 크기)
   - boss/<몹 종류>-body.webp   : 팔 · 무기를 뺀 몸. 몸으로 둘러싸인 빈 자리는 둘레 몸 색을 흐리게 섞어 메우고 조금 어둡게(팔 뒤 그늘), 몸 밖 자리는 투명
   어깨 자리 · 휘두르는 방향은 necroPxData.js NC_BOSS_ARM(좌표가 이 다각형과 같은 판) — 키가 같아야 한다(tools/necro.test.mjs).
   다각형은 boss webp 픽셀 좌표(눈으로 맞춘 값). 실행: python3 tools/cut-necro-arm.py"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, "public/assets/game/rpg/effects/hidden-jobs/necromancer/boss")
FILL, DARK = 14, 0.75            # 메울 틈 폭의 절반(px) · 메운 자리 밝기

POLY = {
    "barkanon": [[(205, 108), (255, 112), (258, 175), (225, 195), (150, 240), (90, 278), (0, 300), (0, 180), (60, 150), (110, 170), (110, 200), (170, 160), (200, 130)]],
    "serka": [
        [(185, 85), (200, 115), (150, 125), (140, 128), (100, 165), (0, 170), (0, 100), (40, 60), (90, 30), (150, 8), (235, 0), (240, 12), (150, 50), (130, 72)],
        [(258, 118), (292, 112), (330, 148), (380, 100), (440, 20), (480, 10), (480, 82), (440, 150), (380, 190), (320, 215), (262, 215), (246, 180)],
    ],
    "morgas": [[(205, 115), (240, 125), (232, 200), (192, 216), (120, 248), (40, 300), (0, 305), (0, 262), (80, 228), (150, 200), (175, 185), (195, 150)]],
    "tg_fire": [[(295, 90), (330, 100), (345, 150), (400, 168), (470, 238), (480, 292), (420, 292), (340, 260), (330, 200), (318, 186), (300, 150)]],
    "tg_corrode": [[(110, 110), (150, 105), (175, 160), (230, 186), (300, 210), (385, 262), (370, 278), (290, 252), (210, 226), (160, 202), (114, 180)]],
    "tg_frost": [[(255, 120), (285, 124), (312, 128), (308, 92), (285, 55), (300, 15), (375, 10), (405, 55), (395, 108), (346, 116), (330, 150), (300, 176), (256, 302), (234, 312), (246, 280), (284, 170), (262, 160)]],
    "guild_siren": [[(150, 90), (142, 126), (118, 126), (132, 160), (176, 276), (160, 282), (110, 172), (95, 122), (70, 92), (25, 60), (30, 0), (130, 0), (128, 40), (112, 80), (130, 90)]],
}

def main():
    for kind, polys in POLY.items():
        im = Image.open(os.path.join(DIR, f"{kind}.webp")).convert("RGBA")
        a = np.asarray(im).copy()
        hole = np.zeros(a.shape[:2], bool)
        for i, poly in enumerate(polys):
            m = Image.new("L", im.size, 0)
            ImageDraw.Draw(m).polygon(poly, fill=255)
            m = np.asarray(m.filter(ImageFilter.GaussianBlur(0.8))) / 255.0   # 가장자리 1px 부드럽게
            arm = a.copy()
            arm[..., 3] = (arm[..., 3] * m).astype(np.uint8)
            Image.fromarray(arm, "RGBA").save(os.path.join(DIR, f"{kind}-arm{i}.webp"), "WEBP", quality=90, method=6)
            hole |= m > 0.5
        body = a.copy()
        solid = (a[..., 3] > 40) & ~hole
        # 몸으로 둘러싸인 빈 자리만 메운다(닫기) — 몸 밖으로 뻗은 칼날 자리는 투명. 색은 둘레 몸 색을 흐리게 섞은 것
        pad = FILL + 2
        inside = ndimage.binary_closing(np.pad(solid, pad), iterations=FILL)[pad:-pad, pad:-pad]
        fill = hole & inside
        w = ndimage.gaussian_filter(solid.astype(np.float32), 5) + 1e-4
        col = np.stack([ndimage.gaussian_filter(a[..., c].astype(np.float32) * solid, 5) / w for c in range(3)], -1)
        body[hole] = 0
        body[fill, :3] = np.clip(col[fill] * DARK, 0, 255).astype(np.uint8)
        body[fill, 3] = 255
        Image.fromarray(body, "RGBA").save(os.path.join(DIR, f"{kind}-body.webp"), "WEBP", quality=90, method=6)
        print(kind, len(polys))

if __name__ == "__main__":
    main()
