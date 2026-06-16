#!/usr/bin/env bash
# Batch 21 — weather FX cards (fx-002). Turns bright-on-black generated weather
# fields into RGBA full-screen overlays whose alpha is derived from their own
# luminance: bright rain/fog -> visible, black background -> transparent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch21"
TMP="$ROOT/tools/gen/.tmp_batch21"
OUT="$ROOT/assets/sprites/fx"
DIM=512
MAGICK="${MAGICK:-magick}"

mkdir -p "$TMP" "$OUT"

for src in FX_Rain_Streaks.png FX_Weather_Fog.png FX_Rain_Mist.png; do
  if [[ ! -f "$SRC/$src" ]]; then
    echo "Missing source: $SRC/$src" >&2
    exit 1
  fi
done

process() {
  local name="$1"
  local blur="$2"
  local cap="$3"
  local rgb="$TMP/${name}_rgb.png"
  local alpha="$TMP/${name}_alpha.png"

  "$MAGICK" "$SRC/${name}.png" \
    -resize "${DIM}x${DIM}!" \
    -colorspace sRGB \
    -depth 8 \
    -strip \
    "$rgb"

  "$MAGICK" "$SRC/${name}.png" \
    -resize "${DIM}x${DIM}!" \
    -colorspace Gray \
    -blur "$blur" \
    -depth 8 \
    -strip \
    "$alpha"

  python3 - "$rgb" "$alpha" "$OUT/${name}.png" "$name" "$cap" <<'PY'
from pathlib import Path
from PIL import Image
import sys
import math

rgb_path = Path(sys.argv[1])
alpha_path = Path(sys.argv[2])
out_path = Path(sys.argv[3])
name = sys.argv[4]
cap = float(sys.argv[5])

rgb = Image.open(rgb_path).convert("RGBA")
alpha = Image.open(alpha_path).convert("L")
if rgb.size != (512, 512) or alpha.size != (512, 512):
    raise SystemExit(f"{name}: intermediate size mismatch {rgb.size} {alpha.size}")

cap_u8 = round(255 * cap)
apx = alpha.load()
rpx = rgb.load()
w, h = rgb.size

for y in range(h):
    for x in range(w):
        a = min(cap_u8, round(apx[x, y] * cap))
        corner_dist = min(
            math.hypot(x, y),
            math.hypot(w - 1 - x, y),
            math.hypot(x, h - 1 - y),
            math.hypot(w - 1 - x, h - 1 - y),
        )
        a = round(a * min(1.0, corner_dist / 36.0))
        if a <= 6:
            a = 0
        r, g, b, _ = rpx[x, y]
        if a == 0:
            rpx[x, y] = (0, 0, 0, 0)
        else:
            rpx[x, y] = (r, g, b, a)

corners = [rpx[0, 0][3], rpx[w - 1, 0][3], rpx[0, h - 1][3], rpx[w - 1, h - 1][3]]
if max(corners) > 3:
    raise SystemExit(f"{name}: corner alpha not transparent enough {corners}")

max_alpha = max(rpx[x, y][3] for y in range(h) for x in range(w))
if max_alpha > cap_u8:
    raise SystemExit(f"{name}: max alpha {max_alpha} exceeds cap {cap_u8}")

rgb.save(out_path, optimize=True)
print(f"{name}.png 512x512 RGBA alpha_corners={corners} alpha_max={max_alpha}/{cap_u8}")
PY
}

process FX_Rain_Streaks 0x1 0.65
process FX_Weather_Fog 0x8 0.60
process FX_Rain_Mist 0x10 0.42

python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import sys

out_dir = Path(sys.argv[1])
caps = {
    "FX_Rain_Streaks": 0.65,
    "FX_Weather_Fog": 0.60,
    "FX_Rain_Mist": 0.42,
}

total = 0
for name, cap in caps.items():
    path = out_dir / f"{name}.png"
    im = Image.open(path).convert("RGBA")
    if im.size != (512, 512):
        raise SystemExit(f"{name}: size {im.size}, expected 512x512")
    px = im.load()
    w, h = im.size
    corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
    if max(corners) > 3:
        raise SystemExit(f"{name}: non-transparent corners {corners}")
    alpha_values = [px[x, y][3] for y in range(h) for x in range(w)]
    max_alpha = max(alpha_values)
    cap_u8 = round(255 * cap)
    if max_alpha > cap_u8:
        raise SystemExit(f"{name}: alpha cap exceeded {max_alpha}>{cap_u8}")
    bytes_size = path.stat().st_size
    total += bytes_size
    line = (
        f"{name}.png ok mode=RGBA size=512x512 bytes={bytes_size} "
        f"alpha_corners={corners} alpha_max={max_alpha}/{cap_u8}"
    )
    if name == "FX_Rain_Streaks":
        top = sum(px[x, y][3] for y in range(h // 2) for x in range(w)) / (w * (h // 2) * 255)
        bottom = sum(px[x, y][3] for y in range(h // 2, h) for x in range(w)) / (w * (h // 2) * 255)
        ratio = top / bottom if bottom else 0
        if not 0.80 <= ratio <= 1.25:
            raise SystemExit(f"{name}: top/bottom alpha coverage uneven top={top:.4f} bottom={bottom:.4f}")
        line += f" top_alpha={top:.4f} bottom_alpha={bottom:.4f} ratio={ratio:.3f}"
    print(line)

print(f"total_payload_bytes={total}")
PY
