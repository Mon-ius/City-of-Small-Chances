# Batch 30 — spr-001: dressing the hero (player clothing & skin PBR materials)

**Milestone:** `spr-001` (player figure skin/clothing texture). The player avatar is
the **most-seen figure in the whole game** and is still the *only* major thing drawn
in flat block colour — built from `BoxGeometry` boxes with plain solid-colour
materials (a teal coat, dark trousers, bare skin). This batch paints **3 tileable
PBR material sets** — a coat fabric, a trouser fabric, and a skin surface — that the
orchestrator (Claude Code) will wire onto the player's geometry so the hero reads as
*painted cloth and skin* instead of flat plastic. The figure stays geometry; these
are the surfaces that dress it. **You (codex) generate + post-process + log only. Do
NOT touch `src/`. Do NOT run git.**

## This is a tileable-PBR-surface batch (like Batch 5 / 7 / 13 / 15)

Reuse your established seamless-PBR pipeline (the Batch-13/15 post-process is the
closest model): generate a painterly albedo, then derive a **seamless** albedo +
an OpenGL-convention (**Y+ up**) tangent-space `_normal` + a packed `_orm`
(**R=AO, G=roughness, B=metalness**), all **512×512**, 8-bit PNG, quantised small.

These are **opaque** surfaces (no transparency, no chroma key). They tile onto the
box faces of a small low-poly figure seen from ~9 m in third person, so keep the
weave/detail **medium-scale and calm** — readable as cloth, never busy noise.

**The albedo must carry the garment's actual colour** (the orchestrator shows the
painted albedo at full strength). Match these target hues closely:

## What to make — 3 player material sets

1. **`CHAR_Player_Coat`** — the hero's **signature sea-green work coat**. A woven
   wool/canvas twill in a muted **teal / sea-green** (target ≈ `#2f9e8f`, slightly
   desaturated, a touch weathered), matte, soft cloth folds suggested in the weave,
   honest workwear — not shiny, not new. Seamless. ORM tuning: **AO subtle, roughness
   HIGH (G ≈ 215), metalness 0 (B = 0)**.

2. **`CHAR_Player_Trouser`** — sturdy **dark slate workwear trousers** fabric. A heavy
   twill / denim-like weave in a very dark **slate blue-grey** (target ≈ `#26303a`),
   matte, faint fade at the wear lines, durable and plain. Seamless. ORM tuning:
   **AO subtle, roughness HIGH (G ≈ 210), metalness 0 (B = 0)**.

3. **`CHAR_Player_Skin`** — a soft, even **human skin surface** in a warm mid tone
   (target ≈ `#dda982`). This tiles onto the figure's head/neck boxes, so paint
   **skin *surface*, NOT a face** — no eyes, nose, mouth, hair or features; just a
   calm even expanse of warm skin with the faintest soft pore/tone variation, soft
   subsurface warmth, low sheen. Seamless. ORM tuning: **AO minimal, roughness MID
   (G ≈ 175), metalness 0 (B = 0)**.

All three: original, no real-world brands/logos, no text (n/a here but keep it clean).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test `CHAR_Player_Coat`
first** and eyeball it before doing the others. Generate large (1024² or larger,
square), save raws to `tools/gen/source_batch30/` as `CHAR_Player_Coat.png`,
`CHAR_Player_Trouser.png`, `CHAR_Player_Skin.png`. Write your prompts to
`tools/gen/prompts/batch30.md`. (If the first `image_gen` call returns a server error,
just retry — it succeeds on the second attempt.)

## Post-process — 512² seamless PBR sets

Write `tools/gen/postprocess_batch30.sh` (model it on `postprocess_batch13.sh` /
`postprocess_batch15.sh`):
- make the albedo **seamless** (offset-blend so a 50%-offset tile shows no seam),
  resize to **512×512**, keep the target hue,
- derive `_normal` (tangent-space, **OpenGL Y+**, B/blue channel up ≈ 245–254),
- build `_orm` packed **R=AO, G=roughness, B=metalness** with the per-surface tuning
  above (Coat 215/0, Trouser 210/0, Skin 175/0 in G/B; a gentle baked AO in R),
- 8-bit PNG, quantised; output to **`assets/textures/player/`** (create it) as
  `CHAR_Player_{Coat,Trouser,Skin}_{albedo,normal,orm}.png` (**9 PNGs**).

Verify with Pillow/ImageMagick and report per set: all maps 512×512; albedo mean RGB
near the target hue; albedo seam (50%-offset edge RMS) low; normal B-channel mean
245–254 (valid Y+); ORM G/B means matching the tuning; and a one-line note that the
coat reads as teal cloth, the trousers as dark workwear, the skin as a calm warm
even surface (no face/features).

## Log (no git, no `src/`)

Append **one** Batch 30 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
