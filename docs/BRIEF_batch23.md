# codex task — Batch 23: a painted sky over the harbour (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**fx-001**), and look at the existing sky-cloud cards in `assets/sprites/sky/FX_Sky_Cloud_*.png`**
(the drifting cloud billboards that will keep floating *over* what you paint). Match the game's warm,
painterly, stylised-realism dusk-harbour palette.

This batch delivers **fx-001 — three painted sky-atmosphere panels** that replace the flat
3-colour procedural gradient currently stretched over the sky dome. The orchestrator will load all
three onto the dome and **cross-fade between them as the in-game clock moves** (day → dusk → night),
with the existing clouds still drifting on top. So each panel is a full sky *mood*; together they are
the harbour's whole day.

## The 3 sky panels (generate large, OPAQUE — no transparency) → `assets/sprites/sky/`

Each is a **vertical sky gradient, zenith at the TOP, horizon toward the BOTTOM**, painted with real
painterly atmosphere (multi-stop scattering, soft cloud haze) — NOT a flat linear ramp. Critically,
each must be **horizontally seamless / tileable left-to-right** (it wraps all the way around the dome,
so the left and right edges must meet with no visible seam) and **horizontally near-uniform** (no
strong left/right asymmetry, no baked-in sun disc — the game draws its own moving sun and clouds).
Put the meaningful sky in the **top ~60%** of the image (that's what the player sees, zenith down to
the horizon); the bottom ~40% is below the horizon and never seen, so let it ease into a deeper
horizon haze. **No text, no sun disc, no foreground, no horizon scenery/buildings — sky only.**

1. **SKY_Atmos_Day** — a bright clear-day harbour sky. Deep clean blue at the zenith easing down
   through soft pale blue to a warm pale near-white haze at the horizon. A few very soft, high,
   wispy cirrus smears (subtle, horizontally seamless) — calm, airy, optimistic midday.
2. **SKY_Atmos_Dusk** — golden hour. Deep indigo-violet zenith easing down through warm rose and
   coral to a glowing **warm amber/orange horizon band** in the lower third (the sun's scatter, but
   NO sun disc). Soft warm-lit cloud haze catching the last light. Wistful, warm, the harbour's
   signature mood.
3. **SKY_Atmos_Night** — deep night. Near-black indigo zenith easing to a slightly lighter deep blue
   lower down, with a faint cool city-glow on the horizon. Scatter a gentle, believable **starfield**
   across the upper ~60% (small soft white/pale-blue stars, varied brightness, not a dense mat — a
   quiet working-port night sky). Calm, deep, a little lonely.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each **tall (portrait, e.g. 1024×2048 or the nearest portrait size the skill offers)**,
  full-frame sky, no border. **Smoke-test first:** generate **SKY_Atmos_Day** as your very first
  action and confirm a PNG lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call
  sometimes returns a server error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch23/` (gitignored), named `Day.png`, `Dusk.png`,
  `Night.png`.

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch23.sh` that, per panel:
- Resizes to **1024×1024** (`-resize 1024x1024!`), `-colorspace sRGB -depth 8`.
- **Makes it horizontally seamless** so the dome wrap shows no seam: roll the image 50% horizontally
  (`-roll +512+0`), feather just the now-centred vertical seam with a narrow horizontal blur applied
  through a centred vertical mask (a thin gradient band a few % wide), then roll back (`-roll -512+0`).
  A simple robust recipe: `magick in.png -roll +512+0 \( +clone -blur 0x6 \) \( -size 1024x1024
  gradient: -rotate 90 ... \) -composite -roll -512+0 out.png` — or any equivalent that blends a
  ~40px-wide band across x=512 only. The vertical gradient must be untouched (blend horizontally only).
- Flattens to **opaque RGB** (no alpha — it's the backmost dome): `-alpha off -background black -flatten`.
- Quantises small: `PNG24:` (or PNG8 if it stays clean) with `-colors 128 -define
  png:compression-level=9`. Sky gradients quantise very well; **but check the night starfield
  survives** quantisation (stars are small high-contrast points — if 128 colours muddies them, bump
  Night to 192 or skip its quantise). Target < 300 KB each.
- Output `assets/sprites/sky/SKY_Atmos_{Day,Dusk,Night}.png`.

Verify with Pillow: each final is **1024×1024**, **opaque** (no alpha channel, or all-255 if RGBA);
the **left and right edge columns match closely** (mean abs diff of column 0 vs column 1023 is small —
report it, it proves the horizontal seam is gone); the vertical gradient is monotonic-ish (top darker
zenith for night/dusk); and for **Night**, count bright pixels (luma > 200) in the top 60% and confirm
the starfield survived (> 80 star pixels). Report each panel's size + these checks.

Final names (match exactly) → `assets/sprites/sky/`:
- `SKY_Atmos_Day.png`, `SKY_Atmos_Dusk.png`, `SKY_Atmos_Night.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No text, no sun disc, no foreground/scenery — sky only.** Horizontally seamless + near-uniform.
- Each final is **1024×1024, opaque RGB**, horizontal seam removed.

## Deliverables checklist
- 3 opaque PNGs (names above), `tools/gen/prompts/batch23.md`, `tools/gen/postprocess_batch23.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each panel's size + opaque + edge-match (seam) + (for Night)
  star-count checks). Do NOT change any checkbox.

## When done
Print every file you created with sizes and confirm each is 1024×1024 opaque with a removed
horizontal seam (low edge diff) and Night's stars intact. Do not run git; the orchestrator reviews,
wires the three panels onto the dome with a clock-driven cross-fade, and commits.
