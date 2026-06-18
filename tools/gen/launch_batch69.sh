#!/usr/bin/env bash
# Batch 69 — steam off the noodle pot (FX_Smoke_NoodleSteam). codex GPT-Image-2 burst.
# ONE soft thin wisp of WHITE kitchen steam on a BLACK background (luminance->alpha, not a chroma key):
# delicate translucent vapour rising and curling off a hot noodle pot — narrow at the base, breaking
# into soft tendrils and fading to nothing as it rises. 3 reads-forbidden one-image attempts; harvest
# the softest/cleanest, then luminance-key it via postprocess_batch69.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A soft thin wisp of translucent WHITE kitchen STEAM rising on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred — the gentle vapour that rises off a hot noodle pot. Narrow and faint at the very bottom, curling and widening as it rises, breaking into a few soft feathered tendrils that thin out and fade evenly into pure black near the top. Delicate translucent pale-white vapour over pure black, wispy and airy, soft feathered edges (no hard outline). NOT thick smoke, NO dark grey, NO black soot, NO flame, NO sparks, NO pot, no bowl, no stove, no object, no land, no people, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft rising white steam.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b69_steam_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched steam ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
