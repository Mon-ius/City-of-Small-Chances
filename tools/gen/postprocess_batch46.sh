#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch46"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch46_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Plant_PottedTree
  PROP_Plant_Flowers
  PROP_Tree_Quay
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

pad = 3
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

px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        if r >= 150 and b >= 150 and min(r, b) - g >= 10:
            neutral = min(max(g, 80), 175)
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
    return r >= 170 and b >= 170 and min(r, b) - g >= 18

def pure_key(r, g, b):
    return r >= 247 and g <= 8 and b >= 247

notes = {
    "PROP_Plant_PottedTree": "reads as clipped bay topiary in tub, no legible text",
    "PROP_Plant_Flowers": "reads as half-barrel flower planter, no legible text",
    "PROP_Tree_Quay": "reads as modest quayside broadleaf tree, no legible text",
}

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
    for r, g, b, a in rgba.getdata():
        if a > 0:
            visible += 1
            visible_key += int(pure_key(r, g, b))
        if 1 <= a <= 254:
            edge += 1
            fringe += int(key_fringe(r, g, b))
    fringe_pct = 0 if edge == 0 else fringe * 100 / edge
    key_pct = 0 if visible == 0 else visible_key * 100 / visible
    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, edge_magenta_fringe={fringe_pct:.2f}%, "
        f"visible_pure_key={key_pct:.2f}%, bytes={os.path.getsize(path)}, "
        f"visual={notes[stem]}"
    )
    if mode != "RGBA":
        raise SystemExit(f"{stem}: expected RGBA, got {mode}")
    if max(w, h) != 512:
        raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
    if any(corners):
        raise SystemExit(f"{stem}: expected transparent corners, got {corners}")
    if fringe_pct != 0 or key_pct != 0:
        raise SystemExit(f"{stem}: residual magenta detected")
PY
