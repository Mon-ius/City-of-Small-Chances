#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch49"
OUT="$ROOT/assets/sprites/props"
SMOKE_RGB="216,212,205"

STEMS=(
  PROP_Smoke_Wisp
  PROP_Smoke_Plume
  PROP_Smoke_Column
)

mkdir -p "$OUT"

for stem in "${STEMS[@]}"; do
  in="$SRC/${stem}_raw.png"
  final="$OUT/${stem}.png"

  if [[ ! -f "$in" ]]; then
    echo "Missing source: $in" >&2
    exit 1
  fi

  python3 - "$in" "$final" "$stem" "$SMOKE_RGB" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
stem = sys.argv[3]
smoke_rgb = tuple(int(v) for v in sys.argv[4].split(","))

im = Image.open(src).convert("RGB")
px = im.load()
w, h = im.size

alpha = Image.new("L", (w, h), 0)
apx = alpha.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        lum = int(round(0.299 * r + 0.587 * g + 0.114 * b))
        apx[x, y] = 0 if lum < 8 else lum

bbox = alpha.getbbox()
if not bbox:
    raise SystemExit(f"{stem}: no luminance alpha content in {src}")

rgb = Image.new("RGB", (w, h), smoke_rgb)
rgba = Image.merge("RGBA", (*rgb.split(), alpha))

crop = rgba.crop(bbox)
pad = 10
padded = Image.new("RGBA", (crop.width + pad * 2, crop.height + pad * 2), (*smoke_rgb, 0))
padded.alpha_composite(crop, (pad, pad))

scale = 512 / max(padded.size)
if scale != 1:
    padded = padded.resize(
        (max(1, round(padded.width * scale)), max(1, round(padded.height * scale))),
        Image.Resampling.LANCZOS,
    )

rgba = Image.new("RGBA", padded.size, (*smoke_rgb, 0))
rgba.alpha_composite(padded, (0, 0))

alpha = rgba.getchannel("A")
apx = alpha.load()
for y in range(alpha.height):
    for x in range(alpha.width):
        if apx[x, y] < 8:
            apx[x, y] = 0
rgba.putalpha(alpha)

px = rgba.load()
for y in range(rgba.height):
    for x in range(rgba.width):
        px[x, y] = (*smoke_rgb, px[x, y][3])

rgba.save(out, optimize=True, compress_level=9)
PY
done

python3 - "$OUT" "${STEMS[@]}" <<'PY'
from pathlib import Path
from PIL import Image
import math
import os
import statistics
import sys

out_dir = Path(sys.argv[1])
stems = sys.argv[2:]

notes = {
    "PROP_Smoke_Wisp": "reads as a thin soft translucent rising wisp with no legible text",
    "PROP_Smoke_Plume": "reads as a steady soft translucent rising plume with no legible text",
    "PROP_Smoke_Column": "reads as a fuller soft translucent rising column with no legible text",
}

for stem in stems:
    path = out_dir / f"{stem}.png"
    im = Image.open(path)
    rgba = im.convert("RGBA")
    w, h = rgba.size
    raw = rgba.tobytes()
    pixels = [tuple(raw[i:i + 4]) for i in range(0, len(raw), 4)]
    alphas = [a for _, _, _, a in pixels]
    visible_alphas = [a for a in alphas if a > 0]
    unique_alpha = set(alphas)
    unique_visible_alpha = set(visible_alphas)
    rgb_values = [(r, g, b) for r, g, b, _ in pixels]
    channels = list(zip(*rgb_values))
    rgb_std = tuple(statistics.pstdev(c) for c in channels)
    corners = [
        rgba.getpixel((0, 0))[3],
        rgba.getpixel((w - 1, 0))[3],
        rgba.getpixel((0, h - 1))[3],
        rgba.getpixel((w - 1, h - 1))[3],
    ]
    alpha_min = min(alphas)
    alpha_med = statistics.median(visible_alphas)
    alpha_max = max(alphas)
    soft = len(unique_visible_alpha) >= 32 and alpha_max - min(visible_alphas) >= 80
    binary = unique_alpha.issubset({0, 255})
    rgb_uniform = all(v <= 0.001 for v in rgb_std)

    print(
        f"{stem}: mode={im.mode}, size={w}x{h}, longest={max(w,h)}, "
        f"corners={corners}, alpha_min={alpha_min}, alpha_visible_median={alpha_med:.1f}, "
        f"alpha_max={alpha_max}, alpha_unique_visible={len(unique_visible_alpha)}, "
        f"binary_mask={binary}, rgb_std=({rgb_std[0]:.4f},{rgb_std[1]:.4f},{rgb_std[2]:.4f}), "
        f"bytes={os.path.getsize(path)}, visual={notes[stem]}"
    )

    if im.mode != "RGBA":
        raise SystemExit(f"{stem}: expected RGBA, got {im.mode}")
    if max(w, h) != 512:
        raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
    if h <= w:
        raise SystemExit(f"{stem}: expected tall portrait framing, got {w}x{h}")
    if any(corners):
        raise SystemExit(f"{stem}: expected alpha-0 corners, got {corners}")
    if not visible_alphas:
        raise SystemExit(f"{stem}: no visible alpha")
    if binary or not soft:
        raise SystemExit(f"{stem}: alpha is not sufficiently soft/graduated")
    if not rgb_uniform:
        raise SystemExit(f"{stem}: RGB is not uniform; possible halo")
PY
