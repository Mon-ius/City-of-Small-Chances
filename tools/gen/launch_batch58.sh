#!/usr/bin/env bash
# Fire a burst of one-image-per-invocation codex attempts for Batch 58.
# 3 props x 3 attempts = 9 background invocations. Reads-forbidden wrapper
# sidesteps codex burning its turn sed-reading the 440-line imagegen SKILL.md.
set -u

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGDIR="$ROOT/tools/gen"

WRAP_PRE="You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ("
WRAP_MID=" size to suit), prompt: "
WRAP_POST=" . That is the only thing to do; after the image is generated you are done."

AWNING="Painterly game-art sprite, not photoreal. A single shop awning / canopy seen DEAD FRONT-ON (flat, orthographic, NO perspective), centred on a SOLID PURE-MAGENTA #ff00ff background, the awning filling most of the frame. A sloped rectangular canvas hood projecting from a wall, with a scalloped valance hanging along its front edge, salt-faded muted stripes (a dull brick-red/ochre alternating with dirty cream, NEVER pink), a little sag, sun-bleach and patching, a plain weathered timber or black-iron frame just visible along the top where it fixes to the wall. Honest working shopfront awning. Muted weathered period-harbour palette — faded canvas, dull stripe, grey timber, no bright colour, NO pink. Flat even diffuse overcast light. The top edge where it mounts to the wall runs along the TOP of the image; the scalloped valance hangs at the front. LANDSCAPE framing, about three wide by two tall. No wall behind it, no ground, no scenery, no people, no second object, no cast shadow, no text, no letters, no numbers, no shop name, no watermark. Solid flat magenta fill everywhere except the awning."

WINDOW="Painterly game-art sprite, not photoreal. A single small-paned glazed shop window seen DEAD FRONT-ON (flat, orthographic, NO perspective), centred on a SOLID PURE-MAGENTA #ff00ff background, the window filling most of the frame. A weathered timber-framed shop window divided into a grid of small rectangular panes (a shopfront sash), the old glass dull and greenish-grey with faint soft reflections, and behind the glass only a DIM VAGUE suggestion of goods on a shelf (soft indistinct shapes, no detail), a plain grey-brown weathered timber frame and a worn sill at the bottom. Honest old harbour shop window. Muted weathered period-harbour palette — grey timber, dull greenish glass, no bright colour, NO pink. Flat even diffuse light. The whole window centred and upright. Roughly SQUARE-TO-PORTRAIT framing, about as wide as tall or a touch taller. No wall around it, no ground, no scenery, no people, no second object, no cast shadow, NO TEXT, no letters, no numbers, no prices, no shop name, no signage on the glass, no watermark. Solid flat magenta fill everywhere except the window and its frame."

FLOWERBOX="Painterly game-art sprite, not photoreal. A single timber window flower box seen DEAD FRONT-ON (flat, orthographic, NO perspective), centred on a SOLID PURE-MAGENTA #ff00ff background, the flower box filling most of the frame. A long low weathered-plank wooden trough planted with a tumble of small blooms and trailing green foliage spilling over the front edge and hanging below — the blooms in muted RED, GOLD, WHITE and BLUE only (ABSOLUTELY NO PINK OR MAGENTA), the leaves a dull sage / grey-green (NOT bright grass-green). Honest weathered window box at a sill. Muted weathered period-harbour palette — grey timber, dull sage foliage, earthy red/gold/white/blue blooms, NO pink, NO magenta. Flat even diffuse light. The timber trough rests along the BOTTOM of the image, the trailing foliage hanging just below it. LANDSCAPE framing, about two and a half wide by one tall. No wall, no ground beyond the box, no scenery, no people, no second object, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the flower box."

fire() {
  local name="$1" size="$2" prompt="$3" n="$4"
  local full="${WRAP_PRE}${size}${WRAP_MID}${prompt}${WRAP_POST}"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" "$full" \
    > "$LOGDIR/cdx_b58_${name}_${n}.log" 2>&1 &
  disown
}

for n in 1 2 3; do
  fire awning    "landscape" "$AWNING"    "$n"
  fire window    "portrait"  "$WINDOW"    "$n"
  fire flowerbox "landscape" "$FLOWERBOX" "$n"
done

echo "launched 9 codex attempts (awning/window/flowerbox x3)"
