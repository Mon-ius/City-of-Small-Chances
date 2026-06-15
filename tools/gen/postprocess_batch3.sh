#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/sprites/citizens"
TMP="${TMPDIR:-/tmp}/harbour_batch3_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch3}}"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

ROLES=(MarketVendor DockWorker Commuter Elder Fisher Youth)

mkdir -p "$OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

for role in "${ROLES[@]}"; do
  src="$SOURCE_DIR/${role}.png"
  if [[ ! -f "$src" ]]; then
    echo "Missing source for $role: $src" >&2
    exit 1
  fi

  keyed="$TMP/${role}_alpha.png"
  trimmed="$TMP/${role}_trimmed.png"
  fitted="$OUT/CHAR_Harbour_Citizen_${role}_albedo.png"

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
    -resize '486x972>' \
    -background none \
    -gravity center \
    -extent 512x1024 \
    -colorspace sRGB \
    -depth 8 \
    "$TMP/${role}_fitted.png"

  "$MAGICK" "$TMP/${role}_fitted.png" \
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
roles = ["MarketVendor", "DockWorker", "Commuter", "Elder", "Fisher", "Youth"]
failed = False

for role in roles:
    path = out / f"CHAR_Harbour_Citizen_{role}_albedo.png"
    im = Image.open(path).convert("RGBA")
    if im.size != (512, 1024):
        print(f"{path.name}: expected 512x1024, got {im.size}", file=sys.stderr)
        failed = True
    corners = [im.getpixel((0, 0))[3], im.getpixel((511, 0))[3], im.getpixel((0, 1023))[3], im.getpixel((511, 1023))[3]]
    if any(a != 0 for a in corners):
        print(f"{path.name}: non-transparent corner alpha {corners}", file=sys.stderr)
        failed = True
    pix = im.load()
    visible = 0
    chroma_edge = 0
    min_y = im.height
    max_y = 0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pix[x, y]
            if a > 12:
                visible += 1
                min_y = min(min_y, y)
                max_y = max(max_y, y)
                if g > 180 and r < 80 and b < 80:
                    chroma_edge += 1
    if visible < 18000:
        print(f"{path.name}: unexpectedly low visible coverage {visible}", file=sys.stderr)
        failed = True
    if chroma_edge > max(16, visible * 0.0015):
        print(f"{path.name}: possible green fringe pixels {chroma_edge}/{visible}", file=sys.stderr)
        failed = True
    if max_y < 820:
        print(f"{path.name}: feet/lowest opaque pixel too high at y={max_y}", file=sys.stderr)
        failed = True
    print(f"{path.name}: alpha ok, visible={visible}, bbox_y={min_y}-{max_y}, green_fringe_pixels={chroma_edge}")

if failed:
    sys.exit(1)
PY

"$MAGICK" "$OUT"/CHAR_Harbour_Citizen_*_albedo.png -background '#808080' -alpha remove -alpha off +append "$TMP/batch3_grey_check.png"

identify -format '%f %wx%h %b\n' "$OUT"/CHAR_Harbour_Citizen_*_albedo.png
echo "Grey-background check: $TMP/batch3_grey_check.png"
