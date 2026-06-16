#!/usr/bin/env bash
# Batch 21 — orchestrator refinement pass (supersedes postprocess_batch21.sh for
# the two RAIN cards). codex's luminance->alpha is correct for FX_Weather_Fog
# (bright, cool, denser at the bottom) but the rain/mist *sources* generated dim
# and grey: a linear alpha=lum*cap plus the 1254->512 downscale thinned the
# streaks until they read as near-invisible dark smudges over the dusk scene.
#
# Real rain catches the light, so this pass:
#   - LEVEL-STRETCHES the source luminance (recovers the thin streaks the
#     downscale buried) and derives alpha from that, with a soft cap;
#   - RECOLOURS the rain/mist RGB to a flat pale cool-white so the streaks read
#     as light against the darker harbour (alpha carries the shape).
# Fog is reproduced with codex's exact params (it was already right).
#
# Re-runnable, pre-installed tools only (ImageMagick + Pillow). No new deps.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch21"
TMP="$ROOT/tools/gen/.tmp_batch21_refine"
OUT="$ROOT/assets/sprites/fx"
DIM=512
MAGICK="${MAGICK:-magick}"

mkdir -p "$TMP" "$OUT"

for src in FX_Rain_Streaks.png FX_Weather_Fog.png FX_Rain_Mist.png; do
  [[ -f "$SRC/$src" ]] || { echo "Missing source: $SRC/$src" >&2; exit 1; }
done

# args: name  level(B%,W%)  blur  cap  tintR tintG tintB  (tint <0 = keep source RGB)
refine() {
  local name="$1" level="$2" blur="$3" cap="$4" tr="$5" tg="$6" tb="$7"
  local rgb="$TMP/${name}_rgb.png" alpha="$TMP/${name}_alpha.png"

  "$MAGICK" "$SRC/${name}.png" -resize "${DIM}x${DIM}!" -colorspace sRGB -depth 8 -strip "$rgb"

  # Stretch the streak luminance BEFORE the cap so thin streaks survive.
  "$MAGICK" "$SRC/${name}.png" \
    -colorspace Gray \
    -level "$level" \
    -resize "${DIM}x${DIM}!" \
    -blur "$blur" \
    -depth 8 -strip "$alpha"

  python3 - "$rgb" "$alpha" "$OUT/${name}.png" "$name" "$cap" "$tr" "$tg" "$tb" <<'PY'
from pathlib import Path
from PIL import Image
import sys, math

rgb = Image.open(sys.argv[1]).convert("RGBA")
alpha = Image.open(sys.argv[2]).convert("L")
out = Path(sys.argv[3]); name = sys.argv[4]
cap = float(sys.argv[5]); tr, tg, tb = int(sys.argv[6]), int(sys.argv[7]), int(sys.argv[8])
if rgb.size != (512, 512) or alpha.size != (512, 512):
    raise SystemExit(f"{name}: size mismatch {rgb.size} {alpha.size}")

cap_u8 = round(255 * cap)
apx = alpha.load(); rpx = rgb.load(); w, h = rgb.size
for y in range(h):
    for x in range(w):
        a = min(cap_u8, round(apx[x, y] * cap))
        cd = min(math.hypot(x, y), math.hypot(w-1-x, y), math.hypot(x, h-1-y), math.hypot(w-1-x, h-1-y))
        a = round(a * min(1.0, cd / 36.0))
        if a <= 6:
            rpx[x, y] = (0, 0, 0, 0)
        elif tr >= 0:
            rpx[x, y] = (tr, tg, tb, a)
        else:
            r, g, b, _ = rpx[x, y]
            rpx[x, y] = (r, g, b, a)

corners = [rpx[0,0][3], rpx[w-1,0][3], rpx[0,h-1][3], rpx[w-1,h-1][3]]
if max(corners) > 3:
    raise SystemExit(f"{name}: corners not transparent {corners}")
mx = max(rpx[x, y][3] for y in range(h) for x in range(w))
if mx > cap_u8:
    raise SystemExit(f"{name}: max alpha {mx} > cap {cap_u8}")
rgb.save(out, optimize=True)
print(f"{name}.png 512x512 RGBA corners={corners} alpha_max={mx}/{cap_u8}")
PY
}

# Rain streaks: hard stretch (recover thin streaks), keep crisp, pale cool-white.
refine FX_Rain_Streaks "3%,30%" 0x0.6 0.50 206 216 232
# Rain mist: gentle stretch, very soft, fainter pale cool tint.
refine FX_Rain_Mist    "3%,22%" 0x6   0.30 190 202 220
# Fog: codex's params, keep the source cool-blue RGB (tint <0).
refine FX_Weather_Fog  "0%,100%" 0x8  0.60 -1 -1 -1

# Final independent verification.
python3 - "$OUT" <<'PY'
from pathlib import Path
from PIL import Image
import numpy as np, sys
out = Path(sys.argv[1])
caps = {"FX_Rain_Streaks": 0.50, "FX_Rain_Mist": 0.30, "FX_Weather_Fog": 0.60}
total = 0
for name, cap in caps.items():
    p = out / f"{name}.png"
    a = np.asarray(Image.open(p).convert("RGBA"))
    al = a[:, :, 3].astype(np.float32)
    corners = [int(al[0,0]), int(al[0,-1]), int(al[-1,0]), int(al[-1,-1])]
    assert a.shape[:2] == (512, 512), f"{name} size"
    assert max(corners) <= 3, f"{name} corners {corners}"
    assert al.max() <= round(255*cap)+1, f"{name} cap"
    h = al.shape[0]; top = al[:h//2].mean(); bot = al[h//2:].mean()
    line = f"{name}: bytes={p.stat().st_size} max={int(al.max())}/{round(255*cap)} cov(a>4)={(al>4).mean():.3f} top/bot={top:.2f}/{bot:.2f}"
    if name == "FX_Rain_Streaks":
        r = top/bot if bot else 0
        assert 0.75 <= r <= 1.30, f"{name} uneven {r:.3f}"
        line += f" ratio={r:.3f}"
    total += p.stat().st_size
    print(line)
print(f"total_payload_bytes={total}")
PY