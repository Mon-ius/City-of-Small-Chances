# Batch 67 — the boats light their lanterns (FX_Light_BoatLantern)

ONE small soft warm AMBER lantern-glow FX on a SOLID BLACK background (luminance→alpha, the Batch-
49/61/62/63/64/65/66 idiom — NOT a chroma key). The moored vessels and near craft sit dark over the
water at night while the lamps, brazier and lighthouse all light up — a working harbour shows its boats'
running lanterns after dark. This glow is one hanging oil-lantern's warm pool of light, hung on the
vessels, **additively blended** and faded in with the night — so the harbour traffic carries warm
lights on the water. One texture, instanced on the ships; its opacity rides the night-blend weight
(dark by day, full at deep night). Warmer/amber and softer than the Batch-66 navigation beacon, and
with **no star-glints** — an oil lantern, not a lighthouse.

## Size / framing

- `image_gen` size **1024×1024**, square. The glow centred with empty pure-black all around so the
  amber halo fades smoothly to nothing.

## The prompt

> A small soft glow of warm AMBER lantern-light on a SOLID PURE-BLACK #000000 background, painterly
> game-art texture (not photoreal), centred — the warm pool of light a hanging oil lantern throws on a
> moored boat at night. At the very centre a small warm WHITE-GOLD core (roughly #ffd9a0), wrapped in a
> soft round AMBER glow (warm orange-gold, roughly #ffb060) that grades smoothly outward and fades
> evenly into pure black at the edges. A soft round bloom, NOT a hard disc, NO rays, NO star-glints, NO
> streaks — just a gentle warm lantern halo. Warm amber and gold over near-black, cosy and luminous, NO
> cool blue, NO green, NO white-cold light, NO lens-ring artefacts. The glow is centred. No lantern, no
> lamp, no boat, no rope, no land, no horizon, no people, no objects, no text, no letters, no numbers,
> no watermark. Solid pure black everywhere except the soft warm amber glow.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch67/FX_Light_BoatLantern_raw.png`. (If an `image_gen` call returns a server
error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha warm-amber glow

Run `tools/gen/postprocess_batch67.sh` (luminance→alpha gain curve, keeps the warm amber RGB,
quantised) → clean RGBA glow: **alpha-0 corners, a warm gold core, soft amber halo fading out**,
longest side 512. Output to **`assets/sprites/fx/`** as `FX_Light_BoatLantern.png` (8-bit RGBA). Tune
`LANTERN_GAIN` (default 2.6) up if the core is not bright/opaque enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **warm-amber ring** (R≥G≥B, R−B>20),
centre alpha, soft round halo (not a hard disc, no rays), longest side 512, visible fraction, file
size, and a one-line note that it reads as a soft warm lantern glow with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 67 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
