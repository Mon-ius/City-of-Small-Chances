#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch11"
TMP="$ROOT/tools/gen/.tmp_batch11"
MAGICK="${MAGICK:-magick}"

mkdir -p \
  "$TMP" \
  "$ROOT/assets/textures/harbour" \
  "$ROOT/assets/sprites/props"

for src in \
  PROP_Harbour_Crate_albedo.png \
  PROP_Harbour_Barrel_albedo.png \
  ENV_Harbour_Roof_albedo.png \
  PROP_Job_Bicycle.png \
  PROP_Job_DeliveryBag.png \
  PROP_Job_Toolkit.png \
  PROP_Job_HiVis.png
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
    ("PROP_Harbour_Crate", 3.4, 200, 30, 48),
    ("PROP_Harbour_Barrel", 3.2, 195, 25, 44),
    ("ENV_Harbour_Roof", 3.6, 205, 0, 42),
]

def offset_image(im):
    w, h = im.size
    out = Image.new(im.mode, (w, h))
    out.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    out.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    out.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    out.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return out

def enforce_edges(img, edge_band):
    w, h = img.size
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

def seamless(im, band):
    im = im.convert("RGB")
    im = ImageOps.fit(im, (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    off = offset_image(im)
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            if abs(x - w // 2) < band or abs(y - h // 2) < band:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    im = Image.composite(im, off, mask)
    edge_band = max(12, band // 3)
    im = enforce_edges(im, edge_band)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.7, percent=35, threshold=3))
    return enforce_edges(im, edge_band)

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

checks = []
for stem, strength, roughness, metalness, band in SURFACES:
    out = root / "assets" / "textures" / "harbour"
    base = Image.open(src_dir / f"{stem}_albedo.png")
    alb = seamless(base, band=band)
    height = luminance(alb)
    if stem == "ENV_Harbour_Roof":
        height = height.filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=2))

    alb.save(out / f"{stem}_albedo.png", optimize=True)
    normal_from_height(height, strength).save(out / f"{stem}_normal.png", optimize=True)
    orm_from_height(height, roughness, metalness).save(out / f"{stem}_orm.png", optimize=True)

    offset_image(alb).save(tmp / f"{stem}_offset_check.png", optimize=True)
    checks.append((stem, edge_rms(alb)))

for stem, rms in checks:
    print(f"{stem} edge_rms={rms:.3f}")
PY

for f in \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_albedo.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_normal.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_orm.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_albedo.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_normal.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_orm.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_albedo.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_normal.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_orm.png"
do
  optimized="$TMP/$(basename "$f")"
  case "$f" in
    *_normal.png) colors=192 ;;
    *_orm.png) colors=96 ;;
    *) colors=224 ;;
  esac
  "$MAGICK" "$f" -alpha off -strip -depth 8 -colors "$colors" -define png:compression-level=9 "PNG8:$optimized"
  cp "$optimized" "$f"
done

process_cutout() {
  local name="$1"
  local stripped="$TMP/${name}_alpha.png"
  local trimmed="$TMP/${name}_trim.png"
  local cleaned="$TMP/${name}_clean.png"
  local out="$ROOT/assets/sprites/props/${name}.png"

  python3 "$REMOVE_KEY" \
    --input "$SRC/${name}.png" \
    --out "$stripped" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --edge-contract 1 \
    --despill \
    --force

  "$MAGICK" "$stripped" -alpha on -trim +repage "$trimmed"
  "$MAGICK" "$trimmed" \
    -alpha on \
    -resize "512x512>" \
    -background none \
    -gravity center \
    -extent "512x512" \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$cleaned"

  python3 - "$cleaned" "$out" "$name" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
name = sys.argv[3]
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
fringe_removed = 0
corner_alpha = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
if any(corner_alpha):
    raise SystemExit(f"{name}: non-transparent corner alpha {corner_alpha}")
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a == 0:
            px[x, y] = (0, 0, 0, 0)
        elif 0 < a < 245:
            green_key = g > 120 and g > r * 1.25 and g > b * 1.25
            magenta_key = r > 120 and b > 120 and r > g * 1.35 and b > g * 1.35
            if green_key or magenta_key:
                px[x, y] = (0, 0, 0, 0)
                fringe_removed += 1
im.save(out, optimize=True)
print(f"{name} alpha_corners=0 fringe_removed={fringe_removed}")
PY

  "$MAGICK" "$out" \
    -colors 160 \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$cleaned"
  cp "$cleaned" "$out"
}

process_cutout PROP_Job_Bicycle
process_cutout PROP_Job_DeliveryBag
process_cutout PROP_Job_Toolkit
process_cutout PROP_Job_HiVis

python3 - "$ROOT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

root = Path(sys.argv[1])
for path in sorted((root / "assets" / "sprites" / "props").glob("PROP_Job_*.png")):
    if path.name not in {
        "PROP_Job_Bicycle.png",
        "PROP_Job_DeliveryBag.png",
        "PROP_Job_HiVis.png",
        "PROP_Job_Toolkit.png",
    }:
        continue
    im = Image.open(path).convert("RGBA")
    px = im.load()
    w, h = im.size
    corners = [px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3]]
    if any(corners):
        raise SystemExit(f"{path.name}: non-transparent corner alpha after quantize {corners}")
    residue = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if 0 < a < 245:
                if (g > 120 and g > r * 1.25 and g > b * 1.25) or (r > 120 and b > 120 and r > g * 1.35 and b > g * 1.35):
                    residue += 1
    if residue:
        raise SystemExit(f"{path.name}: chroma fringe pixels after quantize {residue}")
    print(f"{path.name} alpha_corners=0 fringe=0")
PY

identify -format '%d/%f %wx%h %b\n' \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_albedo.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_normal.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Crate_orm.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_albedo.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_normal.png" \
  "$ROOT/assets/textures/harbour/PROP_Harbour_Barrel_orm.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_albedo.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_normal.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_Roof_orm.png" \
  "$ROOT/assets/sprites/props/PROP_Job_Bicycle.png" \
  "$ROOT/assets/sprites/props/PROP_Job_DeliveryBag.png" \
  "$ROOT/assets/sprites/props/PROP_Job_Toolkit.png" \
  "$ROOT/assets/sprites/props/PROP_Job_HiVis.png"
