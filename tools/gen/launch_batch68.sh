#!/usr/bin/env bash
# Batch 68 — the sun on the water (FX_Light_SunGlitter). codex GPT-Image-2 burst.
# ONE vertical band of bright white-gold SUN SPARKLES on a BLACK background (luminance->alpha, not a
# chroma key): broken specular glints of midday sunlight dancing down a rippled-water light-path,
# brightest at centre, fading to black. 3 reads-forbidden one-image attempts; harvest the brightest/
# cleanest, then luminance-key it via postprocess_batch68.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A vertical band of brilliant WHITE-GOLD SUN SPARKLES on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred — the dazzling broken path of bright midday sunlight dancing on rippled water (a sun-glitter reflection). Many small bright specular glints — short broken horizontal dashes and flecks of warm white light — scattered down a roughly vertical column, densest and brightest at the centre and thinning as they climb and fall, fading evenly into pure black at the top, bottom and sides. Bright warm-white and pale gold sparkle over pure black, dazzling and clean, like sun glittering on water, NO cool blue, NO green, NO single hard disc, NO sun shape, NO horizon line, NO lens flare rings. The glittering column is centred. No water, no sea, no boat, no land, no people, no objects, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the bright scattered sun-sparkles.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b68_glitter_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched glitter ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
