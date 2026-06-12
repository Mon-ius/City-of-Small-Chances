# City of Small Chances

A grounded urban **life-simulation** about building a stable life under economic pressure. You arrive in **Haiyun City** with little money and an obligation that won't wait. Work, rest, eat, learn the streets, and decide what kind of life is worth protecting.

> Every day matters. You work, rest, train, connect and survive long enough to choose your future.

Built in **pure HTML, CSS and vanilla JavaScript** — no frameworks, no build step. It runs anywhere static files can be served.

**▶ Play:** https://mon-ius.github.io/City-of-Small-Chances/

---

## About

This is a web adaptation of the *City of Small Chances* game design book — a systems-driven life-sim whose core is its **phone, map, calendar and end-of-day report** rather than twitch action, which makes it a natural fit for the browser.

### Design pillars (from the book)

- **Pressure with dignity** — hard, but never humiliating.
- **Traceable opportunity** — you can always see *why* a chance appeared or vanished.
- **Human economy** — relationships materially change work, housing and morale.
- **Multiple valid lives** — security, freedom, connection, respect or wealth.
- **Mastery without grind** — manual work compresses once you've proven competence.

## Current build — v0.0.7 · *The web of small chances*

The game's central promise is now playable: **chances are never luck**. Open the **Opportunity Web** and every prospect in the city is laid out with the exact things it would take — and *why* it's where it is.

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
index.html            entry point + boot splash
styles/main.css       full stylesheet (warm interiors vs cold rain palette)
src/
  main.js             bootstrap
  game.js             Game orchestrator (day cycle, actions)
  core/               rng · store · time · state · save
  systems/            weather · condition · activities · travel · jobs · relationships · reputation · opportunities
  render/             WebGL2 3D — mat · gl · textures · scene · renderer · avatar · sprites
  ui/                 dom helpers · hud · cityview · map · jobboard · shift · people · talk · opportunities · screens
  data/               authored content tables (content · districts · jobs · npcs · opportunities)
assets/               sprites · textures · audio (generated per-milestone)
```

### Debug views

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
- v0.0.8 — Economy: rent ladder, bills, debt.
- v0.0.9 — Events & crises with recovery paths.
- v0.1.0 — Phone UI, audio, accessibility; first vertical-slice polish.
- … iterating toward **v1.0.0** (full 3D, AAA-quality presentation).

## Credits

Design book: *City of Small Chances — Steam Early Access Production Edition*.
Implementation: pure web build. Original code, text and assets.

## License

[MIT](LICENSE) for code. Generated art/audio assets are original to this project.
