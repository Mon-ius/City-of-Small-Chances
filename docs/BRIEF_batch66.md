# Batch 66 — the lighthouse shines (FX_Light_Beacon, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the beacon at the harbour mouth.* The far
shore (Batch 45) closed the horizon with a lighthouse on a headland (`PROP_Shore_Lighthouse` at
x−79, z44) — but its lantern never lights, so at night it is a dark tower over dark water. The night
is now richly lit (moon B61, lamp pools B62, water reflections B63, brazier fire B64) and a working
harbour mouth has its guiding light. This batch hangs a bright warm-white **beacon flare** at the
lantern, **additively blended** and faded in with the night — so the lighthouse finally shines across
the bay. **codex generates + luminance-keys + logs only. Do NOT touch `src/`. Do NOT run git.** (The
orchestrator wires it into `world.js` + `daycycle.js`, placed at the lantern from the sprite's pixel
position.)

## One beacon flare, placed at the lantern

ONE warm-white beacon-flare texture is generated and hung as a single camera-facing billboard at the
lighthouse lantern. The lantern's world position is derived from the sprite: the `PROP_Shore_Lighthouse`
plane is at (−79, 4.45, 44) rotated to face +x, so image-x maps to world-z as `z = 44 − local_x` and
image-y to world-y as `y = 4.45 + local_y`; the lantern sits at image-frac (≈0.81 from left, ≈0.07
from top) → world ≈ (−79, 8.0, 28.5). The beacon billboard sits just in front (x≈−78.5) so it draws
over the opaque shore.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background (the Batch-49/61/62/63/64/65 idiom): brightness becomes
opacity. A gain curve lifts the bright core and fades the halo/glints; the pure-black surround drops
to fully transparent. Keep the RGB **warm-white** — a white-gold core.

## What to make — ONE beacon flare

1. **`FX_Light_Beacon`** — a small intense warm-white navigation light: a brilliant white-gold core,
   a soft round halo, and faint thin vertical+horizontal star-glints, fading to pure black. **SQUARE**
   (1024×1024), centred with empty black all around. (BLACK background → luminance alpha.)

No lighthouse, no tower, no land, no horizon, no readable text — just the bright beacon and its glints.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch66/FX_Light_Beacon_raw.png`. Prompt is in `tools/gen/prompts/batch66.md`. (If
an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha warm-white flare

Run `tools/gen/postprocess_batch66.sh` (luminance→alpha, gain curve, keeps the warm-white RGB,
quantised) → clean RGBA flare: **alpha-0 corners, a brilliant warm-white core, soft halo + faint
glints fading out**, longest side 512. Output to **`assets/sprites/fx/`** as `FX_Light_Beacon.png`
(8-bit RGBA). Tune `BEACON_GAIN` (default 2.4) up if the core is not bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **warm-white centre** (R≥G≥B), centre
alpha, soft halo (not a hard disc), longest side 512, visible fraction, file size, and a one-line note
that it reads as a bright beacon of light with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 66 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
