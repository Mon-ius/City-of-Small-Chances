#!/usr/bin/env bash
# Batch 62 — lamplight on the wet stones (FX_Light_LampPool). codex GPT-Image-2 burst launcher.
# ONE light FX on a BLACK background (luminance->alpha, not a chroma key): a soft warm pool of
# lamplight on wet cobbles, 3 reads-forbidden one-image attempts; harvest the cleanest, then
# luminance-key it via postprocess_batch62.sh. Mirrors launch_batch61.sh (proven this session).
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A soft round pool of warm lamplight cast straight down onto dark wet cobblestones, seen from directly overhead (top-down map view), painterly game-art texture (not photoreal), centred on a SOLID PURE-BLACK #000000 background. A warm amber-gold glow (the colour of a gas street lamp, roughly #ffd27d) is brightest at the very centre where the light lands and fades smoothly and evenly outward in a soft radial gradient into pure black at the edges — no hard rim, no visible circle outline, just a gentle falloff. Within the lit area, faint broken highlights and glints where the damp cobblestones and the seams between the stones catch the light, so it reads as a wet stone surface under a lamp rather than a flat disc. Muted, soft, atmospheric — warm amber and honey tones over near-black, NO cool colours, NO saturated neon. The lit pool is centred and round-to-slightly-oval. No lamp post, no lamp, no people, no objects, no horizon, no sky, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft warm pool of light.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b62_pool_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched pool ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
