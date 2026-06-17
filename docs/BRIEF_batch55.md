# Batch 55 — where boat meets wall: a life-ring, a quay ladder & hung fenders (PROP_Quay_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *dress the quay edge as a working berth where craft come alongside.*
Batch 54 put small craft on the near water; the sea-wall they tie up against carries bollards, coils of
mooring rope, a drying net and navigation buoys — but none of the **safety and mooring gear** every working
quay edge has: nothing to throw to someone in the water, no way down to a boat, nothing to stop a hull
grinding on the stone. This batch adds that missing layer right at the wall: **a cork life-ring on its
station, a quay ladder down to the water, and a cluster of fenders hung over the coping.** Three
**chroma-key cutouts** the orchestrator mounts along the confirmed-empty stretches of the sea-wall as
**FIXED** cutouts facing the quay (the proven Batch-42 `quayClutter` idiom — buoys / net / rope coil — NOT
billboarded; wall gear hangs still and faces the walkable side). They share the existing weathered
timber-iron-tar-rope palette exactly — no new colour — but they turn a bare coping into the lived edge of
a berth. **You (codex) generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run git.** (The
orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing quay-clutter cutouts `assets/sprites/props/PROP_Quay_Buoys.png`,
`PROP_Quay_FishingNet.png` and `PROP_Quay_RopeCoil.png`. Each is a **single subject, painted front-on /
slight three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow, no scene,
no second object,** in the muted weathered period-harbour palette (worn timber, rusted iron, tarred rope,
faded paint). Match that handling exactly — painterly not photoreal, one clean subject filling most of the
frame. These are working safety gear, so keep them **honest and unromantic**: salt-faded paint, tarred
rope, rusted iron, weathered cork — the one allowed accent is the **faded red** of a life-ring's quarters
(real lifebuoys are red-and-white), kept muted, not bright. Paint each so it **reads clearly from the
front** as the piece of gear it is.

## Chroma key — GREEN `#00ff00`

Generate each on a **solid pure-green `#00ff00`** background. Green is the safe universal key here — it
appears nowhere in weathered cork, faded red-and-white paint, tarred rope, rusted iron or silvered timber
— **no green anywhere on any subject.** State the key used per sprite in `tools/gen/prompts/batch55.md`
(GREEN for all three).

## What to make — THREE quay-edge gear props (life-ring, ladder, fenders)

1. **`PROP_Quay_LifeRing`** — *a cork lifebuoy on its wall station.* A round **cork life-ring** painted in
   the traditional **faded red-and-white quarters**, weathered and salt-stained, a **grab-line (thin rope
   becket) looped around its rim** in four places, hung flat against a small dark timber backing-board as
   it would mount on a wall. Reads as a ring — **roughly square** framing (about 0.8 wide × 0.85 tall),
   the whole ring in frame with a small even margin. (Green key.)
2. **`PROP_Quay_Ladder`** — *a quay ladder, the way down to a boat.* A weathered **timber or iron quay
   ladder** seen front-on — two long side-rails and several worn rungs, the top ends shaped into curved
   iron grab-hoops (or squared timber tops), tar-darkened and rust-streaked, a little green weed low down
   where it meets the waterline. Stands **tall and narrow** — clearly **portrait** framing (about 0.5 wide
   × 1.5 tall), the foot of the ladder on the BOTTOM EDGE of the image, the grab-tops at the top. (Green
   key — the weed is dark olive/brown, NOT pure green; keep it muted so it keys cleanly.)
3. **`PROP_Quay_Fenders`** — *fenders hung over the coping.* A close cluster of **two or three traditional
   harbour fenders** — fat **woven-rope or cork cylindrical bumpers**, tarred and weathered — hung side by
   side from a **rope lashing along the top**, the way they drape over a quay wall to cushion a hull.
   Reads as a hanging bunch — **portrait** framing (about 0.7 wide × 1.0 tall), the lashing at the top
   edge, the fenders hanging below. (Green key.)

Each reads as its piece of gear instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject front-on /
slight three-quarter on the solid green background (flat even light, no cast shadow, no ground, no second
subject). Save the raws to `tools/gen/source_batch55/`. Write your prompts (and the key colour used per
sprite) to `tools/gen/prompts/batch55.md`. (If an `image_gen` call returns a server error, just retry — it
succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch55.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN `#00ff00`) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small props
— downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Quay_LifeRing.png`,
`PROP_Quay_Ladder.png`, `PROP_Quay_Fenders.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0), **0%
residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept — life-ring
square-ish, ladder tall portrait, fenders portrait), file size, and a one-line note that it reads as its
piece of gear with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 55 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not**
edit anything else, do **not** run git, do **not** touch `src/`.
