#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch15"
OUT="$ROOT/assets/textures/business"
TMP="${TMPDIR:-/tmp}/batch15_postprocess"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

for src in \
  ENV_Biz_Stall_albedo.png \
  ENV_Biz_Bench_albedo.png \
  ENV_Biz_Kiosk_albedo.png \
  ENV_Biz_Shop_albedo.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

python3 - "$SRC" "$OUT" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import math
import sys

src_dir = Path(sys.argv[1])
out_dir = Path(sys.argv[2])
tmp = Path(sys.argv[3])

SURFACES = [
    ("ENV_Biz_Stall", 3.2, 205, 5, 54, "fabric_wood"),
    ("ENV_Biz_Bench", 3.4, 195, 20, 54, "wood"),
    ("ENV_Biz_Kiosk", 2.4, 110, 70, 42, "metal_tile"),
    ("ENV_Biz_Shop", 2.2, 140, 10, 46, "finished"),
]

def fit_source(im):
    return ImageOps.fit(
        im.convert("RGB"),
        (512, 512),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )

def offset_half(im):
    w, h = im.size
    out = Image.new("RGB", (w, h))
    out.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    out.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    out.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    out.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return out

def enforce_edges(img, edge_band):
    img = img.copy()
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
    im = fit_source(im)
    w, h = im.size
    shifted = offset_half(im)
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for y in range(h):
        for x in range(w):
            dx = abs(x - w // 2)
            dy = abs(y - h // 2)
            if dx < band or dy < band:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    blended = Image.composite(im, shifted, mask)
    edge_band = max(12, band // 3)
    blended = enforce_edges(blended, edge_band)
    blended = blended.filter(ImageFilter.UnsharpMask(radius=0.7, percent=35, threshold=3))
    return enforce_edges(blended, edge_band)

def luminance(im):
    return im.convert("L").filter(ImageFilter.GaussianBlur(0.45))

def tuned_height(albedo, kind):
    height = luminance(albedo)
    if kind in {"fabric_wood", "wood"}:
        height = height.filter(ImageFilter.UnsharpMask(radius=0.9, percent=115, threshold=2))
    if kind == "metal_tile":
        height = height.filter(ImageFilter.UnsharpMask(radius=1.0, percent=90, threshold=3))
    if kind == "finished":
        height = height.filter(ImageFilter.GaussianBlur(0.25))
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

filelist = tmp / "batch15_files.txt"
checks = tmp / "batch15_edge_rms_prequant.txt"

with filelist.open("w", encoding="utf-8") as files, checks.open("w", encoding="utf-8") as check_out:
    for stem, strength, roughness, metalness, band, kind in SURFACES:
        base = Image.open(src_dir / f"{stem}_albedo.png")
        albedo = seamless(base, band=band)
        height = tuned_height(albedo, kind)
        normal = normal_from_height(height, strength)
        orm = orm_from_height(height, roughness, metalness)

        for suffix, image in (
            ("albedo", albedo),
            ("normal", normal),
            ("orm", orm),
        ):
            path = out_dir / f"{stem}_{suffix}.png"
            image.save(path, optimize=True)
            files.write(str(path) + "\n")

        offset_half(albedo).save(tmp / f"{stem}_offset_check.png", optimize=True)
        check_out.write(f"{stem} edge_rms_prequant={edge_rms(albedo):.3f}\n")

print(checks.read_text(encoding="utf-8"), end="")
PY

while IFS= read -r f; do
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
done < "$TMP/batch15_files.txt"

python3 - "$TMP/batch15_files.txt" <<'PY'
from pathlib import Path
from PIL import Image
import sys

files = [Path(line.strip()) for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if line.strip()]

for path in files:
    im = Image.open(path)
    if im.mode not in {"P", "RGB", "RGBA"}:
        im = im.convert("RGB")
    px = im.load()
    w, h = im.size
    for x in range(w):
        px[x, h - 1] = px[x, 0]
    for y in range(h):
        px[w - 1, y] = px[0, y]
    im.save(path, optimize=True)
PY

python3 - "$TMP/batch15_files.txt" "$TMP/batch15_edge_rms_final.txt" <<'PY'
from pathlib import Path
from PIL import Image
import math
import sys

files = [Path(line.strip()) for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if line.strip()]
out = Path(sys.argv[2])

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

lines = []
for path in files:
    if path.name.endswith("_albedo.png"):
        lines.append(f"{path.stem.removesuffix('_albedo')} edge_rms_final={edge_rms(Image.open(path)):.3f}")

out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(out.read_text(encoding="utf-8"), end="")
PY

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out = Path(sys.argv[1])
expected = [
    "ENV_Biz_Stall_albedo.png", "ENV_Biz_Stall_normal.png", "ENV_Biz_Stall_orm.png",
    "ENV_Biz_Bench_albedo.png", "ENV_Biz_Bench_normal.png", "ENV_Biz_Bench_orm.png",
    "ENV_Biz_Kiosk_albedo.png", "ENV_Biz_Kiosk_normal.png", "ENV_Biz_Kiosk_orm.png",
    "ENV_Biz_Shop_albedo.png", "ENV_Biz_Shop_normal.png", "ENV_Biz_Shop_orm.png",
]

for name in expected:
    path = out / name
    im = Image.open(path)
    if im.size != (512, 512):
        raise SystemExit(f"{name} is {im.size}, expected 512x512")
    if im.getextrema()[0] is None:
        raise SystemExit(f"{name} appears empty")
    print(f"{path} {im.size[0]}x{im.size[1]} {path.stat().st_size} bytes")
PY
