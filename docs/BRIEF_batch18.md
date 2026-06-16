# codex task — Batch 18: the tools & wheels of work (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entries
**spr-004** and **spr-007**), and the chroma-key reference pipeline `tools/gen/postprocess_batch17.sh`
/ `postprocess_batch11.sh`** (transparent cutouts — note batch 11 made the **courier bicycle** as a
fixed **side-profile** cutout that stands parked in the world). Match the established warm, painterly,
stylised-realism finish.

This batch closes the **job-prop and travel-vehicle milestones**: the remaining **spr-004** job-task
tools (scanner, mop & bucket, steel-toe boots) and the **spr-007** travel vehicles (scooter, tram,
van) — the bicycle is already done (Batch 11, LIVE at the board). These are **chroma-key cutouts**
(transparent PNGs). The **three vehicles must be drawn in clean side profile** (like the Batch-11
bicycle) so they can stand as fixed billboards parked in the walkable harbour — the orchestrator wires
the **scooter** and **van** in beside the courier bike / along the quay (you only generate the art).
**Design intent (World rule 2 — honest working gear, nothing flashy):** these are the worn, practical
tools and vehicles of a working harbour; warm palette, real wear, never luxury, never brand-new
showroom.

## The 6 cutouts (1024×1024 generated, chroma-key) → `assets/sprites/props/`

Generate each on a **flat chroma-key** background (`#00ff00`; use `#ff00ff` for any predominantly
**green** subject) with a clean silhouette, even lighting, **no cast shadow on the key, no border**,
full subject in frame with margin.

**Travel vehicles (side profile — spr-007, for parking in-world):**
1. **PROP_Vehicle_Scooter** — a small delivery scooter/moped in **clean left-facing side profile**, a
   simple delivery box on the back. A courier's step-up from the bike. Worn, practical, warm-toned.
2. **PROP_Vehicle_Van** — a small panel delivery van in **clean left-facing side profile**, plain
   unmarked panels (NO text, NO logos), a working harbour delivery vehicle. Honest, slightly dented.
3. **PROP_Vehicle_Tram** — a single tram / small city bus carriage in **clean left-facing side
   profile**, windowed flank, overhead pole if a tram. Plain livery, **no readable route text or
   numbers, no brands**. The public-transit option.

**Job-task tools (spr-004 — ship-ready for the job/inventory panels):**
4. **PROP_Job_Scanner** — a handheld parcel/barcode scanner (the delivery/warehouse job tool), blank
   screen, no readable display. Three-quarter view.
5. **PROP_Job_MopBucket** — a mop resting in a wheeled wringer bucket (the cleaning/service job tool),
   damp and well-used. Three-quarter view.
6. **PROP_Job_Boots** — a pair of steel-toe work boots (the labour-job safety gear), scuffed leather,
   honest wear. Three-quarter view, set as a pair.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, flat chroma-key background, full subject in frame with margin.
- **Smoke-test first:** generate **PROP_Job_Boots** as your very first action and confirm a PNG lands
  in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server error —
  just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch18/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch18.sh` reusing `postprocess_batch17.sh`/`_batch11.sh`:
strip the chroma key with
`"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
--soft-matte --despill`, then trim → repage → fit on a centred transparent canvas → resize so the
**longest side is 512** (keep aspect — the van/tram are wider than tall, the boots roughly square) →
quantise/optimise. Verify: transparent corners (alpha 0), no green/magenta fringe.

Final names (match exactly) → `assets/sprites/props/`:
- `PROP_Vehicle_Scooter.png`, `PROP_Vehicle_Van.png`, `PROP_Vehicle_Tram.png`
- `PROP_Job_Scanner.png`, `PROP_Job_MopBucket.png`, `PROP_Job_Boots.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands, no logos, no number plates / route numbers.** Suggestion only.
- Every final is **RGBA** with verifiably transparent corners and a clean (un-fringed) edge.
- Vehicles in **clean side profile** so they read parked from the street.

## Deliverables checklist
- 6 cutout PNGs (names above), `tools/gen/prompts/batch18.md`, `tools/gen/postprocess_batch18.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each cutout's opaque-coverage / alpha-corner check). Do NOT change
  any checkbox.

## When done
Print every file you created with sizes and confirm transparent corners + clean edges. Do not run
git; the orchestrator reviews, wires the scooter + van into the live harbour, and commits.
