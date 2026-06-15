# codex task — Batch 4 (part A): NPC portraits (GPT-Image-2)

You are generating committed **NPC portrait** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (entry ui-004) and `src/data/npcs.js`** and follow the art
direction, palette, naming, and technical standards exactly. Batches 1–3 are committed under
`assets/textures/harbour/` and `assets/sprites/citizens/` — match their painterly
stylised-realism quality and warm dusk lighting.

## What to make
The six major NPCs, each at **three closeness tiers** (18 portraits total). Head-and-shoulders
(chest-up) framing, **front-facing**, centred, a believable working-class person — stylised
realism, **readable silhouette**, warm dusk key light, NOT photoreal, NO text/logos/watermarks.
Square format. Same person, same clothing and identity across their three tiers — only the
**expression / warmth** changes with closeness.

The cast (identity from `src/data/npcs.js` — honour each role, dress and accent colour):
1. **Mei** (Mei Lin) — noodle-stall shop owner, middle-aged, apron over work clothes, sleeves
   rolled, steam-warmed; accent `#e0833c`.
2. **Jun** (Jun Park) — courier dispatcher, sharp and busy, practical jacket, clipboard energy;
   accent `#3f96c9`.
3. **Rafiq** (Rafiq Hassan) — dockyard lead hand, sturdy, weathered, hi-vis collar / safety gear,
   watchful; accent `#c9a23f`.
4. **Tomo** (Tomo Sato) — quayside mechanic/trainer, older, grease-smudged overalls, careful
   hands, gruff-kind; accent `#56b89a`.
5. **Clara** (Clara Wen) — civic-clinic front desk / trainer, composed, clinic-admin attire,
   tired-but-caring; accent `#8a7fd6`.
6. **Ava** (Ava Reid) — tenant advocate / neighbour, warm and determined, casual layers, a folder
   of forms; accent `#d6738a`.

The three tiers (expression only — keep dress & framing constant per NPC):
- **stranger** — guarded, appraising, reserved (a cool, sizing-you-up look).
- **familiar** — warmer, a flicker of recognition, the start of a half-smile.
- **trusted** — open, relaxed, a genuine warm expression.

Keep the cast **colour-blind-safe and distinct**: vary face shape, age, build, hair and dress —
never rely on the accent hue alone to tell them apart.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Transparency:** GPT-Image-2 has no alpha. Generate each portrait **on a flat chroma-key
  background** — use **`#00ff00` (green)**; if a subject's clothing is strongly green (watch Tomo's
  teal), use `#ff00ff` (magenta) for that one. The fill must be clean, even, solid — no gradient,
  no shadow on the background.
- **Size:** GPT-Image-2 floor is ~655k px, edges in multiples of 16. Generate each at
  **1024×1024 (square)**.
- **Smoke-test first:** generate **Mei / familiar** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5` — no API key here. If
  the built-in `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear
  note** (do nothing else).

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script)
For each portrait, from the generated chroma-key PNG:
1. **Strip the background** to true transparency with the bundled remover:
   `python3 "$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py <in> <out> --auto-key border --soft-matte --despill`
2. **Trim** transparent margins (`magick <out> -trim +repage <out>`), then **fit onto a centred,
   square transparent canvas** preserving aspect — ship **256×256** (`-background none -gravity
   center -extent 256x256`). Keep head + shoulders comfortably inside the frame.
3. **Optimise** (8-bit, quantise) so each file is small.
Result: 18 transparent PNGs in `assets/ui/portraits/`, named
**`CHAR_Portrait_<Name>_<tier>_albedo.png`** (Name ∈ Mei, Jun, Rafiq, Tomo, Clara, Ava; tier ∈
stranger, familiar, trusted).

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is handled separately by the orchestrator.
- Post-process only with pre-installed tools (ImageMagick / the bundled `remove_chroma_key.py` /
  python3 / Node built-ins). **No `npm install`, no new dependencies.**
- Each final PNG must have a **clean alpha edge** (no green/magenta fringe — that's what
  `--despill` + `--soft-matte` are for). Verify by compositing each over a mid-grey background.
- The three tiers of one NPC must read as the **same person** — keep identity, clothing, hair and
  framing constant; change only expression.

## Deliverables checklist
- `assets/ui/portraits/` with **18 transparent PNGs** (`CHAR_Portrait_*_albedo.png`).
- `tools/gen/prompts/batch4.md` — the exact GPT-Image-2 prompts used (per NPC + per tier).
- `tools/gen/postprocess_batch4.sh` — the re-runnable chroma-strip + trim + fit + optimise pipeline.
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT tick the Batch 4 box — the orchestrator
  ticks it once portraits are wired in (this is only part A of Batch 4).

## When done
Print the full list of files you created with their sizes, and confirm each has clean transparency
(no chroma fringe) and that each NPC's three tiers read as the same person. Do not run git; the
orchestrator will review and commit.
