"""Re-imports exports/soil-cutaway.glb into a fresh scene and checks it and guides.json against parts.json. Exit 1 on failure."""
import bpy, os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); P = json.load(open(os.path.join(HERE, "parts.json")))
bpy.ops.wm.read_factory_settings(use_empty=True); path = os.path.join(HERE, "exports", "soil-cutaway.glb"); bpy.ops.import_scene.gltf(filepath=path)
objs = {o.name.split(".")[0]: o for o in bpy.data.objects}
missing = [n for n in P["nodes"] if n not in objs]; orphans = [o.name for o in bpy.data.objects if o.parent is None and o.name.split(".")[0] != "SoilCutaway"]
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.objects if o.type == "MESH"); size = os.path.getsize(path)
G = json.load(open(os.path.join(HERE, "exports", "guides.json"))); W = P["block"]["width"] / 2; gfail = []
for k, spec in P["guides"].items():
    g = G.get(k, [])
    if len(g) < spec["min"]: gfail.append(f"{k}: {len(g)} curves < {spec['min']}")
    for i, poly in enumerate(g):
        if len(poly) < 4: gfail.append(f"{k}[{i}] has {len(poly)} points")
        if any(abs(p[0]) > W + 1e-6 or abs(p[1]) > W + 1e-6 or p[2] > 1e-6 or p[2] < -14 - 1e-6 for p in poly): gfail.append(f"{k}[{i}] leaves the block")
layers_ok = all(abs(objs[n].dimensions.z - (P["block"]["layers"][n][1] - P["block"]["layers"][n][0])) < 1e-3 for n in P["block"]["layers"] if n in objs)
rep = {"tris": tris, "bytes": size, "missing": missing, "orphans": orphans, "guides": {k: len(G.get(k, [])) for k in P["guides"]}, "guideProblems": gfail, "layerThicknessOk": layers_ok}
json.dump(rep, open(os.path.join(HERE, "exports", "validation.json"), "w"), indent=1); print(json.dumps(rep, indent=1))
fail = []
if missing: fail.append(f"missing {missing}")
if orphans: fail.append(f"unparented {orphans}")
if gfail: fail.append("guides: " + "; ".join(gfail[:5]))
if not layers_ok: fail.append("layer thickness differs from the contract")
if tris > P["budget"]["tris"]: fail.append(f"{tris} tris over budget")
if size > P["budget"]["bytes"]: fail.append(f"{size} bytes over budget")
if fail: print("VALIDATION FAILED:", fail); sys.exit(1)
print("VALIDATION OK")
