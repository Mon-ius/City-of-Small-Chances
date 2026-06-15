# Batch 11 prompts — harbour prop surfaces + job-task prop cutouts

Generated with Codex built-in `image_gen` skill (GPT-Image-2), no CLI fallback.
Raw curated generations are kept in `tools/gen/source_batch11/`.

## Smoke test

### PROP_Harbour_Crate_albedo

Use case: stylized-concept
Asset type: seamless PBR albedo source texture for a Three.js harbour game, 1024x1024 square.
Primary request: PROP_Harbour_Crate albedo, a wooden shipping-crate face for all cube faces.
Scene/backdrop: none; full-bleed flat material surface only.
Subject: horizontal warm wooden planks with dark metal corner banding and diagonal cross-braces, faded abstract cargo stencil marks made only of simple non-readable shapes.
Style/medium: warm stylised realism, slightly painterly, dusk harbour palette, game texture albedo.
Composition/framing: perfectly face-on orthographic square, no perspective, no border, pattern continues to all edges for seamless tiling.
Lighting/mood: diffuse even light, no cast shadows, no baked directional lighting.
Materials/textures: aged plank wood in warm browns, dark worn metal bands, subtle grime, small scratches.
Constraints: opaque image, no chroma key, no alpha, no readable text, no letters, no numbers, no logos, no brands. Must be suitable for seamless tiling after post-processing.
Avoid: perspective, object silhouette, floor plane, frame, vignette, strong shadow, readable markings, photoreal harshness.

## Group A — opaque seamless PBR surfaces

### PROP_Harbour_Barrel_albedo

Use case: stylized-concept
Asset type: seamless PBR albedo source texture for a Three.js harbour game, 1024x1024 square.
Primary request: PROP_Harbour_Barrel albedo, a barrel-stave wrap surface.
Scene/backdrop: none; full-bleed flat material surface only.
Subject: vertical slightly curved warm wooden barrel staves bound by two dark horizontal metal hoops, aged harbour storage barrel surface.
Style/medium: warm stylised realism, slightly painterly, game texture albedo.
Composition/framing: perfectly flat orthographic square; staves run top to bottom; hoops run left to right; left and right edges must match visually for horizontal cylinder wrapping; no object outline, no top or bottom cap.
Lighting/mood: diffuse even light, no cast shadows, no baked directional lighting.
Materials/textures: warm aged wood, dark worn metal hoops, subtle salt grime, scratches, damp harbour patina.
Constraints: opaque image, no chroma key, no alpha, no readable text, no letters, no numbers, no logos, no brands. Suitable for seamless horizontal tiling and post-process seamless tiling.
Avoid: perspective, full barrel object, floor plane, border, vignette, strong shadow, readable markings.

### ENV_Harbour_Roof_albedo

Use case: stylized-concept
Asset type: seamless PBR albedo source texture for a Three.js harbour building roof, 1024x1024 square.
Primary request: ENV_Harbour_Roof albedo, pitched roof surface.
Scene/backdrop: none; full-bleed flat roof material only.
Subject: rows of weathered clay roof tiles with muted warm terracotta-grey colour, subtle moss and soot, harbour building roof material.
Style/medium: warm stylised realism, slightly painterly, game texture albedo.
Composition/framing: flat top-down orthographic square, repeating rows, no perspective, pattern continues to all edges for seamless tiling in both axes.
Lighting/mood: diffuse even light, no cast shadows, no baked directional lighting.
Materials/textures: aged clay tiles, tar-darkened edges, soot speckles, moss in small cracks, muted terracotta grey.
Constraints: opaque image, no chroma key, no alpha, no readable text, no logos, no brands. Must be suitable for seamless tiling after post-processing.
Avoid: visible building silhouette, sky, gutters, perspective, border, strong shadow, high saturation.

## Group B — chroma-key transparent cutout props

### PROP_Job_Bicycle

Use case: background-extraction
Asset type: transparent prop cutout source for a Three.js billboard/icon, 1024x1024 square.
Primary request: PROP_Job_Bicycle, a delivery bicycle with a front basket/rack.
Scene/backdrop: perfectly flat solid #ff00ff chroma-key background for background removal.
Subject: side-profile delivery bicycle, readable as the courier job possession, sturdy frame, front rack or basket, small rear carrier, practical city tires.
Style/medium: warm stylised realism, slightly painterly, readable silhouette, game prop cutout.
Composition/framing: single centered object, generous padding, full bicycle visible, side profile, no cropping.
Lighting/mood: even diffuse light, soft contact shadow acceptable only if it does not contaminate edges.
Color palette: dark teal or muted green bicycle frame with warm metal/rubber accents; use magenta key because the subject may include green.
Constraints: background must be one uniform #ff00ff with no gradients, texture, reflections, floor plane, or lighting variation. Do not use #ff00ff anywhere in the subject. No logo, no text, no brand.
Avoid: busy scene, rider, readable text, spokes blending into background, green or magenta fringe, heavy shadow, perspective angle.

### PROP_Job_DeliveryBag

Use case: background-extraction
Asset type: transparent prop cutout source for a Three.js billboard/icon, 1024x1024 square.
Primary request: PROP_Job_DeliveryBag, a courier delivery satchel / insulated bag.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: worn canvas courier satchel / square insulated delivery bag with shoulder strap, blank flap, scuffed corners, practical delivery gear.
Style/medium: warm stylised realism, slightly painterly, readable silhouette, game prop cutout.
Composition/framing: single centered object, three-quarter front view, generous padding, no cropping.
Lighting/mood: even diffuse light, soft contact shadow acceptable only if it does not contaminate edges.
Color palette: warm tan canvas, dark brown strap, dull metal buckles, no green on subject.
Constraints: background must be one uniform #00ff00 with no gradients, texture, reflections, floor plane, or lighting variation. Do not use #00ff00 anywhere in the subject. No logo, no text, no brand.
Avoid: busy scene, readable text, green fringe, heavy shadow, extra objects, hands or person.

### PROP_Job_Toolkit

Use case: background-extraction
Asset type: transparent prop cutout source for a Three.js billboard/icon, 1024x1024 square.
Primary request: PROP_Job_Toolkit, an open toolbox with hand tools.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: open metal-and-wood toolbox containing a few clear hand tools: wrench, screwdriver, pliers, small hammer; repair and maintenance trade prop.
Style/medium: warm stylised realism, slightly painterly, readable silhouette, game prop cutout.
Composition/framing: single centered object, three-quarter front view, tools visible above the box, generous padding, no cropping.
Lighting/mood: even diffuse light, soft contact shadow acceptable only if it does not contaminate edges.
Color palette: dark red-brown toolbox, worn steel tools, warm wooden handles, no green on subject.
Constraints: background must be one uniform #00ff00 with no gradients, texture, reflections, floor plane, or lighting variation. Do not use #00ff00 anywhere in the subject. No logo, no text, no brand.
Avoid: busy scene, readable text, green fringe, heavy shadow, extra unrelated objects, hands or person.

### PROP_Job_HiVis

Use case: background-extraction
Asset type: transparent prop cutout source for a Three.js billboard/icon, 1024x1024 square.
Primary request: PROP_Job_HiVis, dock/warehouse safety gear: hi-vis vest plus hard hat.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.
Subject: safety orange hi-vis work vest with reflective silver strips, paired with a dock worker hard hat, arranged as one centered gear prop.
Style/medium: warm stylised realism, slightly painterly, readable silhouette, game prop cutout.
Composition/framing: single centered prop arrangement, vest front-facing and hard hat beside or partly overlapping it, generous padding, no cropping.
Lighting/mood: even diffuse light, soft contact shadow acceptable only if it does not contaminate edges.
Color palette: vest must be safety orange, not yellow-green; reflective strips white/silver; hard hat warm white or muted orange. Do not use green on subject.
Constraints: background must be one uniform #00ff00 with no gradients, texture, reflections, floor plane, or lighting variation. Do not use #00ff00 anywhere in the subject. No logo, no text, no brand.
Avoid: yellow-green vest, busy scene, person/mannequin body, readable text, green fringe, heavy shadow.
