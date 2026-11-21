"""일반 직업 · 전직 스킬 아이콘 시트(11월 21일) — 어두운 칸에 도트 그림, 직접 그린다.
python3 design/ui/skill-icons/make-job-icons.py → public/assets/game/rpg/ui/skill-icons-job.webp (4열 × 6행, 칸 128px = 32도트 × 4)
칸 번호 = src/game/skillIconData.js JOB_ICONS (차례를 바꾸면 그쪽도 맞춘다)"""
import math
from PIL import Image

N = 32; K = 4
BG = (30, 24, 17); EDGE = (86, 70, 48)
STEEL = (196, 200, 206); STEEL_D = (120, 126, 136); GOLD = (222, 190, 112); GOLD_D = (150, 120, 66)
RED = (205, 112, 100); RED_D = (140, 70, 66); BLUE = (118, 170, 204); BLUE_D = (72, 110, 146)
GREEN = (140, 190, 130); GREEN_D = (84, 128, 82); PURPLE = (178, 150, 214); PURPLE_D = (110, 88, 150)
WHITE = (240, 232, 214); WOOD = (150, 108, 70)

class C:
    def __init__(s): s.im = Image.new("RGBA", (N, N), (0, 0, 0, 0)); s.p = s.im.load()
        # 바탕 칸
    def bg(s):
        for y in range(N):
            for x in range(N):
                e = x in (0, N - 1) or y in (0, N - 1)
                if (x in (0, N - 1) and y in (0, N - 1)): continue
                s.p[x, y] = EDGE + (255,) if e else BG + (255,)
    def px(s, x, y, c):
        x, y = int(round(x)), int(round(y))
        if 1 <= x < N - 1 and 1 <= y < N - 1: s.p[x, y] = tuple(c) + (255,)
    def line(s, a, b, c, w=1):
        n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) * 2 + 1
        for i in range(n + 1):
            t = i / n; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
            for dx in range(w):
                for dy in range(w): s.px(x + dx, y + dy, c)
    def rect(s, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.px(x, y, c)
    def disc(s, cx, cy, r, c):
        for y in range(N):
            for x in range(N):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: s.px(x, y, c)
    def ring(s, cx, cy, r, c, w=1):
        for y in range(N):
            for x in range(N):
                d = math.hypot(x - cx, y - cy)
                if r - w < d <= r: s.px(x, y, c)
    def poly(s, pts, c):
        for y in range(N):
            for x in range(N):
                inside = False; j = len(pts) - 1
                for i in range(len(pts)):
                    xi, yi = pts[i]; xj, yj = pts[j]
                    if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
                    j = i
                if inside: s.px(x, y, c)

def arrow(c, a, b, col=STEEL, head=col if False else None):
    c.line(a, b, WOOD)
    dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L
    c.poly([b, (b[0] - ux * 5 - uy * 2.5, b[1] - uy * 5 + ux * 2.5), (b[0] - ux * 5 + uy * 2.5, b[1] - uy * 5 - ux * 2.5)], col)
    c.line((a[0], a[1]), (a[0] + ux * 2 - uy * 2, a[1] + uy * 2 + ux * 2), WHITE)
    c.line((a[0], a[1]), (a[0] + ux * 2 + uy * 2, a[1] + uy * 2 - ux * 2), WHITE)

def star(c, cx, cy, r, col, col2):
    for i in range(8):
        a = i * math.pi / 4; rr = r if i % 2 == 0 else r * 0.62
        c.line((cx, cy), (cx + math.cos(a) * rr, cy + math.sin(a) * rr), col if i % 2 == 0 else col2)
    c.disc(cx, cy, 3, WHITE)

def sword(c, x0, y0, x1, y1, blade=STEEL, w=2):
    c.line((x0, y0), (x1, y1), blade, w)
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L
    gx, gy = x0 + ux * 6, y0 + uy * 6
    c.line((gx - uy * 4, gy + ux * 4), (gx + uy * 4, gy - ux * 4), GOLD, 2)
    c.line((x0, y0), (x0 - ux * 5, y0 - uy * 5), WOOD, 2)

def slash(c, cx, cy, r, a0, a1, col):
    n = 40
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        for k in range(3): c.px(cx + math.cos(a) * (r - k * 0.8), cy + math.sin(a) * (r - k * 0.8), col)

def ic_smash(c):
    c.line((9, 24), (20, 11), WOOD, 3); c.rect(16, 6, 25, 12, STEEL); c.rect(16, 6, 25, 7, WHITE); c.rect(16, 11, 25, 12, STEEL_D)
    for a in (200, 250, 300): c.line((12, 25), (12 + math.cos(math.radians(a)) * 6, 25 + math.sin(math.radians(a)) * 6 + 0), GOLD)
    c.line((5, 27), (27, 27), GOLD_D)
def ic_burst(c): star(c, 16, 16, 12, PURPLE, PURPLE_D); c.ring(16, 16, 8, PURPLE_D)
def ic_pierce(c):
    sword(c, 6, 26, 24, 8, STEEL, 2); c.line((24, 8), (28, 4), WHITE); c.disc(26, 6, 2, RED)
def ic_aid(c):
    c.rect(13, 6, 18, 25, GREEN); c.rect(6, 13, 25, 18, GREEN); c.rect(14, 7, 17, 24, WHITE); c.rect(7, 14, 24, 17, WHITE)
def ic_rush(c):
    for i, y in enumerate((11, 16, 21)): c.line((4, y), (14 - i * 2, y), STEEL_D)
    sword(c, 14, 24, 27, 9, STEEL, 2)
def ic_cleave(c):
    c.line((16, 5), (13, 15), RED); c.line((13, 15), (18, 22), RED); c.line((18, 22), (15, 28), RED)
    c.line((17, 5), (14, 15), GOLD); c.line((14, 15), (19, 22), GOLD); c.line((19, 22), (16, 28), GOLD)
    c.line((6, 27), (26, 27), GOLD_D)
def ic_iron(c):
    c.poly([(16, 4), (27, 8), (26, 19), (16, 28), (6, 19), (5, 8)], STEEL_D); c.poly([(16, 6), (24, 9), (23, 18), (16, 25), (9, 18), (8, 9)], STEEL)
    c.rect(15, 8, 16, 23, GOLD); c.rect(9, 13, 23, 14, GOLD)
def ic_jpierce(c): arrow(c, (5, 27), (26, 6)); c.line((9, 29), (28, 10), STEEL_D)
def ic_volley(c):
    arrow(c, (4, 24), (24, 12)); arrow(c, (5, 19), (27, 16)); arrow(c, (6, 14), (26, 21))
def ic_leap(c):
    arrow(c, (26, 24), (7, 10))
    for x in (22, 26): c.line((x, 8), (x - 4, 12), STEEL_D); c.line((x - 4, 12), (x, 16), STEEL_D)
def ic_orb(c):
    c.disc(16, 16, 9, BLUE_D); c.disc(15, 15, 7, BLUE); c.disc(12, 11, 3, WHITE); c.ring(16, 16, 12, BLUE_D)
def ic_chain(c):
    pts = [(8, 6), (14, 13), (10, 15), (18, 22), (14, 23), (23, 29)]
    for a, b in zip(pts, pts[1:]): c.line(a, b, GOLD, 2)
    c.disc(23, 8, 2, WHITE); c.disc(26, 20, 2, WHITE); c.line((14, 13), (23, 8), GOLD_D); c.line((18, 22), (26, 20), GOLD_D)
def ic_shield(c):
    c.ring(16, 16, 11, GOLD, 2); c.ring(16, 16, 6, GOLD_D)
    for i in range(6):
        a = math.radians(i * 60 + 30); c.line((16 + math.cos(a) * 6, 16 + math.sin(a) * 6), (16 + math.cos(a) * 11, 16 + math.sin(a) * 11), GOLD)
    c.disc(16, 16, 2, WHITE)
def ic_gladiator(c):
    for i, r in enumerate((13, 9, 5)): slash(c, 24, 28, r + 5, 200, 285, (RED, GOLD, WHITE)[i])
    sword(c, 6, 26, 14, 18, STEEL_D, 1)
def ic_knight(c):
    c.poly([(16, 3), (28, 7), (27, 19), (16, 29), (5, 19), (4, 7)], BLUE_D); c.poly([(16, 6), (25, 9), (24, 18), (16, 26), (8, 18), (7, 9)], STEEL)
    c.rect(15, 9, 16, 22, BLUE); c.rect(11, 13, 20, 14, BLUE)
def ic_marksman(c):
    c.ring(16, 16, 10, RED_D); c.ring(16, 16, 4, RED_D); c.line((16, 3), (16, 29), RED); c.line((3, 16), (29, 16), RED); c.disc(16, 16, 1, WHITE)
def ic_gunner(c):
    for i, y in enumerate((9, 15, 21)):
        c.rect(5, y, 8, y + 2, GOLD_D); c.line((10, y + 1), (26 - i * 2, y + 1), STEEL_D); c.disc(27 - i * 2, y + 1, 1, GOLD)
def ic_archmage(c):
    star(c, 16, 16, 12, PURPLE, PURPLE_D); c.disc(16, 16, 6, PURPLE_D); c.disc(16, 16, 4, WHITE)
def ic_summoner(c):
    c.ring(16, 20, 10, PURPLE_D, 2); c.rect(14, 8, 17, 20, PURPLE); c.disc(15, 7, 4, PURPLE); c.disc(15, 6, 2, WHITE)
    c.rect(13, 21, 18, 22, PURPLE)
def ic_summoner_ult(c):
    c.disc(16, 10, 4, GOLD); c.rect(11, 14, 20, 26, GOLD_D); c.rect(8, 16, 11, 22, GOLD); c.rect(20, 16, 23, 22, GOLD); c.disc(14, 9, 1, WHITE); c.disc(18, 9, 1, WHITE)
def ic_healer(c):
    c.disc(16, 16, 11, GREEN_D); c.disc(16, 16, 9, BG); c.rect(14, 8, 17, 23, WHITE); c.rect(8, 14, 23, 17, WHITE); c.ring(16, 16, 12, GREEN)
def ic_assassin(c):
    c.line((4, 26), (22, 8), STEEL, 2); c.line((4, 20), (16, 8), STEEL_D); c.line((10, 28), (26, 12), STEEL_D)
    c.disc(25, 7, 3, PURPLE_D); c.disc(25, 7, 1, WHITE)
def ic_elf(c):
    arrow(c, (4, 25), (24, 7), GREEN)
    for i, y in enumerate((20, 25)): c.line((16 + i * 3, y), (26, y - 4), GREEN_D); c.line((16 + i * 3, y + 1), (25, y - 2), GREEN_D)
def ic_heal_mode(c):
    c.line((16, 27), (6, 14), GREEN); c.line((16, 27), (26, 14), GREEN); c.disc(11, 11, 5, GREEN); c.disc(21, 11, 5, GREEN); c.disc(10, 9, 2, WHITE)

ICONS = [ic_smash, ic_burst, ic_pierce, ic_aid, ic_rush, ic_cleave, ic_iron, ic_jpierce, ic_volley, ic_leap, ic_orb, ic_chain,
         ic_shield, ic_gladiator, ic_knight, ic_marksman, ic_gunner, ic_archmage, ic_summoner, ic_healer, ic_assassin, ic_elf, ic_summoner_ult, ic_heal_mode]
sheet = Image.new("RGBA", (4 * N * K, 6 * N * K), (0, 0, 0, 0))
for i, f in enumerate(ICONS):
    c = C(); c.bg(); f(c)
    sheet.paste(c.im.resize((N * K, N * K), Image.NEAREST), ((i % 4) * N * K, (i // 4) * N * K))
sheet.save("public/assets/game/rpg/ui/skill-icons-job.webp", lossless=True)
print(len(ICONS))
