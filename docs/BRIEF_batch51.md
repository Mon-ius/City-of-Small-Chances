# Batch 51 — quayside comforts: a public bench, a cast-iron water pump & a dockers' brazier (PROP_Quay_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *dress the quay for the people who work it.*
The live milestone is "an honest day's work" — you labour a shift on a working quay. The stones are
now richly dressed for *cargo* (casks, a barrow, a great anchor), for *nature* (cat, dog, pigeons,
gulls, planters) and for *gear* (nets, pots, rope, buoys) — but there is **nothing on the quay for
the people themselves**: nowhere to sit and rest a tired back, no public water to drink or wash by,
no fire to warm cold hands between shifts. This batch adds **three chroma-key cutouts of quayside
human comforts** that the orchestrator scatters, sparsely, along the working areas as grounded
billboards (the proven Batch-48 animal / Batch-50 cargo idiom) with soft contact shadows where they
sit on the deck — so the port reads as a place lived in by people, not only worked by them. **You
(codex) generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator
wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Quay_LobsterPots.png`,
`PROP_Cargo_Anchor.png` and `PROP_Animal_Dog.png`. Each is a **single subject, painted front-on /
slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow, no
scene, no second object,** in the muted weathered period-harbour palette (worn timber, rusted iron,
faded paint — never bright or new). Match that exactly: one clean subject per image, filling most of
the frame, sitting as it would rest on the ground, painterly not photoreal. These stand as upright
camera-facing cutouts, so paint each so it **reads clearly from the front, with its base on the
bottom edge of the frame** (it sits on the deck).

## Chroma key — GREEN, none of the subjects are green

Generate each on a **solid pure-green `#00ff00`** background. Timber is warm brown, iron is dark
rust/black, the brazier's coals glow orange-red — **no green anywhere on any subject.** In
particular paint the water pump as **black or rusted-iron** cast iron (NOT the Victorian dark-green
municipal paint — green would be eaten by the key). State the key used per sprite in
`tools/gen/prompts/batch51.md` (it should be GREEN for all three).

## What to make — THREE quayside comfort props (a bench, a water pump, a brazier)

1. **`PROP_Quay_Bench`** — *a weathered public quayside bench.* A long slatted timber bench with
   cast-iron ends (the kind bolted along a harbour promenade), worn grey-brown planks, plain and
   sturdy, **empty, seen from the front three-quarter** so the seat and back read clearly. Roughly
   **landscape** framing (clearly wider than tall). (Green key.)
2. **`PROP_Quay_Pump`** — *a cast-iron public water pump / standpipe.* A tall parish hand-pump on a
   stone or iron base: a fluted cast-iron column, a curved spout, a long pump handle to one side,
   **black or rusted iron** (NOT green-painted). The thing dockers fill a pail or cup at. Roughly
   **portrait / clearly taller than wide** framing. (Green key.)
3. **`PROP_Quay_Brazier`** — *a dockers' coal brazier.* A round iron fire-basket on three legs (a
   pierced metal bowl on a stand), **filled with glowing orange-red coals and a little flame**, the
   iron dark and soot-blackened — the fire labourers warm their hands at on a cold quay. The coals
   should glow warmly (this prop will be lit with an emissive glow in-world). Roughly **square /
   slightly taller than wide** framing. (Green key.)

Each reads as its object instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject
front-on / slight three-quarter on the solid green background (flat even light, no cast shadow, no
ground, no second subject, base on the bottom edge). Save the raws to `tools/gen/source_batch51/`.
Write your prompts (and the key colour used per sprite) to `tools/gen/prompts/batch51.md`. (If an
`image_gen` call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch51.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small props —
downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Quay_Bench.png`,
`PROP_Quay_Pump.png`, `PROP_Quay_Brazier.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept
— bench landscape, pump portrait, brazier ~square), file size, and a one-line note that it reads as
its object with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 51 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
