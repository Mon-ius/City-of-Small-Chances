#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_batch27"
TMP="$ROOT/tools/gen/.tmp_batch27"
OUT="$ROOT/assets/ui/icons"
KEYER="${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py"

mkdir -p "$TMP" "$OUT"

names=(
  UI_Icon_State_Burnout
  UI_Icon_State_Illness
  UI_Icon_State_Injury
  UI_Icon_State_WellRested
)

for name in "${names[@]}"; do
  python3 "$KEYER" \
    --input "$SRC/$name.png" \
    --out "$TMP/${name}_alpha.png" \
    --key-color '#ff00ff' \
    --transparent-threshold 20 \
    --opaque-threshold 210 \
    --soft-matte \
    --despill \
    --edge-contract 1

  python3 - "$TMP/${name}_alpha.png" "$OUT/$name.png" <<'PY'
from pathlib import Path
import sys
from PIL import Image

src = Path(sys.argv[1])
dst = Path(sys.argv[2])
im = Image.open(src).convert("RGBA")
alpha = im.getchannel("A")
bbox = alpha.getbbox()
if bbox is None:
    raise SystemExit(f"{src}: no non-transparent pixels")

glyph = im.crop(bbox)
gw, gh = glyph.size
side = max(gw, gh)
pad = max(8, int(round(side * 0.10)))
canvas_side = side + pad * 2
canvas = Image.new("RGBA", (canvas_side, canvas_side), (0, 0, 0, 0))
canvas.alpha_composite(glyph, ((canvas_side - gw) // 2, (canvas_side - gh) // 2))
resample = getattr(Image, "Resampling", Image).LANCZOS
canvas = canvas.resize((128, 128), resample)

if canvas.mode != "RGBA":
    canvas = canvas.convert("RGBA")

rgb = canvas.convert("RGB")
pal = rgb.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
quant_rgb = pal.convert("RGB")
quant = Image.merge("RGBA", (*quant_rgb.split(), canvas.getchannel("A")))
dst.parent.mkdir(parents=True, exist_ok=True)
quant.save(dst, optimize=True)
PY
done

python3 - "$OUT" "${names[@]}" <<'PY'
from pathlib import Path
import sys
from PIL import Image, ImageStat

out = Path(sys.argv[1])
names = sys.argv[2:]

for name in names:
    path = out / f"{name}.png"
    im = Image.open(path).convert("RGBA")
    alpha = im.getchannel("A")
    corners = [alpha.getpixel(p) for p in ((0, 0), (127, 0), (0, 127), (127, 127))]
    fringe = 0
    visible = 0
    for r, g, b, a in im.getdata():
        if a:
            visible += 1
            if r > 180 and b > 180 and g < 80:
                fringe += 1
    lum = ImageStat.Stat(im.convert("LA").split()[0], alpha).mean[0]
    print(f"{path.name}: size={im.size} mode=RGBA corners={corners} magenta_fringe={fringe} visible={visible} greyscale_mean={lum:.1f}")
    if im.size != (128, 128):
        raise SystemExit(f"{path}: expected 128x128")
    if any(corners):
        raise SystemExit(f"{path}: expected transparent corners")
    if fringe:
        raise SystemExit(f"{path}: magenta fringe detected")
PY
