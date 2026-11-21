# 분수 Blender 렌더 후처리 — 36칸 렌더(1단위 4px)를 게임 칸(1단위 2px)으로 줄이고 바닥 그림자를 깔아 6 × 6 시트로 묶는다.
#   blender -b --factory-startup --python post_fountain.py -- <out 폴더>
# 입력: frames/f00~f35.png · shade.png   출력: fountain-blender.webp(무손실 시트 2640 × 2220) · preview.png(첫 칸)
import sys, os, bpy, numpy as np

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

def half(a):
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
    o = pm[:h, :w].reshape(h // 2, 2, w // 2, 2, 4).mean((1, 3))
    al = o[..., 3:4]; o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0); return o

def over(dst, src):
    sa = src[..., 3:4]; da = dst[..., 3:4]; oa = sa + da * (1 - sa)
    oc = np.where(oa > 1e-4, (src[..., :3] * sa + dst[..., :3] * da * (1 - sa)) / np.maximum(oa, 1e-4), 0)
    return np.concatenate([oc, oa], -1)

def main():
    D = sys.argv[sys.argv.index("--") + 1]
    sh = load(os.path.join(D, "shade.png"))
    L = sh[..., :3].mean(-1); lit = np.percentile(L, 99)
    m = np.clip((lit - L) / (lit * 0.45), 0, 1)
    g = np.zeros(sh.shape, np.float32); g[..., 0], g[..., 1], g[..., 2] = 0.10, 0.08, 0.04; g[..., 3] = m * 0.32
    g = half(g)
    frames = sorted(f for f in os.listdir(os.path.join(D, "frames")) if f.endswith(".png"))
    fh, fw = g.shape[:2]; cols = 6; rows = (len(frames) + cols - 1) // cols
    sheet = np.zeros((fh * rows, fw * cols, 4), np.float32)
    for i, f in enumerate(frames):
        c = over(g, half(load(os.path.join(D, "frames", f))))
        r, k = divmod(i, cols)
        sheet[r * fh:(r + 1) * fh, k * fw:(k + 1) * fw] = c
        if i == 0: save(c, os.path.join(D, "preview.png"))
    save(sheet, os.path.join(D, "fountain-blender.webp"), "WEBP")
    print("DONEPOST", sheet.shape, len(frames))

main()
