# Batch 14 Prompts — condition FX vignette cards

Generated with codex built-in `image_gen` / GPT-Image-2. Raw curated sources are kept in
`tools/gen/source_batch14/`; finals are post-processed with `tools/gen/postprocess_batch14.sh`.

## FX_Cond_LowEnergy

Use case: stylized-concept
Asset type: 1024x1024 full-screen game overlay source card for post-processing into RGBA alpha vignette
Primary request: FX_Cond_LowEnergy — tiredness creeping in. Create a full-bleed atmospheric vignette card: a soft warm dark amber-brown mood pooling from all four edges and corners, with a wide buttery falloff toward a bright near-white clear centre. Gentle, readable as "you should rest soon".
Style: warm painterly stylized realism matching a dusk-harbour life-sim, smooth cinematic gradient, subtle organic brush texture only in the darker edges.
Composition: square 1024x1024, pure atmosphere only, clear radial centre occupying a broad gameplay-view window, edge tint strongest at corners and outer border.
Critical constraints: centre must be near-white / very light value; no text, no icons, no UI chrome, no objects, no people, no faces, no logos, no frame, no perspective lines, no horror, no red/blood. Single full-screen non-tiling card.

## FX_Cond_Burnout

Use case: stylized-concept
Asset type: 1024x1024 full-screen game overlay source card for post-processing into RGBA alpha vignette
Primary request: FX_Cond_Burnout — exhaustion / running on empty. Create a full-bleed atmospheric vignette card: a heavier desaturated sickly grey-green / teal-grey mood darkening the edges and reaching further toward the centre than the low-energy version. Weight the vignette a little more along the top and bottom edges, like drooping eyelids, while keeping the middle bright and clear.
Style: painterly stylized realism for a dusk-harbour life-sim, drained and muted but not alarming, smooth cinematic falloff, subtle organic texture only in the dark edge areas.
Composition: square 1024x1024, pure atmosphere only, broad bright centre window, darkest at corners plus top/bottom edges.
Critical constraints: centre must be near-white / very light value for transparent gameplay view after luminance-to-alpha; no text, no icons, no UI chrome, no objects, no people, no faces, no logos, no border frame, no perspective lines, no red, no blood, no horror. Single full-screen non-tiling card.

## FX_Cond_ColdWet

Use case: stylized-concept
Asset type: 1024x1024 full-screen game overlay source card for post-processing into RGBA alpha vignette
Primary request: FX_Cond_ColdWet — cold / wet exposure. Create a full-bleed atmospheric vignette card: a cool slate-blue / grey mood pooling at the edges and corners, with a bright clear near-white centre. Add a faint misted, frosted quality at the edges and a few soft lighter condensation-droplet smudges pooling in the corners, suggested and diffuse rather than literal raindrops.
Style: painterly stylized realism for a dusk-harbour life-sim, cool harbour-weather exposure, smooth cinematic falloff, soft mist texture only near the edges.
Composition: square 1024x1024, pure atmosphere only, wide bright centre window, cool tinted corners and outer border.
Critical constraints: centre must be near-white / very light value for transparent gameplay view after luminance-to-alpha; no text, no icons, no UI chrome, no objects, no people, no faces, no logos, no border frame, no perspective lines, no horror, no gore. Single full-screen non-tiling card.
