#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
REMOVE_KEY="$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py"
SRC="$ROOT/tools/gen/source_batch9"
TMP="$ROOT/tools/gen/.tmp_batch9"
MAGICK="${MAGICK:-magick}"

mkdir -p \
  "$TMP" \
  "$ROOT/assets/sprites/signage" \
  "$ROOT/assets/ui/keyart"

for src in \
  SIGN_HarbourGate.png \
  SIGN_Tavern.png \
  SIGN_Chandlery.png \
  SIGN_FerryStop.png \
  POSTER_Harbour.png \
  POSTER_Civic.png \
  DECAL_Graffiti.png \
  KEYART_Act_Dawn.png \
  KEYART_Act_Dusk.png \
  KEYART_Act_Storm.png \
  KEYART_Ending_Settled.png
do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

process_cutout() {
  local name="$1"
  local out="$2"
  local size="$3"
  local colors="${4:-128}"
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
    -filter Lanczos \
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

process_keyart() {
  local name="$1"
  local out="$2"
  local tmp_out="$TMP/${name}_keyart.png"

  "$MAGICK" "$SRC/${name}.png" \
    -alpha off \
    -filter Lanczos \
    -resize "640x360^" \
    -gravity center \
    -extent 640x360 \
    -unsharp 0x0.55+0.45+0.008 \
    -strip \
    -depth 8 \
    -colors 224 \
    -define png:compression-level=9 \
    "PNG8:$tmp_out"

  cp "$tmp_out" "$out"
}

process_cutout SIGN_HarbourGate "$ROOT/assets/sprites/signage/SIGN_HarbourGate.png" 256x256 128
process_cutout SIGN_Tavern "$ROOT/assets/sprites/signage/SIGN_Tavern.png" 256x256 128
process_cutout SIGN_Chandlery "$ROOT/assets/sprites/signage/SIGN_Chandlery.png" 256x256 128
process_cutout SIGN_FerryStop "$ROOT/assets/sprites/signage/SIGN_FerryStop.png" 256x256 128
process_cutout POSTER_Harbour "$ROOT/assets/sprites/signage/POSTER_Harbour.png" 256x320 160
process_cutout POSTER_Civic "$ROOT/assets/sprites/signage/POSTER_Civic.png" 256x320 160
process_cutout DECAL_Graffiti "$ROOT/assets/sprites/signage/DECAL_Graffiti.png" 256x256 96

process_keyart KEYART_Act_Dawn "$ROOT/assets/ui/keyart/KEYART_Act_Dawn.png"
process_keyart KEYART_Act_Dusk "$ROOT/assets/ui/keyart/KEYART_Act_Dusk.png"
process_keyart KEYART_Act_Storm "$ROOT/assets/ui/keyart/KEYART_Act_Storm.png"
process_keyart KEYART_Ending_Settled "$ROOT/assets/ui/keyart/KEYART_Ending_Settled.png"

python3 - "$ROOT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

root = Path(sys.argv[1])
cutouts = [
    root / "assets/sprites/signage/SIGN_HarbourGate.png",
    root / "assets/sprites/signage/SIGN_Tavern.png",
    root / "assets/sprites/signage/SIGN_Chandlery.png",
    root / "assets/sprites/signage/SIGN_FerryStop.png",
    root / "assets/sprites/signage/POSTER_Harbour.png",
    root / "assets/sprites/signage/POSTER_Civic.png",
    root / "assets/sprites/signage/DECAL_Graffiti.png",
]
keyart = [
    root / "assets/ui/keyart/KEYART_Act_Dawn.png",
    root / "assets/ui/keyart/KEYART_Act_Dusk.png",
    root / "assets/ui/keyart/KEYART_Act_Storm.png",
    root / "assets/ui/keyart/KEYART_Ending_Settled.png",
]

def alpha_stats(path):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    corners = [im.getpixel((0, 0))[3], im.getpixel((w - 1, 0))[3], im.getpixel((0, h - 1))[3], im.getpixel((w - 1, h - 1))[3]]
    opaque = sum(1 for *_, a in im.getdata() if a > 16)
    green_residue = 0
    magenta_residue = 0
    for r, g, b, a in im.getdata():
        if a > 16 and g > 210 and r < 70 and b < 70:
            green_residue += 1
        if a > 16 and r > 210 and b > 210 and g < 70:
            magenta_residue += 1
    return min(corners), max(corners), opaque / (w * h), green_residue, magenta_residue

for path in cutouts:
    corner_min, corner_max, coverage, green, magenta = alpha_stats(path)
    if corner_max != 0:
        raise SystemExit(f"{path.name}: corner alpha is not transparent: {corner_max}")
    if green or magenta:
        raise SystemExit(f"{path.name}: chroma residue green={green} magenta={magenta}")
    print(f"cutout ok {path.name}: corner_alpha={corner_min}-{corner_max} coverage={coverage:.3f} chroma_residue=0")

for path in keyart:
    im = Image.open(path)
    if im.size != (640, 360):
        raise SystemExit(f"{path.name}: wrong size {im.size}")
    if im.mode in {"RGBA", "LA"}:
        alpha = im.getchannel("A")
        if min(alpha.getdata()) < 255:
            raise SystemExit(f"{path.name}: contains transparency")
    print(f"keyart ok {path.name}: size={im.size[0]}x{im.size[1]} mode={im.mode} opaque")
PY

find "$ROOT/assets/sprites/signage" "$ROOT/assets/ui/keyart" \
  -maxdepth 1 -type f \( \
    -name 'SIGN_HarbourGate.png' -o \
    -name 'SIGN_Tavern.png' -o \
    -name 'SIGN_Chandlery.png' -o \
    -name 'SIGN_FerryStop.png' -o \
    -name 'POSTER_Harbour.png' -o \
    -name 'POSTER_Civic.png' -o \
    -name 'DECAL_Graffiti.png' -o \
    -name 'KEYART_Act_Dawn.png' -o \
    -name 'KEYART_Act_Dusk.png' -o \
    -name 'KEYART_Act_Storm.png' -o \
    -name 'KEYART_Ending_Settled.png' \
  \) -print | sort
