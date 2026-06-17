# Batch 64 — firelight from the brazier (FX_Light_BrazierGlow)

ONE hot fire-glow FX on a SOLID BLACK background (luminance→alpha, the Batch-49/61/62/63 idiom — NOT
a chroma key). The dockers' coal brazier on the quay glows by its own albedo but throws no light on
anything around it. This glow is laid flat on the cobbles around the brazier (a hot ground pool) AND
stood as a soft halo of firelight rising off the coals, both **additively blended** and fading in
with the night — so the brazier finally casts heat-light on the stones and into the air around it.
One texture, two uses; its opacity rides the day cycle's lamp intensity (off by day, full at night).

## Size / framing

- `image_gen` size **1024×1024**, square. The glow centred with empty pure-black all around so it has
  room to fade smoothly to nothing — and so it works equally as a flat ground pool or an upright halo.

## The prompt

> A soft round glow of hot firelight on a SOLID PURE-BLACK #000000 background, painterly game-art
> texture (not photoreal), centred. At the very centre a small fierce WHITE-GOLD hot core (roughly
> #fff1c8), grading out through bright glowing ORANGE (#ff9a3c) into deep EMBER-RED (#c8401a) and then
> fading smoothly and evenly into pure black at the edges — a strong radial falloff, no hard rim, no
> visible circle outline, just a hot heart cooling to dark. Scattered through the glow, a few faint
> broken ORANGE ember-sparks and flecks where coals throw light, so it reads as living fire-light
> rather than a flat disc — but keep it soft and mostly smooth, the sparks subtle. Hot, saturated,
> atmospheric — white-gold, orange and ember-red over near-black, HOTTER and more orange-red than a
> gas lamp, NO cool colours, NO blue, NO green. The glow is centred and round. No brazier, no fire
> basket, no coals object, no flame shapes, no smoke, no people, no objects, no horizon, no sky, no
> text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft hot glow.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch64/FX_Light_BrazierGlow_raw.png`. (If an `image_gen` call returns a server
error, just retry — it succeeds on a later attempt.)

## Post-process

`tools/gen/postprocess_batch64.sh` (luminance→alpha gain curve, keeps the hot orange RGB, quantised)
→ clean RGBA glow: **alpha-0 corners, a bright hot centre, a soft halo fading out**, longest side
512. Output `assets/sprites/fx/FX_Light_BrazierGlow.png` (8-bit RGBA). Tune `BRAZIER_GAIN` (default
2.2) up if the centre is not bright/opaque enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **hot centre** (R>G>B, strongly warm),
centre alpha, soft-gradient (not a hard disc), longest side 512, visible fraction, file size, and a
one-line note that it reads as a soft hot pool of firelight with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 64 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
