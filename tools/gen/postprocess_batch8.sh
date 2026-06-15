#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch8"
TMP="$ROOT/tools/gen/.tmp_batch8"
MAGICK="${MAGICK:-magick}"

mkdir -p \
  "$TMP" \
  "$ROOT/assets/ui/panels" \
  "$ROOT/assets/ui/frames" \
  "$ROOT/assets/ui/apps"

for src in \
  UI_Panel_Dark.png \
  UI_HUD_Plate.png \
  UI_Panel_Paper.png \
  UI_Frame_Ornate.png \
  UI_Phone_Bezel.png \
  UI_App_Jobs.png \
  UI_App_Map.png \
  UI_App_Contacts.png \
  UI_App_Wallet.png \
  UI_App_Planner.png \
  UI_App_Web.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

python3 - "$ROOT" "$SRC" "$TMP" <<'PY'
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import math
import statistics
import sys

root = Path(sys.argv[1])
src_dir = Path(sys.argv[2])
tmp = Path(sys.argv[3])

SURFACES = [
    ("UI_Panel_Dark", "dark_panel", 44, 0.72, (28, 21, 17)),
    ("UI_HUD_Plate", "dark_plate", 52, 0.66, (33, 27, 20)),
    ("UI_Panel_Paper", "paper", 205, 0.78, (238, 220, 178)),
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

def seamless(im, band=48):
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
    blended = blended.filter(ImageFilter.UnsharpMask(radius=0.65, percent=28, threshold=3))
    return enforce_edges(blended, edge_band)

def mean_luma(im):
    vals = list(im.convert("L").getdata())
    return sum(vals) / len(vals)

def luma_stdev(im):
    return statistics.pstdev(im.convert("L").getdata())

def color_grade(im, target_luma, contrast, tint):
    im = ImageEnhance.Contrast(im).enhance(contrast)
    current = max(1.0, mean_luma(im))
    im = ImageEnhance.Brightness(im).enhance(target_luma / current)
    overlay = Image.new("RGB", im.size, tint)
    im = Image.blend(im, overlay, 0.10)
    current = max(1.0, mean_luma(im))
    im = ImageEnhance.Brightness(im).enhance(target_luma / current)
    return im

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

filelist = tmp / "batch8_surface_files.txt"
checks = tmp / "batch8_surface_checks.txt"

with filelist.open("w", encoding="utf-8") as files, checks.open("w", encoding="utf-8") as check_out:
    for stem, kind, target, contrast, tint in SURFACES:
        src = Image.open(src_dir / f"{stem}.png")
        tile = seamless(src, band=44 if kind != "paper" else 52)
        tile = color_grade(tile, target, contrast, tint)
        tile = enforce_edges(tile, 16)
        out = root / "assets" / "ui" / "panels" / f"{stem}.png"
        tile.save(out, optimize=True)
        files.write(str(out) + "\n")
        offset_half(tile).save(tmp / f"{stem}_offset_check.png", optimize=True)
        check_out.write(
            f"{stem} edge_rms_prequant={edge_rms(tile):.3f} "
            f"mean_luma={mean_luma(tile):.1f} luma_stdev={luma_stdev(tile):.1f}\n"
        )

print(checks.read_text(encoding="utf-8"), end="")
PY

while IFS= read -r f; do
  optimized="$TMP/$(basename "$f")"
  "$MAGICK" "$f" \
    -alpha off \
    -strip \
    -depth 8 \
    -colors 224 \
    -define png:compression-level=9 \
    "PNG8:$optimized"
  cp "$optimized" "$f"
done < "$TMP/batch8_surface_files.txt"

python3 - "$TMP/batch8_surface_files.txt" <<'PY'
from pathlib import Path
from PIL import Image
import sys

for path in [Path(line.strip()) for line in Path(sys.argv[1]).read_text(encoding="utf-8").splitlines() if line.strip()]:
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

process_cutout() {
  local name="$1"
  local out="$2"
  local size="$3"
  local colors="$4"
  local stripped="$TMP/${name}_alpha.png"
  local trimmed="$TMP/${name}_trim.png"
  local grey="$TMP/${name}_grey_check.png"
  local white="$TMP/${name}_white_check.png"

  python3 "$REMOVE_KEY" \
    --input "$SRC/${name}.png" \
    --out "$stripped" \
    --auto-key border \
    --soft-matte \
    --despill \
    --force

  "$MAGICK" "$stripped" -alpha on -trim +repage "$trimmed"
  "$MAGICK" "$trimmed" \
    -alpha on \
    -resize "${size}>" \
    -background none \
    -gravity center \
    -extent "$size" \
    -colors "$colors" \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$out"

  "$MAGICK" "$out" -background "#808080" -alpha remove -alpha off "$grey"
  "$MAGICK" "$out" -background white -alpha remove -alpha off "$white"
}

process_cutout UI_Frame_Ornate "$ROOT/assets/ui/frames/UI_Frame_Ornate.png" 512x512 160
process_cutout UI_Phone_Bezel "$ROOT/assets/ui/frames/UI_Phone_Bezel.png" 384x512 160
process_cutout UI_App_Jobs "$ROOT/assets/ui/apps/UI_App_Jobs.png" 128x128 128
process_cutout UI_App_Map "$ROOT/assets/ui/apps/UI_App_Map.png" 128x128 128
process_cutout UI_App_Contacts "$ROOT/assets/ui/apps/UI_App_Contacts.png" 128x128 128
process_cutout UI_App_Wallet "$ROOT/assets/ui/apps/UI_App_Wallet.png" 128x128 128
process_cutout UI_App_Planner "$ROOT/assets/ui/apps/UI_App_Planner.png" 128x128 128
process_cutout UI_App_Web "$ROOT/assets/ui/apps/UI_App_Web.png" 128x128 128

python3 - "$ROOT" <<'PY'
from pathlib import Path
from PIL import Image
import math
import sys

root = Path(sys.argv[1])
surfaces = [
    root / "assets/ui/panels/UI_Panel_Dark.png",
    root / "assets/ui/panels/UI_HUD_Plate.png",
    root / "assets/ui/panels/UI_Panel_Paper.png",
]
cutouts = [
    root / "assets/ui/frames/UI_Frame_Ornate.png",
    root / "assets/ui/frames/UI_Phone_Bezel.png",
    root / "assets/ui/apps/UI_App_Jobs.png",
    root / "assets/ui/apps/UI_App_Map.png",
    root / "assets/ui/apps/UI_App_Contacts.png",
    root / "assets/ui/apps/UI_App_Wallet.png",
    root / "assets/ui/apps/UI_App_Planner.png",
    root / "assets/ui/apps/UI_App_Web.png",
]

def edge_rms(im):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    total = 0
    count = 0
    for x in range(w):
        total += sum((px[x, 0][c] - px[x, h - 1][c]) ** 2 for c in range(3))
        count += 3
    for y in range(h):
        total += sum((px[0, y][c] - px[w - 1, y][c]) ** 2 for c in range(3))
        count += 3
    return math.sqrt(total / count)

print("Batch 8 final validation:")
for path in surfaces:
    im = Image.open(path)
    luma = sum(im.convert("L").getdata()) / (im.size[0] * im.size[1])
    print(f"surface {path.name}: size={im.size[0]}x{im.size[1]} edge_rms={edge_rms(im):.3f} mean_luma={luma:.1f}")

for path in cutouts:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    alpha = im.getchannel("A")
    corners = [alpha.getpixel((0, 0)), alpha.getpixel((w - 1, 0)), alpha.getpixel((0, h - 1)), alpha.getpixel((w - 1, h - 1))]
    opaque = sum(1 for a in alpha.getdata() if a > 12)
    fringe = 0
    for r, g, b, a in im.getdata():
        if a > 12 and g > 150 and r < 90 and b < 90:
            fringe += 1
    coverage = opaque / (w * h)
    print(f"cutout {path.name}: size={w}x{h} transparent_corners={max(corners) <= 2} coverage={coverage:.3f} green_fringe_pixels={fringe}")
PY

find "$ROOT/assets/ui/panels" "$ROOT/assets/ui/frames" "$ROOT/assets/ui/apps" \
  -maxdepth 1 -type f -name 'UI_*.png' -print | sort
