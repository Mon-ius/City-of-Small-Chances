#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/sprites/sky"
TMP="${TMPDIR:-/tmp}/harbour_batch23_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch23}}"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

python3 - "$SOURCE_DIR" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageOps
import sys

source = Path(sys.argv[1])
tmp = Path(sys.argv[2])
tmp.mkdir(parents=True, exist_ok=True)

names = ["Day", "Dusk", "Night"]
size = 1024
band = 48

for name in names:
    src = source / f"SKY_Atmos_{name}.png"
    if not src.exists():
        raise SystemExit(f"Missing source: {src}")

    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    px = im.load()

    if name in ("Day", "Dusk"):
        strength = 0.18 if name == "Day" else 0.38
        for y in range(size):
            row = [px[x, y] for x in range(size)]
            avg = tuple(round(sum(p[c] for p in row) / size) for c in range(3))
            for x, rgb in enumerate(row):
                px[x, y] = tuple(round(rgb[c] * (1.0 - strength) + avg[c] * strength) for c in range(3))

    # Horizontally blend the wrap edges only. This makes x=0 and x=1023
    # converge while leaving the vertical atmospheric gradient intact.
    for y in range(size):
        original_left = [px[x, y] for x in range(band)]
        original_right = [px[size - 1 - x, y] for x in range(band)]
        for d in range(band):
            t = (1.0 - (d / band)) ** 2
            left = original_left[d]
            right = original_right[d]
            avg = tuple(round((left[c] + right[c]) / 2) for c in range(3))
            new_left = tuple(round(left[c] * (1.0 - t) + avg[c] * t) for c in range(3))
            new_right = tuple(round(right[c] * (1.0 - t) + avg[c] * t) for c in range(3))
            px[d, y] = new_left
            px[size - 1 - d, y] = new_right

    im.save(tmp / f"SKY_Atmos_{name}_seam_rgb.png")
PY

for name in Day Dusk Night; do
  colors=128
  if [[ "$name" == "Dusk" ]]; then
    colors=96
  fi
  if [[ "$name" == "Night" ]]; then
    colors=192
  fi

  "$MAGICK" "$TMP/SKY_Atmos_${name}_seam_rgb.png" \
    -auto-orient \
    -colorspace sRGB \
    -alpha off \
    -background black \
    -flatten \
    -strip \
    -depth 8 \
    -colors "$colors" \
    -define png:compression-level=9 \
    "PNG24:$OUT/SKY_Atmos_${name}.png"
done

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out = Path(sys.argv[1])
names = ["Day", "Dusk", "Night"]
failed = False

def luma(rgb):
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

for name in names:
    path = out / f"SKY_Atmos_{name}.png"
    im = Image.open(path)
    rgba = im.convert("RGBA")
    if im.size != (1024, 1024):
        print(f"{path.name}: expected 1024x1024, got {im.size}", file=sys.stderr)
        failed = True
    if rgba.getchannel("A").getextrema() != (255, 255):
        print(f"{path.name}: alpha is not fully opaque", file=sys.stderr)
        failed = True

    left = [rgba.getpixel((0, y))[:3] for y in range(1024)]
    right = [rgba.getpixel((1023, y))[:3] for y in range(1024)]
    edge_diff = sum(abs(left[y][c] - right[y][c]) for y in range(1024) for c in range(3)) / (1024 * 3)
    if edge_diff > 3.0:
        print(f"{path.name}: high edge diff {edge_diff:.2f}", file=sys.stderr)
        failed = True

    rows = []
    for y in (32, 256, 512, 768, 992):
        vals = [luma(rgba.getpixel((x, y))) for x in range(64, 960, 32)]
        rows.append(sum(vals) / len(vals))
    top = rows[0]
    lower = rows[3]
    monotonicish = "ok"
    if top >= lower:
        monotonicish = "check"

    stars = 0
    if name == "Night":
        for y in range(0, int(1024 * 0.60)):
            for x in range(1024):
                if luma(rgba.getpixel((x, y))) > 200:
                    stars += 1
        if stars <= 80:
            print(f"{path.name}: starfield too weak after quantise ({stars} bright pixels)", file=sys.stderr)
            failed = True

    print(
        f"{path.name}: size={im.size[0]}x{im.size[1]}, mode={im.mode}, "
        f"opaque=yes, edge_diff={edge_diff:.2f}, luma_rows={[round(v,1) for v in rows]}, "
        f"monotonicish={monotonicish}" + (f", star_pixels={stars}" if name == "Night" else "")
    )

if failed:
    sys.exit(1)
PY

identify -format '%f %wx%h %b\n' "$OUT"/SKY_Atmos_{Day,Dusk,Night}.png
