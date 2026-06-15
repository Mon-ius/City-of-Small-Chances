# codex task — Batch 9: signage, environmental graphics & narrative key-art (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md` and `docs/ASSET_MANIFEST.md`
(entries ui-019 … ui-021, plus the world-bible signage notes)** and follow the art direction,
palette, naming and technical standards exactly. Batches 1–8 are committed under
`assets/textures/`, `assets/sprites/`, `assets/ui/` — keep the same warm, slightly-painterly
stylised-realism world (NOT photoreal). The Batch 6 signage cutouts (`assets/sprites/signage/`)
are the style benchmark for the signs here: painted, weathered, pictorial, harbour-appropriate.

This batch is the milestone *world-bible-haiyun* (a **bespoke, legally-original** brand/signage
system — NO real-world logos or replicas) and *narrative-endings* (**act-transition chapter
cards / life-path key-art**). Two pipelines, both already used in earlier batches:
**(P2)** transparent chroma-key cutouts (like Batch 6 signage) for the environmental signs, and
**(P1-simple)** opaque full-bleed painted scenes (no tiling, no normal/orm — these are pictures,
not surfaces) for the narrative key-art.

## What to make — 11 assets, two groups

### A. Environmental signage & graphics (7) — P2, transparent chroma-key cutouts
These hang on the live harbour buildings/walls (the orchestrator wires them in). Square-ish,
painted, weathered, **pictorial emblem only — NO readable text, numerals, or letters** (convey
each trade by motif, like a medieval shop sign). Harbour-original brands.
1. **SIGN_HarbourGate** — a hanging harbour-entrance crest/emblem: anchor + rope + a stylised
   wave or ship silhouette, wrought-iron/painted-wood, the "gateway to the Old Harbour" mark.
2. **SIGN_Tavern** — an eatery/tavern hanging sign: a foaming mug or a fish-on-a-plate motif,
   warm and inviting, carved-wood with iron bracket feel.
3. **SIGN_Chandlery** — a ship-chandler/hardware sign: coiled rope + lantern or a ship's wheel,
   working-trade.
4. **SIGN_FerryStop** — a transit/ferry-stop marker: a simple boat + directional wave/arrow
   motif (arrow as an abstract shape, NOT a letter), enamel-sign feel.
5. **POSTER_Harbour** — a weathered pasted wall poster/hoarding: a painted harbour scene
   vignette (boats, gulls, dusk), edges torn/peeling, no text.
6. **POSTER_Civic** — a second weathered poster variant: a civic/community motif (a stylised
   building or a gathering of figures), muted official colours, torn edges, no text.
7. **DECAL_Graffiti** — a small painted wall-mark / graffiti decal: an abstract harbour tag
   (gull, fish, or wave glyph), chalk/paint on stone, low-contrast, no letters.

### B. Narrative key-art / chapter cards (4) — P1-simple, opaque full-bleed painted scenes
Establishing paintings for the act-transition screens & life-path epilogues — full scenes (NOT
tileable, NOT cutouts). Cinematic, atmospheric, **no readable text/UI** (the title overlays in
DOM later). Wide format.
8.  **KEYART_Act_Dawn** — the harbour at first light: hopeful, cool-warm dawn, quiet quay, a lone
    figure — an act-opener / "a new day" card.
9.  **KEYART_Act_Dusk** — the harbour at golden dusk: lamps just lit, warm, a turning-point mood.
10. **KEYART_Act_Storm** — the harbour in a storm: rain, churning water, dramatic — the crisis-act
    card (the book's *events-crises* mood).
11. **KEYART_Ending_Settled** — a warm "settled life" epilogue vignette: a lit window / a small
    home interior glimpse / a calm harbour evening — the hopeful ending key-art.

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path.
- **Smoke-test first:** generate **SIGN_HarbourGate** on a chroma-key background as your very first
  action and confirm a PNG lands in `$CODEX_HOME/generated_images/…` before doing the rest.
- **Size:** GPT-Image-2 floor is ~655k px, edges multiples of 16. Generate signs at **1024×1024**;
  generate the 4 key-art scenes **wide** (e.g. 1280×720 / 1216×704 — a 16:9-ish landscape).
- **Transparency (group A):** generate on a flat chroma-key background — `#00ff00` (green), or
  `#ff00ff` (magenta) for any subject that is strongly green. Clean even solid fill, no shadows.
- **Group B is opaque** — full-bleed painted scene, NO chroma-key, no transparency.
- Keep raw generations in `tools/gen/source_batch9/` (gitignored).
- **Do NOT use the CLI fallback** (`scripts/image_gen.py`) or `gpt-image-1.5`. If the built-in
  `image_gen` tool is unavailable in this `exec` environment, **STOP and write a clear note**.

## Post-processing (pre-installed tools only — ImageMagick + the bundled python script + Pillow)
Write `tools/gen/postprocess_batch9.sh` (re-runnable), reusing the earlier pipelines:
- **P2 signs/posters/decal** (group A): adapt `tools/gen/postprocess_batch6.sh` —
  `remove_chroma_key.py … --auto-key border --soft-matte --despill`, then `-trim +repage`, fit
  onto a centred transparent canvas, quantise. Ship sizes: **signs 256×256, posters 256×320,
  decal 256×256**. Clean alpha (verify over mid-grey AND white).
- **P1-simple key-art** (group B): NO seamless, NO normal/orm — just downscale to ship size,
  mild sharpen, PNG8-quantise (≤224 colours, `png:compression-level=9`). Ship size **640×360**
  each (16:9), opaque.

Result — file names (match exactly), into these paths:
- Signage/posters/decal → `assets/sprites/signage/{SIGN_HarbourGate,SIGN_Tavern,SIGN_Chandlery,SIGN_FerryStop,POSTER_Harbour,POSTER_Civic,DECAL_Graffiti}.png`
- Key-art → `assets/ui/keyart/{KEYART_Act_Dawn,KEYART_Act_Dusk,KEYART_Act_Storm,KEYART_Ending_Settled}.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Integration is the orchestrator's.
- Post-process only with pre-installed tools. **No `npm install`, no new dependencies.**
- **No readable text, numerals, or logos** anywhere — pictorial / painterly only. Brands must be
  **original** (no real-world replicas), per the world-bible legal-originality rule.
- Signs must read at small size and match the Batch 6 signage family. Clean alpha (no fringe).
- Keep each PNG small (8-bit, quantised) so web boot stays fast.

## Deliverables checklist
- 11 PNGs across `assets/sprites/signage/` (7) and `assets/ui/keyart/` (4).
- `tools/gen/prompts/batch9.md` and `tools/gen/postprocess_batch9.sh` (re-runnable).
- Append a one-line note to the Progress log in `docs/ART_PLAN.md` (what you generated, that
  built-in image_gen worked, total payload size). Do NOT change the Batch 9 checkbox.

## When done
Print the full list of files you created with sizes, confirm the 7 signs have clean transparency
on grey + white and the 4 key-art scenes are opaque full-bleed paintings reading their moods
(dawn/dusk/storm/settled). Do not run git; the orchestrator reviews + commits.
