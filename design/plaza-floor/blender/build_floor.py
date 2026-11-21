# 에르덴 광장 바닥 포석 — Blender 사전 렌더 비교본(2D make.py 와 나란히 보기용, 게임에는 넣지 않는다)
#   blender -b --factory-startup --python build_floor.py -- <출력폴더>
# 결과: <출력폴더>/floor.png(투명, 1단위 2px) · floor.blend. 이어서 post_floor.py 가 원본 풀밭과 합친다.
# 좌표: 1 Blender 단위 = 게임 좌표 1. 포석 고리 중심(그림 899.5, 639.5)이 원점, 화면 오른쪽 = +X, 뒤(화면 위) = +Y, 위 = +Z.
# 고리 배열 · 돌 크기 · 상점 자리는 2D(make.py)와 같다. 고칠 수치는 아래 P.
import bpy, bmesh, math, sys, os, random
from mathutils import Vector

P = dict(
    squash=0.78, cx=899.5, cy=639.5,
    r0=149.5, step=44.0, rings=9, stone_len=62,
    joint=2.0,          # 줄눈 너비(돌 사이 틈)
    height=2.4,         # 돌 높이
    bevel=1.3,          # 돌 모서리 둥글기
    chip=5.0,           # 깎인 모서리 크기
    sun=(-0.45, 0.36, 0.90),
    px=2,               # 렌더 배율 — 후처리에서 1 로 줄인다
    shops=[(135, 310), (300, 310), (465, 310), (1170, 310), (1335, 310), (1500, 310), (1665, 310)],
    worn=dict(dy=70, rx=110, ry=60),
    moss_rings=(7, 8),
    seed=20261121,
)
W_IMG, H_IMG = 1800, 1200
COL = dict(tones=["#b2a991", "#bdb39b", "#c8bca4", "#d0c6ae"], worn="#d6ccb6", disc="#b7ad97",
           mortar="#958b76", moss="#76845a")

def hex3(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [1]

MATS = {}
def toon(name, color, steps=(0.80, 0.92, 1.0)):
    """명암 3단(상점 · 분수 Blender 시험과 같은 방식). 바닥이라 단 차이를 작게 둔다."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new("ShaderNodeShaderToRGB"); bw = nt.nodes.new("ShaderNodeRGBToBW")
    ramp = nt.nodes.new("ShaderNodeValToRGB"); cr = ramp.color_ramp; cr.interpolation = "CONSTANT"
    cr.elements[0].position = 0.0; cr.elements[0].color = (steps[0],) * 3 + (1,)
    cr.elements[1].position = 0.22; cr.elements[1].color = (steps[1],) * 3 + (1,)
    e = cr.elements.new(0.55); e.color = (steps[2],) * 3 + (1,)
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1.0
    mix.inputs[6].default_value = hex3(color)
    em = nt.nodes.new("ShaderNodeEmission"); L = nt.links
    L.new(dif.outputs[0], s2r.inputs[0]); L.new(s2r.outputs[0], bw.inputs[0]); L.new(bw.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], mix.inputs[7]); L.new(mix.outputs[2], em.inputs[0]); L.new(em.outputs[0], out.inputs[0])
    MATS[name] = m; return m

ZK = 1.0
def to_world(gx, gy):
    """게임(그림) 좌표 → 땅 좌표(고리 중심 원점, 뒤가 +Y)."""
    return gx - P["cx"], -(gy - P["cy"]) / P["squash"]

def worn_at(x, y):
    """돌 가운데가 상점 앞 반원 안이면 0~1."""
    gx, gy = x + P["cx"], P["cy"] - y * P["squash"]
    w = P["worn"]; best = 0
    for sx, sy in P["shops"]:
        e = ((gx - sx) / w["rx"]) ** 2 + ((gy - sy - w["dy"]) / w["ry"]) ** 2
        if gy > sy - 6: best = max(best, min(1, max(0, (1 - e) * 1.6)))
    return best

def slab(name, outline, h, mat, bevel):
    """2D 윤곽(땅 좌표 점 목록)을 높이 h 로 세운 돌 하나. 모서리는 둥글린다."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0)) for x, y in outline]
    f = bm.faces.new(vs)
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    for v in [e for e in ex["geom"] if isinstance(e, bmesh.types.BMVert)]: v.co.z = h * ZK
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(mat)
    b = o.modifiers.new("bev", "BEVEL"); b.width = bevel; b.segments = 2; b.limit_method = "ANGLE"
    return o

def sector_outline(r0, r1, a0, a1, chip_corners, chip, seg=8):
    inner = [(r0 * math.cos(a0 + (a1 - a0) * k / seg), r0 * math.sin(a0 + (a1 - a0) * k / seg)) for k in range(seg + 1)]
    outer = [(r1 * math.cos(a1 - (a1 - a0) * k / seg), r1 * math.sin(a1 - (a1 - a0) * k / seg)) for k in range(seg + 1)]
    pts = inner + outer                       # 반시계: 안쪽 호 → 바깥 호
    corners = [0, seg, seg + 1, 2 * seg + 1]  # 네 모서리 자리
    out = []
    for i, p in enumerate(pts):
        if i in corners and corners.index(i) in chip_corners:
            prv, nxt = Vector(pts[i - 1]), Vector(pts[(i + 1) % len(pts)]); c = Vector(p)
            out.append(tuple(c + (prv - c).normalized() * chip)); out.append(tuple(c + (nxt - c).normalized() * chip))
        else: out.append(p)
    return out

def build():
    p = P; rnd = random.Random(p["seed"])
    tones = [toon(f"tone{i}", c) for i, c in enumerate(COL["tones"])]
    worn_m = toon("worn", COL["worn"], (0.86, 0.95, 1.0))
    jr = p["joint"] / 2
    for k in range(p["rings"]):
        r0 = p["r0"] + k * p["step"]; r1 = r0 + p["step"]; rm = (r0 + r1) / 2
        n = max(8, round(2 * math.pi * rm / p["stone_len"]))
        off = rnd.random()
        for j in range(n):
            a0 = 2 * math.pi * (j - off) / n; a1 = 2 * math.pi * (j + 1 - off) / n
            ga = jr / rm
            am = (a0 + a1) / 2; x, y = rm * math.cos(am), rm * math.sin(am)
            w = worn_at(x, y)
            chips = [c for c in range(4) if rnd.random() > 0.62]
            ol = sector_outline(r0 + jr, r1 - jr, a0 + ga, a1 - ga, chips, p["chip"] * (1 + w))
            mat = worn_m if w > 0.5 else tones[(rnd.randrange(4) + (j % 2) * 2) % 4]
            o = slab(f"s{k}_{j}", ol, p["height"] * (1 - 0.3 * w) + rnd.uniform(-0.25, 0.25), mat, p["bevel"] * (1 + 1.2 * w))
            # 이끼 — 바깥 두 고리의 줄눈 끝, 상점 앞은 뺀다
            if k in p["moss_rings"] and w < 0.05 and rnd.random() > 0.72:
                rr = r0 if rnd.random() < 0.5 else r1; aa = a0
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(rr * math.cos(aa), rr * math.sin(aa), 0.4 * ZK))
                m = bpy.context.object; m.name = f"moss{k}_{j}"
                m.scale = (rnd.uniform(3, 6), rnd.uniform(2, 4), 0.9 * ZK); m.rotation_euler = (0, 0, aa + rnd.uniform(-0.5, 0.5))
                m.data.materials.append(toon("moss", COL["moss"], (0.75, 0.9, 1.0)))
    # 가운데 원판 — 넓은 판석 하나, 테두리는 줄눈
    slab("disc", [((p["r0"] - jr) * math.cos(a), (p["r0"] - jr) * math.sin(a)) for a in [2 * math.pi * i / 128 for i in range(128)]],
         p["height"], toon("disc", COL["disc"], (0.86, 0.95, 1.0)), p["bevel"])
    # 줄눈 바탕 — 돌 아래 원판
    rend = p["r0"] + p["rings"] * p["step"]
    bpy.ops.mesh.primitive_circle_add(vertices=256, radius=rend + 1.5, fill_type="NGON", location=(0, 0, 0))
    g = bpy.context.object; g.name = "mortar"; g.data.materials.append(toon("mortar", COL["mortar"], (0.85, 0.95, 1.0)))

def setup():
    p = P; sc = bpy.context.scene
    th = math.asin(p["squash"]); up = Vector((0, math.sin(th), math.cos(th))); look = Vector((0, math.cos(th), -math.sin(th)))
    u0, u1 = p["cy"] - H_IMG, p["cy"]                     # 화면 위 좌표 범위(위가 +)
    cx = W_IMG / 2 - p["cx"]; cy = (u0 + u1) / 2
    cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"; cam_d.ortho_scale = max(W_IMG, H_IMG); cam_d.clip_end = 5000
    cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = Vector((cx, 0, 0)) + up * cy - look * 1500
    cam.rotation_euler = (math.radians(90) - th, 0, 0)
    r = sc.render; r.resolution_x = W_IMG * p["px"]; r.resolution_y = H_IMG * p["px"]; r.resolution_percentage = 100
    r.film_transparent = True
    try: sc.eevee.taa_render_samples = 16
    except Exception: pass
    names = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    r.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in names else "BLENDER_EEVEE"
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.0; sd.angle = math.radians(0.6)
    sun = bpy.data.objects.new("sun", sd); sc.collection.objects.link(sun)
    sun.rotation_euler = Vector(p["sun"]).normalized().to_track_quat("Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); w.use_nodes = True; sc.world = w
    w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    try: sc.eevee.shadow_resolution_scale = 1.0
    except Exception: pass
    return sc

def main():
    global ZK
    out = sys.argv[sys.argv.index("--") + 1]; os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ZK = 1 / math.cos(math.asin(P["squash"]))
    build(); sc = setup()
    sc.render.filepath = os.path.join(out, "floor.png"); bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "floor.blend"))
    print("DONE", out)

main()
