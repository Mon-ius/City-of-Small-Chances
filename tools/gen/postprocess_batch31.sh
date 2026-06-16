#!/usr/bin/env bash
# Batch 31 — fx-008 trailer cinematic key-frames.
# Converts full-frame generated sources into 640x360 opaque RGB UI trailer scenes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch31"
OUT="$ROOT/assets/ui/trailer"

mkdir -p "$OUT"

python3 - "$SRC" "$OUT" <<'PY'
from pathlib import Path
import os
import sys
from PIL import Image, ImageFilter

src = Path(sys.argv[1])
out = Path(sys.argv[2])
names = ("TRAILER_Establish", "TRAILER_Hero", "TRAILER_Work", "TRAILER_Title")
target = (640, 360)

def center_crop_to_aspect(im, aspect):
    w, h = im.size
    current = w / h
    if current > aspect:
        new_w = round(h * aspect)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))
    if current < aspect:
        new_h = round(w / aspect)
        top = (h - new_h) // 2
        return im.crop((0, top, w, top + new_h))
    return im

def process(name):
    src_path = src / f"{name}.png"
    out_path = out / f"{name}.png"
    with Image.open(src_path) as im:
        rgba = im.convert("RGBA")
        if rgba.getchannel("A").getextrema() != (255, 255):
            background = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
            background.alpha_composite(rgba)
            rgba = background
        rgb = rgba.convert("RGB")
        rgb = center_crop_to_aspect(rgb, 16 / 9)
        rgb = rgb.resize(target, Image.Resampling.LANCZOS)
        rgb = rgb.filter(ImageFilter.GaussianBlur(1.35))
        quantized = rgb.quantize(colors=28, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        rgb = quantized.convert("RGB")
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.7, percent=24, threshold=5))
        rgb.save(out_path, optimize=True, compress_level=9)

    with Image.open(out_path) as check:
        if check.size != target:
            raise SystemExit(f"{name}: expected {target}, got {check.size}")
        if check.mode != "RGB":
            raise SystemExit(f"{name}: expected RGB, got {check.mode}")
        opaque = True
        if "A" in check.getbands():
            opaque = check.getchannel("A").getextrema() == (255, 255)
        if not opaque:
            raise SystemExit(f"{name}: output is not opaque")
    size = os.path.getsize(out_path)
    print(f"{name}.png {target[0]}x{target[1]} RGB opaque {size} bytes")

for name in names:
    process(name)
PY
