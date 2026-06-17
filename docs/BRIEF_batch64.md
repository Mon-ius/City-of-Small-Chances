# Batch 64 — firelight from the brazier (FX_Light_BrazierGlow, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the brazier finally throws light.* Batch 61
hung a moon, Batch 62 pooled lamplight on the cobbles, Batch 63 caught the light on the night water —
but the dockers' coal brazier out on the quay (`PROP_Quay_Brazier` at −9.8,14) glows by its own
albedo and throws **no light** on the stones around it or into the air, the same gap Batch 62 fixed
for the street lamps. This batch lays a **hot fire-glow** at the brazier: a hotter, more orange-red
ground pool on the cobbles around the coals AND a soft upright halo of firelight rising off the
basket, each **additively blended** and faded in with the night — so the fire finally casts heat on
the stones and into the dark. **codex generates + luminance-keys + logs only. Do NOT touch `src/`. Do
NOT run git.** (The orchestrator wires it into `world.js` + `daycycle.js`.)

## One hot texture, two uses

ONE hot fire-glow texture is generated and reused: laid **flat** on the cobbles as the ground pool
(the player looks DOWN at the quay, so a flat decal reads here — the Batch-62 lamp-pool idiom, NOT
the grazing-angle water of Batch 63), and stood **upright as a camera-facing billboard** as the halo
of light over the coals. Additive blending means the black surround adds nothing; hotter and more
orange-red than the gas-lamp pool so the fire reads apart from the lamps.

## Background — SOLID BLACK `#000000` (luminance→alpha, NOT a chroma key)

Generate on a **solid pure-black** background (the Batch-49/61/62/63 idiom): brightness becomes
opacity. A gain curve lifts the hot core and fades the falloff; the pure-black surround drops to fully
transparent. Keep the RGB **hot** — white-gold core through orange to ember-red.

## What to make — ONE fire glow

1. **`FX_Light_BrazierGlow`** — a soft round glow of hot firelight, white-gold at the very centre
   through bright orange to deep ember-red, fading to pure black at the edges, with a few faint broken
   ember-sparks. **SQUARE** (1024×1024), centred with empty black all around. (BLACK background →
   luminance alpha.)

No brazier, no fire basket, no coals object, no flame shapes, no smoke, no land, no readable text —
just the soft hot glow of firelight.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**, 1024×1024. Save the raw to
`tools/gen/source_batch64/FX_Light_BrazierGlow_raw.png`. Prompt is in `tools/gen/prompts/batch64.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on a later attempt.)

## Post-process — luminance→alpha hot glow

Run `tools/gen/postprocess_batch64.sh` (luminance→alpha, gain curve, keeps the hot orange RGB,
quantised) → clean RGBA glow: **alpha-0 corners, a bright hot centre, a soft halo fading out**,
longest side 512. Output to **`assets/sprites/fx/`** as `FX_Light_BrazierGlow.png` (8-bit RGBA). Tune
`BRAZIER_GAIN` (default 2.2) up if the centre is not bright enough.

Verify with Pillow and report: **RGBA**, **alpha-0 corners**, **hot centre** (R>G>B, strongly warm),
centre alpha, soft-gradient (not a hard disc), longest side 512, visible fraction, file size, and a
one-line note that it reads as a soft hot pool of firelight with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 64 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
