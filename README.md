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

## Current build — v0.0.1 · *Foundation & First Light*

The Old Harbour arrival arc:

- Title screen, character creation (background obligation, trait, starting skill).
- A living **day loop**: a clock, daily weather, and time-costed activities (rest, cook, eat out, walk the harbour, day labour, ask around for work).
- **Condition system** — energy, hunger, stress, health and hope, with fair, readable drift.
- **Economy seed** — starting money and a campaign obligation/deadline.
- **End-of-day report** — money in/out, condition changes and tomorrow's warnings.
- **Save/load** to `localStorage` with autosave, plus settings.

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
  ui/                 dom helpers · hud · screens
  data/               authored content tables
assets/               sprites · textures · audio (generated per-milestone)
```

## Roadmap

Each milestone is a tagged release (`v0.0.x`).

- **v0.0.1** — Foundation: engine, day loop, condition, report, save. ✓
- v0.0.2 — Map & districts, travel time/cost.
- v0.0.3 — Jobs & work mastery framework.
- v0.0.4 — NPCs, relationships & social memory.
- v0.0.5 — Opportunity Web (traceable chances).
- v0.0.6 — Economy: rent ladder, bills, debt.
- v0.0.7 — Events & crises with recovery paths.
- v0.0.8 — Phone UI (calendar, messages, map, wallet, skills, contacts).
- v0.0.9 — Art pass (generated sprites & textures), audio & accessibility.

## Credits

Design book: *City of Small Chances — Steam Early Access Production Edition*.
Implementation: pure web build. Original code, text and assets.

## License

[MIT](LICENSE) for code. Generated art/audio assets are original to this project.
