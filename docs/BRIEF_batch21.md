# codex task — Batch 21: weather over the harbour (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**fx-002**), and the full-screen-FX reference pipeline `tools/gen/postprocess_batch14.sh`** (Batch 14
turned full-frame cards into overlays whose **alpha is derived from their own luminance** — bright
feature → opaque, dark background → transparent). Match the established warm, painterly,
stylised-realism finish.

This batch delivers **fx-002 — the weather FX cards**: the rain and fog that move over the harbour on
a grey, wet day. The walkable world already runs a continuous day cycle with fog/atmosphere; the
orchestrator will wire these into a `#hud-weather` overlay driven by the day so some days dawn
overcast and rainy and then clear. **Design intent (grounded, never theatrical):** real working-port
weather — a soft drift of rain, a low cool mist off the water; atmospheric, never a video-game
storm or a strobe.

## The 3 full-screen cards (1024×1024 generated, luminance→alpha) → `assets/sprites/fx/`

**Generate each as bright features on a near-BLACK background** (so the post-process can turn
luminance into alpha — black becomes transparent, the bright rain/mist becomes visible). Full-frame,
edge-to-edge, **no subjects, no scenery, no horizon** — pure weather/atmosphere fields stretched to
any screen aspect. No text, ever.

1. **FX_Rain_Streaks** — fine, **evenly distributed** pale rain: thin, slightly motion-blurred,
   near-vertical (a touch of diagonal) rain streaks scattered uniformly across the **whole** frame on
   black — **no gradient, no clumping**, the same density top-to-bottom (it will be scrolled in a tight
   loop, so even coverage is essential). Streaks pale cool-white, varied length, light and airy — a
   drift of rain, not a downpour.
2. **FX_Weather_Fog** — a soft cool grey-blue **fog/mist veil**: low-frequency drifting mist, a little
   **denser toward the bottom** (ground/water mist rising) easing to thin at the top, gentle internal
   wisps. Bright where the mist is thick (→ opaque), dark in the gaps (→ clear). Calm, cool, low.
3. **FX_Rain_Mist** — a lighter, wispier **rain-haze/spray** layer: faint near-white cool wisps and a
   soft overall haze, thinner and airier than the fog (it layers *over* heavy rain for depth). Mostly
   dark (mostly transparent) with delicate bright wisps.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, bright-on-black, full-frame.
- **Smoke-test first:** generate **FX_Weather_Fog** as your very first action and confirm a PNG lands
  in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server error —
  just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch21/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch21.sh` reusing `postprocess_batch14.sh`'s
**luminance→alpha** approach: for each card, **alpha = its own luminance** (bright feature → opaque,
black → transparent), keep the RGB (tint it cool/pale as generated), downsize to **512×512**, and cap
the alpha per card so nothing fogs the view opaque:
- **FX_Rain_Streaks**: alpha = luminance, **light blur 0x1** only (keep the streaks crisp), cap alpha **0.65**.
- **FX_Weather_Fog**: alpha = luminance, blur **0x8** (soft), cap alpha **0.60**.
- **FX_Rain_Mist**: alpha = luminance, blur **0x10** (very soft), cap alpha **0.42**.

Verify with Pillow: each final is **512×512 RGBA**; the corners (black background) are **alpha ≈ 0**
(transparent); the bright features carry alpha up to the cap; FX_Rain_Streaks has **roughly even**
opaque coverage top-half vs bottom-half (no strong gradient — it must scroll seamlessly). Keep each
small.

Final names (match exactly) → `assets/sprites/fx/`:
- `FX_Rain_Streaks.png`, `FX_Weather_Fog.png`, `FX_Rain_Mist.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No text, no subjects, no scenery** — pure weather/atmosphere fields. No strobe/high-contrast
  flashing; soft and low.
- Every final is **512×512 RGBA** with transparent (alpha≈0) corners and alpha capped as above.

## Deliverables checklist
- 3 RGBA PNGs (names above), `tools/gen/prompts/batch21.md`, `tools/gen/postprocess_batch21.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each card's size + alpha-corner (≈0) + alpha-cap + the rain card's
  top/bottom even-coverage check). Do NOT change any checkbox.

## When done
Print every file you created with sizes and confirm each is 512×512 RGBA with transparent corners and
the capped alpha. Do not run git; the orchestrator reviews, wires the weather overlay into the live
day-cycle, and commits.
