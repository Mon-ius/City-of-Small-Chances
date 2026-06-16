#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch44"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch44_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Ship_TallShip
  PROP_Ship_Trawler
  PROP_Ship_Barge
)

mkdir -p "$OUT" "$TMP"

for stem in "${STEMS[@]}"; do
  in="$SRC/${stem}_raw.png"
  keyed="$TMP/${stem}_keyed.png"
  final="$OUT/${stem}.png"

  if [[ ! -f "$in" ]]; then
    echo "Missing source: $in" >&2
    exit 1
  fi

  python3 "$CHROMA" \
    --input "$in" \
    --out "$keyed" \
    --key-color "#00ff00" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  python3 - "$keyed" "$final" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])

im = Image.open(src).convert("RGBA")
alpha = im.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    raise SystemExit(f"No visible subject after keying: {src}")

pad = 4
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(im.width, bbox[2] + pad)
bottom = bbox[3]
im = im.crop((left, top, right, bottom))

scale = 512 / max(im.size)
if scale != 1:
    im = im.resize(
        (max(1, round(im.width * scale)), max(1, round(im.height * scale))),
        Image.Resampling.LANCZOS,
    )

px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
        elif g >= 150 and g - max(r, b) >= 10:
            px[x, y] = (r, min(max(r, b) + 4, 140), b, a)

rgb = im.convert("RGB")
alpha = im.getchannel("A")
quant = rgb.quantize(colors=192, method=Image.Quantize.MEDIANCUT).convert("RGB")
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
    return g >= 170 and g - max(r, b) >= 18

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
    pure_key = 0
    visible = 0
    for r, g, b, a in rgba.getdata():
        if a > 0:
            visible += 1
            pure_key += int(r <= 8 and g >= 247 and b <= 8)
        if 1 <= a <= 254:
            edge += 1
            green += int(green_fringe(r, g, b))
    green_pct = 0 if edge == 0 else green * 100 / edge
    pure_key_pct = 0 if visible == 0 else pure_key * 100 / visible
    coverage = visible * 100 / (w * h)
    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, edge_green_fringe={green_pct:.2f}%, "
        f"visible_pure_key={pure_key_pct:.2f}%, coverage={coverage:.2f}%, "
        f"bytes={os.path.getsize(path)}"
    )
PY
