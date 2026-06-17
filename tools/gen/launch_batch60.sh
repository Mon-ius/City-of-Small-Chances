#!/usr/bin/env bash
# Batch 60 — harbour waterbirds: cormorant, heron & ducks. codex GPT-Image-2 burst launcher.
# Three wildlife cutouts on a MAGENTA #ff00ff key (a wing-drying cormorant, a standing grey
# heron, a raft of mallard ducks), each as 3 reads-forbidden one-image attempts; harvest the
# cleanest per bird, then strip the key via postprocess_batch60.sh. Mirrors launch_batch59.sh.
# bash 3.2-safe: no `declare -A`, a `case` provides per-bird prompt + size.
set -u
export CODEX_HOME=/Users/monius/.codex
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"          # .../game
LOGDIR="$ROOT/tools/gen"

WRAP_PRE='You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ('
WRAP_MID=' size), prompt: '
WRAP_POST=' . That is the only thing to do; after the image is generated you are done.'

size_for() {
  case "$1" in
    cormorant) echo '1024x1024' ;;   # square — perched, wings half-spread
    heron)     echo '1024x1536' ;;   # portrait — tall and narrow
    ducks)     echo '1536x1024' ;;   # landscape — a wide low raft
  esac
}

prompt_for() {
  case "$1" in
    cormorant) echo 'A single great cormorant seabird perched upright with its dark wings held half-spread out to dry in the classic heraldic cormorant pose, painterly game-art sprite (not photoreal), seen from a front-three-quarter view at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the bird filling most of the frame. Glossy blackish-bronze plumage, a long hook-tipped dull-yellow and grey bill, a slim S-curved neck, dark webbed feet together as if gripping a flat ledge. Honest working-harbour wildlife. Muted weathered period-harbour palette — black-bronze feathers, dull yellow-grey bill, NO bright colour, NO pink. Flat even diffuse overcast light. The bird feet rest along the BOTTOM of the image. Square framing. No wall, no post, no water, no scenery, no second bird, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the cormorant.' ;;
    heron)     echo 'A single grey heron wading bird standing tall and still, its long neck folded into a hunched S, a long dagger-like bill, long thin legs, painterly game-art sprite (not photoreal), seen from the side at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the bird filling most of the frame. Soft blue-grey back and wings, a pale off-white neck and head with a black eye-stripe and thin dark crest plume, dull ochre-yellow legs and bill. Honest working-harbour wildlife, patient and watchful. Muted weathered period-harbour palette — blue-grey, off-white, charcoal, dull ochre, NO bright colour, NO pink. Flat even diffuse overcast light. The heron feet rest along the BOTTOM of the image. Portrait framing, tall and narrow. No wall, no water, no scenery, no second bird, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the heron.' ;;
    ducks)     echo 'A small raft of three mallard ducks floating together on calm water, painterly game-art sprite (not photoreal), seen from a low front-three-quarter eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the ducks filling most of the frame. One drake with a bottle-green head, a thin white neck-ring, a chestnut breast and pale grey body, and two mottled-brown hens, all sitting low on the waterline with folded wings and dull-yellow bills. Honest working-harbour wildlife. Muted weathered period-harbour palette — green-black, chestnut, grey-brown, off-white, dull yellow, NO bright colour, NO pink. Flat even diffuse overcast light. The ducks waterline rests along the BOTTOM of the image. Landscape framing, wide and low. No wall, no scenery beyond the birds, no second group, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the three ducks.' ;;
  esac
}

for bird in cormorant heron ducks; do
  SZ="$(size_for "$bird")"
  P="$(prompt_for "$bird")"
  for attempt in 1 2 3; do
    log="$LOGDIR/cdx_b60_${bird}_${attempt}.log"
    nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" \
      "${WRAP_PRE}${SZ}${WRAP_MID}${P}${WRAP_POST}" > "$log" 2>&1 &
    disown
    echo "launched $bird ($SZ) attempt $attempt -> $log (pid $!)"
  done
done
echo "all 9 codex attempts launched."
