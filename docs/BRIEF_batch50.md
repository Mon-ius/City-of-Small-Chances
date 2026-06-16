# Batch 50 — the working cargo quay: barrels, a hand-barrow & an anchor (PROP_Cargo_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *show the cargo of an honest day's work.*
The live milestone is "an honest day's work" — you labour a shift off the board. But the quay it
happens on is dressed for *life* (cat, dog, pigeons, gulls, washing, planters) far more than for
*work*: there are crates and sacks, but **none of the heavy cargo a working port handles** — no
casks rolling off a boat, no labourer's barrow, no great rusted anchor laid up on the stones.
This batch adds **three chroma-key cargo cutouts** that the orchestrator scatters, sparsely, in
the open working areas of the quay as grounded billboards (the proven Batch-48 animal / Batch-46
plant idiom) with soft contact shadows where they sit on the deck, so the port reads as a place
where real freight moves. **You (codex) generate + chroma-key + log only. Do NOT touch `src/`.
Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Quay_LobsterPots.png`,
`PROP_Market_Crate.png` and `PROP_Animal_Dog.png`. Each is a **single subject, painted front-on /
slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow, no
scene, no second object,** in the muted weathered period-harbour palette (worn timber, rusted
iron, faded paint — never bright or new). Match that exactly: one clean cargo subject per image,
filling most of the frame, sitting as it would rest on the ground, painterly not photoreal. These
stand as upright camera-facing cutouts, so paint each so it **reads clearly from the front, with
its base on the bottom edge of the frame** (it sits on the deck).

## Chroma key — GREEN, the cargo is not green

Generate each on a **solid pure-green `#00ff00`** background. Timber is warm brown, iron is dark
rust-grey, hoops/bands are black iron, sacking is buff — **no green anywhere on the subject.**
State the key used per sprite in `tools/gen/prompts/batch50.md` (it should be GREEN for all three).

## What to make — THREE cargo props (barrels, a hand-barrow, an anchor)

1. **`PROP_Cargo_Barrels`** — *a cluster of harbour casks & barrels.* Three or four stout wooden
   barrels banded with black iron hoops, grouped together, **one lying on its side** in front of
   two standing — the weathered timber of a working port, not shiny new. Roughly **square**
   framing. (Green key.)
2. **`PROP_Cargo_Handbarrow`** — *a dock labourer's hand-barrow.* A wooden two-wheel sack-barrow /
   hand-truck stood **tilted back at rest**, worn plank bed, iron-rimmed wheels, two long handles
   rising — optionally a single buff sack or small cask loaded on it. Reads instantly as the thing
   a labourer pushes cargo on. Roughly **portrait / slightly taller than wide** framing. (Green key.)
3. **`PROP_Cargo_Anchor`** — *a great iron anchor laid up on the quay.* A large old admiralty-pattern
   ship's anchor (curved arms, a stock across the shank) **leaned / laid on the stones with a heap
   of heavy chain** piled at its base, dark rusted iron, the maritime icon every harbour keeps.
   Roughly **square** framing. (Green key.)

Each reads as its object instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single cargo subject
front-on / slight three-quarter on the solid green background (flat even light, no cast shadow, no
ground, no second subject, base on the bottom edge). Save the raws to `tools/gen/source_batch50/`.
Write your prompts (and the key colour used per sprite) to `tools/gen/prompts/batch50.md`. (If an
`image_gen` call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch50.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small props —
downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Cargo_Barrels.png`,
`PROP_Cargo_Handbarrow.png`, `PROP_Cargo_Anchor.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect
kept — barrels ~square, barrow portrait, anchor ~square), file size, and a one-line note that it
reads as its object with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 50 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
