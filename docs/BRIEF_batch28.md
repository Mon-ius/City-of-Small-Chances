# Batch 28 — spr-002: the harbour's class spectrum (6 more citizen billboards)

**Milestone:** `spr-002` (ambient citizen sprites). Batches 3 + 26 gave the quay
12 standing billboard variants. This batch adds **6 more**, chosen to span the
book's central theme — *class and small chances* — from the destitute to the
genteel, so the working port reads as a whole society, not one trade. The
orchestrator (Claude Code) will stand them up in gaps along the live quay.
**You (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT
run git.**

## Match the existing citizen style EXACTLY

Look first at the existing billboards: `assets/sprites/citizens/CHAR_Harbour_Citizen_*_albedo.png`
and `CHAR_Harbour_Citizen_Porter_albedo.png` / `_Washerwoman_albedo.png` (Batch 26).
Each is a **512×1024 transparent PNG**, a **single full-body figure**, painted in a
grounded, slightly stylised storybook look (soft painterly shading, gentle rim-light,
muted period-harbour palette — wools, canvas, leather, oilskin), **standing, facing
the viewer**, **feet near the bottom of the frame** (feet around row 970–980 so the
figure stands on the ground when planted), with a generous even side margin. Match
that look, scale, framing and palette precisely so the new six sit seamlessly among
the old twelve. No text anywhere.

Generate each figure **centred on a flat pure-green background (`#00ff00`)** for clean
keying. **If a figure's costume must be green**, use flat pure-magenta (`#ff00ff`)
instead and note which key colour you used per file. Keep costumes clear of the key
colour (no green clothing on a green key, no magenta on a magenta key).

## What to make — 6 citizens spanning the class spectrum

Each must be unmistakable from the others **and** from the existing twelve by
**silhouette + prop + value** (so the crowd reads varied even at a glance / in
greyscale). Span destitute → genteel; balance age and gender:

1. **`CHAR_Harbour_Citizen_Beggar`** — *the destitute.* A gaunt, hunched man in
   ragged, patched earth-brown layers, no shoes or broken ones, **holding out a
   battered cap in one hand**. Low overall value, threadbare silhouette. The bottom
   of the spectrum.

2. **`CHAR_Harbour_Citizen_Fishwife`** — *the labouring poor (woman).* A sturdy
   working woman in a coarse skirt, **apron and headscarf**, **a shallow basket of
   fish carried on one hip**. Distinct from the Batch-26 Washerwoman (laundry basket)
   — this basket holds silver fish, and her stance is broader, a seller's call.

3. **`CHAR_Harbour_Citizen_Constable`** — *civic authority.* An upright man in a
   **dark navy buttoned uniform coat and a tall custodian helmet/hat**, **a truncheon
   at his belt or a small lantern in hand**. Formal vertical silhouette, mid-dark value,
   reads as "the law." Distinct from the Clerk's soft long coat.

4. **`CHAR_Harbour_Citizen_Musician`** — *the in-between hustle.* A lean street busker
   in a worn waistcoat and flat cap, **playing a fiddle (violin tucked under the chin
   and bow)** — or a small squeezebox if clearer. Mid value, an animated playing pose
   distinct from every static figure.

5. **`CHAR_Harbour_Citizen_Merchant`** — *the moneyed (man).* A portly well-dressed
   man in a **fine dark frock coat and top hat**, **a ledger or cane in hand**, a watch
   chain across the waistcoat. Crisp, prosperous silhouette, the top hat unmistakable.
   The top of the spectrum.

6. **`CHAR_Harbour_Citizen_Lady`** — *the genteel (woman).* A poised woman in a fine
   full-skirted day dress and bonnet, **carrying a parasol** (closed, held like a cane,
   or open over the shoulder), gloved. Pale, elegant, high-value palette (cream / rose
   / lavender — **not green, not magenta**). The female counterpart to the Merchant.

The six must be tellable apart by **silhouette + prop** alone: cap-in-hand stoop /
fish basket on hip / tall helmet + truncheon / fiddle-playing pose / top hat + ledger
/ parasol + full skirt. Span dark (Beggar) → bright (Lady) in value.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. One image per figure, portrait
canvas (figure tall in frame, feet low), figure centred on the flat key colour. Save
raw to `tools/gen/source_batch28/` as `CHAR_Harbour_Citizen_Beggar.png` …
`CHAR_Harbour_Citizen_Lady.png`. Write your prompts + the key colour used per file to
`tools/gen/prompts/batch28.md`. (If the first `image_gen` call returns a server error,
just retry — it succeeds on the second attempt.)

## Post-process — keyed transparent billboards at 512×1024

Write `tools/gen/postprocess_batch28.sh` (model it on `postprocess_batch26.sh`):
- key out the background with `$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py`
  (green `#00ff00`, or magenta `#ff00ff` for any figure you keyed on magenta), despill
  any residual fringe of the key colour,
- trim to the figure, then pad to a **centred 512×1024 canvas with the feet low in
  frame** (feet around row 970–980, matching the existing billboards so they plant on
  the ground), 8-bit RGBA, quantise to keep the file small,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Beggar,Fishwife,Constable,Musician,Merchant,Lady}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), fully
transparent corners (alpha 0), **zero green AND zero magenta fringe**, the feet row
(lowest opaque row, should be ~970–980), and a quick greyscale note (the six should
still be tellable apart with hue removed, and distinct from the Batch-3/26 roster).

## Log (no git, no `src/`)

Append **one** Batch 28 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
