# Batch 7 Prompts — Interiors & Workplaces

Generation mode: built-in `image_gen` skill (GPT-Image-2), no CLI fallback, no API key.

Smoke test: `ENV_Interior_Shelter` was generated first and confirmed as a PNG under
`$CODEX_HOME/generated_images/019ecc70-29a1-78f0-a982-ef617d7bb520/`, then copied into
`tools/gen/source_batch7/ENV_Interior_Shelter_albedo.png`. Originals were left in place.

Shared constraints for every surface:

- Opaque full-bleed tileable PBR albedo source texture, 1024x1024 square target.
- Stylised realism, slightly painterly, warm cinematic harbour palette balanced with cool stone.
- Even all-over field, no central hero object, no perspective, no strong baked directional light.
- Seamless repeat requested at generation; local post-process enforces exact wrap seams.
- No transparency, no chroma-key, no readable text, no numerals, no logos, no watermark.

## ENV_Interior_Shelter

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Interior_Shelter albedo. Painted stylised-realism night-shelter or couch-surf room floor surface: cold bare scuffed old concrete screed mixed with hints of worn grey board texture, institutional, a little grime, poorest rung of a housing rent ladder.
Art direction: warm cinematic harbour-world palette balanced with cool grey stone, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no dominant unique stain, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Interior_SharedRoom

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Interior_SharedRoom albedo. Painted stylised-realism shared-room floor surface: cheap scuffed vinyl or lino, mismatched worn repair patches, slightly warmer than a shelter but tired and budget, low-rent shared housing rung.
Art direction: warm cinematic harbour-world palette balanced with muted tan, grey, and worn ochre; slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no dominant unique stain, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Interior_Studio

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Interior_Studio albedo. Painted stylised-realism basic studio apartment floor surface: plain clean pale laminate planks, modest but private, simple regular plank seams, low-cost but cared for.
Art direction: warm cinematic harbour-world palette with pale honey-grey laminate, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no dominant knots, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Interior_Apartment

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Interior_Apartment albedo. Painted stylised-realism stable apartment floor surface: warm honey wood floorboards, clean, cared-for, settled home feeling, subtle board grain and joins.
Art direction: warm cinematic harbour-world palette using honey wood browns beside the existing harbour plank family, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no dominant unique knot or plank, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Interior_LiveWork

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Interior_LiveWork albedo. Painted stylised-realism live-work unit floor surface: polished sealed concrete blended with dark sealed wood workshop character, faint workspace sheen, practical and stable top rung, subtle scuffs from craft work but clean.
Art direction: warm cinematic harbour-world palette, charcoal concrete and dark warm brown accents, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no dominant oil ring or unique scratch, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Work_Warehouse

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Work_Warehouse albedo. Painted stylised-realism dock or warehouse floor surface: sealed industrial concrete with faded painted hazard and lane-line fragments, oil staining, pallet scuffs, practical harbour labour workplace for dock_load and harbour_labour jobs.
Art direction: warm cinematic harbour-world palette with cool grey concrete and muted safety ochre, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no readable symbols, no arrows, no numerals, no perspective, orthographic top-down material texture, repeatable edges. Lane and hazard marks should be abstract partial stripes only.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Work_Kitchen

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Work_Kitchen albedo. Painted stylised-realism kitchen-line wall surface: cream and off-white ceramic subway tiles with grout lines, faint greasy sheen and subtle wok-station cooking haze, practical noodle kitchen workplace for market_haul cooking.
Art direction: warm cinematic harbour-world palette, warm cream whites with grey grout and slight amber grease, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over brick tile pattern, no central hero object, no readable signs or labels, no numerals, no perspective, straight orthographic wall material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.

## ENV_Work_Civic

Use case: stylized-concept
Asset type: opaque tileable PBR albedo source texture, 1024x1024 square, full bleed
Primary request: ENV_Work_Civic albedo. Painted stylised-realism civic records-office floor surface: clean institutional speckled terrazzo or vinyl composite tile, cool official feel, orderly and maintained, for civic_filing work.
Art direction: warm cinematic harbour-world palette balanced with cool stone greys, tiny muted speckles, slightly painterly, believable but not photoreal, no strong directional lighting, no shadows baked in.
Tiling requirements: seamless repeat, even all-over field, no central hero object, no readable markings, no numerals, no perspective, orthographic top-down material texture, repeatable edges.
Technical constraints: opaque full-bleed surface only, no transparency, no chroma-key background, no readable text, no numerals, no logos, no watermark.
