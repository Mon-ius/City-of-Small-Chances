# Batch 38 — the last flat surface: the notice board's weathered timber (ENV_Harbour_NoticeBoard, WIRED LIVE)

**Milestone:** harbour surface-material coverage (the `mat-001` core-surface scope).
After Batch 37 painted the quay sea-wall, an audit of the live world geometry found
**exactly one structure still drawn in flat block colour**: the **notice board** — the
standing job board the player walks up to and reads. Its two **posts** and its **panel
backing** are still flat brown boxes (`0x3a2f25` posts, `0x6b5535` panel) while every
other piece of timber in the harbour (the boardwalk, the boat hull, the stall counter,
the crates) is painted PBR. This batch paints it, so **every surface in the walkable
harbour is finally painted**. One **seamless tileable PBR wood surface** in the exact
Batch-1/5/10/37 harbour-surface style. **You (codex) generate + post-process + log only.
Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires it into `world.js`.)

## Match the existing harbour-surface style EXACTLY

Look first at the existing wood surface `assets/textures/harbour/ENV_Harbour_PlankWood_albedo.png`
and the new `ENV_Harbour_QuayWall_albedo.png`. Each is a **512×512 seamless, tileable,
top-/front-lit painterly material** in a muted period-harbour palette, even lighting,
**no baked shadows, no single hero feature** (it must tile). Match that resolution,
palette, scale and even-lit flatness precisely.

## What to make — ONE seamless surface

**`ENV_Harbour_NoticeBoard`** — *the weathered timber of an old harbour notice board.*
Vertical **planks of grey-brown salt-bleached weathered wood**, older and greyer than the
fresh boardwalk planks — the wood of a public board that has stood in the sea air for
years: silvered/lichened grain, a few darker damp streaks and old nail/pin holes, knots
and split edges, faintly tide-stained low. It must read as **older, more weathered
timber than the boardwalk** (so the board looks like a long-standing fixture), while
still belonging to the same harbour palette. **Seamless and tileable** (planks continue
across the wrap, no plank straddles the edge unevenly), even-lit, **no baked directional
shadow**, **no readable text / numbers / pinned-paper marks** (the paper notices are
separate cutouts the game pins on top — this is bare board wood only). Muted, weathered,
grounded.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. Generate a **square** top-/
front-lit tileable weathered-plank texture (ask for a seamless, repeating vertical-plank
weathered-wood texture, flat even light, no perspective, no single focal point). Eyeball
it for tileability and plank scale before finishing. Save the raw to
`tools/gen/source_batch38/` as `ENV_Harbour_NoticeBoard_albedo.png`. Write your prompt to
`tools/gen/prompts/batch38.md`. (If an `image_gen` call returns a server error, just
retry — it succeeds on the second attempt.)

## Post-process — a seamless 512² PBR set (albedo + normal + ORM)

Write `tools/gen/postprocess_batch38.sh` **modelled on `postprocess_batch37.sh`** (reuse
its `seamless()` wrap-blend + edge-enforce, `normal_from_height` from blurred luminance,
and `orm_from_height` — ORM packed R=AO, G=roughness, B=metalness for the glTF
convention Three.js samples). For weathered wood use roughly: **strength ≈ 2.8** (plank
relief + grain), **roughness ≈ 210** (matte dry weathered wood), **metalness = 0**,
**band ≈ 50**. Output the three maps to **`assets/textures/harbour/`** as
`ENV_Harbour_NoticeBoard_{albedo,normal,orm}.png` (8-bit, quantised small, like the other
harbour surfaces). Self-tile it 2×2 (or the script's offset-preview) to confirm no seam.

Verify with Pillow/ImageMagick and report: all three are **512×512**, the albedo's
**edge-RMS is low** (seamless, comparable to the Batch-37 surface ~1–3), the normal map
is OpenGL-Y+ (B channel dominant, mean ~245–254), the ORM channels match the tuning
above, file sizes, and a one-line note that the surface reads as **weathered grey-brown
harbour board timber, greyer/older than the boardwalk, with no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 38 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
