#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch30"
OUT="$ROOT/assets/textures/player"
TMP="${TMPDIR:-/tmp}/batch30_postprocess"
MAGICK="${MAGICK:-magick}"

mkdir -p "$OUT" "$TMP"

for src in \
  CHAR_Player_Coat.png \
  CHAR_Player_Trouser.png \
  CHAR_Player_Skin.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

python3 - "$SRC" "$OUT" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageStat
import colorsys
import math
import statistics
import sys

src_dir = Path(sys.argv[1])
out_dir = Path(sys.argv[2])
tmp = Path(sys.argv[3])

SURFACES = [
    ("CHAR_Player_Coat", (0x2f, 0x9e, 0x8f), 1.55, 215, 0, 46, "cloth"),
    ("CHAR_Player_Trouser", (0x26, 0x30, 0x3a), 2.15, 210, 0, 46, "cloth_dark"),
    ("CHAR_Player_Skin", (0xdd, 0xa9, 0x82), 1.10, 175, 0, 38, "skin"),
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
    shifted = offset_half(im)
    w, h = im.size
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
    blended = blended.filter(ImageFilter.UnsharpMask(radius=0.7, percent=28, threshold=3))
    return enforce_edges(blended, edge_band)

def mean_rgb(im):
    return tuple(ImageStat.Stat(im.convert("RGB")).mean)

def tune_mean_to_target(im, target, strength=0.93):
    im = im.convert("RGB")
    mean = mean_rgb(im)
    target_hls = colorsys.rgb_to_hls(*(v / 255.0 for v in target))
    out = Image.new("RGB", im.size)
    src = im.load()
    dst = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b = src[x, y]
            h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
            l *= target_hls[1] / max(0.001, statistics.fmean(m / 255.0 for m in mean))
            h = h * (1.0 - strength) + target_hls[0] * strength
            s = s * 0.30 + target_hls[2] * 0.70
            nr, ng, nb = colorsys.hls_to_rgb(h % 1.0, max(0, min(1, l)), max(0, min(1, s)))
            dst[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255))
    # Final per-channel correction pins the material hue without flattening texture.
    mean2 = mean_rgb(out)
    lut = []
    for c, tgt in enumerate(target):
        delta = tgt - mean2[c]
        lut.append([max(0, min(255, round(i + delta))) for i in range(256)])
    return out.point(lut[0] + lut[1] + lut[2]).filter(ImageFilter.UnsharpMask(radius=0.6, percent=18, threshold=3))

def luminance(im):
    return im.convert("L").filter(ImageFilter.GaussianBlur(0.35))

def tuned_height(albedo, kind):
    height = luminance(albedo)
    if kind in {"cloth", "cloth_dark"}:
        height = height.filter(ImageFilter.UnsharpMask(radius=0.9, percent=95, threshold=2))
    if kind == "skin":
        height = height.filter(ImageFilter.GaussianBlur(0.55))
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

def orm_from_height(height, roughness, metalness, ao_strength):
    w, h = height.size
    hp = height.load()
    orm = Image.new("RGB", (w, h))
    op = orm.load()
    for y in range(h):
        for x in range(w):
            ao = max(185, min(255, 255 - int((128 - hp[x, y]) * ao_strength)))
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

filelist = tmp / "batch30_files.txt"
checks = tmp / "batch30_metrics_prequant.txt"

with filelist.open("w", encoding="utf-8") as files, checks.open("w", encoding="utf-8") as check_out:
    for stem, target, normal_strength, roughness, metalness, band, kind in SURFACES:
        base = Image.open(src_dir / f"{stem}.png")
        albedo = tune_mean_to_target(seamless(base, band), target)
        albedo = enforce_edges(albedo, max(12, band // 3))
        height = tuned_height(albedo, kind)
        ao_strength = 0.28 if kind == "skin" else 0.45
        normal = normal_from_height(height, normal_strength)
        orm = orm_from_height(height, roughness, metalness, ao_strength)

        for suffix, image in (("albedo", albedo), ("normal", normal), ("orm", orm)):
            path = out_dir / f"{stem}_{suffix}.png"
            image.save(path, optimize=True)
            files.write(str(path) + "\n")

        offset_half(albedo).save(tmp / f"{stem}_offset_check.png", optimize=True)
        check_out.write(f"{stem} mean_rgb=({mean_rgb(albedo)[0]:.1f},{mean_rgb(albedo)[1]:.1f},{mean_rgb(albedo)[2]:.1f}) edge_rms_prequant={edge_rms(albedo):.3f}\n")

print(checks.read_text(encoding="utf-8"), end="")
PY

if command -v "$MAGICK" >/dev/null 2>&1; then
  while IFS= read -r f; do
    optimized="$TMP/$(basename "$f")"
    case "$f" in
      *_normal.png) colors=192 ;;
      *_orm.png) colors=96 ;;
      *) colors=224 ;;
    esac
    "$MAGICK" "$f" -alpha off -strip -depth 8 -colors "$colors" -define png:compression-level=9 "PNG8:$optimized"
    cp "$optimized" "$f"
  done < "$TMP/batch30_files.txt"
else
  echo "magick not found; keeping Pillow-optimized RGB PNGs" >&2
fi

python3 - "$TMP/batch30_files.txt" <<'PY'
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

python3 - "$TMP/batch30_files.txt" "$TMP/batch30_metrics_final.txt" <<'PY'
from pathlib import Path
from PIL import Image, ImageStat
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

by_stem = {}
for path in files:
    stem = path.name.rsplit("_", 1)[0]
    by_stem.setdefault(stem, {})[path.name.rsplit("_", 1)[1].removesuffix(".png")] = path

lines = []
for stem in sorted(by_stem):
    albedo = Image.open(by_stem[stem]["albedo"]).convert("RGB")
    normal = Image.open(by_stem[stem]["normal"]).convert("RGB")
    orm = Image.open(by_stem[stem]["orm"]).convert("RGB")
    amean = ImageStat.Stat(albedo).mean
    nmean = ImageStat.Stat(normal).mean
    omean = ImageStat.Stat(orm).mean
    sizes = [Image.open(by_stem[stem][suffix]).size for suffix in ("albedo", "normal", "orm")]
    lines.append(
        f"{stem}: sizes={sizes}; albedo_mean=({amean[0]:.1f},{amean[1]:.1f},{amean[2]:.1f}); "
        f"edge_rms={edge_rms(albedo):.3f}; normal_b_mean={nmean[2]:.1f}; "
        f"orm_mean=({omean[0]:.1f},{omean[1]:.1f},{omean[2]:.1f})"
    )

out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(out.read_text(encoding="utf-8"), end="")
PY
