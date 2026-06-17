#!/usr/bin/env bash
# Real-body character surfaces — turn the chosen codex albedos into seamless,
# tileable PBR map sets (albedo + normal + packed ORM) for the new capsule-geometry
# figure. Derivation recipe reused from postprocess_batch7 (PBR surfaces). Writes the
# three CHAR_Player_{Skin,Coat,Trouser} sets that src/three/player.js#playerSkin loads.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/tools/gen/source_body"
OUT="$ROOT/assets/textures/player"
mkdir -p "$OUT"

# chosen raw per surface (harvested from the 3x3 contact sheet)
declare_choices() { :; }   # documentation only; bash 3.2 has no assoc arrays
# Skin -> skin_2.png, Coat -> coat_3.png, Trouser -> trouser_1.png

python3 - "$SRC" "$OUT" <<'PY'
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import math, sys

src_dir = Path(sys.argv[1])
out_dir = Path(sys.argv[2])

# (out_stem, source_file, normal_strength, roughness_byte, metalness_byte, seam_band, kind)
SURFACES = [
    ("CHAR_Player_Skin",    "skin_2.png",    1.4, 205, 0, 46, "soft"),
    ("CHAR_Player_Coat",    "coat_3.png",    2.6, 224, 0, 50, "rough"),
    ("CHAR_Player_Trouser", "trouser_1.png", 2.4, 214, 0, 50, "wood"),
]

def fit_source(im):
    return ImageOps.fit(im.convert("RGB"), (512, 512),
                        method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))

def offset_half(im):
    w, h = im.size
    out = Image.new("RGB", (w, h))
    out.paste(im.crop((w // 2, h // 2, w, h)), (0, 0))
    out.paste(im.crop((0, h // 2, w // 2, h)), (w // 2, 0))
    out.paste(im.crop((w // 2, 0, w, h // 2)), (0, h // 2))
    out.paste(im.crop((0, 0, w // 2, h // 2)), (w // 2, h // 2))
    return out

def enforce_edges(img, edge_band):
    img = img.copy(); w, h = img.size; px = img.load()
    for x in range(edge_band):
        t = (1 - math.cos(math.pi * (x + 1) / (edge_band + 1))) * 0.5
        rx = w - 1 - x
        for y in range(h):
            left = px[x, y]; right = px[rx, y]
            mix = tuple(round(left[c] * t + right[c] * (1 - t)) for c in range(3))
            px[x, y] = px[rx, y] = mix
    for y in range(edge_band):
        t = (1 - math.cos(math.pi * (y + 1) / (edge_band + 1))) * 0.5
        by = h - 1 - y
        for x in range(w):
            top = px[x, y]; bottom = px[x, by]
            mix = tuple(round(top[c] * t + bottom[c] * (1 - t)) for c in range(3))
            px[x, y] = px[x, by] = mix
    return img

def seamless(im, band):
    im = fit_source(im); w, h = im.size
    shifted = offset_half(im)
    mask = Image.new("L", (w, h), 0); mp = mask.load()
    for y in range(h):
        for x in range(w):
            if abs(x - w // 2) < band or abs(y - h // 2) < band:
                mp[x, y] = 255
    mask = mask.filter(ImageFilter.GaussianBlur(band * 0.45))
    blended = Image.composite(im, shifted, mask)
    eb = max(12, band // 3)
    blended = enforce_edges(blended, eb)
    blended = blended.filter(ImageFilter.UnsharpMask(radius=0.7, percent=35, threshold=3))
    return enforce_edges(blended, eb)

def luminance(im):
    return im.convert("L").filter(ImageFilter.GaussianBlur(0.45))

def tuned_height(albedo, kind):
    height = luminance(albedo)
    if kind in {"rough"}:
        height = height.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=2))
    if kind == "wood":
        height = height.filter(ImageFilter.UnsharpMask(radius=0.8, percent=80, threshold=3))
    if kind == "soft":
        height = height.filter(ImageFilter.GaussianBlur(0.3))
    return height

def normal_from_height(height, strength):
    w, h = height.size; src = height.load()
    normal = Image.new("RGB", (w, h)); dst = normal.load()
    for y in range(h):
        ym = (y - 1) % h; yp = (y + 1) % h
        for x in range(w):
            xm = (x - 1) % w; xp = (x + 1) % w
            dx = (src[xp, y] - src[xm, y]) / 255.0
            dy = (src[x, yp] - src[x, ym]) / 255.0
            nx = -dx * strength; ny = dy * strength; nz = 1.0
            inv = 1.0 / math.sqrt(nx * nx + ny * ny + nz * nz)
            dst[x, y] = (int((nx * inv * 0.5 + 0.5) * 255),
                         int((ny * inv * 0.5 + 0.5) * 255),
                         int((nz * inv * 0.5 + 0.5) * 255))
    return normal

def orm_from_height(height, roughness, metalness):
    w, h = height.size; hp = height.load()
    orm = Image.new("RGB", (w, h)); op = orm.load()
    for y in range(h):
        for x in range(w):
            ao = max(70, min(255, 255 - int((128 - hp[x, y]) * 0.55)))
            op[x, y] = (ao, roughness, metalness)
    return orm

def edge_rms(im):
    im = im.convert("RGB"); w, h = im.size; px = im.load()
    total = 0; count = 0
    for x in range(w):
        a = px[x, 0]; b = px[x, h - 1]
        total += sum((a[c] - b[c]) ** 2 for c in range(3)); count += 3
    for y in range(h):
        a = px[0, y]; b = px[w - 1, y]
        total += sum((a[c] - b[c]) ** 2 for c in range(3)); count += 3
    return math.sqrt(total / count)

for stem, srcf, strength, rough, metal, band, kind in SURFACES:
    src = src_dir / srcf
    if not src.exists():
        raise SystemExit(f"missing source {src}")
    albedo = seamless(Image.open(src), band)
    height = tuned_height(albedo, kind)
    normal = normal_from_height(height, strength)
    orm = orm_from_height(height, rough, metal)
    albedo.save(out_dir / f"{stem}_albedo.png")
    normal.save(out_dir / f"{stem}_normal.png")
    orm.save(out_dir / f"{stem}_orm.png")
    rms = edge_rms(albedo)
    print(f"{stem}: albedo+normal+orm written  edge_rms={rms:.2f}  ({'SEAMLESS' if rms < 8 else 'CHECK SEAM'})")
PY
echo "post-process complete."
