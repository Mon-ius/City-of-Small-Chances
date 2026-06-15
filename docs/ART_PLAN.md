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
- [x] **Batch A — Audio (procedural Web Audio, NO files)**: a single `src/three/audio.js`
      ES-module synthesising the soundscape at runtime — sea-wash + gull + lamp-hum ambient bed,
      footsteps, coins-on-pay, panel open/close, confirm/deny/select, mute toggle (M). **Expanded:**
      a slow evolving **music bed** (an open A-chord pad — 5 detuned voices through a breathing
      lowpass, shaped by `setTimeOfDay`: bright by day, swelling at the golden hour, dark & sparse
      at night) and **per-work-family shift textures** (`workShift(family)`: labour heaves, a
      delivery wheel-whir + bell, admin paper-riffle + stamps, service sizzle + clinks — each
      ending in the coin payout), wired into the board's work-success path. **0 binary audio bytes.**
      Recorded production music & voice remain deferred (see manifest *Known gaps*).
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
- [x] **Batch 9 — Signage, narrative & key-art** (art slice): 11 assets. 7 bespoke pictorial
      signage cutouts — 4 hanging shop signs (`SIGN_HarbourGate/Tavern/Chandlery/FerryStop`), 2
      weathered wall posters (`POSTER_Harbour/Civic`) + a quay-wall tag (`DECAL_Graffiti`),
      original marks, no real-world brands — and 4 narrative key-art scenes (`KEYART_Act_Dawn/
      Dusk/Storm`, `KEYART_Ending_Settled`, opaque 640×360 paintings of the *same* harbour across
      moods). The 7 signs are **wired live** onto the harbour building façades + quay wall; the 4
      key-art scenes **ship ready** for the act-transition / life-path-ending screens (the
      narrative screen system is later gameplay work). Save/load UI + Steam marketing set remain
      deferred (see *Deferred beyond this plan* — not image-gen-shaped / out of the live game).
- [x] **Batch 10 — the book's four canonical districts** (closing a *Known gaps* item): tileable PBR
      surface kits for the design book's four *additional* canonical districts (§4 "District
      overview") so the whole 5-district world the book promises has art — **East Station** (transit
      hub: grey concourse w/ painted wayfinding lines + ribbed concrete/steel facade), **Riverside
      Works** (industry: hazard-marked concrete yard + corrugated steel-over-brick siding), **Glass
      Mile** (wealth: pristine pale granite plaza + cool mullioned glass curtain-wall), **South
      Terrace** (community: warm herringbone brick street + brick/render/timber shopfront). 8
      surfaces / 24 maps (albedo/normal/orm), seam-checked (RMS 1.1–3.1) with ORM channels matching
      the per-surface tuning. Class/opportunity reads through material (World rule 2): utilitarian
      grey for transit/industry, pristine cool for the rich district, warm brick for the homely one.
      **Ship ready** — like Batch 5/7 these wire in when the districts become walkable (the live
      build is still Old Harbour). Into `assets/textures/{east_station,riverside_works,glass_mile,
      south_terrace}/`.
- [x] **Batch 11 — harbour prop surfaces + the first job-task props** (closing the *optional/low-pri*
      items skipped in Batches 2 & 3): **Group A** = 3 opaque seamless harbour surfaces the live world
      still lacked — **PROP_Harbour_Crate** (planked shipping-crate face w/ metal corner banding +
      cross-braces, `mat-004`), **PROP_Harbour_Barrel** (stave wrap bound by metal hoops, tiles once
      around the circumference, `mat-004`), **ENV_Harbour_Roof** (weathered clay-tile lid, `mat-005`)
      — 9 maps into `assets/textures/harbour/`. **Group B** = 4 chroma-key prop cutouts — the courier
      **PROP_Job_Bicycle** (`spr-007`, the courier job's required possession), **PROP_Job_DeliveryBag**,
      **PROP_Job_Toolkit**, **PROP_Job_HiVis** (safety-orange to dodge the green key) — into
      `assets/sprites/props/` (`spr-004`). **Wired live this batch** (unlike 5/7/10): the crate face
      now dresses every crate cube, the stave wrap every barrel (over its raised metal hoops), the
      clay tile every building roof, and the bicycle stands parked at the notice board — the courier
      possession shown right where the shift is taken (the *debugging rule*: it reads *why* courier is
      open). Verified headless (247 meshes / 62 textures, **0 errors**) + four in-world close-ups.
- [x] **Batch 12 — the paper trail of a life** (economy / Opportunity-Web / starting-kit props,
      `spr-005` + `spr-006`): 8 chroma-key cutouts into `assets/sprites/props/` serving the book's
      central pillar (the Opportunity Web) + economy-rent-debt + character-creation. The economy
      "paper trail" — **PROP_Eco_Receipt** (curled till strip), **PROP_Eco_BillNotice** (envelope +
      slip + red stamp), **PROP_Eco_RouteCard** (transit pass), **PROP_Eco_RentNotice** (formal
      letter w/ crest), **PROP_Eco_ApplicationForm** (clipboard + pen), **PROP_Eco_Manifest** (cargo
      checklist) — plus starting-kit essentials **PROP_Kit_Phone** and **PROP_Kit_StudyBooks**. Every
      document carries **abstract greeked glyph-rows only — no readable text/numbers/brands** (hard
      constraint, verified by eye on the two text-heaviest at full res). **Ship ready** (like 5/7/10):
      these feed the job / opportunity / inventory panels — the UI layer that surfaces them is a
      gameplay feature not yet built, and paper props don't belong strewn in the 3D harbour. All 512²,
      alpha-0 corners, no chroma fringe.
- [x] **Batch 13 — the rooms where you work, mend, wash & learn** (finishing `mat-011` + `mat-013`):
      5 seamless PBR surfaces / 15 maps. The three workplace surfaces Batch 7 left (`mat-011`, into
      `assets/textures/workplaces/` beside Warehouse/Kitchen/Civic) — **ENV_Work_Clinic** (pale calm
      care-desk laminate), **ENV_Work_Repair** (scarred oil-grimed workbench timber), **ENV_Work_
      Laundry** (grouted ceramic tile + soap-worn skirting) — and the training-centre pair (`mat-013`,
      into `assets/textures/training/`) reading two **cost tiers** per World-rule 2: **ENV_Train_
      CourseRoom** (crisp upmarket acoustic/carpet grid, *paid*) vs **ENV_Train_Community** (scuffed
      mismatched municipal lino, *making-do*). Verified 512², seam-checked (codex edge-RMS 0.000;
      diagonal-offset RMS 6.5–22.6, the 22.6 being Laundry's hard tile grid), normals OpenGL Y+
      (B-mean 248–254), ORM channels match the brief tuning exactly. **Ship ready** (like 5/7/10) —
      these wire in when the interiors/training centre become walkable.
- [x] **Batch 14 — how the body feels** (`fx-006`, screen-state condition FX, **WIRED LIVE**):
      3 full-screen vignette overlay cards — **FX_Cond_LowEnergy** (warm amber fatigue),
      **FX_Cond_Burnout** (heavier desaturated grey-green exhaustion, weighted top/bottom),
      **FX_Cond_ColdWet** (cool slate-blue exposure) — each an RGBA card whose alpha is its own
      capped inverse-luminance (clear centre → tinted edge, ceilings 0.50/0.68/0.55) so it never fogs
      the readable centre. **Live:** a `#hud-condition` layer (z 8, below the HUD readouts) in
      `ui.js#createStatsHUD`; `set(money,energy)` deepens LowEnergy below 45 energy and compounds
      Burnout below 22 — a wordless, colour-redundant channel paired with the energy meter (the
      accessibility rule). ColdWet ships dormant behind `setColdWet(t)` for the future weather hook.
      `prefers-reduced-motion` disables the 0.8 s fade. Re-optimised from codex's raw 1024²/3.99 MB to
      blurred-RGB **512²/360 KB total** (these vignettes are intentionally low-frequency — visually
      identical full-screen, ~11× smaller; ImageMagick only). Verified: centres α 0.004/0.027/0.004,
      edges α 0.35–0.52, ceilings respected; live opacity ramp matches the formula (tired 0.15, low
      0.76/0.09, empty 1.0/0.91), z-order keeps the meter crisp, real-game boot creates all 3 layers,
      0 console/page errors. First batch wired **live** since Batch 11.
- [x] **Batch 15 — a business grows, one rung at a time** (`mat-012`, the housing-business milestone):
      4 seamless PBR surfaces / 12 maps for the business-route premises across its four growth stages,
      into `assets/textures/business/`, each visibly out-ranking the last (World-rule 2): **ENV_Biz_
      Stall** (draped weather-faded canvas over rough trestle planks, makeshift weekend stall) →
      **ENV_Biz_Bench** (pegboard-and-timber repair bench, tool-shadow wear, a working trade) →
      **ENV_Biz_Kiosk** (brushed stainless counter + glazed splash-tile, clean regulated food kiosk) →
      **ENV_Biz_Shop** (finished timber-panelled retail wall with shelving reveals + warm plaster, the
      district-recognised shop). Verified 512², codex seam-RMS 0.000 (50%-offset clean by eye), ORM
      channels match the brief tuning exactly (rough/metal 205/5 → 195/20 → 110/70 → 140/10 — the
      kiosk reads metal, the shop cared-for), normals OpenGL Y+ (B-mean 244–253); contact sheet lands
      the makeshift→established climb. 1.36 MB payload. **Ship ready** (like 5/7/10/13) — wires in when
      the business premises become walkable.
- [x] **Batch 16 — when the district turns** (`mat-014`, the events-crises milestone): 6 chroma-key
      cutouts into `assets/sprites/events/` — the transparent overlay pieces that re-dress a district
      when something happens to it, each reading its event by silhouette + tone alone (World-rule 2 +
      the dignity rule — crisis dressing stays sober, never mocking or gory). **Festival (mood lifts):**
      **DRESS_Festival_Bunting** (a warm-coloured swag of pennant flags) + **DRESS_Festival_Lantern**
      (a single hung paper lantern, warm glow). **Inspection / redevelopment (threat):**
      **DRESS_Notice_Inspection** (a sober posted municipal placard — abstract crest block + greeked
      rules, no readable words) + **DRESS_Notice_Hoarding** (a plywood-and-batten redevelopment barrier
      with a faded abstract render). **Flood aftermath (the mark left):** **DRESS_Flood_TideLine** (a
      horizontal high-water silt-stain decal, transparent above/below, to lay across a wall) +
      **DRESS_Flood_Sandbags** (a low stack of damp hessian flood-defence bags). Verified RGBA with
      alpha-0 corners + clean (un-fringed) edges, longest side 512 (aspect kept — wide bunting/tide-line
      strips, tall lantern/notices), opaque coverage 20.9–69.4 %, no readable text/brands/logos/gore;
      contact-over-grey reads each event by silhouette. 491 KB payload. **Ship ready** (like 6/9/12's
      cutouts) — wires in when the event system reaches the three slice; the live build is still a calm
      Old Harbour.
- [x] **Batch 17 — the market's abundance** (`spr-006` + `spr-004`, the everyday-goods milestone) —
      **WIRED LIVE**: 6 chroma-key market-goods cutouts into `assets/sprites/props/` that now dress
      Mei's noodle stall in the walkable harbour — **PROP_Food_NoodleBowl** (a steaming bowl, chopsticks
      across) + **PROP_Market_BasketFruit** (heaped ripe fruit) up on the counter, **PROP_Market_
      HangingWares** (a string of dried chillies/garlic/onions) hung under the awning, and **PROP_Market_
      BasketVeg** (leafy greens) + **PROP_Market_Crate** (a restock crate of root veg + a melon) +
      **PROP_Market_Sacks** (a hessian grain-sack stack, the spr-004 "sacks" item) set on the ground
      beside it. Each is a flat alpha cutout sized to its PNG aspect, added to the stall group so it
      faces +z toward the approaching customer — the same fixed-cutout idiom as the noodle sign and the
      parked courier bike, lightly self-lit so the goods read after dark. Verified headless (homebrew
      chromium/swiftshader): world builds with **0 errors**, the stall group carries exactly **7** plane
      cutouts (Mei's sign + the 6 goods), 253 meshes total (up 6 from Batch 11's 247), all 6 textures
      serve 200; the in-world screenshot reads a busy, abundant market stall — baskets + bowl on the
      counter, dried wares hung at the awning, sacks + crate on the deck — no z-fighting, no distortion.
      Grey-sheet contact confirmed each good reads its subject; no readable text/brands. 1.04 MB payload.
      First live wiring since Batch 14. (spr-004 still partial — scanner/mop&bucket/boots remain; spr-006
      still partial — clothing/bag/utensils/clinic-kit remain.)

**Deferred beyond this plan** (tracked in the manifest's *Known gaps*): the full 12-NPC EA cast
(the book names only 6 majors — all 6 already have portraits + sprites; the other 6 are unnamed,
so there's no book spec to draw), production-grade recorded music & voice, localization fonts
(EN/SC/TC), controller glyphs, and Steam achievement art. *(The book's four additional canonical
districts — previously deferred here — are now covered by Batch 10 above.)*

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
- 2026-06-16: Batch 9 generated with built-in GPT-Image-2 (smoke-tested `SIGN_HarbourGate` first) + the chroma-key cutout / opaque-scene post-process (`postprocess_batch9.sh`); 11 PNGs — 7 signage cutouts (4 hanging signs 256², 2 posters 256×320, 1 graffiti 256²) + 4 opaque key-art scenes (640×360), total payload ≈ 1,208,372 bytes. Verified: all 7 cutouts clean alpha (transparent corners 0.000, no fringe); key-art opaque with moods reading by luma (dawn 40.4 → dusk 29.2 → storm 21.1 → settled 15.5); the 4 scenes are the *same* harbour across moods (consistent lighthouse/lamp/buildings).
- 2026-06-16: Batch 9 wired in — the 7 painted signs dress the live harbour via a `harbourSigns` table in `world.js#buildWorld` (reusing the Batch 6 `cutoutPlane` helper): 4 hanging shop signs stand proud of the building façades (anchor-crest harbour gate by spawn, tavern by the stall, chandlery by the board, ferry-stop down-quay; all face −x toward the street), 2 weathered posters paste near-flush to the walls, and a faint tag sits low on the quay wall. Verified headless with the camera turned to a façade (HarbourGate crest + Civic poster both read; clean alpha, no z-fighting), temp camera edits reverted (main.js diff empty). The 4 key-art scenes ship ready for the act-transition / ending screens. Batch 9 complete — the ART_PLAN art batches (1–9 + audio core) are done.
- 2026-06-16: Batch A audio EXPANSION shipped — `src/three/audio.js` gains a procedural **music bed** (a slow open A-chord pad: 5 detuned voices — A2/E3/A3/B3/E4 — each with its own tremolo + cents-of-detune drift, summed through a lowpass that breathes on a ~40s LFO; `setTimeOfDay` opens it bright by day, swells it at the golden hour, folds it dark & sparse at night, reading the same clock as the light) and **per-work-family shift textures** (`workShift(family)` built from a new `noiseHit` helper + `blip`: labour = 5 rhythmic low heaves with grit; delivery = a wheel-whir into a two-partial bicycle bell; admin = paper riffle + two stamp thunks; service = a sizzle with light clinks — each culminating in the coin payout via a refactored `payAt`). Wired into the success path: `interactions.boardAct` now returns the job `family`, and `main.performAct` calls `audio.workShift(res.family)` instead of the bare `pay()`. Verified headless — isolated audio probe (full API surface, all 4 families + day/evening/night reshape ran with **0 errors**) and a full `index.html` boot driving a real labour shift (`{ok:true, pay:38, family:"labour"}`, no runtime errors, splash dropped). **0 binary audio bytes.** Batch A complete — every ART_PLAN batch (1–9 + audio core & expansion) is now done.
- 2026-06-16: Batch 10 generated with built-in GPT-Image-2 (smoke-tested `ENV_RiversideWorks_Yard` first) + the Batch-5-derived seamless PBR pipeline; 8 canonical-district surfaces for East Station, Riverside Works, Glass Mile, and South Terrace → 24 opaque PNGs (albedo/normal/orm), tile-checked, total payload 2,671,160 bytes.
- 2026-06-16: Batch 10 verified — all 24 maps 512², all 8 albedos tile seamlessly (edge RMS 1.1–3.1, the 3.1 being the riveted steel siding; confirmed visually with 2×2 self-tiles), normals valid (OpenGL Y+, B-up 245–254), and the ORM channels match the brief's per-surface tuning exactly (roughness G 170/200/200/150/60/30/200/210, metalness B 10/40/0/180/30/210/0/0 — the 0.8 KB GlassMile_Plaza ORM is a valid near-uniform flat map). Contact sheet read: each kit reads as its **book district** with class telling through material — utilitarian grey concourse/concrete (East Station), hazard-marked yard + rusted siding (Riverside Works), pristine pale granite + cool mullioned glass (Glass Mile), warm herringbone brick + timber shopfront (South Terrace). No live wiring this batch (like Batch 5/7): the walkable world is still Old Harbour, so the four book districts ship ready for when they become walkable. Batch 10 complete — the book's full 5-district surface set now exists; every district the book names has art.
- 2026-06-16: Batch 11 generated with built-in GPT-Image-2 (smoke-tested `PROP_Harbour_Crate` first) + the combined seamless PBR / chroma-key post-process (`postprocess_batch11.sh`); 3 harbour prop surfaces and 4 job-task prop cutouts → 13 PNGs, Group A tile-checked (50% offset, edge RMS 0.000) and Group B alpha-clean (transparent corners, no green/magenta fringe; orange HiVis), total payload 1,870,773 bytes.
- 2026-06-16: Batch 11 verified + **wired live** — all 9 surface maps 512² with ORM matching the brief (crate rough200/metal30, barrel 195/25, roof 205/0), normals OpenGL Y+ (B-mean 249–252); all 4 cutouts 512² with alpha-0 corners and clean edges (bicycle 16 % opaque thin silhouette, others 61–76 %). Wired into `world.js#buildWorld`: `propMaterial("Crate")` now skins every crate cube, `propMaterial("Barrel")` every barrel body (over the raised metal hoops), a shared `surfaceMaterial("Roof",[4,4])` threaded through `makeBuilding`/`makeBuildingInto` caps every building, and the courier bike (`cutoutPlane`, fixed side-profile — *not* billboarded) is parked at the notice board. Headless boot probe: world built, 247 meshes / 62 unique textures uploaded, **0 errors**; four close-ups read true (clay-tile roofs, plank+X-brace crates, stave+hoop barrels, planted bike). The other 3 cutouts (bag/toolkit/hi-vis) ship ready for the inventory/job-panel UI. Batch 11 complete — Batches 2 & 3's skipped optional surfaces + the first job props now exist *and* are in the live world.
- 2026-06-16: Batch 12 generated with built-in GPT-Image-2 (smoke-tested `PROP_Eco_Receipt` first) + chroma-key post-processing; 8 economy / Opportunity-Web / starting-kit prop cutouts into `assets/sprites/props/`, clean alpha checked on grey + programmatic alpha-corner and chroma-fringe scans (0 residue), no readable text/words/numbers/brands/logos, total payload 1,056,057 bytes.
- 2026-06-16: Batch 12 verified — all 8 cutouts 512² with alpha-0 corners and clean edges (semi-trans 0.7–1.2 %, study-books 6.4 % from the ribbon/page gaps), opaque coverage 39–68 %. The hard *no-readable-text* constraint confirmed by eye at full res on the two text-heaviest (RentNotice = abstract crest block + wavy ink-line body; Receipt = greeked glyph-rows + torn edge) — every "document" is suggestion, never letters. Contact sheet reads true: receipt / bill+envelope+stamp / transit card / crested letter / clipboard+pen / manifest grid / warm-glow phone / worn book stack. **No live wiring** (ship-ready for the job/opportunity/inventory panels). Batch 12 complete — the economy & Opportunity-Web prop vocabulary now exists; spr-005 delivered, spr-006 partial (phone + study books; clothing/bag/food/utensils/baskets/clinic-kit/market-goods still pending).
- 2026-06-16: Batch 13 generated with built-in GPT-Image-2 (smoke-tested `ENV_Work_Repair` first) + the Batch-5-derived seamless opaque PBR pipeline; 5 workplace/training surfaces -> 15 PNGs (albedo/normal/orm), all 50%-offset seam-checked (edge RMS 0.000) with ORM tuning applied, total payload 1,205,364 bytes.
- 2026-06-16: Batch 13 verified — all 15 maps 512², ORM channels match the brief exactly (Clinic rough120/metal10, Repair 200/20, Laundry 95/15, CourseRoom 150/5, Community 185/5), normals OpenGL Y+ (B-mean 248–254). 2×2 self-tile contact sheet reads true: pale calm clinic laminate, warm worn repair bench, off-white grouted laundromat tile, and the training pair lands the cost-tier contrast (crisp professional course-room grid vs scuffed mismatched community lino — class through material). This completes mat-011 (6/6 workplace surfaces) and mat-013 (training centre). **No live wiring** (ship-ready until interiors become walkable). Batch 13 complete — workplace/activity + training environment surfaces now all exist.
- 2026-06-16: Batch 14 generated with built-in GPT-Image-2 (smoke-tested `FX_Cond_LowEnergy` first) + luminance-to-alpha vignette post-processing; 3 full-screen condition-FX RGBA cards into `assets/sprites/fx/` for fx-006, total payload 3,991,783 bytes. Alpha centre/corner: LowEnergy 0.004/0.431, Burnout 0.027/0.584, ColdWet 0.004/0.424.
- 2026-06-16: Batch 14 verified + **WIRED LIVE** (first live wiring since Batch 11). Re-optimised the post-process to blurred-RGB **512²** (the cards are intentionally low-frequency vignettes — heavy RGB blur + downsize is visually identical full-screen but ~11× smaller): committed payload **360 KB total** (123/118/111 KB) vs codex's raw 1024²/3.99 MB. All 3 RGBA, centre α 0.004/0.027/0.004 (clear), edge-mean α 0.35/0.52/0.37, max α ≤ ceiling (0.435/0.600/0.439). Live wiring in `src/three/ui.js#createStatsHUD` (+`styles/game.css`, no `main.js` change — `hud.set` already runs at boot + after each shift): a `#hud-condition` overlay (z 8, below the z-12 HUD readouts, `pointer-events:none`) with 3 `.cond-layer`s; `set(money,energy)` fades LowEnergy in below 45 energy and compounds Burnout below 22; `setColdWet(t)` holds ColdWet dormant for the weather hook; `prefers-reduced-motion` drops the fade. Headless probe (homebrew chromium/swiftshader): overlay exists, 3 layers, opacity ramp matches the formula (full 0/0, tired 0.15/0, low 0.76/0.09, empty 1.0/0.91), `setColdWet(0.6)`→0.6, z-order condition 8 < stats 12, **0 errors**; real `index.html` boot creates `#hud-condition` + all 3 cond-layers alongside the canvas + stats HUD; composite-over-grey contact sheet reads true (warm-amber fatigue / desaturated grey-green burnout / slate-blue cold-wet, all centre-clear). fx-006 complete and **live** — the failing body now reads on-screen.
- 2026-06-16: Batch 15 generated with built-in GPT-Image-2 (smoke-tested `ENV_Biz_Bench` first) + the Batch-13-derived seamless opaque PBR pipeline; 4 business-route premises surfaces (`ENV_Biz_Stall/Bench/Kiosk/Shop`) -> 12 PNGs (albedo/normal/orm) into `assets/textures/business/`, all 512² and tile-checked (edge RMS 0.000), total payload 1,392,672 bytes.
- 2026-06-16: Batch 15 verified — all 12 maps 512², ORM G/B (roughness/metalness) means match the brief tuning exactly (Stall 205/5, Bench 195/20, Kiosk 110/70, Shop 140/10), normals OpenGL Y+ (B-mean 244–253). 2×2 albedo contact sheet reads the four-stage cost-tier climb (World-rule 2): makeshift canvas-over-planks stall → pegboard tool-shadow repair bench → brushed-steel + glazed-tile food kiosk → finished timber-panelled retail shop, each clearly out-ranking the last; 50%-offset on the Shop confirms a seamless tile (no discontinuity, only codex's soft blend band). This completes mat-012 (the housing-business premises). **No live wiring** (ship-ready like 5/7/10/13 until the business premises become walkable). Batch 15 complete — the business-growth surface vocabulary now exists.
- 2026-06-16: Batch 16 generated with built-in GPT-Image-2 (smoke-tested `DRESS_Flood_Sandbags` first, PNG landed in `$CODEX_HOME/generated_images/019ecd6e-9f22-72e2-bbb7-7986d595aa40/`) + chroma-key post-processing; 6 district-event dressing cutouts into `assets/sprites/events/` for mat-014 (festival bunting/lantern, inspection notice/hoarding, flood tide-line/sandbags), total payload 503,183 bytes. Validation: `DRESS_Festival_Bunting` coverage 0.209 / alpha corners 0 / fringe 0; `DRESS_Festival_Lantern` 0.340 / 0 / 0; `DRESS_Notice_Inspection` 0.615 / 0 / 0; `DRESS_Notice_Hoarding` 0.694 / 0 / 0; `DRESS_Flood_TideLine` 0.465 / 0 / 0; `DRESS_Flood_Sandbags` 0.664 / 0 / 0. Visual check on grey confirmed clean edges, no readable text/brands/logos/gore, and sober crisis dressing.
- 2026-06-16: Batch 16 verified — all 6 cutouts RGBA with alpha-0 transparent corners and clean (un-fringed) edges, longest side 512 with aspect preserved (Bunting 512×89, Lantern 241×512, Inspection 290×512, Hoarding 512×276, TideLine 512×101, Sandbags 512×211 — wide decal strips stay wide, tall notices stay tall), opaque coverage 20.9–69.4 %, 491 KB total. 3×2 contact-over-grey (#8a8f96) reads each event by silhouette + tone alone: warm pennant swag + glowing paper lantern (festival lifts the mood), crested-and-greeked municipal placard + plywood redevelopment hoarding (the threat), horizontal silt tide-line decal + damp hessian sandbag stack (the flood's mark) — the two text-bearing notices carry only abstract crest + ruled suggestion, never letters, and the crisis pieces stay sober (no gore, no mockery). This completes mat-014 (the events-crises milestone). **No live wiring** (ship-ready like 6/9/12 until the event system reaches the three slice). Batch 16 complete — the district-event dressing vocabulary now exists.
- 2026-06-16: Batch 17 generated with built-in GPT-Image-2 (smoke-tested `PROP_Market_Sacks` first; PNG landed in `$CODEX_HOME/generated_images/019ecd87-647f-78e1-8a49-72047a9fae7e/`) + chroma-key post-processing; 6 market-stall goods cutouts into `assets/sprites/props/` for spr-004/spr-006 (veg basket, fruit basket, sacks, crate, noodle bowl, hanging wares), total payload 1,061,151 bytes. Validation: `PROP_Market_BasketVeg` coverage 0.634 / alpha corners 0 / fringe 0; `PROP_Market_BasketFruit` 0.618 / 0 / 0; `PROP_Market_Sacks` 0.627 / 0 / 0; `PROP_Market_Crate` 0.671 / 0 / 0; `PROP_Food_NoodleBowl` 0.391 / 0 / 0; `PROP_Market_HangingWares` 0.362 / 0 / 0; visual grey-sheet check confirmed clean edges, no readable text/brands/logos, and warm working-market abundance.
- 2026-06-16: Batch 17 verified + **WIRED LIVE** (first live wiring since Batch 14). All 6 cutouts RGBA, alpha-0 corners, no fringe, longest side 512 with aspect kept (BasketVeg 512×329, BasketFruit 512×356, Sacks 512×254, Crate 512×330, NoodleBowl 512×508, HangingWares 512×468), opaque coverage 0.36–0.67, 1.04 MB total. 3×2 grey-sheet reads each subject — leafy-veg basket, ripe-fruit basket, hessian grain sacks, slatted crate of root veg + melon, steaming noodle bowl with chopsticks, a string of dried chillies/garlic/onions. Wired into `src/three/world.js` (stall block): a 6-row `stallGoods` table builds a `cutoutPlane` per good sized to its PNG aspect and adds it to the existing `stall` group, so each inherits the stall's place and faces +z toward the approaching customer — NoodleBowl + BasketFruit on the counter top, HangingWares hung under the awning, BasketVeg + Sacks + Crate on the deck beside it; lightly self-lit (emissive 0.05–0.18) so they read after dark, no `main.js` change. Headless probe (homebrew chromium/swiftshader, standalone `_probe_b17.html` mirroring the real boot, camera on the customer side): world builds with **0 errors**, the stall group carries exactly **7** PlaneGeometry cutouts (Mei's sign + the 6 goods), 253 meshes total (Batch 11 was 247), all 6 prop URLs serve 200; in-world screenshot reads a busy abundant stall (baskets + bowl on the counter, dried wares at the awning, sacks + crate on the deck) with no z-fighting or distortion. Probe deleted after. This advances spr-006 (noodle-bowl/baskets/market-goods) + spr-004 (sacks); spr-004 (scanner/mop&bucket/boots) and spr-006 (clothing/bag/utensils/clinic-kit) remain partial. Batch 17 complete — Mei's stall is now a stocked market.
