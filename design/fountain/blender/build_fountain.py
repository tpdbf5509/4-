# 에르덴 광장 분수 — Blender 사전 렌더 비교본(2D 그림 make.py 와 나란히 보기용, 게임에는 넣지 않는다)
#   blender -b --factory-startup --python build_fountain.py -- <출력폴더>
# 결과: <출력폴더>/frames/f00~f35.png(투명, 1단위 4px) · shade.png(바닥 그림자) · fountain.blend
#        이어서 post_fountain.py 가 36칸 시트(1단위 2px, 2640 × 2220)로 묶는다.
# 좌표: 1 Blender 단위 = 게임 좌표 1. 분수 가운데가 원점, 화면 오른쪽 = +X, 뒤(화면 위쪽) = +Y, 위 = +Z.
# 카메라는 광장과 같은 각도로 내려다본다 — 땅의 세로 비율 RPG.squash 0.78, 높이는 화면에서 1:1 이 되게 Z 를 키워 만든다.
# 크기 · 기준점은 2D 그림과 같다(바깥 반지름 100 · 안쪽 83 · 칸 220 × 185 · 기준점 (110, 95)).
# 고칠 수치는 아래 P 에 모았다. 모델을 직접 열지 않아도 된다.
import bpy, bmesh, math, sys, os
from mathutils import Vector

P = dict(
    squash=0.78,        # RPG.squash — 땅 세로 비율. 카메라 내려다보는 각 = asin(0.78)
    r_out=100, r_in=83, h_rim=11, blocks=20,   # 돌 테두리
    z_water=4,          # 수면 높이
    r_col=11, z_coltop=44,                     # 가운데 기둥
    r_bowl=29, z_bowl=50, t_bowl=6,            # 위 접시
    r_fall=31,          # 접시에서 떨어진 물이 닿는 반지름
    ring_gap=17,        # 잔물결 간격 — 한 바퀴(36칸)에 세 간격만큼 퍼진다
    sun=(-0.45, 0.36, 0.90),   # 햇빛이 오는 방향(왼쪽 · 뒤 · 위) — 화면 왼쪽 위에서, 그림자는 오른쪽 아래로
    px=4,               # 렌더 배율(게임 1단위당 화소). 후처리에서 2 로 줄인다
    frames=36,
)
FRAME = dict(x0=-110, x1=110, y0=-90, y1=95)   # 화면 위 좌표(위가 +). 칸 220 × 185, 원점이 위에서 95

COL = dict(
    stone=["#cfc3aa", "#c6b99f", "#d6cbb4", "#bdb097"], stone_side="#b5a78d", col="#d2c7b0",
    water="#64908c", water_light="#9cbcb2", foam="#e2eae2", line="#4a3a2c",
)

def hex3(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c] + [1]

ZK = 1.0                # 높이 배율 — setup 전에 정한다

MATS = {}
def toon_nodes(nt, color_socket_or_hex, steps=(0.62, 0.84, 1.0)):
    """명암 3단 — 상점 매대 Blender 시험과 같은 방식(확산광을 3단으로 끊어 색에 곱해 내보낸다)."""
    dif = nt.nodes.new("ShaderNodeBsdfDiffuse"); dif.inputs["Color"].default_value = (1, 1, 1, 1)
    s2r = nt.nodes.new("ShaderNodeShaderToRGB"); bw = nt.nodes.new("ShaderNodeRGBToBW")
    ramp = nt.nodes.new("ShaderNodeValToRGB"); cr = ramp.color_ramp; cr.interpolation = "CONSTANT"
    cr.elements[0].position = 0.0; cr.elements[0].color = (steps[0],) * 3 + (1,)
    cr.elements[1].position = 0.22; cr.elements[1].color = (steps[1],) * 3 + (1,)
    e = cr.elements.new(0.55); e.color = (steps[2],) * 3 + (1,)
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 1.0
    L = nt.links
    if isinstance(color_socket_or_hex, str): mix.inputs[6].default_value = hex3(color_socket_or_hex)
    else: L.new(color_socket_or_hex, mix.inputs[6])
    L.new(dif.outputs[0], s2r.inputs[0]); L.new(s2r.outputs[0], bw.inputs[0]); L.new(bw.outputs[0], ramp.inputs[0])
    L.new(ramp.outputs[0], mix.inputs[7])
    em = nt.nodes.new("ShaderNodeEmission"); L.new(mix.outputs[2], em.inputs[0])
    return em

def toon(name, color, steps=(0.62, 0.84, 1.0)):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = toon_nodes(nt, color, steps)
    nt.links.new(em.outputs[0], out.inputs[0]); MATS[name] = m; return m

def time_value(nt):
    """t = 프레임 / 36 (0~1). 드라이버의 간단식이라 파이썬 실행 허용 없이도 돈다."""
    v = nt.nodes.new("ShaderNodeValue")
    fc = v.outputs[0].driver_add("default_value"); fc.driver.type = "SCRIPTED"
    fc.driver.expression = f"frame / {P['frames']}"
    return v.outputs[0]

def math_node(nt, op, a, b=None, c=None):
    n = nt.nodes.new("ShaderNodeMath"); n.operation = op
    for i, x in enumerate((a, b, c)):
        if x is None: continue
        if isinstance(x, (int, float)): n.inputs[i].default_value = x
        else: nt.links.new(x, n.inputs[i])
    return n.outputs[0]

def polar(nt):
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    x, y, z = sep.outputs[0], sep.outputs[1], sep.outputs[2]
    r = math_node(nt, "SQRT", math_node(nt, "ADD", math_node(nt, "MULTIPLY", x, x), math_node(nt, "MULTIPLY", y, y)))
    ang = math_node(nt, "ARCTAN2", y, x)
    return r, ang, z

def water_mat():
    """수면 — 가장자리 짙고, 떨어지는 자리에서 잔물결 고리가 바깥으로 퍼지며 옅어진다. 거품 점도 반짝인다."""
    m = bpy.data.materials.new("water"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); t = time_value(nt); r, ang, _ = polar(nt)
    p = P; k = 2 * math.pi / p["ring_gap"]
    # 물결: sin(r·k − t·2π·3) 의 마루만, 떨어지는 자리 바깥에서 테두리 쪽으로 옅어진다
    wave = math_node(nt, "SINE", math_node(nt, "SUBTRACT", math_node(nt, "MULTIPLY", r, k), math_node(nt, "MULTIPLY", t, 2 * math.pi * 3)))
    crest = math_node(nt, "MAXIMUM", math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", wave, 0.78), 4.5), 0)
    span = p["r_in"] - p["r_fall"]
    fade = math_node(nt, "MAXIMUM", math_node(nt, "SUBTRACT", 1, math_node(nt, "DIVIDE", math_node(nt, "SUBTRACT", r, p["r_fall"]), span)), 0)
    inside = math_node(nt, "GREATER_THAN", r, p["r_fall"] + 1)
    ring = math_node(nt, "MULTIPLY", math_node(nt, "MULTIPLY", crest, fade), inside)
    # 거품: 떨어지는 자리 둘레의 점이 깜빡인다
    band = math_node(nt, "MAXIMUM", math_node(nt, "SUBTRACT", 1, math_node(nt, "DIVIDE", math_node(nt, "ABSOLUTE", math_node(nt, "SUBTRACT", r, p["r_fall"])), 2.5)), 0)
    spark = math_node(nt, "GREATER_THAN", math_node(nt, "SINE", math_node(nt, "ADD", math_node(nt, "MULTIPLY", ang, 40), math_node(nt, "MULTIPLY", t, 2 * math.pi * 4))), 0.35)
    foam = math_node(nt, "MULTIPLY", band, spark)
    # 가장자리 짙게
    edge = math_node(nt, "POWER", math_node(nt, "MINIMUM", math_node(nt, "DIVIDE", r, p["r_in"]), 1), 2)
    mix1 = nt.nodes.new("ShaderNodeMix"); mix1.data_type = "RGBA"
    mix1.inputs[6].default_value = hex3(COL["water_light"]); mix1.inputs[7].default_value = hex3(COL["water"])
    nt.links.new(math_node(nt, "ADD", math_node(nt, "MULTIPLY", edge, 0.8), 0.2), mix1.inputs[0])
    mix2 = nt.nodes.new("ShaderNodeMix"); mix2.data_type = "RGBA"; mix2.inputs[7].default_value = hex3(COL["water_light"])
    nt.links.new(mix1.outputs[2], mix2.inputs[6]); nt.links.new(math_node(nt, "MINIMUM", math_node(nt, "MULTIPLY", ring, 0.6), 1), mix2.inputs[0])
    mix3 = nt.nodes.new("ShaderNodeMix"); mix3.data_type = "RGBA"; mix3.inputs[7].default_value = hex3(COL["foam"])
    nt.links.new(mix2.outputs[2], mix3.inputs[6]); nt.links.new(math_node(nt, "MULTIPLY", foam, 0.5), mix3.inputs[0])
    em = toon_nodes(nt, mix3.outputs[2], (0.70, 0.86, 1.0))
    nt.links.new(em.outputs[0], out.inputs[0])
    return m

def curtain_mat():
    """접시에서 떨어지는 물줄기 — 세로 줄무늬가 아래로 흐른다. 투명 바탕."""
    m = bpy.data.materials.new("curtain"); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); t = time_value(nt); r, ang, z = polar(nt)
    lines = math_node(nt, "GREATER_THAN", math_node(nt, "SINE", math_node(nt, "MULTIPLY", ang, 18)), 0.86)
    flow = math_node(nt, "ADD", 0.5, math_node(nt, "MULTIPLY", 0.5, math_node(nt, "SINE", math_node(nt, "ADD", math_node(nt, "MULTIPLY", z, 0.35), math_node(nt, "MULTIPLY", t, 2 * math.pi * 6)))))
    a = math_node(nt, "MULTIPLY", lines, math_node(nt, "ADD", 0.15, math_node(nt, "MULTIPLY", flow, 0.55)))
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = hex3(COL["foam"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(a, mx.inputs[0]); nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    for k, v in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
        try: setattr(m, k, v)
        except Exception: pass
    return m

def link(me, name, mat):
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o); o.data.materials.append(mat); return o

def sector(i, a0, a1, r0, r1, z0, z1, mat, seg=6):
    """돌 한 개 — 고리의 한 조각(바깥 · 안쪽 벽, 윗면, 옆면)."""
    vs, fs = [], []
    for k in range(seg + 1):
        a = a0 + (a1 - a0) * k / seg
        for r in (r0, r1):
            for z in (z0, z1): vs.append((r * math.cos(a), r * math.sin(a), z * ZK))
    for k in range(seg):
        b, n = 4 * k, 4 * (k + 1)
        fs += [(b + 1, n + 1, n + 3, b + 3),      # 윗면
               (b + 2, n + 2, n + 3, b + 3)[::-1],  # 바깥 벽
               (b + 0, n + 0, n + 1, b + 1),      # 안쪽 벽
               (b + 0, b + 2, n + 2, n + 0)]      # 바닥
    e = 4 * seg; fs += [(0, 1, 3, 2), (e, e + 2, e + 3, e + 1)]
    me = bpy.data.meshes.new(f"block{i}"); me.from_pydata(vs, [], fs)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free(); me.update()
    return link(me, f"block{i}", mat)

def cyl(name, r, z0, z1, mat, verts=64, cap=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=(z1 - z0) * ZK, location=(0, 0, (z0 + z1) / 2 * ZK),
                                        end_fill_type="NGON" if cap else "NOTHING")
    o = bpy.context.object; o.name = name; o.data.materials.append(mat); bpy.ops.object.shade_smooth(); return o

def disc(name, r, z, mat, verts=96):
    bpy.ops.mesh.primitive_circle_add(vertices=verts, radius=r, fill_type="NGON", location=(0, 0, z * ZK))
    o = bpy.context.object; o.name = name; o.data.materials.append(mat); return o

def build():
    p = P
    stones = [toon(f"stone{i}", c) for i, c in enumerate(COL["stone"])]
    # 테두리 돌 — 돌마다 색 네 가지 중 하나, 줄눈 틈 0.8, 높이 ±0.3
    n = p["blocks"]; gap = 0.8 / p["r_out"]
    for i in range(n):
        a0 = 2 * math.pi * i / n + gap / 2; a1 = 2 * math.pi * (i + 1) / n - gap / 2
        hz = p["h_rim"] + ((i * 7919) % 5 - 2) * 0.15
        sector(i, a0, a1, p["r_in"], p["r_out"], 0, hz, stones[(i * 3 + i // 4) % 4])
    # 줄눈(돌 사이 어두운 바탕 고리)
    mortar = toon("mortar", "#8a7b64")
    sector("mortar", 0, 2 * math.pi, p["r_in"] + 0.4, p["r_out"] - 0.4, 0, p["h_rim"] - 0.6, mortar, seg=128).name = "mortar"
    # 수면(돌 고리 안을 덮는다)
    disc("water", p["r_in"] + 0.2, p["z_water"], water_mat())
    # 가운데 — 받침 · 기둥 · 접시 · 접시 물 · 꼭지
    colm = toon("column", COL["col"])
    cyl("foot", p["r_col"] + 4, 0, p["z_water"] + 4, colm)
    cyl("column", p["r_col"], 0, p["z_coltop"] + 2, colm)
    cyl("band1", p["r_col"] + 0.6, 15.5, 17, toon("band", COL["stone_side"]))
    cyl("band2", p["r_col"] + 0.6, 35.5, 36.8, toon("band", COL["stone_side"]))
    cyl("bowl", p["r_bowl"], p["z_bowl"] - p["t_bowl"], p["z_bowl"], colm)
    cyl("bowl_under", p["r_bowl"] - 5, p["z_bowl"] - p["t_bowl"] - 3, p["z_bowl"] - p["t_bowl"], colm)
    bw = bpy.data.materials["water"]
    disc("bowl_water", p["r_bowl"] - 4.5, p["z_bowl"] + 0.05, bw)
    # 접시 테 — 얇은 고리
    sector(100, 0, 2 * math.pi, p["r_bowl"] - 4.5, p["r_bowl"], p["z_bowl"], p["z_bowl"] + 1.2, colm, seg=96)
    cyl("finial", 4, p["z_bowl"], p["z_bowl"] + 7, colm, verts=32)
    cyl("jet", 1.5, p["z_bowl"] + 7, p["z_bowl"] + 17, curtain_mat(), verts=16, cap=False)
    # 물줄기 — 접시 아래 가장자리에서 수면까지 살짝 벌어지는 관
    bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=p["r_fall"], radius2=p["r_bowl"] + 0.5,
                                    depth=(p["z_bowl"] - p["t_bowl"] - p["z_water"]) * ZK,
                                    location=(0, 0, (p["z_bowl"] - p["t_bowl"] + p["z_water"]) / 2 * ZK), end_fill_type="NOTHING")
    c = bpy.context.object; c.name = "curtain"; c.data.materials.append(bpy.data.materials["curtain"])
    c.visible_shadow = False
    bpy.data.objects["jet"].visible_shadow = False
    # 바닥(그림자 받기용)
    bpy.ops.mesh.primitive_plane_add(size=3000, location=(0, 0, 0)); g = bpy.context.object; g.name = "ground"
    gm = bpy.data.materials.new("ground"); gm.use_nodes = True; g.data.materials.append(gm)
    return g

def setup():
    p = P; sc = bpy.context.scene
    th = math.asin(p["squash"]); up = Vector((0, math.sin(th), math.cos(th))); look = Vector((0, math.cos(th), -math.sin(th)))
    cy = (FRAME["y0"] + FRAME["y1"]) / 2; cx = (FRAME["x0"] + FRAME["x1"]) / 2
    W, H = FRAME["x1"] - FRAME["x0"], FRAME["y1"] - FRAME["y0"]
    cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"; cam_d.ortho_scale = max(W, H); cam_d.clip_end = 3000
    cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = Vector((cx, 0, 0)) + up * cy - look * 800
    cam.rotation_euler = (math.radians(90) - th, 0, 0)
    r = sc.render; r.resolution_x = W * p["px"]; r.resolution_y = H * p["px"]; r.resolution_percentage = 100
    r.film_transparent = True
    try: sc.eevee.taa_render_samples = 32
    except Exception: pass
    names = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    r.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in names else "BLENDER_EEVEE"
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.0; sd.angle = math.radians(0.6)
    sun = bpy.data.objects.new("sun", sd); sc.collection.objects.link(sun)
    sun.rotation_euler = Vector(p["sun"]).normalized().to_track_quat("Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); w.use_nodes = True; sc.world = w
    w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.35
    r.use_freestyle = True; r.line_thickness_mode = "ABSOLUTE"; r.line_thickness = 1.0 * p["px"] / 2
    fs = sc.view_layers[0].freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new("l")
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new("line")
    ls.linestyle.color = hex3(COL["line"])[:3]; ls.linestyle.thickness = 1.0 * p["px"] / 2; ls.linestyle.alpha = 0.75
    ls.select_by_visibility = True; ls.select_by_edge_types = True
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = False
    # 물줄기 · 물 · 줄눈에는 선을 긋지 않는다 — 따로 모아 선 대상에서 뺀다
    nol = bpy.data.collections.new("noline"); sc.collection.children.link(nol)
    for name in ("curtain", "jet", "water", "bowl_water", "mortar"):
        o = bpy.data.objects[name]
        for c in list(o.users_collection): c.objects.unlink(o)
        nol.objects.link(o)
    ls.select_by_collection = True; ls.collection = nol; ls.collection_negation = "EXCLUSIVE"
    return sc

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

def main():
    global ZK
    out = sys.argv[sys.argv.index("--") + 1]
    os.makedirs(os.path.join(out, "frames"), exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ZK = 1 / math.cos(math.asin(P["squash"]))     # 화면 높이 1:1 이 되게 Z 를 키운다
    ground = build(); sc = setup()
    parts = [o for o in sc.objects if o.type == "MESH" and o.name != "ground"]   # 모음을 옮긴 뒤라 sc.objects 로 모두 센다
    ground.hide_render = True
    for f in range(P["frames"]):
        sc.frame_set(f)
        render(os.path.join(out, "frames", f"f{f:02d}.png"))
    # 바닥 그림자 — 분수는 카메라에 안 보이고 그림자만 드리운다
    ground.hide_render = False; ground.visible_camera = True
    nt = ground.data.materials[0].node_tree; nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial"); d = nt.nodes.new("ShaderNodeBsdfDiffuse"); d.inputs[0].default_value = (1, 1, 1, 1)
    nt.links.new(d.outputs[0], o.inputs[0])
    for s in parts: s.visible_camera = False
    sc.render.use_freestyle = False; sc.render.film_transparent = False
    sc.frame_set(0); render(os.path.join(out, "shade.png"))
    ground.visible_camera = False; ground.hide_render = True
    for s in parts: s.visible_camera = True
    sc.render.use_freestyle = True; sc.render.film_transparent = True
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, "fountain.blend"))
    print("DONE", out)

main()
