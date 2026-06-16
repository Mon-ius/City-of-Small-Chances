#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch51"
OUT="$ROOT/assets/sprites/props"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

KEY="#00ff00"
HELPER="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

process() {
  local name="$1"
  local raw="$SRC/${name}.png"
  local keyed="$TMP/${name}_keyed.png"
  local final="$OUT/${name}.png"

  python3 "$HELPER" \
    --input "$raw" \
    --out "$keyed" \
    --key-color "$KEY" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --despill \
    --force

  python3 - "$keyed" "$final" <<'PY'
import sys
from pathlib import Path
from PIL import Image

inp, out = map(Path, sys.argv[1:3])
im = Image.open(inp).convert("RGBA")
is_brazier = "Brazier" in out.stem
px = im.load()
w, h = im.size

for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 32:
            px[x, y] = (0, 0, 0, 0)
        elif g > 50 and g > max(r, b) + 4:
            px[x, y] = (0, 0, 0, 0)
        elif is_brazier and g > 120 and r > 100 and b < 120 and g > r * 0.55:
            m = max(r, g)
            px[x, y] = (m, min(g, int(m * 0.50)), min(b, int(m * 0.18)), a)
        elif g > 70 and g > r and g > b * 1.05:
            m = max(r, g)
            px[x, y] = (m, min(g, int(m * 0.58)), min(b, int(m * 0.22)), a)

bbox = im.getbbox()
if not bbox:
    raise SystemExit(f"{inp} produced an empty alpha matte")

im = im.crop(bbox)
w, h = im.size
scale = 512 / max(w, h)
im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)

px = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a < 32:
            px[x, y] = (0, 0, 0, 0)
        elif g > 50 and g > max(r, b) + 4:
            px[x, y] = (0, 0, 0, 0)
        elif is_brazier and g > 120 and r > 100 and b < 120 and g > r * 0.55:
            m = max(r, g)
            px[x, y] = (m, min(g, int(m * 0.50)), min(b, int(m * 0.18)), a)
        elif g > 70 and g > r and g > b * 1.05:
            m = max(r, g)
            px[x, y] = (m, min(g, int(m * 0.58)), min(b, int(m * 0.22)), a)

out.parent.mkdir(parents=True, exist_ok=True)
im.save(out, optimize=True, compress_level=9)
PY
}

process PROP_Quay_Bench
process PROP_Quay_Pump
process PROP_Quay_Brazier

python3 - <<'PY'
from pathlib import Path
from PIL import Image
import os

notes = {
    "PROP_Quay_Bench": "reads as an empty weathered quayside bench with no legible text",
    "PROP_Quay_Pump": "reads as a black/rusted cast-iron public water pump with no legible text",
    "PROP_Quay_Brazier": "reads as a dockers' coal brazier with glowing coals and no legible text",
}

def is_green_fringe(r, g, b):
    return g > 70 and g > r and g > b * 1.05

for name, note in notes.items():
    path = Path("assets/sprites/props") / f"{name}.png"
    im = Image.open(path)
    rgba = im.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]

    edge = fringe = visible = visible_key = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            visible += 1
            if r <= 8 and g >= 247 and b <= 8:
                visible_key += 1
            adjacent_transparent = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] == 0:
                    adjacent_transparent = True
                    break
            if adjacent_transparent:
                edge += 1
                if is_green_fringe(r, g, b):
                    fringe += 1

    if im.mode != "RGBA":
        raise SystemExit(f"{name}: expected RGBA, got {im.mode}")
    if max(w, h) != 512:
        raise SystemExit(f"{name}: longest side is {max(w, h)}, expected 512")
    if any(corners):
        raise SystemExit(f"{name}: corners are not fully transparent: {corners}")
    if fringe or visible_key:
        raise SystemExit(f"{name}: residual green detected, edge={fringe}/{edge}, visible_key={visible_key}/{visible}")

    aspect = w / h
    if name == "PROP_Quay_Bench" and aspect <= 1.25:
        raise SystemExit(f"{name}: expected landscape aspect, got {w}x{h}")
    if name == "PROP_Quay_Pump" and aspect >= 0.85:
        raise SystemExit(f"{name}: expected portrait aspect, got {w}x{h}")
    if name == "PROP_Quay_Brazier" and not (0.75 <= aspect <= 1.15):
        raise SystemExit(f"{name}: expected square/slightly tall aspect, got {w}x{h}")

    print(f"{name}: RGBA {w}x{h}, alpha-0 corners, 0% residual green edge fringe, {os.path.getsize(path)} bytes, {note}")
PY
