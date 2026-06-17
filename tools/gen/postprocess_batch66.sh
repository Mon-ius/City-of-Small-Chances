#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch66"
OUT="$ROOT/assets/sprites/fx"
GAIN="${BEACON_GAIN:-2.4}"   # luminance->alpha gain; lift the bright core, fade the halo/glints

STEM="FX_Light_Beacon"
raw="$SRC/${STEM}_raw.png"
final="$OUT/${STEM}.png"

mkdir -p "$OUT"
if [[ ! -f "$raw" ]]; then
  echo "Missing source: $raw" >&2
  exit 1
fi

python3 - "$raw" "$final" "$GAIN" <<'PY'
from pathlib import Path
from PIL import Image
import sys

src = Path(sys.argv[1])
out = Path(sys.argv[2])
gain = float(sys.argv[3])

im = Image.open(src).convert("RGB")
w, h = im.size
px = im.load()

# luminance -> alpha, gain curve: the bright core lifts toward opaque, the halo and
# glints fade, pure-black surround -> 0. A low floor keeps the edge clean.
alpha = Image.new("L", (w, h), 0)
apx = alpha.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum < 6:
            apx[x, y] = 0
        else:
            a = int(round(lum * gain))
            apx[x, y] = 255 if a > 255 else a

bbox = alpha.getbbox()
if not bbox:
    raise SystemExit(f"No luminance content after keying: {src}")

rgba = Image.merge("RGBA", (*im.split(), alpha))

pad = 8
left = max(0, bbox[0] - pad)
top = max(0, bbox[1] - pad)
right = min(w, bbox[2] + pad)
bottom = min(h, bbox[3] + pad)
rgba = rgba.crop((left, top, right, bottom))

scale = 512 / max(rgba.size)
if scale != 1:
    rgba = rgba.resize(
        (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))),
        Image.Resampling.LANCZOS,
    )

# quantise RGB (keep the warm-white), merge the smooth alpha back.
rgb = rgba.convert("RGB")
a = rgba.getchannel("A")
quant = rgb.quantize(colors=224, method=Image.Quantize.MEDIANCUT).convert("RGB")
out_im = Image.merge("RGBA", (*quant.split(), a))

# force the four corners fully transparent (they sit in the black surround).
opx = out_im.load()
ow, oh = out_im.size
for pos in ((0, 0), (ow - 1, 0), (0, oh - 1), (ow - 1, oh - 1)):
    r, g, b, _ = opx[pos]
    opx[pos] = (r, g, b, 0)

out.parent.mkdir(parents=True, exist_ok=True)
out_im.save(out, optimize=True, compress_level=9)
PY

python3 - "$final" "$STEM" <<'PY'
from pathlib import Path
from PIL import Image
import os, sys

path = Path(sys.argv[1])
stem = sys.argv[2]
im = Image.open(path)
mode = im.mode
rgba = im.convert("RGBA")
w, h = rgba.size
px = rgba.load()
corners = [px[0, 0][3], px[w - 1, 0][3], px[0, h - 1][3], px[w - 1, h - 1][3]]
cx, cy = w // 2, h // 2
ca = px[cx, cy][3]
# warm-white check on the GOLD HALO RING (not the dead-centre core): an intense beacon
# clips its core to near-white, so the white-gold warmth reads in the halo just off
# centre. Sample a thin ring at ~6% of the longest side and average the opaque pixels.
import math
ring_r = max(8, round(0.06 * max(w, h)))
rs = gs = bs = n = 0
for ang in range(0, 360, 3):
    x = int(round(cx + ring_r * math.cos(math.radians(ang))))
    y = int(round(cy + ring_r * math.sin(math.radians(ang))))
    if 0 <= x < w and 0 <= y < h:
        r, g, b, a = px[x, y]
        if a > 20:
            rs += r; gs += g; bs += b; n += 1
n = max(1, n)
rC, gC, bC = rs / n, gs / n, bs / n
visible = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 0)
vis_pct = visible * 100 / (w * h)
byte_size = os.path.getsize(path)

print(
    f"{stem}.png mode={mode} size={w}x{h} longest={max(w,h)} "
    f"corner_alpha={corners} centre_alpha={ca} centre_rgb=({rC:.0f},{gC:.0f},{bC:.0f}) "
    f"visible={vis_pct:.1f}% bytes={byte_size} "
    f"visual=bright warm-white beacon, white-gold core with soft halo and faint glints, fades to transparent, no text"
)

if mode != "RGBA":
    raise SystemExit(f"{stem}: expected RGBA, got {mode}")
if max(w, h) != 512:
    raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
if any(corners):
    raise SystemExit(f"{stem}: expected alpha-0 corners, got {corners}")
if ca < 180:
    raise SystemExit(f"{stem}: beacon core too faint (alpha {ca}) — raise BEACON_GAIN")
if not (rC >= gC >= bC - 2 and rC - bC > 8):
    raise SystemExit(f"{stem}: centre not warm-white (R>=G>=B, R-B>8), got ({rC:.0f},{gC:.0f},{bC:.0f})")
aspect = w / h
if not (0.6 <= aspect <= 1.6):
    raise SystemExit(f"{stem}: expected round-ish flare, got {w}x{h}")
PY
