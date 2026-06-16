#!/usr/bin/env bash
# Batch 36 — Steam store art and skill certificate credential.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${SOURCE_DIR:-${1:-$ROOT/tools/gen/source_batch36}}"
STORE="$ROOT/assets/ui/store"
ICONS="$ROOT/assets/ui/icons"
TMP="${TMPDIR:-/tmp}/harbour_batch36_postprocess"
CHROMA="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

mkdir -p "$STORE" "$ICONS" "$TMP"

if [[ ! -f "$CHROMA" ]]; then
  echo "Missing chroma-key remover: $CHROMA" >&2
  exit 1
fi

python3 - "$SRC" "$STORE" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter
import os
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])

targets = {
    "STORE_Capsule_Header": (920, 430),
    "STORE_Library_Hero": (1920, 620),
    "STORE_Capsule_Vertical": (600, 900),
    "UI_Cert_Credential": (768, 1024),
}

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

for name, target in targets.items():
    src_path = src / f"{name}.png"
    out_path = out / f"{name}.png"
    if not src_path.exists():
        raise SystemExit(f"Missing source: {src_path}")
    with Image.open(src_path) as im:
        rgba = im.convert("RGBA")
        if rgba.getchannel("A").getextrema() != (255, 255):
            bg = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
            bg.alpha_composite(rgba)
            rgba = bg
        rgb = rgba.convert("RGB")
        rgb = center_crop_to_aspect(rgb, target[0] / target[1])
        rgb = rgb.resize(target, Image.Resampling.LANCZOS)
        rgb = rgb.filter(ImageFilter.GaussianBlur(0.35))
        quantized = rgb.quantize(colors=192, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        rgb = quantized.convert("RGB")
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.55, percent=18, threshold=4))
        rgb.save(out_path, optimize=True, compress_level=9)

    with Image.open(out_path) as check:
        if check.size != target:
            raise SystemExit(f"{name}: expected {target}, got {check.size}")
        if check.mode != "RGB":
            raise SystemExit(f"{name}: expected RGB, got {check.mode}")
        if "A" in check.getbands() and check.getchannel("A").getextrema() != (255, 255):
            raise SystemExit(f"{name}: output is not opaque")
    print(f"{name}.png {target[0]}x{target[1]} RGB opaque {os.path.getsize(out_path)} bytes")
PY

python3 "$CHROMA" \
  --input "$SRC/UI_Cert_Seal.png" \
  --out "$TMP/UI_Cert_Seal_keyed.png" \
  --key-color '#00ff00' \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --edge-contract 1 \
  --despill \
  --force

python3 - "$TMP/UI_Cert_Seal_keyed.png" "$ICONS/UI_Cert_Seal.png" <<'PY'
from pathlib import Path
from PIL import Image
import os
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])

def is_green_fringe(r, g, b):
    return g >= 145 and r <= 125 and b <= 125 and (g - max(r, b)) >= 35

im = Image.open(src).convert("RGBA")
px = im.load()
for y in range(im.height):
    for x in range(im.width):
        r, g, b, a = px[x, y]
        if a <= 10:
            px[x, y] = (0, 0, 0, 0)
        elif is_green_fringe(r, g, b):
            px[x, y] = (0, 0, 0, 0)

alpha = im.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    raise SystemExit("UI_Cert_Seal: no visible pixels after chroma key")

trimmed = im.crop(bbox)
tw, th = trimmed.size
scale = min(456 / tw, 456 / th)
nw = max(1, round(tw * scale))
nh = max(1, round(th * scale))
resized = trimmed.resize((nw, nh), Image.Resampling.LANCZOS)

canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
canvas.alpha_composite(resized, ((512 - nw) // 2, (512 - nh) // 2))

cpx = canvas.load()
green_fringe = 0
for y in range(canvas.height):
    for x in range(canvas.width):
        r, g, b, a = cpx[x, y]
        if a <= 8:
            cpx[x, y] = (0, 0, 0, 0)
            continue
        if is_green_fringe(r, g, b):
            green_fringe += 1
            cpx[x, y] = (0, 0, 0, 0)

quantized = canvas.quantize(colors=192, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
result = quantized.convert("RGBA")
rpx = result.load()
green_fringe = 0
visible = 0
for y in range(result.height):
    for x in range(result.width):
        r, g, b, a = rpx[x, y]
        if a <= 8:
            rpx[x, y] = (0, 0, 0, 0)
            continue
        visible += 1
        if is_green_fringe(r, g, b):
            green_fringe += 1
            rpx[x, y] = (0, 0, 0, 0)

result.save(out, optimize=True, compress_level=9)

with Image.open(out) as check:
    check = check.convert("RGBA")
    if check.size != (512, 512):
        raise SystemExit(f"UI_Cert_Seal: expected 512x512, got {check.size}")
    pix = check.load()
    corners = [pix[0, 0][3], pix[511, 0][3], pix[0, 511][3], pix[511, 511][3]]
    if any(corners):
        raise SystemExit(f"UI_Cert_Seal: non-transparent corners {corners}")
    fringe = 0
    visible = 0
    for y in range(check.height):
        for x in range(check.width):
            r, g, b, a = pix[x, y]
            if a <= 12:
                continue
            visible += 1
            if is_green_fringe(r, g, b):
                fringe += 1
    if fringe:
        raise SystemExit(f"UI_Cert_Seal: green fringe pixels remain {fringe}")
    if visible < 8000:
        raise SystemExit(f"UI_Cert_Seal: unexpectedly low visible coverage {visible}")

print(f"UI_Cert_Seal.png 512x512 RGBA alpha_corners=0 green_fringe=0 visible={visible} {os.path.getsize(out)} bytes")
PY
