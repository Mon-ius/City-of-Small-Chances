#!/usr/bin/env bash
# Batch 19 — sleep/day-transition FX (fx-005). Turns generated full-frame
# atmosphere cards into lightweight opaque RGBA overlays:
#   • resize to the shipped 512² card size;
#   • lightly blur the painterly source so it compresses well while retaining
#     broad striation/mist texture;
#   • force alpha to 255 everywhere. Runtime fades the whole card via CSS opacity.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch19"
OUT="$ROOT/assets/sprites/fx"
DIM=512

mkdir -p "$OUT"

process() {
  local name="$1"

  magick "$SRC/${name}.png" \
    -resize ${DIM}x${DIM}! \
    -colorspace sRGB \
    -blur 0x5 \
    -alpha set \
    -channel A -evaluate set 100% +channel \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$OUT/${name}.png"
}

process FX_Trans_NightVeil
process FX_Trans_DawnVeil
process FX_Trans_RestGrain

python3 - "$OUT" <<'PY'
import os
import sys
from PIL import Image, ImageStat

out = sys.argv[1]
for name in ("FX_Trans_NightVeil", "FX_Trans_DawnVeil", "FX_Trans_RestGrain"):
    path = os.path.join(out, f"{name}.png")
    with Image.open(path) as im:
        rgba = im.convert("RGBA")
        if rgba.size != (512, 512):
            raise SystemExit(f"{name}: expected 512x512, got {rgba.size}")
        alpha = rgba.getchannel("A")
        amin, amax = alpha.getextrema()
        if amin != 255 or amax != 255:
            raise SystemExit(f"{name}: expected fully opaque alpha, got {amin}..{amax}")
        rgb_mean = tuple(round(v, 1) for v in ImageStat.Stat(rgba).mean[:3])
        size = os.path.getsize(path)
        print(f"{name}.png {size} bytes 512x512 RGBA alpha-min={amin} alpha-max={amax} rgb-mean={rgb_mean}")
PY
