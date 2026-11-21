"""엔지니어 빛 연출 시트(11월 21일 사용자 "pixelfx를 통해서 이팩트만 바꿔봐").
pixelfx(MIT, github.com/patch-gg/pixelfx 5294518)로 뽑은 시트에서 쓸 칸만 골라 연마 색 셋을 줄로 묶는다.
뽑은 명령(색마다 한 번씩, 이펙트 id 는 아래 JOBS):
  node tools/render.mjs <id> --sheet --no-actor --opts '{"palette":PAL[색],"light":0.5, ...EXTRA}'
  EXTRA — plasma-explosion accent · emp-blast fringe · thunderclap / lightning-strike sparks 는 같은 색 계열(아래 EXTRA), ground-slam stone "#3A3F46"
쓰는 법: python3 pack.py <색별 records 폴더(teal/ pale/ gold/ 아래에 <id>/<이름>.png · .json)>
  → 게임 시트 public/.../engineer/px/en_pf_*.webp + manifest.json(src/game/engineerPxData.js ENGINEER_PFX 와 같아야 한다)"""
import json, sys, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "../../../../public/assets/game/rpg/effects/hidden-jobs/engineer/px")
TINTS = ["teal", "pale", "gold"]   # 줄 차례 = engineerArt ROW
PAL = {   # 어두운 → 밝은. 기계 색을 톤다운, 흰색은 가장 뜨거운 가운데만
    "teal": ["#0E1D20", "#12262A", "#1E3B40", "#2F6168", "#4FA7B2", "#8FD3DB", "#C6F3FF", "#EFFFFF"],
    "pale": ["#12262A", "#1E3B40", "#2F6168", "#4FA7B2", "#8FD3DB", "#C6F3FF", "#E4FAFF", "#F7FFFF"],
    "gold": ["#2A2010", "#3E2F14", "#6B4E1E", "#8E6A2C", "#B98A3A", "#D8B266", "#F2DDA6", "#FFF6DE"],
}
EXTRA = {
    "teal": {"accent": ["#12262A", "#2F6168", "#4FA7B2", "#8FD3DB", "#E4FAFF"], "sparks": ["#EFFFFF", "#C6F3FF", "#8FD3DB", "#4FA7B2"], "fringe": "#8FD3DB"},
    "pale": {"accent": ["#1E3B40", "#4FA7B2", "#8FD3DB", "#C6F3FF", "#F7FFFF"], "sparks": ["#F7FFFF", "#E4FAFF", "#C6F3FF", "#8FD3DB"], "fringe": "#C6F3FF"},
    "gold": {"accent": ["#3E2F14", "#8E6A2C", "#B98A3A", "#D8B266", "#FFF6DE"], "sparks": ["#FFF6DE", "#F2DDA6", "#D8B266", "#B98A3A"], "fringe": "#D8B266"},
}
# id: (시트 이름, 첫 칸, 끝 칸(포함 안 함), 건너뛰기, 열)
JOBS = {
    "arcane/rune-circle": ("en_pf_rune", 0, 120, 3, 10),           # 바닥 진 — 도는 룬 원(반복)
    "arcane/magic-circle-cast": ("en_pf_cast", 45, 103, 2, 10),    # 빛 기둥 — 진이 번쩍이고 흰 기둥이 솟았다 흩어짐(1.5~3.4초)
    "pickups/collect-burst": ("en_pf_burst", 0, 32, 2, 8),         # 번짐 — 흰 섬광 · 퍼지는 고리 · 흩날리는 반짝이
    # 11월 21일 사용자 "pixelfx로 새롭게 다시 그려줘" — 스킬 본체 연출도 pixelfx 로
    "projectiles/plasma-shot": ("en_pf_shot", 0, 24, 2, 6),        # 펄스 발진 탄(오른쪽으로 난다, 반복)
    "lightning/zap-hit": ("en_pf_zap", 0, 28, 2, 7),               # 전기 명중(왼쪽에서 번개가 꽂힘)
    "impacts/crit-hit": ("en_pf_crit", 0, 22, 2, 6),               # 큰 명중 — 수호자 주먹 · 레일포 끝
    "explosions/plasma-explosion": ("en_pf_plasma", 0, 44, 2, 8),  # 플라즈마 폭발 — 수호자 코어 · 궤도 마지막
    "scifi/emp-blast": ("en_pf_emp", 10, 64, 2, 9),                # 자기장 포획 — 전자기 거품이 부풀었다 끊어짐
    "lightning/thunderclap": ("en_pf_clap", 2, 40, 2, 7),          # 오버클럭 — 섬광 · 갈래 번개 · 땅 충격 고리
    "lightning/lightning-strike": ("en_pf_bolt", 20, 72, 2, 9),    # 궤도 포격 한 번 — 굵은 번개가 꽂힘
    "impacts/ground-slam": ("en_pf_slam", 0, 40, 2, 10),           # 수호자 착지 — 땅 섬광 · 충격파 · 먼지
}

src = sys.argv[1]
man = {}
for fx, (name, a, b, step, cols) in JOBS.items():
    base = fx.split("/")[1]
    keep = list(range(a, b, step))
    per = (len(keep) + cols - 1) // cols
    sh = None
    for r, tint in enumerate(TINTS):
        im = Image.open(f"{src}/{tint}/{fx}/{base}.png").convert("RGBA")
        m = json.load(open(f"{src}/{tint}/{fx}/{base}.json"))["meta"]["pixelfx"]
        w, h = m["frameSize"]; c0 = m["columns"]
        if sh is None: sh = Image.new("RGBA", (w * cols, h * per * len(TINTS)))
        for j, i in enumerate(keep):
            f = im.crop(((i % c0) * w, (i // c0) * h, (i % c0 + 1) * w, (i // c0 + 1) * h))
            sh.paste(f, ((j % cols) * w, (r * per + j // cols) * h))
    sh.save(os.path.join(OUT, f"{name}.webp"), quality=88, alpha_quality=100, method=6)   # 빛 번짐이 알파 계단이라 무손실이면 1MB 가 넘는다
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(keep), "per": per, "cx": m["pivot"][0], "cy": m["pivot"][1], "fps": m["fps"] / step, "loop": 1 if m["loop"] else 0}

# ── 은은한 빛 번짐(11월 21일 사용자 "이거처럼 빛이 은은하게 퍼지는 이펙트") ──
# pixelfx 시트 바깥으로 넓게 번지는 부드러운 빛. 도트가 아니라 매끈한 그러데이션이라 게임이 늘려(부드럽게) 그린다.
# 칸 0 둥근 번짐 · 칸 1 기둥 번짐(가로는 가운데가 짙고, 세로는 아래가 짙고 위로 사라짐). 줄 = 연마 색
import numpy as np
HALO = {"teal": ("#8FD3DB", "#C6F3FF"), "pale": ("#C6F3FF", "#EFFFFF"), "gold": ("#D8B266", "#F2DDA6")}
HS = 128
def rgbv(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
yy, xx = (np.mgrid[0:HS, 0:HS] + .5) / HS * 2 - 1
ring = np.exp(-(np.hypot(xx, yy) / .5) ** 2) * (np.hypot(xx, yy) < 1)
col = np.exp(-(xx / .45) ** 2) * np.clip((yy + 1) / 2, 0, 1) ** .8 * (np.abs(xx) < 1)
halo = np.zeros((HS * 3, HS * 2, 4), np.uint8)
for r, tint in enumerate(TINTS):
    a_, b_ = (rgbv(c) for c in HALO[tint])
    for c, m in enumerate((ring, col)):
        rgb = a_ + (b_ - a_) * m[..., None] ** 2           # 가운데로 갈수록 밝은 색
        cell = np.dstack([rgb, m * 255 * .9])
        halo[r * HS:(r + 1) * HS, c * HS:(c + 1) * HS] = np.clip(np.round(cell), 0, 255)
Image.fromarray(halo, "RGBA").save(os.path.join(OUT, "en_pf_halo.webp"), quality=90, alpha_quality=100, method=6)
man["en_pf_halo"] = {"w": HS, "h": HS, "cols": 2, "n": 2, "per": 1, "cx": HS // 2, "cy": HS // 2, "fps": 0, "loop": 0}
json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
print(json.dumps(man))
