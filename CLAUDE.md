# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**City of Small Chances** — a grounded urban life game. The live experience is a full-screen, walkable 3D **Old Harbour** in Three.js, backed by a simulation engine (days, jobs, relationships, the Opportunity Web) ported from the game design book. ~6.8k lines of hand-written JavaScript.

The design book (`City_of_Small_Chances_Game_Design_Book.md`) is the source of truth for *intent* — pillars, numbers, the "debugging rule" (every chance must explain why it's locked/open). It is git-ignored (kept out of the public repo). Read it when a feature's *why* is unclear.

## Commands

There is **no build, no bundler, no transpiler, no package.json, no node_modules**. Pure HTML/CSS/ES-modules + a vendored Three.js (`assets/vendor/three/three.module.js`, resolved via the importmap in `index.html`). Do not introduce a build step or npm dependency without explicit instruction — "no build step" is a hard design constraint.

```sh
# Run locally — ES modules need http://, not file://. Any static server works:
python3 -m http.server 8000   # then open http://localhost:8000
```

- **Tests:** none exist. The README's "tested simulation engine" is aspirational — there is no test runner, no `*.test.js`, no CI. Verification is manual, via the debug hash routes (see below) and by playing the build. If asked to "run the tests," say there are none rather than inventing a command.
- **Lint/format:** none configured (no eslint/prettier). Match the surrounding code's style by hand.
- **Deploy:** GitHub Pages serves the repo root of `master` directly (remote `Mon-ius/City-of-Small-Chances`). No `gh-pages` branch, no Actions — pushing to `master` republishes the live site. `.nojekyll` is required (ES-module paths) — never delete it. (Note: the auto-memory's `gh-pages` deploy note refers to a *different*, parallel repo — `city-of-small-chances-3d` — not this one.)

## Architecture — the one thing to understand first

There are **two front doors sharing one set of data tables**, and they are wired to the engine to very different depths:

```
                          ┌─ src/three/   ← LIVE walkable 3D game (index.html loads src/three/main.js)
data tables (src/data/) ──┤
core/time.js ─────────────┤
                          └─ src/main.js + src/ui/ + src/render/   ← RETAINED legacy DOM build (NOT loaded)

core/{state,store,game,save,rng}.js + src/systems/   ← the full sim engine; used ONLY by the legacy build
```

- **`src/three/` is the live game** and currently reads only a **thin slice** of the engine: the content tables (`data/jobs.js`, `data/npcs.js`) and the calendar (`core/time.js`). It keeps its **own lightweight player pocket** (money/energy + its own `jobStatus`/`work` gating) in `src/three/playerstate.js`. It does **not** import `core/game.js`, `core/store.js`, `core/state.js`, `core/save.js`, or anything in `src/systems/`.
- **`src/main.js` + `src/ui/` + `src/render/` is dead in the live app** — `index.html` loads `src/three/main.js`, not `src/main.js`. It is a hash-route debug harness over a hand-rolled **raw WebGL2** renderer (`HarbourRenderer`), retained as reference for the full engine. It will never run unless you point `index.html` back at `src/main.js`.
- **`core/{state,store,game,save,rng}.js` + `src/systems/` is the full, deeper engine** (reactive store, day loop, condition drift, mastery, relationships, reputation, the Opportunity Web). It is exercised **only through the legacy build**. The roadmap's ongoing work is progressively *reading this engine through the walkable world*; v0.1.x has wired in time + jobs + NPCs so far.

**Practical consequence:** before changing anything, know which layer you're in. A gameplay change visible to players lives in `src/three/` (+ the data tables it reads). Deepening the simulation means porting a system from `core`/`systems` into the `three/` slice — not editing the legacy DOM build, which the player never sees. The thin slice and the full engine have **two separate implementations of the same concepts** (e.g. `three/playerstate.js#jobStatus` vs `systems/jobs.js#jobStatus`); changing one does not change the other.

## The live game (`src/three/`)

A plain Three.js frame loop — no ECS, no framework. `main.js` owns the loop and the boot.

- `main.js` — boot (WebGL renderer, scene, player, day cycle) and per-frame `tick()`: drains input, moves the player (camera-relative, clamped to `world.bounds`), animates citizens/markers, advances the clock, and re-scores the open interaction panel when the minute ticks over.
- `world.js` — builds the whole harbour (sky dome, lighting, buildings with lit windows, quay, lamps, stall, boat, notice board, ambient citizen patrol routes) from geometry + materials. Surfaces are textured with **committed PBR maps** (`assets/textures/harbour/`): `surfaceMaterial(object, repeat)` wires albedo + normal + a packed ORM map (R=AO, G=roughness, B=metalness — Three.js reads roughness←G, metalness←B), and `windowAtlasMaterial()` + `windowPlane(cell)` pin each window to one cell of a shared 4×4 atlas (one upload, per-mesh UV remap) with an emissive map glowing the lit panes.
- `daycycle.js` — borrows the `core/time.js` calendar; advances minutes per real second and interpolates keyframed lighting (dawn→night), recolouring sky/fog/lamps and arcing the sun. Loops at midnight (ambient only).
- `player.js` — low-poly figure builder + gait animation, shared by the player and ambient NPCs.
- `playerstate.js` — the player's **pocket**: money, energy, the per-job-family energy-cost formula, `jobStatus()` (gates a shift on time window + energy + `job.requires(...)`), and `work()` (applies pay/energy and returns the result). This is the live game's source of truth for what you can do, separate from `systems/`.
- `input.js` — held keys (WASD/arrows) vs. **edge-triggered one-shot actions** (E, Esc, 1–9), plus pointer-drag camera yaw/pitch. Actions are consumed once, not polled.
- `interactions.js` — `INTERACTABLES` (vendor stall, notice board), the O(n) proximity test, and the panel builders. The board's `boardBuild()` scores every job against the live clock + pocket; `boardAct()` calls `pstate.work()` then `day.setMinutes(...)` to jump the world clock forward by the shift length.
- `ui.js` — the DOM overlay (context `[E]` pill, interaction panel, money + energy HUD). Created once, updated in place.

**Idioms here:** panels are *live-built* on open and re-built each minute (never cached); callbacks receive a `{ nowMin, pstate, day }` context bundle; all time is integer minutes-of-day.

## The simulation engine (`core/` + `systems/` + `data/`)

This is the deeper, more complete model — the part the walkable build is slowly absorbing.

- **`core/`** — `state.js` (the whole game-state shape via `newGameState()`: profile, calendar, 0–100 condition meters, skills, inventory, relationships, reputation, opportunities, ledger, lifetime stats, RNG state, flags, log; also `clamp` + `SAVE_VERSION`), `store.js` (tiny reactive store: one mutable `state`, `subscribe`/`emit`, plus an `on`/`fire` event bus), `time.js` (the shared calendar — `DAY_START_MIN=360`/06:00, `DAY_END_MIN=1440`/24:00, named `BLOCKS`, `fmtClock`, `blockFor`, `advanceClock`, `minutesLeft`), `save.js` (localStorage with additive `migrate()` across save versions), `rng.js` (deterministic mulberry32, seeded from the character).
- **`game.js`** — orchestrator for the *full* engine: owns the Store + RNG, exposes `startNew`/`resume`/`performActivity`/`sleep`, runs the day cycle.
- **`systems/`** — pure-ish functions that turn data tables into runtime numbers + reason strings: `jobs.js` (availability, pay, mastery curve, shift resolution), `opportunities.js` (six-component requirement gates + Hidden→Rumoured→Known→Available→Transformed state machine + plain-language reasons), `relationships.js`, `reputation.js` (per-district, range −40..100), `condition.js` (meter deltas + passive drift), `activities.js`, `travel.js`, `weather.js`.

**Engine conventions:** every system function takes `state` first and **mutates it in place**, then the caller calls `store.emit()` once (mutate-then-emit). `clamp()` everywhere for 0–100 meters. RNG determinism is manual — after using `game.rng`, write `state.rng.state = game.rng.getState()` so saves replay identically. Requirement checks return a uniform descriptor `{ met, known, label, progress, hint, phrase, need }`, and the "debugging rule" means every locked thing must produce a readable reason.

## Data tables (`src/data/`) — where content is authored

Declarative only (ids + human fields + numeric gates/effect objects); the `systems/` and `three/` layers interpret them. To add content, copy an existing entry and adjust:

- `jobs.js` — `JOBS`: `id, name, family, district, windows [[fromMin,toMin]], minutes, requires(state), pay{...}, task{...}, risk, mastery`. Ids: `market_haul`, `harbour_labour`, `dock_load`, `courier_run`, `civic_filing`. (Both the live board and `systems/jobs.js` read this.)
- `npcs.js` — `NPCS`: `id, name, role, icon, colour, blurb, pressure, schedule (district/activity per hour), voice lines per closeness tier, favour`. Ids: `mei`, `jun`, `rafiq`, `tomo`, `clara`, `ava`.
- `opportunities.js` — `OPPORTUNITIES`: `id, title, category, district, requires (six-component array), discover(state), clue(state), reward{line, apply(state, rng)}`.
- `districts.js` — `DISTRICTS`: `id, name, map x/y, water flag, scene seed, activities`. Ids: `tenements`, `market_row`, `old_harbour`, `dockside`, `uptown`.
- `content.js` — character-creation tables (backgrounds, traits, starting skills) + the base `ACTIVITIES`.

**Watch out:** job/NPC `windows` and schedules assume a single day — a window that wraps past midnight (`[[22*60, 2*60]]`) is **not** supported. Money has no clamp (only condition meters do). `discover`/`clue` gates are run in a `safe()` wrapper, so a gate that references a missing id silently hides the chance instead of throwing — a typo'd requirement just makes content vanish rather than error.

## Exercising the retained engine (debug routes)

The full engine's screens are only reachable through the legacy DOM build. To use them, temporarily change `index.html`'s `<script>` to load `./src/main.js`, then append a hash:

- `#debug-city:<minute>:<weather>:<district>` (e.g. `#debug-city:1290:rain:old_harbour`), `#debug-walk`, `#debug-figure`, `#debug-report`
- `#debug-shift:<jobId>` (`:play` to play the rhythm scene, `:auto` to jump to the result)
- `#debug-talk:<npcId>` (`:bonded` to pre-warm, `:act` to auto-play a social action)
- `#debug-people:<district>:<minute>`
- `#debug-web:<preset>` — `mid` / `storm` / `fresh`

These are the closest thing to a test harness for the simulation. They are **inaccessible from the live `src/three/` build.**

## Conventions

- **Commits:** Conventional-Commits prefix + a poetic, em-dashed milestone phrase, e.g. `feat(game): an honest day's work — wallet, energy & working a shift off the board`. Do not add `Co-Authored-By` trailers.
- **Releases:** each milestone is an annotated tag `v0.X.Y` with a narrative name (`v0.1.3 — An honest day's work`), and the README roadmap is updated in the same release. Currently at **v0.1.3**, iterating toward v1.0.0.
- **Art assets (intentional pivot):** the harbour now ships **committed painted PBR textures** under `assets/textures/<district>/`, generated with codex's built-in `image_gen` skill (GPT-Image-2) and post-processed with local ImageMagick into albedo/normal/ORM/emissive maps. The pipeline (prompt specs + post-process scripts) lives in `tools/gen/`; the plan and batch roadmap are in `docs/ART_PLAN.md`. Assets are **curated, not byte-regenerable** (image gen is non-deterministic) — commit the chosen PNGs. Keep them small (8-bit, quantised, powers-of-two) so boot stays fast; **no `npm install`, no new deps** for the toolchain. Figures are still built from geometry.
- **No scrollbar, ever:** the game is full-screen; `styles/game.css` locks the viewport. The HUD overlay is `pointer-events:none` so it never eats world input.
