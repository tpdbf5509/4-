"""tools/export-art.mjs 가 뽑은 PNG 를 public/assets/game 에 WebP 로 옮기고, 움직이는 그림 목록(manifest.json)을 만든다.
   쓰는 법:  python3 tools/png-to-webp.py [PNG 폴더]      (기본 tools/out, Pillow 필요)
   - 배경(bg)은 화질 92 의 손실 WebP
   - 정지 그림은 무손실 WebP
   - 움직이는 그림(시트)은 프레임이 많아 화질 80 의 손실 WebP(투명 유지)
   옮기기 전에 public/assets/game 의 예전 .webp 는 모두 지운다(이름이 바뀐 그림이 남지 않게). """
import json, os, sys
from PIL import Image

SHEET_QUALITY = 80

src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "tools/out")
dst = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets", "game"))
report = json.load(open(os.path.join(src, "report.json")))

for root, _, names in os.walk(dst):
    for n in names:
        if n.endswith(".webp") or n == "manifest.json":
            os.remove(os.path.join(root, n))

total = 0
sheets = {}
for j in report["files"]:
    im = Image.open(os.path.join(src, j["file"].replace("/", "__") + ".png")).convert("RGBA")
    out = os.path.join(dst, j["file"] + ".webp")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if j["kind"] == "bg":
        im.convert("RGB").save(out, "WEBP", quality=92, method=6)
    elif j["n"] > 1:
        im.save(out, "WEBP", quality=SHEET_QUALITY, alpha_quality=90, method=4)
        sheets[j["file"]] = {"n": j["n"], "cols": j["cols"]}
    else:
        im.save(out, "WEBP", lossless=True, quality=100, method=6)
    total += os.path.getsize(out)

manifest = {"animT": report["animT"], "frames": report["frames"], "sheets": sheets}
with open(os.path.join(dst, "manifest.json"), "w") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print(len(report["files"]), "장 (움직이는 그림", len(sheets), "장)", round(total / 1e6, 2), "MB →", dst)
