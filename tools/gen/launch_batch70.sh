#!/usr/bin/env bash
# Batch 70 — the up-stroke wing pose for the soaring gulls (PROP_Gull_FlyingUp). codex GPT-Image-2 burst.
# A SECOND flight frame: the Batch-43 herring gull side-on, but wings RAISED HIGH into a deep upbeat (a
# shallow V) so alternating Flying<->FlyingUp reads as a wingbeat. Green chroma key #00ff00, same cutout
# idiom as Batch 43. 3 reads-forbidden one-image attempts; harvest the cleanest upbeat, then chroma-key
# it via postprocess_batch70.sh onto the same 384x192 canvas as PROP_Gull_Flying.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

SZ='1024x1024'
P='Use case: background-extraction. Asset type: game prop cutout sprite, PROP_Gull_FlyingUp raw source. A single European herring gull flying HEAD-ON toward the viewer and seen slightly from ABOVE, on the UP-STROKE of a wingbeat: both wings raised high above the body into a deep upward V, wrists lifted and primary wingtips sweeping up toward the top corners, the body foreshortened and near-vertical with the white breast facing the camera, the head and yellow bill toward the viewer low at the centre. This is the up-beat companion to a front-on gliding gull (whose wings are spread level and wide), so it must be the SAME head-on, slightly-from-above view, only with the wings lifted. Backdrop: perfectly flat solid #00ff00 chroma-key background only. Subject: classic harbour gull with white head, white breast and underside facing the camera, pale grey upper wings, black wingtips with small white spots, yellow bill with a red gonys spot, pale eye; legs tucked subtly under the body, no green or teal anywhere on the bird. Style: painterly realistic cutout prop matching the period harbour game sprites, natural and weathered, not cartoon, not logo, not photoreal studio. Composition: symmetric head-on view from slightly above, wings raised into a tall upbeat V, generous padding so the raised wingtips stay clear of every frame edge, single bird only. Lighting: even diffuse restrained daylight, muted period-harbour palette. Constraints: the background must be one uniform pure #00ff00 colour with no shadows, gradients, texture, reflections, floor plane, or lighting variation. No cast shadow, no contact shadow, no second bird, no props, no scene, no text, no numbers, no letters, no watermark. Do not use #00ff00, green, or teal anywhere in the bird.'

for attempt in 1 2 3; do
  log="$LOGDIR/cdx_b70_gull_${attempt}.log"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
    "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
  disown
  echo "launched gull-upstroke ($SZ) attempt $attempt -> $log (pid $!)"
done
echo "all 3 codex attempts launched."
