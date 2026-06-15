#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch17"
TMP="$ROOT/tools/gen/.tmp_batch17"
OUT="$ROOT/assets/sprites/props"
MAGICK="${MAGICK:-magick}"

mkdir -p "$TMP" "$OUT"

for src in \
  PROP_Market_BasketVeg.png \
  PROP_Market_BasketFruit.png \
  PROP_Market_Sacks.png \
  PROP_Market_Crate.png \
  PROP_Food_NoodleBowl.png \
  PROP_Market_HangingWares.png
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
  local padded="$TMP/${name}_padded.png"
  local resized="$TMP/${name}_resized.png"
  local cleaned="$TMP/${name}_clean.png"
  local quantized="$TMP/${name}_quantized.png"
  local out="$OUT/${name}.png"

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
pad_x = max(8, round(w * 0.04))
pad_y = max(8, round(h * 0.04))
canvas = Image.new("RGBA", (w + pad_x * 2, h + pad_y * 2), (0, 0, 0, 0))
canvas.alpha_composite(im, (pad_x, pad_y))
canvas.save(out)
PY

  "$MAGICK" "$padded" \
    -alpha on \
    -resize "512x512>" \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$resized"

  python3 - "$resized" "$cleaned" "$name" <<'PY'
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

opaque = 0
semi = 0
fringe_removed = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        opaque += 1
        if a < 250:
            semi += 1
        green_key = g > 90 and g > r * 1.16 and g > b * 1.16
        magenta_key = r > 105 and b > 105 and r > g * 1.22 and b > g * 1.22
        if a < 245 and (green_key or magenta_key):
            px[x, y] = (0, 0, 0, 0)
            fringe_removed += 1

coverage = opaque / (w * h)
if not 0.01 <= coverage <= 0.95:
    raise SystemExit(f"{name}: suspicious alpha coverage {coverage:.3f}")

im.save(out, optimize=True)
print(
    f"{name} size={w}x{h} alpha_corners=0 "
    f"coverage={coverage:.3f} semi={semi/(w*h):.3f} fringe_removed={fringe_removed}"
)
PY

  "$MAGICK" "$cleaned" \
    -colors 176 \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$quantized"

  python3 - "$quantized" "$out" "$name" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]

im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
fringe_removed = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        green_key = g > 95 and g > r * 1.16 and g > b * 1.16
        magenta_key = r > 115 and b > 115 and r > g * 1.22 and b > g * 1.22
        if a < 250 and (green_key or magenta_key):
            px[x, y] = (0, 0, 0, 0)
            fringe_removed += 1

corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
if any(corners):
    raise SystemExit(f"{name}: non-transparent corner alpha after quantized cleanup {corners}")

im.save(out, optimize=True)
print(f"{name} final_fringe_removed={fringe_removed}")
PY
}

process_cutout PROP_Market_BasketVeg
process_cutout PROP_Market_BasketFruit
process_cutout PROP_Market_Sacks
process_cutout PROP_Market_Crate
process_cutout PROP_Food_NoodleBowl
process_cutout PROP_Market_HangingWares

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out_dir = Path(sys.argv[1])
names = [
    "PROP_Market_BasketVeg",
    "PROP_Market_BasketFruit",
    "PROP_Market_Sacks",
    "PROP_Market_Crate",
    "PROP_Food_NoodleBowl",
    "PROP_Market_HangingWares",
]

total = 0
for name in names:
    path = out_dir / f"{name}.png"
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    if max(w, h) != 512:
        raise SystemExit(f"{name}: longest side is {max(w, h)}, expected 512")
    px = im.load()
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    if any(corners):
        raise SystemExit(f"{name}: non-transparent final corner alpha {corners}")
    fringe = 0
    opaque = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            opaque += 1
            if a < 250 and g > 95 and g > r * 1.16 and g > b * 1.16:
                fringe += 1
            if a < 250 and r > 115 and b > 115 and r > g * 1.22 and b > g * 1.22:
                fringe += 1
    if fringe:
        raise SystemExit(f"{name}: chroma fringe pixels {fringe}")
    size = path.stat().st_size
    total += size
    print(
        f"{name}.png ok size={w}x{h} bytes={size} "
        f"coverage={opaque/(w*h):.3f} alpha_corners=0 fringe=0"
    )

print(f"total_payload_bytes={total}")
PY
