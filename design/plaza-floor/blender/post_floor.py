# 바닥 Blender 렌더 후처리 — 2배 렌더를 1800 × 1200 으로 줄여 원본 풀밭(plaza-orig.webp) 위에 얹는다.
#   blender -b --factory-startup --python post_floor.py -- <out 폴더> <plaza-orig.webp>
# 출력: plaza-blender.webp(손실 92, 게임 plaza.webp 와 같은 형식) · plaza-blender.png
import sys, os, bpy, numpy as np

def load(path):
    im = bpy.data.images.load(path, check_existing=False); w, h = im.size
    a = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1].copy(); bpy.data.images.remove(im); return a

def save(a, path, fmt="PNG"):
    h, w = a.shape[:2]
    im = bpy.data.images.new("o", w, h, alpha=True); im.pixels[:] = np.ascontiguousarray(a[::-1]).ravel()
    sc = bpy.context.scene; s = sc.render.image_settings; s.file_format = fmt; s.color_mode = "RGB"
    if fmt == "WEBP": s.quality = 92
    else: s.color_depth = "8"; s.compression = 15
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    im.save_render(path, scene=sc); bpy.data.images.remove(im)

def half(a):
    pm = a.copy(); pm[..., :3] *= pm[..., 3:4]
    h, w = a.shape[0] // 2 * 2, a.shape[1] // 2 * 2
    o = pm[:h, :w].reshape(h // 2, 2, w // 2, 2, 4).mean((1, 3))
    al = o[..., 3:4]; o[..., :3] = np.where(al > 1e-4, o[..., :3] / np.maximum(al, 1e-4), 0); return o

def main():
    args = sys.argv[sys.argv.index("--") + 1:]
    D, orig = args[0], args[1]
    f = half(load(os.path.join(D, "floor.png")))
    bg = load(orig)
    a = f[..., 3:4]
    out = bg.copy(); out[..., :3] = f[..., :3] * a + bg[..., :3] * (1 - a); out[..., 3] = 1
    save(out, os.path.join(D, "plaza-blender.png")); save(out, os.path.join(D, "plaza-blender.webp"), "WEBP")
    print("DONEPOST", out.shape)

main()
