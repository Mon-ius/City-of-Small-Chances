#!/usr/bin/env bash
# Batch 61 — a moon over the harbour (FX_Sky_Moon). codex GPT-Image-2 burst launcher.
# ONE sky FX on a BLACK background (luminance->alpha, not a chroma key): a softly glowing
# full moon, 3 reads-forbidden one-image attempts; harvest the cleanest, then luminance-key
# it via postprocess_batch61.sh. Mirrors launch_batch60.sh (proven this session).
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='A single softly glowing full moon high in a clear night, painterly game-art sprite (not photoreal), centred on a SOLID PURE-BLACK #000000 background, the moon disc filling the middle of the frame with empty black all around. A pale luminous silver-grey moon with faint subtle darker maria patches and a gently cratered surface, evenly self-lit so the whole disc glows (no harsh black shadow on the face, no crescent, a full round moon), wrapped in a soft diffuse pale halo of moonglow that fades smoothly outward into the pure black. Muted cool palette — silver-grey, faint pale gold, soft blue-white halo, NO bright saturated colour. The moon is a clean round disc. Square framing, the disc centred. No landscape, no clouds, no stars, no second moon, no text, no letters, no numbers, no watermark. Solid pure black everywhere except the glowing moon and its soft halo.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b61_moon_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched moon ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
