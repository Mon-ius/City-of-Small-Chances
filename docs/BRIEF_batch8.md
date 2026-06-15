# codex task — Batch 8: UI skin & phone art (GPT-Image-2)

You are generating committed **UI art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md` and `docs/ASSET_MANIFEST.md`
(entries ui-001 … ui-016, and the phone/app references)** and follow the art direction, palette,
naming and technical standards exactly. Batches 1–7 are committed under `assets/textures/`,
`assets/sprites/`, `assets/ui/` — keep the same warm, slightly-painterly stylised-realism world
(NOT photoreal). The existing Batch 4 icon set (`assets/ui/icons/`, `assets/ui/markers/`) is the
style benchmark for the icon work here: painted, warm, readable silhouettes, colour-blind-safe.

This batch dresses the game's **menu / panel / phone UI** with painted *surfaces, frames and
icons* — the **art** of the UI. (Layout & logic stay in DOM/CSS, built later by the orchestrator;
you are NOT designing full-screen mockups.) Two pipelines, both already used in earlier batches:
**(P1)** opaque seamless surface textures (like Batch 7, but **albedo only** — UI is unlit 2D, so
NO normal/orm), and **(P2)** transparent chroma-key cutouts (like Batch 6/Batch 4 icons).

## What to make — 11 assets, three groups

### A. Panel & HUD surface textures (3) — P1, opaque, seamlessly tiling, ALBEDO ONLY
These dress the in-game panels/HUD. Two must stay **dark** so existing light text stays readable.
1. **UI_Panel_Dark** — a **dark** painted panel surface: deep weathered leather / dark oiled wood
   grain, subtle, low-contrast, warm-dark (so light text sits on it cleanly). Tileable.
2. **UI_HUD_Plate** — a **dark** small-scale plate: brushed dark brass / patinated metal, subtle,
   for the corner HUD pills. Tileable.
3. **UI_Panel_Paper** — a **light** aged paper / parchment surface (warm cream, soft fibre, faint
   foxing), for future light-themed screens (end-of-day report, planner). Tileable.
Generate each at **1024×1024**, ship a single seamless **512×512** albedo (no normal/orm).
Even all-over field, no central hero object, no readable text/marks.

### B. Frame & device (2) — P2, transparent chroma-key cutouts
4. **UI_Frame_Ornate** — an ornamental **rectangular border frame** (corners + edges, hollow
   centre) usable as a 9-slice/border-image around panels: warm carved-wood / wrought-iron motif,
   harbour-appropriate, symmetric. Transparent centre + outside. Square ~1024².
5. **UI_Phone_Bezel** — a simple **handset bezel/frame** (rounded device body, blank dark screen
   area) the phone apps sit inside — modest, working-class phone, no brand. Portrait ~768×1024.

### C. Phone app-icon glyphs (6) — P2, transparent chroma-key cutouts, Batch-4 icon style
Painted glyph icons (transparent), one per phone app, matching the Batch 4 icon family. **No
readable text/numerals.** Convey each by motif alone:
6.  **UI_App_Jobs** — work/shifts app: a noticeboard / hard-hat or tools motif.
7.  **UI_App_Map** — district map app: a folded map / location pin motif.
8.  **UI_App_Contacts** — people app: a friendly head-and-shoulders / address-card motif.
9.  **UI_App_Wallet** — money app: a coin-purse / banknote-and-coins motif.
10. **UI_App_Planner** — calendar/planner app: a day-grid / clock-on-a-page motif.
11. **UI_App_Web** — the Opportunity Web app: a connected-nodes / web motif (reuse the Batch 4
    Opportunity-Web visual language).

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Smoke-test first:** generate **UI_Panel_Dark**'s albedo as your very first action and confirm
  a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate at the sizes noted.
- **Transparency (group B/C):** generate on a flat chroma-key background — `#00ff00` (green), or
  `#ff00ff` (magenta) for any subject that is strongly green. Clean even solid fill.
- Keep raw generations in `tools/gen/source_batch8/` (gitignored).
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script + Pillow)
Write `tools/gen/postprocess_batch8.sh` (re-runnable), reusing the earlier pipelines:
- **P1 surfaces** (UI_Panel_Dark, UI_HUD_Plate, UI_Panel_Paper): adapt the **seamless()** wrap +
  **enforce_edges** from `tools/gen/postprocess_batch7.sh` to make each tile at **512×512**, then
  ship **albedo only** (no normal/orm), PNG8-quantised (≤224 colours, compression-level 9).
- **P2 cutouts** (frame, bezel, 6 app icons): adapt `tools/gen/postprocess_batch6.sh` —
  `remove_chroma_key.py … --auto-key border --soft-matte --despill`, then `-trim +repage`, fit
  onto a centred transparent canvas, quantise. Ship sizes: **frame 512×512, bezel 384×512, app
  icons 128×128**. Clean alpha (verify over mid-grey AND white).

Result — file names (match exactly), into these paths:
- Surfaces → `assets/ui/panels/{UI_Panel_Dark,UI_HUD_Plate,UI_Panel_Paper}.png`
- Frame/device → `assets/ui/frames/{UI_Frame_Ornate,UI_Phone_Bezel}.png`
- App icons → `assets/ui/apps/UI_App_{Jobs,Map,Contacts,Wallet,Planner,Web}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is the orchestrator's.
- Post-process only with pre-installed tools. **No `npm install`, no new dependencies.**
- **No readable text, numerals, or logos** anywhere. Pictorial / material only.
- Dark surfaces must stay dark+low-contrast (light text must remain readable on them).
- App icons must read at small size and match the Batch 4 icon family. Clean alpha (no fringe).

## Deliverables checklist
- 11 PNGs across `assets/ui/{panels,frames,apps}/` (names above).
- `tools/gen/prompts/batch8.md` and `tools/gen/postprocess_batch8.sh` (re-runnable).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 8 checkbox.

## When done
Print the full list of files you created with sizes, confirm the 3 surfaces tile seamlessly and
the 8 cutouts have clean transparency on grey + white, and confirm the dark surfaces are dark
enough for light text. Do not run git; the orchestrator reviews + commits.
