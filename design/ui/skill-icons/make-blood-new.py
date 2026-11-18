# BLOOD-001 신규 스킬 아이콘 다섯 칸(11월 18일) — Codex 로그인이 없어 직접 그린다.
# 기존 skill-icons.webp(4열 × 3행 · 칸 128px) 아래에 넷째 줄을 붙여 4열 × 4행으로 만든다.
#   칸 10 흑혈 관통 · 11 혈해 개문 · 12 혈형 군단 · 13 원초의 혈맥 · 14 원초적 지배
# 큰 판(512)에 매끈하게 그린 뒤 64칸으로 줄여 도트로 만들고 1칸 짙은 외곽을 두른 다음 128 로 키운다.
# 실행: python3 design/ui/skill-icons/make-blood-new.py  (저장소 맨 위에서)
import math
from PIL import Image, ImageDraw, ImageFilter

SHEET = "public/assets/game/rpg/ui/skill-icons.webp"
BIG, PX, CELL = 512, 64, 128
K = BIG / PX  # 도트 한 칸 = 큰 판 8px

# 기존 아이콘에서 뽑은 색 — 짙은 피 · 피 · 밝은 피 · 반사광 · 금 · 짙은 금 · 검은 피
DARK = (52, 0, 4)
RED0 = (110, 0, 6)
RED = (176, 16, 26)
RED2 = (226, 48, 54)
SHINE = (255, 160, 140)
GOLD = (236, 184, 64)
GOLD0 = (150, 98, 26)
BLACK = (34, 6, 12)
BLACK2 = (74, 14, 26)


def P(x, y):
    """도트 좌표(0~64) → 큰 판 좌표"""
    return (x * K, y * K)


def poly(d, pts, fill):
    d.polygon([P(x, y) for x, y in pts], fill=fill)


def ell(d, cx, cy, rx, ry, fill=None, outline=None, width=1):
    d.ellipse([P(cx - rx, cy - ry), P(cx + rx, cy + ry)], fill=fill, outline=outline, width=int(width * K))


def line(d, pts, fill, w):
    d.line([P(x, y) for x, y in pts], fill=fill, width=int(w * K), joint="curve")


def drop(d, cx, cy, s, fill, hi=None):
    """핏방울 — 끝이 위"""
    ell(d, cx, cy + s * 0.55, s * 0.62, s * 0.62, fill=fill)
    poly(d, [(cx, cy - s * 0.9), (cx - s * 0.58, cy + s * 0.4), (cx + s * 0.58, cy + s * 0.4)], fill)
    if hi:
        ell(d, cx - s * 0.22, cy + s * 0.35, s * 0.14, s * 0.22, fill=hi)


def icon_pierce(d):
    # 검은 피 창날이 왼쪽 아래에서 오른쪽 위로 꿰뚫고, 뒤로 잔상 줄 셋 · 꿰뚫린 피 고리
    for i, (o, c) in enumerate([(-7, RED0), (0, RED), (7, RED0)]):
        line(d, [(6 + o * 0.5, 50 - o * 0.5 + 6), (24 + o * 0.5, 32 - o * 0.5 + 6)], c, 2 if i != 1 else 3)
    # 몸통
    poly(d, [(12, 54), (8, 50), (40, 18), (46, 24)], BLACK2)
    poly(d, [(12, 54), (10, 52), (42, 20), (44, 22)], BLACK)
    line(d, [(10, 50), (41, 19)], RED, 1.5)   # 어두운 바탕에서도 보이게 붉은 테
    # 날 — 검붉은 마름모
    poly(d, [(38, 16), (58, 6), (48, 26)], BLACK)
    poly(d, [(41, 17), (55, 9), (47, 23)], RED0)
    poly(d, [(44, 16), (55, 9), (46, 19)], RED2)
    # 꿰뚫린 피 고리
    ell(d, 30, 34, 11, 5, outline=RED2, width=2)
    line(d, [(19, 34), (24, 31)], SHINE, 1)
    # 튀는 피
    drop(d, 50, 36, 3, RED, SHINE)
    drop(d, 22, 46, 2.4, RED)
    # 금빛 자루 끝
    ell(d, 9, 55, 3, 3, fill=GOLD)
    ell(d, 9, 55, 1.4, 1.4, fill=GOLD0)


def icon_sea(d):
    # 금테 두른 문이 열리고 그 아래로 피의 바다가 쏟아진다
    poly(d, [(14, 44), (14, 22), (32, 8), (50, 22), (50, 44)], GOLD0)
    poly(d, [(16, 44), (16, 23), (32, 11), (48, 23), (48, 44)], GOLD)
    poly(d, [(19, 44), (19, 25), (32, 15), (45, 25), (45, 44)], BLACK)
    # 문 안의 붉은 빛
    poly(d, [(23, 44), (23, 28), (32, 20), (41, 28), (41, 44)], RED0)
    poly(d, [(27, 44), (27, 31), (32, 26), (37, 31), (37, 44)], RED)
    # 열린 문짝 둘
    poly(d, [(19, 25), (10, 30), (10, 48), (19, 44)], BLACK2)
    poly(d, [(45, 25), (54, 30), (54, 48), (45, 44)], BLACK2)
    line(d, [(10, 30), (10, 48)], GOLD0, 1)
    line(d, [(54, 30), (54, 48)], GOLD0, 1)
    # 피의 바다 — 물결 셋
    ell(d, 32, 52, 28, 8, fill=RED0)
    ell(d, 32, 50, 22, 5.5, fill=RED)
    ell(d, 32, 49, 13, 3, fill=RED2)
    for x in (12, 24, 40, 52):
        line(d, [(x - 3, 52), (x, 50.5), (x + 3, 52)], SHINE, 1)
    drop(d, 32, 34, 4, RED2, SHINE)


def figure(d, cx, top, h, body, edge, eye):
    """혈형 분신 — 두건 쓴 사람 모양"""
    w = h * 0.46
    ell(d, cx, top + h * 0.17, h * 0.17, h * 0.18, fill=body)                 # 머리
    poly(d, [(cx - h * 0.2, top + h * 0.12), (cx, top - h * 0.05), (cx + h * 0.2, top + h * 0.12)], body)  # 두건 끝
    poly(d, [(cx - w * 0.45, top + h * 0.3), (cx + w * 0.45, top + h * 0.3),
             (cx + w * 0.62, top + h), (cx - w * 0.62, top + h)], body)       # 망토
    poly(d, [(cx - w * 0.45, top + h * 0.3), (cx - w * 0.2, top + h * 0.3), (cx - w * 0.34, top + h), (cx - w * 0.62, top + h)], edge)
    ell(d, cx - h * 0.06, top + h * 0.18, h * 0.035, h * 0.03, fill=eye)
    ell(d, cx + h * 0.06, top + h * 0.18, h * 0.035, h * 0.03, fill=eye)


def icon_legion(d):
    # 뒤에 짙은 분신 둘, 앞에 밝은 분신 하나 · 발밑 피 웅덩이
    ell(d, 32, 55, 26, 5, fill=RED0)
    figure(d, 16, 16, 34, RED0, DARK, SHINE)
    figure(d, 48, 16, 34, RED0, DARK, SHINE)
    figure(d, 32, 10, 44, RED, RED0, GOLD)
    # 앞 분신 반사광
    line(d, [(36, 26), (39, 50)], RED2, 1.5)
    ell(d, 30, 15, 2, 1.6, fill=RED2)
    drop(d, 8, 42, 2.4, RED)
    drop(d, 57, 44, 2.4, RED)


def icon_origin(d):
    # 금빛 고리 안의 뛰는 핏줄 심장 — 위에서 혈액 창 셋이 내리꽂힌다
    ell(d, 32, 40, 19, 19, outline=GOLD0, width=2.5)
    ell(d, 32, 40, 19, 19, outline=GOLD, width=1.2)
    # 심장 구슬
    ell(d, 32, 40, 12, 12, fill=RED0)
    ell(d, 32, 40, 10, 10, fill=RED)
    ell(d, 30, 37, 5, 5, fill=RED2)
    ell(d, 28, 35, 2, 2, fill=SHINE)
    # 핏줄 — 구슬에서 고리로 갈라져 나간다
    for a in range(0, 360, 60):
        r = math.radians(a + 30)
        x1, y1 = 32 + math.cos(r) * 10, 40 + math.sin(r) * 10
        x2, y2 = 32 + math.cos(r) * 17, 40 + math.sin(r) * 17
        xm, ym = 32 + math.cos(r + 0.25) * 14, 40 + math.sin(r + 0.25) * 14
        line(d, [(x1, y1), (xm, ym), (x2, y2)], RED2, 1.5)
    # 내리꽂히는 창 셋
    for x, top, ln in ((18, 2, 16), (32, 0, 18), (46, 2, 16)):
        line(d, [(x, top), (x, top + ln - 5)], RED0, 3)
        poly(d, [(x - 3, top + ln - 6), (x + 3, top + ln - 6), (x, top + ln)], RED)
        line(d, [(x - 0.8, top + 1), (x - 0.8, top + ln - 7)], RED2, 1)


def icon_awake(d):
    # 피 흘리는 금관 아래 붉게 뜬 눈 하나 — 각성
    # 눈
    poly(d, [(8, 44), (20, 36), (32, 34), (44, 36), (56, 44), (44, 52), (32, 54), (20, 52)], BLACK)
    poly(d, [(12, 44), (22, 38), (32, 37), (42, 38), (52, 44), (42, 50), (32, 51), (22, 50)], RED0)
    ell(d, 32, 44, 7, 7, fill=GOLD)
    ell(d, 32, 44, 5.5, 5.5, fill=RED2)
    ell(d, 32, 44, 2.2, 6, fill=BLACK)
    ell(d, 29, 41, 1.5, 1.5, fill=SHINE)
    # 금관
    poly(d, [(14, 30), (14, 12), (22, 20), (32, 6), (42, 20), (50, 12), (50, 30)], GOLD0)
    poly(d, [(16, 28), (16, 16), (22, 23), (32, 10), (42, 23), (48, 16), (48, 28)], GOLD)
    poly(d, [(14, 26), (50, 26), (50, 31), (14, 31)], GOLD0)
    line(d, [(15, 28), (49, 28)], GOLD, 1.5)
    ell(d, 32, 19, 2.6, 2.6, fill=RED)
    ell(d, 31.4, 18.4, 0.9, 0.9, fill=SHINE)
    # 관에서 흐르는 피
    for x, ln in ((20, 6), (32, 3), (44, 7)):
        line(d, [(x, 31), (x, 31 + ln)], RED, 2)
        drop(d, x, 32 + ln, 1.8, RED)


ICONS = [icon_pierce, icon_sea, icon_legion, icon_origin, icon_awake]


def render(fn):
    big = Image.new("RGBA", (BIG, BIG), (0, 0, 0, 0))
    fn(ImageDraw.Draw(big))
    small = big.resize((PX, PX), Image.LANCZOS)
    # 알파를 딱 끊어 도트처럼
    px = small.load()
    for y in range(PX):
        for x in range(PX):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, 255) if a >= 110 else (0, 0, 0, 0)
    # 1칸 짙은 외곽
    a = small.getchannel("A")
    grown = a.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", (PX, PX), DARK + (255,))
    out.putalpha(grown)
    out.alpha_composite(small)
    return out.resize((CELL, CELL), Image.NEAREST)


def main():
    old = Image.open(SHEET).convert("RGBA")
    cols = old.width // CELL
    sheet = Image.new("RGBA", (old.width, CELL * 4), (0, 0, 0, 0))
    sheet.paste(old.crop((0, 0, old.width, CELL * 3)), (0, 0))
    for i, fn in enumerate(ICONS):
        n = 10 + i
        sheet.alpha_composite(render(fn), ((n % cols) * CELL, (n // cols) * CELL))
    sheet.save(SHEET, "WEBP", lossless=True)
    print("저장", SHEET, sheet.size)


if __name__ == "__main__":
    main()
