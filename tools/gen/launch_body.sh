#!/usr/bin/env bash
# Real-body character surfaces — codex GPT-Image-2 burst launcher.
# Replaces the old "minecraft" block figure's flat look with realistic, tileable
# PBR-friendly fabric/skin albedos for the new capsule-geometry body (player +
# citizens). 3 surfaces x 3 reads-forbidden one-image attempts; harvest the
# cleanest per surface, then derive normal+orm via postprocess_body.sh.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/.." && pwd)"          # .../game/tools
ROOT="$(cd "$ROOT/.." && pwd)"                      # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen (1024x1024 square size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

prompt_for() {
  case "$1" in
    skin)    echo 'A seamless tileable flat-lay texture of realistic human skin, warm medium tan tone, soft natural pores and faint freckles, even soft diffuse studio lighting with no harsh shadows and no highlights, absolutely no face and no facial features, photographic, square, the four edges tile seamlessly with no visible seam';;
    coat)    echo 'A seamless tileable flat-lay texture of heavy worn wool-canvas coat fabric in faded muted teal-grey, visible woven thread and a little salt-weathered fraying, even soft diffuse flat lighting with no highlights, no buttons and no seams, photographic, square, the four edges tile seamlessly with no visible seam';;
    trouser) echo 'A seamless tileable flat-lay texture of dark charcoal-navy cotton twill work-trouser fabric, fine diagonal weave, worn and faded at the stress points, even soft diffuse flat lighting with no highlights, no pockets and no seams, photographic, square, the four edges tile seamlessly with no visible seam';;
  esac
}

for surface in skin coat trouser; do
  P="$(prompt_for "$surface")"
  for attempt in 1 2 3; do
    log="$LOGDIR/cdx_body_${surface}_${attempt}.log"
    nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
      "${WRAP_PRE}${P}${WRAP_POST}" > "$log" 2>&1 &
    disown
    echo "launched $surface attempt $attempt -> $log (pid $!)"
  done
done
echo "all 9 codex attempts launched."
