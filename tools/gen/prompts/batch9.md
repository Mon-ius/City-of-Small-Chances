# Batch 9 Prompts — Signage, Environmental Graphics & Narrative Key-Art

Generated with Codex built-in `image_gen` / GPT-Image-2. Raw curated outputs are stored in
`tools/gen/source_batch9/`; final assets are produced by `tools/gen/postprocess_batch9.sh`.

Shared direction: stylised realism, warm dusk-harbour palette, slightly painterly, not
photoreal. All signage is pictorial only: no readable text, numerals, letters, real-world logos,
watermarks, or replicas.

## Group A — Transparent Chroma-Key Cutouts

All Group A prompts include: perfectly flat solid chroma-key background, no shadows, gradients,
texture, reflections, floor plane, lighting variation, cast shadow, contact shadow, or watermark.
The subject is centered with generous padding and crisp edges for local background removal.

### SIGN_HarbourGate

Use case: background-extraction. Asset type: game environmental signage cutout source,
1024x1024 square. Original hanging harbour-entrance crest/emblem for a stylised dusk-harbour
life-sim. Anchor plus coiled rope plus a stylised wave or tiny ship silhouette, arranged as a
readable pictorial emblem; wrought-iron bracket and weathered painted-wood crest feel; gateway to
the Old Harbour mark. Warm slightly painterly stylised realism, matching hand-painted weathered
harbour shop signs, not photoreal. Centered square-ish hanging sign with generous padding, strong
silhouette, reads at 256px. Weathered plank wood browns, dark iron, muted sea teal, warm lamp
highlights; avoid bright green in the subject. Text: none. Backdrop: flat solid `#00ff00`.

### SIGN_Tavern

Use case: background-extraction. Asset type: game environmental signage cutout source,
1024x1024 square. Original eatery/tavern hanging sign. A foaming mug beside a fish-on-a-plate
motif, carved weathered wood with small wrought-iron bracket details, warm inviting harbour
tavern identity. Warm slightly painterly stylised realism, hand-painted weathered shop sign, not
photoreal. Centered square-ish hanging sign with generous padding, bold simple silhouette,
readable at 256px. Weathered wood browns, muted cream foam, fish silver-blue, dark iron, small
warm amber accents; avoid bright green in the subject. Text: none. Backdrop: flat solid
`#00ff00`.

### SIGN_Chandlery

Use case: background-extraction. Asset type: game environmental signage cutout source,
1024x1024 square. Original ship-chandler / harbour hardware hanging sign. Coiled rope plus a
sturdy lantern and a partial ship's wheel motif, working-trade identity, weathered painted wood
plaque with dark iron fittings. Warm slightly painterly stylised realism, hand-painted weathered
harbour sign, not photoreal. Centered square-ish sign with generous padding, strong silhouette,
motif reads clearly at 256px. Rope tan, dark iron, muted teal paint, worn wood browns, small warm
lantern glow; avoid bright green in the subject. Text: none. Backdrop: flat solid `#00ff00`.

### SIGN_FerryStop

Use case: background-extraction. Asset type: game environmental signage cutout source,
1024x1024 square. Original ferry-stop / transit marker sign for the Old Harbour. Simple small
boat silhouette with an abstract directional wave/arrow shape, enamel-sign feel, weathered
harbour transit marker mounted in a small metal frame. Warm slightly painterly stylised realism,
hand-painted enamel and worn metal, not photoreal. Centered square-ish marker with generous
padding, clean bold shapes readable at 256px; arrow must be abstract geometric direction, not a
letter. Muted cream enamel, sea teal, dark navy iron, worn rust flecks, warm amber scratches;
avoid bright green in the subject. Text: none. Backdrop: flat solid `#00ff00`.

### POSTER_Harbour

Use case: background-extraction. Asset type: game environmental wall-poster cutout source,
portrait-ish poster within source. Weathered pasted harbour poster / hoarding with no text.
Painted harbour scene vignette showing small boats, gulls, quay stones, and dusk water, printed
on torn peeling paper edges; original civic harbour illustration, not a logo. Warm slightly
painterly stylised realism, aged poster paint and paper texture, not photoreal. Centered vertical
poster shape with generous green padding; torn/peeling irregular paper silhouette; internal scene
must read at 256x320. Muted sea teal, warm dusk orange, aged cream paper, grey cobblestone,
weathered browns; avoid bright green in the subject. Text: none. Backdrop: flat solid `#00ff00`.

### POSTER_Civic

Use case: background-extraction. Asset type: game environmental wall-poster cutout source,
portrait-ish poster within source. Second weathered pasted poster / hoarding variant with no
text. Civic/community motif: a stylised harbour civic building facade and a small gathering of
simplified figures, muted official colours, printed on torn peeling wall-poster paper; entirely
pictorial. Warm slightly painterly stylised realism, aged poster paint and paper texture, not
photoreal. Centered vertical poster shape with generous green padding; torn/peeling irregular
paper silhouette; clear large shapes readable at 256x320. Aged cream paper, muted civic blue,
desaturated red accents, grey stone, warm lamplight; avoid bright green in the subject. Text:
none. Backdrop: flat solid `#00ff00`.

### DECAL_Graffiti

Use case: background-extraction. Asset type: game environmental graffiti decal cutout source,
1024x1024 square. Small abstract harbour wall-mark / graffiti decal with no text. Low-contrast
chalk and worn paint mark on stone: an abstract gull, fish, and wave glyph blended together,
handmade harbour tag, no letters or numerals. Slightly painterly chalk/paint decal, weathered
wall-mark texture, stylised realism, not photoreal. Centered compact decal with generous padding,
irregular paint edges, readable at 256px but subtle enough for stone walls. Chalky off-white,
faded sea teal, grey-blue, small rust-muted accent; no magenta in the subject. Text: none.
Backdrop: flat solid `#ff00ff`.

## Group B — Opaque Key-Art Scenes

All Group B prompts include: opaque full-bleed painted scene, wide 16:9 landscape, no readable
text, numerals, letters, signs/logos, watermark, transparency, tiling, normal map, or ORM
material look.

### KEYART_Act_Dawn

Use case: illustration-story. Asset type: opaque narrative key-art chapter card source, wide
16:9 landscape. The harbour at first light for an act-opener / new day card. Old Harbour quay at
dawn, quiet water, moored boats, stone quay, a few warm windows fading as the sun rises. A lone
small figure on the quay facing the harbour, hopeful and calm, integrated into the environment.
Full-bleed painted scene, warm slightly painterly stylised realism, cinematic but not photoreal.
Cool-warm dawn, first light at horizon, hopeful quiet atmosphere. Cool blue-grey stones and
water, pale gold dawn, muted teal harbour, small warm window accents.

### KEYART_Act_Dusk

Use case: illustration-story. Asset type: opaque narrative key-art chapter card source, wide
16:9 landscape. The harbour at golden dusk for a turning-point act card. Old Harbour quay at
golden dusk, lamps just lit, wet stone catching reflections, boats and shopfront silhouettes
along the water. Small human figures beginning evening routines, one figure paused at a quay
edge, mood of decision and transition. Full-bleed painted scene, warm slightly painterly
stylised realism, cinematic but not photoreal. Warm golden dusk, lamplight beginning to glow,
thoughtful turning-point mood.

### KEYART_Act_Storm

Use case: illustration-story. Asset type: opaque narrative key-art chapter card source, wide
16:9 landscape. The harbour in a storm for the crisis-act card. Old Harbour quay during a storm,
rain slanting across lamps, churning harbour water, moored boats strained by ropes, wet stone and
blown spray. One or two small figures bracing near the quay or doorway, crisis mood without
horror. Full-bleed painted scene, warm slightly painterly stylised realism, cinematic but not
photoreal. Stormy blue-grey atmosphere with warm lamps fighting through rain, dramatic crisis
energy.

### KEYART_Ending_Settled

Use case: illustration-story. Asset type: opaque narrative key-art epilogue card source, wide
16:9 landscape. Warm settled-life epilogue vignette. Calm Old Harbour evening outside a modest
home or live-work room near the quay, lit window revealing a small cozy interior glimpse, quiet
water and lamps beyond. Signs of settled daily life: a tidy table shape, warm curtain, small
plants or tools, no written labels; optional tiny figure silhouette at the window or doorway.
Full-bleed painted scene, warm slightly painterly stylised realism, cinematic but not photoreal.
Hopeful, stable, warm interior glow against cool harbour night.
