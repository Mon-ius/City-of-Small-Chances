# codex task — Batch 5: district kits (tileable PBR surfaces, GPT-Image-2)

You are generating committed **environment surface** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour city. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (entries mat-006, mat-007, mat-008, mat-009), `src/data/districts.js`,
and the reference pipeline `tools/gen/postprocess_batch1.sh`** (the seamless-tile + normal-map +
ORM-pack pipeline already shipped for the harbour) — follow the art direction, palette, naming,
and technical standards exactly. This extends the **Old Harbour** surface kit
(`assets/textures/harbour/ENV_Harbour_*`) to the other four implemented districts.

These are **opaque, seamlessly-tiling surface materials — NOT cutouts.** There is **no chroma key**
and no transparency. Each surface ships as a glTF-style map set: `_albedo` + `_normal` + `_orm`.

## What to make — 4 district kits × 2 surfaces = 8 surfaces (24 PNGs)

Each surface needs three maps: **`_albedo` (base colour, no baked lighting), `_normal`
(tangent-space, OpenGL Y+), `_orm` (packed R=AO, G=roughness, B=metalness)**. Match the harbour
kit's painterly, stylised-realism finish; warm dusk palette; readable but not photoreal.

### A. The Tenements (`tenements/`) — worn low-rent district (mat-006)
1. **ENV_Tenements_Courtyard** (ground) — worn concrete-and-brick courtyard paving: cracked slabs,
   damp patches, moss in the joints, scattered grime. Cool grey-brown, low value range.
2. **ENV_Tenements_Facade** (wall) — peeling painted render over brick on a stacked apartment
   block: flaking paint, water stains, exposed brick patches. Faded ochre/grey. (A plain tiling
   wall — do **not** bake in windows; the game adds lit windows via a separate atlas.)

### B. Market Row (`market_row/`) — busy market street (mat-007)
3. **ENV_MarketRow_Street** (ground) — wet cobbled market street: rounded setts, oil-stained sheen,
   puddles catching warm light, trodden grime. Dark wet cobble, warm reflections.
4. **ENV_MarketRow_Shopfront** (wall) — layered shopfront: painted timber boards + tiled stall
   base + weathered shutter slats, faded posters. Warm painted wood + ceramic tile.

### C. Dockside Yards (`dockside/`) — working container yard (mat-008)
5. **ENV_Dockside_Yard** (ground) — concrete yard with painted **yellow safety lines**, tyre
   marks, oil stains, expansion joints. Mid-grey concrete + worn yellow paint.
6. **ENV_Dockside_Containers** (wall) — stacked shipping-container flank: ribbed **corrugated
   steel**, painted panels, rust streaks, weld seams, faded cargo paint. Faded blue/red/green steel.

### D. Civic Quarter / uptown (`uptown/`) — clean institutional district (mat-009)
7. **ENV_Uptown_Floor** (ground) — polished civic stone floor: large pale tiles, subtle grey
   veining, faint reflections, grout lines. Light warm stone, clean.
8. **ENV_Uptown_Glass** (wall) — glass office curtain-wall: mullioned reflective tinted panels in
   metal frames, faint sky reflection. Cool blue-grey glass + brushed metal mullions.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **No chroma key.** Generate each **albedo** full-bleed at **1024×1024** (GPT-Image-2 floor is
  ~655k px, edges multiples of 16). Fill the frame edge-to-edge with the material, shot **flat
  top-down / face-on**, even diffuse light, **no strong cast shadows, no vignette, no perspective,
  no border** — it must tile.
- Generate only the **albedo**. Derive `_normal` and `_orm` deterministically in post (below).
- **Smoke-test first:** generate **ENV_Dockside_Yard** albedo as your very first action and confirm
  a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- Keep raw generations in `tools/gen/source_batch5/` (gitignored), like prior batches.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
**Reuse the proven `tools/gen/postprocess_batch1.sh` pipeline** (seamless-tile wrap → height→normal
→ AO/roughness/metalness pack). Write a Batch 5 variant `tools/gen/postprocess_batch5.sh` that, per
surface, from the generated albedo:
1. **Make it seamless** (the `seamless()` offset-blend already in batch1) and resize to the shipped
   size **512×512** (env surfaces ship 512; powers of two).
2. Write **`_albedo`** (sRGB, 8-bit), derive **`_normal`** (tangent-space, OpenGL Y+) from
   luminance/height with a per-surface **strength**, and pack **`_orm`** (R=AO from albedo cavity,
   G=roughness, B=metalness) with per-surface constants. Suggested tuning (adjust to taste):
   | surface | strength | roughness(G) | metalness(B) |
   |---|---|---|---|
   | Tenements_Courtyard | 3.8 | 220 | 0 |
   | Tenements_Facade | 2.6 | 224 | 0 |
   | MarketRow_Street | 4.2 | 150 | 0 |
   | MarketRow_Shopfront | 3.4 | 200 | 10 |
   | Dockside_Yard | 3.2 | 205 | 0 |
   | Dockside_Containers | 4.0 | 150 | 170 |
   | Uptown_Floor | 1.8 | 70 | 20 |
   | Uptown_Glass | 2.0 | 40 | 200 |
3. **Optimise** (8-bit, quantise) so each file is small (the harbour kit's surfaces are ~100–400 KB
   each; stay in that range — keep total Batch 5 payload lean).
Result — file names (match exactly so the orchestrator can wire them), into `assets/textures/<district>/`:
- `assets/textures/tenements/ENV_Tenements_Courtyard_{albedo,normal,orm}.png`
- `assets/textures/tenements/ENV_Tenements_Facade_{albedo,normal,orm}.png`
- `assets/textures/market_row/ENV_MarketRow_Street_{albedo,normal,orm}.png`
- `assets/textures/market_row/ENV_MarketRow_Shopfront_{albedo,normal,orm}.png`
- `assets/textures/dockside/ENV_Dockside_Yard_{albedo,normal,orm}.png`
- `assets/textures/dockside/ENV_Dockside_Containers_{albedo,normal,orm}.png`
- `assets/textures/uptown/ENV_Uptown_Floor_{albedo,normal,orm}.png`
- `assets/textures/uptown/ENV_Uptown_Glass_{albedo,normal,orm}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration (wiring into world.js) is the orchestrator's.
- Post-process only with pre-installed tools (ImageMagick / python3 + Pillow). **No `npm install`,
  no new dependencies.**
- **Tiling is mandatory:** every surface must tile seamlessly — verify each with a 50%-offset test
  (the offset image must show no visible seam).
- Each kit must read as its district and sit beside the harbour kit as one coherent world.

## Deliverables checklist
- 24 PNGs across `assets/textures/{tenements,market_row,dockside,uptown}/` (names above).
- `tools/gen/prompts/batch5.md` (the exact GPT-Image-2 prompts) and
  `tools/gen/postprocess_batch5.sh` (re-runnable seamless+normal+ORM pipeline).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 5 checkbox.

## When done
Print the full list of files you created with sizes, confirm each surface tiles seamlessly
(50%-offset check), and confirm the four kits read as coherent districts. Do not run git; the
orchestrator reviews + commits.
