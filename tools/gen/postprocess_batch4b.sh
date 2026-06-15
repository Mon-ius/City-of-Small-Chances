#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/ui/icons"
TMP="${TMPDIR:-/tmp}/harbour_batch4b_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch4b}}"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

NAMES=(
  Money
  Energy
  Hunger
  Stress
  Health
  Hope
  Weather_Clear
  Weather_Cloud
  Weather_Rain
  Weather_Storm
  Weather_Heat
)

mkdir -p "$OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

for name in "${NAMES[@]}"; do
  src="$SOURCE_DIR/${name}.png"
  if [[ ! -f "$src" ]]; then
    echo "Missing source for $name: $src" >&2
    exit 1
  fi

  keyed="$TMP/${name}_alpha.png"
  trimmed="$TMP/${name}_trimmed.png"
  fitted="$TMP/${name}_fitted.png"
  final="$OUT/UI_Icon_${name}.png"

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
    -resize '108x108>' \
    -background none \
    -gravity center \
    -extent 128x128 \
    -colorspace sRGB \
    -depth 8 \
    "$fitted"

  "$MAGICK" "$fitted" \
    -strip \
    -depth 8 \
    -colors 160 \
    -define png:compression-level=9 \
    "PNG32:$final"
done

failed=0
for name in "${NAMES[@]}"; do
  file="$OUT/UI_Icon_${name}.png"
  size="$("$MAGICK" identify -format '%wx%h' "$file")"
  channels="$("$MAGICK" identify -format '%[channels]' "$file")"
  c00="$("$MAGICK" "$file" -format '%[pixel:p{0,0}]' info:)"
  c10="$("$MAGICK" "$file" -format '%[pixel:p{127,0}]' info:)"
  c01="$("$MAGICK" "$file" -format '%[pixel:p{0,127}]' info:)"
  c11="$("$MAGICK" "$file" -format '%[pixel:p{127,127}]' info:)"

  if [[ "$size" != "128x128" ]]; then
    echo "$file: expected 128x128, got $size" >&2
    failed=1
  fi
  if [[ "$channels" != *a* && "$channels" != *A* ]]; then
    echo "$file: missing alpha channel ($channels)" >&2
    failed=1
  fi
  for corner in "$c00" "$c10" "$c01" "$c11"; do
    if [[ "$corner" != *",0)" && "$corner" != *",0]" && "$corner" != *" none"* ]]; then
      echo "$file: non-transparent corner pixel $corner" >&2
      failed=1
      break
    fi
  done

  visible="$("$MAGICK" "$file" -alpha extract -threshold 1% -format '%[fx:mean*w*h]' info:)"
  chroma="$("$MAGICK" "$file" -alpha on -fx 'a>0.05 && g>0.70 && r<0.35 && b<0.35 ? 1 : 0' -format '%[fx:mean*w*h]' info:)"
  if (( ${chroma%.*} > 4 )); then
    echo "$file: possible green chroma fringe pixels ${chroma%.*}" >&2
    failed=1
  fi
  echo "$(basename "$file"): alpha ok, visible=${visible%.*}, green_fringe=${chroma%.*}"
done

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

"$MAGICK" "$OUT"/UI_Icon_*.png -background '#808080' -alpha remove -alpha off +append "$TMP/batch4b_grey_check.png"
"$MAGICK" "$OUT"/UI_Icon_*.png -background white -alpha remove -alpha off +append "$TMP/batch4b_white_check.png"

identify -format '%f %wx%h %b\n' "$OUT"/UI_Icon_*.png
echo "Grey-background check: $TMP/batch4b_grey_check.png"
echo "White-background check: $TMP/batch4b_white_check.png"
