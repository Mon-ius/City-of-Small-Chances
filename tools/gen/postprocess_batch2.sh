#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/textures/harbour"
TMP="${TMPDIR:-/tmp}/harbour_batch2_postprocess"
SOURCE_DIR="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch2}}"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

for object in PaintedMetal AwningStripe Sailcloth Rope; do
  src="$SOURCE_DIR/${object}.png"
  if [[ ! -f "$src" ]]; then
    src="$OUT/PROP_Harbour_${object}_albedo.png"
  fi
  if [[ ! -f "$src" ]]; then
    echo "Missing source for $object. Expected $SOURCE_DIR/${object}.png or existing albedo in $OUT." >&2
    exit 1
  fi
  "$MAGICK" "$src" -auto-orient -resize '1024x1024^' -gravity center -extent 1024x1024 -colorspace sRGB -depth 8 "$TMP/${object}_source.png"
done

python3 - "$OUT" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat
import math
import sys

out = Path(sys.argv[1])
tmp = Path(sys.argv[2])

SURFACES = {
    "PaintedMetal": {"strength": 3.2, "roughness": 115, "metalness": 180, "size": 256},
    "AwningStripe": {"strength": 4.6, "roughness": 222, "metalness": 0, "size": 256},
    "Sailcloth": {"strength": 5.4, "roughness": 230, "metalness": 0, "size": 256},
    "Rope": {"strength": 8.0, "roughness": 224, "metalness": 0, "size": 256},
}

def center_offset(im):
    w, h = im.size
    shifted = Image.new(im.mode, im.size)
    shifted.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    shifted.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    shifted.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    shifted.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return shifted

def seamless(im, size=256, band=30):
    im = im.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
    w, h = im.size
    shifted = center_offset(im)
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if abs(x - w // 2) < band or abs(y - h // 2) < band:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    im = Image.composite(im, shifted, mask)
    edge_band = max(8, band // 3)
    return enforce_edges(enforce_edges(im, edge_band), edge_band)

def enforce_edges(img, edge_band):
    img = img.copy()
    px = img.load()
    w, h = img.size
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

def height_from_albedo(name, alb):
    height = alb.convert("L")
    if name == "PaintedMetal":
        height = ImageChops.invert(height).filter(ImageFilter.GaussianBlur(0.55))
    elif name == "Rope":
        height = height.filter(ImageFilter.UnsharpMask(radius=0.8, percent=220, threshold=1))
    else:
        height = height.filter(ImageFilter.UnsharpMask(radius=0.6, percent=160, threshold=1))
    return height

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

def rust_or_cavity_mask(alb):
    px = alb.load()
    mask = Image.new("L", alb.size)
    mp = mask.load()
    for y in range(alb.height):
        for x in range(alb.width):
            r, g, b = px[x, y]
            rust = max(0, r - b - 18) + max(0, r - g - 4)
            dark = max(0, 96 - int((r + g + b) / 3))
            mp[x, y] = max(0, min(255, rust * 2 + dark))
    return mask.filter(ImageFilter.GaussianBlur(0.55))

def orm_from_albedo(name, alb, height, roughness, metalness):
    w, h = alb.size
    hp = height.load()
    orm = Image.new("RGB", (w, h))
    op = orm.load()
    mask = rust_or_cavity_mask(alb).load() if name == "PaintedMetal" else None
    for y in range(h):
        for x in range(w):
            lum = hp[x, y]
            ao = max(58, min(255, 255 - int(max(0, 135 - lum) * 0.62)))
            if name == "PaintedMetal":
                wear = mask[x, y]
                rough = max(95, min(178, roughness + int(wear * 0.23)))
                metal = max(135, min(195, metalness - int(wear * 0.10)))
            else:
                rough = roughness
                metal = metalness
            op[x, y] = (ao, rough, metal)
    return orm

def tile_score(im):
    shifted = center_offset(im)
    diff = ImageChops.difference(im.convert("RGB"), shifted.convert("RGB"))
    stat = ImageStat.Stat(diff)
    return sum(stat.mean) / 3.0

for name, cfg in SURFACES.items():
    source = Image.open(tmp / f"{name}_source.png")
    alb = seamless(source, cfg["size"])
    alb = alb.filter(ImageFilter.UnsharpMask(radius=0.55, percent=45, threshold=2))
    height = height_from_albedo(name, alb)
    normal = normal_from_height(height, cfg["strength"])
    orm = orm_from_albedo(name, alb, height, cfg["roughness"], cfg["metalness"])
    prefix = out / f"PROP_Harbour_{name}"
    alb.save(f"{prefix}_albedo.png", optimize=True)
    normal.save(f"{prefix}_normal.png", optimize=True)
    orm.save(f"{prefix}_orm.png", optimize=True)
    center_offset(alb).save(tmp / f"{name}_tilecheck_50pct_offset.png")
    print(f"{name}: 50pct offset mean diff {tile_score(alb):.2f}")
PY

for f in "$OUT"/PROP_Harbour_*_{albedo,normal,orm}.png; do
  optimized="$TMP/$(basename "$f")"
  "$MAGICK" "$f" -alpha off -strip -depth 8 -define png:compression-level=9 "PNG24:$optimized"
  cp "$optimized" "$f"
done

identify -format '%f %wx%h %b\n' "$OUT"/PROP_Harbour_*_{albedo,normal,orm}.png
