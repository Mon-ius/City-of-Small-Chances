# Batch 16 Prompts — District Event Dressing

Built-in image generation path: Codex `image_gen` skill (GPT-Image-2), no CLI fallback.
Raw generated PNGs were copied from `$CODEX_HOME/generated_images/019ecd6e-9f22-72e2-bbb7-7986d595aa40/` into `tools/gen/source_batch16/`.

Smoke test first:
- `DRESS_Flood_Sandbags` was generated first and landed at `$CODEX_HOME/generated_images/019ecd6e-9f22-72e2-bbb7-7986d595aa40/ig_0ba9f6d28dd02dff016a307eabdf608191abb826ebe6221fbd.png`.

Shared constraints for every prompt:
- Three.js browser game transparent event dressing cutout.
- Warm painterly stylised realism matching the dusk-harbour life-sim art direction.
- Flat chroma-key background, no shadows, no gradients, no floor plane, no border.
- Clean silhouette, full subject in frame with generous margin.
- No readable text, no numbers, no real brands, no logos, no gore, no people, no watermark.
- Documents and posters use abstract greeked marks only.

## DRESS_Flood_Sandbags

Flat key: `#00ff00`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Flood_Sandbags, a low stack of flood-defence sandbags, damp hessian, a few stacked rows, sober quiet aftermath object.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: compact low pile of 9 to 12 burlap sandbags in two or three uneven rows, damp stained hessian fabric, tied seams visible, no people.
Style/medium: warm painterly stylised realism matching a dusk-harbour life-sim game asset; clean silhouette, production sprite cutout.
Composition/framing: full subject centered, three-quarter front view, generous margin on all sides, no crop, no border.
Lighting/mood: even soft studio lighting on subject only, sober and humane, no cast shadow or contact shadow on the key.
Color palette: tan burlap, muted grey-brown damp stains; do not use chroma green in the subject.
Materials/textures: woven hessian, soft lumpy filled fabric, subtle water darkening, no mud splatter that looks like gore.
Constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background with crisp edges.
Avoid: readable text, numbers, logos, brands, gore, blood, people, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```

## DRESS_Festival_Bunting

Flat key: `#ff00ff`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Festival_Bunting, a horizontal string of triangular pennant flags / bunting, warm mixed harbour colours, gently swagged, instantly reads celebration.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal, because the subject may include green flags.
Subject: one horizontal cord with many triangular pennant flags, alternating warm harbour colours including red ochre, golden yellow, teal, blue, off-white, and a small amount of green; no writing or symbols.
Style/medium: warm painterly stylised realism matching a dusk-harbour life-sim game asset; clean silhouette, production sprite cutout.
Composition/framing: full bunting centered across the image, gently sagging swag, generous margin on all sides, no crop, no border.
Lighting/mood: even soft studio lighting on subject only, cheerful but modest, no cast shadow or contact shadow on the key.
Color palette: warm harbour festival colours, slightly weathered cloth, avoid chroma magenta in subject.
Materials/textures: cloth pennants with subtle weave and soft folds, thin rope cord.
Constraints: background must be one uniform #ff00ff with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background with crisp edges.
Avoid: readable text, numbers, logos, brands, gore, blood, people, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```

## DRESS_Festival_Lantern

Flat key: `#00ff00`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Festival_Lantern, a single hung paper festival lantern with warm glow and a simple cord at top.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one round paper festival lantern hanging from a short dark cord, ribbed paper shade, small tassel below, warm internal amber glow, no writing or symbols.
Style/medium: warm painterly stylised realism matching a dusk-harbour life-sim game asset; clean silhouette, production sprite cutout.
Composition/framing: full lantern centered vertically, generous margin on all sides, no crop, no border.
Lighting/mood: even soft studio lighting plus gentle internal glow, celebratory and modest, no cast shadow or contact shadow on the key.
Color palette: warm red-orange paper, golden amber glow, dark cord, small brass/wood cap; do not use chroma green in subject.
Materials/textures: translucent ribbed paper, slight painted fabric edge, cord fibers, subtle glow without background spill.
Constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background with crisp edges.
Avoid: readable text, numbers, logos, brands, gore, blood, people, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```

## DRESS_Notice_Inspection

Flat key: `#00ff00`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Notice_Inspection, an official posted placard notice on a small board or stake, sober municipal inspection or condemnation notice.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one weathered pale paper placard pinned to a small dark wooden board on a short stake; official layout suggested by an abstract crest block, ruled lines, stamps, and greeked glyph rows only.
Style/medium: warm painterly stylised realism matching a dusk-harbour life-sim game asset; clean silhouette, production sprite cutout.
Composition/framing: full board and stake centered, three-quarter front view, generous margin on all sides, no crop, no border.
Lighting/mood: even soft studio lighting on subject only, sober municipal threat, no cast shadow or contact shadow on the key.
Color palette: aged cream paper, charcoal and muted red abstract marks, weathered brown wood; do not use chroma green in subject.
Materials/textures: curled paper corners, push pins, flat municipal stamp shapes, worn wood grain.
Constraints: all markings must be abstract non-language glyph marks and ruled lines only; no readable words, no letters, no numbers, no logos; background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background with crisp edges.
Avoid: readable text, letters, numbers, logos, brands, gore, blood, people, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```

## DRESS_Notice_Hoarding

Flat key: `#00ff00`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Notice_Hoarding, a redevelopment site hoarding / boarding panel, plywood-and-batten barrier with a faded abstract development render, reads as this block is being taken.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one low wide plywood construction hoarding barrier made of panels and battens, with a faded pasted abstract development render made only of simple building silhouettes, blocks, arrows and blank boxes; no readable text.
Style/medium: warm painterly stylised realism matching a dusk-harbour life-sim game asset; clean silhouette, production sprite cutout.
Composition/framing: full hoarding centered, horizontal barrier shape, slight three-quarter front view, generous margin on all sides, no crop, no border.
Lighting/mood: even soft studio lighting on subject only, sober redevelopment threat, no cast shadow or contact shadow on the key.
Color palette: raw plywood tan, dark battens, muted civic grey-blue poster blocks, faded red/orange warning accents; do not use chroma green in subject.
Materials/textures: plywood grain, nail heads, scuffed pasted render, weathered tape, worn panel edges.
Constraints: all graphic markings must be abstract and non-language only; no readable words, no letters, no numbers, no real brands, no logos; background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background with crisp edges.
Avoid: readable text, letters, numbers, logos, brands, gore, blood, people, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```

## DRESS_Flood_TideLine

Flat key: `#00ff00`

Prompt:
```text
Use case: stylized-concept
Asset type: Three.js browser game transparent event dressing cutout, raw chroma-key source at 1024x1024
Primary request: DRESS_Flood_TideLine, a horizontal high-water tide-line / silt stain decal: dirty water-mark band with soft drip and sediment edge, mostly empty above and below.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: one long horizontal irregular band of flood silt stain, thin grimy water mark, soft drip trails downward, sediment flecks and wavering edge; no wall surface, no frame.
Style/medium: painterly stylised-realism decal for a dusk-harbour life-sim game asset; clean alpha-ready silhouette.
Composition/framing: a wide low horizontal decal across the center, full band visible, generous empty chroma-key space above and below, no crop, no border.
Lighting/mood: even flat lighting, sober flood aftermath, no cast shadow or contact shadow on the key.
Color palette: dirty grey-brown, muted ochre silt, darker damp lower edge; do not use chroma green in subject.
Materials/textures: dried sediment, water stain bloom, small drips and tide scum, no gore-like red tones.
Constraints: background must be one uniform #00ff00 with no shadows, gradients, texture, reflections, floor plane, or lighting variation; subject fully separated from background; keep the mark mostly horizontal and much wider than tall.
Avoid: readable text, numbers, logos, brands, gore, blood, people, fish, debris piles, watermarks, signature, frame, border, cast shadow, contact shadow, reflection.
```
