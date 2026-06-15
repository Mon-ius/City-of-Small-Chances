#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/ui/portraits"
TMP="${TMPDIR:-/tmp}/harbour_batch4_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch4}}"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

NAMES=(Mei Jun Rafiq Tomo Clara Ava)
TIERS=(stranger familiar trusted)

mkdir -p "$OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

for name in "${NAMES[@]}"; do
  for tier in "${TIERS[@]}"; do
    src="$SOURCE_DIR/${name}_${tier}.png"
    if [[ ! -f "$src" ]]; then
      echo "Missing source for $name $tier: $src" >&2
      exit 1
    fi

    keyed="$TMP/${name}_${tier}_alpha.png"
    trimmed="$TMP/${name}_${tier}_trimmed.png"
    fitted="$TMP/${name}_${tier}_fitted.png"
    final="$OUT/CHAR_Portrait_${name}_${tier}_albedo.png"

    python3 "$CHROMA" \
      --input "$src" \
      --out "$keyed" \
      --auto-key border \
      --soft-matte \
      --despill \
      --force

    "$MAGICK" "$keyed" -alpha on -trim +repage "$trimmed"
    "$MAGICK" "$trimmed" \
      -auto-orient \
      -resize '232x232>' \
      -background none \
      -gravity center \
      -extent 256x256 \
      -colorspace sRGB \
      -depth 8 \
      "$fitted"

    "$MAGICK" "$fitted" \
      -strip \
      -depth 8 \
      -colors 192 \
      -define png:compression-level=9 \
      "PNG32:$final"
  done
done

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out = Path(sys.argv[1])
names = ["Mei", "Jun", "Rafiq", "Tomo", "Clara", "Ava"]
tiers = ["stranger", "familiar", "trusted"]
failed = False

for name in names:
    for tier in tiers:
        path = out / f"CHAR_Portrait_{name}_{tier}_albedo.png"
        im = Image.open(path).convert("RGBA")
        if im.size != (256, 256):
            print(f"{path.name}: expected 256x256, got {im.size}", file=sys.stderr)
            failed = True
        corners = [
            im.getpixel((0, 0))[3],
            im.getpixel((255, 0))[3],
            im.getpixel((0, 255))[3],
            im.getpixel((255, 255))[3],
        ]
        if any(a != 0 for a in corners):
            print(f"{path.name}: non-transparent corner alpha {corners}", file=sys.stderr)
            failed = True

        visible = 0
        green_fringe = 0
        magenta_fringe = 0
        min_x = min_y = 256
        max_x = max_y = 0
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = im.getpixel((x, y))
                if a > 12:
                    visible += 1
                    min_x = min(min_x, x)
                    min_y = min(min_y, y)
                    max_x = max(max_x, x)
                    max_y = max(max_y, y)
                    if g > 180 and r < 90 and b < 90:
                        green_fringe += 1
                    if r > 180 and b > 180 and g < 90:
                        magenta_fringe += 1

        if visible < 6500:
            print(f"{path.name}: unexpectedly low visible coverage {visible}", file=sys.stderr)
            failed = True
        fringe_limit = max(12, visible * 0.0015)
        if green_fringe > fringe_limit or magenta_fringe > fringe_limit:
            print(
                f"{path.name}: possible chroma fringe green={green_fringe}, "
                f"magenta={magenta_fringe}, visible={visible}",
                file=sys.stderr,
            )
            failed = True

        print(
            f"{path.name}: alpha ok, visible={visible}, "
            f"bbox={min_x},{min_y}-{max_x},{max_y}, "
            f"green_fringe={green_fringe}, magenta_fringe={magenta_fringe}"
        )

if failed:
    sys.exit(1)
PY

"$MAGICK" "$OUT"/CHAR_Portrait_*_albedo.png -background '#808080' -alpha remove -alpha off +append "$TMP/batch4_grey_check.png"

identify -format '%f %wx%h %b\n' "$OUT"/CHAR_Portrait_*_albedo.png
echo "Grey-background check: $TMP/batch4_grey_check.png"
