#!/usr/bin/env bash
# Fire a burst of one-image-per-invocation codex attempts for Batch 57.
# 3 props x 3 attempts = 9 background invocations. Reads-forbidden wrapper
# sidesteps codex burning its turn sed-reading the 440-line imagegen SKILL.md.
set -u

export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOGDIR="$ROOT/tools/gen"

WRAP_PRE="You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect references, begin the image_gen call immediately. Generate exactly ONE image with image_gen ("
WRAP_MID=" size to suit), prompt: "
WRAP_POST=" . That is the only thing to do; after the image is generated you are done."

CART="Painterly game-art sprite, not photoreal. A single weathered two-wheeled wooden market handcart (a costermonger's barrow) seen broadside / slight three-quarter, centred on a SOLID PURE-MAGENTA #ff00ff background, the cart filling most of the frame. Two spoked timber wheels with rust-brown iron rims, a pair of pull-handles/shafts at one end, the bed sloped up at the back into a display board heaped with a little muted produce — cabbages, roots and apples in earthy greens, browns and dull reds — and a slumped sack. Weathered sawn timber, scuffed and salt-grey, honest working market kit. Muted weathered period-harbour palette — grey timber, rust iron, earthy produce, no bright colour, NO pink. Flat even diffuse overcast light. The two wheels MUST rest on the BOTTOM EDGE of the image. LANDSCAPE framing, about three wide by two tall. No ground, no scenery, no people, no second object, no cast shadow, no text, no letters, no numbers, no prices, no watermark. Solid flat magenta fill everywhere except the cart."

CROCKS="Painterly game-art sprite, not photoreal. A close cluster of three or four glazed earthenware crocks and storage jars of different sizes (a market oil/grain/pickle seller's stock), seen front-on / slight three-quarter, centred on a SOLID PURE-MAGENTA #ff00ff background, the cluster filling most of the frame. Fat round terracotta and dull cream-glazed bellies, a couple with timber lids or a tied cloth top, one tipped with a little grain spilling at its mouth. Muted terracotta, ochre and dull cream glaze, honest working market pottery. Muted weathered period-harbour palette — earthy terracotta, dull cream, no bright colour, NO pink. Flat even diffuse overcast light. The crocks MUST sit on the BOTTOM EDGE of the image. Roughly SQUARE framing, about as wide as tall. No ground, no scenery, no people, no second cluster apart, no cast shadow, no text, no letters, no numbers, no labels, no watermark. Solid flat magenta fill everywhere except the crocks."

PARASOL="Painterly game-art sprite, not photoreal. A single tall canvas market parasol/umbrella on a plain timber pole, seen front-on, centred on a SOLID PURE-MAGENTA #ff00ff background, the parasol filling most of the frame. An octagonal or round canopy of salt-faded cream canvas with muted faded stripes (a dull red/ochre, never pink), a little sag and patching, the canopy filling the upper frame, a plain timber pole running straight down to a simple weighted foot. Honest working market shade. Muted weathered period-harbour palette — faded cream canvas, dull ochre stripe, grey-brown timber pole, no bright colour, NO pink. Flat even diffuse overcast light. The pole foot MUST sit on the BOTTOM EDGE of the image, the canopy near the top. Tall PORTRAIT framing, taller than wide. No ground, no scenery, no people, no second object, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the parasol and its pole."

fire() {
  local name="$1" size="$2" prompt="$3" n="$4"
  local full="${WRAP_PRE}${size}${WRAP_MID}${prompt}${WRAP_POST}"
  nohup codex exec --skip-git-repo-check -c model_reasoning_effort="medium" "$full" \
    > "$LOGDIR/cdx_b57_${name}_${n}.log" 2>&1 &
  disown
}

for n in 1 2 3; do
  fire cart     "landscape" "$CART"    "$n"
  fire crocks   "square"    "$CROCKS"  "$n"
  fire parasol  "portrait"  "$PARASOL" "$n"
done

echo "launched 9 codex attempts (cart/crocks/parasol x3)"
jobs -l
