# Batch 26 — spr-002: more ambient-crowd citizen variety

**Milestone:** `spr-002` (Citizen crowd billboard variants). The walkable harbour's
ambient crowd currently uses **6** painted billboard figures (Commuter, DockWorker,
Elder, Fisher, MarketVendor, Youth — `assets/sprites/citizens/CHAR_Harbour_Citizen_*_albedo.png`).
The EA target is ~40 minor NPCs; this batch adds **6 new role/age/class variants** so
the quay reads as a fuller working port. The orchestrator (Claude Code) will wire them
into the standing crowd + patrol — **you (codex) generate + post-process + log only.
Do NOT touch `src/`. Do NOT run git.**

## What to make — 6 new full-body citizen cutouts

Match the **existing citizen art style exactly** (look at the 6 existing
`CHAR_Harbour_Citizen_*_albedo.png` first): a single standing **full-body figure**,
front-facing, painted in the same warm dusk-harbour stylised-realism shading, on a
**flat chroma background** for clean keying — **use green `#00ff00`** unless the
figure's clothing is predominantly green/teal, in which case key on **magenta
`#ff00ff`** (one or two of these will need magenta; pick per figure so nothing in the
keep-region matches the key colour). Whole body visible head-to-feet, feet near the
bottom of the frame, generous margin, soft contact shadow optional (it will be trimmed).

The six must be **visibly distinct in silhouette, age and class** from the existing six
and from each other — this is a working port, so span the social range:

1. **`CHAR_Harbour_Citizen_Child`** — a small **child** (clearly shorter proportions,
   simple bright play-clothes, maybe carrying a little toy or bundle). Reads as a kid.
2. **`CHAR_Harbour_Citizen_Sailor`** — a **sailor / deckhand** off a boat: peacoat or
   striped jersey, a cap, a kit-bag over one shoulder. Sea-worn.
3. **`CHAR_Harbour_Citizen_Porter`** — a heavyset **dock porter / longshoreman** with a
   hessian **sack hoisted on one shoulder**, sleeves rolled, broad stance. Hard graft.
4. **`CHAR_Harbour_Citizen_Clerk`** — a smartly-dressed **office clerk / uptown
   commuter**: long coat, a satchel or papers under the arm. The white-collar end.
5. **`CHAR_Harbour_Citizen_Washerwoman`** — a working **woman with a laundry basket /
   cloth bundle** on her hip, apron, headscarf. Domestic labour of the port.
6. **`CHAR_Harbour_Citizen_OldWoman`** — an **elderly woman** in a shawl with a **cane**,
   stooped, slow — distinct from the existing `Elder`. The long memory of the place.

Keep the palette grounded and harbour-appropriate (no neon, no fantasy), each figure
clearly one person standing.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. One image per figure, portrait
canvas. Save raw generations to `tools/gen/source_batch26/` as
`CHAR_Harbour_Citizen_Child.png` … `CHAR_Harbour_Citizen_OldWoman.png`. Write the exact
prompts (and which key colour you chose for each) to `tools/gen/prompts/batch26.md`.
(If the first `image_gen` call returns a server error, just retry — it succeeds on the
second attempt.)

## Post-process — chroma-key cutouts (follow Batch 22's pipeline)

Write `tools/gen/postprocess_batch26.sh` modelled on `tools/gen/postprocess_batch22.sh`
(the citizen-sprite chroma-key pipeline):
- key out the chosen colour with `$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py`
  (green `#00ff00` **or** magenta `#ff00ff` per figure),
- despill any residual fringe, trim to the figure, pad a little transparent margin,
- resize so the canvas is **512×1024** (portrait, feet low in frame), 8-bit RGBA, quantise,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Child,Sailor,Porter,Clerk,Washerwoman,OldWoman}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), fully
transparent corners (alpha 0), zero green **and** zero magenta fringe, and the feet row.

## Log (no git, no `src/`)

Append **one** Batch 26 progress line to `docs/ART_PLAN.md` describing what you generated
and the verification result. Do **not** change any checkbox, do **not** edit anything
else, do **not** run git, do **not** touch `src/`.
