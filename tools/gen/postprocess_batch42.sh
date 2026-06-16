#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch42"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch42_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Quay_RopeCoil
  PROP_Quay_FishingNet
  PROP_Quay_Buoys
  PROP_Quay_LobsterPots
)

KEYS=(
  "#00ff00"
  "#ff00ff"
  "#00ff00"
  "#00ff00"
)

mkdir -p "$OUT" "$TMP"

for i in "${!STEMS[@]}"; do
  stem="${STEMS[$i]}"
  key="${KEYS[$i]}"
  in="$SRC/${stem}.png"
  keyed="$TMP/${stem}_keyed.png"
  final="$OUT/${stem}.png"

  if [[ ! -f "$in" ]]; then
    echo "Missing source: $in" >&2
    exit 1
  fi

  python3 "$CHROMA" \
    --input "$in" \
    --out "$keyed" \
    --key-color "$key" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  python3 - "$keyed" "$final" "$key" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
key = sys.argv[3].lower()

im = Image.open(src).convert("RGBA")
a = im.getchannel("A")
bbox = a.getbbox()
if not bbox:
    raise SystemExit(f"No visible subject after keying: {src}")

pad = 4
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(im.width, bbox[2] + pad)
bottom = min(im.height, bbox[3] + pad)
im = im.crop((left, top, right, bottom))

scale = 512 / max(im.size)
if scale != 1:
    im = im.resize(
        (max(1, round(im.width * scale)), max(1, round(im.height * scale))),
        Image.Resampling.LANCZOS,
    )

kr = int(key[1:3], 16)
kg = int(key[3:5], 16)
kb = int(key[5:7], 16)
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, alpha = px[x, y]
        if alpha == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        if alpha < 255:
            if key == "#00ff00" and g >= 180 and g - max(r, b) >= 24:
                g = min(max(r, b) + 10, 170)
            elif key == "#ff00ff" and r >= 180 and b >= 180 and min(r, b) - g >= 24:
                m = max(g + 10, 130)
                r = min(r, m)
                b = min(b, m)
            px[x, y] = (r, g, b, alpha)

rgb = im.convert("RGB")
alpha = im.getchannel("A")
quant = rgb.quantize(colors=224, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), alpha))
px = out_im.load()
w, h = out_im.size
for pos in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
    r, g, b, _ = px[pos]
    px[pos] = (r, g, b, 0)

out_im.save(out, optimize=True, compress_level=9)
PY
done

python3 - "$OUT" "${STEMS[@]}" <<'PY'
from pathlib import Path
from PIL import Image
import os
import sys

out_dir = Path(sys.argv[1])
stems = sys.argv[2:]

def green_fringe(r, g, b):
    return g >= 220 and g - max(r, b) >= 80

def magenta_fringe(r, g, b):
    return r >= 220 and b >= 220 and min(r, b) - g >= 80

for stem in stems:
    path = out_dir / f"{stem}.png"
    im = Image.open(path)
    mode = im.mode
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    edge = 0
    green = 0
    magenta = 0
    visible = 0
    for r, g, b, a in rgba.getdata():
        if a > 0:
            visible += 1
        if 1 <= a <= 254:
            edge += 1
            green += int(green_fringe(r, g, b))
            magenta += int(magenta_fringe(r, g, b))
    green_pct = 0 if edge == 0 else green * 100 / edge
    magenta_pct = 0 if edge == 0 else magenta * 100 / edge
    coverage = visible * 100 / (w * h)
    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, edge_green_fringe={green_pct:.2f}%, "
        f"edge_magenta_fringe={magenta_pct:.2f}%, coverage={coverage:.2f}%, "
        f"bytes={os.path.getsize(path)}"
    )
PY
