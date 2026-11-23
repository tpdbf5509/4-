"""히든 직업 Illusionist 005 마술사 여성 · 남성 외형 — 사용자가 준 시트 둘을 떼어 낸다(design/illusion-job/char/, 11월 23일 — 같은 날 보랏빛 그림으로 바꿨다).
   서기 illusion-f-standing-sheet.png: 흰 바탕 한 줄 4명 = 앞 · 뒤 · 옆(왼쪽을 본다) · 옆(오른쪽을 본다). 게임은 옆 그림을 뒤집어 쓰므로 셋째만 쓴다.
   걷기 illusion-f-walk-sheet.png: 흰 바탕 4칸 × 4줄. 줄 = 앞 · 뒤 · 왼쪽 · 오른쪽, 칸 = 걷기 4장. 오른쪽 줄은 쓰지 않는다.
   흰 바탕은 가장자리에서 이어진 흰 점만 지운다 — 흰 깃털 · 흰 장화 · 프릴은 윤곽선에 막혀 남는다(관리자 스킨과 같은 방식).
   움찔거림 방지 — 한 줄 네 장의 위 · 아래(발바닥 진한 점)를 같게 자르고, 장마다 드레스(어두운 점) 가로 중심을 그림 가운데에 둔다(칸 간격이 고르지 않다).
   결과: public/assets/characters/rpg/illusion-<f|m>/ — 무기를 들지 않아 -bare 도 같은 그림. 남성 그림은 11월 23일 같은 날 받았다(illusion-m-*). 키는 성별마다 같은 성별 암살자 앞 키에 맞춘다.
   실행: python3 tools/cut-illusion-char.py"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/illusion-job/char")
OUT_ROOT = os.path.join(ROOT, "public/assets/characters/rpg")
PAD, FAINT = 6, 40
SCALE = 1.25     # 암살자(여) 앞 키에 대한 배율 — 도박꾼 · 관리자 스킨과 같은 키
WHITE = 236      # 이보다 밝고 색이 거의 없는 점이 바탕 후보
EDGE = 2         # 바탕과 닿은 이 폭 안의 밝은 점은 흰 바탕을 빼고 반투명으로 푼다
POCKET = 0.5     # 갇힌 흰 칸 둘레에서 머리카락 색(밝고 색이 진한 점) 몫이 이보다 크면 머리카락 사이 빈틈 후보
POCKET_MIN = 60  # 이보다 작은 흰 칸은 머리카락 반짝임으로 보고 남긴다
POCKET_SAT = 66  # 둘레 평균 채도(최대 − 최소)가 이보다 낮으면 남긴다 — 흰 깃털 · 프릴 둘레는 옅은 연보라(40~60)
POCKET_DIST = 20 # 바깥 바탕에서 이보다 멀면 남긴다 — 머리카락 틈은 실루엣 가장자리 가까이에 있다(눈 · 얼굴 반짝임은 안쪽)
DARK_RING = 140  # 남성: 둘레 평균 밝기가 이보다 어두우면(검은 코트로 둘러싸인 팔 · 다리 사이 틈) 바탕으로 지운다
GAP_RULE = {"f": "hair", "m": "dark"}   # 성별마다 갇힌 틈을 가르는 방법 — 여성은 긴 머리카락 틈, 남성은 코트 · 팔 사이 틈

def pockets(a, cand, lab, border, rule):
    """머리카락 고리 안에 갇힌 흰 바탕 — 가장자리와 이어지지 않아도 둘레가 진한 머리카락 색이고 바깥 가까이면 바탕이다"""
    hc = a.max(2)
    hair = (hc - a.min(2) > 40) & (hc > 170)
    dist = ndimage.distance_transform_edt(~np.isin(lab, [b for b in border if b]))
    out = np.zeros(cand.shape, bool)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or i in border: continue
        y0, x0 = max(sl[0].start - 4, 0), max(sl[1].start - 4, 0)
        y1, x1 = sl[0].stop + 4, sl[1].stop + 4
        m = lab[y0:y1, x0:x1] == i
        if m.sum() < POCKET_MIN: continue
        ring = ndimage.binary_dilation(m, iterations=3) & ~m & ~cand[y0:y1, x0:x1]
        if not ring.any(): continue
        r = a[y0:y1, x0:x1][ring]
        if rule == "dark":
            hit = r.max(1).mean() < DARK_RING
        else:
            hit = (hair[y0:y1, x0:x1][ring].mean() > POCKET and (r.max(1) - r.min(1)).mean() >= POCKET_SAT
                   and dist[y0:y1, x0:x1][m].min() <= POCKET_DIST)
        if hit:
            out[y0:y1, x0:x1] |= m
    return out

def unwhite(rgb, rule):
    """흰 바탕 → 투명. 가장자리에서 이어진 밝은 점만 바탕으로 본다"""
    a = rgb.astype(np.float32)
    lo, hi = a.min(2), a.max(2)
    cand = (lo >= WHITE) & (hi - lo <= 12)
    lab, _ = ndimage.label(cand)
    border = np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, border[border > 0]) | pockets(a, cand, lab, set(border.tolist()), rule)
    alpha = np.where(bg, 0.0, 1.0)
    near = ndimage.binary_dilation(bg, iterations=EDGE) & ~bg
    soft = np.clip((255 - lo) / (255 - WHITE + 30), 0, 1)       # 밝을수록 더 투명
    alpha = np.where(near, np.minimum(alpha, soft), alpha)
    k = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip((a - 255 * (1 - k)) / k, 0, 255)              # 흰색과 섞인 테두리 색을 되돌린다
    return np.dstack([col, alpha * 255]).astype(np.uint8)

def blobs(a, n):
    """큰 덩어리 n개 — (자르기 창, 그 덩어리만 남긴 그림) 을 x 순서로"""
    m = a[..., 3] >= FAINT
    lab, k = ndimage.label(ndimage.binary_dilation(m, iterations=4))
    sizes = ndimage.sum(m, lab, range(1, k + 1))
    ids = [i + 1 for i in np.argsort(-sizes)[:n]]
    out = []
    for i in ids:
        sl = ndimage.find_objects(lab)[i - 1]
        b = a.copy()
        b[..., 3] = np.where((lab == i) & m, b[..., 3], 0)
        out.append((sl, b))
    return sorted(out, key=lambda t: t[0][1].start)

def trim(b):
    ys, xs = np.where(b[..., 3] > 0)
    return Image.fromarray(b[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA")

def dress_x(im):
    """몸 가운데 띠(키의 35~80%)에서 검은 드레스 점의 가로 중심 — 머리카락 · 모자 챙이 흩날려도 몸 자리를 잡는다"""
    a = np.asarray(im).astype(int)
    H = a.shape[0]
    band = a[int(H * 0.35):int(H * 0.8)]
    ys, xs = np.where((band[..., 3] > 200) & (band[..., :3].max(2) < 90))
    return xs.mean() if len(xs) else im.size[0] / 2

def place(cr, s, cx=None):
    """줄여 여백을 둔다. cx 를 주면 그 점(줄이기 전 좌표)이 그림 가운데에 오게 좌우 여백을 늘린다 — 게임은 그림 가운데를 발 자리에 둔다"""
    w, h = max(1, round(cr.size[0] * s)), max(1, round(cr.size[1] * s))
    dx = 0 if cx is None else round(w / 2 - cx * s)
    o = Image.new("RGBA", (w + PAD * 2 + abs(dx), h + PAD * 2), (0, 0, 0, 0))
    o.alpha_composite(cr.resize((w, h), Image.LANCZOS), (PAD + max(dx, 0), PAD))
    return o

def cut(g):
    OUT = os.path.join(OUT_ROOT, f"illusion-{g}")
    st = unwhite(np.asarray(Image.open(os.path.join(SRC, f"illusion-{g}-standing-sheet.png")).convert("RGB")), GAP_RULE[g])
    front, back, side, _ = [trim(b) for _, b in blobs(st, 4)]
    stand = {"front": front, "back": back, "side": side, "turn": front}
    ref = Image.open(os.path.join(OUT_ROOT, f"assassin-{g}", "front.webp")).size[1] - PAD * 2
    s = ref / front.size[1] * SCALE
    os.makedirs(OUT, exist_ok=True)
    for v, cr in stand.items():
        o = place(cr, s, dress_x(cr))
        for name in (f"{v}.webp", f"{v}-bare.webp"):
            o.save(os.path.join(OUT, name), quality=92, method=6)
        print(g, v, o.size)

    wk = unwhite(np.asarray(Image.open(os.path.join(SRC, f"illusion-{g}-walk-sheet.png")).convert("RGB")), GAP_RULE[g])
    H, W = wk.shape[:2]
    ch, cw = H // 4, W // 4
    for r, v in ((0, "front"), (1, "back"), (2, "side")):
        row = wk[r * ch:(r + 1) * ch]
        frames = blobs(row, 4)                       # 한 줄 네 장
        y0 = min(sl[0].start for sl, _ in frames)
        y1 = max(np.where(b[..., 3].max(1) >= 128)[0].max() + 1 for _, b in frames)   # 발바닥 — 진한 점으로 잡아 서기와 같은 기준선
        tall = np.median([sl[0].stop - sl[0].start for sl, _ in frames])  # 한 장의 키 — 서 있는 키에 맞춘다
        sw = stand[v].size[1] * s / tall
        # 이 시트는 칸 간격이 고르지 않아(사람이 칸마다 조금씩 밀려 있다) 칸 좌표 합집합 대신 장마다 제 덩어리 창으로 자르고 제 드레스 중심을 가운데에 둔다
        crs = [Image.fromarray(b[y0:y1, sl[1].start:sl[1].stop], "RGBA") for sl, b in frames]
        for c, cr in enumerate(crs):
            o = place(cr, sw, dress_x(cr))
            o.save(os.path.join(OUT, f"walk-{v}-{c}.webp"), quality=92, method=6)
            print(g, "walk", v, c, o.size)

for g in ("f", "m"):
    cut(g)
