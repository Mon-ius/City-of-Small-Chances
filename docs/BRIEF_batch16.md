# codex task — Batch 16: when the district turns — event & crisis dressing (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**mat-014**), and the chroma-key reference pipeline `tools/gen/postprocess_batch6.sh` /
`postprocess_batch12.sh`** (transparent cutouts). Match the established warm, painterly,
stylised-realism finish.

This batch delivers **mat-014 — district-event dressing** (the *events-crises* milestone): the
transparent overlay/decal pieces that re-dress a district when something happens to it — a
**market-festival** lifts the mood, an **inspection / redevelopment** threatens it, a **flood**
leaves its mark. These are **chroma-key cutouts** (transparent PNGs), shipped ready (like Batches
6/9's signage) — they wire in when the event system lands in the three slice; the live build is still
a calm Old Harbour. **Design intent:** each piece must read its event by silhouette + tone alone
(World rule 2 — and the dignity rule: crisis dressing is sober, never mocking or gory).

## The 6 cutouts (1024×1024 generated, chroma-key) → `assets/sprites/events/`

Generate each on a **flat chroma-key** background (`#00ff00`; use `#ff00ff` for any predominantly
**green** subject) with a clean silhouette, even lighting, no cast shadow on the key, no border.

**Festival (mood lifts):**
1. **DRESS_Festival_Bunting** — a horizontal string of triangular pennant flags / bunting, warm
   mixed harbour colours, gently swagged. Reads "celebration" instantly. (Likely on magenta if the
   flags include greens.)
2. **DRESS_Festival_Lantern** — a single hung paper festival lantern, warm glow, simple cord at top.

**Inspection / redevelopment (threat):**
3. **DRESS_Notice_Inspection** — an official posted placard / notice on a small board or stake — a
   sober municipal inspection/condemnation notice. **Abstract greeked text only — NO readable words,
   numbers, brands or logos** (suggest officialdom with a crest block + ruled lines, like Batch 12's
   paper props).
4. **DRESS_Notice_Hoarding** — a redevelopment site hoarding / boarding panel: plywood-and-batten
   barrier with a faded abstract development render, the "this block is being taken" object.

**Flood aftermath (the mark left):**
5. **DRESS_Flood_TideLine** — a horizontal high-water tide-line / silt stain decal: a dirty
   water-mark band with a soft drip/sediment edge, mostly transparent above and below (a *decal* to
   lay across a wall). Sober, grimy, not gory.
6. **DRESS_Flood_Sandbags** — a low stack of flood-defence sandbags, damp hessian, a few stacked
   rows. The quiet aftermath/response object.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, flat chroma-key background, full subject in frame with margin.
- **Smoke-test first:** generate **DRESS_Flood_Sandbags** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch16/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch16.sh` reusing `postprocess_batch6.sh`/`_batch12.sh`:
strip the chroma key with
`"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
--soft-matte --despill`, then trim → repage → fit on a centred transparent canvas → resize so the
**longest side is 512** (decals like TideLine may be wider than tall — keep aspect, don't force
square) → quantise/optimise. Verify: transparent corners (alpha 0), no green/magenta fringe.

Final names (match exactly) → `assets/sprites/events/`:
- `DRESS_Festival_Bunting.png`, `DRESS_Festival_Lantern.png`
- `DRESS_Notice_Inspection.png`, `DRESS_Notice_Hoarding.png`
- `DRESS_Flood_TideLine.png`, `DRESS_Flood_Sandbags.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands, no logos, no gore.** Crisis dressing stays sober and humane.
- Every final is **RGBA** with verifiably transparent corners and a clean (un-fringed) edge.

## Deliverables checklist
- 6 cutout PNGs (names above), `tools/gen/prompts/batch16.md`, `tools/gen/postprocess_batch16.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each cutout's opaque-coverage / alpha-corner check). Do NOT change
  any checkbox.

## When done
Print every file you created with sizes and confirm transparent corners + clean edges. Do not run
git; the orchestrator reviews and commits.
