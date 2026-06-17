# Batch 66 — the lighthouse shines (FX_Light_Beacon)

ONE bright beacon-flare FX on a SOLID BLACK background (luminance→alpha, the Batch-49/61/62/63/64/65
idiom — NOT a chroma key). The far-shore lighthouse (`PROP_Shore_Lighthouse`) stands at the harbour
mouth but its lantern never lights — at night it is a dark tower over dark water. This flare is the
beacon: a small intense warm-white navigation light hung at the lantern, **additively blended** and
faded in with the night — so the harbour mouth finally has its guiding light. One texture, one
placement; its opacity rides the day cycle's night-blend weight (dark by day, full at deep night).

## Size / framing

- `image_gen` size **1024×1024**, square. The flare centred with empty pure-black all around so the
  halo and glints have room to fade smoothly to nothing.

## The prompt

> A small intense BEACON of warm-white light on a SOLID PURE-BLACK #000000 background, painterly
> game-art texture (not photoreal), centred — the kind of bright navigation light a distant lighthouse
> throws across dark water at night. At the very centre a tiny brilliant WHITE-GOLD core (roughly
> #fff4dc), wrapped in a soft round warm-white halo that grades smoothly outward and fades evenly into
> pure black at the edges. From the core, faint thin glints of light radiate — a soft vertical streak
> and a soft horizontal streak (a gentle four-point star-glint), and the barest hint of a diffuse
> bloom — so it reads as a brilliant point of light, not a flat disc. Warm-white and gold over near-
> black, clean and luminous, NO cool blue, NO green, NO saturated colour, NO lens-ring artefacts. The
> beacon is centred. No lighthouse, no tower, no land, no horizon, no boats, no people, no objects, no
> text, no letters, no numbers, no watermark. Solid pure black everywhere except the bright beacon and
> its soft glints.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch66/FX_Light_Beacon_raw.png`. (If an `image_gen` call returns a server error,
just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha warm-white flare

Run `tools/gen/postprocess_batch66.sh` (luminance→alpha gain curve, keeps the warm-white RGB,
quantised) → clean RGBA flare: **alpha-0 corners, a brilliant warm-white core, soft halo + faint
glints fading out**, longest side 512. Output to **`assets/sprites/fx/`** as `FX_Light_Beacon.png`
(8-bit RGBA). Tune `BEACON_GAIN` (default 2.4) up if the core is not bright/opaque enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **warm-white centre** (R≥G≥B), centre
alpha, soft halo (not a hard disc), longest side 512, visible fraction, file size, and a one-line note
that it reads as a bright beacon of light with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 66 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
