#!/usr/bin/env bash
# Batch 63 — moonlight & lamplight on the water (FX_Light_WaterShimmer). codex GPT-Image-2 burst.
# ONE neutral light FX on a BLACK background (luminance->alpha, not a chroma key): broken glints of a
# reflection on rippling water, 3 reads-forbidden one-image attempts; harvest the cleanest, then
# luminance-key it via postprocess_batch63.sh. Mirrors launch_batch62.sh (proven this session).
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='Broken glints of light scattered across dark, gently rippling water — the wavering reflection of a single bright light on a calm water surface at night, painterly game-art texture (not photoreal), centred on a SOLID PURE-BLACK #000000 background. A loose vertical column of pale light made of many separate horizontal dashes, streaks and glints (the way a reflection shatters into ripples), brightest and densest down the centre line and scattering thinner toward the sides before fading smoothly into pure black at every edge — no hard outline, no solid disc, just broken wavelets of light on dark water. Keep it a NEUTRAL pale silver-white (so it can be tinted warm or cool later) — no strong colour, no saturation. Reads as light shimmering on rippling water. No moon, no lamp, no boat, no land, no horizon, no sky, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the broken column of pale shimmering light.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b63_shimmer_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched shimmer ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
