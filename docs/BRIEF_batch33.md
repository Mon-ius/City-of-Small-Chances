# Batch 33 — spr-002: six more ambient harbour citizens (the crowd grows 24 → 30)

**Milestone:** `spr-002` (ambient citizen variety). The walkable quay now stands **24**
distinct painted citizen billboards; the book's EA target is **40**. This batch adds
**6 more genuinely distinct harbour trades/figures** — the *working occupations* of a
port the roster hasn't drawn yet — pushing the crowd to **30**. After four crowd
batches the danger is *repetition*, so every role here must be unmistakable by
**silhouette** (each carries the tool of a different trade). **You (codex) generate +
post-process + log only. Do NOT touch `src/`. Do NOT run git.**

## Match the existing citizen style EXACTLY

Look first at the existing citizen sprites in `assets/sprites/citizens/` — especially
the Batch-26/28/32 set (`…_{Child,Sailor,Porter,Clerk,Washerwoman,OldWoman,Beggar,Fishwife,Constable,Musician,Merchant,Lady,Fisherman,Nun,Veteran,FlowerGirl,Dockmaster,Sweep}_albedo.png`).
Each is a **single full-body figure, 512×1024 (1:2 portrait), facing the viewer**,
painted in the same grounded slightly-storybook period-harbour style, **standing on a
flat chroma-key field** (flat solid colour background, figure centred, **feet near the
bottom of the frame around row ~975**), so it cuts cleanly to a transparent billboard.
Match that look, scale-in-frame, framing, palette and resolution precisely. Period
working-port wardrobe, muted palette, soft painted shading — **no UI, no text, no
ground shadow baked in** (the engine adds a contact-shadow blob).

## What to make — 6 NEW distinct trades (no repeats of the 24 above)

Each must read instantly as a *different working trade* by **silhouette + the tool it
carries**, and be clearly distinct from every role already made. All original, **no
readable text/letters/numbers/logos** (any prop is abstract).

1. **`CHAR_Harbour_Citizen_Priest`** — *the church's man.* A clergyman in a long
   **black cassock with a white clerical collar**, holding a small **prayer book**.
   The male counterpart to the Batch-32 Nun — a tall sober black silhouette with the
   white collar at the throat. Distinct from the dark-suited Merchant (cassock, not
   frock coat; collar, not top hat).

2. **`CHAR_Harbour_Citizen_Doctor`** — *the physician on his round.* A dark frock coat
   + **bowler hat**, carrying a **black leather Gladstone medical bag**. The bag is the
   tell. Distinct from the Merchant (bowler not top hat, the doctor's bag, no cane).

3. **`CHAR_Harbour_Citizen_Lamplighter`** — *the keeper of the harbour's light.* A
   working man in cap + waistcoat shouldering a **long brass lamp-lighting pole** that
   rises well above his head (the wick-and-flame pole the gas-lamps are lit with). The
   tall pole makes a unique silhouette unlike anyone else on the quay.

4. **`CHAR_Harbour_Citizen_Urchin`** — *the street child.* A small **barefoot ragged
   boy** in an oversized flat cap and patched, too-big clothes, hands in pockets or
   mid-scamper. Distinct from the neatly-dressed Child (this one is ragged, barefoot,
   poorer) and the grown Beggar (a child).

5. **`CHAR_Harbour_Citizen_Innkeeper`** — *the harbour tavern.* A stout publican in a
   **leather/cream apron over rolled shirtsleeves**, holding a **pewter tankard** (or a
   small cask under the arm). Warm, ruddy, welcoming. Distinct from the aproned
   Fishwife/Washerwoman (a man, tankard not basket).

6. **`CHAR_Harbour_Citizen_Ferryman`** — *the man who rows the harbour.* A weathered
   boatman in a **dark guernsey/jersey + knit cap**, an **oar or boat-hook over one
   shoulder**. The long oar is the tell. Distinct from the oilskin Fisherman and the
   peacoat Sailor (jersey + oar, not coat + net/kit-bag).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`CHAR_Harbour_Citizen_Priest` first** and eyeball it before the others. One image per
role, **portrait orientation**, the figure centred on a **flat GREEN `#00ff00`
chroma-key field** (none of these six carry green in their wardrobe/props, so green
keys cleanly for all of them — keep aprons cream/leather, jerseys navy, props brass/
wood/black). Save raws to `tools/gen/source_batch33/` as
`CHAR_Harbour_Citizen_Priest.png` … `CHAR_Harbour_Citizen_Ferryman.png`. Write your
prompts to `tools/gen/prompts/batch33.md`. (If an `image_gen` call returns a server
error, just retry — it succeeds on the second attempt.)

## Post-process — 512×1024 RGBA green-key cutouts

Write `tools/gen/postprocess_batch33.sh` (model it on `postprocess_batch32.sh`):
- chroma-key the flat **green `#00ff00`** background to transparent (reuse the bundled
  `remove_chroma_key.py` / the Batch-32 ImageMagick path),
- de-fringe so there is **0% green AND 0% magenta** halo left,
- resize/pad to exactly **512×1024 RGBA**, figure centred, **feet low in frame
  (~row 975, matching the existing billboards)**, alpha-0 corners,
- quantise to keep each file small,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Priest,Doctor,Lamplighter,Urchin,Innkeeper,Ferryman}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), that corners
are alpha 0, **0% green fringe and 0% magenta fringe**, the feet row, greyscale mean
luma (to confirm the six read apart), and a one-line note on what the figure shows
(and the tool it carries) and that it carries **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 33 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
