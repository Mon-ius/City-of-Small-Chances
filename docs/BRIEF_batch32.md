# Batch 32 — spr-002: six more ambient harbour citizens (the crowd grows 18 → 24)

**Milestone:** `spr-002` (ambient citizen variety). The walkable quay already stands
**18** distinct painted citizen billboards. The book's EA target is **40 named/ambient
citizens**, so the crowd is still partial — and after three crowd batches (26/28 and
the original set) the danger is *repetition*, not numbers. This batch adds **6 more
genuinely distinct harbour roles** chosen to fill gaps the existing roster doesn't
cover, pushing the crowd to **24**. **You (codex) generate + post-process + log only.
Do NOT touch `src/`. Do NOT run git.**

## Match the existing citizen style EXACTLY

Look first at the existing citizen sprites in `assets/sprites/citizens/` — especially
the Batch-26/28 set `CHAR_Harbour_Citizen_{Child,Sailor,Porter,Clerk,Washerwoman,OldWoman,Beggar,Fishwife,Constable,Musician,Merchant,Lady}_albedo.png`.
Each is a **single full-body figure, 512×1024 (1:2 portrait), facing the viewer**,
painted in the same grounded slightly-storybook period-harbour style, **standing on a
flat chroma-key field** (flat solid colour background, figure centred, **feet near the
bottom of the frame around row ~975**), so it cuts cleanly to a transparent billboard.
Match that look, scale-in-frame, framing, palette and resolution precisely. Period
working-port wardrobe, muted palette, soft painted shading — **no UI, no text, no
ground shadow baked in** (the engine adds a contact-shadow blob).

## What to make — 6 NEW distinct roles (no repeats of the 12 above)

Each must read instantly as a *different* rung of harbour society by **silhouette +
value**, and must be clearly distinct from every role already made. All original, **no
readable text/letters/numbers/logos** (any prop is abstract).

1. **`CHAR_Harbour_Citizen_Fisherman`** — *the working sea.* Heavy ochre/yellow
   **oilskin coat + sou'wester hat**, rubber boots, a wicker **creel/net** over one
   shoulder. Weathered, salt-stained. Must read distinct from the navy-peacoat
   **Sailor** (this one is the bright-oilskin inshore fisherman, not the deep-sea hand).

2. **`CHAR_Harbour_Citizen_Nun`** — *the charity of the port.* A **black habit with a
   white wimple/coif** framing the face, hands folded or holding a small rosary. A
   unique very-dark silhouette with a bright white face-frame — distinct from every
   other figure.

3. **`CHAR_Harbour_Citizen_Veteran`** — *the cost, the small chance.* A war-worn
   ex-soldier in a **faded greatcoat + forage cap**, leaning on a **crutch**, one empty
   sleeve pinned or a wooden leg. Dignified, not pitiful. The "city of small chances"
   heart made human — distinct from the smart navy **Constable**.

4. **`CHAR_Harbour_Citizen_FlowerGirl`** — *youth selling on the street.* A young woman
   in a **shawl + long skirt** carrying a wide flat **basket of cut flowers** at her
   hip or front. Mid-tone, working-poor but bright — distinct from the genteel
   parasol-**Lady** and the **Child**.

5. **`CHAR_Harbour_Citizen_Dockmaster`** — *the authority of the port.* A
   harbour-official in a **dark navy brass-buttoned greatcoat + peaked cap**, holding a
   **ledger/clipboard and a small brass spyglass**. The port's officialdom — distinct
   from the top-hat **Merchant** and the helmeted **Constable** (this is the working
   harbour authority, peaked cap not helmet).

6. **`CHAR_Harbour_Citizen_Sweep`** — *the humblest labour.* A soot-blackened
   **chimney-sweep**, ragged dark clothes + flat cap, **bundle of brushes/rods over
   one shoulder**. A distinctly dark, lanky silhouette — distinct from the ragged
   **Beggar** (the sweep carries his trade, stands upright with his rods).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`CHAR_Harbour_Citizen_Fisherman` first** and eyeball it before the others. One image
per role, **portrait orientation**, the figure centred on a **flat chroma-key field**.

**Chroma-key colour per figure** (pick the key that does NOT clash with the figure's
own colours, exactly as Batch 28 keyed Tomo on magenta):
- **GREEN `#00ff00`** for: `Fisherman`, `Nun`, `Veteran`, `Dockmaster`, `Sweep`.
- **MAGENTA `#ff00ff`** for: `FlowerGirl` (her basket of flowers carries green
  leaves/stems — a green key would eat them).

Save raws to `tools/gen/source_batch32/` as `CHAR_Harbour_Citizen_Fisherman.png` …
`CHAR_Harbour_Citizen_Sweep.png`. Write your prompts + the key colour used per figure
to `tools/gen/prompts/batch32.md`. (If an `image_gen` call returns a server error,
just retry — it succeeds on the second attempt.)

## Post-process — 512×1024 RGBA chroma-key cutouts

Write `tools/gen/postprocess_batch32.sh` (model it on `postprocess_batch28.sh`):
- chroma-key the flat background to transparent using the **per-figure key colour
  above** (reuse the bundled `remove_chroma_key.py` / the Batch-28 ImageMagick path),
- de-fringe so there is **0% green AND 0% magenta** halo left,
- resize/pad to exactly **512×1024 RGBA**, figure centred, **feet low in frame
  (~row 975, matching the existing billboards)**, alpha-0 corners,
- quantise to keep each file small,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Fisherman,Nun,Veteran,FlowerGirl,Dockmaster,Sweep}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), that corners
are alpha 0, **0% green fringe and 0% magenta fringe**, the feet row, greyscale mean
luma (to confirm the six span a value range and read apart), and a one-line note on
what the figure shows and that it carries **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 32 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
