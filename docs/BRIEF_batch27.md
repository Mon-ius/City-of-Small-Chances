# Batch 27 — ui-003: the missing condition-STATE icons

**Milestone:** `ui-003` (Status/condition icons — colour-blind-safe shape+value).
The book's condition list is *burnout, illness, injury, well-rested, hungry, stressed,
hopeful*. **Hungry / stressed / hopeful already exist** as Batch-4B meter icons
(`UI_Icon_Hunger`, `UI_Icon_Stress`, `UI_Icon_Hope`). This batch draws the **4 still
missing** discrete-STATE glyphs. The orchestrator (Claude Code) will wire the
energy-driven ones (Burnout / WellRested) into the live HUD beside the energy meter;
the others ship ready. **You (codex) generate + post-process + log only. Do NOT touch
`src/`. Do NOT run git.**

## Match the existing icon style EXACTLY

Look at the existing icons first: `assets/ui/icons/UI_Icon_{Stress,Hunger,Hope,Health}.png`
— each is a **128×128 transparent PNG**, a **single centred painted glyph** in a glossy
stylised game-icon look (soft rounded forms, gentle rim-light, a subtle dark outline),
colour-coded **but also clearly distinct by silhouette and value** so it survives
greyscale (the accessibility rule: never hue alone). Match that look precisely.

Generate each glyph **centred on a flat pure-magenta background (`#ff00ff`)** for clean
keying — none of these four glyphs is magenta, so magenta keys cleanly. Generous even
margin around the glyph. No text, no letters.

## What to make — 4 condition-STATE glyphs

1. **`UI_Icon_State_Burnout`** — *burnout / spent.* An **extinguished candle stub** with a
   thin curl of smoke rising (just snuffed). Ashen grey wax, a dark cooling wick, the
   smoke pale. **Low overall value (dark/desaturated)** so it reads "depleted" even in
   greyscale. Silhouette: short candle + smoke wisp.

2. **`UI_Icon_State_Illness`** — *unwell / sick.* A **clinical thermometer** held upright
   with a high reading, a faint sickly-green aura/droplet behind it. Tall thin vertical
   silhouette (distinct from every other icon). Sickly teal-green accent, mid value.

3. **`UI_Icon_State_Injury`** — *hurt / injured.* A single **adhesive bandage / sticking
   plaster** laid as a cross (the classic ✚ plaster), warm beige with a small red nick
   showing through. **Distinct from `UI_Icon_Health`'s bandaged-heart** — this is the
   plaster *alone*, an X/cross silhouette, no heart.

4. **`UI_Icon_State_WellRested`** — *rested / restored.* A **serene crescent moon** with two
   small soft "Zzz"-style sleep marks (as abstract curls/dots, **not real letters**) and a
   bright highlight. Cool calm blue, **high value / luminous** so it reads "restored" and
   the polar opposite of Burnout in greyscale. Silhouette: crescent + little marks.

The four must be mutually unmistakable by **silhouette + value** alone (candle-stub /
tall thermometer / cross-plaster / crescent-moon), spanning dark→bright value.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. One image per glyph, square
canvas, glyph centred on flat `#ff00ff`. Save raw to `tools/gen/source_batch27/` as
`UI_Icon_State_Burnout.png` … `UI_Icon_State_WellRested.png`. Write your prompts to
`tools/gen/prompts/batch27.md`. (If the first `image_gen` call returns a server error,
just retry — it succeeds on the second attempt.)

## Post-process — keyed transparent icons at 128×128

Write `tools/gen/postprocess_batch27.sh`:
- key out the magenta with `$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py`
  (magenta `#ff00ff`), despill any residual magenta fringe,
- trim to the glyph, pad to a centred square, resize to **128×128**, 8-bit RGBA, quantise,
- output to **`assets/ui/icons/`** as
  `UI_Icon_State_{Burnout,Illness,Injury,WellRested}.png`.

Verify with Pillow and report per file: dimensions (must be 128×128), fully transparent
corners (alpha 0), zero magenta fringe, and a quick greyscale-contrast note (the four
should still be tellable apart with hue removed).

## Log (no git, no `src/`)

Append **one** Batch 27 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
