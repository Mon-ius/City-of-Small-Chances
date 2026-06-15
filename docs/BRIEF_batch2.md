# codex task — Batch 2: Harbour props (GPT-Image-2)

You are generating committed image **assets** for a Three.js browser game (City of Small
Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`** and follow its art
direction, palette, naming, and technical standards exactly. Batch 1 (core surfaces) is already
done and committed under `assets/textures/harbour/` — match its quality and pipeline.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. Generate
  each as a painterly **seamless tileable texture**, then move the chosen output from
  `$CODEX_HOME/generated_images/…` into this repo under `assets/textures/harbour/`.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5` — there is no API
  key here. If the built-in `image_gen` tool is unavailable in this non-interactive `exec`
  environment, **STOP and write a clear note** explaining that (and do nothing else) — do not try
  the CLI fallback.
- **Smoke-test first:** generate the painted-metal albedo as your very first action and confirm a
  PNG actually lands in `$CODEX_HOME/generated_images/…` before generating the rest.

## Generation specs
GPT-Image-2's minimum is ~655k px, so **generate at 1024×1024**, then downscale in post. These are
props, so the shipped size is **256×256** (powers of two). Prompt for a **top-down/flat,
evenly-lit, seamless tiling** material with **no perspective, no vignette, no single light source,
no border** (so it tiles). Match the dusk harbour palette. Generate albedo for each of these 4
prop surfaces:

1. **PaintedMetal** — weathered dark iron with chipped paint over hints of rust: the harbour's
   mooring bollards, lamp posts and metal barrel-bands. Cool near-black/charcoal paint, small
   chips and scratches, subtle rust bloom. (Semi-metallic.)
2. **AwningStripe** — bold weatherproof market-awning canvas: even vertical stripes alternating a
   warm faded **red/terracotta** and **cream**, slightly sun-bleached, fine canvas weave. Stripes
   must run straight and tile horizontally.
3. **Sailcloth** — weathered off-white/ecru sail canvas: woven cotton-duck texture, faint seams
   and stitch lines, light staining. (Matte.)
4. **Rope** — twisted hemp/manila rope laid as tight parallel strands (as if coiled), warm tan
   fibre, frayed wisps. Must tile so a rope wrap reads continuously. (Matte.)

## Post-processing (local ImageMagick — no new deps)
For each surface, from the generated 1024 albedo produce, in `assets/textures/harbour/`, named
`PROP_Harbour_<Object>_<map>.png` (note **PROP** category, per ART_PLAN naming):
- `_albedo.png` — downscaled to **256×256**, seam-corrected so it **tiles seamlessly** (verify by
  compositing a 50%-offset copy).
- `_normal.png` — tangent-space (OpenGL Y+), 256×256, derived from the albedo's luminance/height
  (Sobel/`-morphology Convolve`). Rope and sailcloth get a pronounced weave/strand normal.
- `_orm.png` — 256×256, packed **R=AO, G=roughness, B=metalness**:
  - **PaintedMetal**: B (metalness) **high ~0.7** (≈180), G (roughness) **mid ~0.45** (≈115),
    rougher where paint has chipped to rust.
  - **AwningStripe / Sailcloth / Rope**: B=0 (non-metal), G **high ~0.85–0.92** (≈215–235).
  - R=AO from albedo cavities/luminance for all.

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled separately by the orchestrator.
- Post-process only with pre-installed tools (ImageMagick / rsvg / python3 / Node built-ins).
  **No `npm install`, no new dependencies.**
- Keep payload small (8-bit, quantise/optimise) — these are 256² so they should be tiny.

## Deliverables checklist
- `assets/textures/harbour/` with the 4 prop surfaces × {albedo, normal, orm} = **12 PNGs**.
- `tools/gen/prompts/batch2.md` — the exact GPT-Image-2 prompts you used (for reproducibility).
- `tools/gen/postprocess_batch2.sh` — the re-runnable ImageMagick post-processing pipeline.
- Tick **Batch 2** in `docs/ART_PLAN.md` and append a one-line note to its Progress log (what you
  generated, that built-in image_gen worked, total payload size).

## When done
Print the full list of files you created with their sizes, and confirm the textures tile.
Do not run git; the orchestrator will review and commit.
