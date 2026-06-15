# codex task — Batch 7: interiors & workplaces (tileable PBR surfaces, GPT-Image-2)

You are generating committed **tileable PBR surface kits** for a Three.js browser game
(City of Small Chances), a stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`
and `docs/ASSET_MANIFEST.md` (entries mat-010, mat-011, mat-012)** and follow the art direction,
palette, naming and technical standards exactly. Batches 1–6 are committed under
`assets/textures/`, `assets/sprites/`, `assets/ui/` — keep the same warm, slightly-painterly
stylised-realism world (NOT photoreal).

This batch is the **same kind of work as Batch 5** (district ground/facade kits): opaque,
full-bleed, **seamlessly tiling** painted surfaces, each turned into an **albedo + normal + ORM**
triple. **Re-use the Batch 5 pipeline** — read `tools/gen/postprocess_batch5.sh` and adapt it
into `tools/gen/postprocess_batch7.sh` (same seamless wrap + edge-enforce, height→normal
derivation, ORM pack, and the final PNG8 quantization step). **No transparency / no chroma-key**
this batch (these are surfaces, not cutouts).

## What this batch is FOR

The book's milestones *economy-rent-debt* (a visible **rent ladder** — housing reading from
precarious to stable) and *housing-business* + *jobs-mastery* (per-family **workplace**
environments). The live walkable build is still the Old Harbour exterior only, so — exactly like
Batch 5 — these **ship ready** and wire in when interiors/workplaces become walkable (Batch 7+ of
the gameplay roadmap). Author them so a player would *read the tier / the trade at a glance*.

## What to make — 8 tileable surfaces (each → albedo + normal + orm)

### A. Rent-ladder interior FLOORS (5) — mat-010, read visibly poorer → stabler
1. **ENV_Interior_Shelter** — night-shelter / couch-surf room floor: cold, bare, scuffed old
   concrete-screed or worn grey boards, institutional, a little grime. (poorest rung)
2. **ENV_Interior_SharedRoom** — shared-room floor: cheap scuffed vinyl/lino with mismatched
   worn patches, slightly warmer but tired.
3. **ENV_Interior_Studio** — basic studio floor: plain, clean, pale laminate planks — modest but
   yours.
4. **ENV_Interior_Apartment** — stable apartment floor: warm honey wood floorboards, clean and
   cared-for (a settled home).
5. **ENV_Interior_LiveWork** — live-work unit floor: polished sealed concrete / dark sealed wood
   with a faint workspace sheen (home meets workshop — the top rung).

### B. Workplace surfaces (3) — mat-011, tied to the live job families
6. **ENV_Work_Warehouse** — dock / warehouse floor: sealed industrial concrete with faded painted
   hazard/lane lines and oil staining (for *dock_load* / *harbour_labour*).
7. **ENV_Work_Kitchen** — kitchen-line WALL: cream/white ceramic subway tiles with grout lines and
   a faint greasy sheen near the wok station (for *market_haul* cooking / a noodle kitchen).
8. **ENV_Work_Civic** — civic records-office floor: clean institutional speckled terrazzo / vinyl
   composite, cool and official (for *civic_filing*).

Keep the harbour palette family (warm cinematic, cool stone) so these sit beside Batches 1–6.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Smoke-test first:** generate **ENV_Interior_Shelter**'s base albedo as your very first action and
  confirm a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate each at **1024×1024**.
- Author each so it **tiles** — even, repeating, no single dominant feature, no strong directional
  lighting baked in (the engine lights it). The post-process makes the wrap seamless, but a
  centred hero object will still tile badly, so paint an even field.
- **Do NOT** generate on a chroma-key background (these are opaque surfaces). Full-bleed texture.
- Keep raw generations in `tools/gen/source_batch7/` (gitignored).
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + Pillow via python3)
Adapt `tools/gen/postprocess_batch5.sh` → `tools/gen/postprocess_batch7.sh`:
1. **seamless()** wrap + **enforce_edges** (exact wrap seam) at **512×512**.
2. **normal** from luminance height (OpenGL Y+), per-surface `strength`.
3. **orm** pack R=AO, G=roughness, B=metalness, per-surface roughness/metalness constants.
4. Final **PNG8 quantization** (normal 192 / orm 96 / albedo 224, `png:compression-level=9`).

Suggested per-surface tuning (adjust to taste — softer where polished, sharper where rough):

| stem                    | dir        | strength | roughness | metal |
|-------------------------|------------|----------|-----------|-------|
| ENV_Interior_Shelter    | interiors  | 3.0      | 220       | 0     |
| ENV_Interior_SharedRoom | interiors  | 2.4      | 200       | 10    |
| ENV_Interior_Studio     | interiors  | 2.2      | 170       | 0     |
| ENV_Interior_Apartment  | interiors  | 2.6      | 150       | 0     |
| ENV_Interior_LiveWork   | interiors  | 2.0      | 110       | 25    |
| ENV_Work_Warehouse      | workplaces | 3.2      | 190       | 15    |
| ENV_Work_Kitchen        | workplaces | 3.6      | 90        | 10    |
| ENV_Work_Civic          | workplaces | 1.8      | 150       | 20    |

Result — file names (match exactly), into these paths:
- Interiors → `assets/textures/interiors/<stem>_{albedo,normal,orm}.png`
- Workplaces → `assets/textures/workplaces/<stem>_{albedo,normal,orm}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is the orchestrator's.
- Post-process only with pre-installed tools. **No `npm install`, no new dependencies.**
- All 8 surfaces must tile **seamlessly** (verify with a 50% offset; wrap-seam ≪ interior detail).
- **No readable text, numerals, or logos** baked into the textures (pictorial/material only).
- 512×512, 8-bit, quantised — keep each map small for instant web load.

## Deliverables checklist
- 24 PNGs (8 surfaces × albedo/normal/orm) across `assets/textures/{interiors,workplaces}/`.
- `tools/gen/prompts/batch7.md` and `tools/gen/postprocess_batch7.sh` (re-runnable).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 7 checkbox.

## When done
Print the full list of files you created with sizes, confirm all 8 tile seamlessly (report each
surface's edge_rms), and confirm the rent-ladder reads poorer→stabler. Do not run git; the
orchestrator reviews + commits.
