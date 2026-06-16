# codex task — Batch 20: the things you own (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**spr-006**), and the chroma-key reference pipeline `tools/gen/postprocess_batch18.sh` /
`postprocess_batch17.sh`** (transparent cutouts). Match the established warm, painterly,
stylised-realism finish.

This batch **closes spr-006** — the *starting-kit & activity props*. Batches 12 and 17 already
delivered the phone, study books and the market goods (all dressing Mei's stall LIVE). The **four
remaining** kit items are here: **basic clothing, a small everyday bag, cooking utensils, and a
clinic kit**. These are **chroma-key cutouts** (transparent PNGs). The orchestrator will wire the
**cooking utensils** in beside the existing stall goods (Mei's cooking gear) and keep the other three
**ship-ready** for the character / inventory / clinic panels. **Design intent (World rule 2 — honest,
worn, never luxury):** these are an ordinary working person's possessions — practical, a little
worn, nothing fashionable or new.

## The 4 cutouts (1024×1024 generated, chroma-key) → `assets/sprites/props/`

Generate each on a **flat chroma-key** background (`#00ff00`; use `#ff00ff` for any predominantly
**green** subject) with a clean silhouette, even lighting, **no cast shadow on the key, no border**,
full subject in frame with margin.

1. **PROP_Kit_Clothing** — a **folded set of plain everyday clothes** (a simple shirt + trousers
   neatly folded into a small stack, maybe a worn jacket laid on top). The character's basic
   wardrobe / starting clothes. Muted, practical colours; honest wear; never fashionable. Three-quarter
   view.
2. **PROP_Kit_Bag** — a **small worn canvas everyday shoulder/satchel bag** — the daily carry. This is
   a *personal* bag, clearly **smaller and plainer** than a bulky courier delivery satchel. Soft,
   creased, well-used. Three-quarter view, NO text/logos.
3. **PROP_Kit_Utensils** — **cooking utensils**: a well-used wok or pot with a **ladle and a bundle
   of chopsticks / a spatula** resting in or beside it (Mei's stall cooking gear). Seasoned metal,
   honest grease-darkened wear. Drawn so it reads standing/resting (it will sit among the stall goods).
   Three-quarter view.
4. **PROP_Kit_ClinicKit** — a **small first-aid / clinic kit**: a compact worn medical bag or a tin
   box with a **simple cross motif** (use a plain **red** cross so the green key strips cleanly; the
   cross is a shape only — **NO readable text, NO brand**). The clinic-visit prop. Three-quarter view.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, flat chroma-key background, full subject in frame with margin.
- **Smoke-test first:** generate **PROP_Kit_ClinicKit** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch20/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch20.sh` reusing `postprocess_batch18.sh`/`_batch17.sh`:
strip the chroma key with
`"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
--soft-matte --despill`, then trim → repage → fit on a centred transparent canvas → resize so the
**longest side is 512** (keep aspect) → quantise/optimise. Verify: transparent corners (alpha 0), no
green/magenta fringe.

Final names (match exactly) → `assets/sprites/props/`:
- `PROP_Kit_Clothing.png`, `PROP_Kit_Bag.png`, `PROP_Kit_Utensils.png`, `PROP_Kit_ClinicKit.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands, no logos.** The clinic cross is a plain shape only.
- Every final is **RGBA** with verifiably transparent corners and a clean (un-fringed) edge.

## Deliverables checklist
- 4 cutout PNGs (names above), `tools/gen/prompts/batch20.md`, `tools/gen/postprocess_batch20.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each cutout's opaque-coverage / alpha-corner check). Do NOT change
  any checkbox.

## When done
Print every file you created with sizes and confirm transparent corners + clean edges. Do not run
git; the orchestrator reviews, wires the cooking utensils onto Mei's stall, and commits.
