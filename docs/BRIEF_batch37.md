# Batch 37 — the harbour's last bare surface: the quay wall (ENV_Harbour_QuayWall, WIRED LIVE)

**Milestone:** harbour surface-material coverage (the `mat-###` / world-bible material
scope). The walkable Old Harbour is richly painted — cobbles, plank boardwalk, water,
plaster building bodies, clay roofs, the boat's timber + sailcloth — **except one major
surface**: the **quay wall**, the long stone sea-wall that runs the whole length of the
quay between the boardwalk and the water (the player walks right alongside it the entire
game). It is still a **flat olive-grey box** (`COLORS.quay = 0x4a4640`) against all that
painted stone. This batch paints it. One **seamless tileable PBR surface** in the exact
Batch-1/5/10 harbour-surface style. **You (codex) generate + post-process + log only. Do
NOT touch `src/`. Do NOT run git.** (The orchestrator wires it into `world.js`.)

## Match the existing harbour-surface style EXACTLY

Look first at the existing surfaces in `assets/textures/harbour/` —
`ENV_Harbour_Cobblestone_albedo.png`, `ENV_Harbour_PlankWood_albedo.png`,
`ENV_Harbour_Plaster_albedo.png`, `ENV_Harbour_Roof_albedo.png`. Each is a **512×512
seamless, tileable, top-/front-lit painterly material** in a muted period-harbour
palette (wet stone, weathered timber, grey-green damp), even lighting, **no baked
shadows, no single hero feature** (it must tile). Match that resolution, palette, scale
and even-lit flatness precisely so the quay wall sits beside the cobbles as one world.

## What to make — ONE seamless surface

**`ENV_Harbour_QuayWall`** — *the harbour sea-wall.* Large **rough-cut grey granite /
weathered limestone blocks** laid in courses, with recessed mortar joints, the stone
**damp and salt-stained** — darker and greener-black low down (the tide line), pale
salt/lichen bloom and a few rust runs from old iron fixings higher up. Hand-laid harbour
masonry: blocks of varied size, chipped edges, weather-worn faces. **Seamless and
tileable** (no block straddles the edge unevenly; courses continue across the wrap),
even-lit, **no baked directional shadow**, **no readable text/numbers/marks**. Muted,
wet, grounded — it should read instantly as an old working harbour wall.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. Generate a **square** top-/
front-lit tileable stone-wall texture (ask for a seamless, repeating masonry texture,
flat even light, no perspective, no single focal point). Eyeball it for tileability and
block scale before finishing. Save the raw to `tools/gen/source_batch37/` as
`ENV_Harbour_QuayWall_albedo.png`. Write your prompt to `tools/gen/prompts/batch37.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on the second
attempt.)

## Post-process — a seamless 512² PBR set (albedo + normal + ORM)

Write `tools/gen/postprocess_batch37.sh` **modelled on `postprocess_batch10.sh`** (reuse
its `seamless()` wrap-blend + edge-enforce, `normal_from_height` from blurred luminance,
and `orm_from_height` — ORM packed R=AO, G=roughness, B=metalness for the glTF
convention Three.js samples). For this stone wall use roughly: **strength ≈ 3.2**
(crisp mortar relief), **roughness ≈ 205** (matte wet stone), **metalness = 0**, **band
≈ 50**. Output the three maps to **`assets/textures/harbour/`** as
`ENV_Harbour_QuayWall_{albedo,normal,orm}.png` (8-bit, quantised small, like the other
harbour surfaces). Self-tile it 2×2 (or the script's offset-preview) to confirm no seam.

Verify with Pillow/ImageMagick and report: all three are **512×512**, the albedo's
**edge-RMS is low** (seamless, comparable to the Batch-10 surfaces ~1–3), the normal map
is OpenGL-Y+ (B channel dominant, mean ~245–254), the ORM channels match the tuning
above, file sizes, and a one-line note that the surface reads as a damp salt-stained
harbour stone wall with **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 37 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
