#!/usr/bin/env bash
# Batch 66 — the lighthouse shines (FX_Light_Beacon). codex GPT-Image-2 burst launcher.
# ONE bright beacon-flare on a BLACK background (luminance->alpha, not a chroma key): a small intense
# warm-white navigation light (white-gold core + soft halo + faint star-glints), 3 reads-forbidden
# one-image attempts; harvest the cleanest, then luminance-key it via postprocess_batch66.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A small intense BEACON of warm-white light on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred — the kind of bright navigation light a distant lighthouse throws across dark water at night. At the very centre a tiny brilliant WHITE-GOLD core (roughly #fff4dc), wrapped in a soft round warm-white halo that grades smoothly outward and fades evenly into pure black at the edges. From the core, faint thin glints of light radiate — a soft vertical streak and a soft horizontal streak (a gentle four-point star-glint), and the barest hint of a diffuse bloom — so it reads as a brilliant point of light, not a flat disc. Warm-white and gold over near-black, clean and luminous, NO cool blue, NO green, NO saturated colour, NO lens-ring artefacts. The beacon is centred. No lighthouse, no tower, no land, no horizon, no boats, no people, no objects, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the bright beacon and its soft glints.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b66_beacon_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched beacon ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
