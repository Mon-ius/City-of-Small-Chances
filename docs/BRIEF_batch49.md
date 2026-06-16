# Batch 49 — smoke from the chimneys: warmth over the rooftops (PROP_Smoke_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *light the fires.* Batch 47 hung washing
on the façades to say *people live here*; the buildings glow with lit windows after dark. But the
**sky above the rooftops is the emptiest zone in the frame** — just clouds and a few high gulls —
and nothing rises from the chimneys. A working port at dusk has **smoke curling up from every
roof**: the single touch that makes the buildings read as warm and inhabited rather than empty
shells. This batch adds **three soft smoke-plume sprites** that the orchestrator stands as
billboards over the roofs. **Smoke is semi-transparent, so this is NOT a chroma-key job** — you
generate the smoke on solid **black** and convert **luminance → alpha** (the standard additive
smoke-sprite technique), which gives true soft translucent edges. **You (codex) generate +
post-process + log only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into
`world.js`.)

## What smoke must look like

Soft, wispy, **translucent** grey-white woodsmoke rising from the bottom-centre of the frame,
**widening and dissipating** as it climbs, leaning gently to one side as if in a light harbour
breeze. No hard edges, no solid blob — it must read as *vapour*. Muted and pale (cookfire /
hearth smoke), not black industrial soot. Tall **portrait** framing (smoke rises). Paint **only
the smoke** — no chimney, no roof, no building, no stars, no scene.

## Background — SOLID PURE BLACK `#000000` (this is luminance-keyed, not chroma-keyed)

Generate each plume as pale smoke on a **solid pure-black `#000000`** background, flat and even,
no gradient, no stars, no glow — like an additive smoke sprite. The black becomes transparent and
the smoke's own brightness becomes its opacity, so soft thin wisps stay soft. State in
`tools/gen/prompts/batch49.md` that the background is black and the alpha is built from luminance.

## What to make — THREE plumes (a wisp, a plume, a column)

1. **`PROP_Smoke_Wisp`** — *a thin faint wisp.* A slight, barely-there curl of pale smoke, mostly
   transparent — a fire just catching. Narrow, tall.
2. **`PROP_Smoke_Plume`** — *a steady plume.* A medium plume rising and spreading into a soft
   feathered top — a hearth well alight. Medium width, tall.
3. **`PROP_Smoke_Column`** — *a fuller column.* A denser, fuller column of smoke climbing and
   billowing — a busy kitchen chimney — still soft-edged and translucent at the margins, never a
   hard silhouette. Wider, tall.

Each reads as rising smoke by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single soft smoke
plume rising from the bottom centre on the solid black background (flat even, no scene). Save the
raws to `tools/gen/source_batch49/`. Write your prompts to `tools/gen/prompts/batch49.md`. (If an
`image_gen` call returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — luminance → alpha (NOT the chroma-key remover)

Write `tools/gen/postprocess_batch49.sh` that runs a **Python/Pillow** step on each raw (do NOT use
`remove_chroma_key.py` — smoke is translucent, a hard key would destroy the wisps). For each:

1. Compute per-pixel **luminance** `L = 0.299*R + 0.587*G + 0.114*B` from the smoke-on-black raw.
2. Set the output **alpha = L** (optionally a gentle curve to taste, but keep it soft/graduated —
   do not threshold it to a hard mask). Zero out only true background: `alpha < 8 → 0` so the
   corners are fully transparent.
3. Set the output **RGB to a single uniform warm smoke-grey** for every pixel (e.g. ~`(216,212,205)`)
   so there is **no black halo** at the soft edges (the alpha carries the shape, the colour is flat).
4. Crop to the alpha bounding box with a little transparent padding, downscale to **longest side
   512** (keep aspect, all tall portrait), output **8-bit RGBA, quantised small** to
   **`assets/sprites/props/`** as `PROP_Smoke_Wisp.png`, `PROP_Smoke_Plume.png`,
   `PROP_Smoke_Column.png`.

Verify with Pillow and report for each: it is **RGBA**; **corners fully transparent** (alpha 0);
the **alpha is graduated/soft** (report min/median/max alpha and that it spans a wide range, not a
binary 0/255 mask); the **RGB is uniform** (report the RGB std-dev is near zero → no black halo);
the pixel dimensions (longest side 512, tall); file size; and a one-line note that it reads as a
soft translucent rising plume with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 49 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
