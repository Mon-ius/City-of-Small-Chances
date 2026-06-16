# Batch 35 — spr-002: the last four citizens (the crowd reaches 40 → milestone COMPLETE)

**Milestone:** `spr-002` (ambient citizen variety). The walkable quay stands at **36**
distinct painted citizen billboards; the book's EA target is **40**. This batch adds the
**final 4 figures** to land the roster on **exactly 40** and **close spr-002**. After
six crowd batches the danger is *repetition*, so each of these last four must be
unmistakable by **silhouette + tool/role**, and clearly different from all 36 already
made. **You (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT run
git.**

## Match the existing citizen style EXACTLY

Look first at the existing citizen sprites in `assets/sprites/citizens/` (the Batch
26/28/32/33/34 set). Each is a **single full-body figure, 512×1024 (1:2 portrait),
facing the viewer**, painted in the same grounded slightly-storybook period-harbour
style, **standing on a flat chroma-key field** (flat solid colour background, figure
centred, **feet near the bottom of the frame around row ~975**), so it cuts cleanly to a
transparent billboard. Match that look, scale-in-frame, framing, palette and resolution
precisely. Period working-port wardrobe, muted palette, soft painted shading — **no UI,
no text, no ground shadow baked in** (the engine adds a contact-shadow blob).

## What to make — the FINAL 4 distinct figures (no repeats of the 36 above)

The 36 already made: Commuter, DockWorker, Elder, Fisher, MarketVendor, Youth, Child,
Sailor, Porter, Clerk, Washerwoman, OldWoman, Beggar, Fishwife, Constable, Musician,
Merchant, Lady, Fisherman, Nun, Veteran, FlowerGirl, Dockmaster, Sweep, Priest, Doctor,
Lamplighter, Urchin, Innkeeper, Ferryman, Blacksmith, Baker, Tinker, Mother, Soldier,
Coalman. Do **not** repeat any of these. All original, **no readable text/letters/
numbers/logos** (any prop is abstract).

1. **`CHAR_Harbour_Citizen_Schoolmistress`** — *the teacher.* A prim woman in a sober
   dark high-collared dress + bonnet, holding a **small writing slate** (and perhaps a
   cane/pointer or a couple of books). Upright, severe-kind. Distinct from the Clerk
   (a woman with a slate, bonnet — not a man with loose papers) and the Lady (working,
   plain, not genteel + parasol).

2. **`CHAR_Harbour_Citizen_Knifegrinder`** — *the itinerant mender.* A travelling
   knife-grinder standing at his **treadle grinding-wheel barrow** — a wheeled wooden
   cart carrying a big round sharpening stone he works with a foot-treadle. The
   wheel-and-cart machine makes a silhouette unlike anyone else on the quay (distinct
   from the back-pack Tinker — this one has the wheeled grinding rig).

3. **`CHAR_Harbour_Citizen_TownCrier`** — *the harbour's voice.* A crier in a
   **tricorn hat + long coat**, one arm raised swinging a large **handbell**, a rolled
   scroll in the other hand, mid-call. Theatrical, archaic. Distinct from everyone by
   the tricorn + bell.

4. **`CHAR_Harbour_Citizen_Widow`** — *the sea's cost.* A woman in **full mourning
   black — long black dress + black veil/bonnet** — holding a **small posy of flowers**
   (to cast for someone lost to the water). Grave, dignified, poignant. Distinct from
   the Nun (black *veil* and mourning, not a white wimple) and the Lady (mourning black,
   no parasol) — the human counterpart to Batch-34's Mother.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`CHAR_Harbour_Citizen_Schoolmistress` first** and eyeball it before the others. One
image per role, **portrait orientation**, the figure centred on a **flat chroma-key
field**.

**Chroma-key colour per figure** (pick the key that does NOT clash with the figure's
own colours):
- **GREEN `#00ff00`** for: `Schoolmistress`, `Knifegrinder`, `TownCrier`.
- **MAGENTA `#ff00ff`** for: `Widow` (her posy of flowers carries green leaves/stems —
  a green key would eat them).

Save raws to `tools/gen/source_batch35/` as `CHAR_Harbour_Citizen_Schoolmistress.png` …
`CHAR_Harbour_Citizen_Widow.png`. Write your prompts + the key colour used per figure to
`tools/gen/prompts/batch35.md`. (If an `image_gen` call returns a server error, just
retry — it succeeds on the second attempt.)

## Post-process — 512×1024 RGBA chroma-key cutouts

Write `tools/gen/postprocess_batch35.sh` (model it on `postprocess_batch34.sh`):
- chroma-key the flat background to transparent using the **per-figure key colour
  above** (reuse the bundled `remove_chroma_key.py` / the Batch-34 ImageMagick path),
- de-fringe so there is **0% green AND 0% magenta** halo left,
- resize/pad to exactly **512×1024 RGBA**, figure centred, **feet low in frame
  (~row 975, matching the existing billboards)**, alpha-0 corners,
- quantise to keep each file small,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Schoolmistress,Knifegrinder,TownCrier,Widow}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), that corners
are alpha 0, **0% green fringe and 0% magenta fringe**, the feet row, greyscale mean
luma (to confirm the four read apart), and a one-line note on what the figure shows
(and the tool it carries) and that it carries **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 35 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
