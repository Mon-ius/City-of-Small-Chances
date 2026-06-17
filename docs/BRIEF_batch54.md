# Batch 54 — small craft on the near water: a rowing dory, a sailing dinghy & a harbour punt (PROP_Boat_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *fill the one empty stretch of the scene, the near water.*
The harbour's water now carries traffic far out (the Batch-44 tall ship, trawler and barge at x≤−40) and
one moored cabin-boat near the quay — but the wide band of **near water between the sea-wall and that
moored boat is bare.** A real working harbour is thick with **small craft**: tenders, rowing boats and
dinghies pulled up close to the quay, the everyday transport between hull and shore. This batch adds that
missing layer of life on the near water: **a clinker rowing dory, a small open sailing dinghy with its
sail furled, and a flat-bottomed harbour punt.** Three **chroma-key cutouts** the orchestrator floats on
the water surface as billboards (the proven Batch-44 vessel idiom — sit the painted waterline on the
water plane, **no contact shadow**, camera-facing) in the confirmed-empty near-water band (x≈−15..−17,
spread across z, clear of the moored boat at (−20,−6), the buoy line and the far vessels). They share the
existing weathered timber-and-tar palette exactly — no new colour — but they turn an empty bay into a
busy small-boat harbour. **You (codex) generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run
git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing vessel cutouts `assets/sprites/props/PROP_Ship_Trawler.png`,
`PROP_Ship_Barge.png` and the dock props `PROP_Dock_Capstan.png`. Each is a **single subject, painted
broadside / slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow,
no scene, no second object,** in the muted weathered period-harbour palette (worn timber, tarred planks,
faded tan canvas, rusted iron). Match that handling exactly — painterly not photoreal, one clean subject
filling most of the frame. These are small working boats seen **floating on water**, so paint each
**broadside (beam-on), at rest, its painted waterline along the BOTTOM EDGE of the frame** (it sits on the
water — the hull below the waterline is not drawn). Keep them **honest and unromantic**: tarred and
silvered planking, weathered tan canvas, a little rust on the rowlocks and fittings — **no bright colour,
no decoration, no name painted on the bow.**

## Chroma key — GREEN `#00ff00`

Generate each on a **solid pure-green `#00ff00`** background. Green is the safe universal key here — it
appears nowhere in tarred or silvered planking, faded tan canvas, rusted iron or pale rope — **no green
anywhere on any subject.** State the key used per sprite in `tools/gen/prompts/batch54.md` (GREEN for all
three).

## What to make — THREE small near-water craft (rowing dory, sailing dinghy, harbour punt)

1. **`PROP_Boat_Rowboat`** — *a clinker-built rowing dory pulled up on the near water.* A small open
   wooden boat seen **broadside**, the **overlapping clinker planks** of the hull tarred dark below and
   silvered above, a curved stem and transom, two or three **thwart benches** across, a pair of **oars
   shipped inboard** (looms crossed over the thwarts, blades up), an iron **rowlock** on the gunwale, a
   little water and a coil of painter-rope in the bilge. Reads **long and low** — clearly **landscape**
   framing (about 2.4 wide × 0.95 tall), the waterline on the bottom edge. (Green key.)
2. **`PROP_Boat_Dinghy`** — *a small open sailing dinghy at rest, its sail furled.* A little open
   clinker hull broadside, a **short mast stepped forward** with a **weathered tan lugsail furled and
   lashed in a loose bundle along the boom**, a tiller and rudder at the stern, a thwart or two. The mast
   makes it **taller than the dory** — roughly **square-ish to slightly portrait** framing (about 1.7
   wide × 1.6 tall), the waterline on the bottom edge, the masthead in the upper frame. (Green key.)
3. **`PROP_Boat_Punt`** — *a flat-bottomed harbour punt / tender.* A long shallow **flat-bottomed punt**
   broadside, square-ended (a blunt bow and stern, not pointed), low freeboard, plain tarred and
   silvered planking, a single thwart, a long **quant pole** laid fore-and-aft along the gunwales. Reads
   **very long, low and flat** — clearly **landscape** framing (about 2.7 wide × 0.66 tall), the
   waterline on the bottom edge. (Green key.)

Each reads as its kind of small boat instantly by silhouette; **no readable text/numbers/letters, no name
on the bow.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single boat broadside on
the solid green background (flat even light, no cast shadow, no water drawn below the waterline, no second
subject, waterline on the bottom edge). Save the raws to `tools/gen/source_batch54/`. Write your prompts
(and the key colour used per sprite) to `tools/gen/prompts/batch54.md`. (If an `image_gen` call returns a
server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch54.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN `#00ff00`) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small props
— downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Boat_Rowboat.png`,
`PROP_Boat_Dinghy.png`, `PROP_Boat_Punt.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0), **0%
residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept — rowboat
landscape, dinghy square-ish, punt very-landscape), file size, and a one-line note that it reads as its
kind of boat with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 54 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not**
edit anything else, do **not** run git, do **not** touch `src/`.
