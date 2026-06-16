# Batch 40 — a harbour street, not a row of copies: building façade variety (ENV_Harbour_Brick + _StuccoGrey, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *kill the repeated-asset look on the
skyline*. The harbour's six east-side buildings all share the **one** beige plaster body
material (`ENV_Harbour_Plaster`); they vary only by size and window pattern, so the row
reads as the same building copied six times. Real harbour streets mix materials —
brick warehouses, grey lime-rendered houses, plaster fronts. This batch adds **two more
seamless façade surfaces** so the orchestrator can rotate three distinct wall materials
across the row. **You (codex) generate + post-process + log only. Do NOT touch `src/`. Do
NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing harbour-surface style EXACTLY

Look first at the existing façade surface `assets/textures/harbour/ENV_Harbour_Plaster_albedo.png`
(and `ENV_Harbour_QuayWall_albedo.png` for the harbour palette). Each is a **512×512
seamless, tileable, front-lit painterly material** in a muted period-harbour palette,
even lighting, **no baked shadows, no single hero feature** (it must tile across a large
wall). Match that resolution, palette, scale and even-lit flatness precisely so the new
walls sit beside the plaster as one street. **Each must be clearly DISTINCT** from the
beige plaster AND from the grey granite-block quay wall — different material, different
colour family.

## What to make — TWO seamless façade surfaces

1. **`ENV_Harbour_Brick`** — *a weathered harbour-warehouse brick wall.* Courses of
   **warm red-brown / iron-stained brick** with recessed mortar, bricks of slightly
   varied tone (some darker, some salt-bleached), a little soot and damp low down. Reads
   instantly as old brick, warm where the plaster is pale and the quay wall is cold grey.
   Regular brick coursing, **seamless** (courses + the running-bond offset continue across
   the wrap), even-lit, **no baked directional shadow**, **no readable text/numbers**.
2. **`ENV_Harbour_StuccoGrey`** — *a cool grey lime-rendered house wall.* A smooth
   **weathered grey / off-white lime render (stucco)**, flaking in patches to show a hint
   of the rougher wall beneath, faint damp streaks and hairline cracks — the cool, pale,
   rendered counterpart to the warm beige plaster. Mostly smooth (not blocky like the
   quay wall, not bricked), **seamless** (the patchy weathering continues across the
   wrap), even-lit, **no baked directional shadow**, **no readable text/numbers**.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate a **square**
front-lit tileable wall texture (ask for a seamless, repeating wall texture, flat even
light, no perspective, no single focal point). Eyeball each for tileability and scale
before finishing. Save the raws to `tools/gen/source_batch40/` as
`ENV_Harbour_Brick_albedo.png` and `ENV_Harbour_StuccoGrey_albedo.png`. Write your prompts
to `tools/gen/prompts/batch40.md`. (If an `image_gen` call returns a server error, just
retry — it succeeds on the second attempt.)

## Post-process — two seamless 512² PBR sets (albedo + normal + ORM)

Write `tools/gen/postprocess_batch40.sh` **modelled on `postprocess_batch37.sh`** (reuse
its `seamless()` wrap-blend + edge-enforce, `normal_from_height` from blurred luminance,
and `orm_from_height` — ORM packed R=AO, G=roughness, B=metalness for the glTF convention
Three.js samples). Tuning:
- **Brick**: strength ≈ 3.0 (crisp mortar relief), roughness ≈ 200, metalness = 0, band ≈ 50.
- **StuccoGrey**: strength ≈ 1.8 (soft render relief + flake patches), roughness ≈ 195, metalness = 0, band ≈ 50.
Output the six maps to **`assets/textures/harbour/`** as
`ENV_Harbour_Brick_{albedo,normal,orm}.png` and
`ENV_Harbour_StuccoGrey_{albedo,normal,orm}.png` (8-bit, quantised small, like the other
harbour surfaces). Self-tile each 2×2 (or the script's offset-preview) to confirm no seam.

Verify with Pillow/ImageMagick and report for each: all three are **512×512**, the
albedo's **edge-RMS is low** (seamless, comparable to the Batch-37 surface ~1–3), the
normal map is OpenGL-Y+ (B channel dominant, mean ~245–254), the ORM channels match the
tuning above, file sizes, and a one-line note (Brick reads as warm weathered brick,
StuccoGrey as cool grey flaking render — both distinct from the beige plaster and the grey
quay-wall blocks, no legible text).

## Log (no git, no `src/`)

Append **one** Batch 40 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
