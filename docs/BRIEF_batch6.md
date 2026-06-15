# codex task — Batch 6: sky, weather & signage cutouts (GPT-Image-2)

You are generating committed **transparent cutout / overlay** assets for a Three.js browser game
(City of Small Chances), a stylised dusk harbour. **First read `docs/ART_PLAN.md`,
`docs/ASSET_MANIFEST.md` (entries fx-001, fx-002, fx-003)** and follow the art direction, palette,
naming, and technical standards exactly. Batches 1–5 are committed under `assets/textures/`,
`assets/sprites/`, `assets/ui/` — keep the same warm, slightly-painterly stylised-realism world.

**All 13 assets are transparent cutouts** on a flat **chroma-key** background (one pipeline, like the
Batch 3 sprites / Batch 4 icons). No solid backgrounds in the final PNGs.

> ⚠ **Critical — do NOT make full-screen sky panoramas.** The live game's sky is a *dynamic*
> procedural gradient dome that the day-cycle recolours dawn→night every frame. We are **adding
> drifting cloud billboards over it**, not replacing it. Clouds must be **cutouts**, and painted
> **neutral / light** (near-white to pale grey) so the engine can multiply-tint them per time of day.

## What to make — 13 cutouts, three families

### A. Sky clouds (4) — fx-001, additive billboards (NOT a panorama)
Soft, painterly cloud cutouts, **neutral pale-white→light-grey**, gentle internal shading, lit from
one side, fluffy soft edges (no hard outline). Varied shapes so they don't read as repeats:
1. **FX_Sky_Cloud_A** — a large soft cumulus bank.
2. **FX_Sky_Cloud_B** — a long wispy stratus streak (wide, thin).
3. **FX_Sky_Cloud_C** — a medium puffy cloud clump.
4. **FX_Sky_Cloud_D** — small scattered cloud wisps.
Generate each wide (e.g. ~1024×512) on chroma key; ship transparent. Keep them low-contrast and
desaturated so a warm dusk / cool night tint reads naturally.

### B. Weather FX cards (4) — fx-002 (ship-ready overlay/billboard cards)
5. **FX_Weather_Rain** — sparse pale **vertical raindrop streaks** (motion-blurred thin lines),
   mostly transparent, even across the frame so it can scroll as a rain overlay. Square ~1024².
6. **FX_Weather_Fog** — a soft low **fog/haze bank** (pale grey-blue, wispy, transparent gradient
   top & bottom). Wide ~1024×512.
7. **FX_Weather_Heat** — faint **heat-shimmer / heatwave** haze: warm pale wavy distortion bands,
   very subtle, mostly transparent. Wide ~1024×512.
8. **FX_Weather_Puddle** — a top-down **wet puddle / ripple** decal (concentric ripple rings + a
   sheen), transparent around a roughly circular puddle, to lay flat on the ground. Square ~1024².

### C. Signage & decals (5) — fx-003 (pictorial only — NO readable text/logos)
The harbour's signs are currently blank boxes. Make **pictorial** hanging-sign / decal cutouts —
**no letters, numerals, words or brand logos** (image-gen text is unreliable and the art direction
forbids it). Convey the trade by motif alone:
9. **SIGN_NoodleStall** — Mei's noodle-stall hanging sign: a painted wooden/cloth sign panel with a
   **steaming noodle-bowl + chopsticks** motif. Warm. (Goes on the live stall.)
10. **DECAL_BoardNotes** — a cluster of **pinned paper notes / curled flyers with thumbtacks**, to
    overlay on the live notice board. Slightly weathered paper. Square ~1024².
11. **SIGN_HarbourShop** — a generic harbour shopfront hanging bracket sign with a **fish / anchor**
    motif on an iron bracket.
12. **SIGN_Chandler** — a ship-chandler / general-goods hanging sign with a **rope-coil + lantern**
    motif.
13. **SIGN_CivicNotice** — a civic/institutional notice plaque: a **framed board with a small
    columned-building** motif (clean, official feel).

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Transparency:** generate each on a flat chroma-key background — `#00ff00` (green); use `#ff00ff`
  (magenta) for any subject that is strongly green or pale-grey-on-green-reads-poorly. Clean even
  solid fill — no gradient or shadow on the background.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate each at **1024×1024** (or
  the wide aspect noted), respecting the floor.
- **Smoke-test first:** generate **FX_Sky_Cloud_A** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- Keep raw generations in `tools/gen/source_batch6/` (gitignored).
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script)
For each cutout, from the generated chroma-key PNG:
1. **Strip the background**: `python3 "$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py <in> <out> --auto-key border --soft-matte --despill`
2. **Trim** (`magick <out> -trim +repage <out>`) then **fit onto a centred transparent canvas**.
   Ship at sensible powers-of-two for the shape: **clouds & wide cards 512×256, square cards
   512×512, signs 256×256** (`-background none -gravity center -extent WxH`). Keep alpha clean.
3. **Optimise** (8-bit, quantise) so each file is tiny.
Result — file names (match exactly), into these paths:
- Clouds → `assets/sprites/sky/FX_Sky_Cloud_{A,B,C,D}.png`
- Weather → `assets/sprites/weather/FX_Weather_{Rain,Fog,Heat,Puddle}.png`
- Signage → `assets/sprites/signage/{SIGN_NoodleStall,DECAL_BoardNotes,SIGN_HarbourShop,SIGN_Chandler,SIGN_CivicNotice}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is the orchestrator's.
- Post-process only with pre-installed tools. **No `npm install`, no new dependencies.**
- Clean alpha edges (no chroma fringe — verify by compositing over mid-grey AND white).
- **No readable text, numerals, or logos** anywhere. Pictorial motifs only.
- Clouds painted **neutral/light** (tintable). No full-screen sky panorama.

## Deliverables checklist
- 13 transparent PNGs across `assets/sprites/{sky,weather,signage}/` (names above).
- `tools/gen/prompts/batch6.md` and `tools/gen/postprocess_batch6.sh` (re-runnable).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 6 checkbox.

## When done
Print the full list of files you created with sizes, confirm clean transparency on grey + white, and
confirm the three families read coherently. Do not run git; the orchestrator reviews + commits.
