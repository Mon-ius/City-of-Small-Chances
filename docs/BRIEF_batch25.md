# Batch 25 — fx-003: bespoke posted notice-board notes

**Milestone:** `fx-003` (Signage & decals — *posted notice-board notes*; world-bible-haiyun).
**Status before:** the live notice board carries ONE generic painted cluster
(`DECAL_BoardNotes.png`, Batch 6). The board you read jobs off should look like a
real working harbour notice board: a scatter of **individual, distinct paper
notices** pinned at varied angles. This batch generates those individual notes.
The orchestrator (Claude Code) will wire them live over the existing cluster —
**you (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT run git.**

## What to make — 6 individual paper-notice cutouts

Each is **one sheet of paper** (with a pin/tack at the top), painted in a slightly
weathered harbour-noticeboard style, on a **flat pure-green chroma background
(#00ff00)** for clean keying. Soft drop shadow under the paper so it reads as a
physical pinned sheet. Gentle paper curl at a corner is welcome. Each note reads
its *kind* by **layout + motif + paper tone**, never by words.

> **HARD CONSTRAINT (held since Batch 12/16): NO READABLE TEXT.** All "writing" is
> abstract greeked glyph-rows / ruled lines only. Crests, stamps and icons are
> simple silhouettes. Nothing legible as a real word or number anywhere.

1. **`NOTE_JobPosting`** — a dock/harbour *work-wanted* ad. Portrait. Manila/off-white
   paper. A bold dark **heading band** across the top, 4–6 greeked body lines below,
   a small abstract **anchor or crate** icon, and a row of **tear-off fringe tabs**
   along the bottom edge (a couple already torn away). The busy, official job ad.

2. **`NOTE_RoomToLet`** — a small **hand-lettered room-to-let card**. Near-square,
   smaller, **hand-torn** uneven edges, slightly yellowed. A tiny **house/door**
   glyph, 2–3 greeked lines, a little greeked **price box** ruled off in a corner.
   Casual, domestic.

3. **`NOTE_HarbourBylaw`** — an **official harbour-authority regulation notice**.
   Portrait. Cool **blue-tinted** official paper with a **ruled formal border**. A
   small **crest/emblem** centred at the top, several evenly-ruled greeked lines,
   and a circular **stamp mark** (ink-pressed, slightly off-centre) near the bottom.
   The institutional/civic voice — crisp, authoritative.

4. **`NOTE_EventFlyer`** — a **community/festival flyer**. Portrait. Warm cream
   paper, **brighter warm ink**, one curled corner. A bold central motif — a
   **paper lantern or a little boat** — over 3–4 greeked lines. Cheerful, hand-made.

5. **`NOTE_FoundLost`** — a **hand-written found/lost note**. Near-square, plain
   white, slightly crooked as if pinned in a hurry, a single visible **pin hole**.
   An uneven hand-drawn **sketch of an object** (a key, or a simple cat silhouette)
   and 2 greeked lines. Personal, urgent, imperfect.

6. **`NOTE_FerrySchedule`** — a printed **ferry/transport timetable card**. Portrait.
   Pale blue-grey card stock. A small **ferry/boat** glyph at the top, then a tidy
   **grid of greeked time rows** (columns of short ruled marks — clearly a table,
   no real digits). Printed, orderly.

All six share: the same green chroma field, a brass **tack/pin** at the top, a soft
contact shadow, and a coherent weathered-harbour palette so they read as one board's
worth of notices. Vary the aspect ratios a little (some portrait, some near-square)
so the wired board looks natural.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. One image per note, square
canvas is fine (the keying trims to the paper). Save the raw generations to
`tools/gen/source_batch25/` as `NOTE_JobPosting.png` … `NOTE_FerrySchedule.png`.
Write the exact prompts you used to `tools/gen/prompts/batch25.md`.
(If the first `image_gen` call returns a server error, just retry — it succeeds on
the second attempt.)

## Post-process — chroma-key cutouts (follow Batch 17's pipeline)

Write `tools/gen/postprocess_batch25.sh` modelled on `tools/gen/postprocess_batch17.sh`:
- key out the green with `$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py`
  (green `#00ff00`),
- **despill** any residual green fringe, trim to the paper, pad a couple of px of
  transparent margin,
- resize so the **longest side ≤ 512**, keep aspect, 8-bit RGBA, quantise for size,
- output to **`assets/sprites/signage/`** as `NOTE_JobPosting.png` … `NOTE_FerrySchedule.png`.

Verify with Pillow and report for each file: dimensions, that corners are fully
transparent (alpha 0), and that there's no green fringe left on the paper edge.

## Log (no git, no `src/`)

Append **one** Batch 25 progress line to `docs/ART_PLAN.md` describing what you
generated and the post-process result. Do **not** change any checkbox and do **not**
edit anything else. Do **not** run git. Do **not** touch `src/`.
