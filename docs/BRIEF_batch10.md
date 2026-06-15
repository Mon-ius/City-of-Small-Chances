# codex task — Batch 10: the book's four canonical districts (tileable PBR surfaces, GPT-Image-2)

You are generating committed **environment surface** assets for a Three.js browser game
(City of Small Chances), a stylised dusk city. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (the *Known gaps* note about the four canonically-named districts),
`docs/BRIEF_batch5.md` (the matching district-kit brief), and the reference pipeline
`tools/gen/postprocess_batch5.sh`** — follow the art direction, palette, naming and technical
standards exactly. Batch 5 covered the *implemented-slice* districts
(`tenements/market_row/dockside/uptown`). **This batch covers the design book's four
*additional canonical* districts** (book §4 "District overview"), so the whole 5-district world
the book promises has surface art: Old Harbour (shipped) + the four below.

These are **opaque, seamlessly-tiling surface materials — NOT cutouts.** There is **no chroma key**
and no transparency. Each surface ships as a glTF-style map set: `_albedo` + `_normal` + `_orm`.

The book's district identities (§4) — communicate **class and opportunity through layout, lighting,
material wear and shop type** (World rule 2); keep them coherent with the shipped warm dusk palette:

| District | Book role | Identity to read in the material |
|---|---|---|
| **East Station** | Transport hub — hostels, delivery jobs, training centres, shift work | Mobility, commuters, time pressure — utilitarian transit grime |
| **Riverside Works** | Industrial/service — warehouses, cleaning, repair, safety risks | Physical labour, injury risk — heavy industry, hazard marking |
| **Glass Mile** | Commercial — offices, retail, clinics, high prices | Career mobility, status pressure — pristine, expensive, cool |
| **South Terrace** | Mixed residential/community — small business, stability | Belonging, endings — warm, cared-for, homely |

## What to make — 4 district kits × 2 surfaces = 8 surfaces (24 PNGs)

Each surface needs three maps: **`_albedo` (base colour, no baked lighting), `_normal`
(tangent-space, OpenGL Y+), `_orm` (packed R=AO, G=roughness, B=metalness)**. Match the harbour /
Batch-5 painterly stylised-realism finish; warm dusk palette; readable but not photoreal. **No
real-world brands, no readable text, no logos** (book World rule 1) — marks must be original/abstract.

### A. East Station (`east_station/`) — transport hub
1. **ENV_EastStation_Concourse** (ground) — worn transit-platform floor: large rubberised/terrazzo
   tiles, faded painted **wayfinding lines** and a tactile edge strip, scuffs, gum stains, foot
   polish. Cool grey with one muted painted accent. Busy-but-tired.
2. **ENV_EastStation_Facade** (wall) — utilitarian transit architecture: ribbed precast concrete
   panels + steel mullions + a louvred vent band, faint soot. Grey concrete + cool steel. (A plain
   tiling wall — do **not** bake in windows; the game adds lit windows via a separate atlas.)

### B. Riverside Works (`riverside_works/`) — industrial / service zone
3. **ENV_RiversideWorks_Yard** (ground) — heavy industrial concrete yard: oil stains, **yellow/black
   hazard striping** at the edge, a drainage channel, tyre scrub, patched repairs. Mid-grey concrete
   + worn hazard paint.
4. **ENV_RiversideWorks_Siding** (wall) — works exterior: **corrugated steel siding** over brick,
   rust streaks, riveted seams, a horizontal pipe run, faded works paint. Weathered steel + brick.

### C. Glass Mile (`glass_mile/`) — high-end commercial district
5. **ENV_GlassMile_Plaza** (ground) — pristine commercial plaza: large pale **polished granite**
   pavers, slim brass inlay lines, crisp grout, faint clean reflections. Light cool stone, upscale,
   almost no grime (status/expense reads through cleanliness).
6. **ENV_GlassMile_Curtainwall** (wall) — sleek office **glass curtain-wall**: tall mullioned
   reflective tinted panels in brushed-metal frames, faint cool sky reflection, spandrel bands.
   Cool blue-grey glass + bright brushed metal — sharper and more pristine than the uptown kit.

### D. South Terrace (`south_terrace/`) — mixed residential / community
7. **ENV_SouthTerrace_Street** (ground) — warm **brick-paved** residential street: herringbone or
   running-bond clay pavers, planted/mossy joints, gentle wear, a worn-but-cared-for feel. Warm
   terracotta/ochre, soft.
8. **ENV_SouthTerrace_Brickfront** (wall) — a terraced small-business frontage: warm **red/ochre
   brick** + a band of painted render + a strip of timber shopfront below, homely and lived-in.
   Warm brick + soft painted wood. (Plain tiling wall — do **not** bake in windows.)

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **No chroma key.** Generate each **albedo** full-bleed at **1024×1024** (GPT-Image-2 floor is
  ~655k px, edges multiples of 16). Fill the frame edge-to-edge with the material, shot **flat
  top-down / face-on**, even diffuse light, **no strong cast shadows, no vignette, no perspective,
  no border** — it must tile.
- Generate only the **albedo**. Derive `_normal` and `_orm` deterministically in post (below).
- **Smoke-test first:** generate **ENV_RiversideWorks_Yard** albedo as your very first action and
  confirm a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest. (The first
  image_gen call sometimes returns a server error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch10/` (gitignored), like prior batches.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
**Reuse the proven `tools/gen/postprocess_batch5.sh` pipeline** (seamless-tile wrap → height→normal
→ AO/roughness/metalness pack). Write a Batch 10 variant `tools/gen/postprocess_batch10.sh` that,
per surface, from the generated albedo:
1. **Make it seamless** (the `seamless()` offset-blend already in batch5) and resize to the shipped
   size **512×512** (env surfaces ship 512; powers of two).
2. Write **`_albedo`** (sRGB, 8-bit), derive **`_normal`** (tangent-space, OpenGL Y+) from
   luminance/height with a per-surface **strength**, and pack **`_orm`** (R=AO from albedo cavity,
   G=roughness, B=metalness) with per-surface constants. Suggested tuning (adjust to taste):
   | surface | strength | roughness(G) | metalness(B) |
   |---|---|---|---|
   | EastStation_Concourse | 2.6 | 170 | 10 |
   | EastStation_Facade | 3.0 | 200 | 40 |
   | RiversideWorks_Yard | 3.4 | 200 | 0 |
   | RiversideWorks_Siding | 4.2 | 150 | 180 |
   | GlassMile_Plaza | 1.6 | 60 | 30 |
   | GlassMile_Curtainwall | 1.8 | 30 | 210 |
   | SouthTerrace_Street | 3.6 | 200 | 0 |
   | SouthTerrace_Brickfront | 3.2 | 210 | 0 |
3. **Optimise** (8-bit, quantise) so each file is small (the harbour/Batch-5 surfaces are
   ~100–400 KB each; stay in that range — keep total Batch 10 payload lean).
Result — file names (match exactly so the orchestrator can wire them), into `assets/textures/<district>/`:
- `assets/textures/east_station/ENV_EastStation_Concourse_{albedo,normal,orm}.png`
- `assets/textures/east_station/ENV_EastStation_Facade_{albedo,normal,orm}.png`
- `assets/textures/riverside_works/ENV_RiversideWorks_Yard_{albedo,normal,orm}.png`
- `assets/textures/riverside_works/ENV_RiversideWorks_Siding_{albedo,normal,orm}.png`
- `assets/textures/glass_mile/ENV_GlassMile_Plaza_{albedo,normal,orm}.png`
- `assets/textures/glass_mile/ENV_GlassMile_Curtainwall_{albedo,normal,orm}.png`
- `assets/textures/south_terrace/ENV_SouthTerrace_Street_{albedo,normal,orm}.png`
- `assets/textures/south_terrace/ENV_SouthTerrace_Brickfront_{albedo,normal,orm}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration (wiring into world.js) is the orchestrator's.
- Post-process only with pre-installed tools (ImageMagick / python3 + Pillow). **No `npm install`,
  no new dependencies.**
- **Tiling is mandatory:** every surface must tile seamlessly — verify each with a 50%-offset test
  (the offset image must show no visible seam).
- Each kit must read as its **book district** (class/opportunity through material) and sit beside the
  harbour + Batch-5 kits as one coherent world.

## Deliverables checklist
- 24 PNGs across `assets/textures/{east_station,riverside_works,glass_mile,south_terrace}/` (names above).
- `tools/gen/prompts/batch10.md` (the exact GPT-Image-2 prompts) and
  `tools/gen/postprocess_batch10.sh` (re-runnable seamless+normal+ORM pipeline).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change any checkbox.

## When done
Print the full list of files you created with sizes, confirm each surface tiles seamlessly
(50%-offset check), and confirm the four kits read as their book districts. Do not run git; the
orchestrator reviews + commits.
