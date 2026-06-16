# Batch 19 prompts — fx-005 sleep/day-transition visual

Generated with Codex built-in `image_gen` skill (GPT-Image-2), no CLI fallback.
Raw curated sources were copied from `$CODEX_HOME/generated_images/...` into
`tools/gen/source_batch19/`. Final cards are opaque full-screen PNGs post-processed
by `tools/gen/postprocess_batch19.sh`.

## FX_Trans_RestGrain

Smoke-test prompt, generated first:

```text
Use case: stylized-concept
Asset type: Full-screen opaque transition FX card for a Three.js browser game, generated at square 1024x1024.
Primary request: FX_Trans_RestGrain, a soft, even, low-contrast neutral grey-blue mist and grain field for a quiet time-passing dissolve between night and dawn.
Scene/backdrop: Pure atmosphere/light field only, no scenery.
Subject: No subjects, no objects, no buildings, no horizon, no symbols.
Style/medium: Warm painterly stylised realism matching a quiet dusk-harbour life-sim; subtle brush texture and faint film-grain/cloud texture.
Composition/framing: Edge-to-edge full-frame square card, flat even composition, nothing important in corners, no transparent area.
Lighting/mood: Slightly luminous neutral mist, restful and calm, no strobe or contrast flashes.
Color palette: Neutral mid grey-blue, low saturation, low contrast.
Materials/textures: Very soft drifting fog and faint painterly grain, low-frequency detail only.
Text: none.
Constraints: Opaque full rectangle. Pure light/atmosphere field. No readable text, no letters, no numbers, no UI, no watermark.
Avoid: Subjects, objects, recognisable scenery, horizon lines, silhouettes, stars, sun, moon, hard rays, high contrast, saturated color, sharp details, transparent background.
```

## FX_Trans_NightVeil

```text
Use case: stylized-concept
Asset type: Full-screen opaque transition FX card for a Three.js browser game, generated as a square source image.
Primary request: FX_Trans_NightVeil, a deep night field for a sleep/day-transition veil as the game clock rolls past midnight.
Scene/backdrop: Pure atmosphere/light field only, no scenery.
Subject: No subjects, no objects, no buildings, no skyline, no horizon, no symbols.
Style/medium: Warm painterly stylised realism matching a quiet dusk-harbour life-sim; soft painted cloud striations and low-frequency atmospheric texture.
Composition/framing: Edge-to-edge full-frame square card; darkest and densest toward all edges; faint cool moon/starlight glow softening the upper area; nothing important in corners.
Lighting/mood: Calm, heavy, restful eyes-closing veil, dark enough to nearly cover the screen at full opacity.
Color palette: Indigo and blue-black, near-black edges, faint cool desaturated upper glow.
Materials/textures: Gentle painterly cloud striations, soft low-frequency gradients, no sharp detail.
Text: none.
Constraints: Opaque full rectangle. Pure light/atmosphere field. No readable text, no letters, no numbers, no UI, no watermark.
Avoid: Subjects, objects, recognisable scenery, horizon lines, silhouettes, stars as distinct points, moon disc, buildings, high contrast flashes, saturated color, sharp details, transparent background.
```

## FX_Trans_DawnVeil

```text
Use case: stylized-concept
Asset type: Full-screen opaque transition FX card for a Three.js browser game, generated as a square source image.
Primary request: FX_Trans_DawnVeil, a warm dawn light field for the morning-coming half of a sleep/day-transition veil.
Scene/backdrop: Pure atmosphere/light field only, no scenery.
Subject: No subjects, no objects, no buildings, no skyline, no horizon, no symbols.
Style/medium: Warm painterly stylised realism matching a quiet dusk-harbour life-sim; soft morning mist and very faint low light-rays.
Composition/framing: Edge-to-edge full-frame square card; brightest and warmest from the top, easing downward into gentle haze; broad vertical/radial gradient; nothing important in corners.
Lighting/mood: Hopeful, gentle, golden dawn wash, quiet and restful, never flashy.
Color palette: Soft amber, pale gold, muted rose, warm cream highlights; avoid saturated orange.
Materials/textures: Faint morning mist, very soft low-frequency rays, painterly atmospheric texture, no sharp detail.
Text: none.
Constraints: Opaque full rectangle. Pure light/atmosphere field. No readable text, no letters, no numbers, no UI, no watermark.
Avoid: Subjects, objects, recognisable scenery, horizon lines, silhouettes, sun disc, buildings, hard beams, high contrast flashes, saturated orange, sharp details, transparent background.
```
