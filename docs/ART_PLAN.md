# Art Plan — City of Small Chances

Durable plan for the art-asset effort. Survives across work sessions/loop iterations.
Read this before generating or integrating any asset.

## Approach

- **Generation: codex's built-in `image_gen` skill (GPT-Image-2).** Preferred mode — needs **no
  `OPENAI_API_KEY`** (routes through codex's backend). codex generates into
  `$CODEX_HOME/generated_images/…` and **moves the chosen finals into this repo's `assets/`**.
  Do **not** use the CLI fallback (`scripts/image_gen.py`) — it needs an API key + network — and
  do **not** downgrade to `gpt-image-1.5` without asking.
- **Post-processing: local ImageMagick / rsvg / python.** GPT-Image-2 gives painterly albedo;
  ImageMagick then makes surfaces tile seamlessly, derives `_normal`/`_orm` maps, builds sprite
  atlases, downscales/optimises, and removes chroma-key backgrounds for transparent cutouts.
- **Transparency:** GPT-Image-2 has no native transparency. Generate cutouts (sprites, icons) on
  a **flat chroma-key** background (`#00ff00`, or `#ff00ff` if the subject is green), then strip
  with `"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
  --soft-matte --despill`.
- **Division of labour.** codex generates + post-processes assets under `assets/` + `tools/gen/`.
  The orchestrator (Claude Code) wires assets into the live game `src/three/`, verifies, commits.
  **codex must not touch `src/`.**
- **Reproducibility.** GPT-Image-2 is non-deterministic, so assets are **curated, not
  byte-regenerable.** Commit: the **prompt specs** (`tools/gen/prompts/*.md`), the
  **post-process scripts** (`tools/gen/*`), and the **chosen PNGs**. The pipeline is reproducible;
  the exact pixels are a curated snapshot.
- **Pillar pivot (intentional).** The project previously shipped *no binary art* (drawn
  procedurally at runtime). We now ship committed PNGs. Update README/CLAUDE.md once Batch 1 lands.

## Art direction (from the design book §23)

> Stylised realism: believable urban people and places with **readable silhouettes**, **warm
> cinematic lighting** and **slightly painterly** texture treatment. Polished and inviting,
> **without AAA photorealism.**

- Mood: a working harbour at **dusk** — warm lamplight against cool stone and water.
- **Colour-blind-safe**: never rely on hue alone for status; pair with shape/value.

### Harbour palette (hex)

| Surface        | dark      | mid       | light     |
|----------------|-----------|-----------|-----------|
| Cobblestone    | `#4a4e54` | `#6b7078` | `#8b9099` |
| Plaster facade | `#6e5f4a` | `#a8967c` | `#c9b79c` |
| Plank wood     | `#5a3f28` | `#7a5a3c` | `#9c7d5a` |
| Harbour water  | `#1f3a3d` | `#3d6b66` | `#b8c9c4` (foam) |
| Warm glow      | lamp `#ffd9a0` · lit window `#ffcf8a` |||
| Sky (dusk)     | zenith `#2a3550` → horizon `#e8a86b` |||

## Technical standards

- **Generate large, ship small:** GPT-Image-2 floor is ~655k px, edges multiples of 16 — generate
  at **1024×1024** (or larger), then downscale to the shipped size.
- **Shipped sizes:** environment surfaces 512×512; props 256×256; UI icons 64/128; sprite sheets
  sized to their frame grid. Powers of two. PNG, 8-bit, optimised/quantised (instant web load).
- **Tiling:** all surface textures must tile **seamlessly** (verify with a 50% offset).
- **Map set per surface (glTF-style, lean):**
  - `_albedo.png` — base colour (no baked lighting/shadow).
  - `_normal.png` — tangent-space, **OpenGL convention (Y+ up)** (derived from albedo/height).
  - `_orm.png` — packed **R=AO, G=roughness, B=metalness** (Three.js reads aoMap/roughnessMap/
    metalnessMap from these channels).
  - `_emissive.png` — only where things glow (lit windows, signs).
- **Naming:** `Category_District_Object[_Variant]_<map>.png`, Category ∈ `ENV` · `PROP` · `CHAR`
  · `UI` · `FX`. e.g. `ENV_Harbour_Cobblestone_albedo.png`.
- **Output paths:** `assets/textures/<district>/…`, `assets/sprites/<set>/…`, `assets/ui/…`.

## Tooling constraints (hard)

- Generation = codex built-in `image_gen` only (no CLI, no API key).
- Post-processing = pre-installed only: ImageMagick (`magick`/`convert`), `rsvg-convert`,
  `python3` (Pillow only if already importable), Node built-ins. **No `npm install`, no new deps.**

## Batch roadmap (aligned to the book's milestones)

- [x] **Batch 1 — Old Harbour core surfaces**: cobblestone quay, weathered
      plank wood, aged plaster facade, harbour water, + window atlas (albedo + emissive).
- [x] **Batch 2 — Harbour props**: crates, barrels, mooring bollards, street lamp, stall fabric
      (awning), painted metal, rope, sailcloth.
- [ ] **Batch 3 — Characters**: citizen billboards/sprite sheets (variants; chroma-key cutouts),
      player skin/clothing texture for the low-poly figure.
- [ ] **Batch 4 — UI & 2D**: NPC portraits (mei, jun, rafiq, tomo, clara, ava), weather icons
      (clear/cloud/rain/storm/heat), money/energy icons, status/condition icons.
- [ ] **Batch 5 — District kits**: tenements, market_row, dockside, uptown/civic — palette +
      facade/ground/prop variants per district.
- [ ] **Batch 6 — Sky & FX**: dusk/day/night sky panoramas + clouds, rain/fog FX cards, signage
      & decals.

## Progress log

- 2026-06-15: Batch 1 generated with built-in GPT-Image-2 and ImageMagick/Python post-processing; 14 harbour PNGs, tile-checked, total payload 4,442,460 bytes.
- 2026-06-15: Batch 2 generated with built-in GPT-Image-2 and ImageMagick/Python post-processing; painted metal, awning stripe, sailcloth, and rope prop maps; 12 harbour PNGs, tile-checked, total payload 1,118,287 bytes.
