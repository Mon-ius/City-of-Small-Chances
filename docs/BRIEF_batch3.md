# codex task — Batch 3: Character billboard sprites (GPT-Image-2)

You are generating committed **character sprite** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md` and
`docs/ASSET_MANIFEST.md`** (entries spr-002) and follow the art direction, palette, naming, and
technical standards exactly. Batches 1–2 (harbour textures) are committed under
`assets/textures/harbour/` — match their painterly stylised-realism quality.

## What to make
Six **full-body character billboard cutouts** — ordinary harbour people, to stand and mill along
the quay as an ambient crowd. Stylised realism, **readable silhouettes**, warm dusk lighting,
believable working-class urban dress, NOT photoreal, NO text/logos. Front-facing, full body
(head to feet), neutral standing pose, centred with a little headroom and footroom.

The six roles (distinct silhouettes & colours, colour-blind-safe — vary shape/value, not just hue):
1. **MarketVendor** — apron over work clothes, sleeves rolled, carrying a basket.
2. **DockWorker** — hi-vis vest over a tee, work trousers, boots, a hard hat or cap.
3. **Commuter** — light jacket, satchel/shoulder bag, plain trousers, mid-stride-but-upright.
4. **Elder** — cardigan/coat, cap, a walking stick, slightly stooped.
5. **Fisher** — oilskin/waterproof smock, rubber boots, a coil of rope or a crate.
6. **Youth** — hoodie + backpack, casual, hands in pockets.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Transparency:** GPT-Image-2 has no alpha. Generate each character **on a flat chroma-key
  background** — use **`#00ff00` (green)**; if a subject is mostly green, use `#ff00ff` (magenta)
  instead. The background must be a clean, even, solid fill with no gradient or shadow.
- **Size:** GPT-Image-2 floor is ~655k px with edges in multiples of 16. Generate each at
  **1024×1536 (portrait)** so the full standing figure fits.
- **Smoke-test first:** generate MarketVendor as your very first action and confirm a PNG lands in
  `$CODEX_HOME/generated_images/…` before doing the rest.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5` — no API key here. If
  the built-in `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear
  note** (do nothing else).

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script)
For each character, from the generated chroma-key PNG:
1. **Strip the background** to true transparency with the bundled remover:
   `python3 "$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py <in> <out> --auto-key border --soft-matte --despill`
2. **Trim** transparent margins (`magick <out> -trim +repage <out>`), then **fit onto a centred,
   power-of-two transparent canvas** preserving aspect — ship **512×1024** (`-background none
   -gravity center -extent 512x1024`).
3. **Optimise** (8-bit, quantise) so each file is small.
Result: one transparent PNG per character in `assets/sprites/citizens/`, named
**`CHAR_Harbour_Citizen_<Role>_albedo.png`** (Role ∈ MarketVendor, DockWorker, Commuter, Elder,
Fisher, Youth).

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled separately by the orchestrator.
- Post-process only with pre-installed tools (ImageMagick / the bundled `remove_chroma_key.py` /
  python3 / Node built-ins). **No `npm install`, no new dependencies.**
- Each final PNG must have a **clean alpha edge** (no green/magenta fringe — that's what
  `--despill` + `--soft-matte` are for). Verify by compositing each over a mid-grey background.
- Keep the figure's feet near the bottom of the 512×1024 frame (so it can be planted on the ground
  when billboarded).

## Deliverables checklist
- `assets/sprites/citizens/` with **6 transparent PNGs** (`CHAR_Harbour_Citizen_*_albedo.png`).
- `tools/gen/prompts/batch3.md` — the exact GPT-Image-2 prompts used.
- `tools/gen/postprocess_batch3.sh` — the re-runnable chroma-strip + trim + fit + optimise pipeline.
- Tick **Batch 3** in `docs/ART_PLAN.md` and append a one-line note to its Progress log (what you
  generated, that built-in image_gen worked, total payload size).

## When done
Print the full list of files you created with their sizes, and confirm each has clean transparency
(no chroma fringe). Do not run git; the orchestrator will review and commit.
