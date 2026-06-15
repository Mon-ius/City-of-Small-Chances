# codex task — Batch 14: how the body feels — screen-state condition FX (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**fx-006**), and the chroma-key reference pipeline `tools/gen/postprocess_batch6.sh`** (transparent
cutouts) so you match the established warm, painterly, stylised-realism finish.

This batch delivers **fx-006 — screen-state condition feedback**: full-screen **vignette overlay
cards** that fade in over the live 3D view to tell the player, without a single word, that their
body is failing — the book's *condition-survival* pillar plus its *accessibility* rule (a redundant
visual channel paired with the energy meter, never colour alone). The orchestrator wires the first
two LIVE to the energy HUD; the third ships ready for the weather hook.

These are **NOT tiling PBR surfaces and NOT subject cutouts** — each is one **full-frame atmospheric
vignette** with a **bright, near-clear CENTRE** and the mood/tint pooling only at the **EDGES and
corners**, shipped as a single **RGBA PNG** whose transparency is derived from its own darkness (see
post-processing). One file each, no normal/orm maps.

## The 3 cards (1024×1024 each, full-bleed) → `assets/sprites/fx/`

1. **FX_Cond_LowEnergy** — *tiredness creeping in.* A soft, warm **dark amber-brown** vignette
   seeping inward from all four edges with a wide, buttery falloff. Gentle — the "you should rest
   soon" read. **Centre must be near-white / very light** so it post-processes to fully transparent.
2. **FX_Cond_Burnout** — *exhaustion / running on empty.* A heavier, **desaturated sickly grey-green
   / teal-grey** vignette, darker and reaching further toward centre than LowEnergy, weighted a touch
   heavier along the **top and bottom edges** (a drooping-eyelid heaviness). Drained, not alarming —
   no red, no blood, no horror. Still a **bright clear centre**.
3. **FX_Cond_ColdWet** — *cold / wet exposure.* A cool **slate-blue / grey** vignette with a faint
   misted, frosted quality and a few soft, lighter **condensation-droplet** smudges pooling in the
   corners (suggested, not literal raindrops). The "exposed to the harbour weather" read. **Bright
   clear centre.**

**Design rules for all three (critical):**
- **The CENTRE of every card must be bright (near-white, very light value).** The transparency is
  computed from darkness, so a bright centre → fully transparent gameplay view, and only the dark
  tinted edges show. A muddy/grey centre would fog the whole screen — do not do that.
- Pure **atmosphere only**: no text, no icons, no UI chrome, no faces, no objects, no border frame,
  no perspective lines. Just a soft radial gradient of mood from clear centre to tinted edge.
- These are single full-screen cards — **seamless tiling is NOT required**.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, full-bleed.
- **Smoke-test first:** generate **FX_Cond_LowEnergy** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.) Eyeball that its centre is genuinely bright and the amber pools
  at the edges before generating the other two.
- Keep raw generations in `tools/gen/source_batch14/` (gitignored).

## Post-processing — luminance→alpha vignette (pre-installed tools only, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch14.sh`. For each source card, derive the alpha
channel **from the card's own inverse luminance** so the bright centre becomes transparent and the
dark edges stay opaque, then **cap the maximum edge alpha** per card so it never fully blacks out the
view. The proven ImageMagick recipe (adapt per card):

```sh
# $SRC = source 1024² RGB vignette, $CEIL = max edge alpha (e.g. 0.50), $OUT = final RGBA
magick "$SRC" -resize 1024x1024! -colorspace sRGB \
  \( +clone -colorspace Gray -negate -blur 0x6 \) \  # inverse luminance, softened → alpha source
  -alpha off -compose CopyOpacity -composite \         # bright centre → low alpha, dark edge → high
  -channel A -evaluate multiply "$CEIL" +channel \      # cap so the centre stays clear, edge ≤ CEIL
  -strip "$OUT"
```

Per-card alpha ceiling (the `multiply` factor):
| card | edge-alpha ceiling |
|---|---|
| FX_Cond_LowEnergy | 0.50 |
| FX_Cond_Burnout   | 0.68 |
| FX_Cond_ColdWet   | 0.55 |

Keep RGBA 8-bit (do **not** palette-quantise — smooth alpha gradients band under PNG8). `-strip`
metadata to keep them small; these compress well because the centre is empty + the gradient is smooth.

Final names (match exactly):
- `assets/sprites/fx/FX_Cond_LowEnergy.png`
- `assets/sprites/fx/FX_Cond_Burnout.png`
- `assets/sprites/fx/FX_Cond_ColdWet.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** The orchestrator does all live wiring. Pre-installed tools
  only. **No `npm install`, no new deps.**
- **No readable text, no real brands, no logos, no horror/gore imagery** (this is fatigue, not death).
- Every final must be **RGBA** with a verifiably **near-zero-alpha centre** (sample the middle pixel)
  and **non-zero alpha at the edges**.

## Deliverables checklist
- 3 RGBA card PNGs (names above), `tools/gen/prompts/batch14.md`, `tools/gen/postprocess_batch14.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and the measured centre-vs-edge alpha for each card). Do NOT change any
  checkbox.

## When done
Print every file you created with sizes, and for each card report the alpha at the centre pixel
(should be ~0) and near a corner (should be > 0). Do not run git; the orchestrator reviews and commits.
