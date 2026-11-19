"""군주의 영역 보강 시트(11월 20일 사용자 "pixelfx로 보완해줘").
pixelfx(MIT, github.com/patch-gg/pixelfx 5294518)로 뽑은 시트를 2칸에 1칸씩 골라(15fps) 다시 묶는다.
뽑은 명령:
  node tools/render.mjs <id> --sheet --no-actor --opts '{"palette":PAL,"light":0.4}'   (id = 아래 JOBS 의 키)
  (11월 20일 사용자 "불 같은 건 듬성듬성하고 어울리지 않아 · 새로운 걸" → shadow-flames 를 빼고 손 · 룬 원 · 소환 균열을 더했다)
  PAL = ["#08050D","#140B20","#221233","#34194D","#9B4DFF","#C792FF"]  (검보라 4단 + 빛나는 보라 2단, make.py DARK · GLOW 와 같다)
쓰는 법: python3 pack.py <pixelfx records 폴더>  → 원본은 이 폴더(src_*.webp), 게임 시트는 px/nc_pf_*.webp"""
import json, sys, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "../../../../public/assets/game/rpg/effects/hidden-jobs/necromancer/px")
STEP = 2                                     # 30fps → 15fps
JOBS = {"shadow/shadow-tendrils": ("nc_pf_tendril", 7), "shadow/grasping-hands": ("nc_pf_hands", 7),
        "arcane/rune-circle": ("nc_pf_rune", 10), "spawn/spawn-portal": ("nc_pf_portal", 8)}

src = sys.argv[1]
man = {}
for fx, (name, cols) in JOBS.items():
    b = fx.split("/")[1]
    im = Image.open(f"{src}/{fx}/{b}.png").convert("RGBA")
    m = json.load(open(f"{src}/{fx}/{b}.json"))["meta"]["pixelfx"]
    w, h = m["frameSize"]; c0 = m["columns"]
    im.save(os.path.join(HERE, f"src_{name}.webp"), lossless=True)
    keep = list(range(0, m["frames"], STEP))
    rows = (len(keep) + cols - 1) // cols
    sh = Image.new("RGBA", (w * cols, h * rows))
    for j, i in enumerate(keep):
        f = im.crop(((i % c0) * w, (i // c0) * h, (i % c0 + 1) * w, (i // c0 + 1) * h))
        sh.paste(f, ((j % cols) * w, (j // cols) * h))
    sh.save(os.path.join(OUT, f"{name}.webp"), lossless=True)
    man[name] = {"w": w, "h": h, "cols": cols, "n": len(keep), "cx": m["pivot"][0], "cy": m["pivot"][1], "fps": m["fps"] / STEP, "loop": 1 if m["loop"] else 0}
json.dump(man, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
print(man)
