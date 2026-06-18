# Batch 69 — steam off the noodle pot (FX_Smoke_NoodleSteam)

ONE soft thin wisp of WHITE kitchen steam on a SOLID BLACK background (luminance→alpha, the Batch-49
chimney-smoke idiom — RGBA with alpha = brightness, NOT a chroma key). The harbour's heart is Mei's
noodle stall (a striped-awning market stall mid-street with a "steaming noodle bowl up on the counter"),
but the bowl never actually steamed. This wisp is that steam: delicate translucent vapour rising and
curling off the hot pot, hung at the bowl, billboarded so its soft shape always reads — a small living
touch on the central interactable, visible by day AND night. Softer and thinner than the Batch-49
rooftop woodsmoke (kitchen steam, not a chimney column).

## Size / framing

- `image_gen` size **1024×1024**, square. The steam wisp centred, rising up the frame, with empty pure-
  black all around so the tendrils feather off to nothing.

## The prompt

> A soft thin wisp of translucent WHITE kitchen STEAM rising on a SOLID PURE-BLACK #000000 background,
> painterly game-art texture (not photoreal), centred — the gentle vapour that rises off a hot noodle
> pot. Narrow and faint at the very bottom, curling and widening as it rises, breaking into a few soft
> feathered tendrils that thin out and fade evenly into pure black near the top. Delicate translucent
> pale-white vapour over pure black, wispy and airy, soft feathered edges (no hard outline). NOT thick
> smoke, NO dark grey, NO black soot, NO flame, NO sparks, NO pot, no bowl, no stove, no object, no
> land, no people, no text, no letters, no numbers, no watermark. Solid pure black everywhere except
> the soft rising white steam.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch69/FX_Smoke_NoodleSteam_raw.png`. (If an `image_gen` call returns a server error,
just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha soft steam

Run `tools/gen/postprocess_batch69.sh` (luminance→alpha, GENTLE gain so the vapour stays soft and
translucent, keeps the pale-white RGB, quantised) → clean RGBA wisp: **alpha-0 corners, a soft pale-
white steam column feathering out, fading to transparent**, longest side 512. Output to
**`assets/sprites/fx/`** as `FX_Smoke_NoodleSteam.png` (8-bit RGBA). Tune `STEAM_GAIN` (default 1.7) up
only if the wisp is too faint to read.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **pale-white vapour** (bright, low
saturation), max/mean alpha (it should be SOFT, not solid), the rising aspect (taller-ish than wide),
longest side 512, visible fraction, file size, and a one-line note that it reads as a soft steam wisp
with no soot, no flame and no legible text.

## Log (no git, no `src/`)

Append **one** Batch 69 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
