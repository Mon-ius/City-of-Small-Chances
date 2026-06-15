# Art Plan — City of Small Chances

Durable plan for the art-asset effort. Survives across work sessions/loop iterations.
Read this before generating or integrating any asset.

## Approach

- **Generation: codex's built-in `image_gen` skill (GPT-Image-2).** Preferred mode — needs **no
  `OPENAI_API_KEY`** (routes through codex's backend). codex generates into
  `$CODEX_HOME/generated_images/…` and **moves the chosen finals into this repo's `assets/`**.
  Do **not** use the CLI fallback (`scripts/image_gen.py`) — it needs an API key + network — and
  do **not** downgrade to `gpt-image-1.5` without asking.
- **Post-processing: local ImageMagick / rsvg / python.** GPT-Image-2 gives painterly albedo;
  ImageMagick then makes surfaces tile seamlessly, derives `_normal`/`_orm` maps, builds sprite
  atlases, downscales/optimises, and removes chroma-key backgrounds for transparent cutouts.
- **Transparency:** GPT-Image-2 has no native transparency. Generate cutouts (sprites, icons) on
  a **flat chroma-key** background (`#00ff00`, or `#ff00ff` if the subject is green), then strip
  with `"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
  --soft-matte --despill`.
- **Division of labour.** codex generates + post-processes assets under `assets/` + `tools/gen/`.
  The orchestrator (Claude Code) wires assets into the live game `src/three/`, verifies, commits.
  **codex must not touch `src/`.**
- **Reproducibility.** GPT-Image-2 is non-deterministic, so assets are **curated, not
  byte-regenerable.** Commit: the **prompt specs** (`tools/gen/prompts/*.md`), the
  **post-process scripts** (`tools/gen/*`), and the **chosen PNGs**. The pipeline is reproducible;
  the exact pixels are a curated snapshot.
- **Pillar pivot (intentional).** The project previously shipped *no binary art* (drawn
  procedurally at runtime). We now ship committed PNGs. Update README/CLAUDE.md once Batch 1 lands.

## Art direction (from the design book §23)

> Stylised realism: believable urban people and places with **readable silhouettes**, **warm
> cinematic lighting** and **slightly painterly** texture treatment. Polished and inviting,
> **without AAA photorealism.**

- Mood: a working harbour at **dusk** — warm lamplight against cool stone and water.
- **Colour-blind-safe**: never rely on hue alone for status; pair with shape/value.

### Harbour palette (hex)

| Surface        | dark      | mid       | light     |
|----------------|-----------|-----------|-----------|
| Cobblestone    | `#4a4e54` | `#6b7078` | `#8b9099` |
| Plaster facade | `#6e5f4a` | `#a8967c` | `#c9b79c` |
| Plank wood     | `#5a3f28` | `#7a5a3c` | `#9c7d5a` |
| Harbour water  | `#1f3a3d` | `#3d6b66` | `#b8c9c4` (foam) |
| Warm glow      | lamp `#ffd9a0` · lit window `#ffcf8a` |||
| Sky (dusk)     | zenith `#2a3550` → horizon `#e8a86b` |||

## Technical standards

- **Generate large, ship small:** GPT-Image-2 floor is ~655k px, edges multiples of 16 — generate
  at **1024×1024** (or larger), then downscale to the shipped size.
- **Shipped sizes:** environment surfaces 512×512; props 256×256; UI icons 64/128; sprite sheets
  sized to their frame grid. Powers of two. PNG, 8-bit, optimised/quantised (instant web load).
- **Tiling:** all surface textures must tile **seamlessly** (verify with a 50% offset).
- **Map set per surface (glTF-style, lean):**
  - `_albedo.png` — base colour (no baked lighting/shadow).
  - `_normal.png` — tangent-space, **OpenGL convention (Y+ up)** (derived from albedo/height).
  - `_orm.png` — packed **R=AO, G=roughness, B=metalness** (Three.js reads aoMap/roughnessMap/
    metalnessMap from these channels).
  - `_emissive.png` — only where things glow (lit windows, signs).
- **Naming:** `Category_District_Object[_Variant]_<map>.png`, Category ∈ `ENV` · `PROP` · `CHAR`
  · `UI` · `FX`. e.g. `ENV_Harbour_Cobblestone_albedo.png`.
- **Output paths:** `assets/textures/<district>/…`, `assets/sprites/<set>/…`, `assets/ui/…`.

## Tooling constraints (hard)

- Generation = codex built-in `image_gen` only (no CLI, no API key).
- Post-processing = pre-installed only: ImageMagick (`magick`/`convert`), `rsvg-convert`,
  `python3` (Pillow only if already importable), Node built-ins. **No `npm install`, no new deps.**

## Batch roadmap (aligned to the book's milestones)

> The **full** asset gap — every material, sprite, audio cue, UI element and FX the
> book's milestones imply, with what exists and how it's made — lives in
> [`ASSET_MANIFEST.md`](./ASSET_MANIFEST.md) (98 entries across 10 batches, mapped
> by a multi-agent scan of the design book + codebase). This roadmap is the
> execution order; the manifest is the source of truth for scope.

- [x] **Batch 1 — Old Harbour core surfaces**: cobblestone quay, weathered
      plank wood, aged plaster facade, harbour water, + window atlas (albedo + emissive).
- [x] **Batch 2 — Harbour props**: crates, barrels, mooring bollards, street lamp, stall fabric
      (awning), painted metal, rope, sailcloth. *(+ barrel/roof surfaces still optional.)*
- [~] **Batch A — Audio (procedural Web Audio, NO files)**: a single `src/three/audio.js`
      ES-module synthesising the soundscape at runtime — sea-wash + gull + lamp-hum ambient bed,
      footsteps, coins-on-pay, panel open/close, confirm/deny/select, mute toggle (M). **Core
      shipped**; weather beds, work-family textures, music & voice are deferred (see manifest).
- [x] **Batch 3 — Characters & sprites**: player skin/clothing texture, citizen billboard
      sprite-sheets (chroma-key cutouts), major-NPC clothing textures, job-task + story props.
- [x] **Batch 4 — UI & 2D icons + portraits** (A+B+C): (A) 18 NPC portraits (×3 closeness tiers)
      wired into the interaction panel (Mei live). (B) 11 HUD/status/weather icons (5 condition
      meters + money + 5 weather); money & energy painted in the live HUD. (C) 23 systems &
      wayfinding icons — 5 job emblems, 5 district map-pins, 6 Opportunity-Web component icons, 7
      skill icons. The 5 job emblems are **live** on the notice board (replacing the emoji); the
      markers, web-component and skill icons ship ready for the planner/web/skills screens.
- [x] **Batch 5 — District kits**: tenements, market_row, dockside, uptown/civic — ground + facade
      tileable PBR surfaces (albedo/normal/orm) per district, into `assets/textures/<district>/`.
      8 surfaces (24 maps), seam-checked. **Ship ready** — the walkable build is still Old Harbour
      only, so these wire in when the other districts become walkable (Batch 7+).
- [x] **Batch 6 — Sky & FX**: drifting cloud billboards over the dome (which stays the
      dynamic, day-cycle-painted procedural gradient — the clouds *add to* it, they do
      **not** replace it), rain/fog/heat/puddle weather FX cards, and 5 pictorial
      signage/decals. 13 transparent cutouts. **Live:** clouds drift + tint with the
      hour, Mei's noodle-stall sign hangs on the live stall, and the painted board-notes
      decal overlays the notice board. The 4 weather cards + 3 other signs (chandler,
      harbour-shop, civic) ship ready for the weather system & the other shops (Batch 7+).
- [x] **Batch 7 — Interiors & workplaces (tileable PBR surfaces)**: 8 seamless surface kits
      (24 maps) — a 5-rung **rent ladder** of interior floors (shelter screed → shared lino →
      studio laminate → apartment boards → live-work polish, reading visibly poorer→stabler) +
      3 workplace surfaces tied to the live job families (warehouse concrete, kitchen subway
      tiles, civic terrazzo). Seam-checked (edge_rms ≈ 1.0–1.5). **Ship ready** — the walkable
      world is still Old Harbour exterior, so these wire in when interiors/workplaces become
      walkable. (Business-route premises mat-012 deferred to the gameplay-side interiors work.)
- [x] **Batch 8 — Screen & menu UI systems** (art slice): the painted *skin* of the menu/panel/
      phone UI — 11 assets. 3 seamless surface textures (`UI_Panel_Dark`, `UI_HUD_Plate` — both
      dark for light text; `UI_Panel_Paper` — light), an ornate hollow border `UI_Frame_Ornate`,
      a `UI_Phone_Bezel`, and 6 phone app-icon glyphs (`UI_App_{Jobs,Map,Contacts,Wallet,Planner,
      Web}`) in the Batch-4 icon family. The two dark surfaces are **wired live** (interaction
      panel card + corner HUD/clock chips); the paper surface, frame, bezel and app icons **ship
      ready** for the phone/report/planner screens (DOM/CSS layout is later gameplay work).
- [ ] **Batch 9 — Signage, narrative & store art**: bespoke brand/signage, event/crisis screens,
      ending key-arts + chapter cards, save/load UI, Steam marketing set.

**Deferred beyond this plan** (tracked in the manifest's *Known gaps*): the book's four
*additional* canonical districts, the full 12-NPC EA cast, production-grade recorded music &
voice, localization fonts (EN/SC/TC), controller glyphs, and Steam achievement art.

## Progress log

- 2026-06-15: Batch 1 generated with built-in GPT-Image-2 and ImageMagick/Python post-processing; 14 harbour PNGs, tile-checked, total payload 4,442,460 bytes.
- 2026-06-15: Batch 2 generated with built-in GPT-Image-2 and ImageMagick/Python post-processing; painted metal, awning stripe, sailcloth, and rope prop maps; 12 harbour PNGs, tile-checked, total payload 1,118,287 bytes.
- 2026-06-15: Batch 2 wired into `world.js` (lamps, bollards, awning, boat sail, rope coils, barrels).
- 2026-06-15: Full asset gap mapped by the `asset-gap-scope` multi-agent workflow → `ASSET_MANIFEST.md` (98 entries, 10 batches). Roadmap extended (Batches 7–9 + Audio batch A).
- 2026-06-15: Batch A audio CORE shipped — `src/three/audio.js`, a procedural Web Audio module (sea/gull/lamp ambient bed + footsteps/coins/panel/confirm/deny + mute), wired into the frame loop; **0 binary audio bytes**.
- 2026-06-15: Batch 3 generated with built-in GPT-Image-2 and chroma-key post-processing; 6 citizen billboard cutouts, clean alpha checked on grey, total payload 1,610,379 bytes.
- 2026-06-15: Batch 4 part A generated with built-in GPT-Image-2 and chroma-key post-processing; 18 NPC portrait cutouts, clean alpha checked on grey, total payload 847,992 bytes.
- 2026-06-15: Batch 4 part A wired in — reusable `data.portrait` support added to the interaction panel (`ui.js` + `.panel__head`/`.panel__portrait` CSS); Mei's stall now shows her stranger-tier portrait beside her voice line. Other 5 NPCs' portraits ship ready for future walk-up/contacts screens.
- 2026-06-15: Batch 4 part B generated with built-in GPT-Image-2 and chroma-key post-processing; 11 HUD/status/weather icon cutouts, clean alpha checked on grey/white, total payload 106,873 bytes.
- 2026-06-15: Batch 4 part B wired in — painted Money + Energy icons replace the 💴/⚡ emoji in the live corner HUD (`ui.js` + `.hud-stat__img` CSS); the 5 condition-meter + 5 weather icons ship ready for the report/weather widgets.
- 2026-06-16: Batch 4 part C generated with built-in GPT-Image-2 and chroma-key post-processing; 23 systems & wayfinding icons in four coherent sub-families (5 job emblems, 5 district map-pins, 6 Opportunity-Web components, 7 skill icons), 128×128, clean alpha checked on grey/white + a programmatic chroma-fringe scan (0 residue), total payload 252,065 bytes.
- 2026-06-16: Batch 4 part C wired in — the 5 painted job emblems now lead each row of the live notice board (replacing the emoji): `interactions.js` supplies an `iconImg` per job, `ui.js#renderItem` renders an optional `<img class="panel__item-icon">` on both open and locked rows, with `.panel__item-icon` + a `.panel__row-text` column in `game.css`. The district markers, Opportunity-Web and skill icons ship ready for the planner/web/skills screens. Batch 4 complete.
- 2026-06-16: Batch 5 generated with built-in GPT-Image-2 and ImageMagick/Python post-processing; 8 district-kit surfaces for tenements, market_row, dockside, and uptown, 24 PNGs, tile-checked, total payload 2,720,091 bytes.
- 2026-06-16: Batch 5 verified — all 8 albedos tile seamlessly (wrap-seam ≪ interior detail after PNG8 quantization), normals clean (no banding at ~190 colours), each kit reads as its district beside the harbour set. No live wiring this batch: the walkable world is Old Harbour only, so the kits ship ready for when the other districts become walkable. Batch 5 complete.
- 2026-06-16: Batch 6 generated with built-in GPT-Image-2 and chroma-key post-processing; 13 transparent cutouts (4 sky clouds, 4 weather FX cards, 5 pictorial signage/decals), clean alpha checked on grey/white + a programmatic chroma-fringe scan (0 residue), clouds confirmed neutral/light & tintable, total payload 1,342,076 bytes.
- 2026-06-16: Batch 6 wired in — drifting cloud billboards added *over* the procedural sky dome (`world.js#buildClouds` + `tintClouds`, driven each minute by `daycycle.js`, drifted + camera-billboarded in `main.js`): bright near-white at noon, warm at dusk, sunk into the night sky after dark — the dynamic dome is untouched. Mei's painted noodle-stall sign now hangs on the live stall and the painted board-notes decal overlays the notice board (both via a new `cutoutPlane` helper). Verified headless at noon + dusk and with prop close-ups. The 4 weather cards + 3 other signs ship ready. Batch 6 complete.
- 2026-06-16: Batch 7 generated with built-in GPT-Image-2 and the (Batch-5-derived) ImageMagick/Python PBR pipeline; 8 tileable interior/workplace surfaces → 24 PNGs (albedo/normal/orm), total payload 1,957,974 bytes.
- 2026-06-16: Batch 7 verified — all 8 albedos tile seamlessly (wrap-seam edge_rms ≈ 1.0–1.5, no visible seam in a 2×2 tile), the rent ladder reads poorer→stabler (cold grey screed → tan lino → pale laminate → warm honey boards → dark polished live-work), and the 3 workplaces read their trades (warehouse / kitchen tiles / civic terrazzo). The near-uniform ORMs (studio/civic/shared ≈ 0.3–0.4 KB) are valid flat smooth-surface maps. No live wiring this batch: the walkable world is Old Harbour exterior, so the kits ship ready for when interiors/workplaces become walkable. Batch 7 complete.
- 2026-06-16: Batch 8 generated with built-in GPT-Image-2 (smoke-tested `UI_Panel_Dark` first) + the seamless/chroma post-process (`postprocess_batch8.sh`); 11 UI-skin PNGs — 3 opaque seamless surfaces (512²) + an ornate frame (512²) + a phone bezel (384×512) + 6 app-icon glyphs (128²), total payload ≈ 493,954 bytes. Verified: dark surfaces mean-luma 16.7 / 20.2 (light text safe), paper 80.4; all 3 surfaces seamless (wrap-seam mean 0.6–1.3/255); frame hollow centre (α 0.000) with opaque border; all 8 cutouts clean alpha (transparent corners 0.000, no fringe); icons warm (R>G>B, mean-sat 0.27–0.45).
- 2026-06-16: Batch 8 wired in — the two dark painted surfaces dress the live DOM UI (CSS only, no text-colour change): `UI_Panel_Dark` (oiled-wood grain under a near-opaque cool-dark wash) backs the interaction-panel card behind its accent border, and `UI_HUD_Plate` (patinated metal) backs the corner money/energy/mute chips + the top-right clock as solid HUD plates; the mute button now shares the plate (dropped its inline background override in `ui.js`). Verified headless on the QA harness and over the live harbour. Paper surface, ornate frame, phone bezel and 6 app icons ship ready for the phone/report/planner screens. Batch 8 complete.
