# 사용자 그림(잠든 붉은 용)을 와이번 나이트 루트 「잠든 신전」 낱장으로 옮긴다.
# python3 design/wyvern-quest/sleeping-dragon.py → public/assets/game/rpg/wyvern-quest/sleeping-dragon.webp
from pathlib import Path
from PIL import Image
import numpy as np

HERE = Path(__file__).parent
SRC = HERE / 'sleeping-dragon-src.png'
OUT = HERE.parent.parent / 'public/assets/game/rpg/wyvern-quest/sleeping-dragon.webp'
W = 1024          # 낱장 너비 — 게임은 이보다 크게 늘려 그린다
CUT = 12          # 이보다 옅은 알파는 바탕으로 본다

a = np.array(Image.open(SRC).convert('RGBA')).astype(np.float32)
al = a[..., 3]
# 흰 바탕이 남은 점(밝고 채도 낮음) 지우기 — 붉은 몸은 채도가 높아 남는다
rgb = a[..., :3]
light = (rgb.min(2) > 200) & (rgb.max(2) - rgb.min(2) < 30)
al[light] = 0
al[al < CUT] = 0
# 반투명 가장자리의 밝은 테 — 색을 몸 색 쪽으로 눌러 흰 테가 생기지 않게
edge = (al > 0) & (al < 250)
lum = rgb.mean(2)
k = np.clip((lum - 90) / 120, 0, 1)[..., None] * edge[..., None]
rgb[:] = rgb * (1 - 0.6 * k)
a[..., 3] = al
im = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA')
im = im.crop(im.getchannel('A').getbbox())
im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
OUT.parent.mkdir(parents=True, exist_ok=True)
im.save(OUT, 'WEBP', quality=90, method=6)
print(OUT, im.size)
