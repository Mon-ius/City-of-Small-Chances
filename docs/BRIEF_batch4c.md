# codex task — Batch 4 (part C): systems & wayfinding icons (GPT-Image-2)

You are generating committed **UI icon** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (entries ui-005, ui-006, ui-007), `src/data/jobs.js` and
`src/data/districts.js`** and follow the art direction, palette, naming, and technical standards
exactly. This completes the Batch 4 icon set begun in Batch 4B (`assets/ui/icons/UI_Icon_*.png`) —
**match that set's finish exactly**: clean, bold, lightly painterly flat icons, strong readable
silhouettes, legible at 32–48 px, colour-blind-safe by **shape + value** (never hue alone),
clean on both light and dark, no text/numerals/logos, no baked drop-shadow on the chroma key.

## What to make — 23 icons, four sub-families (keep each family internally consistent)

### A. Job emblems (5) — these go live on the notice board (one per job in `src/data/jobs.js`)
Activity emblems (a tool/action, NOT a place):
1. **market_haul** "Market haulage" (labour) — a hand-truck / sack-barrow stacked with crates.
2. **harbour_labour** "Harbour day labour" (labour) — an anchor crossed with a coil of rope.
3. **dock_load** "Dockside container loading" (labour) — a gantry crane lifting a shipping container.
4. **courier_run** "Bike courier run" (delivery) — a bicycle with a courier satchel.
5. **civic_filing** "Civic records desk" (admin) — a stack of files/folders with a rubber stamp.

### B. District map markers (5) — wayfinding pins, a DISTINCT family from job emblems
Each a **rounded map-pin / teardrop badge** containing a small district motif, so they read as
"place markers", visually distinct from the activity emblems above (one per `src/data/districts.js`):
6. **tenements** "The Tenements" — a worn row-house / apartment block.
7. **market_row** "Market Row" — a market stall with an awning + a noodle bowl.
8. **old_harbour** "Old Harbour" — an anchor / a moored boat.
9. **dockside** "Dockside Yards" — a shipping container / crane hook.
10. **uptown** "Civic Quarter" — a civic building with columns.

### C. Opportunity-Web component icons (6) — ui-005, the six requirement components
Abstract-but-legible emblems for the "why is this chance locked/open" system:
11. **skill** — competence/craft (e.g. a hand + tool, or a rising bar of mastery).
12. **relationship** — a bond between people (two figures / linked hands).
13. **reputation** — how a district regards you (a seal / standing badge / ripple).
14. **possession** — owning the right thing (a key / a held object / a small chest).
15. **timing** — the right moment (a clock / hourglass).
16. **history** — what you've done before (a footprints trail / a ledger / a ring of past).

### D. Skill icons (7) — ui-006, one per skill in `src/core/state.js`
17. **logistics** — routes/planning (a route map / boxes + arrows).
18. **service** — helping a customer (a serving tray / a bell).
19. **maintenance** — fixing things (a wrench + gear).
20. **cooking** — food prep (a chef's knife + pot, or a steaming pan).
21. **communication** — talking/persuading (a speech bubble / two-way chat).
22. **focus** — concentration (an eye on a target / a bullseye).
23. **resilience** — endurance (a shield / a sturdy upright figure / a sprout through stone).

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Transparency:** generate each icon on a flat chroma-key background — `#00ff00` (green); use
  `#ff00ff` (magenta) for any icon that is strongly green. Clean, even, solid fill — no gradient,
  no shadow on the background.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate each at **1024×1024**.
  You MAY generate a family as a single 2×N or 3×N **grid sheet** on one chroma background and slice
  it (efficient + keeps a family coherent) — but the shipped files must be one icon per PNG.
- **Smoke-test first:** generate the **courier_run** job emblem as your very first action and
  confirm a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script)
For each icon, from the generated chroma-key PNG (or slice):
1. **Strip the background**: `python3 "$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py <in> <out> --auto-key border --soft-matte --despill`
2. **Trim** (`magick <out> -trim +repage <out>`), then **fit onto a centred square transparent
   canvas** with even padding — ship **128×128** (`-background none -gravity center -extent 128x128`).
3. **Optimise** (8-bit, quantise) so each file is tiny.
Result — file names (match these exactly so the orchestrator can wire them by id):
- Jobs → `assets/ui/icons/UI_Icon_Job_<jobId>.png` (jobId ∈ market_haul, harbour_labour, dock_load,
  courier_run, civic_filing).
- District markers → `assets/ui/markers/UI_Marker_<districtId>.png` (districtId ∈ tenements,
  market_row, old_harbour, dockside, uptown).
- Opportunity-Web → `assets/ui/icons/UI_Icon_Web_<component>.png` (component ∈ skill, relationship,
  reputation, possession, timing, history).
- Skills → `assets/ui/icons/UI_Icon_Skill_<skill>.png` (skill ∈ logistics, service, maintenance,
  cooking, communication, focus, resilience).

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled by the orchestrator.
- Post-process only with pre-installed tools. **No `npm install`, no new dependencies.**
- Clean alpha edges (no chroma fringe). Verify by compositing over mid-grey AND white.
- Each sub-family must look internally consistent AND sit beside the Batch 4B icons as one system.

## Deliverables checklist
- 23 transparent 128×128 PNGs across `assets/ui/icons/` + `assets/ui/markers/` (names above).
- `tools/gen/prompts/batch4c.md` and `tools/gen/postprocess_batch4c.sh` (re-runnable).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 4 checkbox.

## When done
Print the full list of files you created with sizes, confirm clean transparency, and confirm each
sub-family reads as a coherent set. Do not run git; the orchestrator reviews + commits.
