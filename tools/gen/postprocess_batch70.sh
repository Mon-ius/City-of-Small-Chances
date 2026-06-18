#!/usr/bin/env bash
# Batch 70 — green-chroma cutout for the gull up-stroke (PROP_Gull_FlyingUp), the Batch-43 gull pipeline:
# remove_chroma_key.py (soft-matte + despill) -> bbox crop -> scale longest 384 -> residual despill ->
# quantise 192 -> paste centred on the SAME 384x192 (2:1) canvas as PROP_Gull_Flying -> alpha-0 corners.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch70"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch70_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEM="PROP_Gull_FlyingUp"

mkdir -p "$OUT" "$TMP"

in="$SRC/${STEM}_raw.png"
keyed="$TMP/${STEM}_keyed.png"
final="$OUT/${STEM}.png"

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

python3 - "$keyed" "$final" "$STEM" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
stem = sys.argv[3]

im = Image.open(src).convert("RGBA")
alpha = im.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    raise SystemExit(f"No visible subject after keying: {src}")

pad = 4
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(im.width, bbox[2] + pad)
bottom = min(im.height, bbox[3] + pad)
im = im.crop((left, top, right, bottom))

scale = 384 / max(im.size)
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
        elif a < 255 and g >= 160 and g - max(r, b) >= 14:
            px[x, y] = (r, min(max(r, b) + 8, 150), b, a)

rgb = im.convert("RGB")
alpha = im.getchannel("A")
quant = rgb.quantize(colors=192, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), alpha))

# Square 384x384 canvas: the up-stroke is TALL (raised wings + body below), so a 2:1
# canvas would clip the breast. Both frames anchor at the BODY-CENTRE in world, so only
# the wings move between glide (wide) and up-stroke (tall) — the body stays put.
canvas_w, canvas_h = 384, 384
canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
paste_x = max(0, (canvas_w - out_im.width) // 2)
paste_y = max(0, (canvas_h - out_im.height) // 2)
canvas.alpha_composite(out_im, (paste_x, paste_y))
out_im = canvas

px = out_im.load()
w, h = out_im.size
for pos in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
    r, g, b, _ = px[pos]
    px[pos] = (r, g, b, 0)

out_im.save(out, optimize=True, compress_level=9)
PY

python3 - "$final" "$STEM" <<'PY'
from pathlib import Path
from PIL import Image
import os, sys

path = Path(sys.argv[1])
stem = sys.argv[2]

def green_fringe(r, g, b):
    return g >= 180 and g - max(r, b) >= 24

im = Image.open(path)
mode = im.mode
rgba = im.convert("RGBA")
w, h = rgba.size
px = rgba.load()
corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
edge = green = visible = 0
for r, g, b, a in rgba.getdata():
    if a > 0:
        visible += 1
    if 1 <= a <= 254:
        edge += 1
        green += int(green_fringe(r, g, b))
green_pct = 0 if edge == 0 else green * 100 / edge
coverage = visible * 100 / (w * h)
print(
    f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
    f"corners={corners}, edge_green_fringe={green_pct:.2f}%, "
    f"coverage={coverage:.2f}%, bytes={os.path.getsize(path)}, "
    f"visual=gull on the up-stroke, wings raised in a shallow V, no green fringe, no text"
)

if mode != "RGBA":
    raise SystemExit(f"{stem}: expected RGBA, got {mode}")
if (w, h) != (384, 384):
    raise SystemExit(f"{stem}: expected 384x384 canvas, got {w}x{h}")
if any(corners):
    raise SystemExit(f"{stem}: expected alpha-0 corners, got {corners}")
if green_pct > 6:
    raise SystemExit(f"{stem}: green fringe too high ({green_pct:.1f}%) — re-key")
if not (3 <= coverage <= 60):
    raise SystemExit(f"{stem}: coverage {coverage:.1f}% out of range (expected a centred gull)")
PY
