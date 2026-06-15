# codex task — Batch 4 (part B): HUD / status & weather icons (GPT-Image-2)

You are generating committed **UI icon** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (entries ui-002, ui-003) and `src/core/state.js`** (the
`CONDITION_META` block names each meter, its emoji, and whether high or low is good) and
follow the art direction, palette, naming, and technical standards exactly. Batches 1–4A are
committed under `assets/textures/`, `assets/sprites/citizens/`, `assets/ui/portraits/` — keep
the same warm, stylised-realism world, but in a tighter icon idiom (below).

## What to make — 11 icons, one cohesive set
A **resource + condition + weather** HUD icon set. They must read at small size and work as a
family (shared shape language, weight, padding, framing).

**Resource (1):**
1. **Money** — coins / cash in hand (the wallet readout; currently the emoji 💴).

**Condition meters (5)** — match `CONDITION_META` in `src/core/state.js`:
2. **Energy** — vigour / stamina (emoji ⚡; high is good).
3. **Hunger** — being fed / a meal (label "Fed", emoji 🍚; high is good).
4. **Stress** — tension / overwhelm (emoji 🌀; LOW is good — read as a pressure/knot).
5. **Health** — wellbeing / care (emoji ❤️; high is good).
6. **Hope** — optimism / a spark (emoji ✨; high is good).

**Weather (5)** — ui-002:
7. **Clear** (sun), 8. **Cloud** (overcast), 9. **Rain**, 10. **Storm** (thunder),
11. **Heat** (heatwave / heavy sun).

## Style (important — this is an ICON set, not a painting)
- **Clean, bold, lightly painterly flat icons** with **strong readable silhouettes** — legible at
  32–48 px. A single clear subject per icon, centred, generous even padding, consistent visual
  weight across the set. A touch of soft shading/warmth ties them to the harbour, but keep them
  crisp, not muddy.
- **Colour-blind-safe:** each icon must be distinguishable by **shape and value alone** — never rely
  on hue. You may tint with the meter's mood (energy warm-gold, health red, stress cool, hope
  bright, money brass) but the silhouette must carry the meaning without colour.
- No text, no numerals, no logos, no drop-shadow baked onto the chroma background.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Transparency:** generate each icon **on a flat chroma-key background** — `#00ff00` (green); use
  `#ff00ff` (magenta) for any icon that is strongly green (e.g. a green-tinted subject). Clean, even,
  solid fill — no gradient, no shadow on the background.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate each at **1024×1024**.
- To keep the set coherent, you may generate a **2×N grid sheet** of several icons at once on one
  chroma background, then slice — OR generate them individually; your call, but the final shipped
  files must be one icon per PNG.
- **Smoke-test first:** generate **Money** as your very first action and confirm a PNG lands in
  `$CODEX_HOME/generated_images/…` before doing the rest.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script)
For each icon, from the generated chroma-key PNG (or slice):
1. **Strip the background** to true transparency:
   `python3 "$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py <in> <out> --auto-key border --soft-matte --despill`
2. **Trim** transparent margins (`magick <out> -trim +repage <out>`), then **fit onto a centred,
   square transparent canvas** with even padding — ship **128×128** (`-background none -gravity
   center -extent 128x128`). Keep consistent padding so the set looks uniform.
3. **Optimise** (8-bit, quantise) so each file is tiny.
Result: 11 transparent PNGs in `assets/ui/icons/`, named **`UI_Icon_<Name>.png`**:
`UI_Icon_Money`, `UI_Icon_Energy`, `UI_Icon_Hunger`, `UI_Icon_Stress`, `UI_Icon_Health`,
`UI_Icon_Hope`, `UI_Icon_Weather_Clear`, `UI_Icon_Weather_Cloud`, `UI_Icon_Weather_Rain`,
`UI_Icon_Weather_Storm`, `UI_Icon_Weather_Heat`.

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled by the orchestrator.
- Post-process only with pre-installed tools (ImageMagick / the bundled `remove_chroma_key.py` /
  python3 / Node built-ins). **No `npm install`, no new dependencies.**
- Clean alpha edges (no chroma fringe — `--despill` + `--soft-matte`). Verify by compositing each
  over mid-grey AND over white (icons must read on both).
- The 11 must look like **one set**: same padding, weight, and finish.

## Deliverables checklist
- `assets/ui/icons/` with **11 transparent PNGs** (`UI_Icon_*.png`).
- `tools/gen/prompts/batch4b.md` — the exact GPT-Image-2 prompts used.
- `tools/gen/postprocess_batch4b.sh` — the re-runnable chroma-strip + trim + fit + optimise pipeline.
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 4 checkbox.

## When done
Print the full list of files you created with their sizes, confirm clean transparency, and confirm
the set reads as a coherent family at small size. Do not run git; the orchestrator reviews + commits.
