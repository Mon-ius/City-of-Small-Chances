# Batch 39 — the working ground: harbour grime & wetness decals (DECAL_Ground_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *break the ground tiling and make
the quay feel worked-on*. Every surface in the harbour is now painted PBR, but the large
ground surfaces (the cobblestone street tiled `[40,40]`, the plank quay) read as **clean,
uniform, untouched**. Real working harbours are wet and dirty: puddles after the tide,
oil and tar spills, moss in the damp joints, scattered debris. This batch adds a small
library of **ground-decal cutouts** the orchestrator scatters as flat alpha planes over
the cobbles and quay — the same trick AAA environment art uses to kill visible tiling and
add lived-in detail. **You (codex) generate + post-process + log only. Do NOT touch
`src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Style — top-down, soft-edged, on chroma-key green

These are seen **from above**, lying flat on the ground. Each must be:
- a **top-down (plan) view** of a patch of ground grime — NOT a 3/4 or perspective object;
- painted on a **solid pure-green `#00ff00` background** (chroma-key) with a **soft,
  irregular, feathered edge** so it blends into the ground when keyed out (no hard rim,
  no rectangle, no drop-shadow);
- in the muted wet-harbour palette already used by the cobble/quay textures (look at
  `assets/textures/harbour/ENV_Harbour_Cobblestone_albedo.png` and
  `ENV_Harbour_QuayWall_albedo.png` for the greys/browns);
- **abstract** — no readable text, no recognisable single hero object, no faces/figures.

## What to make — FOUR ground decals (square, ~1024², on green)

1. **`DECAL_Ground_Puddle`** — a shallow rain puddle seen from above: a dark, wet,
   slightly mirror-like patch of standing water with a faint pale sky-glint and a thin
   darker damp ring at its irregular soft edge. Reads instantly as *wet ground*.
2. **`DECAL_Ground_OilStain`** — a dark tar/oil spill soaked into the ground: near-black
   centre with a faint cool iridescent (petrol-sheen) edge, irregular, soft-feathered.
3. **`DECAL_Ground_Moss`** — a patch of damp green-black moss/algae growth creeping over
   stone, as it would in the shaded joints of a harbour, irregular and soft-edged.
4. **`DECAL_Ground_Debris`** — scattered harbour litter seen from above: loose straw
   wisps, frayed rope ends, a few pale fish scales, a fallen leaf or two — *loose and
   sparse*, no single dominant object, just the mess a working quay leaves.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, ask for a **top-down
flat-lay view on a solid pure-green background, soft feathered irregular edges, no
perspective, no text**. Save the four raws to `tools/gen/source_batch39/` as
`DECAL_Ground_{Puddle,OilStain,Moss,Debris}.png`. Write your prompts to
`tools/gen/prompts/batch39.md`. (If an `image_gen` call returns a server error, just
retry — it succeeds on the second attempt.)

## Post-process — chroma-key cutouts (RGBA)

Write `tools/gen/postprocess_batch39.sh` reusing the project's proven chroma-key removal —
the exact path the citizen batches use:
`CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"`,
called as `python3 "$CHROMA" --input … --out … --key-color '#00ff00' --auto-key border
--soft-matte --transparent-threshold 12 --opaque-threshold 220 --edge-contract 1 --despill
--force`. For each decal:
- key out the green to transparency with the call above (the `--soft-matte` + `--despill`
  + `--edge-contract` give a **soft feathered edge with zero green fringe**), then
  optionally feather the alpha a few more px so the edge fades softly (these lie flat on
  the ground — a hard edge would read as a sticker);
- keep the longest side **≤ 512** (downscale — ground decals don't need 1024), 8-bit,
  quantised small;
- output the four RGBA cutouts to **`assets/sprites/decals/`** as
  `DECAL_Ground_{Puddle,OilStain,Moss,Debris}.png`.

Verify with Pillow and report for each: dimensions, that the corners are alpha-0, the
**green-fringe percentage is 0.00%** (no pixel with G ≫ R,B at meaningful alpha), the
opaque-pixel coverage looks like a soft irregular blob (not a full rectangle), file size,
and a one-line note that it reads as the intended grime type with **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 39 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
