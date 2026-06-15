#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch4c}}"
ICON_OUT="$ROOT/assets/ui/icons"
MARKER_OUT="$ROOT/assets/ui/markers"
TMP="${TMPDIR:-/tmp}/harbour_batch4c_postprocess"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

mkdir -p "$ICON_OUT" "$MARKER_OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

ITEMS=(
  "market_haul|icons|UI_Icon_Job_market_haul.png|green"
  "harbour_labour|icons|UI_Icon_Job_harbour_labour.png|neutral"
  "dock_load|icons|UI_Icon_Job_dock_load.png|neutral"
  "courier_run|icons|UI_Icon_Job_courier_run.png|green"
  "civic_filing|icons|UI_Icon_Job_civic_filing.png|neutral"
  "tenements|markers|UI_Marker_tenements.png|green"
  "market_row|markers|UI_Marker_market_row.png|black"
  "old_harbour|markers|UI_Marker_old_harbour.png|neutral"
  "dockside|markers|UI_Marker_dockside.png|neutral"
  "uptown|markers|UI_Marker_uptown.png|green"
  "skill|icons|UI_Icon_Web_skill.png|green"
  "relationship|icons|UI_Icon_Web_relationship.png|green"
  "reputation|icons|UI_Icon_Web_reputation.png|green"
  "possession|icons|UI_Icon_Web_possession.png|green"
  "timing|icons|UI_Icon_Web_timing.png|green"
  "history|icons|UI_Icon_Web_history.png|green"
  "logistics|icons|UI_Icon_Skill_logistics.png|green"
  "service|icons|UI_Icon_Skill_service.png|green"
  "maintenance|icons|UI_Icon_Skill_maintenance.png|green"
  "cooking|icons|UI_Icon_Skill_cooking.png|green"
  "communication|icons|UI_Icon_Skill_communication.png|green"
  "focus|icons|UI_Icon_Skill_focus.png|green"
  "resilience|icons|UI_Icon_Skill_resilience.png|magenta"
)

fuzz_for_key() {
  case "$1" in
    green|magenta) printf '18%%' ;;
    black) printf '6%%' ;;
    *) printf '8%%' ;;
  esac
}

for item in "${ITEMS[@]}"; do
  IFS='|' read -r id family out_name key_kind <<<"$item"
  src="$SOURCE_DIR/${id}.png"
  if [[ ! -f "$src" ]]; then
    echo "Missing source for $id: $src" >&2
    exit 1
  fi

  if [[ "$family" == "markers" ]]; then
    out_dir="$MARKER_OUT"
  else
    out_dir="$ICON_OUT"
  fi

  keyed="$TMP/${id}_alpha.png"
  flood="$TMP/${id}_flood.png"
  trimmed="$TMP/${id}_trimmed.png"
  fitted="$TMP/${id}_fitted.png"
  final="$out_dir/$out_name"
  fuzz="$(fuzz_for_key "$key_kind")"

  # Use the bundled remover/despill for true chroma-key sources. Some built-in
  # outputs landed with neutral/black removable borders; those are cleaner when
  # flood-filled from the original so pale icon highlights stay opaque.
  if [[ "$key_kind" == "green" || "$key_kind" == "magenta" ]]; then
    python3 "$CHROMA" \
      --input "$src" \
      --out "$keyed" \
      --auto-key border \
      --soft-matte \
      --transparent-threshold 12 \
      --opaque-threshold 220 \
      --despill \
      --force
    base="$keyed"
  else
    base="$src"
  fi

  "$MAGICK" "$base" \
    -alpha set \
    -fuzz "$fuzz" \
    -fill none \
    -draw 'color 0,0 floodfill' \
    -draw 'color %[fx:w-1],0 floodfill' \
    -draw 'color 0,%[fx:h-1] floodfill' \
    -draw 'color %[fx:w-1],%[fx:h-1] floodfill' \
    "$flood"

  "$MAGICK" "$flood" -alpha on -trim +repage "$trimmed"
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
    -alpha on \
    -channel A \
    -black-threshold 1% \
    +channel \
    -strip \
    -depth 8 \
    -colors 160 \
    -define png:compression-level=9 \
    "PNG32:$final"
done

failed=0
FINALS=()
for item in "${ITEMS[@]}"; do
  IFS='|' read -r _ family out_name _ <<<"$item"
  if [[ "$family" == "markers" ]]; then
    file="$MARKER_OUT/$out_name"
  else
    file="$ICON_OUT/$out_name"
  fi
  FINALS+=("$file")

  size="$("$MAGICK" identify -format '%wx%h' "$file")"
  channels="$("$MAGICK" identify -format '%[channels]' "$file")"
  if [[ "$size" != "128x128" ]]; then
    echo "$file: expected 128x128, got $size" >&2
    failed=1
  fi
  if [[ "$channels" != *a* && "$channels" != *A* ]]; then
    echo "$file: missing alpha channel ($channels)" >&2
    failed=1
  fi

  for xy in "0,0" "127,0" "0,127" "127,127"; do
    corner="$("$MAGICK" "$file" -format "%[pixel:p{$xy}]" info:)"
    if [[ "$corner" != *",0)" && "$corner" != *",0]" && "$corner" != *" none"* ]]; then
      echo "$file: non-transparent corner pixel $xy $corner" >&2
      failed=1
      break
    fi
  done

  visible="$("$MAGICK" "$file" -alpha extract -threshold 1% -format '%[fx:mean*w*h]' info:)"
  green="$("$MAGICK" "$file" -alpha on -fx 'a>0.05 && g>0.70 && r<0.35 && b<0.35 ? 1 : 0' -format '%[fx:mean*w*h]' info:)"
  magenta="$("$MAGICK" "$file" -alpha on -fx 'a>0.05 && r>0.70 && b>0.70 && g<0.35 ? 1 : 0' -format '%[fx:mean*w*h]' info:)"
  if (( ${green%.*} > 4 )); then
    echo "$file: possible green chroma fringe pixels ${green%.*}" >&2
    failed=1
  fi
  if (( ${magenta%.*} > 4 )); then
    echo "$file: possible magenta chroma fringe pixels ${magenta%.*}" >&2
    failed=1
  fi

  echo "$(basename "$file"): alpha ok, visible=${visible%.*}, green_fringe=${green%.*}, magenta_fringe=${magenta%.*}"
done

if [[ "$failed" -ne 0 ]]; then
  exit 1
fi

"$MAGICK" "${FINALS[@]}" -background '#808080' -alpha remove -alpha off +append "$TMP/batch4c_grey_check.png"
"$MAGICK" "${FINALS[@]}" -background white -alpha remove -alpha off +append "$TMP/batch4c_white_check.png"

identify -format '%f %wx%h %b\n' "${FINALS[@]}"
echo "Grey-background check: $TMP/batch4c_grey_check.png"
echo "White-background check: $TMP/batch4c_white_check.png"
