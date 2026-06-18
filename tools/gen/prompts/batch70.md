# Batch 70 — the up-stroke wing pose, so the soaring gulls can flap (PROP_Gull_FlyingUp)

A second flight frame for the harbour's soaring gulls. Batch 43 painted ONE flying gull
(`PROP_Gull_Flying` — wings level in a broad glide) and the soarers have hung **frozen** in the
sky ever since, even as the audio bed cries with gulls on the wing. This batch adds the **up-stroke**:
the same herring gull with its wings **raised high above the body in a deep upbeat (a tall V)**, so
alternating Flying↔FlyingUp on a slow cycle reads as a wingbeat. The existing `PROP_Gull_Flying` is a
**head-on** glide (the gull flying toward you, seen slightly from above, wings spread level and wide), so
this up-stroke must be the **SAME head-on, slightly-from-above view** — only with the wings lifted — or
the flap would snap the bird 90°. Same green chroma key as Batch 43.

Key colour: GREEN `#00ff00` (the Batch-43 cutout idiom — background extraction, NOT luminance→alpha).

## Size / framing

- `image_gen` size **1024×1024**, square raw. The gull centred, **head-on toward the viewer and seen
  slightly from above**, wings raised UP into a tall V — wrists high, wingtips reaching toward the top
  corners — body foreshortened, white breast to camera, bill low at centre. Generous padding so the
  raised wingtips don't touch the frame edge. The postprocess crops and pastes it onto the SAME 384×192
  (2:1) canvas as `PROP_Gull_Flying`, so the two frames register and the flap doesn't make the bird jump.

## The prompt

> Use case: background-extraction
> Asset type: game prop cutout sprite, PROP_Gull_FlyingUp raw source
> Primary request: A single European herring gull flying HEAD-ON toward the viewer and seen slightly from
> above, on the UP-STROKE of a wingbeat: both wings raised high above the body into a deep upward V, wrists
> lifted and primary wingtips sweeping up toward the top corners, the body foreshortened and near-vertical
> with the white breast facing the camera, the head and yellow bill toward the viewer low at the centre.
> This is the up-beat companion to a front-on gliding gull (whose wings are spread level and wide), so it
> must be the SAME head-on, slightly-from-above view, only with the wings lifted.
> Scene/backdrop: perfectly flat solid #00ff00 chroma-key background only.
> Subject: classic harbour gull with white head, white breast and underside facing the camera, pale grey
> upper wings, black wingtips with small white spots, yellow bill with a red gonys spot, pale eye; legs
> tucked subtly under the body, no green or teal anywhere on the bird.
> Style/medium: painterly realistic cutout prop matching the period harbour game sprites, natural and
> weathered, not cartoon, not logo, not photoreal studio.
> Composition/framing: symmetric head-on view from slightly above, wings raised into a tall upbeat V,
> generous padding so the raised wingtips stay clear of every frame edge, single bird only.
> Lighting/mood: even diffuse restrained daylight, muted period-harbour palette.
> Constraints: the background must be one uniform pure #00ff00 colour with no shadows, gradients, texture,
> reflections, floor plane, or lighting variation. No cast shadow, no contact shadow, no second bird, no
> props, no scene, no text, no numbers, no letters, no watermark. Do not use #00ff00, green, or teal
> anywhere in the bird.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch70/PROP_Gull_FlyingUp_raw.png`. (If an `image_gen` call returns a server error,
just retry — it succeeds on a later attempt.)

## Post-process — green chroma key (the Batch-43 gull pipeline)

Run `tools/gen/postprocess_batch70.sh` (the same `remove_chroma_key.py` soft-matte + despill as Batch 43,
then bbox-crop, scale to longest 384, despill residual green, quantise 192, paste centred on a 384×192
canvas, force alpha-0 corners) → clean RGBA gull cutout. Output to **`assets/sprites/props/`** as
`PROP_Gull_FlyingUp.png` (8-bit RGBA).

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **384×192** canvas, edge green-fringe %
(should be near zero), coverage %, file size, and a one-line note that it reads as a gull on the up-stroke
with wings raised, no green fringe and no legible text.

## Log (no git, no `src/`)

Append **one** Batch 70 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
