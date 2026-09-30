"""tools/export-art.mjs 가 뽑은 PNG 를 public/assets/game 에 WebP 로 옮긴다.
   쓰는 법:  python3 tools/png-to-webp.py [PNG 폴더]      (기본 tools/out, Pillow 필요)
   배경(bg)은 화질 92 의 손실 WebP, 나머지(투명 그림)는 무손실 WebP 로 저장한다. """
import json, os, sys
from PIL import Image

src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "tools/out")
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "game")
report = json.load(open(os.path.join(src, "report.json")))
total = 0
for j in report:
    im = Image.open(os.path.join(src, j["file"].replace("/", "__") + ".png")).convert("RGBA")
    out = os.path.join(dst, j["file"] + ".webp")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if j["kind"] == "bg":
        im.convert("RGB").save(out, "WEBP", quality=92, method=6)
    else:
        im.save(out, "WEBP", lossless=True, quality=100, method=6)
    total += os.path.getsize(out)
print(len(report), "장", round(total / 1e6, 2), "MB →", os.path.normpath(dst))
