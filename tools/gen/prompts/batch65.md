# Batch 65 — mist on the water (FX_Weather_WaterMist)

ONE soft mist-band FX on a SOLID BLACK background (luminance→alpha, the Batch-49/61/62/63/64 idiom —
NOT a chroma key). Low banks of it hug the harbour water and drift, faded in at the cool ends of the
day (a misty dawn, an evening haze rising) and clearing at bright midday — so the water finally
breathes mist in the morning and at dusk. One neutral pale texture, instanced across the near water;
its opacity rides a new day-cycle mist curve (peak dawn/dusk, ~0 at midday).

## Size / framing

- `image_gen` size **1024×1024**, square. A soft, WIDE, low horizontal bank of mist sitting across
  the middle, with empty pure-black above and below so it has room to feather softly to nothing.

## The prompt

> A soft low bank of pale drifting MIST on a SOLID PURE-BLACK #000000 background, painterly game-art
> texture (not photoreal), centred as a wide horizontal band. A gentle, wispy, uneven fog — brightest
> and densest through the middle of the band and feathering smoothly and softly to pure black above,
> below and at the ends, with torn, ragged, drifting edges (never a hard rim, never a solid bar). The
> colour is a NEUTRAL pale silver-white (roughly #e9edf0), cool and faint like sea-mist at first light
> — soft greys and whites only, NO warm tint, NO blue, NO green, NO colour cast, so it tints and lights
> neutrally. Thin and translucent in places, thicker in soft clots in others, so it reads as real
> rolling mist over water rather than a flat smear. Atmospheric, quiet, low-contrast — pale mist over
> near-black. No water, no horizon, no boats, no land, no sky, no people, no objects, no text, no
> letters, no numbers, no watermark. Solid pure black everywhere except the soft pale bank of mist.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch65/FX_Weather_WaterMist_raw.png`. (If an `image_gen` call returns a server
error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha neutral mist

Run `tools/gen/postprocess_batch65.sh` (luminance→alpha, soft gain curve, keeps the pale neutral RGB,
quantised) → clean RGBA mist: **alpha-0 corners, a soft pale band, torn edges feathering out**,
longest side 512. Output to **`assets/sprites/fx/`** as `FX_Weather_WaterMist.png` (8-bit RGBA). The
mist is meant to be SOFT and semi-transparent (the engine scales its overall density), so a moderate
centre alpha is correct — tune `MIST_GAIN` (default 1.8) only if it is barely visible.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **neutral pale band** (low hue spread),
centre alpha, soft/torn (not a hard bar), longest side 512, visible fraction, file size, and a
one-line note that it reads as a soft bank of mist with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 65 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
