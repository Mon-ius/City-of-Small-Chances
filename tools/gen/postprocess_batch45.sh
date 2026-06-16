#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch45"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch45_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Shore_Lighthouse
  PROP_Shore_Town
  PROP_Shore_Cliffs
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
    --key-color "#ff00ff" \
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

pad_x = 2
pad_top = 2
left = max(0, bbox[0] - pad_x)
top = max(0, bbox[1] - pad_top)
right = min(im.width, bbox[2] + pad_x)
bottom = bbox[3]
im = im.crop((left, top, right, bottom))

scale = 768 / max(im.size)
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
            continue
        if r >= 150 and b >= 150 and min(r, b) - g >= 10:
            neutral = min(max(g, 120), 185)
            px[x, y] = (neutral, g, neutral, a)

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

def key_fringe(r, g, b):
    green = g >= 170 and g - max(r, b) >= 18
    magenta = r >= 170 and b >= 170 and min(r, b) - g >= 18
    return green or magenta

def pure_key(r, g, b):
    green = r <= 8 and g >= 247 and b <= 8
    magenta = r >= 247 and g <= 8 and b >= 247
    return green or magenta

for stem in stems:
    path = out_dir / f"{stem}.png"
    im = Image.open(path)
    mode = im.mode
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    edge = 0
    fringe = 0
    visible = 0
    visible_key = 0
    bottom_visible = 0
    for x in range(w):
        bottom_visible += int(px[x, h - 1][3] > 0)
    for r, g, b, a in rgba.getdata():
        if a > 0:
            visible += 1
            visible_key += int(pure_key(r, g, b))
        if 1 <= a <= 254:
            edge += 1
            fringe += int(key_fringe(r, g, b))
    fringe_pct = 0 if edge == 0 else fringe * 100 / edge
    key_pct = 0 if visible == 0 else visible_key * 100 / visible
    coverage = visible * 100 / (w * h)
    shoreline = "bottom edge" if bottom_visible > 0 else "not on bottom edge"
    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, edge_key_fringe={fringe_pct:.2f}%, "
        f"visible_pure_key={key_pct:.2f}%, coverage={coverage:.2f}%, "
        f"shoreline={shoreline}, bytes={os.path.getsize(path)}, "
        f"visual=hazy distant land, no legible text"
    )
PY
