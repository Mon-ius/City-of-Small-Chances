# Batch 34 — spr-002: six more ambient harbour citizens (the crowd grows 30 → 36)

**Milestone:** `spr-002` (ambient citizen variety). The walkable quay now stands **30**
distinct painted citizen billboards; the book's EA target is **40**. This batch adds
**6 more genuinely distinct figures** — more working trades plus the family life of a
port — pushing the crowd to **36** (leaving a final ~4 for one more batch). After five
crowd batches the danger is *repetition*, so every figure here must be unmistakable by
**silhouette + the tool/burden it carries**, and clearly different from all 30 already
made. **You (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT
run git.**

## Match the existing citizen style EXACTLY

Look first at the existing citizen sprites in `assets/sprites/citizens/` (the Batch
26/28/32/33 set). Each is a **single full-body figure, 512×1024 (1:2 portrait), facing
the viewer**, painted in the same grounded slightly-storybook period-harbour style,
**standing on a flat chroma-key field** (flat solid colour background, figure centred,
**feet near the bottom of the frame around row ~975**), so it cuts cleanly to a
transparent billboard. Match that look, scale-in-frame, framing, palette and resolution
precisely. Period working-port wardrobe, muted palette, soft painted shading — **no UI,
no text, no ground shadow baked in** (the engine adds a contact-shadow blob).

## What to make — 6 NEW distinct figures (no repeats of the 30 above)

The 30 already made: Commuter, DockWorker, Elder, Fisher, MarketVendor, Youth, Child,
Sailor, Porter, Clerk, Washerwoman, OldWoman, Beggar, Fishwife, Constable, Musician,
Merchant, Lady, Fisherman, Nun, Veteran, FlowerGirl, Dockmaster, Sweep, Priest, Doctor,
Lamplighter, Urchin, Innkeeper, Ferryman. Do **not** repeat any of these. Each new one
must read instantly as different by **silhouette + tool/burden**. All original, **no
readable text/letters/numbers/logos** (any prop is abstract).

1. **`CHAR_Harbour_Citizen_Blacksmith`** — *the forge.* A broad, muscular smith in a
   scorched **leather apron over a rolled-sleeve shirt**, sooty forearms, holding a
   heavy **blacksmith's hammer** (and/or tongs). Powerful upright stance. Distinct from
   the Innkeeper (hammer + soot, not tankard) and the Porter (a tradesman at his anvil,
   not a sack-hauler).

2. **`CHAR_Harbour_Citizen_Baker`** — *bread for the port.* A baker in a **white apron
   + white baker's cap**, flour-dusted, carrying a **wide shallow basket/tray of bread
   loaves**. Warm and pale. Distinct from the Innkeeper (white not leather, bread tray
   not tankard) and the market sellers (loaves, a baker's whites).

3. **`CHAR_Harbour_Citizen_Tinker`** — *the itinerant mender.* A weathered travelling
   tinker in a battered wide hat, a **wood-framed pack on his back hung with pots, pans
   and kettles** that clatter. The laden pack-frame makes a unique cluttered
   silhouette unlike anyone else on the quay.

4. **`CHAR_Harbour_Citizen_Mother`** — *family in the port.* A young harbour mother in a
   plain shawl + long skirt, **cradling a swaddled infant** in her arms (or a small
   toddler on her hip). Tender, distinct from the other women by the child she carries.

5. **`CHAR_Harbour_Citizen_Soldier`** — *the garrison.* A serving soldier standing to
   attention in a **red dress tunic + tall shako/forage cap**, a rifle at his side or
   shouldered. Upright and smart. Distinct from the wounded Veteran (whole, serving,
   red dress uniform) and the navy Constable (army not police).

6. **`CHAR_Harbour_Citizen_Coalman`** — *the heaviest delivery.* A coal-heaver bent
   under a **black sack of coal on his back**, wearing the characteristic **leather
   fantail/back-flap hat** that protects his neck, coal-blackened. Distinct from the
   Porter (back-carry + fantail hat + coal-black, vs shoulder hessian sack) and the
   Sweep (a coal sack + fantail hat, not brushes/rods).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`CHAR_Harbour_Citizen_Blacksmith` first** and eyeball it before the others. One image
per role, **portrait orientation**, the figure centred on a **flat GREEN `#00ff00`
chroma-key field** (none of these six carry green — keep aprons white/leather, the
soldier's tunic red, pots brass/tin, sacks black, so green keys cleanly for all six).
Save raws to `tools/gen/source_batch34/` as `CHAR_Harbour_Citizen_Blacksmith.png` …
`CHAR_Harbour_Citizen_Coalman.png`. Write your prompts to `tools/gen/prompts/batch34.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on the second
attempt.)

## Post-process — 512×1024 RGBA green-key cutouts

Write `tools/gen/postprocess_batch34.sh` (model it on `postprocess_batch33.sh`):
- chroma-key the flat **green `#00ff00`** background to transparent (reuse the bundled
  `remove_chroma_key.py` / the Batch-33 ImageMagick path),
- de-fringe so there is **0% green AND 0% magenta** halo left,
- resize/pad to exactly **512×1024 RGBA**, figure centred, **feet low in frame
  (~row 975, matching the existing billboards)**, alpha-0 corners,
- quantise to keep each file small,
- output to **`assets/sprites/citizens/`** as
  `CHAR_Harbour_Citizen_{Blacksmith,Baker,Tinker,Mother,Soldier,Coalman}_albedo.png`.

Verify with Pillow and report per file: dimensions (must be 512×1024), that corners
are alpha 0, **0% green fringe and 0% magenta fringe**, the feet row, greyscale mean
luma (to confirm the six read apart), and a one-line note on what the figure shows
(and the tool/burden it carries) and that it carries **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 34 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
