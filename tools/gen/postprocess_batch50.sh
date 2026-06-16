#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch50"
OUT="$ROOT/assets/sprites/props"
TMP="${TMPDIR:-/tmp}/harbour_batch50_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Cargo_Barrels
  PROP_Cargo_Handbarrow
  PROP_Cargo_Anchor
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
    --despill \
    --force

  python3 - "$keyed" "$final" "$stem" <<'PY'
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

pad = 2
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(im.width, bbox[2] + pad)
bottom = min(im.height, bbox[3] + pad)
im = im.crop((left, top, right, bottom))

scale = 512 / max(im.size)
im = im.resize(
    (max(1, round(im.width * scale)), max(1, round(im.height * scale))),
    Image.Resampling.LANCZOS,
)

px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
            continue
        if g >= 95 and g - max(r, b) >= 8:
            m = max(r, b)
            px[x, y] = (m, min(g, m), m, a)

rgb = im.convert("RGB")
alpha = im.getchannel("A")
quant = rgb.quantize(colors=192, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), alpha))

px = out_im.load()
w, h = out_im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
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

notes = {
    "PROP_Cargo_Barrels": "reads as a weathered cluster of harbour barrels with no legible text",
    "PROP_Cargo_Handbarrow": "reads as a tilted wooden dock handbarrow with sack and no legible text",
    "PROP_Cargo_Anchor": "reads as a rusted ship anchor with chain and no legible text",
}

def green_fringe(r, g, b):
    return g >= 120 and g - max(r, b) >= 20

def pure_key(r, g, b):
    return r <= 8 and g >= 247 and b <= 8

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
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            adjacent_transparent = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    adjacent_transparent = True
                    break
            if adjacent_transparent:
                edge += 1
                fringe += int(green_fringe(r, g, b))
    fringe_pct = 0 if edge == 0 else fringe * 100 / edge
    key_pct = 0 if visible == 0 else visible_key * 100 / visible
    size = os.path.getsize(path)
    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, edge_green_fringe={fringe_pct:.2f}%, "
        f"visible_pure_key={key_pct:.2f}%, bytes={size}, visual={notes[stem]}"
    )
    if mode != "RGBA":
        raise SystemExit(f"{stem}: expected RGBA, got {mode}")
    if max(w, h) != 512:
        raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
    if any(corners):
        raise SystemExit(f"{stem}: expected transparent corners, got {corners}")
    if fringe_pct != 0 or key_pct != 0:
        raise SystemExit(f"{stem}: residual green detected")
    aspect = w / h
    if stem == "PROP_Cargo_Barrels" and not (0.80 <= aspect <= 1.25):
        raise SystemExit(f"{stem}: expected roughly square framing, got {w}x{h}")
    if stem == "PROP_Cargo_Handbarrow" and not (aspect < 0.90):
        raise SystemExit(f"{stem}: expected portrait framing, got {w}x{h}")
    if stem == "PROP_Cargo_Anchor" and not (0.80 <= aspect <= 1.25):
        raise SystemExit(f"{stem}: expected roughly square framing, got {w}x{h}")
PY
