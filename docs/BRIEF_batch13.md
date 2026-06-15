# codex task — Batch 13: the rooms where you work, mend, wash & learn (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entries
**mat-011, mat-013**), and the reference pipeline `tools/gen/postprocess_batch5.sh` (seamless
opaque PBR surfaces).** Match the established warm, slightly-painterly, stylised-realism finish.

This batch finishes the **workplace/activity environment surfaces** the book names (mat-011 — three
remain after Batch 7's warehouse/kitchen/civic) and the **training-centre environments** (mat-013).
All are **opaque seamlessly-tiling PBR surfaces** (NO chroma key, NO transparency), each shipped as
`_albedo` + `_normal` + `_orm`, reusing the `postprocess_batch5.sh` pipeline. **Ship ready** (like
Batches 5/7/10): they wire in when those interiors become walkable — the live build is still Old
Harbour. **Design intent (World rule 2 — class/cost reads through material):** the training pair
must read as two cost tiers; the workplaces as their trade.

## Group A — workplace surfaces (3 surfaces / 9 PNGs), 512², into `assets/textures/workplaces/`

Match the existing `ENV_Work_*` kit (Warehouse/Kitchen/Civic). Each is one tiling surface, viewed
flat/face-on, no perspective, no scene props baked in (it's a *material*, not a picture).
1. **ENV_Work_Clinic** (mat-011) — a **clinic / care-desk surface**: pale clean laminate counter or
   sterile wall panel with a faint seam grid, calm and hygienic but warm (not cold-blue). Soft
   eggshell + muted teal trim. Low-wear.
2. **ENV_Work_Repair** (mat-011) — a **repair-bench surface**: a scarred hardwood workbench top,
   tool-shadow grime, faint oil stains, a few old screw holes and saw-marks. Warm worn timber. The
   maker's-trade material.
3. **ENV_Work_Laundry** (mat-011) — a **laundromat surface**: a wall of square ceramic tiles with
   grouted seams over a soap-worn vinyl skirting, slightly damp sheen. Cool off-white + faint mint.

## Group B — training-centre surfaces (2 surfaces / 6 PNGs), 512², into `assets/textures/training/`

The skill-training-cert milestone: two rooms that read **paid tier vs low-cost tier** by material.
4. **ENV_Train_CourseRoom** (mat-013) — a **formal course-room** surface: a quietly upmarket
   interior wall/floor — clean acoustic panel or fine carpet tile with a crisp grid, a hint of warm
   wood trim. Reads *paid, professional, cared-for*. Even, low-wear.
5. **ENV_Train_Community** (mat-013) — a **low-cost community-space** surface: scuffed institutional
   vinyl/lino with mismatched patched tiles, faint stains and chair-scrapes, a tired municipal
   green-grey. Reads *cheap, well-used, making-do* — visibly poorer than the course room.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each albedo **1024×1024** full-bleed, flat / face-on, **no perspective, no vignette, no
  drop shadow, no border** so it tiles.
- **Smoke-test first:** generate **ENV_Work_Repair** albedo as your very first action and confirm a
  PNG lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a
  server error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch13/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch13.sh` reusing `postprocess_batch5.sh`: seamless-tile
→ resize **512×512** → `_albedo` + derived `_normal` (OpenGL Y+) + packed `_orm`
(R=AO,G=roughness,B=metalness). Suggested tuning:
| surface | strength | roughness(G) | metalness(B) |
|---|---|---|---|
| ENV_Work_Clinic | 2.0 | 120 | 10 |
| ENV_Work_Repair | 3.4 | 200 | 20 |
| ENV_Work_Laundry | 2.2 | 95 | 15 |
| ENV_Train_CourseRoom | 2.4 | 150 | 5 |
| ENV_Train_Community | 2.8 | 185 | 5 |

Final names (match exactly):
- `assets/textures/workplaces/ENV_Work_Clinic_{albedo,normal,orm}.png`
- `assets/textures/workplaces/ENV_Work_Repair_{albedo,normal,orm}.png`
- `assets/textures/workplaces/ENV_Work_Laundry_{albedo,normal,orm}.png`
- `assets/textures/training/ENV_Train_CourseRoom_{albedo,normal,orm}.png`
- `assets/textures/training/ENV_Train_Community_{albedo,normal,orm}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands.** Surfaces must tile seamlessly (50%-offset check).

## Deliverables checklist
- 15 surface PNGs (names above), `tools/gen/prompts/batch13.md`, `tools/gen/postprocess_batch13.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size). Do NOT change any checkbox.

## When done
Print every file you created with sizes and confirm each tiles seamlessly. Do not run git; the
orchestrator reviews and commits.
