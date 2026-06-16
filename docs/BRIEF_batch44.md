# Batch 44 — traffic on the water: distant harbour vessels (PROP_Ship_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *fill the empty sea.* West of the
quay lies a wide water plane (≈70×120 units) carrying a single small moored boat. A working
harbour's water is never empty: tall ships at anchor, fishing boats coming in, a sailing
barge under tan canvas. This batch adds **three chroma-key vessel cutouts** that the
orchestrator stands far out on the water as billboards — the same proven idiom as the
Batch-43 gulls and the Batch-6 clouds (camera-facing silhouettes on the horizon), with the
existing moored boat (real geometry) reading as the *near* vessel and these as the *far*
ones. **You (codex) generate + chroma-key + log only. Do NOT touch `src/`. Do NOT run git.**
(The orchestrator wires them into `world.js`.)

## Match the existing cutout-prop style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Gull_Flying.png`
(Batch 43) and `PROP_Quay_Buoys.png` (Batch 42). Each is a **single subject, painted
broadside / side-on, even diffuse light, on a SOLID flat chroma background** for keying,
**no water, no reflection, no scene, no second subject**, in the muted period-harbour
palette. Match that: one clean vessel per image, **strict side-on (broadside) profile**
filling most of the frame, painterly not photoreal. These stand on the water as flat
camera-facing cutouts, so paint each so it **reads instantly as that vessel in profile.**

**Waterline rule (important):** the **bottom edge of the image is the vessel's waterline** —
paint only the part of the hull *above* the water; do **not** paint the underwater hull,
and do **not** paint any sea, foam, wake or reflection. Below the hull is pure chroma. This
lets the orchestrator sit the image's bottom edge exactly on the water surface.

## Chroma key — GREEN, keep the vessels free of green/teal

Hulls are brown/black/grey, sails off-white or tan/red-ochre, no green or teal anywhere —
so generate every one on a **solid pure-green `#00ff00`** background. State the key used per
sprite in `tools/gen/prompts/batch44.md` (it should be GREEN for all three).

## What to make — THREE harbour vessels (three distinct silhouettes)

1. **`PROP_Ship_TallShip`** — *a three-masted sailing ship at anchor, broadside.* A
   barque / clipper: dark timber hull with a pale strake line, three tall masts with yards,
   most canvas furled (a sail or two loose), rigging suggested. The hero distant vessel —
   tall, so a roughly **square / slightly-portrait** frame (the masts reach near the top).
   (Green key.)
2. **`PROP_Ship_Trawler`** — *a small steam fishing trawler / smack, broadside.* A stubby
   working boat: dark hull, a wheelhouse, a single short mast or funnel, weathered. **Wide
   framing (about 3:2 landscape).** (Green key.)
3. **`PROP_Ship_Barge`** — *a flat sailing barge under sail, broadside.* A low broad-beamed
   barge / lugger with a single tan or red-ochre spritsail set, dark hull. **Wide framing
   (about 3:2 landscape).** (Green key.)

Each reads its vessel instantly by silhouette; **no readable text/numbers/letters,** no
flags with insignia.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single vessel
strictly side-on on the solid green background (flat even light, no water, no reflection, no
second vessel, waterline at the image bottom). Save the raws to `tools/gen/source_batch44/`.
Write your prompts (and the key colour used per vessel) to `tools/gen/prompts/batch44.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on the second try.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch44.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0
corners, 0% colour fringe**, the subject tightly cropped, the **longest side 512** (these
are distant set-dressing — downscale, keep aspect). Output to **`assets/sprites/props/`**
as `PROP_Ship_TallShip.png`, `PROP_Ship_Trawler.png`, `PROP_Ship_Barge.png` (8-bit RGBA,
quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent**
(alpha 0), **0% residual green fringe** at the alpha edge, the pixel dimensions (longest
side 512, aspect kept — the tall ship near-square, the trawler/barge ~3:2 wide), file size,
and a one-line note that the waterline sits on the image bottom edge and it reads as its
vessel with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 44 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
