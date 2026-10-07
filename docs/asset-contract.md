# Blender asset contract

Source of truth: `model/build.py` (deterministic, seeded) and `model/parts.json`.

**soil-cutaway.glb** (110 KB, 5,026 triangles): `SoilCutaway` root with `Topsoil` (0 to -3), `Subsoil` (-3 to -8), `Bedrock` (-8 to -14) boxes 20 wide, six `Rock_n`, three `WaterChannel_n` tubes, three `RootSystem_*` (cereal, legume, brassica) tubes, and three anchors (`Anchor_InfiltrationEntry`, `Anchor_CutawayOrigin`, `Anchor_CrackPoint`). The layers start at the cut face (4 units in from the front) so the roots and channels sit on it like a soil-monolith diagram. Blender Z-up becomes glTF Y-up: depth is negative Y and the cut face looks toward +Z.

**guides.json** (24 KB): `root_cereal` 40, `root_legume` 20, `root_brassica` 20, `mycelium` 16, `water` 3 polylines (x, y, z in Blender axes), the block definition and two anchor points.

**Browser-driven:** material opacity of the layers, visibility of the root system that matches the selected field's crop family, instanced strands from the guides, wet-layer bands, rain.

**Validation** (`model/validate.py`): all 19 contract nodes present, nothing unparented, every guide has at least 4 points and stays inside the block, layer thicknesses match the contract, under 40,000 triangles and 700 KB. Last run: VALIDATION OK.

**Known limits.** The roots and channels are simple swept tubes. The three root architectures are caricatures (fibrous, tap, deep tap) rather than species models. The cut face is flat; no sedimentary texture.
