# Batch 5 GPT-Image-2 prompts: district-kit surfaces

Generated with Codex built-in `image_gen` (GPT-Image-2), not the CLI fallback. `ENV_Dockside_Yard` was generated first as the required smoke test; the PNG landed in `$CODEX_HOME/generated_images/019ecc20-4e7a-75b3-a59d-97e048fb86e9/` and was copied to `tools/gen/source_batch5/ENV_Dockside_Yard_albedo.png`.

All sources are opaque full-bleed square albedo generations with no chroma key and no transparency. The built-in renderer returned 1254x1254 PNGs; `tools/gen/postprocess_batch5.sh` makes them seamless, resizes to 512x512, derives OpenGL Y+ normal maps, and packs ORM maps.

Each prompt used this shared envelope, with the `Primary request`, `Composition`, `Lighting/color`, and `Avoid` fields adjusted per surface:

```text
Use case: stylized-concept
Asset type: opaque tileable PBR material albedo for a Three.js stylised harbour-city game, source generation 1024x1024 or larger square, final material will be post-processed to 512x512.
Primary request: <surface-specific material request>
Art direction: City of Small Chances; stylised realism; warm dusk harbour city; believable urban surface with readable painterly texture, not photorealistic.
Composition: full-bleed square material filling the entire frame edge to edge; flat top-down or face-on orthographic view; no horizon, no perspective, no border; pattern suitable for seamless tiling.
Lighting/color: even diffuse albedo/base-colour lighting only, no baked directional light, no strong cast shadows, no vignette; <surface-specific palette>.
Technical constraints: albedo/base color only; opaque; no chroma key; no alpha; no transparency; no normal-map colors; no ORM map; no labels or readable text.
Avoid: objects, people, UI elements, logos, signage, watermark, frame, bevelled edges, large unique non-repeating features, strong shadows, perspective depth.
```

## The Tenements

- `ENV_Tenements_Courtyard`: worn concrete-and-brick courtyard paving with cracked slabs, damp patches, moss in the joints, scattered grime; cool grey-brown and low value range. Flat top-down orthographic view. Avoid trash as focal props and drains as focal points.
- `ENV_Tenements_Facade`: peeling painted render over brick on a stacked low-rent apartment block; flaking paint, water stains, exposed brick patches, faded ochre and grey render. Plain tiling wall material, no windows. Flat face-on orthographic wall view. Avoid windows, doors, balconies, pipes, cables, signs, and readable posters.

## Market Row

- `ENV_MarketRow_Street`: wet cobbled market street with rounded setts, oil-stained sheen, small shallow puddles catching warm dusk light, trodden grime; dark wet cobble with warm reflections. Flat top-down orthographic view. Avoid market goods, crates, trash as focal props, and drains as focal points.
- `ENV_MarketRow_Shopfront`: layered shopfront material with painted timber boards, tiled stall base strips, weathered shutter slats, and faded torn posters; warm painted wood plus ceramic tile, busy market street character. Flat face-on orthographic wall view. Avoid windows, doors, display merchandise, food, readable posters, and signs with text.

## Dockside Yards

- `ENV_Dockside_Yard`: concrete container yard surface with worn painted yellow safety lines, tyre marks, oil stains, expansion joints, mid-grey concrete, industrial dockside working-yard character. Flat top-down orthographic view. This was the smoke-test generation.
- `ENV_Dockside_Containers`: stacked shipping-container flank material with ribbed corrugated steel, painted panels, rust streaks, weld seams, faded cargo paint; faded blue, red, and green steel. Flat face-on orthographic wall view. Avoid readable container labels, numbers, brand logos, doors as focal objects, locks, people, and vehicles.

## Civic Quarter / Uptown

- `ENV_Uptown_Floor`: polished civic stone floor with large pale tiles, subtle grey veining, faint soft reflections, clean grout lines; light warm institutional stone. Flat top-down orthographic view. Avoid furniture, rugs, drains, and decorative symbols.
- `ENV_Uptown_Glass`: glass office curtain-wall material with mullioned reflective tinted panels in brushed metal frames, faint dusk sky reflection; cool blue-grey glass and clean metal mullions. Flat face-on orthographic wall view; regular repeatable curtain-wall grid. Avoid interior rooms, furniture, people silhouettes, readable signs, and logos.
