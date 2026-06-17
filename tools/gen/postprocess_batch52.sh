#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch52"
OUT="$ROOT/assets/sprites/props"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

KEY="#ff00ff"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  PROP_Market_FishSlab
  PROP_Market_Cheese
  PROP_Market_Bread
)

mkdir -p "$OUT"

for stem in "${STEMS[@]}"; do
  raw="$SRC/${stem}_raw.png"
  keyed="$TMP/${stem}_keyed.png"
  final="$OUT/${stem}.png"

  if [[ ! -f "$raw" ]]; then
    echo "Missing source: $raw" >&2
    exit 1
  fi

  python3 "$CHROMA" \
    --input "$raw" \
    --out "$keyed" \
    --key-color "$KEY" \
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
        if a < 10:
            px[x, y] = (0, 0, 0, 0)
            continue
        if r >= 175 and b >= 175 and min(r, b) - g >= 18:
            neutral = min(max(g + 12, 80), 185)
            px[x, y] = (neutral, min(g, neutral), neutral, a)

rgb = im.convert("RGB")
alpha = im.getchannel("A")
quant = rgb.quantize(colors=224, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), alpha))

px = out_im.load()
w, h = out_im.size
for pos in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
    r, g, b, _ = px[pos]
    px[pos] = (r, g, b, 0)

out.parent.mkdir(parents=True, exist_ok=True)
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
    "PROP_Market_FishSlab": "reads as a fishmonger's slab of fresh silver fish on ice with no legible text",
    "PROP_Market_Cheese": "reads as stacked cheese wheels with one cut wedge and no legible text",
    "PROP_Market_Bread": "reads as a basket/board heaped with golden-brown loaves and no legible text",
}

def magenta_fringe(r, g, b):
    return r >= 170 and b >= 170 and min(r, b) - g >= 18

def pure_key(r, g, b):
    return r >= 247 and g <= 8 and b >= 247

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
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            visible += 1
            visible_key += int(pure_key(r, g, b))
            adjacent_transparent = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] == 0:
                    adjacent_transparent = True
                    break
            if adjacent_transparent:
                edge += 1
                fringe += int(magenta_fringe(r, g, b))
    fringe_pct = 0 if edge == 0 else fringe * 100 / edge
    visible_key_pct = 0 if visible == 0 else visible_key * 100 / visible
    size = os.path.getsize(path)

    print(
        f"{stem}: mode={mode}, size={w}x{h}, longest={max(w, h)}, "
        f"corners={corners}, residual_magenta_edge={fringe_pct:.2f}%, "
        f"visible_pure_key={visible_key_pct:.2f}%, bytes={size}, visual={notes[stem]}"
    )

    if mode != "RGBA":
        raise SystemExit(f"{stem}: expected RGBA, got {mode}")
    if max(w, h) != 512:
        raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
    if any(corners):
        raise SystemExit(f"{stem}: expected alpha-0 corners, got {corners}")
    if fringe_pct != 0 or visible_key_pct != 0:
        raise SystemExit(f"{stem}: residual magenta detected")
    aspect = w / h
    if stem in {"PROP_Market_FishSlab", "PROP_Market_Bread"} and aspect <= 1.15:
        raise SystemExit(f"{stem}: expected landscape aspect, got {w}x{h}")
    if stem == "PROP_Market_Cheese" and not (0.85 <= aspect <= 1.35):
        raise SystemExit(f"{stem}: expected square/slightly wide aspect, got {w}x{h}")
PY
