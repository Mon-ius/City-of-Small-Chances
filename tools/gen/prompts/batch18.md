# Batch 18 Prompts — Tools & Wheels of Work

Generated with Codex built-in `image_gen` skill (GPT-Image-2), then post-processed from chroma-key sources with `tools/gen/postprocess_batch18.sh`.

Smoke test first:
- `PROP_Job_Boots` generated first and landed at `/Users/monius/.codex/generated_images/019ecda7-3f78-71d1-9018-5d37776e2e12/ig_03c68236e2d9ad54016a308d396b48819190b856bc9052c431.png`, then copied to `tools/gen/source_batch18/PROP_Job_Boots.png`.

Shared constraints for all prompts:
- Use case: `background-extraction`
- Asset type: Three.js browser game prop sprite cutout, 1024x1024 source for transparent PNG post-processing.
- Style: warm painterly stylised realism, believable texture, readable silhouette, game prop billboard.
- Composition: full subject in frame with clear margin on all sides, centred, clean silhouette.
- Lighting: even soft warm dusk-harbour light on the object only; no cast shadow, no contact shadow, no floor plane.
- Chroma key: perfectly flat solid key background only, no shadows, gradients, texture, reflections, floor plane, or lighting variation.
- Text: none.
- Avoid: readable text, real brands, logos, number plates, route numbers, borders, watermarks, background scenery, floor planes, drop shadows, cropped subjects.

## PROP_Job_Boots

Key: `#00ff00`

Prompt: a pair of steel-toe work boots for a labour-job safety gear prop. Subject is two scuffed steel-toe work boots set as a pair, three-quarter view, worn practical leather, honest harbour labour gear, not luxury and not new. Warm dark brown leather, muted tan worn edges, dull steel toe hints, cool dusk accents; do not use `#00ff00` in the subject. Scuffed leather, creased uppers, worn soles, dull metal toe caps implied, practical laces. Avoid readable text, brands, logos.

## PROP_Vehicle_Scooter

Key: `#00ff00`

Prompt: a small delivery scooter/moped in clean left-facing side profile with a simple delivery box on the back. Subject is a worn practical delivery scooter/moped, exact left-facing side profile, simple rear cargo box, courier's step up from a bike, working harbour vehicle, honest and slightly used. Warm muted red-brown or ochre body panels, dark tires, dull metal, scuffed paint; do not use `#00ff00` in the subject. Rubber tires, worn painted metal, scratched plastic, plain delivery box. Avoid readable text, brands, logos, number plates.

## PROP_Vehicle_Van

Key: `#00ff00`

Prompt: a small panel delivery van in clean left-facing side profile with plain unmarked panels. Subject is a compact harbour delivery panel van, exact left-facing side profile, plain unmarked side panels, honest working vehicle, slightly dented and scuffed, practical not flashy. Faded warm cream or muted ochre panels, grey bumpers, dark tires, dull metal; do not use `#00ff00` in the subject. Worn painted metal, small dents, dusty tires, plain windows, no license plate detail. Avoid readable text, brands, logos, number plates.

## PROP_Vehicle_Tram

Key: `#00ff00`

Prompt: a single tram or small city bus carriage in clean left-facing side profile with a windowed flank and overhead pole. Subject is a compact public-transit tram carriage, exact left-facing side profile, windowed flank, simple overhead pole, plain unbranded livery, practical city harbour transit option, slightly worn but cared for. Muted cream and warm red-brown panels, dark windows, dull metal rails and wheels; do not use `#00ff00` in the subject. Painted metal, dusty window glass, subtle panel seams, old rubber seals, no visible route plate. Avoid readable route text, route numbers, brands, logos, number plates.

## PROP_Job_Scanner

Key: `#00ff00`

Prompt: a handheld parcel/barcode scanner for delivery and warehouse job tasks, blank screen. Subject is a handheld barcode or parcel scanner, three-quarter view, practical warehouse tool, blank dark screen, no readable display, worn from use. Dull charcoal plastic, muted warm grey grip, small worn amber button accents; do not use `#00ff00` in the subject. Scuffed plastic, rubberized grip, blank glass screen, small unlabelled buttons. Avoid readable text, numbers, brands, logos, barcode graphics.

## PROP_Job_MopBucket

Key: `#ff00ff`

Prompt: a mop resting in a wheeled wringer bucket for cleaning and service job tasks. Subject is a well-used mop leaning into a wheeled wringer bucket, three-quarter view, damp practical cleaning gear, not new, not flashy. Muted yellow ochre bucket, dull grey wringer, off-white mop strands, dark small wheels; do not use `#ff00ff` in the subject. Damp cotton mop head, scratched plastic bucket, metal wringer, rubber wheels, honest wear. Avoid readable text, brands, logos, caution labels.
