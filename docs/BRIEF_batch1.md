# codex task — Batch 1: Old Harbour core surfaces (GPT-Image-2)

You are generating committed image **assets** for a Three.js browser game (City of Small
Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`** and follow its art
direction, palette, naming, and technical standards exactly.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. Generate
  each surface as a painterly **seamless tileable texture**, then move the chosen output from
  `$CODEX_HOME/generated_images/…` into this repo under `assets/textures/harbour/`.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5` — there is no API
  key here. If the built-in `image_gen` tool is unavailable in this non-interactive `exec`
  environment, **STOP and write a clear note** explaining that (and do nothing else) — do not try
  the CLI fallback.
- **Smoke-test first:** generate the cobblestone albedo as your very first action and confirm a
  PNG actually lands in `$CODEX_HOME/generated_images/…` before generating the rest.

## Generation specs
GPT-Image-2's minimum is ~655k px, so **generate at 1024×1024**, then downscale to 512 in
post. Prompt for a **top-down, evenly-lit, seamless tiling** texture with **no perspective, no
vignette, no single light source, no border** (so it tiles). Match the dusk harbour palette.
Generate albedo for each of these 4 surfaces:
1. **Cobblestone** quay ground — rounded wet stones with grout, weathered, slightly painterly.
2. **PlankWood** — weathered dock boards: grain, plank gaps, nail marks.
3. **Plaster** — aged stucco facade: cracks, water stains, warm tone.
4. **Water** — deep teal harbour water surface, gentle ripples (for a scrolling/animated normal).

Plus a **window atlas** (1024×1024, a clean 4×4 grid of distinct lit/unlit window variants on
buildings — frames + glass, evenly spaced).

## Post-processing (local ImageMagick — no new deps)
For each of the 4 surfaces, from the generated 1024 albedo produce, in `assets/textures/harbour/`,
named `ENV_Harbour_<Object>_<map>.png`:
- `_albedo.png` — downscaled to **512×512**, seam-corrected so it **tiles seamlessly** (e.g.
  `-virtual-pixel tile` blur-blend on the seams, or offset-and-heal). Verify by compositing a
  50%-offset copy.
- `_normal.png` — tangent-space (OpenGL Y+), 512×512, derived from the albedo's luminance/height
  (Sobel/`-morphology Convolve`). Water gets a stronger, ripple-like normal.
- `_orm.png` — 512×512, R=AO (from albedo cavities/luminance), G=roughness (water low ~0.2,
  stone/wood/plaster high ~0.7–0.9), B=metalness (0 for all of these).

For the window atlas, produce `ENV_Harbour_WindowAtlas_albedo.png` (512×512) and
`ENV_Harbour_WindowAtlas_emissive.png` — a mask where lit panes are warm-white and everything
else black, so the engine can glow windows at night.

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled separately.
- Post-process only with pre-installed tools (ImageMagick / rsvg / python3 / Node built-ins).
  **No `npm install`, no new dependencies.**
- Keep total Batch-1 PNG payload small (8-bit, quantise/optimise).

## Deliverables checklist
- `assets/textures/harbour/` with the 4 surfaces × {albedo, normal, orm} + window atlas
  {albedo, emissive} = **14 PNGs**.
- `tools/gen/prompts/batch1.md` — the exact GPT-Image-2 prompts you used (for reproducibility).
- `tools/gen/postprocess_batch1.sh` — the ImageMagick post-processing pipeline (re-runnable
  against the source albedos), + a short `tools/gen/README.md`.
- Tick the **Batch 1** item in `docs/ART_PLAN.md` and append a one-line note to its Progress log
  (what you generated, that the built-in image_gen worked, total payload size).

## When done
Print the full list of files you created with their sizes, and confirm the textures tile.
Do not run git; the orchestrator will review and commit.
