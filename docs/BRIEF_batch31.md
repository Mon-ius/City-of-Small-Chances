# Batch 31 — fx-008: the trailer's cinematic frames (4 painted key-art beats)

**Milestone:** `fx-008` (gameplay-trailer cinematic camera-pass / cut-sequence FX
assets, for the Steam / EA-demo release). This is the **last whole unbuilt
image-gen entry** in the asset manifest — closing it means every whole image-gen
milestone the book implies is generated. We can't generate video, so the
image-gen-shaped deliverable is a set of **painted cinematic key-frames** a trailer
would cut between / slowly pan across — the "money shots" of the Old Harbour. These
are **ship-ready** (no trailer/Steam system is built yet). **You (codex) generate +
post-process + log only. Do NOT touch `src/`. Do NOT run git.**

## Match the existing key-art style EXACTLY

Look first at the existing painted scenes — `assets/ui/keyart/KEYART_Act_Dawn.png`,
`KEYART_Act_Dusk.png`, `KEYART_Act_Storm.png`, `KEYART_Ending_Settled.png`, and the
Batch-29 `assets/ui/shifts/SHIFT_*.png`. Each is a **640×360 (16:9) opaque painted
illustration** of the *same* Old Harbour world — grounded, slightly storybook
painterly, muted period-harbour palette (wet stone, weathered timber, canvas,
lamplight, grey-green water), soft depth and atmosphere, **no UI, no text**. Match
that look, framing, resolution and palette precisely so these read as the same world
seen in its best light. **Full-frame opaque scenes** (no transparency, no chroma key).

## What to make — 4 trailer beats (the same harbour, four cinematic moments)

The set should feel like a trailer's arc: *establish the world → meet the person →
the daily grind → the title beat.* All original, **absolutely no readable text,
letters, numbers, logos or brands** (any signage/paper is abstract greeked marks).

1. **`TRAILER_Establish`** — *the world you step into.* A sweeping wide establishing
   shot of the whole Old Harbour at the golden hour — the quay, moored boats, the
   lighthouse/lamps, lit windows beginning to glow, grey-green water catching the
   warm light. The big beautiful "here is the place" frame. No people foregrounded.

2. **`TRAILER_Hero`** — *one person, a whole city.* An intimate over-the-shoulder /
   back view of the lone protagonist standing on the quay at dusk, small against the
   harbour, lamplight ahead — contemplative, the "city of small chances" mood (a
   single life inside a working port). Reads as quiet, human, hopeful-but-grounded.

3. **`TRAILER_Work`** — *the daily life.* A warm busy moment of harbour life — the
   market stall steaming, figures at labour on the quay, the working day in motion —
   conveying the game's economy/daily-grind heart. Energetic but never frantic.

4. **`TRAILER_Title`** — *the title beat.* A composed, iconic frame of the harbour
   (e.g. the lighthouse and quay at dusk) with deliberate **negative space** in the
   upper third or lower third — calm sky or water — where a logo/title would later
   sit. Leave that area clean and uncluttered. **Still no text** (do not paint a
   title — just leave the room for one).

The four should read instantly as a trailer's flow: a grand establishing vista, an
intimate character beat, the lively working day, and a clean iconic title frame.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`TRAILER_Establish` first** and eyeball it before the others. One image per beat,
**16:9 landscape**. Save raws to `tools/gen/source_batch31/` as
`TRAILER_Establish.png` … `TRAILER_Title.png`. Write your prompts to
`tools/gen/prompts/batch31.md`. (If the first `image_gen` call returns a server
error, just retry — it succeeds on the second attempt.)

## Post-process — opaque 640×360 scenes

Write `tools/gen/postprocess_batch31.sh` (model it on `postprocess_batch29.sh`):
- resize/crop to exactly **640×360** (16:9), centre-crop if the gen aspect differs,
- 8-bit RGB (opaque — NOT keyed), quantise to keep each file small (aim < ~160 KB),
- output to **`assets/ui/trailer/`** (create it) as
  `TRAILER_{Establish,Hero,Work,Title}.png`.

Verify with Pillow and report per file: dimensions (must be 640×360), that it is
opaque, file size, and a one-line note on what the frame shows and that it carries
**no legible text** (and that `TRAILER_Title` keeps clean negative space for a logo).

## Log (no git, no `src/`)

Append **one** Batch 31 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
