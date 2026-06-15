# Batch 1 GPT-Image-2 prompts

Generated with Codex built-in `image_gen` (GPT-Image-2), not the CLI fallback.

## Cobblestone

Use case: stylized-concept
Asset type: seamless game texture source, 1024x1024 square albedo for Three.js harbour environment
Primary request: Painterly seamless tileable cobblestone quay ground texture for a stylised dusk harbour.
Scene/backdrop: top-down flat surface texture only, no horizon, no objects, no border.
Subject: rounded wet harbour cobblestones with narrow dark grout, weathered edges, subtle damp sheen, believable irregular stone sizes.
Style/medium: stylised realism, slightly painterly hand-finished texture, game-ready albedo, not photorealistic.
Composition/framing: perfectly top-down orthographic, evenly distributed stones, seamless repeat on all four edges, no perspective, no vignette, no frame.
Lighting/mood: evenly lit diffuse albedo with no single light source, no cast shadows, dusk harbour mood.
Color palette: cobblestone dark #4a4e54, mid #6b7078, light #8b9099; restrained cool grey with slight wet highlights.
Materials/textures: stone pitting, worn rounded corners, dark grout cavities, subtle water darkening, no puddles as focal objects.
Constraints: must tile seamlessly; generate at 1024x1024; no text, no watermark, no border, no perspective, no directional lighting, no baked hard shadows.
Avoid: obvious repeating symbols, large unique landmark stones, cracks crossing the whole tile, strong gradients, corner decorations.

## PlankWood

Use case: stylized-concept
Asset type: seamless game texture source, 1024x1024 square albedo for Three.js harbour environment
Primary request: Painterly seamless tileable weathered dock plank wood texture for a stylised dusk harbour.
Scene/backdrop: top-down flat wood-board surface texture only, no props, no horizon, no border.
Subject: old harbour dock boards with visible grain, plank gaps, nail marks, scuffs, salt-weathered wear, subtle damp areas.
Style/medium: stylised realism, slightly painterly game-ready albedo, hand-finished but believable.
Composition/framing: perfectly top-down orthographic; boards run horizontally across the tile; plank widths vary subtly; seamless repeat on all four edges; no perspective, no vignette, no frame.
Lighting/mood: evenly lit diffuse albedo with no single light source, no cast shadows, dusk harbour mood.
Color palette: plank wood dark #5a3f28, mid #7a5a3c, light #9c7d5a; warm weathered brown, not orange.
Materials/textures: wood grain, worn edges, small nail heads, dark plank seams, salt stains, gentle water darkening.
Constraints: must tile seamlessly; generate at 1024x1024; no text, no watermark, no border, no perspective, no directional lighting, no baked hard shadows.
Avoid: diagonal boards, large unique knots dominating the tile, heavy black cracks, bright fresh lumber, strong gradients, corner decorations.

## Plaster

Use case: stylized-concept
Asset type: seamless game texture source, 1024x1024 square albedo for Three.js harbour environment
Primary request: Painterly seamless tileable aged stucco plaster facade texture for a stylised dusk harbour building.
Scene/backdrop: flat wall surface texture only, no windows, no doors, no trim, no horizon, no border.
Subject: old warm plaster facade with fine cracks, trowel marks, water stains, salt weathering, subtle chipped areas exposing darker underlayer.
Style/medium: stylised realism, slightly painterly game-ready albedo, believable but not photoreal.
Composition/framing: perfectly front-on orthographic flat texture; even distribution of cracks and stains; seamless repeat on all four edges; no perspective, no vignette, no frame.
Lighting/mood: evenly lit diffuse albedo with no single light source, no cast shadows, warm dusk harbour tone.
Color palette: plaster dark #6e5f4a, mid #a8967c, light #c9b79c; warm stone and stucco neutrals.
Materials/textures: rough stucco grain, hairline cracks, vertical water stains, softened chipped patches, hand-painted surface variation.
Constraints: must tile seamlessly; generate at 1024x1024; no text, no graffiti, no watermark, no border, no perspective, no directional lighting, no baked hard shadows.
Avoid: bricks, stones, large unique holes, strong dirty streaks at only one edge, obvious repeating symbols, strong gradients, corner decorations.

## Water

Use case: stylized-concept
Asset type: seamless game texture source, 1024x1024 square albedo for Three.js harbour environment
Primary request: Painterly seamless tileable deep teal harbour water surface texture for a stylised dusk harbour.
Scene/backdrop: top-down flat water surface texture only, no boats, no dock, no shoreline, no horizon, no border.
Subject: dark teal harbour water with gentle small ripples, subtle foam flecks, mild wavelets suitable for scrolling and animated normal maps.
Style/medium: stylised realism, slightly painterly game-ready albedo, smooth but detailed.
Composition/framing: perfectly top-down orthographic; evenly distributed ripple pattern; seamless repeat on all four edges; no perspective, no vignette, no frame.
Lighting/mood: evenly lit diffuse albedo, no single light source, no strong reflection direction, dusk harbour mood.
Color palette: harbour water dark #1f3a3d, mid #3d6b66, foam #b8c9c4 used sparingly; deep cool teal with muted pale highlights.
Materials/textures: soft ripples, shallow wave interference, tiny foam traces, slight painterly brush motion.
Constraints: must tile seamlessly; generate at 1024x1024; no text, no watermark, no border, no perspective, no directional lighting, no baked hard shadows.
Avoid: large waves, ocean surf, visible sky reflections, sun glints, objects, fish, debris, strong gradients, corner decorations.

## WindowAtlas

Use case: stylized-concept
Asset type: game texture source, 1024x1024 square window atlas for Three.js harbour buildings
Primary request: Clean 4x4 atlas grid of distinct harbour building window variants, albedo texture for stylised dusk harbour.
Scene/backdrop: transparent-looking dark neutral atlas background inside each cell, but output as normal opaque image; no full building facade, only individual windows.
Subject: sixteen distinct windows: mixed lit and unlit panes, old harbour building frames, simple shutters or trim variations, warm glow in some glass and dark cool glass in others.
Style/medium: stylised realism, slightly painterly game-ready atlas, readable at small size.
Composition/framing: exact 4x4 grid, evenly spaced cells, one centered window per cell, consistent scale, straight orthographic front view, clean padding around each window, no perspective, no vignette.
Lighting/mood: dusk harbour; lit panes glow warm #ffcf8a/#ffd9a0, unlit panes are dark muted blue-grey/teal; frames remain diffuse.
Color palette: plaster/wood frame neutrals #6e5f4a #7a5a3c #a8967c; warm lit windows #ffcf8a; cool dark glass that contrasts by value.
Materials/textures: painted wood frames, old glass, subtle grime, simple metal latches, varied pane divisions.
Text (verbatim): none.
Constraints: generate at 1024x1024; clean 4x4 atlas; no text, no watermark, no perspective, no shadows cast outside cells, no decorative border around the full atlas.
Avoid: full houses, curtains with readable patterns, signage, people, plants, diagonal camera angle, overlapping cells, irregular grid spacing.
