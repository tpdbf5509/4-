# 광장 리뉴얼(11월 28일) — 광장 NPC 15장의 채도만 약 10% 낮춘다(밝기 · 윤곽 · 알파 그대로). 테스트 서버(?test)에서만 쓴다.
#   python3 design/plaza-npc/tone_v2.py
# 입력 public/assets/game/rpg/npc/*.webp → 출력 public/assets/game/rpg/npc-v2/*.webp
import os, glob, numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SRC = os.path.join(ROOT, "public", "assets", "game", "rpg", "npc")
OUT = os.path.join(ROOT, "public", "assets", "game", "rpg", "npc-v2")
DESAT = 0.10                                   # 채도를 줄이는 몫(계획서 8장 5번 — 중간 정도)

os.makedirs(OUT, exist_ok=True)
for p in sorted(glob.glob(os.path.join(SRC, "*.webp"))):
    a = np.asarray(Image.open(p).convert("RGBA")).astype(np.float32)
    rgb = a[..., :3]
    lum = (rgb * [0.299, 0.587, 0.114]).sum(-1, keepdims=True)   # 밝기를 지키는 회색
    a[..., :3] = lum + (rgb - lum) * (1 - DESAT)
    Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, os.path.basename(p)), "WEBP", quality=90, alpha_quality=100, method=6)
    print("ok", os.path.basename(p))
