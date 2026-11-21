"""엔지니어 빛 연출 시트(11월 21일 사용자 "pixelfx를 통해서 이팩트만 바꿔봐").
pixelfx(MIT, github.com/patch-gg/pixelfx 5294518)로 뽑은 시트에서 쓸 칸만 골라 연마 색 셋을 줄로 묶는다.
뽑은 명령(색마다 한 번씩, 이펙트 id 는 아래 JOBS):
  node tools/render.mjs <id> --sheet --no-actor --opts '{"palette":PAL[색],"light":0.5}'
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
# id: (시트 이름, 첫 칸, 끝 칸(포함 안 함), 건너뛰기, 열)
JOBS = {
    "arcane/rune-circle": ("en_pf_rune", 0, 120, 3, 10),           # 바닥 진 — 도는 룬 원(반복)
    "arcane/magic-circle-cast": ("en_pf_cast", 45, 103, 2, 10),    # 빛 기둥 — 진이 번쩍이고 흰 기둥이 솟았다 흩어짐(1.5~3.4초)
    "pickups/collect-burst": ("en_pf_burst", 0, 32, 2, 8),         # 번짐 — 흰 섬광 · 퍼지는 고리 · 흩날리는 반짝이
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
json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
print(json.dumps(man))
