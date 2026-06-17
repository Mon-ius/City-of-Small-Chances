# Batch 63 — moonlight & lamplight on the water (FX_Light_WaterShimmer, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the lit night water.* Batch 61 hung a moon
over the harbour and Batch 62 pooled warm lamplight on the cobbles, but the biggest surface in the
scene — the harbour water — stays dead-flat and dark at night, reflecting nothing of the moon or the
lamps above it. This batch lays soft **shimmering reflections on the water**: a cool **moonglade** in
the open west water under the moon and warm **lamp-glints** just past the sea-wall by the lamps, each
a flat **additively-blended** decal on the water surface, **tinted per-instance** (cool silver / warm
amber) and faded in with the night — so the water finally catches the light it sits beneath. **codex
generates + luminance-keys + logs only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator
wires it into `world.js` + `daycycle.js`.)

## One neutral texture, tinted & instanced

ONE neutral pale-silver shimmer texture is generated and reused: tinted **cool** for the moonglade and
**warm** for the lamp glints, scaled long for the moon and small for the lamps. Additive blending
means the black surround adds nothing and only the glints brighten the water; a neutral texture tints
cleanly either way.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background (the Batch-49/61/62 idiom): brightness becomes opacity.
A gain curve lifts the bright glints and fades the scatter; the pure-black surround drops to fully
transparent. Keep the RGB a **neutral pale silver** (not coloured) so the per-instance tint reads.

## What to make — ONE water shimmer

1. **`FX_Light_WaterShimmer`** — a loose vertical column of broken horizontal light glints (a
   reflection shattered by ripples) on dark water, brightest down the centre, scattering and fading
   to pure black at the edges. **SQUARE** (1024×1024), centred with empty black all around.
   (BLACK background → luminance alpha.)

No moon, no lamp, no boat, no land, no readable text — just broken pale glints on dark water.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch63/FX_Light_WaterShimmer_raw.png`. Prompt is in `tools/gen/prompts/batch63.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha neutral shimmer

Run `tools/gen/postprocess_batch63.sh` (luminance→alpha, gain curve, keeps the pale neutral RGB,
quantised) → clean RGBA shimmer: **alpha-0 corners, a bright centre column, broken glints fading
out**, longest side 512. Output to **`assets/sprites/fx/`** as `FX_Light_WaterShimmer.png` (8-bit
RGBA). Tune `SHIMMER_GAIN` (default 2.2) up if the centre is not bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **neutral pale centre** (low hue
spread), centre alpha, broken/soft (not a solid disc), longest side 512, visible fraction, file size,
and a one-line note that it reads as light shimmering on water with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 63 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
