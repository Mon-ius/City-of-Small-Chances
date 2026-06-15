# codex task — Batch 11: harbour prop surfaces + job-task prop cutouts (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entries
**mat-004, mat-005, spr-004, spr-007**), and BOTH reference pipelines —
`tools/gen/postprocess_batch5.sh` (seamless opaque PBR surfaces) and
`tools/gen/postprocess_batch6.sh` (chroma-key transparent cutouts).** Match the established warm,
slightly-painterly, stylised-realism finish and the harbour palette. This batch finishes the
*optional/low-pri* items skipped in Batches 2 & 3: the crate/barrel/roof surfaces the live harbour
still lacks, and the first job-task / possession props.

**Two groups, two pipelines:**
- **Group A** = opaque **seamlessly-tiling surface materials** (NO chroma key, NO transparency),
  each shipped as `_albedo` + `_normal` + `_orm`. Reuse the `postprocess_batch5.sh` pipeline.
- **Group B** = **chroma-key transparent cutout props**. Reuse the `postprocess_batch6.sh`
  chroma-key strip pipeline. Single transparent PNG each.

## Group A — harbour surface completions (3 surfaces / 9 PNGs), 512², into `assets/textures/harbour/`

These wire onto live geometry, so they must tile and read at small scale.
1. **PROP_Harbour_Crate** (mat-004) — a wooden **shipping-crate face**: horizontal planks, **metal
   corner banding + cross-braces**, a faded stencilled cargo mark (abstract shapes only — **no
   readable text/letters/numbers**, no brands). Warm plank wood + dark banded metal. Tiles on a
   cube (all six faces share it).
2. **PROP_Harbour_Barrel** (mat-004) — a **barrel-stave wrap**: vertical slightly-curved wooden
   staves bound by two horizontal **metal hoops**, aged. Must **tile horizontally seamlessly** (it
   wraps a cylinder around its circumference). Warm wood + dark hoops.
3. **ENV_Harbour_Roof** (mat-005) — a **pitched roof surface** for the harbour buildings: rows of
   weathered **clay tiles** (or tarred battens), gentle moss/soot, viewed flat top-down. Muted
   warm terracotta-grey. Must tile seamlessly in both axes.

## Group B — job-task / possession prop cutouts (4 cutouts / 4 PNGs), into `assets/sprites/props/`

Single objects, **centred**, full-bleed on a **flat chroma-key background** (`#00ff00` green; use
`#ff00ff` magenta if the subject is itself green/yellow-green), even diffuse light, a soft contact
shadow is fine but **no busy scene**. These ship as transparent billboards/icons (the book's
job-task props + Opportunity-Web *possessions*). Painterly, readable silhouette.
4. **PROP_Job_Bicycle** (spr-004 / spr-007) — a **delivery bicycle** with a front basket/rack, side
   profile. (This is the courier job's required possession — make it read as *the* bike.) Magenta
   key if you paint it green.
5. **PROP_Job_DeliveryBag** (spr-004) — a **courier's delivery satchel / insulated bag**, worn
   canvas, a strap, a blank flap (no logo/text).
6. **PROP_Job_Toolkit** (spr-004) — an **open toolbox** with a few hand tools (wrench, screwdriver,
   pliers) — the repair/maintenance trade.
7. **PROP_Job_HiVis** (spr-004) — a **hi-vis safety vest + hard hat**, dock/warehouse gear. Paint
   the vest **safety orange** (not yellow-green) so it doesn't clash with the green key; reflective
   strips. (If you must paint it yellow-green, key on magenta instead.)

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate large (Group A albedos **1024×1024** full-bleed flat/face-on, no perspective/shadow/
  border so they tile; Group B props **1024×1024** centred on the flat key colour).
- **Smoke-test first:** generate **PROP_Harbour_Crate** albedo (opaque, no key) as your very first
  action and confirm a PNG lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call
  sometimes returns a server error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch11/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch11.sh` doing **both** pipelines:
- **Group A** (reuse `postprocess_batch5.sh`): seamless-tile → resize **512×512** → `_albedo` +
  derived `_normal` (OpenGL Y+) + packed `_orm` (R=AO,G=roughness,B=metalness). Suggested tuning:
  | surface | strength | roughness(G) | metalness(B) |
  |---|---|---|---|
  | PROP_Harbour_Crate | 3.4 | 200 | 30 |
  | PROP_Harbour_Barrel | 3.2 | 195 | 25 |
  | ENV_Harbour_Roof | 3.6 | 205 | 0 |
- **Group B** (reuse `postprocess_batch6.sh`): strip the chroma key with
  `"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
  --soft-matte --despill`, trim + `+repage`, fit each centred on a transparent square canvas, then
  resize to **512×512** and quantise (8-bit). Verify transparent corners (alpha 0) and no green/
  magenta fringe.

Final names (match exactly):
- `assets/textures/harbour/PROP_Harbour_Crate_{albedo,normal,orm}.png`
- `assets/textures/harbour/PROP_Harbour_Barrel_{albedo,normal,orm}.png`
- `assets/textures/harbour/ENV_Harbour_Roof_{albedo,normal,orm}.png`
- `assets/sprites/props/PROP_Job_Bicycle.png`
- `assets/sprites/props/PROP_Job_DeliveryBag.png`
- `assets/sprites/props/PROP_Job_Toolkit.png`
- `assets/sprites/props/PROP_Job_HiVis.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Wiring into world.js is the orchestrator's job.
- Pre-installed tools only. **No `npm install`, no new deps.** **No readable text, no real brands.**
- Group A must tile seamlessly (50%-offset check). Group B must have clean transparent edges.

## Deliverables checklist
- 9 surface PNGs + 4 prop cutouts (names above), `tools/gen/prompts/batch11.md`,
  `tools/gen/postprocess_batch11.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size). Do NOT change any checkbox.

## When done
Print the files you created with sizes, confirm Group A tiles seamlessly and Group B has clean
alpha. Do not run git; the orchestrator reviews, wires Group A into world.js, and commits.
