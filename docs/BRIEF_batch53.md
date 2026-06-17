# Batch 53 — the quay at work: a warping capstan, a deck of deals & a derrick at the rail (PROP_Dock_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *make the dock read as a place that works, not just stores.*
The Old Harbour now carries everything a quay *holds* — coiled rope, drying nets, laid-up anchor and
chain, stacked casks, a hand-barrow, benches, a pump, a brazier, market wares end to end — but nothing
that performs the dock's actual **labour**. There is no machine to warp a hull alongside, no hoist to
swing a load up off a deck, no lumber traffic despite a timber port. This batch adds that missing
layer: the heavy working gear of a port — **a warping capstan, a stack of landed deals, and a quayside
derrick hoist.** Three **chroma-key cutouts** the orchestrator stands, grounded, in the confirmed-empty
south-quay and north-kerb runs as billboards (the proven Batch-50 cargo / Batch-51 comforts /
Batch-52 wares idiom) with soft contact shadows where they sit on the deck. They share the existing
grey-timber-and-rust palette exactly — no new colour — but they turn a port that merely *stores* freight
into one that lifts, hauls and moors it. **You (codex) generate + chroma-key + log only. Do NOT touch
`src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Cargo_Barrels.png`,
`PROP_Cargo_Anchor.png` and `PROP_Quay_LobsterPots.png`. Each is a **single subject, painted
front-on / slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground
shadow, no scene, no second object,** in the muted weathered period-harbour palette (worn timber,
rusted iron, tarred rope, faded paint). Match that handling exactly — painterly not photoreal, one
clean subject filling most of the frame, sitting as it would rest on the ground. These are heavy
working gear, so keep them **honest and unromantic**: silvered oak, rust-brown iron, tar-black rope,
grey-brown sawn deals — **no bright colour, no decoration.** These stand as upright camera-facing
cutouts, so paint each so it **reads clearly from the front, with its base on the bottom edge of the
frame** (it sits on the deck).

## Chroma key — GREEN `#00ff00`

Generate each on a **solid pure-green `#00ff00`** background. Green is the safe universal key here — it
appears nowhere in silvered oak, rusty iron, tar-black rope, pale manila line, or grey-brown sawn
timber — **no green anywhere on any subject.** State the key used per sprite in
`tools/gen/prompts/batch53.md` (it should be GREEN for all three).

## What to make — THREE working-dock props (capstan, derrick, timber stack)

1. **`PROP_Dock_Capstan`** — *a squat oak warping capstan, the hand-winch that hauls a vessel snug
   against the quay.* A stout oak drum about waist-high banded with **riveted rusty iron hoops**; two
   or three worn **wooden capstan-bars socketed out through the crown head** at angles; a thick frayed
   **tar-black mooring rope** leading off the drum and dropping to a loose coil on the deck at its base.
   The drum, head and socketed bars stand **taller than the footprint is wide** — roughly **portrait**
   framing (about 0.85 wide × 1.15 tall). (Green key.)
2. **`PROP_Dock_Derrick`** — *a quayside cargo derrick, the quay's hand-crane for swaying cargo up.* A
   tall slender **raked tarred-timber post**, an **iron gooseneck** fitting near its head, a black
   wooden **double-sheave block-and-tackle** hanging from the head with a coil of **pale manila
   fall-rope** and a **hook swinging empty** below; a small iron cleat low on the post with the rope
   belayed to it. A tall high-silhouette piece of working gear against the sky — clearly **portrait /
   very tall** framing (about 0.7 wide × 1.9 tall), the base on the bottom edge, the tackle and hook
   filling the upper frame. (Green key.)
3. **`PROP_Dock_Timber`** — *a landed stack of sawn deals, lumber off a timber boat waiting to be
   carried up.* A neat **low pile of rough-sawn grey-brown boards laid in courses**, separated by
   thinner **crosswise dunnage battens**; the cut ends weathered silvery; one or two boards sprung
   loose off the top; a heavy **iron-banded sleeper / chock** laid across the bottom course. Reads
   **long, low and flat** — clearly **landscape** framing (about 1.5 wide × 0.78 tall). (Green key.)

Each reads as its object instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject
front-on / slight three-quarter on the solid green background (flat even light, no cast shadow, no
ground, no second subject, base on the bottom edge). Save the raws to `tools/gen/source_batch53/`.
Write your prompts (and the key colour used per sprite) to `tools/gen/prompts/batch53.md`. (If an
`image_gen` call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch53.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN `#00ff00`) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small
props — downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Dock_Capstan.png`,
`PROP_Dock_Derrick.png`, `PROP_Dock_Timber.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept
— capstan portrait, derrick tall portrait, timber landscape), file size, and a one-line note that it
reads as its object with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 53 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
