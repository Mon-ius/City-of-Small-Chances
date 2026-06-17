# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**City of Small Chances** — a grounded urban life game. The live experience is a full-screen, walkable 3D **Old Harbour** in Three.js: a living day/clock, a wallet + energy pocket, jobs worked off a notice board, and NPCs drawn from the game design book's tables. ~3.7k lines of hand-written JavaScript. (An earlier retained "legacy" DOM build over a raw-WebGL2 renderer, plus the deeper unused simulation engine, were **removed** — the walkable `src/three/` build is now the only code path.)

The design book (`City_of_Small_Chances_Game_Design_Book.md`) is the source of truth for *intent* — pillars, numbers, the "debugging rule" (every chance must explain why it's locked/open). It is git-ignored (kept out of the public repo). Read it when a feature's *why* is unclear.

## Commands

There is **no build, no bundler, no transpiler, no package.json, no node_modules**. Pure HTML/CSS/ES-modules + a vendored Three.js (`assets/vendor/three/three.module.js`, resolved via the importmap in `index.html`). Do not introduce a build step or npm dependency without explicit instruction — "no build step" is a hard design constraint.

```sh
# Run locally — ES modules need http://, not file://. Any static server works:
python3 -m http.server 8000   # then open http://localhost:8000
```

- **Tests:** none exist. There is no test runner, no `*.test.js`, no CI. Verification is manual — by playing the build, and by headless-rendering it with Chromium (load `index.html` or a throwaway probe page, read `window.__game`, screenshot). If asked to "run the tests," say there are none rather than inventing a command.
- **Lint/format:** none configured (no eslint/prettier). Match the surrounding code's style by hand.
- **Deploy:** GitHub Pages serves the repo root of `master` directly (remote `Mon-ius/City-of-Small-Chances`). No `gh-pages` branch, no Actions — pushing to `master` republishes the live site. `.nojekyll` is required (ES-module paths) — never delete it. (Note: the auto-memory's `gh-pages` deploy note refers to a *different*, parallel repo — `city-of-small-chances-3d` — not this one.)

## Architecture — the one thing to understand first

There is now **one front door**. `index.html` loads `src/three/main.js`; everything the player sees lives under `src/three/`, reading two data tables and the calendar:

```
                          ┌─ data/jobs.js   ← the notice-board jobs
src/three/  (LIVE game) ──┤─ data/npcs.js   ← the harbour's people (self-contained)
                          └─ core/time.js   ← the shared day/clock calendar
```

- **`src/three/` is the whole game.** A plain Three.js frame loop — no ECS, no framework, no second build. It keeps its **own lightweight player pocket** (money/energy + its own `jobStatus`/`work` gating) in `src/three/playerstate.js`.
- **`data/jobs.js`, `data/npcs.js`** are declarative content tables; **`core/time.js`** is the calendar. That is the entire non-`three/` surface — `npcs.js` carries its own `clamp`, so the live build needs nothing else.
- **What used to be here and is gone:** a parallel "legacy" DOM build (`src/main.js` + `src/ui/` + `src/render/`'s raw-WebGL2 `HarbourRenderer`) and the deeper simulation engine (`core/{state,store,game,save,rng}.js` + `src/systems/` + the `data/{districts,content,opportunities}.js` tables). They were never loaded by `index.html` and have been **deleted**. If you find a reference to any of them, it is stale — remove it.

**Practical consequence:** there is only one layer. A gameplay change lives in `src/three/` (+ the two data tables it reads). Don't go looking for a `systems/` or `store`/`game` engine to wire into — it isn't there any more. If you want a deeper simulation, build it inside the `three/` slice.

## The live game (`src/three/`)

A plain Three.js frame loop — no ECS, no framework. `main.js` owns the loop and the boot.

- `main.js` — boot (WebGL renderer, scene, player, day cycle) and per-frame `tick()`: drains input, moves the player (camera-relative, clamped to `world.bounds`), animates citizens/markers, advances the clock, and re-scores the open interaction panel when the minute ticks over.
- `world.js` — builds the whole harbour (sky dome, lighting, buildings with lit windows, quay, lamps, stall, boat, notice board, ambient citizen patrol routes) from geometry + materials. Surfaces are textured with **committed PBR maps** (`assets/textures/harbour/`): `surfaceMaterial(object, repeat)` wires albedo + normal + a packed ORM map (R=AO, G=roughness, B=metalness — Three.js reads roughness←G, metalness←B), and `windowAtlasMaterial()` + `windowPlane(cell)` pin each window to one cell of a shared 4×4 atlas (one upload, per-mesh UV remap) with an emissive map glowing the lit panes.
- `daycycle.js` — borrows the `core/time.js` calendar; advances minutes per real second and interpolates keyframed lighting (dawn→night), recolouring sky/fog/lamps and arcing the sun. Loops at midnight (ambient only).
- `player.js` — **real-body figure builder** + gait animation, shared by the player and ambient NPCs. Bodies are smooth rounded geometry (`CapsuleGeometry` torso/pelvis/limbs, `SphereGeometry` head/hands, a hair cap, boxed boots) — *not* the old blocky boxes. The **player** (`kind:"player"`) is dressed in codex-generated, seamless PBR character maps (`assets/textures/player/CHAR_Player_{Skin,Coat,Trouser}_{albedo,normal,orm}.png`) via `playerSkin()` (each material falls back to a flat palette colour until its map loads); ambient citizens stay flat palette colour so the hero reads apart from the crowd. The exported contract is `createFigure(kind) → { root, update(dt, speed), … }`.
- `playerstate.js` — the player's **pocket**: money, energy, the per-job-family energy-cost formula, `jobStatus()` (gates a shift on time window + energy + `job.requires(...)`), and `work()` (applies pay/energy and returns the result). This is the live game's only source of truth for what you can do.
- `input.js` — held keys (WASD/arrows) vs. **edge-triggered one-shot actions** (E, Esc, 1–9), plus pointer-drag camera yaw/pitch. Actions are consumed once, not polled.
- `interactions.js` — `INTERACTABLES` (vendor stall, notice board), the O(n) proximity test, and the panel builders. The board's `boardBuild()` scores every job against the live clock + pocket; `boardAct()` calls `pstate.work()` then `day.setMinutes(...)` to jump the world clock forward by the shift length.
- `ui.js` — the DOM overlay (context `[E]` pill, interaction panel, money + energy HUD). Created once, updated in place.

**Idioms here:** panels are *live-built* on open and re-built each minute (never cached); callbacks receive a `{ nowMin, pstate, day }` context bundle; all time is integer minutes-of-day.

## The calendar (`core/time.js`)

The only non-`three/`, non-`data/` module left. The shared day/clock the live build runs on: `DAY_START_MIN=360`/06:00, `DAY_END_MIN=1440`/24:00, named `BLOCKS`, plus `fmtClock`, `blockFor`, `advanceClock`, `minutesLeft`. `src/three/daycycle.js` borrows this calendar to advance minutes per real second and drive the lighting keyframes; `playerstate.js` and `interactions.js` read it for shift windows. All time is integer minutes-of-day.

## Data tables (`src/data/`) — where content is authored

Declarative only (ids + human fields + numeric gates/effect objects); the `three/` layer interprets them. Only **two** tables survive the legacy purge — the rest (`opportunities.js`, `districts.js`, `content.js`) belonged to the deleted engine and are gone. To add content, copy an existing entry and adjust:

- `jobs.js` — `JOBS`: `id, name, family, district, windows [[fromMin,toMin]], minutes, requires(state), pay{...}, task{...}, risk, mastery`. Ids: `market_haul`, `harbour_labour`, `dock_load`, `courier_run`, `civic_filing`. Read by the live notice board (`src/three/interactions.js#boardBuild`); `requires(state)` is passed the live pocket from `playerstate.js`.
- `npcs.js` — `NPCS`: `id, name, role, icon, colour, blurb, pressure, schedule (district/activity per hour), voice lines per closeness tier, favour`. Ids: `mei`, `jun`, `rafiq`, `tomo`, `clara`, `ava`. Carries its **own local `clamp`** (favour rewards) so it needs nothing from the deleted engine.

**Watch out:** job/NPC `windows` and schedules assume a single day — a window that wraps past midnight (`[[22*60, 2*60]]`) is **not** supported. Money has no clamp (only condition meters do).

## Conventions

- **Commits:** Conventional-Commits prefix + a poetic, em-dashed milestone phrase, e.g. `feat(game): an honest day's work — wallet, energy & working a shift off the board`. Do not add `Co-Authored-By` trailers.
- **Releases:** each milestone is an annotated tag `v0.X.Y` with a narrative name (`v0.1.3 — An honest day's work`), and the README roadmap is updated in the same release. Currently at **v0.1.3**, iterating toward v1.0.0.
- **Art assets (intentional pivot):** the harbour now ships **committed painted PBR textures** under `assets/textures/<district>/`, generated with codex's built-in `image_gen` skill (GPT-Image-2) and post-processed with local ImageMagick into albedo/normal/ORM/emissive maps. The pipeline (prompt specs + post-process scripts) lives in `tools/gen/`; the plan and batch roadmap are in `docs/ART_PLAN.md`. Assets are **curated, not byte-regenerable** (image gen is non-deterministic) — commit the chosen PNGs. Keep them small (8-bit, quantised, powers-of-two) so boot stays fast; **no `npm install`, no new deps** for the toolchain. Figure *bodies* are built from geometry (smooth capsules/spheres, not boxes); only the **player** is additionally dressed in codex-generated PBR character maps (`assets/textures/player/CHAR_Player_*`, post-processed by `tools/gen/postprocess_body.sh`).
- **No scrollbar, ever:** the game is full-screen; `styles/game.css` locks the viewport. The HUD overlay is `pointer-events:none` so it never eats world input.
