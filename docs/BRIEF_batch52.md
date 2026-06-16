# Batch 52 — the market's wares: a fishmonger's slab, a cheesemonger's wheels & a baker's bread (PROP_Market_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *dress the quay as the market it is.*
The Old Harbour is a working dock **and** a market (Mei's noodle-stall stands mid-street, the district
is Market Row–adjacent), but almost nothing on the quay reads as *goods for sale* — the stones are
grey timber and rusted iron end to end, with no fresh market colour. Mei's noodle-stall already carries the *produce* of the market (baskets of fruit & veg, a crate,
sacks), so this batch adds the food-trade dimensions the quay still lacks: **fish, cheese and
bread** — the staples of a port town's table. Three **chroma-key cutouts** that the orchestrator
stands, grounded, along the kerbs as billboards (the proven Batch-50 cargo / Batch-51 comforts idiom)
with soft contact shadows where they sit on the deck. They bring the one thing the weathered palette
lacks — bright, fresh, edible colour — and make the port read as a place that *feeds* the city, not
only ships its freight. **You (codex) generate + chroma-key + log
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Cargo_Barrels.png`,
`PROP_Quay_LobsterPots.png` and `PROP_Plant_Flowers.png`. Each is a **single subject, painted
front-on / slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground
shadow, no scene, no second object,** in the muted weathered period-harbour palette (worn timber,
rusted iron, faded paint). Match that handling exactly — painterly not photoreal, one clean subject
filling most of the frame, sitting as it would rest on the ground — **except** that here the *wares
themselves* should carry honest, slightly-saturated natural colour (silver fish, green-and-red
produce, golden-brown bread) against the worn wood of the crates/slab/baskets. These stand as upright
camera-facing cutouts, so paint each so it **reads clearly from the front, with its base on the
bottom edge of the frame** (it sits on the deck).

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is the safe universal key
here — it appears nowhere in silver fish, crushed ice, worn wood, golden-brown bread, or
cream/pale-gold cheese with its waxed rinds — **no magenta/hot-pink anywhere on any subject.** State
the key used per sprite in `tools/gen/prompts/batch52.md` (it should be MAGENTA for all three).

## What to make — THREE market-ware props (fish, cheese, bread)

1. **`PROP_Market_FishSlab`** — *a fishmonger's display of the morning catch.* A low slatted-wood
   slab / fishmonger's table heaped with **fresh silver fish** (herring, mackerel — silver-blue
   bodies, dark backs) laid out on a bed of crushed ice, glistening and fresh. Worn wooden table, the
   catch the hero. Roughly **landscape** framing (clearly wider than tall). (Magenta key.)
2. **`PROP_Market_Cheese`** — *a cheesemonger's display.* A low wooden board or table set with
   **whole wheels of cheese stacked, one cut open to a wedge** — cream and pale-gold pastes, waxed
   rinds in deep red, ochre and near-black, the cut wheel showing its pale paste. Warm dairy colours,
   a cheesemonger's stall, the wheels the hero. Roughly **square / slightly wider than tall** framing.
   (Magenta key.)
3. **`PROP_Market_Bread`** — *a baker's bread display.* A wicker basket or low wooden board heaped
   with **golden-brown loaves and rolls** — round cottage loaves, long sticks, a few rolls — warm
   crusty browns, a baker's stall offering. Roughly **landscape** framing (wider than tall).
   (Magenta key.)

Each reads as its object instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject
front-on / slight three-quarter on the solid magenta background (flat even light, no cast shadow, no
ground, no second subject, base on the bottom edge). Save the raws to `tools/gen/source_batch52/`.
Write your prompts (and the key colour used per sprite) to `tools/gen/prompts/batch52.md`. (If an
`image_gen` call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch52.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, MAGENTA `#ff00ff`) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small
props — downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Market_FishSlab.png`,
`PROP_Market_Cheese.png`, `PROP_Market_Bread.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual magenta fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept
— fish slab landscape, cheese ~square, bread landscape), file size, and a one-line
note that it reads as its object with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 52 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
