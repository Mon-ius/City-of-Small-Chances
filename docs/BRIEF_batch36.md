# Batch 36 — the storefront & the credential (ui-023 Steam/marketing key-art + ui-006 skill certificate)

**Milestones:** `ui-023` (Steam store / marketing art — *steam-release-demo*) and
`ui-006`'s open tail (the **certificate / credential visuals**; the 7 skill icons
already exist on disk). These are the **last two discrete-artifact image-gen entries**
the book maps — every other open entry is a full-screen UI *layout* for a screen the
walkable build does not have yet. Both of these are real, paintable artifacts you show
*outside* the live frame loop: the game's shopfront face, and the paper credential a
skill grants. They are **ship-ready** (no Steam page and no skills screen are built
yet). **You (codex) generate + post-process + log only. Do NOT touch `src/`. Do NOT
run git.**

## Match the existing key-art style EXACTLY (for the Steam pieces)

Look first at the existing painted scenes — `assets/ui/trailer/TRAILER_*.png` and
`assets/ui/keyart/KEYART_*.png`. Each is an **opaque painted illustration** of the
*same* Old Harbour world — grounded, slightly storybook painterly, muted period-harbour
palette (wet stone, weathered timber, canvas, lamplight, grey-green water), soft depth
and atmosphere, **no UI, no text**. The Steam pieces below are the *marketing* cut of
that exact world — the "cover art". Match that look and palette precisely so the store
art reads as the same game. **Full-frame opaque scenes** (no transparency, no chroma key).

## What to make — PART A: ui-023, three Steam art slots (opaque, the harbour's cover art)

The single hard rule for ALL three: **paint NO title, NO wordmark, NO letters, numbers,
logos or brands** (any signage/paper in-scene is abstract greeked marks). Each must
**leave deliberate clean negative space** (calm sky or water, lightly painted) where a
wordmark will later be dropped in — name the slot the negative space sits in, per piece.

1. **`STORE_Capsule_Header`** — *the main capsule / page header.* The iconic
   golden-hour Old Harbour money-shot — quay, moored boats, lighthouse/lamps, lit
   windows beginning to glow, grey-green water catching warm light — composed as a
   **wide landscape** with the strong focal mass to one side and **clean negative space
   across the lower third (the water/quay)** for a wordmark. Beautiful, inviting, the
   "buy this" frame.

2. **`STORE_Library_Hero`** — *the ultra-wide library banner.* The same harbour but
   composed for a **very wide cinematic banner**: keep the hero content (lighthouse +
   quay + a hint of the working stall/figures) in a **central horizontal band** with
   generous calm sky above and water below, the focal element offset left-of-centre so
   the **right third stays clean** for a wordmark. Cinematic, panoramic.

3. **`STORE_Capsule_Vertical`** — *the vertical library capsule / box art.* A **tall
   portrait** composition of the harbour at dusk — the lighthouse and quay rising
   through the frame, lamplight, the lone protagonist small at the waterline for scale —
   with **clean negative space across the top third (sky)** for a stacked wordmark.
   Poster-like, the "box on a shelf" read.

## What to make — PART B: ui-006, the skill credential (a document + its seal)

The skill-training milestone grants a **certificate** when you certify a skill. Same
grounded painterly world-feel, but these are *paper & wax props*, like the Batch-12
economy paper-trail (`PROP_Eco_*`) — **no readable text anywhere**, greeked glyph-rows
only.

4. **`UI_Cert_Credential`** — *the certificate.* A single framed **skill certificate /
   credential** painted **flat-on (document facing the viewer), opaque, on a neutral
   dark studio background** — aged cream paper with a printed ornate border, a small
   harbour crest/roundel at the top centre, **ruled lines of greeked "text"** (abstract
   marks, no real letters), a signature flourish near the bottom, and a **ribbon + wax
   seal** in a lower corner. Reads instantly as "an official credential" by layout +
   seal alone. Portrait orientation.

5. **`UI_Cert_Seal`** — *the credential seal (a reusable badge).* A single **embossed
   wax seal with a short ribbon** — deep red/oxblood wax, a pressed harbour-anchor or
   rope motif, gold ribbon tails — **centred on a flat chroma-key field** so it cuts to
   a transparent badge that can stamp any certificate or skill row. No text. Use the
   **GREEN `#00ff00`** key (the seal is red/gold, no green in it).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. **Smoke-test
`STORE_Capsule_Header` first** and eyeball it before the others. One image per slot.
Generate each at the orientation closest to its target so the crop is gentle:
`STORE_Capsule_Header` + `STORE_Library_Hero` **landscape**; `STORE_Capsule_Vertical` +
`UI_Cert_Credential` **portrait**; `UI_Cert_Seal` **square**. Save raws to
`tools/gen/source_batch36/` as `STORE_Capsule_Header.png` … `UI_Cert_Seal.png`. Write
your prompts + the key colour used (for the seal) to `tools/gen/prompts/batch36.md`.
(If an `image_gen` call returns a server error, just retry — it succeeds on the second
attempt.)

## Post-process

Write `tools/gen/postprocess_batch36.sh` (model the opaque path on
`postprocess_batch31.sh`, the chroma-key path on `postprocess_batch35.sh`):

**Opaque marketing + certificate (centre-crop, NOT keyed), 8-bit RGB, quantised small:**
- `STORE_Capsule_Header` → exactly **920×430** → `assets/ui/store/STORE_Capsule_Header.png`
- `STORE_Library_Hero` → exactly **1920×620** → `assets/ui/store/STORE_Library_Hero.png`
- `STORE_Capsule_Vertical` → exactly **600×900** → `assets/ui/store/STORE_Capsule_Vertical.png`
- `UI_Cert_Credential` → exactly **768×1024** → `assets/ui/store/UI_Cert_Credential.png`
  (centre-crop to the target aspect, then resize; create `assets/ui/store/`)

**Chroma-key cutout (transparent), 512×512 RGBA:**
- `UI_Cert_Seal` → chroma-key the GREEN field to transparent (reuse the bundled
  `remove_chroma_key.py` / the Batch-35 ImageMagick path), de-fringe so **0% green halo**
  remains, pad/centre to **512×512 RGBA** alpha-0 corners, quantise →
  `assets/ui/icons/UI_Cert_Seal.png`

Verify with Pillow and report per file: dimensions (must match the targets above),
whether it is opaque (the 4 marketing/cert) or has alpha-0 corners + **0% green fringe**
(the seal), file size, and a one-line note on what it shows, that it carries **no
legible text**, and — for the three `STORE_*` — **which region holds the clean negative
space** for the wordmark.

## Log (no git, no `src/`)

Append **one** Batch 36 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
