#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch39"
OUT="$ROOT/assets/sprites/decals"
TMP="${TMPDIR:-/tmp}/harbour_batch39_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

STEMS=(
  DECAL_Ground_Puddle
  DECAL_Ground_OilStain
  DECAL_Ground_Moss
  DECAL_Ground_Debris
)

mkdir -p "$OUT" "$TMP"

for stem in "${STEMS[@]}"; do
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
    --key-color '#00ff00' \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  python3 - "$keyed" "$final" <<'PY'
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])

im = Image.open(src).convert("RGBA")
w, h = im.size
scale = min(1.0, 512 / max(w, h))
if scale < 1.0:
    im = im.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)

r, g, b, a = im.split()
a = a.filter(ImageFilter.GaussianBlur(0.55))
a = ImageChops.multiply(a, Image.new("L", im.size, 248))

rgb = Image.merge("RGB", (r, g, b))
quant = rgb.quantize(colors=192, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), a))

px = out_im.load()
w, h = out_im.size
for y in range(h):
    for x in range(w):
        rr, gg, bb, aa = px[x, y]
        if aa >= 16 and gg >= 220 and gg - max(rr, bb) >= 80:
            px[x, y] = (rr, min(gg, max(rr, bb) + 20, 180), bb, aa)
for pos in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
    rr, gg, bb, _ = px[pos]
    px[pos] = (rr, gg, bb, 0)

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

for stem in stems:
    path = out_dir / f"{stem}.png"
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    total = w * h
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    meaningful = 0
    fringe = 0
    soft = 0
    opaque = 0
    for r, g, b, a in im.getdata():
        if a >= 16:
            meaningful += 1
            if g >= 220 and g - max(r, b) >= 80:
                fringe += 1
        if 16 <= a <= 239:
            soft += 1
        if a >= 220:
            opaque += 1
    fringe_pct = 0.0 if meaningful == 0 else fringe * 100 / meaningful
    soft_pct = soft * 100 / total
    opaque_pct = opaque * 100 / total
    coverage_pct = meaningful * 100 / total
    print(
        f"{stem}: {w}x{h}, corners={corners}, green_fringe={fringe_pct:.2f}%, "
        f"coverage={coverage_pct:.2f}%, soft_alpha={soft_pct:.2f}%, "
        f"opaque={opaque_pct:.2f}%, bytes={os.path.getsize(path)}"
    )
PY
