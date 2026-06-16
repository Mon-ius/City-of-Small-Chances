# Batch 41 — break the rooftops too: roof variety (ENV_Harbour_RoofSlate + _RoofMetal, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *finish killing the repeated-asset
look on the skyline.* Batch 40 gave the six harbour buildings three different **wall**
materials, but they still all wear the **one** warm clay-tile **roof**
(`ENV_Harbour_Roof`) — so from any raised angle the rooftops read as the same lid copied
six times. Real harbour streets mix roofing: clay pantile, grey slate, and weathered
metal (zinc / lead / corrugated tin over the warehouses). This batch adds **two more
seamless roof surfaces** so the orchestrator can rotate three distinct roofs across the
row. **You (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT run
git.** (The orchestrator wires them into `world.js`.)

## Match the existing harbour-surface style EXACTLY

Look first at the existing roof surface `assets/textures/harbour/ENV_Harbour_Roof_albedo.png`
(the warm clay tile) and `ENV_Harbour_Brick_albedo.png` (Batch 40, for the harbour palette
and even-lit flatness). Each is a **512×512 seamless, tileable, top-down painterly
material** in a muted period-harbour palette, even lighting, **no baked shadows, no single
hero feature** (it must tile across a whole roof). These are seen mostly **from above /
at a raised angle**, so paint them as a flat top-down roofing texture. Match that
resolution, palette, scale and even-lit flatness precisely. **Each must be clearly
DISTINCT** from the warm orange-brown clay tile AND from each other — different material,
different colour family.

## What to make — TWO seamless roof surfaces

1. **`ENV_Harbour_RoofSlate`** — *a cool grey slate-tiled roof.* Rows of overlapping
   **blue-grey / charcoal slate tiles**, rectangular, slightly irregular in tone (some
   tiles darker, some weathered paler), thin shadowed gaps between courses, a little damp
   sheen and lichen. Reads instantly as slate — cool grey where the clay tile is warm
   orange-brown. Regular tile coursing with running-bond offset, **seamless** (courses +
   offset continue across the wrap), even-lit top-down, **no baked directional shadow**,
   **no readable text/numbers**.
2. **`ENV_Harbour_RoofMetal`** — *a weathered metal warehouse roof.* Long **standing-seam
   or corrugated zinc/lead sheets** running in one direction, dull grey with a faint
   blue-green patina, streaks of rust-stain and oxidation, the raised seams catching a
   little light. Reads as old industrial metal roofing — distinct from both tile roofs.
   Parallel seams, **seamless** (the ridges + patina streaks continue across the wrap),
   even-lit top-down, **no baked directional shadow**, **no readable text/numbers**.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate a **square**
top-down tileable roof texture (ask for a seamless, repeating roof texture seen from
above, flat even light, no perspective, no single focal point). Eyeball each for
tileability and scale before finishing. Save the raws to `tools/gen/source_batch41/` as
`ENV_Harbour_RoofSlate_albedo.png` and `ENV_Harbour_RoofMetal_albedo.png`. Write your
prompts to `tools/gen/prompts/batch41.md`. (If an `image_gen` call returns a server error,
just retry — it succeeds on the second attempt.)

## Post-process — two seamless 512² PBR sets (albedo + normal + ORM)

Write `tools/gen/postprocess_batch41.sh` **modelled on `postprocess_batch40.sh`** (reuse
its `seamless()` wrap-blend + edge-enforce, `normal_from_height` from blurred luminance,
and `orm_from_height` — ORM packed R=AO, G=roughness, B=metalness for the glTF convention
Three.js samples). Tuning:
- **RoofSlate**: strength ≈ 2.6 (crisp tile relief), roughness ≈ 170 (slate is fairly
  smooth, a touch of wet sheen), **metalness = 0**, band ≈ 50.
- **RoofMetal**: strength ≈ 2.2 (raised seams), roughness ≈ 130 (semi-gloss patinated
  metal), **metalness ≈ 120** (B channel — this one IS metal, unlike every other harbour
  surface), band ≈ 50.
Output the six maps to **`assets/textures/harbour/`** as
`ENV_Harbour_RoofSlate_{albedo,normal,orm}.png` and
`ENV_Harbour_RoofMetal_{albedo,normal,orm}.png` (8-bit, quantised small, like the other
harbour surfaces). Self-tile each 2×2 (or the script's offset-preview) to confirm no seam.

Verify with Pillow/ImageMagick and report for each: all three are **512×512**, the
albedo's **edge-RMS is low** (seamless, comparable to the Batch-40 surfaces ~1–3), the
normal map is OpenGL-Y+ (B channel dominant, mean ~245–254), the ORM channels match the
tuning above (note RoofMetal's non-zero metalness B≈120 vs RoofSlate's B=0), file sizes,
and a one-line note (RoofSlate reads as cool grey slate, RoofMetal as weathered patinated
metal sheeting — both distinct from the warm clay tile, no legible text).

## Log (no git, no `src/`)

Append **one** Batch 41 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
