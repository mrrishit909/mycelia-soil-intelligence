"""MYCELIA soil cutaway. Deterministic. Run: Blender -b -P model/build.py
Writes exports/soil-cutaway.glb (layers, rocks, water channels, crop root systems, anchors), exports/guides.json (the polylines the strands are generated from in the browser),
renders/poster.png and source.blend. Units: 1 Blender unit = 10 cm of soil depth in the browser; the block is 20 x 20 wide and 14 deep. Z up in Blender, Y up in glTF."""
import bpy, bmesh, math, os, json, random
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
os.makedirs(os.path.join(HERE, "exports"), exist_ok=True); os.makedirs(os.path.join(HERE, "renders"), exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True); scene = bpy.context.scene; rnd = random.Random(31)

def mat(name, color, rough=0.85, metal=0.0, emit=None, k=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = k
    return m
M = {"Topsoil": mat("TopsoilMat", (0.09, 0.07, 0.05)), "Subsoil": mat("SubsoilMat", (0.22, 0.12, 0.07)), "Bedrock": mat("BedrockMat", (0.18, 0.17, 0.16), 0.95), "Rock": mat("RockMat", (0.3, 0.29, 0.27), 0.9),
     "Water": mat("WaterMat", (0.2, 0.45, 0.7), 0.15, 0.0, (0.2, 0.5, 0.9), 0.4), "RootCereal": mat("RootCerealMat", (0.93, 0.89, 0.8), 0.7), "RootLegume": mat("RootLegumeMat", (0.57, 0.66, 0.37), 0.7), "RootBrassica": mat("RootBrassicaMat", (0.91, 0.78, 0.42), 0.7)}
def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None); scene.collection.objects.link(e); e.location = loc
    if parent: e.parent = parent
    return e
def mesh_obj(name, bm, material, parent):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o); o.data.materials.append(M[material]); o.parent = parent; return o
def box(x0, x1, y0, y1, z0, z1):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = ((x1 - x0) * (v.co.x + 0.5) + x0, (y1 - y0) * (v.co.y + 0.5) + y0, (z1 - z0) * (v.co.z + 0.5) + z0)
    return bm
def tube(polys, radius, sides=5):
    """Sweep a small polygon along each polyline; radius may taper (callable of t)."""
    bm = bmesh.new()
    for pts in polys:
        pts = [Vector(p) for p in pts]; rings = []
        for i, p in enumerate(pts):
            t = i / (len(pts) - 1); r = radius(t) if callable(radius) else radius
            d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); a = d.cross(Vector((0, 0, 1)))
            if a.length < 1e-3: a = d.cross(Vector((1, 0, 0)))
            a.normalize(); b = d.cross(a).normalized()
            rings.append([bm.verts.new(p + (a * math.cos(2 * math.pi * k / sides) + b * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
        for i in range(len(rings) - 1):
            for k in range(sides): bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    return bm

root = empty("SoilCutaway"); W = P["block"]["width"] / 2; CUT = -W + 4   # the cut face: roots, channels and rocks sit on it like a soil monolith diagram
for name, (z0, z1) in P["block"]["layers"].items(): mesh_obj(name, box(-W, W, CUT, W, z0, z1), name, root)
rocks = []
for i in range(1, 7):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rnd.uniform(0.7, 1.5))
    for v in bm.verts: v.co *= rnd.uniform(0.75, 1.2)
    o = mesh_obj(f"Rock_{i}", bm, "Rock", root); o.location = (rnd.uniform(-W + 2, W - 2), CUT + 0.1, rnd.uniform(-12.5, -5)); o.scale.z = 0.7

def wander(start, steps, step, drift, spread):
    p = Vector(start); pts = [tuple(p)]; d = Vector(drift)
    for _ in range(steps):
        d = (d + Vector((rnd.uniform(-spread, spread), rnd.uniform(-spread, spread), rnd.uniform(-spread, spread) * 0.5))).normalized()
        p = p + d * step; pts.append(tuple(p))
    return pts
G = {}
# water: three channels from the surface cracks down through the layers (the front face stays open at y = -W)
crack = Vector((1.5, CUT, 0.0)); G["water"] = []
for i in range(3):
    s = Vector((crack.x + i * 4 - 3, CUT, 0)); pts = [tuple(s)]
    for k in range(1, 9): pts.append((s.x + math.sin(k * 0.9 + i) * 0.7, CUT - 0.02 + 0.03 * i, -k * 0.95))
    G["water"].append(pts)
mesh_obj("WaterChannel_1", tube([G["water"][0]], lambda t: 0.22 * (1 - 0.5 * t)), "Water", root); mesh_obj("WaterChannel_2", tube([G["water"][1]], lambda t: 0.2 * (1 - 0.5 * t)), "Water", root); mesh_obj("WaterChannel_3", tube([G["water"][2]], lambda t: 0.18 * (1 - 0.5 * t)), "Water", root)
# crop roots: a main axis plus laterals, three architectures
def roots(kind, x0, count, depth, spread, lat):
    out = []
    for i in range(count):
        s = (x0 + rnd.uniform(-1.6, 1.6), CUT + 0.1, -0.1); pts = [(a, CUT - 0.02 + rnd.uniform(-0.04, 0.06), c) for a, _, c in wander(s, int(depth * 1.4), 0.7, (rnd.uniform(-0.2, 0.2), 0, -1), spread)]
        out.append(pts)
        for j in range(lat):
            k = rnd.randint(2, max(3, len(pts) - 3)); o = pts[k]; out.append([(a, CUT - 0.02 + rnd.uniform(-0.04, 0.06), c) for a, _, c in wander(o, rnd.randint(3, 6), 0.45, (rnd.choice([-1, 1]), 0, -0.25), 0.18)])
    return out
G["root_cereal"] = roots("cereal", -6.5, 10, 4.0, 0.25, 3); G["root_legume"] = roots("legume", 0.5, 4, 9.0, 0.08, 4); G["root_brassica"] = roots("brassica", 7.5, 5, 6.5, 0.12, 3)
for kind, m in (("cereal", "RootCereal"), ("legume", "RootLegume"), ("brassica", "RootBrassica")): mesh_obj(f"RootSystem_{kind}", tube(G["root_" + kind], lambda t: 0.17 * (1 - 0.6 * t) + 0.04, 5), m, root)
G["mycelium"] = [wander((rnd.uniform(-W + 1, W - 1), CUT + rnd.uniform(0.2, 12), rnd.uniform(-7.5, -0.5)), 26, 0.8, (rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.8), rnd.uniform(-0.3, 0.3)), 0.5) for _ in range(16)]
empty("Anchor_InfiltrationEntry", (crack.x, crack.y, 0.0), root); empty("Anchor_CutawayOrigin", (0, CUT, 0), root); empty("Anchor_CrackPoint", (crack.x + 0.3, crack.y + 0.2, 0.0), root)
clamp = lambda p: (max(-W, min(W, p[0])), max(-W, min(W, p[1])), max(-14, min(0.0, p[2])))
json.dump({k: [[[round(c, 3) for c in clamp(p)] for p in poly] for poly in v] for k, v in G.items()} | {"block": P["block"], "anchors": {"infiltrationEntry": [crack.x, crack.y, 0.0], "cutawayOrigin": [0, CUT, 0.0]}}, open(os.path.join(HERE, "exports", "guides.json"), "w"))

# poster: open front face toward the camera
bpy.ops.object.camera_add(location=(0, -40, 7)); cam = bpy.context.active_object; scene.camera = cam; cam.data.lens = 55
cam.rotation_euler = (Vector((0, CUT, -5.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
for name, loc, e, col in (("Key", (-14, -28, 14), 9000, (1.0, 0.9, 0.7)), ("Fill", (16, -30, 2), 5000, (0.7, 0.8, 1.0))):
    bpy.ops.object.light_add(type="POINT", location=loc); l = bpy.context.active_object; l.name = name; l.data.energy = e; l.data.color = col
world = bpy.data.worlds.new("Dusk"); scene.world = world; world.use_nodes = True; world.node_tree.nodes["Background"].inputs[0].default_value = (0.04, 0.035, 0.03, 1)
scene.render.engine = "BLENDER_EEVEE_NEXT"; scene.render.resolution_x, scene.render.resolution_y = 1280, 720; scene.render.filepath = os.path.join(HERE, "renders", "poster.png")
bpy.ops.object.select_all(action="DESELECT")
def pick(o):
    o.select_set(True)
    for c in o.children: pick(c)
pick(root)
bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "exports", "soil-cutaway.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "source.blend"))
try: bpy.ops.render.render(write_still=True)
except Exception as e: print("poster failed", e)
print("BUILD OK")
