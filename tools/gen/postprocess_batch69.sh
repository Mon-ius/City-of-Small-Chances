#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch69"
OUT="$ROOT/assets/sprites/fx"
GAIN="${STEAM_GAIN:-2.1}"   # luminance->alpha gain; steam is faint — soft and wispy, but present enough to read

STEM="FX_Smoke_NoodleSteam"
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

# luminance -> alpha, gentle gain: steam is faint translucent vapour, so keep a soft
# alpha ramp (no hard core). Low floor at lum<5 clears the pure-black surround cleanly.
alpha = Image.new("L", (w, h), 0)
apx = alpha.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        if lum < 5:
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

# quantise RGB (keep the pale-white vapour), merge the smooth alpha back.
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
maxA = 0
rs = gs = bs = n = 0
asum = 0
vis = 0
for y in range(h):
    for x in range(w):
        r, g, b, A = px[x, y]
        if A > maxA:
            maxA = A
        if A > 0:
            vis += 1
            asum += A
        if A > 150:  # average the DENSE vapour cores for the colour check (steam is faint)
            rs += r; gs += g; bs += b; n += 1
n = max(1, n)
rC, gC, bC = rs / n, gs / n, bs / n
sat = max(rC, gC, bC) - min(rC, gC, bC)
vis_pct = vis * 100 / (w * h)
mean_a = asum / max(1, vis)
byte_size = os.path.getsize(path)
aspect = w / h

print(
    f"{stem}.png mode={mode} size={w}x{h} longest={max(w,h)} aspect={aspect:.2f} "
    f"corner_alpha={corners} max_alpha={maxA} mean_alpha={mean_a:.0f} vapour_rgb=({rC:.0f},{gC:.0f},{bC:.0f}) sat={sat:.0f} "
    f"visible={vis_pct:.1f}% bytes={byte_size} "
    f"visual=soft pale-white steam wisp rising and feathering out, translucent, no soot, no flame, no text"
)

if mode != "RGBA":
    raise SystemExit(f"{stem}: expected RGBA, got {mode}")
if max(w, h) != 512:
    raise SystemExit(f"{stem}: expected longest side 512, got {w}x{h}")
if any(corners):
    raise SystemExit(f"{stem}: expected alpha-0 corners, got {corners}")
if maxA < 120:
    raise SystemExit(f"{stem}: steam too faint to read (max alpha {maxA}) — raise STEAM_GAIN")
if not (rC >= 110 and sat <= 40):
    raise SystemExit(f"{stem}: vapour not pale-white (translucent grey-white, low saturation), got rgb=({rC:.0f},{gC:.0f},{bC:.0f}) sat={sat:.0f}")
if aspect > 1.2:
    raise SystemExit(f"{stem}: steam should rise (taller than wide-ish), got {w}x{h}")
PY
