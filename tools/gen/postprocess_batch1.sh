#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/assets/textures/harbour"
TMP="${TMPDIR:-/tmp}/harbour_batch1_postprocess"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

prep_albedo() {
  local object="$1"
  local src="$OUT/ENV_Harbour_${object}_albedo.png"
  local tmp="$TMP/${object}_base.png"
  "$MAGICK" "$src" -auto-orient -resize '512x512^' -gravity center -extent 512x512 -colorspace sRGB -depth 8 "$tmp"
}

prep_albedo Cobblestone
prep_albedo PlankWood
prep_albedo Plaster
prep_albedo Water
"$MAGICK" "$OUT/ENV_Harbour_WindowAtlas_albedo.png" -auto-orient -resize '512x512^' -gravity center -extent 512x512 -colorspace sRGB -depth 8 "$TMP/WindowAtlas_base.png"

python3 - "$OUT" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter
import math
import sys

out = Path(sys.argv[1])
tmp = Path(sys.argv[2])

SURFACES = {
    "Cobblestone": {"strength": 4.0, "roughness": 218},
    "PlankWood": {"strength": 3.0, "roughness": 205},
    "Plaster": {"strength": 2.2, "roughness": 224},
    "Water": {"strength": 7.0, "roughness": 52},
}

def seamless(im, band=52):
    im = im.convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
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

    edge_band = max(12, band // 3)
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

def orm_from_height(height, roughness):
    w, h = height.size
    hp = height.load()
    orm = Image.new("RGB", (w, h))
    op = orm.load()
    for y in range(h):
        for x in range(w):
            ao = max(70, min(255, 255 - int((128 - hp[x, y]) * 0.55)))
            op[x, y] = (ao, roughness, 0)
    return orm

for name, cfg in SURFACES.items():
    base = Image.open(tmp / f"{name}_base.png")
    alb = seamless(base)
    height = luminance(alb)
    if name == "Water":
        height = height.filter(ImageFilter.UnsharpMask(radius=1.2, percent=170, threshold=2))
    alb.save(out / f"ENV_Harbour_{name}_albedo.png", optimize=True)
    normal_from_height(height, cfg["strength"]).save(out / f"ENV_Harbour_{name}_normal.png", optimize=True)
    orm_from_height(height, cfg["roughness"]).save(out / f"ENV_Harbour_{name}_orm.png", optimize=True)

atlas = Image.open(tmp / "WindowAtlas_base.png").convert("RGB")
atlas.save(out / "ENV_Harbour_WindowAtlas_albedo.png", optimize=True)
em = Image.new("RGB", atlas.size, "black")
src = atlas.load()
dst = em.load()
for y in range(atlas.height):
    for x in range(atlas.width):
        r, g, b = src[x, y]
        warm = r > 145 and g > 95 and b < 105 and r > b * 1.35
        bright = (r + g + b) / 3 > 135 and r >= g >= b
        if warm or bright:
            dst[x, y] = (255, 218, 160)
em = em.filter(ImageFilter.GaussianBlur(0.35))
em.save(out / "ENV_Harbour_WindowAtlas_emissive.png", optimize=True)
PY

for f in "$OUT"/ENV_Harbour_*.png; do
  optimized="$TMP/$(basename "$f")"
  "$MAGICK" "$f" -alpha off -strip -depth 8 -define png:compression-level=9 "PNG24:$optimized"
  cp "$optimized" "$f"
done

identify -format '%f %wx%h %b\n' "$OUT"/ENV_Harbour_*.png
