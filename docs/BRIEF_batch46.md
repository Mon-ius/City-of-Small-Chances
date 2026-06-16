# Batch 46 — green on the grey quay: harbour plants & a quayside tree (PROP_Plant_*/PROP_Tree_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *bring living green to an all-stone
port.* The walkable harbour is entirely stone, timber and water — painted ground, varied
walls & roofs, clutter, gulls, vessels, a far shore — but **not one living plant.** A real
period quay is dotted with green: bay topiary in tubs flanking doorways, half-barrels
brimming with flowers, a hardy tree sprung from a corner. This batch adds **three chroma-key
plant cutouts** that the orchestrator scatters as billboards (the proven Batch-3 citizen /
Batch-43 gull idiom) with soft contact shadows so they read as planted. **You (codex)
generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator
wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props
`assets/sprites/props/PROP_Quay_LobsterPots.png` and `PROP_Market_BasketFruit.png`. Each is
a **single object, painted front-on / slight-three-quarter, even diffuse light, on a SOLID
flat chroma background**, **no ground shadow, no scene, no second object,** in the muted
period-harbour palette. Match that: one clean plant per image, filling most of the frame,
upright as it sits on the ground, painterly not photoreal. Greens should be **muted and
period** — sage / olive / dusty greens, not neon; tubs in weathered wood / terracotta;
flowers in soft reds, golds, lavenders. These stand as upright camera-facing cutouts, so
paint each so it **reads clearly from the front.**

## Chroma key — MAGENTA, the foliage is green

Every subject here is **green foliage** — so generate each on a **solid pure-magenta
`#ff00ff`** background so the key never eats the leaves. State the key used per sprite in
`tools/gen/prompts/batch46.md` (it should be MAGENTA for all three). Keep magenta/pink out
of the plants themselves (flowers in red/gold/lavender are fine, but no pure magenta).

## What to make — THREE plants (a topiary, a planter, a tree)

1. **`PROP_Plant_PottedTree`** — *a clipped bay topiary in a wooden tub.* A neat
   ball-or-cone of dark-green foliage on a short trunk, planted in a weathered wooden /
   terracotta tub — the kind that flanks a tavern door or a market stall. Upright, roughly
   **portrait** framing. (Magenta key.)
2. **`PROP_Plant_Flowers`** — *a half-barrel planter brimming with flowers.* A weathered
   oak half-barrel overflowing with leafy plants and soft-coloured blooms (reds, golds,
   lavenders), a splash of warm colour for the grey quay. Roughly **square** framing.
   (Magenta key.)
3. **`PROP_Tree_Quay`** — *a modest hardy quayside tree.* A single small broadleaf tree
   (a wind-shaped plane or sycamore), bare-ish trunk and a rounded leafy canopy, as if
   sprung from a corner of the cobbles — vertical green for the skyline. Tall **portrait**
   framing. (Magenta key.)

Each reads its plant instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single plant
front-on on the solid magenta background (flat even light, no cast shadow, no ground, no
second object). Save the raws to `tools/gen/source_batch46/`. Write your prompts (and the key
colour used per plant) to `tools/gen/prompts/batch46.md`. (If an `image_gen` call returns a
server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch46.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, MAGENTA) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (downscale,
keep aspect). Output to **`assets/sprites/props/`** as `PROP_Plant_PottedTree.png`,
`PROP_Plant_Flowers.png`, `PROP_Tree_Quay.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent**
(alpha 0), **0% residual magenta fringe** at the alpha edge, the pixel dimensions (longest
side 512, aspect kept — topiary/tree portrait, planter ~square), file size, and a one-line
note that it reads as its plant with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 46 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
