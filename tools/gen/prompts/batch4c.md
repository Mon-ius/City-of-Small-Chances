# Batch 4C GPT-Image-2 prompts: systems & wayfinding icons

Generated with Codex built-in `image_gen` (GPT-Image-2), not the CLI fallback. `courier_run` was generated first as the required smoke test; the PNG landed in `$CODEX_HOME/generated_images/019ecbeb-e5ea-7042-ba66-25d46f3ed13d/` and was copied to `tools/gen/source_batch4c/courier_run.png`.

All sources were generated as square icon cutouts and copied to `tools/gen/source_batch4c/` for the re-runnable local post-process step. Prompts requested a flat `#00ff00` chroma-key background, except `resilience`, which requested `#ff00ff` because it contains a sprout. The built-in renderer produced a few neutral/black removable borders; `tools/gen/postprocess_batch4c.sh` samples/removes the connected border and validates transparent finals.

Each prompt used this shared envelope, with the `Primary request`, `Subject`, `Lighting/color`, `Background`, and `Avoid` fields adjusted per asset:

```text
Use case: stylized-concept
Asset type: <job emblem | district map marker | Opportunity-Web component | practical skill> UI icon, final transparent 128x128 after post-process
Primary request: <primary request>
Art direction: City of Small Chances; match Batch 4B clean bold lightly painterly flat icons; warm dusk harbour palette; crisp silhouette readable at 32-48 px; colour-blind-safe by shape and value.
Subject: <single centered motif>
Style/medium: polished flat game icon, subtle painterly value shading.
Composition: centered subject with generous padding and consistent visual weight.
Lighting/color: <palette notes>
Background: entire canvas filled with a perfectly flat removable chroma-key background; no checkerboard, no transparency, no shadows, no gradient, no texture; do not use the key color in the subject.
Avoid: text, numerals, logos, emoji style, photorealism, thin details, baked drop shadow.
```

## Job Emblems

- `market_haul`: hand-truck / sack-barrow stacked with chunky wooden crates and one sack; activity emblem, no badge or place marker.
- `harbour_labour`: chunky harbour anchor diagonally crossed with a thick rope coil and loose rope end; activity emblem.
- `dock_load`: simplified gantry crane arm and hook lifting one ribbed shipping container.
- `courier_run`: compact side-view bicycle with a clear courier satchel or delivery bag; smoke-test source.
- `civic_filing`: stacked file folders/papers with a chunky rubber stamp angled on top; no text on papers.

## District Markers

District prompts used a distinct rounded teardrop map-pin badge family so they read as wayfinding markers instead of activity emblems.

- `tenements`: rounded map pin containing a worn stacked row-house / apartment block with small warm window notes.
- `market_row`: rounded map pin containing a market stall awning and noodle bowl motif.
- `old_harbour`: rounded map pin containing a chunky anchor over a tiny moored boat or hull curve.
- `dockside`: rounded map pin containing a ribbed shipping container and simple crane hook.
- `uptown`: rounded map pin containing a simplified civic building with triangular pediment and three chunky columns.

## Opportunity-Web Components

- `skill`: hand holding a simple tool beside three chunky rising mastery bars.
- `relationship`: two rounded figures facing each other with a linked-hands or connection arc.
- `reputation`: sturdy standing seal/badge with broad outward ripple arcs, no rating stars.
- `possession`: chunky old key held above a small closed chest or pouch.
- `timing`: simple clock combined with a small hourglass; no numerals or tick marks.
- `history`: two or three chunky footprints curving past a closed ledger/book or past-record ring.

## Skills

- `logistics`: route map with two chunky boxes connected by a curved route line and arrows.
- `service`: hand holding a serving tray with a counter bell or cup.
- `maintenance`: wrench diagonally crossed with a simple gear.
- `cooking`: chef's knife beside a small steaming pan or pot.
- `communication`: two overlapping speech bubbles with opposing tails, no letters or punctuation.
- `focus`: bold eye shape centered over a simple target ring or bullseye.
- `resilience`: sturdy shield with a small sprout emerging through a cracked stone base; generated on magenta key.
