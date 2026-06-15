# City of Small Chances

A grounded urban **life game** about building a stable life under economic pressure. You arrive in **Haiyun City** with little money and an obligation that won't wait. Now you don't read about the harbour — you **walk it**, in full-screen 3D, and decide what kind of life is worth protecting.

> Every day matters. You work, rest, train, connect and survive long enough to choose your future.

Built in **pure HTML, CSS and vanilla JavaScript with [Three.js](https://threejs.org/)** (vendored locally) — no frameworks, no bundler, no build step. It runs anywhere static files can be served.

**▶ Play:** https://mon-ius.github.io/City-of-Small-Chances/

---

## About

This is a web adaptation of the *City of Small Chances* game design book. The tested simulation engine — days, jobs, relationships, the Opportunity Web — drives the world; the front door is now a **walkable 3D city** you move through, not a panel you scroll.

### Design pillars (from the book)

- **Pressure with dignity** — hard, but never humiliating.
- **Traceable opportunity** — you can always see *why* a chance appeared or vanished.
- **Human economy** — relationships materially change work, housing and morale.
- **Multiple valid lives** — security, freedom, connection, respect or wealth.
- **Mastery without grind** — manual work compresses once you've proven competence.

## Current build — v0.1.0 · *Step into the harbour*

The experience is now a **game, not a dashboard**. The front door is a full-screen, walkable **Old Harbour** rendered in Three.js — no scrollbars, no UI panels between you and the world.

- **Walk the quay in 3D** — a third-person character you steer with **WASD / arrows**, behind an orbiting follow camera you aim by **dragging**. Movement is camera-relative and clamped to the playable street.
- **A harbour that feels lived-in** — a cobbled quayside under a graded dawn sky and a warm low sun with soft shadows and distance fog: a row of inhabited buildings with lit windows, street lamps, a market stall, crates, mooring bollards, a boat out on the water, and **ambient citizens** patrolling the street with a real walk cycle.
- **Built to load instantly** — the whole scene is geometry + materials (no binary art over the network), Three.js is vendored same-origin, and there is no build step. It boots straight to the world behind a brief splash.
- **The simulation is retained** — the v0.0.1–v0.0.7 engine (day loop, condition, jobs & mastery, NPCs & relationships, the Opportunity Web) is kept intact as a tested core and will be wired into the walkable world in the milestones ahead.

### Earlier milestones — the simulation core

The game's central promise — **chances are never luck** — was built across v0.0.1–v0.0.7. Open the **Opportunity Web** and every prospect in the city is laid out with the exact things it would take — and *why* it's where it is.

- **Six requirement components, all legible** — each chance is gated on some mix of a **Skill**, a **Relationship**, a district **Reputation**, a **Possession**, the **Timing** (weather + hour), and your own **History**. Every requirement shows a tick or a gap, a progress bar, and a plain hint on how to close it — the recommended skill path, who you'd need to befriend, how to get the gear (buy or rent), the window it opens in.
- **A chance's whole life, visible** — opportunities move through honest states: **Hidden** → **Rumoured** (you've caught wind, but not the specifics) → **Known** (you see what it takes, but you're short) → **Available** → **Yours now**. A chance, once glimpsed, never un-discovers itself.
- **The debugging rule, kept** — the book insists nothing here is opaque, so every card carries a one-line reason: *"Available because you've got Logistics 24, a bicycle, Jun's trust (bond 42) and 3 shifts worked."* Lock one and it tells you exactly what's still missing.
- **Reputation you build by showing up** — clean shifts and lending a hand quietly raise your name in a district; sloppy work and injuries dent it. It's tracked per-district and feeds the Web's reputation gates — and the day log always says why it moved.
- **Real chances to take** — a standing courier route from Jun, a regular's spot on the dockside gang, an apprenticeship with Tomo, a seat at the tenants' table, a foot in the clinic door — and a **repeatable storm-surge run** that opens only when the rain comes down after dark. Taking one applies a tangible reward and becomes part of your life.

Built on the v0.0.6 **relationship system** — six scheduled characters with trust/respect/affection/debt/conflict, a "People here" panel, conversations and favours with material payoffs.

…the v0.0.5 **work-mastery framework** — a district **work board** and an in-world **work-rhythm shift scene** whose quality drives pay, skill growth and a mastery curve (pattern-preview → auto-resolve).

…the v0.0.4 **city of districts** — a node-graph **map** with **walk / cycle / tram** travel (real time & fare, weather-scaled), five seeded 3D places, and district-gated activities.

…the v0.0.3 **inhabited 3D world** in raw **WebGL2** (no Three.js, no libraries):

- **Walkable box avatar** + third-person **follow camera** (press **C**), and a **sprite-billboard crowd** of citizens lining the streets.

…and the v0.0.2 **3D harbour**, lit live by the simulation:

- **3D city viewport** — a street of modular buildings on a quay, water on both sides, props and roofs.
- **Time-of-day lighting** — a sun that arcs from dawn to dusk; windows glow warm at night.
- **Weather in the world** — rain and storms thicken the fog and dim the light; the harbour fades into mist.
- Original, **procedurally-generated textures** (asphalt, weathered facades, lit windows, water with a moving specular) baked on a canvas — no binary assets.

Plus everything from v0.0.1:

- Title screen, character creation (background obligation, trait, starting skill).
- A living **day loop**: clock, daily weather, time-costed activities (rest, cook, eat out, walk, day labour, ask around).
- **Condition system** — energy, hunger, stress, health, hope, with fair, readable drift.
- **Economy seed** — starting money and a campaign obligation/deadline.
- **End-of-day report** and **save/load** with autosave.

See the [roadmap](#roadmap) for what each tagged release adds.

## Run locally

ES modules require a server (not `file://`):

```sh
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project layout

```
index.html                  full-screen game entry (canvas + importmap + HUD + boot splash)
styles/game.css             game shell stylesheet — locks the viewport, no scrollbar ever
assets/vendor/three/        vendored Three.js (single-file ESM, same-origin, no build)
src/
  three/                    the walkable game — main (frame loop) · world · player · input
  core/                     rng · store · time · state · save           ┐
  systems/                  weather · condition · activities · travel ·  │ tested simulation
                            jobs · relationships · reputation · opportunities  ├ engine, retained
  data/                     authored content tables (content · districts · jobs · npcs · opportunities)  ┘
  (game.js · main.js · render/ · ui/ · styles/main.css — the prior DOM front door, kept for reference)
```

### Debug views (prior DOM build)

These hash routes drove the **previous** DOM front door (`src/main.js`); they are not wired
into the v0.1.0 walkable game yet, and are kept here as a reference for the retained engine.
Append a hash to the URL: `#debug-city`, `#debug-city:<minute>:<weather>:<district>`
(e.g. `#debug-city:1290:rain:old_harbour` for a rainy 21:30 on the quay, or
`#debug-city:540::tenements` for a 09:00 inland scene), `#debug-walk` (follow camera on a
mid-stride avatar), `#debug-figure` (a close orbit on the avatar and crowd), or `#debug-report`.
District ids: `tenements`, `market_row`, `old_harbour`, `dockside`, `uptown`.
`#debug-shift:<jobId>` jumps straight into a shift scene (append `:play` to start the
rhythm game, `:auto` to see the result screen). Job ids: `market_haul`, `harbour_labour`,
`dock_load`, `courier_run`, `civic_filing`.
`#debug-talk:<npcId>` opens a conversation where/when that person is around (append
`:bonded` to pre-warm the relationship, `:act` to auto-play the first social action);
`#debug-people:<district>:<minute>` shows the city with the "People here" panel for a
given place and time. NPC ids: `mei`, `jun`, `rafiq`, `tomo`, `clara`, `ava`.
`#debug-web:<preset>` opens the Opportunity Web — `mid` (a believable mid-game, several
chances Available), `storm` (also opens the weather-gated surge run), or `fresh` (the
near-empty web showing a first Rumoured chance).

## Roadmap

Each milestone is a tagged release (`v0.0.x`).

- **v0.0.1** — Foundation: engine, day loop, condition, report, save. ✓
- **v0.0.2** — 3D Old Harbour in raw WebGL2: time-of-day sun, weather fog, lit windows, procedural textures. ✓
- **v0.0.3** — A walkable box avatar + third-person follow camera; sprite-billboard crowd. ✓
- **v0.0.4** — Map & districts: five seeded 3D locations, a node-graph city map, and walk/cycle/tram travel with real time & fare. ✓
- **v0.0.5** — Jobs & work mastery: five jobs, an in-world work-rhythm shift scene, quality-based pay, and a mastery curve (pattern preview → auto-resolve). ✓
- **v0.0.6** — NPCs, relationships & social memory: six scheduled characters, trust/respect/affection/debt/conflict, a "People here" panel, conversations, and favours with traceable, material payoffs. ✓
- **v0.0.7** — Opportunity Web: chances gated on six legible components (skill, relationship, reputation, possession, timing, history), a Hidden→Rumoured→Known→Available state machine, per-district reputation, and a plain-language reason on every chance. ✓
- **v0.1.0** — Step into the harbour: a full-screen, scrollbar-free, **walkable 3D** Old Harbour in Three.js — third-person character (WASD/arrows), drag-to-look follow camera, dawn lighting with shadows & fog, lit-window buildings, lamps, market stall, boat, and ambient citizens. The simulation engine is retained for wiring in. ✓
- v0.1.1 — Wire the day loop & clock into the walkable world (real time-of-day sun, working HUD clock).
- v0.1.2 — Interaction: approach NPCs and the job board *in world* to open shifts, talk, and the Opportunity Web.
- v0.1.3 — Economy in the streets: rent, bills and debt surfaced as places you visit.
- … iterating toward **v1.0.0** (full city, AAA-quality presentation).

## Credits

Design book: *City of Small Chances — Steam Early Access Production Edition*.
Implementation: pure web build. Original code, text and assets.

## License

[MIT](LICENSE) for code. Generated art/audio assets are original to this project.
