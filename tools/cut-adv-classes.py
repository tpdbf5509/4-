"""1차 전직 캐릭터 시트(design/advance/classes/<전직>.webp, 사용자가 준 투명 1536×1024 · 2줄 × 4)를 방향별로 떼어 낸다.
   위 줄 남 · 아래 줄 여, 왼쪽부터 앞 · 옆(왼쪽을 본다) · 뒤 · 비스듬히(왼쪽). 무기를 든 그림 그대로 쓴다.
   ① 줄 — 두 줄 사이 그림이 가장 적은 가로줄로 나눈다. 캐릭터 가운데 — 줄마다 세로 투영의 봉우리 넷.
   ② 나누기 — 모자 · 머리카락 · 빛 번짐이 옆 칸과 닿는다. 가운데 몸통에 씨앗을 두고, 윤곽선(색이 크게 바뀌는 곳)을
      건너는 데 비용이 큰 최단 경로로 가장 가까운 씨앗에 나눈다 — 경계가 윤곽선을 따라간다.
   ③ 크기 — 검투사 시트의 키를 기존 검사 그림 키에 맞춘 배율을 모든 전직에 쓴다(시트끼리 같은 크기로 그려졌다).
      모자 · 두건이 있어도 몸 크기는 같게. 발밑은 가운데 장화 폭으로 잡는다(칼끝이 발보다 내려가도 발이 바닥에 닿게).
   실행: python3 tools/cut-adv-classes.py [전직 ...]  → (전직을 적으면 그 전직만 새로 쓴다 — 배율은 늘 검투사 시트로)
    public/assets/characters/rpg/<전직>-<m|f>/<front|side|back|turn>.webp"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage, sparse
from scipy.sparse.csgraph import dijkstra

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/advance/classes")
OUT = os.path.join(ROOT, "public/assets/characters/rpg")
CLASSES = ["gladiator", "knight", "marksman", "gunner", "archmage", "summoner", "healer"]   # 치유사 시트는 Codex 로 생성(10월 26일 · 초록 바탕을 지워 둠)
ONLY = set(sys.argv[1:])
VIEWS = ["front", "side", "back", "turn"]
SOLID = 60        # 이만큼 넘는 알파가 그림 몸
FAINT = 14        # 이 아래 알파는 지운다(시트 전체에 깔린 옅은 얼룩)
LINE_COST = 1.0   # 윤곽선을 건너는 비용(색 차이 1당) — 머리 · 모자가 붙은 옆 캐릭터로 새지 않게 크게
GLOW_COST = 40    # 반투명 빛 번짐을 건너는 비용 — 마도사 빛이 옆 사람 지팡이까지 이어 붙였다
OPAQUE = 200      # 이만큼 넘는 알파는 그림 몸, 그 아래는 빛 번짐
PAD = 6           # 기존 그림처럼 둘레 여백

def figures(path):
    im = np.asarray(Image.open(path).convert("RGBA")).astype(np.int16)
    H, W, _ = im.shape
    al = im[..., 3]
    solid = al > SOLID
    keep = al >= FAINT
    rs = solid.sum(1)
    split = 420 + int(np.argmin(rs[420:600]))
    bands = [(0, split), (split, H)]
    seeds, cells = [], []
    for r, (y0, y1) in enumerate(bands):
        prof = ndimage.uniform_filter1d(solid[y0:y1].sum(0).astype(float), 61)
        peaks = []
        for x in np.argsort(-prof):
            if all(abs(x - p) > 220 for p in peaks):
                peaks.append(int(x))
            if len(peaks) == 4:
                break
        for c, cx in enumerate(sorted(peaks)):
            sy0, sy1 = y0 + int((y1 - y0) * 0.08), y0 + int((y1 - y0) * 0.85)   # 모자 꼭대기부터 — 넓은 챙이 옆 모자에 붙어도 제 모자로 남게
            ys, xs = np.where(solid[sy0:sy1, cx - 6:cx + 7])
            seeds.append(list(zip(ys + sy0, xs + cx - 6))[::4])
            cells.append((r, c, cx))
    # 윤곽선 비용 최단 경로로 나누기
    rgb = im[..., :3]
    d = np.zeros((H, W), np.int16)
    for dy, dx in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
        d = np.maximum(d, np.abs(rgb - np.roll(np.roll(rgb, dy, 0), dx, 1)).max(2))
    idx = -np.ones((H, W), np.int64)
    fy, fx = np.where(solid)                         # 길은 진한 그림으로만 — 옅은 빛 번짐을 통로로 삼으면 아래 줄 모자가 위 줄로 붙었다
    idx[fy, fx] = np.arange(len(fy))
    cost = 1 + LINE_COST * d.astype(float) + GLOW_COST * (al < OPAQUE)
    rr, cc, ww = [], [], []
    for dy, dx in [(0, 1), (1, 0)]:
        ok = solid[:H - dy, :W - dx] & solid[dy:, dx:]
        if dy:
            ok[split - 1] = False                    # 두 줄 사이는 잇지 않는다 — 아래 줄 모자가 위 줄 발밑으로 붙었다
        yy, xx = np.where(ok)
        u, v = idx[yy, xx], idx[yy + dy, xx + dx]
        w = (cost[yy, xx] + cost[yy + dy, xx + dx]) / 2
        rr += [u, v]; cc += [v, u]; ww += [w, w]
    G = sparse.csr_matrix((np.concatenate(ww), (np.concatenate(rr), np.concatenate(cc))), shape=(len(fy), len(fy)))
    src, owner = [], []
    for k, pts in enumerate(seeds):
        for y, x in pts:
            src.append(idx[y, x]); owner.append(k)
    dist, _, srcs = dijkstra(G, indices=np.array(src), min_only=True, return_predecessors=True)
    own = dict(zip(src, owner))
    lab = -np.ones((H, W), np.int32)
    ok = np.isfinite(dist)
    lab[fy[ok], fx[ok]] = [own[s] for s in srcs[ok]]
    # 씨앗과 떨어진 조각이 옆 캐릭터에 닿아 있으면 그 캐릭터 것 — 지팡이 · 긴 머리카락이 옆 칸으로 잘려 갔다
    for k in range(len(cells)):
        pl, pn = ndimage.label(lab == k)
        mine = set(pl[y, x] for y, x in seeds[k])
        for i, sl in enumerate(ndimage.find_objects(pl), 1):
            if i in mine:
                continue
            ys = slice(max(0, sl[0].start - 4), sl[0].stop + 4)
            xs = slice(max(0, sl[1].start - 4), sl[1].stop + 4)
            comp = pl[ys, xs] == i
            sub = lab[ys, xs]
            ring = ndimage.binary_dilation(comp, iterations=3) & ~comp & (sub >= 0) & (sub != k)
            if ring.any():
                sub[comp] = np.bincount(sub[ring]).argmax()
    # 빛 번짐 · 옅은 테두리 — 가장 가까운 캐릭터 픽셀(28px 안)을 따른다
    dist2, near = ndimage.distance_transform_edt(lab < 0, return_indices=True)
    faint = keep & (lab < 0) & (dist2 <= 28)
    lab[faint] = lab[near[0][faint], near[1][faint]]
    out = []
    band = np.arange(H)[:, None]
    for k, (r, c, cx) in enumerate(cells):
        y0b, y1b = bands[r]
        m = (lab == k) & (band >= y0b) & (band < y1b)
        pl, pn = ndimage.label(m & solid)               # 떨어진 큰 조각(빛 구슬 · 정령)은 남기고 부스러기는 버린다
        if pn > 1:
            ps = ndimage.sum(m & solid, pl, range(1, pn + 1))
            junk = np.isin(pl, [i + 1 for i in range(pn) if ps[i] < 30])
            m &= ~ndimage.binary_dilation(junk, iterations=2)
        ys, xs = np.where(m & solid)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgba = im.astype(np.uint8).copy()
        rgba[..., 3] = np.where(m, rgba[..., 3], 0)
        wide = (m & solid)[:, cx - 40:cx + 41].sum(1) >= 10   # 장화 폭 — 가운데 ±40 에서 10픽셀 넘는 가장 아래 줄
        feet = int(np.where(wide)[0].max()) + 1
        out.append((r, c, Image.fromarray(rgba[y0:y1, x0:x1], "RGBA"), feet - y0, y0, x0))
    return out

def ref_h(job, g, v):
    return Image.open(os.path.join(OUT, f"{job}-{g}", f"{v}.webp")).size[1]

def scales():
    """검투사(남 · 여)의 발밑 ~ 머리 꼭대기를 기존 검사 키에 맞춘 배율 — 방향마다(tools/bare-adv.py 도 쓴다)"""
    out = {}
    for r, c, crop, feet, *_ in figures(os.path.join(SRC, "gladiator.webp")):
        g = "m" if r == 0 else "f"
        out[(g, c)] = (ref_h("warrior", g, VIEWS[c]) - PAD * 2) / feet
    return out

def place(crop, feet, s):
    """떼어 낸 그림을 배율 s 로 줄여 둘레 여백을 두고 발밑에 맞춘다"""
    w2, h2 = max(1, round(crop.size[0] * s)), max(1, round(crop.size[1] * s))
    im = crop.resize((w2, h2), Image.LANCZOS)
    fy = round(feet * s)
    outim = Image.new("RGBA", (w2 + PAD * 2, fy + PAD * 2), (0, 0, 0, 0))
    outim.alpha_composite(im.crop((0, 0, w2, min(h2, fy + PAD))), (PAD, PAD))   # 발밑 아래로 내려간 칼끝은 여백까지만
    return outim

if __name__ == "__main__":
    scale = scales()
    for cls in CLASSES:
        if ONLY and cls not in ONLY:
            continue
        for r, c, crop, feet, *_ in figures(os.path.join(SRC, f"{cls}.webp")):
            g = "m" if r == 0 else "f"
            s = scale[(g, c)]
            outim = place(crop, feet, s)
            dpath = os.path.join(OUT, f"{cls}-{g}")
            os.makedirs(dpath, exist_ok=True)
            outim.save(os.path.join(dpath, f"{VIEWS[c]}.webp"), "WEBP", quality=92, alpha_quality=100, method=6)
            print(cls, g, VIEWS[c], outim.size, f"x{s:.3f}")
