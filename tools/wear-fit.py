"""입은 방어구 맞춤값 만들기 — src/game/wearFit.js 를 새로 쓴다.

겹침 그림(rpg/wear/<세트>.webp)은 표준 몸(검사 남, design/wear/base-body.webp)에 맞춰 그려졌다.
캐릭터마다 머리 크기 · 목 높이 · 키가 달라 몸 높이 하나로 늘리면 투구가 뜨고 갑옷이 입을 가린다.
그래서 캐릭터 그림마다 기준점 셋을 손으로 재어(MARKS) 부위마다 따로 맞춘다.
  투구 — 정수리(T, HX)와 턱 · 목(Cx, Cy) 사이 길이로 크기, 정수리로 위치
  갑옷 — 목(Cx, Cy)과 발밑(Gx, Gy) 사이 길이로 크기, 목으로 위치
  신발 — 갑옷과 같은 크기, 발밑으로 위치
T = HX = 0 이면 모자를 쓴 캐릭터라 투구를 그리지 않는다(모자 위에 투구가 얹혀 보인다).
무기 지운 그림(<보기>-bare.webp)은 잘린 범위가 달라 원래 그림과의 위치 차이를 찾아 따로 적는다.

쓰는 법: python3 tools/wear-fit.py  (새 캐릭터 그림을 더하면 MARKS 에 한 줄 더한다)
"""
import glob, json, os
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
CHAR = os.path.join(ROOT, "public/assets/characters/rpg")
# 표준 몸 프레임 — wearData.js WEAR.frame 과 같다
FRAME = {"front": [43, 28, 297, 470], "side": [49, 28, 285, 470], "back": [56, 28, 271, 470], "turn": [39, 28, 305, 470]}
REF = "warrior-m"   # 겹침 그림이 이 캐릭터에서 맞는다(표준 몸과 같은 그림)
# [정수리 y, 정수리 x, 목 x, 목 y, 발밑 x, 발밑 y] — 캐릭터 그림 원래 크기 기준
MARKS = {
  "warrior-m": {"front": [10, 99, 100, 146, 97, 290], "side": [12, 90, 93, 125, 92, 257], "back": [10, 67, 67, 115, 65, 251], "turn": [12, 83, 91, 132, 80, 262]},
  "warrior-f": {"front": [12, 138, 137, 137, 132, 270], "side": [10, 66, 75, 117, 74, 255], "back": [9, 71, 70, 117, 67, 252], "turn": [12, 107, 118, 137, 112, 262]},
  "mage-m": {"front": [0, 0, 102, 153, 97, 295], "side": [0, 0, 63, 139, 60, 276], "back": [0, 0, 89, 140, 84, 273], "turn": [0, 0, 77, 152, 82, 287]},
  "mage-f": {"front": [0, 0, 107, 150, 99, 279], "side": [0, 0, 61, 127, 60, 257], "back": [0, 0, 77, 124, 81, 263], "turn": [0, 0, 76, 143, 76, 256]},
  "archer-m": {"front": [9, 84, 90, 132, 82, 262], "side": [7, 71, 70, 120, 70, 245], "back": [10, 65, 65, 115, 66, 245], "turn": [8, 75, 82, 132, 72, 247]},
  "archer-f": {"front": [9, 114, 115, 117, 110, 237], "side": [9, 73, 82, 107, 82, 225], "back": [7, 61, 61, 112, 67, 222], "turn": [6, 60, 62, 117, 70, 230]},
  "knight-m": {"front": [12, 135, 137, 132, 136, 289], "side": [11, 100, 91, 120, 102, 260], "back": [10, 77, 78, 112, 78, 254], "turn": [11, 118, 126, 128, 118, 260]},
  "knight-f": {"front": [11, 140, 140, 119, 128, 267], "side": [9, 92, 102, 110, 104, 254], "back": [9, 115, 115, 106, 116, 257], "turn": [11, 132, 129, 119, 117, 259]},
  "gladiator-m": {"front": [12, 139, 142, 137, 137, 290], "side": [11, 100, 101, 119, 102, 258], "back": [8, 90, 90, 111, 90, 252], "turn": [11, 117, 123, 130, 118, 263]},
  "gladiator-f": {"front": [12, 135, 135, 121, 123, 270], "side": [11, 90, 104, 110, 106, 252], "back": [9, 115, 115, 105, 117, 255], "turn": [10, 130, 134, 121, 125, 257]},
  "archmage-m": {"front": [0, 0, 145, 147, 144, 295], "side": [0, 0, 98, 130, 97, 262], "back": [0, 0, 107, 127, 106, 262], "turn": [0, 0, 133, 141, 125, 267]},
  "archmage-f": {"front": [0, 0, 150, 144, 140, 290], "side": [0, 0, 96, 132, 98, 274], "back": [0, 0, 120, 141, 118, 286], "turn": [0, 0, 156, 133, 146, 281]},
  "healer-m": {"front": [18, 104, 107, 129, 102, 300], "side": [15, 93, 91, 116, 85, 270], "back": [16, 85, 85, 113, 84, 271], "turn": [20, 118, 123, 121, 121, 273]},
  "healer-f": {"front": [10, 115, 120, 117, 116, 285], "side": [9, 95, 83, 110, 84, 267], "back": [7, 95, 95, 111, 92, 278], "turn": [7, 115, 110, 113, 117, 273]},
  "elf-m": {"front": [12, 132, 137, 132, 125, 297], "side": [12, 105, 103, 120, 98, 265], "back": [15, 84, 84, 125, 88, 265], "turn": [17, 113, 125, 130, 123, 270]},
  "elf-f": {"front": [11, 135, 140, 122, 131, 277], "side": [9, 101, 91, 112, 93, 259], "back": [8, 104, 104, 118, 113, 270], "turn": [8, 126, 138, 120, 130, 265]},
  "marksman-m": {"front": [12, 126, 127, 130, 121, 295], "side": [12, 108, 95, 120, 96, 264], "back": [12, 86, 86, 117, 90, 264], "turn": [12, 112, 120, 127, 115, 272]},
  "marksman-f": {"front": [12, 147, 150, 120, 129, 277], "side": [10, 82, 78, 112, 86, 262], "back": [10, 122, 122, 115, 128, 268], "turn": [9, 130, 133, 115, 129, 265]},
  "assassin-m": {"front": [12, 127, 132, 132, 122, 292], "side": [11, 91, 84, 117, 92, 260], "back": [10, 95, 95, 107, 92, 257], "turn": [12, 105, 119, 125, 111, 265]},
  "assassin-f": {"front": [10, 130, 135, 117, 122, 270], "side": [9, 89, 82, 107, 95, 250], "back": [7, 104, 104, 115, 104, 262], "turn": [10, 114, 129, 112, 117, 257]},
  "gunner-m": {"front": [0, 0, 142, 150, 137, 310], "side": [0, 0, 90, 130, 98, 265], "back": [0, 0, 82, 123, 85, 266], "turn": [0, 0, 115, 146, 110, 286]},
  "gunner-f": {"front": [0, 0, 135, 128, 125, 277], "side": [0, 0, 99, 120, 95, 262], "back": [0, 0, 105, 123, 107, 268], "turn": [0, 0, 134, 118, 131, 270]},
  "summoner-m": {"front": [0, 0, 143, 132, 140, 292], "side": [0, 0, 98, 122, 98, 257], "back": [0, 0, 100, 133, 102, 263], "turn": [0, 0, 143, 133, 136, 268]},
  "summoner-f": {"front": [0, 0, 135, 120, 135, 282], "side": [0, 0, 89, 115, 97, 264], "back": [0, 0, 112, 134, 115, 274], "turn": [0, 0, 144, 131, 133, 271]},
}


def gray(path):
    a = np.array(Image.open(path).convert("RGBA")).astype(np.float32)
    al = a[..., 3:4] / 255
    return cv2.cvtColor((a[..., :3] * al + 128 * (1 - al)).astype(np.uint8), cv2.COLOR_RGB2GRAY)


def bare_offset(char, view):
    """무기 지운 그림에서 몸이 원래 그림보다 얼마나 옮겨졌는지 — 머리 부분을 맞춰 찾는다"""
    o, b = gray(f"{CHAR}/{char}/{view}.webp"), gray(f"{CHAR}/{char}/{view}-bare.webp")
    h, w = o.shape
    y0, x0 = int(h * 0.05), int(w * 0.2)
    tpl = o[y0:int(h * 0.45), x0:int(w * 0.8)]
    pad = 60
    r = cv2.matchTemplate(cv2.copyMakeBorder(b, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=128), tpl, cv2.TM_CCOEFF_NORMED)
    _, _, _, loc = cv2.minMaxLoc(r)
    return loc[0] - pad - x0, loc[1] - pad - y0


def fit(char, view):
    """부위마다 [배율, x, y] — 겹침 칸 한 칸을 배율로 늘려 캐릭터 그림 (x, y)에 둔다(원래 그림 픽셀)"""
    T, HX, Cx, Cy, Gx, Gy = MARKS[char][view]
    T0, HX0, Cx0, Cy0, Gx0, Gy0 = MARKS[REF][view]
    W, H = Image.open(f"{CHAR}/{REF}/{view}.webp").size
    F = FRAME[view]
    s0 = H / F[3]
    o0 = (W / 2 - (F[0] + F[2] / 2) * s0, H - (F[1] + F[3]) * s0)   # 기준 캐릭터에서 칸 왼쪽 위
    def tf(a, p, k):
        return [s0 * k, a[0] + k * (o0[0] - p[0]), a[1] + k * (o0[1] - p[1])]
    kb = (Gy - Cy) / (Gy0 - Cy0)
    head = tf((HX, T), (HX0, T0), (Cy - T) / (Cy0 - T0)) if (T or HX) else None
    return [head, tf((Cx, Cy), (Cx0, Cy0), kb), tf((Gx, Gy), (Gx0, Gy0), kb)]


def norm(parts, dx, dy, W, H):
    """그림 크기로 나눠 둔다 — 화면은 몸 그림을 그린 폭 · 높이에 곱해 쓴다"""
    return [0 if p is None else [round(p[0] / H, 5), round((p[1] + dx) / W, 4), round((p[2] + dy) / H, 4)] for p in parts]


def main():
    out = {}
    for char in MARKS:
        for view in FRAME:
            parts = fit(char, view)
            W, H = Image.open(f"{CHAR}/{char}/{view}.webp").size
            out[f"{char}/{view}"] = norm(parts, 0, 0, W, H)
            bare = f"{CHAR}/{char}/{view}-bare.webp"
            if os.path.exists(bare):
                bw, bh = Image.open(bare).size
                dx, dy = (0, 0) if (bw, bh) == (W, H) else bare_offset(char, view)
                out[f"{char}/{view}-bare"] = norm(parts, dx, dy, bw, bh)
    body = ",\n".join(f'  "{k}": {json.dumps(v, separators=(",", ":"))}' for k, v in out.items())
    js = ("/* 입은 방어구 맞춤값 — tools/wear-fit.py 가 만든다(손으로 고치지 말고 스크립트의 MARKS 를 고친다).\n"
          "   키는 캐릭터 그림 경로 끝(<캐릭터>/<보기>), 값은 [투구, 갑옷, 신발] 각각 [배율/그림 높이, x/그림 폭, y/그림 높이] — 0 이면 그리지 않는다 */\n"
          f"export const WEAR_FIT = {{\n{body},\n}};\n")
    open(os.path.join(ROOT, "src/game/wearFit.js"), "w").write(js)
    print(len(out), "개")


if __name__ == "__main__":
    main()
