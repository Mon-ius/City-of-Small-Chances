# Batch 59 — the working quay: coal, tar & salt (PROP_Quay_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the unglamorous working materials of a
steam-and-sail harbour.* The quay is richly dressed (80 props: nets, pots, cargo, market goods,
shopfronts, gulls, ships) but it has no **fuel for the steam boats, no pitch for caulking, no
salt for curing the catch** — the three commonplace working materials a real port is heaped with.
This batch adds them as three **ground-standing chroma-key cutouts** (the Batch-50/57 cargo idiom:
`cutoutPlane` pushed to `world.billboards`, base on the image bottom at `y=h/2`, each on a soft
contact-shadow blob — they sit on the stones and turn to face the camera). They are deliberately
varied in value and silhouette: a black granular **coal heap** with a shovel, a mid-tone **tar
barrel** with a brush, a pale **salt barrel** with a scoop. **codex generates + chroma-keys + logs
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing ground-prop cutouts `assets/sprites/props/PROP_Market_Cart.png`,
`PROP_Cargo_Barrels.png`, `PROP_Quay_RopeCoil.png`. Each is a **single subject, painted front-on at
a natural standing eye level, even diffuse light, on a SOLID flat chroma background, no ground
shadow, no scene, no second object,** in the muted weathered period-harbour palette. Match that
handling exactly — painterly not photoreal, one clean subject filling most of the frame, the base
resting on the image bottom (these stand on the ground). Keep them **honest and unromantic**:
grimy coal, dull tar, coarse grey salt, scuffed timber, rusted iron — never a bright or hot colour.

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is safe — coal is black/grey,
tar is black/brown, salt is grey-white, staves grey-brown, hoops rusted iron; hot-pink/magenta
appears in none of them. **No magenta/hot-pink anywhere on any subject.** State the key used per
sprite in `tools/gen/prompts/batch59.md` (MAGENTA for all three).

## What to make — THREE working-quay material props

1. **`PROP_Quay_CoalHeap`** — *fuel for the steam boats.* A low conical pile of glossy black-and-grey
   lump coal with a flat-bladed iron coal shovel stuck upright into it and a slumped hessian coal sack
   or two at the base. **LANDSCAPE** (about 3 wide × 2 tall), the heap on the BOTTOM. (Magenta key.)
2. **`PROP_Quay_TarBarrel`** — *caulking upkeep.* A squat weathered timber cask with iron hoops, its
   open top brimming with glossy black pitch, a long-handled tar brush resting across the rim, a thin
   tar run down one stave. **PORTRAIT** (about 1 wide × 1.3 tall), standing on the BOTTOM. (Magenta.)
3. **`PROP_Quay_SaltBarrel`** — *curing the catch.* A pale weathered open cask with iron hoops mounded
   over the rim with coarse grey-white sea salt spilling down the side, a small wooden scoop half-buried.
   **SQUARE** (about 1 wide × 1 tall), standing on the BOTTOM. (Magenta key.)

Each reads as its working material instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject front-on
at a natural standing eye level (even light, no cast shadow, no scenery, no second subject) on the
solid magenta background. Save the raws to `tools/gen/source_batch59/`. Write your prompts (and the
key colour per sprite) to `tools/gen/prompts/batch59.md`. (If an `image_gen` call returns a server
error, just retry — it succeeds on a later attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Run `tools/gen/postprocess_batch59.sh` (the codex chroma-key remover, `--auto-key border --despill
--force`, MAGENTA) to produce clean RGBA cutouts: **alpha-0 corners, 0% colour fringe**, tightly
cropped, **longest side 512** (downscale, keep aspect). Output to **`assets/sprites/props/`** as
`PROP_Quay_CoalHeap.png`, `PROP_Quay_TarBarrel.png`, `PROP_Quay_SaltBarrel.png` (8-bit RGBA, quantised).

Verify with Pillow and report per sprite: **RGBA**, **alpha-0 corners**, **0% residual magenta
fringe**, **0% visible pure-key**, pixel dimensions (longest side 512; coal landscape, tar portrait,
salt square), file size, and a one-line note that it reads as its material with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 59 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not**
edit anything else, do **not** run git, do **not** touch `src/`.
