# Batch 43 — life over the water: harbour seagulls (PROP_Gull_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *put the harbour's defining
creature into the world.* The quay now holds painted ground, varied walls (Batch 40) and
roofs (Batch 41), a dressed market stall, a notice board, a moored boat, and forty standing
townsfolk — but **not one seagull.** No port reads as a port without gulls: perched along
the sea-wall and rooftops, calling from the lamp-arms, wheeling over the water. This batch
adds **three chroma-key cutout bird sprites** that the orchestrator scatters at perch points
and a few soaring overhead — the same proven cutout idiom as the Batch-42 quay clutter, the
Batch-17 market goods and the Batch-18 vehicles. **You (codex) generate + chroma-key + log
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout-prop style EXACTLY

Look first at the existing harbour cutout props
`assets/sprites/props/PROP_Quay_RopeCoil.png` and `PROP_Quay_Buoys.png` (Batch 42) and
`assets/sprites/props/PROP_Market_Crate.png` (Batch 17). Each is a **single object, painted
side-on / slight-three-quarter, even diffuse light, on a SOLID flat chroma background** for
keying, **no ground shadow, no scene, no second object**, in the muted period-harbour
palette. Match that: one clean bird per image, filling most of the frame, painterly not
photoreal, in the same restrained light. These will be stood up as flat camera-facing
cutouts at perch points and in the sky, so paint each so it **reads instantly in profile**.

## The bird — a European herring gull (the harbour gull)

Paint a classic harbour gull: **white head and underside, pale-grey back and upper wings,
black wingtips with small white spots, a yellow bill with the red gonys spot, pale legs and
feet, a steady pale eye.** Weathered and natural, not cartoonish, not a logo. No text.

## Chroma key — GREEN, the subjects carry no green/teal

A gull is white/grey/yellow/black — **no green or teal** — so generate every one on a
**solid pure-green `#00ff00`** background. State the key used per sprite in
`tools/gen/prompts/batch43.md` (it should be GREEN for all three).

## What to make — THREE gull cutouts (three distinct poses)

1. **`PROP_Gull_Perched`** — *a gull standing at rest, side-on.* Wings folded, body
   roughly horizontal on its legs as it would sit on a wall or post, head level, calm.
   Near-square framing (it is about as tall as it is long). (Green key.)
2. **`PROP_Gull_Calling`** — *a perched gull mid-call.* Standing as above but with the
   head tipped back and the bill open, the classic long-call. Near-square framing.
   (Green key.)
3. **`PROP_Gull_Flying`** — *a gull in level flight, side-on, wings spread.* Wings out
   to a broad span (the wingtips reaching the frame edges), body horizontal, gliding —
   the silhouette of a gull soaring. **Wide framing (about 2:1 landscape).** (Green key.)

Each reads its pose instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single gull
in the stated pose on the solid green background (flat even light, no cast shadow, no
ground, no second bird). Save the raws to `tools/gen/source_batch43/`. Write your prompts
(and the key colour used per sprite) to `tools/gen/prompts/batch43.md`. (If an `image_gen`
call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch43.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 384** (these
are small birds, not props — downscale, keep aspect). Output to **`assets/sprites/props/`**
as `PROP_Gull_Perched.png`, `PROP_Gull_Calling.png`, `PROP_Gull_Flying.png` (8-bit RGBA,
quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent**
(alpha 0), **0% residual green fringe** at the alpha edge, the pixel dimensions (longest
side 384, aspect kept — the perched/calling near-square, the flying ~2:1 wide), file size,
and a one-line note that it reads as a gull in its pose with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 43 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
