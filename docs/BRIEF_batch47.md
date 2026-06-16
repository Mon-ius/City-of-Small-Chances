# Batch 47 — washing day over the quay: hanging laundry lines (PROP_Laundry_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *hang washing over the working port.*
The harbour now has painted ground, varied walls & roofs, working clutter, gulls, vessels, a
far shore and living green — but the **tall building façades that front the quay are still the
plainest surface in the world**: bare painted wall, a grid of windows, a few hanging shop signs
and posters. Nothing says *people live up there.* The single most iconic detail of a crowded
period port is **washing strung out to dry** — lines of linens and clothes pegged between the
windows, sagging over the street. This batch adds **three chroma-key washing-line cutouts** that
the orchestrator hangs flat across the upper façades (the proven Batch-9 hanging-signage idiom —
a fixed cutout `cutoutPlane` rotated to face the street, NOT billboarded; laundry hangs still on
its line, it does not turn to watch you). **You (codex) generate + chroma-key + log only. Do NOT
touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour signage cutouts `assets/sprites/signage/SIGN_Tavern.png` and
`assets/sprites/signage/POSTER_Harbour.png`, and the props `PROP_Quay_FishingNet.png`. Each is a
**single subject, painted front-on, even diffuse light, on a SOLID flat chroma background, no
ground shadow, no scene, no second object,** in the muted period-harbour palette. Match that: one
clean washing line per image, filling most of the frame width, painterly not photoreal. Colours
**muted and period** — creams, off-whites, greys, dusty reds/blues/ochres/browns, faded — the
laundry of a working quarter, not bright modern fabric. These hang as flat cutouts seen straight
from the street, so paint each so it **reads clearly head-on.**

## Chroma key — GREEN, the laundry is not green

Generate each on a **solid pure-green `#00ff00`** background. Keep the garments to creams, whites,
greys, dusty reds/blues/ochres/browns — **no pure or neon green anywhere in the cloth** (a muted
sage garment is fine; pure green is not, the key would eat it). State the key used per sprite in
`tools/gen/prompts/batch47.md` (it should be GREEN for all three).

## What to make — THREE washing lines (linens, colours, work-clothes)

Each is a **wide horizontal strip**: a single rope/line strung across the frame, sagging gently in
a shallow catenary, with garments **pegged to it and hanging down** — a believable mix of shapes
(a sheet, a couple of shirts, trousers, a petticoat, towels). Paint only the rope + the hung cloth;
**everything else is pure chroma.** Roughly **3:1** framing (wide and short). The line should run to
both side edges (it strings off-frame to its anchor points).

1. **`PROP_Laundry_Linens`** — *a line of household linens.* White and cream bedsheets, pillowcases
   and towels, with a little grey-blue wear — the big pale shapes that catch the eye over a street.
   (Green key.)
2. **`PROP_Laundry_Garments`** — *a line of everyday clothes.* Shirts, a faded dress or petticoat,
   trousers, a shawl — in dusty reds, blues, ochres and browns, the colour of a working family's
   washing. A welcome splash of muted colour high on the wall. (Green key.)
3. **`PROP_Laundry_Workclothes`** — *a line of work clothes.* Canvas smocks, aprons, a coarse
   jacket, heavy socks, a cap — greys, browns and faded indigo, the harder-wearing wash of dock
   and market labour. (Green key.)

Each reads as a strung washing line by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single washing line
front-on on the solid green background (flat even light, no cast shadow, no wall behind, no second
object). Save the raws to `tools/gen/source_batch47/`. Write your prompts (and the key colour used
per line) to `tools/gen/prompts/batch47.md`. (If an `image_gen` call returns a server error, just
retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch47.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the line tightly cropped to the frame, the **longest side 768** (these are wide
strips — keep them wide, downscale height to keep aspect). Output to **`assets/sprites/props/`** as
`PROP_Laundry_Linens.png`, `PROP_Laundry_Garments.png`, `PROP_Laundry_Workclothes.png` (8-bit RGBA,
quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual green fringe** at the alpha edge, the pixel dimensions (longest side 768, aspect kept
— all wide ~3:1), file size, and a one-line note that it reads as a strung washing line with no
legible text.

## Log (no git, no `src/`)

Append **one** Batch 47 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
