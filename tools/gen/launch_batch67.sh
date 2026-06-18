#!/usr/bin/env bash
# Batch 67 — the boats light their lanterns (FX_Light_BoatLantern). codex GPT-Image-2 burst.
# ONE small warm AMBER oil-lantern glow on a BLACK background (luminance->alpha, not a chroma key):
# a soft round hanging-lantern light (warm-gold core fading through amber to black, NO star-glints —
# distinct from the Batch-66 navigation beacon), 3 reads-forbidden one-image attempts; harvest the
# warmest, then luminance-key it via postprocess_batch67.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A small soft glow of warm AMBER lantern-light on a SOLID PURE-BLACK #000000 background, painterly game-art texture (not photoreal), centred — the warm pool of light a hanging oil lantern throws on a moored boat at night. At the very centre a small warm WHITE-GOLD core (roughly #ffd9a0), wrapped in a soft round AMBER glow (warm orange-gold, roughly #ffb060) that grades smoothly outward and fades evenly into pure black at the edges. A soft round bloom, NOT a hard disc, NO rays, NO star-glints, NO streaks — just a gentle warm lantern halo. Warm amber and gold over near-black, cosy and luminous, NO cool blue, NO green, NO white-cold light, NO lens-ring artefacts. The glow is centred. No lantern, no lamp, no boat, no rope, no land, no horizon, no people, no objects, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the soft warm amber glow.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b67_lantern_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched lantern ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
