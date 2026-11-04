#!/usr/bin/env python3
"""공허의 관측자 임시 그림 생성(11월 4일). 실제 이미지 생성 도구가 없어 코드로 그린 도트 그림이다.
Codex 가 만든 정식 그림이 들어오면 같은 경로 · 같은 크기로 덮어쓴다(docs/공허의-관측자-그림-규격.md).

만드는 파일
  public/assets/game/rpg/boss/void-observer.webp        1024 x 512 (2열 x 1행: 기본 · 공격 준비). 발 기준 .84 (worldBossData.js art feet)
  public/assets/game/rpg/items/world-equipment.webp     원래 1916 x 1095 위에 5행을 이어 붙여 1916 x 1369 (7열 x 5행)
      5행 0~2열 = 공허의 대검 · 지팡이 · 장궁 / 3~6열 = 차원의 지배자 투구 · 갑옷 · 바지 · 신발
  public/assets/game/rpg/wear/void.webp                 1536 x 1536 (4열 보기 x 3행 투구 · 갑옷 · 신발, 칸 384 x 512)
실행: python3 design/void/make-temp-art.py   (원래 장비 시트는 design/void/world-equipment-4rows.webp 에 보관해 두고 거기서 다시 만든다)
"""
import os, shutil
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSET = os.path.join(ROOT, 'public/assets/game/rpg')
HERE = os.path.dirname(__file__)
C = dict(rift=(7, 3, 15), deep=(21, 11, 43), dark=(42, 20, 88), violet=(106, 63, 194), purple=(160, 119, 240),
         glow=(211, 184, 255), core=(244, 235, 255), gold=(196, 168, 108), red=(214, 96, 140), line=(10, 4, 22))

def canvas(n):
    return Image.new('RGBA', (n, n), (0, 0, 0, 0))

def outline(img, col=C['line'], grow=1):
    a = img.split()[3].point(lambda v: 255 if v > 40 else 0)
    big = a.filter(ImageFilter.MaxFilter(2 * grow + 1))
    base = Image.new('RGBA', img.size, col + (0,))
    base.putalpha(big)
    base.alpha_composite(img)
    return base

def up(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)

def band(d, box, cols, shape='ellipse'):
    """가운데로 갈수록 밝아지는 여러 겹 도트 면"""
    x0, y0, x1, y1 = box
    for i, col in enumerate(cols):
        sx = (x1 - x0) * i / (2 * len(cols)) * 0.7
        sy = (y1 - y0) * i / (2 * len(cols)) * 0.7
        b = (x0 + sx, y0 + sy, x1 - sx, y1 - sy)
        (d.ellipse if shape == 'ellipse' else d.rectangle)(b, fill=col)

def diamond(d, x, y, r, col):
    d.polygon([(x, y - r), (x + r * 0.7, y), (x, y + r), (x - r * 0.7, y)], fill=col)

# ── 보스 ─────────────────────────────────────────────────
def boss(ready):
    n = 128
    im = canvas(n)
    d = ImageDraw.Draw(im)
    cx = 64
    # 뒤 광륜 — 공간이 일그러진 고리
    rr = 46 if ready else 40
    for k, col in enumerate([C['dark'], C['violet']]):
        d.ellipse((cx - rr - k * 5, 40 - rr * 0.55 - k * 3, cx + rr + k * 5, 40 + rr * 0.55 + k * 3), outline=col, width=2)
    d.arc((cx - rr - 12, 8, cx + rr + 12, 70), 200, 340, fill=C['glow'], width=1)
    # 망토 몸 — 아래로 갈수록 갈래진 넝마
    robe = [(cx - 26, 44), (cx + 26, 44), (cx + 34, 70), (cx + 28, 96), (cx + 20, 88), (cx + 14, 104), (cx + 6, 92), (cx, 106), (cx - 6, 92),
            (cx - 14, 104), (cx - 20, 88), (cx - 28, 96), (cx - 34, 70)]
    d.polygon(robe, fill=C['deep'])
    d.polygon([(cx - 14, 50), (cx + 14, 50), (cx + 20, 72), (cx + 12, 98), (cx, 88), (cx - 12, 98), (cx - 20, 72)], fill=C['dark'])
    for i in range(5):  # 망토 주름
        x = cx - 16 + i * 8
        d.line((x, 56, x - 2 + (i % 2) * 4, 92), fill=C['deep'], width=1)
    # 가슴 틈 — 공허가 새는 균열
    d.line((cx - 3, 62, cx + 2, 74), fill=C['rift'], width=2)
    d.line((cx + 2, 74, cx - 1, 84), fill=C['purple'], width=1)
    # 어깨 파편 · 손
    sh = 6 if ready else 0
    for s in (-1, 1):
        diamond(d, cx + s * (36 + sh), 50 - sh, 8, C['violet'])
        diamond(d, cx + s * (36 + sh), 50 - sh, 4, C['glow'])
        diamond(d, cx + s * (44 + sh * 2), 78 - sh, 6, C['dark'])
        diamond(d, cx + s * (44 + sh * 2), 78 - sh, 3, C['purple'])
    # 눈 — 몸의 머리 자리에 떠 있는 하나의 큰 눈
    ey = 38
    ew, eh = (27, 19) if ready else (24, 14)
    d.ellipse((cx - ew - 3, ey - eh - 3, cx + ew + 3, ey + eh + 3), fill=C['dark'])
    d.ellipse((cx - ew, ey - eh, cx + ew, ey + eh), fill=C['core'])
    d.ellipse((cx - ew + 3, ey - eh + 3, cx + ew - 3, ey + eh - 3), fill=C['glow'])
    ir = 11 if ready else 9
    d.ellipse((cx - ir, ey - ir, cx + ir, ey + ir), fill=C['violet'])
    d.ellipse((cx - ir + 3, ey - ir + 3, cx + ir - 3, ey + ir - 3), fill=C['purple'])
    d.rectangle((cx - 2, ey - ir + 1, cx + 1, ey + ir - 1), fill=C['rift'])   # 세로 동공
    if ready:
        d.ellipse((cx - 2, ey - 2, cx + 1, ey + 1), fill=C['core'])
        for a in range(8):  # 준비 자세 — 눈에서 뻗는 빛살
            import math
            ang = a * math.pi / 4 + 0.2
            d.line((cx + math.cos(ang) * 31, ey + math.sin(ang) * 22, cx + math.cos(ang) * 42, ey + math.sin(ang) * 30), fill=C['glow'], width=1)
    # 눈꺼풀 — 기본 자세는 반쯤 감은 눈
    if not ready:
        d.polygon([(cx - ew - 3, ey - 1), (cx, ey - eh - 6), (cx + ew + 3, ey - 1), (cx + ew + 3, ey - eh - 6), (cx - ew - 3, ey - eh - 6)], fill=(0, 0, 0, 0))
        d.arc((cx - ew, ey - eh - 4, cx + ew, ey + eh), 190, 350, fill=C['dark'], width=3)
    # 떠다니는 조각 · 알갱이
    for (x, y, r) in [(18, 22, 4), (108, 26, 3), (30, 8, 3), (100, 8, 4), (12, 62, 3), (116, 58, 3)]:
        sy = -4 if ready else 0
        diamond(d, x, y + sy, r, C['purple'])
    return up(outline(im), 4)

def make_boss():
    sheet = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    sheet.alpha_composite(boss(False), (0, 0))
    sheet.alpha_composite(boss(True), (512, 0))
    sheet.save(os.path.join(ASSET, 'boss/void-observer.webp'), lossless=True, quality=100)

# ── 무기 (64칸 → 4배 = 256, 장비 시트 칸 273 가운데) ─────────
import math
def blade(d, p0, p1, w, cols):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    for i, (col, k) in enumerate(cols):
        ww = w * k
        pts = [(p0[0] + nx * ww, p0[1] + ny * ww), (p1[0] - ux * 5 + nx * ww * 0.5, p1[1] - uy * 5 + ny * ww * 0.5), p1,
               (p1[0] - ux * 5 - nx * ww * 0.5, p1[1] - uy * 5 - ny * ww * 0.5), (p0[0] - nx * ww, p0[1] - ny * ww)]
        d.polygon(pts, fill=col)

def great():
    im = canvas(64); d = ImageDraw.Draw(im)
    hilt, tip = (11, 54), (56, 8)
    blade(d, (18, 47), tip, 6.5, [(C['dark'], 1), (C['violet'], .66), (C['purple'], .3)])
    d.line((22, 43, 50, 14), fill=C['glow'], width=1)
    d.line((26, 40, 40, 26), fill=C['rift'], width=1)           # 칼날에 번진 공간 균열
    for t in (.3, .5, .7):
        x, y = 18 + (tip[0] - 18) * t, 47 + (tip[1] - 47) * t
        d.rectangle((x + 4, y - 1, x + 5, y), fill=C['core'])
    # 날밑
    d.polygon([(10, 46), (14, 42), (25, 53), (21, 57)], fill=C['gold'])
    d.polygon([(12, 46), (14, 44), (22, 52), (20, 54)], fill=C['dark'])
    # 손잡이 · 자루 끝
    d.line((11, 54, 17, 48), fill=C['deep'], width=4)
    d.ellipse((6, 52, 12, 58), fill=C['violet']); d.ellipse((8, 54, 10, 56), fill=C['core'])
    return outline(im, grow=1), hilt, tip

def staff():
    im = canvas(64); d = ImageDraw.Draw(im)
    d.line((32, 58, 32, 24), fill=C['deep'], width=4)
    d.line((31, 58, 31, 24), fill=C['dark'], width=1)
    for y in (52, 44, 36):
        d.line((29, y, 35, y + 3), fill=C['gold'], width=1)
    # 머리 — 검은 구슬과 어긋난 고리 둘
    d.ellipse((20, 6, 44, 30), outline=C['violet'], width=2)
    d.ellipse((24, 2, 40, 34), outline=C['purple'], width=1)
    d.ellipse((25, 11, 39, 25), fill=C['rift'])
    d.ellipse((28, 13, 32, 17), fill=C['glow'])
    for (x, y) in [(18, 12), (46, 20), (30, 3), (36, 34)]:
        diamond(d, x, y, 3, C['purple'])
    d.polygon([(28, 26), (36, 26), (32, 32)], fill=C['gold'])
    return outline(im, grow=1), (32, 58), (32, 4)

def bow():
    im = canvas(64); d = ImageDraw.Draw(im)
    pts = []
    for i in range(0, 41):
        t = i / 40
        y = 6 + 52 * t
        x = 40 - 26 * math.sin(math.pi * t) ** 0.8
        pts.append((x, y))
    d.line(pts, fill=C['dark'], width=5)
    d.line([(x + 1, y) for x, y in pts], fill=C['violet'], width=2)
    d.line([(x - 1, y) for x, y in pts], fill=C['rift'], width=1)
    d.line((40, 6, 40, 58), fill=C['glow'], width=1)           # 활줄
    d.rectangle((13, 27, 18, 37), fill=C['gold'])
    d.ellipse((12, 29, 17, 35), fill=C['purple'])
    for (x, y) in [(40, 5), (40, 59)]:
        diamond(d, x, y, 4, C['purple'])
    d.polygon([(40, 31), (52, 32), (40, 33)], fill=C['glow'])  # 걸린 공허의 화살
    return outline(im, grow=1), (15, 32), (40, 5)

# ── 방어구 아이콘 (64칸) ────────────────────────────────────
def helm():
    im = canvas(64); d = ImageDraw.Draw(im)
    d.polygon([(14, 36), (16, 14), (32, 6), (48, 14), (50, 36), (44, 52), (32, 56), (20, 52)], fill=C['dark'])
    d.polygon([(20, 34), (22, 18), (32, 12), (42, 18), (44, 34), (40, 46), (32, 50), (24, 46)], fill=C['deep'])
    d.polygon([(20, 30), (44, 30), (42, 38), (22, 38)], fill=C['rift'])             # 눈 틈
    d.ellipse((27, 31, 37, 37), fill=C['glow']); d.rectangle((31, 31, 32, 37), fill=C['rift'])
    d.polygon([(14, 24), (6, 8), (20, 16)], fill=C['violet']); d.polygon([(50, 24), (58, 8), (44, 16)], fill=C['violet'])   # 뒤틀린 뿔
    d.polygon([(32, 4), (28, 14), (36, 14)], fill=C['purple'])
    d.line((16, 40, 24, 50), fill=C['gold'], width=1); d.line((48, 40, 40, 50), fill=C['gold'], width=1)
    return outline(im)

def body():
    im = canvas(64); d = ImageDraw.Draw(im)
    for s in (-1, 1):  # 어깨 파편
        d.polygon([(32 + s * 14, 14), (32 + s * 30, 8), (32 + s * 32, 26), (32 + s * 20, 28)], fill=C['violet'])
        d.polygon([(32 + s * 16, 16), (32 + s * 28, 12), (32 + s * 28, 24)], fill=C['purple'])
    d.polygon([(20, 12), (44, 12), (46, 30), (42, 54), (22, 54), (18, 30)], fill=C['dark'])
    d.polygon([(24, 16), (40, 16), (41, 32), (38, 50), (26, 50), (23, 32)], fill=C['deep'])
    d.ellipse((24, 12, 40, 22), fill=C['rift'])                                      # 목깃
    d.ellipse((26, 26, 38, 38), fill=C['gold']); d.ellipse((28, 28, 36, 36), fill=C['rift']); d.ellipse((30, 30, 34, 34), fill=C['glow'])
    d.line((22, 44, 42, 44), fill=C['gold'], width=2)
    d.line((32, 38, 32, 50), fill=C['violet'], width=1)
    return outline(im)

def legs():
    im = canvas(64); d = ImageDraw.Draw(im)
    d.polygon([(16, 8), (48, 8), (50, 20), (46, 58), (34, 58), (32, 28), (30, 58), (18, 58), (14, 20)], fill=C['dark'])
    d.polygon([(20, 22), (30, 22), (29, 54), (21, 54)], fill=C['deep']); d.polygon([(34, 22), (44, 22), (43, 54), (35, 54)], fill=C['deep'])
    d.rectangle((16, 8, 48, 14), fill=C['gold']); d.ellipse((28, 6, 36, 16), fill=C['rift']); d.ellipse((30, 8, 34, 14), fill=C['glow'])
    for s in (-1, 1):
        diamond(d, 32 + s * 14, 34, 5, C['violet']); diamond(d, 32 + s * 14, 34, 2, C['glow'])
    return outline(im)

def boots():
    im = canvas(64); d = ImageDraw.Draw(im)
    for ox in (4, 36):
        d.polygon([(ox + 4, 8), (ox + 22, 8), (ox + 22, 40), (ox + 26, 52), (ox + 24, 58), (ox, 58), (ox, 44), (ox + 4, 34)], fill=C['dark'])
        d.polygon([(ox + 8, 12), (ox + 18, 12), (ox + 18, 38), (ox + 22, 50), (ox + 4, 50), (ox + 4, 40), (ox + 8, 34)], fill=C['deep'])
        d.rectangle((ox + 3, 12, ox + 23, 18), fill=C['violet'])
        diamond(d, ox + 13, 28, 4, C['purple'])
        d.polygon([(ox, 52), (ox + 24, 52), (ox + 26, 58), (ox - 2, 58)], fill=C['violet'])
    return outline(im)

def make_atlas():
    src = os.path.join(HERE, 'world-equipment-4rows.webp')
    live = os.path.join(ASSET, 'items/world-equipment.webp')
    if not os.path.exists(src):
        shutil.copy(live, src)   # 처음 한 번 — 원래 4행 시트를 보관한다
    base = Image.open(src).convert('RGBA')
    W, H = base.size
    sheet = Image.new('RGBA', (W, round(H * 5 / 4)), (0, 0, 0, 0))
    sheet.alpha_composite(base, (0, 0))
    cw, ch = W / 7, sheet.height / 5
    cells = {}
    for k, (fn, name) in enumerate([(great, 'void_great'), (staff, 'void_staff'), (bow, 'void_bow')]):
        img, grip, tip = fn()
        cells[name] = (grip, tip)
        big = up(img, 4)
        sheet.alpha_composite(big, (round(k * cw + (cw - 256) / 2), round(4 * ch + (ch - 256) / 2)))
    for k, fn in enumerate([helm, body, legs, boots]):
        big = up(fn(), 4)
        sheet.alpha_composite(big, (round((3 + k) * cw + (cw - 256) / 2), round(4 * ch + (ch - 256) / 2)))
    sheet.save(live, lossless=True, quality=100)
    # 손에 쥐는 그림 좌표(128칸 기준) — rpgArt.js WEAPON_GRIP 에 옮긴다
    for name, (grip, tip) in cells.items():
        f = lambda p: tuple(round((((cw - 256) / 2) + v * 4) * 128 / cw) for v in p)
        print(name, 'grip', f(grip), 'tip', f(tip))

# ── 입는 겹침 그림 ──────────────────────────────────────────
def wear_piece(kind, view):
    """칸 384 x 512 안에 표준 몸(검사)에 얹는 겹침 — 앞 · 옆 · 뒤 · 돌아섬. 임시 그림이라 앞 그림을 보기마다 좁혀 쓴다"""
    img = {'head': helm, 'body': body, 'feet': boots}[kind]()
    k = {'head': 3.2, 'body': 4.6, 'feet': 2.5}[kind]
    squeeze = {'front': 1.0, 'side': 0.62, 'back': 1.0, 'turn': 0.82}[view]
    w, h = round(64 * k), round(64 * k)
    big = img.resize((w, h), Image.NEAREST)
    big = big.resize((max(8, round(w * squeeze)), h), Image.NEAREST)
    return big

def make_wear():
    cell_w, cell_h = 384, 512
    sheet = Image.new('RGBA', (cell_w * 4, cell_h * 3), (0, 0, 0, 0))
    place = {'head': (192, 118), 'body': (192, 305), 'feet': (192, 452)}   # 칸 안 가운데 [x, y] — 표준 몸의 머리 · 가슴 · 발 자리
    for r, kind in enumerate(['head', 'body', 'feet']):
        for c, view in enumerate(['front', 'side', 'back', 'turn']):
            p = wear_piece(kind, view)
            x = c * cell_w + place[kind][0] - p.width // 2 + (6 if view == 'side' else 0)
            y = r * cell_h + place[kind][1] - p.height // 2
            sheet.alpha_composite(p, (x, y))
    sheet.save(os.path.join(ASSET, 'wear/void.webp'), lossless=True, quality=100)

if __name__ == '__main__':
    make_boss(); make_atlas(); make_wear()
    print('ok')
