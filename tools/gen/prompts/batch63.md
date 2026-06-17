# Batch 63 — moonlight & lamplight on the water (FX_Light_WaterShimmer)

ONE neutral light-shimmer FX on a SOLID BLACK background (luminance→alpha, the Batch-49/61/62 idiom
— NOT a chroma key). It is laid flat on the harbour water and **additively blended**, then **tinted
per-instance** (cool silver for the moon's glade, warm amber for the lamps) and faded in with the
night — so the dead-flat night water finally catches the moon and the lamps. One texture, instanced a
handful of times.

## Size / framing

- `image_gen` size **1024×1024**, square. The shimmer centred with empty pure-black all around so it
  fades smoothly to nothing.

## The prompt

> Broken glints of light scattered across dark, gently rippling water — the wavering reflection of a
> single bright light on a calm water surface at night, painterly game-art texture (not photoreal),
> centred on a SOLID PURE-BLACK #000000 background. A loose vertical column of pale light made of
> many separate horizontal dashes, streaks and glints (the way a reflection shatters into ripples),
> brightest and densest down the centre line and scattering thinner toward the sides before fading
> smoothly into pure black at every edge — no hard outline, no solid disc, just broken wavelets of
> light on dark water. Keep it a NEUTRAL pale silver-white (so it can be tinted warm or cool later) —
> no strong colour, no saturation. Reads as light shimmering on rippling water. No moon, no lamp, no
> boat, no land, no horizon, no sky, no text, no letters, no numbers, no watermark. Solid pure black
> everywhere except the broken column of pale shimmering light.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch63/FX_Light_WaterShimmer_raw.png`. Prompt is in `tools/gen/prompts/batch63.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process

`tools/gen/postprocess_batch63.sh` (luminance→alpha gain curve, keeps the pale neutral RGB, quantised)
→ clean RGBA shimmer: **alpha-0 corners, a bright centre column, broken glints fading out**, longest
side 512. Output `assets/sprites/fx/FX_Light_WaterShimmer.png` (8-bit RGBA). Tune `SHIMMER_GAIN`
(default 2.2) up if the centre is not bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **neutral pale centre** (no strong hue),
centre alpha, broken/soft (not a solid disc), longest side 512, visible fraction, file size, and a
one-line note that it reads as light shimmering on water with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 63 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
