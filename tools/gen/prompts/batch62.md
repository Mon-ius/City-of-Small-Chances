# Batch 62 — lamplight on the wet stones (FX_Light_LampPool)

ONE warm light-pool FX on a SOLID BLACK background (luminance→alpha, the Batch-49/61 idiom — NOT a
chroma key). It is laid flat on the cobbles beneath each quay lamp and **additively blended**, so the
lamp finally pools warm light on the wet stones at dusk and night. One texture, instanced under all
five lamps; its opacity rides the day cycle's lamp intensity (off by day, full at deep night).

## Size / framing

- `image_gen` size **1024×1024**, square. The pool centred with empty pure-black all around so the
  glow has room to fade smoothly to nothing.

## The prompt

> A soft round pool of warm lamplight cast straight down onto dark wet cobblestones, seen from
> directly overhead (top-down map view), painterly game-art texture (not photoreal), centred on a
> SOLID PURE-BLACK #000000 background. A warm amber-gold glow (the colour of a gas street lamp,
> roughly #ffd27d) is brightest at the very centre where the light lands and fades smoothly and
> evenly outward in a soft radial gradient into pure black at the edges — no hard rim, no visible
> circle outline, just a gentle falloff. Within the lit area, faint broken highlights and glints
> where the damp cobblestones and the seams between the stones catch the light, so it reads as a wet
> stone surface under a lamp rather than a flat disc. Muted, soft, atmospheric — warm amber and
> honey tones over near-black, NO cool colours, NO saturated neon. The lit pool is centred and round-
> to-slightly-oval. No lamp post, no lamp, no people, no objects, no horizon, no sky, no text, no
> letters, no numbers, no watermark. Solid pure black everywhere except the soft warm pool of light.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch62/FX_Light_LampPool_raw.png`. (If an `image_gen` call returns a server error,
just retry — it succeeds on a later attempt.)

## Post-process

`tools/gen/postprocess_batch62.sh` (luminance→alpha gain curve, keeps the warm amber RGB, quantised)
→ clean RGBA pool: **alpha-0 corners, a bright warm centre, a soft halo fading out**, longest side
512. Output `assets/sprites/fx/FX_Light_LampPool.png` (8-bit RGBA). Tune `POOL_GAIN` (default 2.2) up
if the centre is not bright/opaque enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **warm centre** (R>G>B), centre alpha,
soft-gradient (not a hard disc), longest side 512, visible fraction, file size, and a one-line note
that it reads as a soft warm pool of lamplight with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 62 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
