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

## Current build — v0.0.6 · *The people you meet*

The city is now **inhabited**. Six major characters keep their own **daily schedules**, so who you'll find in a district depends on the hour — and a **"People here"** panel shows whoever's around right now. Step up to anyone for a conversation:

- **A relationship that's more than a meter** — every person tracks **trust**, **respect**, **affection**, the **debt** between you (which way it runs), and unresolved **conflict**. Those combine into a **bond** that climbs a ladder from *stranger* to *close*, and the city **remembers**: a "Between you" log records the meals you shared and the times you showed up, and a standing favour quietly shades how they greet you.
- **Five ways to spend time together** — **catch up** (the first chat of the day means the most), **share a meal**, **lend a hand** (tiring, but it earns respect and puts *them* in your debt), **ask a favour**, or **give a gift** to settle what you owe. Each shows its honest time/money cost and effect before you commit.
- **Favours with teeth** — once you've earned it, people give you something real and traceable: Rafiq the yard lead lends you **steel-toed boots**, Clara the clinic admin slips you a **care voucher**, Mei feeds you on the house, Jun the dispatcher pays a **tip-off** and bumps you up tomorrow's routes. NPCs are economic actors, not quest boards — and a favour leaves you owing one back.

Built on the v0.0.5 **work-mastery framework** — a district **work board** and an in-world **work-rhythm shift scene** whose quality drives pay, skill growth and a mastery curve (pattern-preview → auto-resolve).

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
  systems/            weather · condition · activities · travel · jobs · relationships
  render/             WebGL2 3D — mat · gl · textures · scene · renderer · avatar · sprites
  ui/                 dom helpers · hud · cityview · map · jobboard · shift · people · talk · screens
  data/               authored content tables (content · districts · jobs · npcs)
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

## Roadmap

Each milestone is a tagged release (`v0.0.x`).

- **v0.0.1** — Foundation: engine, day loop, condition, report, save. ✓
- **v0.0.2** — 3D Old Harbour in raw WebGL2: time-of-day sun, weather fog, lit windows, procedural textures. ✓
- **v0.0.3** — A walkable box avatar + third-person follow camera; sprite-billboard crowd. ✓
- **v0.0.4** — Map & districts: five seeded 3D locations, a node-graph city map, and walk/cycle/tram travel with real time & fare. ✓
- **v0.0.5** — Jobs & work mastery: five jobs, an in-world work-rhythm shift scene, quality-based pay, and a mastery curve (pattern preview → auto-resolve). ✓
- **v0.0.6** — NPCs, relationships & social memory: six scheduled characters, trust/respect/affection/debt/conflict, a "People here" panel, conversations, and favours with traceable, material payoffs. ✓
- v0.0.7 — Opportunity Web (traceable chances).
- v0.0.8 — Economy: rent ladder, bills, debt.
- v0.0.9 — Events & crises with recovery paths.
- v0.1.0 — Phone UI, audio, accessibility; first vertical-slice polish.
- … iterating toward **v1.0.0** (full 3D, AAA-quality presentation).

## Credits

Design book: *City of Small Chances — Steam Early Access Production Edition*.
Implementation: pure web build. Original code, text and assets.

## License

[MIT](LICENSE) for code. Generated art/audio assets are original to this project.
