# Batch 61 — a moon over the harbour (FX_Sky_Moon, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the night sky.* The day cycle runs a full
dawn→midnight arc and the painted `SKY_Atmos_Night` panel blends in after dusk, but the night sky
is nearly featureless (a sampling of the night panel found ~140 faint bright pixels in a million and
no real moon). A harbour night wants a moon. This batch adds ONE glowing moon as a self-lit
billboard high over the water, its **opacity driven by the day cycle's night-blend weight** — so it
is invisible by day, fades in through dusk, hangs full at deep night, and lingers faint at dawn,
exactly tracking the painted sky it sits in front of. **codex generates + luminance-keys + logs
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires it into `world.js` +
`daycycle.js`.)

## Match the existing sky-FX style

The moon is a sky element like the drifting cloud cutouts `assets/sprites/sky/FX_Sky_Cloud_*.png`
— painterly, soft, atmospheric, muted. Paint it cool and quiet: a pale silver-grey full disc with
faint maria and a soft diffuse halo, never a bright cartoon moon, never a saturated colour.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background. The moon is composited by **luminance→alpha** (the
Batch-49 smoke idiom): brightness becomes opacity, so the glowing disc + soft halo carry alpha and
the pure-black surround drops to fully transparent. A gain curve lifts the disc (incl. its faint
grey maria) to solid opacity while only the diffuse halo fades. Keep the **whole disc evenly lit**
(a full round moon, no crescent, no harsh black shadow on the face) so nothing on the disc keys out.

## What to make — ONE moon

1. **`FX_Sky_Moon`** — a softly glowing full moon, pale silver-grey with faint subtle maria and a
   gently cratered face, wrapped in a soft pale halo that fades smoothly into pure black. **SQUARE**
   (1024×1024), the disc centred with empty black all around so the halo has room to fade. (BLACK
   background → luminance alpha.)

No readable text/numbers/letters; no stars, no clouds, no landscape — just the moon and its glow.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch61/FX_Sky_Moon_raw.png`. Write your prompt to `tools/gen/prompts/batch61.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha glowing disc

Run `tools/gen/postprocess_batch61.sh` (luminance→alpha, gain curve, keeps the moon's true
silver-grey, quantised) to produce a clean RGBA moon: **alpha-0 corners, solid-opaque disc centre,
soft halo fading out**, square, **longest side 512**. Output to **`assets/sprites/sky/`** as
`FX_Sky_Moon.png` (8-bit RGBA). Tune `MOON_GAIN` (default 2.6) up if the disc centre is not opaque.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **opaque disc centre**, square
dimensions (longest side 512), visible-pixel fraction, file size, and a one-line note that it reads
as a glowing moon with a soft halo and no legible text.

## Log (no git, no `src/`)

Append **one** Batch 61 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
