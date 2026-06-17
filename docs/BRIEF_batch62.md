# Batch 62 — lamplight on the wet stones (FX_Light_LampPool, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the lit night quay.* The day cycle warms the
five street-lamp heads up after dusk (their `emissiveIntensity` rides the clock), and Batch 61 hung a
moon over the water — but the lamp-heads glow in the dark and cast **no light onto the ground**: the
cobbles stay flat-dark at night. This batch lays a soft warm **pool of lamplight on the wet stones**
beneath each lamp, **additively blended**, its opacity driven by the **same lamp intensity** the day
cycle already feeds the lamp-heads — so the quay floor lights up exactly when the lamps do (off by
day, brightening through dusk, full at deep night, easing at dawn). Together with the moon (sky lit)
the night quay finally reads as *lit*, not as glowing heads floating in the dark. **codex generates +
luminance-keys + logs only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires it into
`world.js` + `daycycle.js`.)

## One texture, instanced five times

ONE warm pool texture is generated and reused under all five lamps (z ∈ −28,−14,0,14,28 at x≈−9.0),
each a flat ground decal — tiny payload, identical glow. Additive blending means the black surround
adds nothing and only the warm pool brightens the cobbles.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background (the Batch-49 smoke / Batch-61 moon idiom): brightness
becomes opacity. A gain curve lifts the warm centre toward opaque and fades the soft falloff; the
pure-black surround drops to fully transparent. Keep the **warm amber RGB true** (do not flatten) so
the additive pool reads as honey-gold lamplight, not white.

## What to make — ONE light pool

1. **`FX_Light_LampPool`** — a soft round pool of warm amber lamplight cast top-down onto dark wet
   cobblestones, brightest at the centre, fading smoothly to pure black at the edges, with faint
   broken glints on the damp stones. **SQUARE** (1024×1024), the pool centred with empty black all
   around so the glow has room to fade. (BLACK background → luminance alpha.)

No lamp post, no people, no objects, no sky/horizon, no readable text/numbers/letters — just the warm
pool of light on stone.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch62/FX_Light_LampPool_raw.png`. Prompt is in `tools/gen/prompts/batch62.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha warm pool

Run `tools/gen/postprocess_batch62.sh` (luminance→alpha, gain curve, keeps the warm amber, quantised)
→ clean RGBA pool: **alpha-0 corners, a bright warm centre, a soft halo fading out**, longest side
512. Output to **`assets/sprites/fx/`** as `FX_Light_LampPool.png` (8-bit RGBA). Tune `POOL_GAIN`
(default 2.2) up if the centre is not bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **warm centre** (R>G>B), centre alpha,
soft gradient (not a hard disc), longest side 512, visible fraction, file size, and a one-line note
that it reads as a soft warm pool of lamplight with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 62 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
