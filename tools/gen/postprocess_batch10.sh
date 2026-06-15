#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch10"
TMP="${TMPDIR:-/tmp}/district_batch10_postprocess"
MAGICK="${MAGICK:-magick}"

mkdir -p \
  "$ROOT/assets/textures/east_station" \
  "$ROOT/assets/textures/riverside_works" \
  "$ROOT/assets/textures/glass_mile" \
  "$ROOT/assets/textures/south_terrace" \
  "$TMP"

for src in \
  ENV_EastStation_Concourse_albedo.png \
  ENV_EastStation_Facade_albedo.png \
  ENV_RiversideWorks_Yard_albedo.png \
  ENV_RiversideWorks_Siding_albedo.png \
  ENV_GlassMile_Plaza_albedo.png \
  ENV_GlassMile_Curtainwall_albedo.png \
  ENV_SouthTerrace_Street_albedo.png \
  ENV_SouthTerrace_Brickfront_albedo.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

python3 - "$ROOT" "$SRC" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import math
import sys

root = Path(sys.argv[1])
src_dir = Path(sys.argv[2])
tmp = Path(sys.argv[3])

SURFACES = [
    ("ENV_EastStation_Concourse", "east_station", 2.6, 170, 10, 50),
    ("ENV_EastStation_Facade", "east_station", 3.0, 200, 40, 48),
    ("ENV_RiversideWorks_Yard", "riverside_works", 3.4, 200, 0, 54),
    ("ENV_RiversideWorks_Siding", "riverside_works", 4.2, 150, 180, 42),
    ("ENV_GlassMile_Plaza", "glass_mile", 1.6, 60, 30, 44),
    ("ENV_GlassMile_Curtainwall", "glass_mile", 1.8, 30, 210, 38),
    ("ENV_SouthTerrace_Street", "south_terrace", 3.6, 200, 0, 52),
    ("ENV_SouthTerrace_Brickfront", "south_terrace", 3.2, 210, 0, 48),
]

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

checks = []
for stem, district, strength, roughness, metalness, band in SURFACES:
    out = root / "assets" / "textures" / district
    base = Image.open(src_dir / f"{stem}_albedo.png")
    alb = seamless(base, band=band)
    height = luminance(alb)
    if stem in {"ENV_RiversideWorks_Yard", "ENV_RiversideWorks_Siding", "ENV_SouthTerrace_Street"}:
        height = height.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=2))
    if stem in {"ENV_GlassMile_Plaza", "ENV_GlassMile_Curtainwall"}:
        height = height.filter(ImageFilter.GaussianBlur(0.35))

    alb.save(out / f"{stem}_albedo.png", optimize=True)
    normal_from_height(height, strength).save(out / f"{stem}_normal.png", optimize=True)
    orm_from_height(height, roughness, metalness).save(out / f"{stem}_orm.png", optimize=True)

    preview = offset_preview(alb)
    preview.save(tmp / f"{stem}_offset_check.png", optimize=True)
    checks.append((stem, edge_rms(alb)))

for stem, rms in checks:
    print(f"{stem} edge_rms={rms:.3f}")
PY

for dir in east_station riverside_works glass_mile south_terrace; do
  for f in "$ROOT/assets/textures/$dir"/*.png; do
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
done

identify -format '%d/%f %wx%h %b\n' \
  "$ROOT/assets/textures/east_station"/*.png \
  "$ROOT/assets/textures/riverside_works"/*.png \
  "$ROOT/assets/textures/glass_mile"/*.png \
  "$ROOT/assets/textures/south_terrace"/*.png
