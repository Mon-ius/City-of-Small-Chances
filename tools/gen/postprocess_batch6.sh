#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch6"
TMP="$ROOT/tools/gen/.tmp_batch6"

mkdir -p "$TMP" \
  "$ROOT/assets/sprites/sky" \
  "$ROOT/assets/sprites/weather" \
  "$ROOT/assets/sprites/signage"

process() {
  local name="$1"
  local out="$2"
  local size="$3"
  local stripped="$TMP/${name}_alpha.png"
  local trimmed="$TMP/${name}_trim.png"

  python3 "$REMOVE_KEY" \
    --input "$SRC/${name}.png" \
    --out "$stripped" \
    --auto-key border \
    --soft-matte \
    --despill \
    --force

  magick "$stripped" -alpha on -trim +repage "$trimmed"
  magick "$trimmed" \
    -alpha on \
    -resize "${size}>" \
    -background none \
    -gravity center \
    -extent "$size" \
    -colors 128 \
    -depth 8 \
    -define png:color-type=6 \
    -define png:compression-level=9 \
    -strip \
    "$out"
}

process FX_Sky_Cloud_A "$ROOT/assets/sprites/sky/FX_Sky_Cloud_A.png" 512x256
process FX_Sky_Cloud_B "$ROOT/assets/sprites/sky/FX_Sky_Cloud_B.png" 512x256
process FX_Sky_Cloud_C "$ROOT/assets/sprites/sky/FX_Sky_Cloud_C.png" 512x256
process FX_Sky_Cloud_D "$ROOT/assets/sprites/sky/FX_Sky_Cloud_D.png" 512x256

process FX_Weather_Rain "$ROOT/assets/sprites/weather/FX_Weather_Rain.png" 512x512
process FX_Weather_Fog "$ROOT/assets/sprites/weather/FX_Weather_Fog.png" 512x256
process FX_Weather_Heat "$ROOT/assets/sprites/weather/FX_Weather_Heat.png" 512x256
process FX_Weather_Puddle "$ROOT/assets/sprites/weather/FX_Weather_Puddle.png" 512x512

process SIGN_NoodleStall "$ROOT/assets/sprites/signage/SIGN_NoodleStall.png" 256x256
process DECAL_BoardNotes "$ROOT/assets/sprites/signage/DECAL_BoardNotes.png" 256x256
process SIGN_HarbourShop "$ROOT/assets/sprites/signage/SIGN_HarbourShop.png" 256x256
process SIGN_Chandler "$ROOT/assets/sprites/signage/SIGN_Chandler.png" 256x256
process SIGN_CivicNotice "$ROOT/assets/sprites/signage/SIGN_CivicNotice.png" 256x256

find "$ROOT/assets/sprites/sky" "$ROOT/assets/sprites/weather" "$ROOT/assets/sprites/signage" \
  -maxdepth 1 -type f -name '*.png' -print | sort
