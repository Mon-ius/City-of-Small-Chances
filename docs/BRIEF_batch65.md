# Batch 65 — mist on the water (FX_Weather_WaterMist, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the misty harbour morning.* The last four
batches lit the NIGHT (moon, lamp pools, water reflections, brazier firelight); this one works the
OTHER end of the clock — the cool dawn and dusk. The harbour water sits flat and clear at every hour;
a real working harbour breathes **mist at first light** and a **haze rising at dusk**, burning off
under bright midday. This batch lays soft low **banks of sea-mist** drifting over the near water,
faded in by a new day-cycle mist curve (peak dawn/dusk, ~0 at midday) — so the morning harbour finally
wakes under mist. **codex generates + luminance-keys + logs only. Do NOT touch `src/`. Do NOT run
git.** (The orchestrator wires it into `world.js` + `daycycle.js`.)

## One neutral mist texture, instanced & drifting

ONE neutral pale-silver mist texture is generated and reused as a row of soft low banks hugging the
water, each a **camera-facing billboard** (the cloud/boat idiom, so the soft card always reads) with
**normal alpha blending** (mist VEILS what's behind it — it is not additive light). A neutral texture
lights cleanly under the dawn/dusk sun.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background (the Batch-49/61/62/63/64 idiom): brightness becomes
opacity. A soft gain curve lifts the mist band to a moderate, semi-transparent alpha (mist veils, it
is not opaque) and feathers the torn edges to nothing; the pure-black surround drops to fully
transparent. Keep the RGB a **neutral pale silver-white**.

## What to make — ONE mist band

1. **`FX_Weather_WaterMist`** — a soft, wide, low horizontal bank of pale drifting mist, densest
   through the middle and feathering with torn ragged edges to pure black above/below/at the ends.
   **SQUARE** (1024×1024), the band across the middle with empty black around. (BLACK background →
   luminance alpha.)

No water, no horizon, no boats, no land, no readable text — just a soft pale bank of mist.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch65/FX_Weather_WaterMist_raw.png`. Prompt is in `tools/gen/prompts/batch65.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha neutral mist

Run `tools/gen/postprocess_batch65.sh` (luminance→alpha, soft gain curve, keeps the pale neutral RGB,
quantised) → clean RGBA mist: **alpha-0 corners, a soft pale band, torn edges feathering out**,
longest side 512. Output to **`assets/sprites/fx/`** as `FX_Weather_WaterMist.png` (8-bit RGBA). Mist
is meant to be SOFT and semi-transparent (the engine scales overall density), so a moderate centre
alpha is correct — tune `MIST_GAIN` (default 1.8) only if barely visible.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **neutral pale band** (low hue spread),
centre alpha, soft/torn (not a hard bar), longest side 512, visible fraction, file size, and a
one-line note that it reads as a soft bank of mist with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 65 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
