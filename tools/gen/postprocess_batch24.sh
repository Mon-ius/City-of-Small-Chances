#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/sprites/sky"
TMP="${TMPDIR:-/tmp}/harbour_batch24_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch24}}"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

python3 - "$SOURCE_DIR" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageOps
import sys

source = Path(sys.argv[1])
tmp = Path(sys.argv[2])
tmp.mkdir(parents=True, exist_ok=True)

src = source / "Overcast.png"
if not src.exists():
    raise SystemExit(f"Missing source: {src}")

size = 1024
band = 56
target_luma = 150.0

im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
im = im.resize((size, size), Image.Resampling.LANCZOS)
px = im.load()

# Keep the panel almost greyscale, with only a tiny warm lift near the horizon.
for y in range(size):
    h = y / (size - 1)
    warm = h * h
    for x in range(size):
        r, g, b = px[x, y]
        l = 0.2126 * r + 0.7152 * g + 0.0722 * b
        r = round(l * 0.96 + r * 0.04 + 3.0 * warm)
        g = round(l * 0.97 + g * 0.03 + 1.5 * warm)
        b = round(l * 0.98 + b * 0.02 - 1.5 * warm)
        px[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

# Gently pull each row toward its average so the dome reads as even stratus.
for y in range(size):
    row = [px[x, y] for x in range(size)]
    avg = tuple(round(sum(p[c] for p in row) / size) for c in range(3))
    strength = 0.32
    for x, rgb in enumerate(row):
        px[x, y] = tuple(round(rgb[c] * (1.0 - strength) + avg[c] * strength) for c in range(3))

# Batch-23-style wrap repair: roll 50% on x, blend only the now-centred vertical seam,
# then roll back. The blend is per-row horizontal, so the vertical sky gradient stays intact.
rolled = Image.new("RGB", (size, size))
rolled.paste(im.crop((size // 2, 0, size, size)), (0, 0))
rolled.paste(im.crop((0, 0, size // 2, size)), (size // 2, 0))
rp = rolled.load()
cx = size // 2
for y in range(size):
    originals = [rp[x, y] for x in range(cx - band, cx + band)]
    for i, x in enumerate(range(cx - band, cx + band)):
        lo = max(0, i - 11)
        hi = min(len(originals), i + 12)
        blur = tuple(round(sum(p[c] for p in originals[lo:hi]) / (hi - lo)) for c in range(3))
        dist = abs(x - cx) / band
        t = max(0.0, 1.0 - dist)
        t = t * t * (3.0 - 2.0 * t)
        old = rp[x, y]
        rp[x, y] = tuple(round(old[c] * (1.0 - t) + blur[c] * t) for c in range(3))

fixed = Image.new("RGB", (size, size))
fixed.paste(rolled.crop((size // 2, 0, size, size)), (0, 0))
fixed.paste(rolled.crop((0, 0, size // 2, size)), (size // 2, 0))
px = fixed.load()

# Final luma normalization into the requested mid-to-light grey band.
mean_luma = 0.0
for y in range(size):
    for x in range(size):
        r, g, b = px[x, y]
        mean_luma += 0.2126 * r + 0.7152 * g + 0.0722 * b
mean_luma /= size * size
delta = target_luma - mean_luma
for y in range(size):
    for x in range(size):
        r, g, b = px[x, y]
        px[x, y] = (
            max(0, min(255, round(r + delta))),
            max(0, min(255, round(g + delta))),
            max(0, min(255, round(b + delta))),
        )

fixed.save(tmp / "SKY_Atmos_Overcast_seam_rgb.png")
PY

"$MAGICK" "$TMP/SKY_Atmos_Overcast_seam_rgb.png" \
  -auto-orient \
  -resize 1024x1024! \
  -colorspace sRGB \
  -alpha off \
  -background gray \
  -flatten \
  -strip \
  -depth 8 \
  -colors 128 \
  -define png:compression-level=9 \
  "PNG24:$OUT/SKY_Atmos_Overcast.png"

python3 - "$OUT/SKY_Atmos_Overcast.png" <<'PY'
from pathlib import Path
from PIL import Image
import sys

path = Path(sys.argv[1])
im = Image.open(path)
rgba = im.convert("RGBA")
failed = False

if im.size != (1024, 1024):
    print(f"{path.name}: expected 1024x1024, got {im.size}", file=sys.stderr)
    failed = True
if rgba.getchannel("A").getextrema() != (255, 255):
    print(f"{path.name}: alpha is not fully opaque", file=sys.stderr)
    failed = True

def luma(rgb):
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

left = [rgba.getpixel((0, y))[:3] for y in range(1024)]
right = [rgba.getpixel((1023, y))[:3] for y in range(1024)]
edge_diff = sum(abs(left[y][c] - right[y][c]) for y in range(1024) for c in range(3)) / (1024 * 3)
if edge_diff > 3.0:
    print(f"{path.name}: high edge diff {edge_diff:.2f}", file=sys.stderr)
    failed = True

spread_sum = 0.0
luma_sum = 0.0
for y in range(1024):
    for x in range(1024):
        rgb = rgba.getpixel((x, y))[:3]
        spread_sum += max(rgb) - min(rgb)
        luma_sum += luma(rgb)
mean_spread = spread_sum / (1024 * 1024)
mean_luma = luma_sum / (1024 * 1024)
if mean_spread > 8.0:
    print(f"{path.name}: channel spread too high {mean_spread:.2f}", file=sys.stderr)
    failed = True
if not (120.0 <= mean_luma <= 175.0):
    print(f"{path.name}: mean luma out of band {mean_luma:.2f}", file=sys.stderr)
    failed = True

top_vals = [luma(rgba.getpixel((x, y))) for y in range(32, 224) for x in range(64, 960, 32)]
horizon_vals = [luma(rgba.getpixel((x, y))) for y in range(760, 992) for x in range(64, 960, 32)]
top_luma = sum(top_vals) / len(top_vals)
horizon_luma = sum(horizon_vals) / len(horizon_vals)
if horizon_luma <= top_luma + 4.0:
    print(
        f"{path.name}: horizon not sufficiently brighter than zenith "
        f"({horizon_luma:.2f} <= {top_luma:.2f})",
        file=sys.stderr,
    )
    failed = True

print(
    f"{path.name}: size={im.size[0]}x{im.size[1]}, mode={im.mode}, opaque=yes, "
    f"edge_diff={edge_diff:.2f}, mean_channel_spread={mean_spread:.2f}, "
    f"mean_luma={mean_luma:.2f}, top_luma={top_luma:.2f}, horizon_luma={horizon_luma:.2f}"
)

if failed:
    sys.exit(1)
PY

identify -format '%f %wx%h %b\n' "$OUT/SKY_Atmos_Overcast.png"
