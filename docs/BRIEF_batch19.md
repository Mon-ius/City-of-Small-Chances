# codex task — Batch 19: the day turns over (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**fx-005**), and the full-screen-FX reference pipeline `tools/gen/postprocess_batch14.sh`** (Batch 14
made the screen-state **condition vignettes** — full-frame cards stretched edge-to-edge over the
world). Match the established warm, painterly, stylised-realism finish.

This batch delivers **fx-005 — the sleep / day-transition visual**: the wordless full-screen wash
that plays as the harbour's living clock rolls past midnight and a **new day breaks at dawn**. The
walkable world already runs a continuous day cycle (06:00→24:00, then it loops back to a 06:00 dawn
and the day counter ticks up); the orchestrator will wire these cards into that rollover so the night
veils the screen, time passes, and the world re-emerges into morning light. **Design intent
(the game's quiet, grounded tone):** this is rest and the ordinary turning of days — never flashy,
never a strobe; a soft, painterly *passage of time*, like sleep drawing the eyes closed and dawn
opening them again.

## The 3 full-screen cards (1024×1024 generated, OPAQUE) → `assets/sprites/fx/`

Unlike Batch 14's clear-centre vignettes, these are **full-frame, edge-to-edge painted fields with NO
transparent area** — the orchestrator animates each card's *opacity* in CSS to fade it in and out, so
the art is the whole rectangle (a flat, even composition that reads when stretched to any screen
aspect; keep the interesting gradient vertical/radial, nothing important jammed in a corner). **No
subjects, no objects, no horizon line of buildings — pure atmosphere/light fields.** No text, ever.

1. **FX_Trans_NightVeil** — a deep **night** field: indigo deepening to near-black, densest and
   darkest toward the edges, with a faint cool moon/starlight glow softening the upper area and gentle
   painterly cloud striations. The "lights going down" / eyes-closing veil. Calm, heavy, restful —
   dark enough to nearly cover the screen at full opacity.
2. **FX_Trans_DawnVeil** — a warm **dawn** field: soft amber, rose and pale gold, brightest and
   warmest from the **top** (the rising light) and easing down into a gentle haze, with the faintest
   suggestion of low light-rays/morning mist. The "morning comes" wash the world emerges through.
   Hopeful, gentle, golden — never garish or saturated-orange.
3. **FX_Trans_RestGrain** — a soft, even, low-contrast **neutral grey-blue mist/grain** field: a
   featureless drifting fog with a faint film-grain/cloud texture, no strong gradient. The "time
   passing" dissolve held briefly at the seam between night and dawn. Quiet, neutral, slightly
   luminous.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, a full-frame painted field (no chroma key — these are opaque
  atmosphere cards, not cutouts).
- **Smoke-test first:** generate **FX_Trans_RestGrain** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch19/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch19.sh`. This is **simpler than Batch 14** — these are
opaque veils, so there is **NO luminance→alpha keying**. For each card:
- `-resize 512x512!` (square; stretched 100%×100% full-screen at runtime), `-colorspace sRGB`,
- a **light** `-blur 0x5` (keep some painterly striation — these are low-frequency, so this stays
  tiny after PNG compression but must NOT be flattened to a featureless solid),
- force the card **fully opaque**: emit RGBA (`-define png:color-type=6`) with the **alpha channel
  set to 255 everywhere** (e.g. `-alpha set -channel A -evaluate set 100% +channel`),
- `-depth 8 -define png:compression-level=9 -strip`.

Verify with Pillow: each final is **512×512 RGBA**, alpha **min = 255** (fully opaque, NO transparent
pixels — the opposite of Batch 14), and the RGB mean reads the intended palette (NightVeil dark/cool,
DawnVeil warm/light, RestGrain neutral mid). Keep each card small (these compress to a few KB).

Final names (match exactly) → `assets/sprites/fx/`:
- `FX_Trans_NightVeil.png`, `FX_Trans_DawnVeil.png`, `FX_Trans_RestGrain.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No text, no subjects, no objects, no recognisable scenery** — pure light/atmosphere fields only.
- Every final is **512×512 RGBA, fully opaque** (alpha == 255 everywhere). No strobe/high-contrast
  flashing — soft, low-frequency, restful.

## Deliverables checklist
- 3 opaque full-screen PNGs (names above), `tools/gen/prompts/batch19.md`,
  `tools/gen/postprocess_batch19.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each card's size + alpha-min (255) + RGB-mean palette check). Do NOT
  change any checkbox.

## When done
Print every file you created with sizes and confirm each is 512×512 RGBA fully opaque with the
intended palette. Do not run git; the orchestrator reviews, wires the three veils into the live
day-cycle rollover, and commits.
