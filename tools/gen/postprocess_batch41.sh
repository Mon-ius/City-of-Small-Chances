#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch41"
TMP="${TMPDIR:-/tmp}/harbour_batch41_postprocess"
MAGICK="${MAGICK:-magick}"

mkdir -p "$ROOT/assets/textures/harbour" "$TMP"

for stem in ENV_Harbour_RoofSlate ENV_Harbour_RoofMetal; do
  if [[ ! -f "$SRC/${stem}_albedo.png" ]]; then
    echo "Missing source: $SRC/${stem}_albedo.png" >&2
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
out = root / "assets" / "textures" / "harbour"

CONFIGS = {
    "ENV_Harbour_RoofSlate": {"strength": 2.6, "roughness": 170, "metalness": 0, "band": 50, "crop": (78, 90, 1175, 1187)},
    "ENV_Harbour_RoofMetal": {"strength": 2.2, "roughness": 130, "metalness": 120, "band": 50},
}

def seamless(im, band=52):
    im = im.convert("RGB")
    im = ImageOps.fit(im, (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    w, h = im.size
    edge_band = max(16, band // 2)

    def wrap_blend_edges(img):
        px = img.load()
        for x in range(edge_band):
            rx = w - 1 - x
            edge_t = (1 + math.cos(math.pi * x / edge_band)) * 0.5
            for y in range(h):
                left = px[x, y]
                right = px[rx, y]
                mix = tuple(round((left[c] + right[c]) * 0.5) for c in range(3))
                px[x, y] = tuple(round(left[c] * (1 - edge_t) + mix[c] * edge_t) for c in range(3))
                px[rx, y] = tuple(round(right[c] * (1 - edge_t) + mix[c] * edge_t) for c in range(3))
        for y in range(edge_band):
            by = h - 1 - y
            edge_t = (1 + math.cos(math.pi * y / edge_band)) * 0.5
            for x in range(w):
                top = px[x, y]
                bottom = px[x, by]
                mix = tuple(round((top[c] + bottom[c]) * 0.5) for c in range(3))
                px[x, y] = tuple(round(top[c] * (1 - edge_t) + mix[c] * edge_t) for c in range(3))
                px[x, by] = tuple(round(bottom[c] * (1 - edge_t) + mix[c] * edge_t) for c in range(3))
        return img

    im = wrap_blend_edges(im)

    def enforce_edges(img):
        px = img.load()
        hard_band = max(12, band // 3)
        for x in range(hard_band):
            t = (1 - math.cos(math.pi * (x + 1) / (edge_band + 1))) * 0.5
            rx = w - 1 - x
            for y in range(h):
                left = px[x, y]
                right = px[rx, y]
                mix = tuple(round(left[c] * t + right[c] * (1 - t)) for c in range(3))
                px[x, y] = px[rx, y] = mix
        for y in range(hard_band):
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
    out_im = Image.new("RGB", (w, h))
    out_im.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    out_im.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    out_im.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    out_im.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return out_im

for stem, cfg in CONFIGS.items():
    base = Image.open(src_dir / f"{stem}_albedo.png")
    if "crop" in cfg:
        base = base.crop(cfg["crop"])
    alb = seamless(base, band=cfg["band"])
    height = luminance(alb).filter(ImageFilter.UnsharpMask(radius=1.0, percent=85, threshold=2))

    alb.save(out / f"{stem}_albedo.png", optimize=True)
    normal_from_height(height, cfg["strength"]).save(out / f"{stem}_normal.png", optimize=True)
    orm_from_height(height, cfg["roughness"], cfg["metalness"]).save(out / f"{stem}_orm.png", optimize=True)
    offset_preview(alb).save(tmp / f"{stem}_offset_check.png", optimize=True)

    print(f"{stem} edge_rms={edge_rms(alb):.3f}")
    print(f"offset_preview={tmp / (stem + '_offset_check.png')}")
PY

for f in "$ROOT/assets/textures/harbour/ENV_Harbour_RoofSlate"_*.png \
         "$ROOT/assets/textures/harbour/ENV_Harbour_RoofMetal"_*.png; do
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
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofSlate_albedo.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofSlate_normal.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofSlate_orm.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofMetal_albedo.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofMetal_normal.png" \
  "$ROOT/assets/textures/harbour/ENV_Harbour_RoofMetal_orm.png"
