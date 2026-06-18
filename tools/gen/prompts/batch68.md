# Batch 68 — the sun on the water (FX_Light_SunGlitter)

ONE vertical band of bright white-gold SUN SPARKLES on a SOLID BLACK background (luminance→alpha, the
Batch-49/61/62/63/64/65/66/67 idiom — NOT a chroma key). The last batches lit the NIGHT (moon, lamp
pools, water reflections, brazier, lighthouse, boat lanterns); this one works the DAY. The harbour
water sits flat and dead under bright midday sun — but real water dazzles with broken sun-glitter. This
glitter is the daytime counterpart to the Batch-63 night moonglades: bright specular sparkle dancing on
the rippled water, **additively blended** and faded in with the DAY (brightest at midday, fading at
dawn/dusk, ~0 at night). Same billboard idiom as the moonglades — the quay camera sees the water EDGE-
ON, so a flat decal foreshortens to nothing; a light-path reads as a shimmering column climbing from the
waterline. One texture, instanced across the open west water; its opacity rides the day-blend weight.

## Size / framing

- `image_gen` size **1024×1024**, square. The sparkle column centred with empty pure-black all around
  so the glints fade smoothly to nothing at the top, bottom and sides.

## The prompt

> A vertical band of brilliant WHITE-GOLD SUN SPARKLES on a SOLID PURE-BLACK #000000 background,
> painterly game-art texture (not photoreal), centred — the dazzling broken path of bright midday
> sunlight dancing on rippled water (a sun-glitter reflection). Many small bright specular glints —
> short broken horizontal dashes and flecks of warm white light — scattered down a roughly vertical
> column, densest and brightest at the centre and thinning as they climb and fall, fading evenly into
> pure black at the top, bottom and sides. Bright warm-white and pale gold sparkle over pure black,
> dazzling and clean, like sun glittering on water, NO cool blue, NO green, NO single hard disc, NO sun
> shape, NO horizon line, NO lens flare rings. The glittering column is centred. No water, no sea, no
> boat, no land, no people, no objects, no text, no letters, no numbers, no watermark. Solid pure black
> everywhere except the bright scattered sun-sparkles.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch68/FX_Light_SunGlitter_raw.png`. (If an `image_gen` call returns a server error,
just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha white-gold glitter

Run `tools/gen/postprocess_batch68.sh` (luminance→alpha gain curve with a hard floor so the glints stay
BROKEN, keeps the warm-white RGB, quantised) → clean RGBA glitter: **alpha-0 corners, bright broken
white-gold sparkles down a column, fading out**, longest side 512. Output to **`assets/sprites/fx/`** as
`FX_Light_SunGlitter.png` (8-bit RGBA). Tune `GLITTER_GAIN` (default 2.2) up if the sparkles are not
bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **bright white-gold sparkle** (max alpha,
R≥B, not too amber), longest side 512, the column aspect, visible fraction, file size, and a one-line
note that it reads as broken sun-sparkles on water with no sun shape and no legible text.

## Log (no git, no `src/`)

Append **one** Batch 68 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
