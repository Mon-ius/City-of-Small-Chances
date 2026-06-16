# Batch 21 Prompts — Weather FX Cards

Generation mode: built-in `image_gen` skill (GPT-Image-2), bright weather features on near-black full-frame square sources. `FX_Weather_Fog` was generated first as the smoke test; PNG landed in `/Users/monius/.codex/generated_images/019ecdf1-75ef-7b02-bfb0-efd68df153df/`.

Shared constraints for all three cards:
- Use case: `stylized-concept`
- Asset type: full-screen weather FX overlay source card for a Three.js browser game.
- Scene/backdrop: pure weather/atmosphere field only, near-black background, no scenery, no horizon, no floor, no subjects.
- Style/medium: warm painterly stylised realism, grounded working-port weather, atmospheric and restrained.
- Composition/framing: full-frame edge-to-edge square texture, overlay friendly, no border; dark corners and no central object.
- Color palette: near-black background with cool pale grey-blue / cool-white weather features so luminance can become alpha.
- Constraints: no text, no people, no buildings, no boats, no scenery, no horizon, no lightning, no strobe, no watermark.

## FX_Weather_Fog

Primary request: a soft cool grey-blue fog and mist veil as bright mist features on a near-black background for luminance-derived alpha.

Subject: low-frequency drifting harbour fog, denser toward the bottom like ground and water mist rising, easing thinner toward the top, with gentle internal wisps and dark transparent gaps.

Constraints: subtle bottom-heavy density only; no rain streaks, no clumping, no theatrical smoke.

## FX_Rain_Streaks

Primary request: fine evenly distributed pale rain streaks as bright features on a near-black background for luminance-derived alpha.

Subject: thin slightly motion-blurred near-vertical rain streaks with a subtle diagonal slant, pale cool-white, varied short and medium lengths, light and airy drift of rain.

Constraints: uniform coverage top-to-bottom and left-to-right for seamless scrolling; no gradient, no clumping, no heavy downpour, no droplets, no splashes, no fog blobs.

## FX_Rain_Mist

Primary request: a light wispier rain-haze and spray layer as delicate bright wisps on a near-black background for luminance-derived alpha.

Subject: faint near-white cool wisps, a soft overall haze, rain spray suspended in air, thinner and airier than fog, mostly dark with delicate bright wisp lines and cloudlets.

Constraints: mostly transparent after processing; lighter than `FX_Weather_Fog`; no dense fog bank, no rain streak field, no droplets, no splashes.
