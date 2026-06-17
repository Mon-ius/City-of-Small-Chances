# Batch 57 — the market grows: a costermonger's cart, a crock-seller's jars & a canvas parasol (PROP_Market_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *make the market read as a market, not one lone stall.*
"Market Row" is core to the game, and the player spawns right beside the harbour market — but the live scene
has only **one** vendor: Mei's noodle stall (geometry + painted wares). A market is a cluster of pitches, the
press of several sellers; one stall reads as a single shop, not a market. This batch adds a **second vendor
pitch** on the open deck between the spawn and Mei's stall, so the player walks *into* a market: **a
costermonger's loaded handcart, a crock-seller's cluster of glazed earthenware jars, and a tall canvas
parasol** shading the pitch. Three **chroma-key cutouts** the orchestrator places as a loose cluster — all
**ground-planted camera-facing billboards** on soft contact-shadow blobs (the proven Batch-50 cargo idiom —
`cutoutPlane` pushed to `world.billboards`, base on the image bottom, each on a `shadowTex` blob). They share
the muted weathered period-harbour palette exactly — worn timber, woven baskets, terracotta, faded canvas —
and they are **deliberately distinct in silhouette** from every market sprite already placed (Mei's baskets,
sacks, crate, fish-slab, cheese, bread, hanging-wares): a **cart** reads by its wheels, **crocks** by their
round glazed bellies, a **parasol** by its tall canopy-on-a-pole. **You (codex) generate + chroma-key + log
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing market cutouts `assets/sprites/props/PROP_Market_BasketVeg.png`,
`PROP_Market_Sacks.png` and `PROP_Cargo_Handbarrow.png`. Each is a **single subject, painted front-on /
slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow, no scene, no
second object,** in the muted weathered period-harbour palette (worn timber, woven withy, earthy goods,
rusted iron). Match that handling exactly — painterly not photoreal, one clean subject filling most of the
frame. These are a working market's gear, so keep them **honest and unromantic**: scuffed timber, dull glaze,
salt-faded canvas, earthy produce — muted reds, greens, golds, NEVER a bright or hot colour. Paint each so it
**reads clearly from the front** as the thing it is.

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is the safe universal key here — the
cart's produce, the terracotta crocks and the canvas parasol may carry muted greens, reds and golds, and
magenta/hot-pink appears in none of them — **no magenta/hot-pink anywhere on any subject** (keep painted reds
earthy, never a pink that reads as the key). State the key used per sprite in `tools/gen/prompts/batch57.md`
(MAGENTA for all three).

## What to make — THREE second-pitch market props (cart, crocks, parasol)

1. **`PROP_Market_Cart`** — *a costermonger's barrow.* A single **two-wheeled wooden market handcart** seen
   broadside / slight three-quarter, two **spoked timber wheels**, a pair of pull-handles/shafts, the bed
   **sloped up at the back into a display board heaped with a little muted produce** (cabbages, roots,
   apples in earthy tones) and maybe a sack. Weathered sawn timber, rust-brown iron rims. Reads instantly as
   a market cart by its wheels. **LANDSCAPE** framing (about 3 wide × 2 tall), the wheels resting on the
   BOTTOM EDGE of the image. (Magenta key.)
2. **`PROP_Market_Crocks`** — *a crock-seller's wares.* A close cluster of **three or four glazed earthenware
   crocks / storage jars** of different sizes (an oil / olive / pickle / grain seller's stock), fat round
   terracotta and cream-glazed bellies, a couple with timber lids or a tied cloth top, one tipped with a
   little grain spilling. Muted terracotta, ochre and dull cream glaze, no bright colour. Reads as a huddle
   of market pots. Roughly **SQUARE** framing (about 1 wide × 1 tall), the crocks sitting on the BOTTOM EDGE
   of the image. (Magenta key.)
3. **`PROP_Market_Parasol`** — *shade over the pitch.* A single tall **canvas market parasol / umbrella** on
   a plain timber pole, an octagonal or round canopy of **salt-faded cream canvas with muted faded stripes**,
   a little sag and patching, the pole running down to a simple foot. Reads as a market parasol. Tall
   **PORTRAIT-to-square** framing (about 2 wide × 2.4 tall), the canopy filling the upper frame, the pole
   foot on the BOTTOM EDGE of the image. (Magenta key — the stripes are a muted dull red/ochre, NOT pink.)

Each reads as its piece of market kit instantly by silhouette; **no readable text/numbers/letters** (no shop
names, no prices).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject front-on /
slight three-quarter on the solid magenta background (flat even light, no cast shadow, no ground, no second
subject). Save the raws to `tools/gen/source_batch57/`. Write your prompts (and the key colour used per
sprite) to `tools/gen/prompts/batch57.md`. (If an `image_gen` call returns a server error, just retry — it
succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch57.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, MAGENTA `#ff00ff`) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (downscale, keep aspect). Output to
**`assets/sprites/props/`** as `PROP_Market_Cart.png`, `PROP_Market_Crocks.png`, `PROP_Market_Parasol.png`
(8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0), **0% residual
magenta fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept — cart landscape,
crocks square-ish, parasol portrait-to-square), file size, and a one-line note that it reads as its piece of
kit with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 57 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not** edit
anything else, do **not** run git, do **not** touch `src/`.
