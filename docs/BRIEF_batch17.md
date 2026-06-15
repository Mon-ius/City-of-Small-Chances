# codex task — Batch 17: the market's abundance — goods that dress the stall (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entries
**spr-006** and **spr-004**), and the chroma-key reference pipeline `tools/gen/postprocess_batch16.sh`
/ `postprocess_batch12.sh`** (transparent cutouts). Match the established warm, painterly,
stylised-realism finish — the same hand that painted the harbour props and the economy paper trail.

This batch delivers the **market-stall goods**: the everyday produce and wares that dress a vendor
stall — fresh from **spr-006** (noodle bowl / food, market baskets, market goods) and **spr-004**
(sacks). These are **chroma-key cutouts** (transparent PNGs). Unlike the prior ship-ready prop
batches, **these are intended to be wired LIVE onto Mei's noodle stall in the walkable harbour** (the
orchestrator does the `world.js` wiring — you only generate the art), so each must read as a clean,
fixed **side-on** object that can stand as a flat billboard in the scene beside the existing stall and
hanging sign. **Design intent (World rule 2 — abundance & care read through the goods):** a working
market stall, generous but honest; warm harbour palette; never luxury, never squalor.

## The 6 cutouts (1024×1024 generated, chroma-key) → `assets/sprites/props/`

Generate each on a **flat chroma-key** background (`#00ff00`; use `#ff00ff` for any predominantly
**green** subject — e.g. the leafy-veg basket or a green-heavy hanging string) with a clean
silhouette, even lighting, **viewed side-on / three-quarter front, NO cast shadow on the key, no
border, full subject in frame with margin.**

**Produce baskets (the stall's display):**
1. **PROP_Market_BasketVeg** — a woven basket heaped with fresh leafy vegetables / greens (bok choy,
   cabbage, spring onion). Generous, just-picked. (Likely on **magenta** — green-dominant.)
2. **PROP_Market_BasketFruit** — a woven basket heaped with warm-toned fruit (oranges, apples,
   persimmons). Reads "ripe" instantly.

**Bulk goods (the back of the stall):**
3. **PROP_Market_Sacks** — a low stack of plump grain / rice sacks in coarse hessian, a couple of rows,
   honestly creased. (This is the spr-004 "sacks" item.)
4. **PROP_Market_Crate** — an open slatted wooden crate of mixed market goods (root veg, a few jars of
   preserves, a melon) — the just-delivered restock object.

**Food service (Mei's fare):**
5. **PROP_Food_NoodleBowl** — a single steaming bowl of noodles, chopsticks resting across, a curl of
   warm steam. Mei's stall sells this — it must read as hot, fresh street food.
6. **PROP_Market_HangingWares** — a hung string / cluster of dried goods (chillies, garlic, onions,
   dried fish) on a simple cord at top, as if hung from a stall frame. The "wares on display" object.
   (Likely on **magenta** if greens/garlic dominate.)

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each at **1024×1024**, flat chroma-key background, full subject in frame with margin.
- **Smoke-test first:** generate **PROP_Market_Sacks** as your very first action and confirm a PNG
  lands in `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server
  error — just retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch17/` (gitignored).

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch17.sh` reusing `postprocess_batch16.sh`/`_batch12.sh`:
strip the chroma key with
`"$CODEX_HOME"/skills/.system/imagegen/scripts/remove_chroma_key.py … --auto-key border
--soft-matte --despill`, then trim → repage → fit on a centred transparent canvas → resize so the
**longest side is 512** (keep aspect — a wide hanging-string or a tall bowl need not be square) →
quantise/optimise. Verify: transparent corners (alpha 0), no green/magenta fringe.

Final names (match exactly) → `assets/sprites/props/`:
- `PROP_Market_BasketVeg.png`, `PROP_Market_BasketFruit.png`
- `PROP_Market_Sacks.png`, `PROP_Market_Crate.png`
- `PROP_Food_NoodleBowl.png`, `PROP_Market_HangingWares.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No readable text, no real brands, no logos.** Jars/sacks carry no labels — suggestion only.
- Every final is **RGBA** with verifiably transparent corners and a clean (un-fringed) edge.

## Deliverables checklist
- 6 cutout PNGs (names above), `tools/gen/prompts/batch17.md`, `tools/gen/postprocess_batch17.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each cutout's opaque-coverage / alpha-corner check). Do NOT change
  any checkbox.

## When done
Print every file you created with sizes and confirm transparent corners + clean edges. Do not run
git; the orchestrator reviews, wires the goods onto the live stall in `world.js`, and commits.
