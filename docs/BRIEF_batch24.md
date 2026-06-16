# codex task — Batch 24: a grey overcast sky for wet days (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, the Batch-23 log line, and look at
the three painted sky panels you'll be joining: `assets/sprites/sky/SKY_Atmos_{Day,Dusk,Night}.png`**
(the clear day/dusk/night skies now cross-faded over the dome by the clock). Match their painterly
style, framing and format exactly.

This batch delivers the **live slice of fx-004 — a weather-reactive overcast sky.** The game already
has a deterministic weather cycle (rain/fog days) and a rain overlay, but on a wet day the rain
currently falls over a *clear blue sky*. This one panel fixes that: the orchestrator will lay it as a
fourth sky dome **in front of** the day/dusk/night panels and fade it in by the day's wetness, so wet
days get a proper grey overcast behind the rain.

## The 1 overcast panel (generate large, OPAQUE — no transparency) → `assets/sprites/sky/`

A **vertical overcast-stratus sky, zenith at the TOP, horizon toward the BOTTOM**, in exactly the same
framing/format as the Batch-23 panels. It must be **horizontally seamless / tileable left-to-right**
(it wraps around the dome) and **horizontally near-uniform** (no sun break, no blue patches — fully
clouded over). Put the meaningful sky in the **top ~60%**; the bottom ~40% is below the horizon and
never seen. **No text, no sun disc, no foreground, no horizon scenery — sky only.**

1. **SKY_Atmos_Overcast** — a soft, featureless, fully-clouded **grey stratus** sky. Cool neutral grey
   at the zenith easing to a slightly **brighter, faintly warm pale-grey haze at the horizon** (diffuse
   daylight through cloud). Gentle, soft cloud mottling / banding — heavy, low, even cloud cover, the
   light flat and shadowless. No blue, no warm sunset colour, no stars — just a calm, damp, overcast
   working-port sky. (It will be faded in *over* the coloured sky at partial opacity, so keep it a clean
   mid-to-light grey — neither pure white nor near-black.)

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate **tall (portrait, e.g. 1024×2048 or the nearest portrait size the skill offers)**,
  full-frame sky, no border. **Smoke-test:** generate it as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep the raw generation in `tools/gen/source_batch24/` (gitignored), named `Overcast.png`.

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch24.sh` that **reuses the Batch-23 recipe**
(`tools/gen/postprocess_batch23.sh`): resize to **1024×1024** (`-resize 1024x1024!`),
`-colorspace sRGB -depth 8`; make it **horizontally seamless** (roll 50% on x, feather only the centred
vertical seam with a narrow horizontal blur, roll back — vertical gradient untouched); flatten to
**opaque RGB** (`-alpha off -background gray -flatten`); quantise small (`-colors 128 -define
png:compression-level=9`); output `assets/sprites/sky/SKY_Atmos_Overcast.png`.

Verify with Pillow: final is **1024×1024 opaque**; left/right edge columns match closely (report mean
abs diff — proves the seam is gone); the image is **near-neutral grey** (per-row R≈G≈B, low saturation
— report the mean channel spread) and **not too dark/not too bright** (report mean luma, target ~120–
175); and brighter toward the horizon than the zenith. Report size + these checks. Target < 300 KB.

Final name (match exactly) → `assets/sprites/sky/SKY_Atmos_Overcast.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No text, no sun disc, no foreground — sky only.** Horizontally seamless + near-uniform, fully grey
  overcast (no blue, no sunset, no stars).
- Final is **1024×1024 opaque RGB**, horizontal seam removed, near-neutral grey.

## Deliverables checklist
- 1 opaque PNG (name above), `tools/gen/prompts/batch24.md`, `tools/gen/postprocess_batch24.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, payload size, and the size + opaque + edge-match + neutral-grey + luma checks). Do NOT change
  any checkbox.

## When done
Print the file you created with its size and confirm 1024×1024 opaque, seam removed, near-neutral grey
in the target luma band. Do not run git; the orchestrator reviews, wires the overcast dome to the
weather cycle, and commits.
