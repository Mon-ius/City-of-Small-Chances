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

## Current build — v0.0.3 · *An inhabited harbour*

The 3D harbour now has **people in it** — and you can step down into the street:

- **Walkable avatar** — a low-poly box figure, built from a single cube drawn with per-part transforms, whose arms and legs swing from a walk phase. Press **C** (or the on-screen button) to drop from the establishing orbit shot into a third-person **follow camera** and walk the quay with **WASD / arrow keys**.
- **A living crowd** — camera-facing **sprite billboards** of citizens (workers, vendors, couriers, elders, youths) line both kerbs, procedurally drawn on a canvas, lit and fogged to sit in the world, with a gentle idle sway.
- Two cameras, one viewport — the orbit *establishing shot* (drag to look, scroll to zoom) and the *follow walk*, toggled live.

Built on the v0.0.2 **3D harbour** in raw **WebGL2** (no Three.js, no libraries), lit live by the simulation:

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
  systems/            weather · condition · activities
  render/             WebGL2 3D — mat · gl · textures · scene · renderer · avatar · sprites
  ui/                 dom helpers · hud · cityview · screens
  data/               authored content tables
assets/               sprites · textures · audio (generated per-milestone)
```

### Debug views

Append a hash to the URL: `#debug-city`, `#debug-city:<minute>:<weather>`
(e.g. `#debug-city:1290:rain` for a rainy 21:30), `#debug-walk` (follow camera on a
mid-stride avatar), `#debug-figure` (a close orbit on the avatar and crowd), or `#debug-report`.

## Roadmap

Each milestone is a tagged release (`v0.0.x`).

- **v0.0.1** — Foundation: engine, day loop, condition, report, save. ✓
- **v0.0.2** — 3D Old Harbour in raw WebGL2: time-of-day sun, weather fog, lit windows, procedural textures. ✓
- **v0.0.3** — A walkable box avatar + third-person follow camera; sprite-billboard crowd. ✓
- v0.0.4 — Map & districts, travel time/cost between locations.
- v0.0.5 — Jobs & work mastery framework (in-world shift scenes).
- v0.0.6 — NPCs, relationships & social memory.
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
