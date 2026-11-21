# 2D 물약 매대 — Codex 로 뽑은 공통 바탕(기둥 · 차양 · 판매대)과 물약 소품을 레이어로 나눠 게임 칸에 맞춰 합친다.
#   blender -b --factory-startup --python compose_2d.py -- <2d 폴더>
# 입력: gen/base.png(공통 바탕, 1024 · 안내 그림 배치) · gen/props.png(물약 소품)
# 레이어(layers/): 0-shadow 바닥 그림자 · 1-posts 기둥 · 2-counter 판매대 · 3-shade 차양 그늘 · 4-props 소품 · 5-awning 차양
#   공통: 0~3, 5 / 상점마다 바꾸는 것: 4-props (차양 색은 5-awning 색만 바꾼다)
# 출력: layers/*.png · potion-front.png · potion-front.webp(무손실) — 칸은 게임 좌표 x -110..110, y -150..30, 1단위 3px
import sys, os, bpy, numpy as np

K = 3; FW, FH = 220 * K, 180 * K
G = 1024 / 180.0                      # 안내 그림 배율(1024px 에 180단위)

def load(path):
    im = bpy.data.images.load(path, check_existing=False); w, h = im.size
    a = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1].copy(); bpy.data.images.remove(im); return a

def save(a, path, fmt="PNG"):
    h, w = a.shape[:2]
    im = bpy.data.images.new("o", w, h, alpha=True); im.pixels[:] = np.ascontiguousarray(a[::-1]).ravel()
    sc = bpy.context.scene; s = sc.render.image_settings; s.file_format = fmt; s.color_mode = "RGBA"
    if fmt == "WEBP": s.quality = 100
    else: s.color_depth = "8"; s.compression = 15
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    im.save_render(path, scene=sc); bpy.data.images.remove(im)

def resize(a, w, h):
    """미리 곱한 알파로 줄인다(가장자리에 초록 · 검은 테가 끼지 않게)."""
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    H0, W0 = a.shape[:2]
    im = bpy.data.images.new("r", W0, H0, alpha=True, float_buffer=True); im.pixels[:] = np.ascontiguousarray(pm[::-1]).ravel()
    im.scale(w, h)
    o = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1].copy(); bpy.data.images.remove(im)
    al = o[..., 3:4]; o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0); return np.clip(o, 0, 1)

def key(a):
    """초록 바탕 지우기: 초록이 다른 색보다 앞선 정도로 투명도를 정하고 가장자리 초록기를 뺀다."""
    R, Gc, B = a[..., 0], a[..., 1], a[..., 2]
    dom = Gc - np.maximum(R, B)
    al = np.clip((0.55 - dom) / 0.33, 0, 1)                 # 0.22 이하 그대로, 0.55 이상 투명
    o = a.copy(); o[..., 3] = al
    o[..., 1] = np.where(dom > 0.05, np.maximum(R, B) + 0.05, Gc)   # 초록기 빼기
    return o

def over(dst, src):
    sa = src[..., 3:4]; da = dst[..., 3:4]; oa = sa + da * (1 - sa)
    oc = np.where(oa > 1e-4, (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-4), 0)
    return np.concatenate([oc, oa], -1)

def blur(m, r):
    for ax in (0, 1):
        acc = np.zeros_like(m)
        for d in range(-r, r + 1): acc += np.roll(m, d, ax)
        m = acc / (2 * r + 1)
    return m

def place(img, s, gx, gy, ox, oy):
    """img 의 (ox, oy) 화소를 게임 좌표 (gx, gy) 에 두고 배율 s(게임단위/화소)로 칸에 얹는다."""
    h, w = img.shape[:2]; nw, nh = max(1, round(w * s * K)), max(1, round(h * s * K))
    r = resize(img, nw, nh)
    X = round((gx + 110) * K - ox * s * K); Y = round((gy + 150) * K - oy * s * K)
    out = np.zeros((FH, FW, 4), np.float32)
    x0, y0 = max(0, X), max(0, Y); x1, y1 = min(FW, X + nw), min(FH, Y + nh)
    out[y0:y1, x0:x1] = r[y0 - Y:y1 - Y, x0 - X:x1 - X]
    return out

def main():
    D = sys.argv[sys.argv.index("--") + 1]; L = os.path.join(D, "layers"); os.makedirs(L, exist_ok=True)
    base = key(load(os.path.join(D, "gen", "base.png")))
    props = key(load(os.path.join(D, "gen", "props.png")))
    # 공통 바탕을 칸에 맞춘다 — 안내 그림의 (512, 853) 이 발밑(0, 0)
    b = place(base, 1 / G, 0, 0, 512, 853)
    yy = np.arange(FH)[:, None] * np.ones((1, FW)); gy = yy / K - 150
    lay = {}
    lay["5-awning"] = b * (gy < -71.5)[..., None]
    lay["2-counter"] = b * (gy >= -31.5)[..., None]
    lay["1-posts"] = b * ((gy >= -71.5) & (gy < -31.5))[..., None]
    # 차양 그늘 — 판매대 윗면 안쪽(뒤쪽 절반)을 어둡게. 기둥 사이만
    xx = np.ones((FH, 1)) * np.arange(FW)[None, :]; gx = xx / K - 110
    band = ((gy >= -30.5) & (gy < -26.0) & (np.abs(gx) < 56)).astype(np.float32)   # 손보정: 그늘 띠를 넓히고 진하게
    band = blur(band, 2) * lay["2-counter"][..., 3]
    sh = np.zeros((FH, FW, 4), np.float32); sh[..., 0], sh[..., 1], sh[..., 2] = 0.16, 0.10, 0.06; sh[..., 3] = band * 0.6
    lay["3-shade"] = sh
    # 바닥 그림자 — 판매대 · 기둥 모양을 오른쪽 아래로 민다(햇빛 왼쪽 위)
    m = np.maximum(lay["2-counter"][..., 3], lay["1-posts"][..., 3])
    m = np.roll(np.roll(m, 7 * K, 1), 4 * K, 0); m = blur(m, 4) * (gy > -12)
    gs = np.zeros((FH, FW, 4), np.float32); gs[..., 0], gs[..., 1], gs[..., 2] = 0.10, 0.08, 0.04; gs[..., 3] = m * 0.32
    lay["0-shadow"] = gs
    # 물약 소품 — 6병 줄(100..925px)을 x -39..39 에, 병 바닥(662px)을 y -26 에
    lay["4-props"] = place(props, 70 / 825, 0, -26, 512, 662)   # 손보정: 병을 10% 줄인다
    out = np.zeros((FH, FW, 4), np.float32)
    for k in sorted(lay):
        save(lay[k], os.path.join(L, k + ".png")); out = over(out, lay[k])
    save(out, os.path.join(D, "potion-front.png")); save(out, os.path.join(D, "potion-front.webp"), "WEBP")
    print("DONE2D")

main()
