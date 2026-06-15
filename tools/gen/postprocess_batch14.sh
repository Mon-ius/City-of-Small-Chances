#!/usr/bin/env bash
# Batch 14 — screen-state condition FX (fx-006). Turns each generated full-frame
# vignette into a lightweight RGBA overlay card:
#   • alpha is derived from the card's own inverse luminance (bright centre →
#     transparent, dark edge → opaque), softened and capped per card so the centre
#     stays clear and the edge never fully blacks out the view;
#   • the RGB is blurred into a low-frequency tint field and the card is downsized
#     to 640² — these vignettes are intentionally soft/low-frequency, so this is
#     visually identical when stretched full-screen but compresses ~25× smaller
#     than the raw painterly noise (boot stays fast; no new deps, ImageMagick only).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch14"
OUT="$ROOT/assets/sprites/fx"
DIM=512

mkdir -p "$OUT"

process() {
  local name="$1"
  local ceil="$2"

  magick "$SRC/${name}.png" \
    -resize ${DIM}x${DIM}! \
    -colorspace sRGB \
    -blur 0x14 \
    \( "$SRC/${name}.png" -resize ${DIM}x${DIM}! -colorspace Gray -negate -blur 0x8 \) \
    -alpha off -compose CopyOpacity -composite \
    -channel A -evaluate multiply "$ceil" +channel \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$OUT/${name}.png"
}

process FX_Cond_LowEnergy 0.50
process FX_Cond_Burnout 0.68
process FX_Cond_ColdWet 0.55

find "$OUT" -maxdepth 1 -type f -name 'FX_Cond_*.png' -print | sort
ls -la "$OUT"/FX_Cond_*.png
