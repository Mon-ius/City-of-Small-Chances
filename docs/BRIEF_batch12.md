# codex task — Batch 12: the paper trail of a life — economy / Opportunity-Web / starting-kit prop cutouts (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entries
**spr-005, spr-006**), and the reference chroma-key pipeline `tools/gen/postprocess_batch6.sh`.**
Match the established warm, slightly-painterly, stylised-realism finish.

This batch delivers the **economy / Opportunity-Web "paper trail" props** and the **starting-kit
essentials** the book's economy-rent-debt, opportunity-web and character-creation milestones call
for. They are the visual vocabulary the job/opportunity/inventory panels will draw — small, readable
object icons. **All are chroma-key transparent cutouts** (one pipeline). Ship-ready (no live wiring
this batch — they feed UI panels), like Batches 5/7/10.

## All items — chroma-key transparent cutouts (8 cutouts / 8 PNGs), into `assets/sprites/props/`

Single object, **centred**, full-bleed on a **flat chroma-key background** (`#00ff00` green; use
`#ff00ff` magenta if the subject is itself green/yellow-green), even diffuse light, a soft contact
shadow is fine but **no busy scene**. Painterly, readable silhouette, gentle three-quarter or
face-on framing. **Absolutely no readable text, no real words, no numbers, no brands, no logos** —
where a document would carry writing, paint **abstract greeked glyph-rows / wavy ink lines** only
(suggest text, never spell it). This is a hard constraint: these are stylised props, not documents.

**Economy / Opportunity-Web story props (spr-005):**
1. **PROP_Eco_Receipt** — a curled paper till-receipt strip, faint abstract glyph-rows, a torn
   bottom edge. Warm off-white paper.
2. **PROP_Eco_BillNotice** — an opened utility/rent **bill**: an envelope behind a folded slip with
   a bold red/maroon stamp block (a flat colour mark, **not** letters) in the corner. Officious.
3. **PROP_Eco_RouteCard** — a **transit travel-pass card**, rounded-corner plastic, an abstract
   wayfinding chevron/arc motif and a small chip square. Cool blue-grey.
4. **PROP_Eco_RentNotice** — a formal **rent-increase / payment-reminder letter** on letterhead
   (an abstract crest block at top, greeked body lines), one corner slightly dog-eared. Cream paper.
5. **PROP_Eco_ApplicationForm** — a **clipboard holding an application form**: ruled blank fields
   and tick-box rows (boxes only, no text), a pen resting across it. Dark board, pale form.
6. **PROP_Eco_Manifest** — a **cargo-manifest clipboard** (the dockwork / Opportunity-Web chance):
   a clipped sheaf with a checklist grid (abstract rows + ticks), weathered. Dock-worn.

**Starting-kit / activity essentials (spr-006):**
7. **PROP_Kit_Phone** — a **basic modern phone**, face-on, dark glass front with a plain warm
   home-screen glow (no app icons, no text), a simple rounded body. The in-game device.
8. **PROP_Kit_StudyBooks** — a **small stack of 3–4 study books**, worn cloth/paper covers in muted
   harbour tones, a ribbon bookmark — the skill-training prop. No titles/text on the spines.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each **1024×1024**, centred on the flat key colour, generous padding, no cropping.
- **Smoke-test first:** generate **PROP_Eco_Receipt** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch12/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch12.sh` reusing the `postprocess_batch6.sh` chroma-key
pipeline for every item: strip the key with
`"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
--soft-matte --despill`, trim + `+repage`, fit each centred on a transparent square canvas, resize
to **512×512**, quantise (8-bit). Verify transparent corners (alpha 0) and no green/magenta fringe.

Final names (match exactly), all into `assets/sprites/props/`:
- `PROP_Eco_Receipt.png`, `PROP_Eco_BillNotice.png`, `PROP_Eco_RouteCard.png`,
  `PROP_Eco_RentNotice.png`, `PROP_Eco_ApplicationForm.png`, `PROP_Eco_Manifest.png`,
  `PROP_Kit_Phone.png`, `PROP_Kit_StudyBooks.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Wiring is the orchestrator's job.
- Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real words/numbers, no brands/logos** — greeked glyphs only.
- Every cutout must have clean transparent edges (alpha-0 corners, no chroma fringe).

## Deliverables checklist
- 8 prop cutouts (names above), `tools/gen/prompts/batch12.md`, `tools/gen/postprocess_batch12.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size). Do NOT change any checkbox.

## When done
Print the files you created with sizes and confirm each has clean alpha. Do not run git; the
orchestrator reviews, decides any in-world/UI placement, and commits.
