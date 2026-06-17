#!/usr/bin/env bash
# Batch 65 — mist on the water (FX_Weather_WaterMist). codex GPT-Image-2 burst launcher.
# ONE soft mist-band on a BLACK background (luminance->alpha, not a chroma key): a wide low bank of
# pale drifting sea-mist, 3 reads-forbidden one-image attempts; harvest the cleanest, then
# luminance-key it via postprocess_batch65.sh. Mirrors launch_batch63.sh (proven this session).
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A soft low bank of pale drifting MIST on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred as a wide horizontal band. A gentle, wispy, uneven fog — brightest and densest through the middle of the band and feathering smoothly and softly to pure black above, below and at the ends, with torn, ragged, drifting edges (never a hard rim, never a solid bar). The colour is a NEUTRAL pale silver-white (roughly #e9edf0), cool and faint like sea-mist at first light — soft greys and whites only, NO warm tint, NO blue, NO green, NO colour cast, so it tints and lights neutrally. Thin and translucent in places, thicker in soft clots in others, so it reads as real rolling mist over water rather than a flat smear. Atmospheric, quiet, low-contrast — pale mist over near-black. No water, no horizon, no boats, no land, no sky, no people, no objects, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft pale bank of mist.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b65_mist_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched mist ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
