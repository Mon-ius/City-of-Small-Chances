#!/usr/bin/env bash
# Batch 59 — the working quay: fuel, tar & salt. codex GPT-Image-2 burst launcher.
# Three ground-prop cutouts on a MAGENTA #ff00ff key (coal heap, tar barrel, salt barrel),
# each as 3 reads-forbidden one-image attempts; harvest the cleanest per prop, then strip
# the key via postprocess_batch59.sh. Mirrors launch_body.sh (proven this session).
# bash 3.2-safe: no `declare -A`, a `case` provides per-prop prompt + size.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

size_for() {
  case "$1" in
    coal) echo '1536x1024' ;;   # landscape
    tar)  echo '1024x1536' ;;   # portrait
    salt) echo '1024x1024' ;;   # square
  esac
}

prompt_for() {
  case "$1" in
    coal) echo 'A single heap of black steam sea-coal on the ground, painterly game-art sprite (not photoreal), seen from the front at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the heap filling most of the frame. A low conical pile of glossy black-and-grey lump coal with a flat-bladed iron coal shovel stuck upright into it, and one or two slumped hessian/burlap coal sacks at the base, dusty and grimy. Muted weathered period-harbour palette — black and slate-grey coal, dull brown sacking, grey iron, no bright colour, NO pink. Flat even diffuse overcast light. The coal heap rests along the BOTTOM of the image. Landscape framing. No wall, no ground beyond the heap, no scenery, no people, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the coal heap, shovel and sacks.' ;;
    tar)  echo 'A single open wooden barrel of black caulking pitch/tar, painterly game-art sprite (not photoreal), seen from the front at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the barrel filling most of the frame. A squat weathered timber cask with iron hoops, its open top brimming with glossy black tar, a long-handled round tar brush resting across the rim, and a thin run of dried black tar streaked down one stave. Muted weathered period-harbour palette — grey-brown staves, dark iron hoops, glossy black pitch, no bright colour, NO pink. Flat even diffuse light. The barrel stands upright resting along the BOTTOM of the image. Portrait framing. No wall, no ground beyond the barrel, no scenery, no people, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the tar barrel and brush.' ;;
    salt) echo 'A single open barrel heaped with coarse sea-salt for salting the catch, painterly game-art sprite (not photoreal), seen from the front at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the barrel filling most of the frame. A pale weathered open timber cask with iron hoops, mounded over the rim with coarse grey-white crystalline salt that spills a little down the side, a small wooden scoop half-buried in the salt. Muted weathered period-harbour palette — pale bleached staves, dull iron hoops, off-white and grey salt, no bright colour, NO pink. Flat even diffuse light. The barrel stands upright resting along the BOTTOM of the image. Square framing. No wall, no ground beyond the barrel, no scenery, no people, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the salt barrel and scoop.' ;;
  esac
}

for prop in coal tar salt; do
  SZ="$(size_for "$prop")"
  P="$(prompt_for "$prop")"
  for attempt in 1 2 3; do
    log="$LOGDIR/cdx_b59_${prop}_${attempt}.log"
    nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
      "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
    disown
    echo "launched $prop ($SZ) attempt $attempt -> $log (pid $!)"
  done
done
echo "all 9 codex attempts launched."
