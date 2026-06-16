#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch37"
TMP="${TMPDIR:-/tmp}/harbour_batch37_postprocess"
MAGICK="${MAGICK:-magick}"
STEM="ENV_Harbour_QuayWall"

mkdir -p "$ROOT/assets/textures/harbour" "$TMP"

if [[ ! -f "$SRC/${STEM}_albedo.png" ]]; then
  echo "Missing source: $SRC/${STEM}_albedo.png" >&2
  exit 1
fi

python3 - "$ROOT" "$SRC" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import math
import sys

root = Path(sys.argv[1])
src_dir = Path(sys.argv[2])
tmp = Path(sys.argv[3])

STEM = "ENV_Harbour_QuayWall"
OUT = root / "assets" / "textures" / "harbour"
STRENGTH = 3.2
ROUGHNESS = 205
METALNESS = 0
BAND = 50

def seamless(im, band=52):
    im = im.convert("RGB")
    im = ImageOps.fit(im, (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    w, h = im.size
    offset = Image.new("RGB", (w, h))
    offset.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    offset.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    offset.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    offset.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            dx = abs(x - w // 2)
            dy = abs(y - h // 2)
            if dx < band or dy < band:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    im = Image.composite(im, offset, mask)

    edge_band = max(12, band // 3)

    def enforce_edges(img):
        px = img.load()
        for x in range(edge_band):
            t = (1 - math.cos(math.pi * (x + 1) / (edge_band + 1))) * 0.5
            rx = w - 1 - x
            for y in range(h):
                left = px[x, y]
                right = px[rx, y]
                mix = tuple(round(left[c] * t + right[c] * (1 - t)) for c in range(3))
                px[x, y] = px[rx, y] = mix
        for y in range(edge_band):
            t = (1 - math.cos(math.pi * (y + 1) / (edge_band + 1))) * 0.5
            by = h - 1 - y
            for x in range(w):
                top = px[x, y]
                bottom = px[x, by]
                mix = tuple(round(top[c] * t + bottom[c] * (1 - t)) for c in range(3))
                px[x, y] = px[x, by] = mix
        return img

    im = enforce_edges(im)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.7, percent=35, threshold=3))
    return enforce_edges(im)

def luminance(im):
    return im.convert("L").filter(ImageFilter.GaussianBlur(0.45))

def normal_from_height(height, strength):
    w, h = height.size
    src = height.load()
    normal = Image.new("RGB", (w, h))
    dst = normal.load()
    for y in range(h):
        ym = (y - 1) % h
        yp = (y + 1) % h
        for x in range(w):
            xm = (x - 1) % w
            xp = (x + 1) % w
            dx = (src[xp, y] - src[xm, y]) / 255.0
            dy = (src[x, yp] - src[x, ym]) / 255.0
            nx = -dx * strength
            ny = dy * strength
            nz = 1.0
            inv = 1.0 / math.sqrt(nx * nx + ny * ny + nz * nz)
            dst[x, y] = (
                int((nx * inv * 0.5 + 0.5) * 255),
                int((ny * inv * 0.5 + 0.5) * 255),
                int((nz * inv * 0.5 + 0.5) * 255),
            )
    return normal

def orm_from_height(height, roughness, metalness):
    w, h = height.size
    hp = height.load()
    orm = Image.new("RGB", (w, h))
    op = orm.load()
    for y in range(h):
        for x in range(w):
            ao = max(70, min(255, 255 - int((128 - hp[x, y]) * 0.55)))
            op[x, y] = (ao, roughness, metalness)
    return orm

def edge_rms(im):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    total = 0
    count = 0
    for x in range(w):
        a = px[x, 0]
        b = px[x, h - 1]
        total += sum((a[c] - b[c]) ** 2 for c in range(3))
        count += 3
    for y in range(h):
        a = px[0, y]
        b = px[w - 1, y]
        total += sum((a[c] - b[c]) ** 2 for c in range(3))
        count += 3
    return math.sqrt(total / count)

def offset_preview(im):
    w, h = im.size
    out = Image.new("RGB", (w, h))
    out.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    out.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    out.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    out.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return out

base = Image.open(src_dir / f"{STEM}_albedo.png")
alb = seamless(base, band=BAND)
height = luminance(alb).filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=2))

alb.save(OUT / f"{STEM}_albedo.png", optimize=True)
normal_from_height(height, STRENGTH).save(OUT / f"{STEM}_normal.png", optimize=True)
orm_from_height(height, ROUGHNESS, METALNESS).save(OUT / f"{STEM}_orm.png", optimize=True)
offset_preview(alb).save(tmp / f"{STEM}_offset_check.png", optimize=True)

print(f"{STEM} edge_rms={edge_rms(alb):.3f}")
print(f"offset_preview={tmp / (STEM + '_offset_check.png')}")
PY

for f in "$ROOT/assets/textures/harbour/${STEM}"_*.png; do
  optimized="$TMP/$(basename "$f")"
  case "$f" in
    *_normal.png)
      colors=192
      ;;
    *_orm.png)
      colors=96
      ;;
    *)
      colors=224
      ;;
  esac
  "$MAGICK" "$f" -alpha off -strip -depth 8 -colors "$colors" -define png:compression-level=9 "PNG8:$optimized"
  cp "$optimized" "$f"
done

identify -format '%d/%f %wx%h %b\n' \
  "$ROOT/assets/textures/harbour/${STEM}_albedo.png" \
  "$ROOT/assets/textures/harbour/${STEM}_normal.png" \
  "$ROOT/assets/textures/harbour/${STEM}_orm.png"
