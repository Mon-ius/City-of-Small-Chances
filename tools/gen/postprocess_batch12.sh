#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch12"
TMP="$ROOT/tools/gen/.tmp_batch12"
MAGICK="${MAGICK:-magick}"

mkdir -p "$TMP" "$ROOT/assets/sprites/props"

for src in \
  PROP_Eco_Receipt.png \
  PROP_Eco_BillNotice.png \
  PROP_Eco_RouteCard.png \
  PROP_Eco_RentNotice.png \
  PROP_Eco_ApplicationForm.png \
  PROP_Eco_Manifest.png \
  PROP_Kit_Phone.png \
  PROP_Kit_StudyBooks.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

process_cutout() {
  local name="$1"
  local stripped="$TMP/${name}_alpha.png"
  local trimmed="$TMP/${name}_trim.png"
  local framed="$TMP/${name}_framed.png"
  local cleaned="$TMP/${name}_clean.png"
  local out="$ROOT/assets/sprites/props/${name}.png"

  python3 "$REMOVE_KEY" \
    --input "$SRC/${name}.png" \
    --out "$stripped" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  "$MAGICK" "$stripped" -alpha on -trim +repage "$trimmed"
  "$MAGICK" "$trimmed" \
    -alpha on \
    -resize "512x512>" \
    -background none \
    -gravity center \
    -extent "512x512" \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$framed"

  python3 - "$framed" "$cleaned" "$name" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]

im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
corner_alpha = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
if any(corner_alpha):
    raise SystemExit(f"{name}: non-transparent corner alpha {corner_alpha}")

fringe_removed = 0
opaque = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        opaque += 1
        green_key = g > 95 and g > r * 1.18 and g > b * 1.18
        magenta_key = r > 110 and b > 110 and r > g * 1.25 and b > g * 1.25
        if a < 250 and (green_key or magenta_key):
            px[x, y] = (0, 0, 0, 0)
            fringe_removed += 1

coverage = opaque / (w * h)
if not 0.03 <= coverage <= 0.92:
    raise SystemExit(f"{name}: suspicious alpha coverage {coverage:.3f}")

im.save(out, optimize=True)
print(f"{name} alpha_corners=0 fringe_removed={fringe_removed} coverage={coverage:.3f}")
PY

  "$MAGICK" "$cleaned" \
    -colors 176 \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$out"
}

process_cutout PROP_Eco_Receipt
process_cutout PROP_Eco_BillNotice
process_cutout PROP_Eco_RouteCard
process_cutout PROP_Eco_RentNotice
process_cutout PROP_Eco_ApplicationForm
process_cutout PROP_Eco_Manifest
process_cutout PROP_Kit_Phone
process_cutout PROP_Kit_StudyBooks

python3 - "$ROOT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

root = Path(sys.argv[1])
names = [
    "PROP_Eco_Receipt",
    "PROP_Eco_BillNotice",
    "PROP_Eco_RouteCard",
    "PROP_Eco_RentNotice",
    "PROP_Eco_ApplicationForm",
    "PROP_Eco_Manifest",
    "PROP_Kit_Phone",
    "PROP_Kit_StudyBooks",
]

for name in names:
    path = root / "assets" / "sprites" / "props" / f"{name}.png"
    im = Image.open(path).convert("RGBA")
    if im.size != (512, 512):
        raise SystemExit(f"{name}: wrong size {im.size}")
    px = im.load()
    w, h = im.size
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    if any(corners):
        raise SystemExit(f"{name}: non-transparent final corner alpha {corners}")
    fringe = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if a < 250 and g > 100 and g > r * 1.18 and g > b * 1.18:
                fringe += 1
            if a < 250 and r > 120 and b > 120 and r > g * 1.25 and b > g * 1.25:
                fringe += 1
    if fringe:
        raise SystemExit(f"{name}: chroma fringe pixels {fringe}")
    print(f"{name}.png ok size=512x512 alpha_corners=0 fringe=0 bytes={path.stat().st_size}")
PY
