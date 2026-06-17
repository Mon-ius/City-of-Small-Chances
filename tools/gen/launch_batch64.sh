#!/usr/bin/env bash
# Batch 64 — firelight from the brazier (FX_Light_BrazierGlow). codex GPT-Image-2 burst launcher.
# ONE hot fire-glow on a BLACK background (luminance->alpha, not a chroma key): a soft hot pool of
# firelight (white-gold core → orange → ember-red → black), 3 reads-forbidden one-image attempts;
# harvest the cleanest, then luminance-key it via postprocess_batch64.sh. Mirrors launch_batch62.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A soft round glow of hot firelight on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred. At the very centre a small fierce WHITE-GOLD hot core (roughly #fff1c8), grading out through bright glowing ORANGE (#ff9a3c) into deep EMBER-RED (#c8401a) and then fading smoothly and evenly into pure black at the edges — a strong radial falloff, no hard rim, no visible circle outline, just a hot heart cooling to dark. Scattered through the glow, a few faint broken ORANGE ember-sparks and flecks where coals throw light, so it reads as living fire-light rather than a flat disc — but keep it soft and mostly smooth, the sparks subtle. Hot, saturated, atmospheric — white-gold, orange and ember-red over near-black, HOTTER and more orange-red than a gas lamp, NO cool colours, NO blue, NO green. The glow is centred and round. No brazier, no fire basket, no coals object, no flame shapes, no smoke, no people, no objects, no horizon, no sky, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft hot glow.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b64_brazier_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched brazier ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
