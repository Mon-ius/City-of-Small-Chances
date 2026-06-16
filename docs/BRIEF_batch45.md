# Batch 45 — close the horizon: the far shore across the bay (PROP_Shore_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *give the harbour a far edge.* West of
the quay the water (≈70×120 units) now carries vessels (Batch 44), but beyond them the sea
meets the sky at a flat, empty horizon — the world reads as floating in void, not sitting in
a bay. This batch adds **three chroma-key distant-shore cutouts** that the orchestrator
stands as a **fixed, fog-blended band along the far water's edge** — the opposite bank: a
headland topped by a lighthouse (the harbour mouth), a hazy far-shore waterfront town, and
distant cliffs/hills. Unlike the vessels these are **NOT billboarded** (a horizon must not
turn as you walk) — they sit fixed, facing the quay, hazed by the harbour fog into the
distance. **You (codex) generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run
git.** (The orchestrator wires them into `world.js`.)

## Paint them as DISTANT — atmospheric perspective is the whole point

These read as land *miles* across the bay. Paint each with **atmospheric perspective**: low
contrast, cool and desaturated (blue-grey haze), soft edges, little fine detail — the way a
far shore looks through sea air. They must read as *background*, never as a crisp foreground
cutout pasted on the sky. Look at the existing harbour art for palette
(`assets/sprites/props/PROP_Ship_TallShip.png` for the muted period tone) but go **hazier
and flatter** than any of it. Strict **side-on / straight-on** (the shore seen across the
water), filling the frame width.

**Waterline rule (as Batch 44):** the **bottom edge of the image is the shoreline** — where
the far land meets the water. Paint only the land *above* the water; below is pure chroma. No
sea, no waves, no reflection. This lets the orchestrator sit the image bottom on the water.

## Chroma key — MAGENTA for green land, GREEN only if no green/teal

A far shore with **green/grey hills, fields or vegetation contains green** — for any such
piece generate on a **solid pure-magenta `#ff00ff`** background so the key never eats the
land. Use green `#00ff00` ONLY for a piece with no green or teal anywhere (e.g. a bare
grey-stone lighthouse headland). State the key used per piece in
`tools/gen/prompts/batch45.md`.

## What to make — THREE far-shore pieces (a continuous distant bank)

1. **`PROP_Shore_Lighthouse`** — *a headland point topped by a lighthouse.* A low rocky
   promontory rising from the water with a pale stone/whitewashed lighthouse tower at its
   tip — the mouth of the harbour. Hazy, distant, the focal point of the far shore. Wide
   framing (~2.5:1). (If the headland is grassy/green → **magenta**; if bare grey rock →
   green.)
2. **`PROP_Shore_Town`** — *a distant far-shore waterfront.* A low hazy strip of pale
   far-bank buildings / a little waterfront town along the water, rooflines and a spire or
   two just discernible through the haze, hills behind. Very wide framing (~3:1). (Hills →
   **magenta** key.)
3. **`PROP_Shore_Cliffs`** — *distant headland cliffs / rolling coast.* A stretch of far
   coastline — green-grey cliffs or low rolling hills meeting the water, no buildings, soft
   and hazy. Very wide framing (~3:1). (Green vegetation → **magenta** key.)

Each reads as far-off land by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single
far-shore strip straight-on on the solid chroma background (flat hazy light, no water below
the shoreline, shoreline at the image bottom). Save the raws to `tools/gen/source_batch45/`.
Write your prompts (and the key colour used per piece) to `tools/gen/prompts/batch45.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on the second try.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch45.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN or MAGENTA per the piece) to produce a clean
RGBA cutout: **alpha-0 corners, 0% colour fringe**, the land tightly cropped to the frame
width, the **longest side 768** (these are wide panoramic bands — keep them wide, downscale
height to keep aspect). Output to **`assets/sprites/props/`** as `PROP_Shore_Lighthouse.png`,
`PROP_Shore_Town.png`, `PROP_Shore_Cliffs.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent**
(alpha 0), **0% residual green/magenta fringe** at the alpha edge, the pixel dimensions
(longest side 768, aspect kept — all wide), file size, a note that the shoreline sits on the
image bottom edge, and a one-line note that it reads as hazy distant land with no legible
text.

## Log (no git, no `src/`)

Append **one** Batch 45 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
