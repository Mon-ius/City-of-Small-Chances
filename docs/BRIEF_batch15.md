# codex task — Batch 15: a business grows, one rung at a time (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**mat-012**), and the reference pipeline `tools/gen/postprocess_batch13.sh` / `postprocess_batch5.sh`
(seamless opaque PBR surfaces).** Match the established warm, slightly-painterly, stylised-realism
finish.

This batch delivers **mat-012 — the business-route premises across its four growth stages** (the
*housing-business* milestone): the surface of the place where the player's side-business lives,
upgrading rung by rung as the business is recognised. **Design intent (World rule 2 — class/standing
reads through material):** each stage must visibly out-rank the last, makeshift → established. All
are **opaque, seamlessly-tiling PBR surfaces** (NO chroma key, NO transparency), each shipped as
`_albedo` + `_normal` + `_orm`, reusing the seamless pipeline. **Ship ready** (like Batches 5/7/10/13):
they wire in when the business premises become walkable — the live build is still Old Harbour.

## The 4 surfaces (4 surfaces / 12 PNGs), 512², into `assets/textures/business/`

Each is one tiling surface viewed flat/face-on, no perspective, no scene props baked in (it's a
*material*, not a picture). Read each as the dominant surface of that stage's premises.
1. **ENV_Biz_Stall** (stage 1 — *weekend market stall*) — the most makeshift: rough trestle-table
   planks under a draped weather-faded canvas/tarp, frayed rope ties, a temporary set-up-and-pack-down
   feel. Warm but threadbare. The lowest rung.
2. **ENV_Biz_Bench** (stage 2 — *repair bench*) — a step up to a working trade: a sturdier
   pegboard-and-timber workbench wall, tool-shadow marks and honest wear, more permanent than the
   stall but still a back-room grind. (Echo `ENV_Work_Repair` from Batch 13 in spirit, not identical.)
3. **ENV_Biz_Kiosk** (stage 3 — *food kiosk*) — a clean food-service surface: brushed stainless-steel
   counter with a splash-band of small glazed tiles, wipe-clean and regulated, a real little business.
4. **ENV_Biz_Shop** (stage 4 — *district-recognised shop*) — the established premises: a finished
   retail interior surface — warm painted plaster or fine timber-panelled wall with neat shelving
   reveals and a cared-for floor edge, proud and permanent. The top rung — clearly the nicest.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each albedo **1024×1024** full-bleed, flat / face-on, **no perspective, no vignette, no
  drop shadow, no border** so it tiles.
- **Smoke-test first:** generate **ENV_Biz_Bench** albedo as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch15/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch15.sh` reusing `postprocess_batch13.sh`: seamless-tile
→ resize **512×512** → `_albedo` + derived `_normal` (OpenGL Y+) + packed `_orm`
(R=AO,G=roughness,B=metalness). Suggested tuning (lower roughness / higher metal as the business
climbs — the shop reads cared-for, the stall raw):
| surface | strength | roughness(G) | metalness(B) |
|---|---|---|---|
| ENV_Biz_Stall | 3.2 | 205 | 5 |
| ENV_Biz_Bench | 3.4 | 195 | 20 |
| ENV_Biz_Kiosk | 2.4 | 110 | 70 |
| ENV_Biz_Shop  | 2.2 | 140 | 10 |

Final names (match exactly):
- `assets/textures/business/ENV_Biz_Stall_{albedo,normal,orm}.png`
- `assets/textures/business/ENV_Biz_Bench_{albedo,normal,orm}.png`
- `assets/textures/business/ENV_Biz_Kiosk_{albedo,normal,orm}.png`
- `assets/textures/business/ENV_Biz_Shop_{albedo,normal,orm}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands.** Surfaces must tile seamlessly (50%-offset check).

## Deliverables checklist
- 12 surface PNGs (names above), `tools/gen/prompts/batch15.md`, `tools/gen/postprocess_batch15.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size). Do NOT change any checkbox.

## When done
Print every file you created with sizes and confirm each tiles seamlessly. Do not run git; the
orchestrator reviews and commits.
