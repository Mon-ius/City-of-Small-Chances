#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/sprites/citizens"
TMP="${TMPDIR:-/tmp}/harbour_batch26_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch26}}"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

NAMES=(Child Sailor Porter Clerk Washerwoman OldWoman)

mkdir -p "$OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

key_for() {
  case "$1" in
    Sailor|Washerwoman) printf '#ff00ff' ;;
    *) printf '#00ff00' ;;
  esac
}

for name in "${NAMES[@]}"; do
  src="$SOURCE_DIR/CHAR_Harbour_Citizen_${name}.png"
  if [[ ! -f "$src" ]]; then
    echo "Missing source for $name: $src" >&2
    exit 1
  fi

  key="$(key_for "$name")"
  keyed="$TMP/${name}_alpha.png"
  cleaned="$TMP/${name}_cleaned.png"
  trimmed="$TMP/${name}_trimmed.png"
  padded="$TMP/${name}_padded.png"
  fitted="$OUT/CHAR_Harbour_Citizen_${name}_albedo.png"

  python3 "$CHROMA" \
    --input "$src" \
    --out "$keyed" \
    --key-color "$key" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  python3 - "$keyed" "$cleaned" "$name" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]

im = Image.open(src).convert("RGBA")
px = im.load()
removed = 0
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        green_key = g > 95 and g > r * 1.16 and g > b * 1.16
        magenta_key = r > 115 and b > 115 and r > g * 1.22 and b > g * 1.22
        if a < 250 and (green_key or magenta_key):
            px[x, y] = (0, 0, 0, 0)
            removed += 1
im.save(out)
print(f"{name}: edge chroma cleanup removed={removed}")
PY

  "$MAGICK" "$cleaned" -alpha on -trim +repage "$trimmed"

  python3 - "$trimmed" "$padded" "$name" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]

im = Image.open(src).convert("RGBA")
if not im.getbbox():
    raise SystemExit(f"{name}: no non-transparent pixels after trim")
w, h = im.size
pad_x = max(8, round(w * 0.025))
pad_y = max(8, round(h * 0.025))
canvas = Image.new("RGBA", (w + pad_x * 2, h + pad_y * 2), (0, 0, 0, 0))
canvas.alpha_composite(im, (pad_x, pad_y))
canvas.save(out)
PY

  "$MAGICK" "$padded" \
    -auto-orient \
    -resize '486x972>' \
    -background none \
    -gravity center \
    -extent 512x1024 \
    -colorspace sRGB \
    -depth 8 \
    "$TMP/${name}_fitted.png"

  "$MAGICK" "$TMP/${name}_fitted.png" \
    -strip \
    -depth 8 \
    -colors 192 \
    -define png:compression-level=9 \
    "PNG32:$fitted"
done

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out = Path(sys.argv[1])
names = ["Child", "Sailor", "Porter", "Clerk", "Washerwoman", "OldWoman"]
failed = False

for name in names:
    path = out / f"CHAR_Harbour_Citizen_{name}_albedo.png"
    im = Image.open(path).convert("RGBA")
    if im.size != (512, 1024):
        print(f"{path.name}: expected 512x1024, got {im.size}", file=sys.stderr)
        failed = True
    pix = im.load()
    corners = [
        pix[0, 0][3],
        pix[511, 0][3],
        pix[0, 1023][3],
        pix[511, 1023][3],
    ]
    if any(a != 0 for a in corners):
        print(f"{path.name}: non-transparent corner alpha {corners}", file=sys.stderr)
        failed = True

    visible = 0
    green_fringe = 0
    magenta_fringe = 0
    min_y = im.height
    max_y = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pix[x, y]
            if a <= 12:
                continue
            visible += 1
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            if g > 95 and g > r * 1.16 and g > b * 1.16:
                green_fringe += 1
            if r > 115 and b > 115 and r > g * 1.22 and b > g * 1.22:
                magenta_fringe += 1

    if visible < 18000:
        print(f"{path.name}: unexpectedly low visible coverage {visible}", file=sys.stderr)
        failed = True
    if max_y < 820:
        print(f"{path.name}: feet/lowest opaque pixel too high at y={max_y}", file=sys.stderr)
        failed = True
    if green_fringe or magenta_fringe:
        print(
            f"{path.name}: chroma fringe green={green_fringe} magenta={magenta_fringe}",
            file=sys.stderr,
        )
        failed = True
    print(
        f"{path.name}: 512x1024 RGBA, alpha_corners=0, "
        f"green_fringe=0, magenta_fringe=0, feet_row={max_y}, "
        f"visible={visible}, bbox_y={min_y}-{max_y}"
    )

if failed:
    sys.exit(1)
PY

"$MAGICK" "$OUT"/CHAR_Harbour_Citizen_{Child,Sailor,Porter,Clerk,Washerwoman,OldWoman}_albedo.png -background '#808080' -alpha remove -alpha off +append "$TMP/batch26_grey_check.png"

identify -format '%f %wx%h %b\n' "$OUT"/CHAR_Harbour_Citizen_{Child,Sailor,Porter,Clerk,Washerwoman,OldWoman}_albedo.png
echo "Grey-background check: $TMP/batch26_grey_check.png"
