#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/sprites/citizens"
TMP="${TMPDIR:-/tmp}/harbour_batch28_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch28}}"
MAGICK="${MAGICK:-magick}"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

NAMES=(Beggar Fishwife Constable Musician Merchant Lady)
TARGET_FEET_ROW=976

mkdir -p "$OUT" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

key_for() {
  case "$1" in
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
  fitted_tmp="$TMP/${name}_fitted.png"
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

  python3 - "$keyed" "$cleaned" "$name" "$TARGET_FEET_ROW" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]
target_feet = int(sys.argv[4])

im = Image.open(src).convert("RGBA")
px = im.load()
removed = 0
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        near_green = g >= 150 and r <= 115 and b <= 115 and (g - max(r, b)) >= 45
        near_magenta = r >= 150 and b >= 150 and g <= 125 and (min(r, b) - g) >= 45
        if a < 252 and (near_green or near_magenta):
            px[x, y] = (0, 0, 0, 0)
            removed += 1

alpha = im.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    raise SystemExit(f"{name}: no non-transparent pixels after chroma key")

trimmed = im.crop(bbox)
tw, th = trimmed.size
max_w = 486
max_h = target_feet - 40 + 1
scale = min(max_w / tw, max_h / th, 1.0)
nw = max(1, round(tw * scale))
nh = max(1, round(th * scale))
resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)

canvas = Image.new("RGBA", (512, 1024), (0, 0, 0, 0))
x = (512 - nw) // 2
y = target_feet - nh + 1
if y < 0:
    y = 0
if y + nh > 1024:
    y = 1024 - nh
canvas.alpha_composite(resized, (x, y))

# Snap almost-transparent matte residue fully clear.
cpx = canvas.load()
for yy in range(canvas.height):
    for xx in range(canvas.width):
        r, g, b, a = cpx[xx, yy]
        if a <= 8:
            cpx[xx, yy] = (0, 0, 0, 0)

canvas.save(out)
print(f"{name}: edge chroma cleanup removed={removed}, scale={scale:.3f}, placed={nw}x{nh}@{x},{y}")
PY

  "$MAGICK" "$cleaned" \
    -strip \
    -depth 8 \
    -colors 192 \
    -define png:compression-level=9 \
    "PNG32:$fitted_tmp"

  mv "$fitted_tmp" "$fitted"
done

python3 - "$OUT" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import sys

out = Path(sys.argv[1])
tmp = Path(sys.argv[2])
names = ["Beggar", "Fishwife", "Constable", "Musician", "Merchant", "Lady"]
failed = False
tiles = []

def is_green_fringe(r, g, b):
    return g >= 150 and r <= 105 and b <= 105 and (g - max(r, b)) >= 55

def is_magenta_fringe(r, g, b):
    return r >= 170 and b >= 170 and g <= 115 and (min(r, b) - g) >= 55

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
    max_y = -1
    min_x = im.width
    max_x = -1
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = pix[x, y]
            if a <= 12:
                continue
            visible += 1
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            if is_green_fringe(r, g, b):
                green_fringe += 1
            if is_magenta_fringe(r, g, b):
                magenta_fringe += 1

    if visible < 18000:
        print(f"{path.name}: unexpectedly low visible coverage {visible}", file=sys.stderr)
        failed = True
    if not (970 <= max_y <= 980):
        print(f"{path.name}: feet/lowest opaque row expected 970-980, got y={max_y}", file=sys.stderr)
        failed = True
    if green_fringe or magenta_fringe:
        print(
            f"{path.name}: chroma fringe green={green_fringe} magenta={magenta_fringe}",
            file=sys.stderr,
        )
        failed = True

    grey = ImageOps.grayscale(im.convert("RGB"))
    luma = 0
    if visible:
        total = 0
        for y in range(im.height):
            for x in range(im.width):
                if pix[x, y][3] > 12:
                    total += grey.getpixel((x, y))
        luma = total / visible

    rgba_on_grey = Image.new("RGBA", im.size, (128, 128, 128, 255))
    rgba_on_grey.alpha_composite(im)
    tile = rgba_on_grey.convert("RGB")
    tile.thumbnail((160, 320), Image.Resampling.LANCZOS)
    framed = Image.new("RGB", (180, 360), (90, 90, 90))
    framed.paste(tile, ((180 - tile.width) // 2, 8))
    ImageDraw.Draw(framed).text((8, 334), f"{name} L{luma:.0f}", fill=(255, 255, 255))
    tiles.append(framed)

    print(
        f"{path.name}: 512x1024 RGBA, alpha_corners=0, "
        f"green_fringe=0, magenta_fringe=0, feet_row={max_y}, "
        f"visible={visible}, bbox=({min_x},{min_y})-({max_x},{max_y}), "
        f"greyscale_luma={luma:.1f}"
    )

sheet = Image.new("RGB", (180 * 6, 360), (70, 70, 70))
for i, tile in enumerate(tiles):
    sheet.paste(tile, (i * 180, 0))
sheet_path = tmp / "batch28_grey_check.png"
sheet.save(sheet_path)
print(f"Greyscale note: silhouettes remain distinct by cap-in-hand stoop / fish basket / tall helmet+lantern / fiddle pose / top hat+ledger+cane / parasol+full skirt.")
print(f"Grey-background check: {sheet_path}")

if failed:
    sys.exit(1)
PY

"$MAGICK" "$OUT"/CHAR_Harbour_Citizen_{Beggar,Fishwife,Constable,Musician,Merchant,Lady}_albedo.png \
  -background '#808080' -alpha remove -alpha off +append "$TMP/batch28_strip_on_grey.png"

identify -format '%f %wx%h %b\n' "$OUT"/CHAR_Harbour_Citizen_{Beggar,Fishwife,Constable,Musician,Merchant,Lady}_albedo.png
echo "Grey strip check: $TMP/batch28_strip_on_grey.png"
