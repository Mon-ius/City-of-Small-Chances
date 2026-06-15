# Batch 4 GPT-Image-2 prompts: NPC portraits

Generated with Codex built-in `image_gen` (GPT-Image-2), not the CLI fallback. Mei/familiar was generated first as the required smoke test; the PNG landed in `$CODEX_HOME/generated_images/019ecb9d-c20c-7c73-a86f-4fdd12a36c37/` and was copied to `tools/gen/source_batch4/Mei_familiar.png`.

All sources were generated as square portrait cutouts on a flat chroma-key background, then copied to `tools/gen/source_batch4/` for the re-runnable local post-process step.

Each prompt used this exact shared envelope, with the `Primary request`, `Subject`, `Expression`, `Composition`, and chroma-key hex replaced by the per-asset fields below:

```text
Use case: stylized-concept
Asset type: NPC dialogue portrait for a Three.js browser game, final will be cut out as transparent UI art
Primary request: Create <NPC>, <tier> closeness tier, as a square 1024x1024 head-and-shoulders portrait on a perfectly flat solid <key> chroma-key background.
Art direction: City of Small Chances, stylised realism, believable working-class harbour city person, slightly painterly texture treatment, warm cinematic dusk key light with subtle cool harbour fill, polished but not photorealistic.
Subject: <subject line>
Expression: <expression line>
Composition: <composition line>
Background removal constraints: background must be one uniform <key> fill with no shadows, no gradient, no texture, no reflections, no floor plane, and no lighting variation. Do not use <key> anywhere in the subject. No cast shadow, no contact shadow, no watermark, no text, no logos.
Quality constraints: colour-blind-safe distinct identity through face shape, age, hair, build and clothing, not only hue. Painterly stylised realism matching warm dusk harbour game assets.
```

## Mei

Key: `#00ff00`

Subject used for `stranger` and `trusted`: Mei Lin, middle-aged East Asian noodle-stall shop owner, sturdy practical build, dark hair pinned back with a few loose wisps, apron over muted work shirt, sleeves rolled, steam-warmed face, subtle apron trim or neck cloth in accent #e0833c. Keep this exact clothing and identity consistent with her familiar and trusted portraits.

Subject used for `familiar`: Mei Lin, middle-aged noodle-stall shop owner, East Asian woman, sturdy practical build, apron over work clothes, sleeves rolled, steam-warmed face, kind but busy presence. Accent colour #e0833c appears subtly in apron trim or scarf detail, never as text or logo.

Composition: front-facing, centered, chest-up framing, readable silhouette, head and shoulders comfortably inside square frame with generous padding for trim. The familiar smoke-test additionally included: Same identity/clothing should be reusable for stranger and trusted variants.

- `stranger`: guarded, appraising, reserved, a cool sizing-you-up look over the stall counter, mouth neutral.
- `familiar`: familiar tier only: warmer than guarded, a flicker of recognition, the start of a half-smile, still practical and busy.
- `trusted`: open, relaxed, genuine warm expression, the look of someone who saved you the good broth.

## Jun

Key: `#00ff00`

Subject: Jun Park, Korean courier dispatcher and employer, sharp and busy, lean angular face, short practical dark hair, practical dark courier jacket layered over work shirt, cross-body radio strap or dispatch lanyard with no text, a clipboard edge visible at chest level, subtle accent #3f96c9 on jacket piping or strap. Keep this exact clothing and identity consistent across tiers.

Composition: front-facing, centered, chest-up framing, readable silhouette, head and shoulders comfortably inside square frame with generous padding for trim.

- `stranger`: guarded, appraising, reserved, impatient look from someone who has not looked up from the clipboard, mouth set.
- `familiar`: warmer, a flicker of recognition, the start of a half-smile, still alert and time-pressed.
- `trusted`: open, relaxed, genuine warm expression, confident look for someone reliable she wants on the best route.

## Rafiq

Key: `#00ff00`

Subject: Rafiq Hassan, dockyard lead hand and employer, middle-aged South Asian or Middle Eastern man, sturdy broad build, weathered face, close-cropped dark hair with some grey, short trimmed beard, heavy work jacket with hi-vis safety collar or vest edge, rugged shirt, subtle accent #c9a23f in safety trim. Keep this exact clothing and identity consistent across tiers.

Composition: front-facing, centered, chest-up framing, readable silhouette, broad shoulders comfortably inside square frame with generous padding for trim.

- `stranger`: guarded, appraising, reserved, watchful as if keeping one eye on cranes and yellow lines.
- `familiar`: warmer, a flicker of recognition, the start of a half-smile, still cautious and responsible.
- `trusted`: open, relaxed, genuine warm expression, protective confidence, the look of someone who will keep you on shift and keep you safe.

## Tomo

Key: `#ff00ff`

Subject: Tomo Sato, older Japanese quayside mechanic and trainer, wiry build, weathered face, grey hair under a work cap, grease-smudged cheek, dark work overalls over a rolled-sleeve shirt, careful hands partly visible at chest height holding a small wrench or rag, subtle teal accent #56b89a on a patch or undershirt. Keep this exact clothing and identity consistent across tiers.

Composition: front-facing, centered, chest-up framing, readable silhouette, cap and shoulders comfortably inside square frame with generous padding for trim.

- `stranger`: guarded, appraising, reserved, gruff and careful, as if warning you not to touch a calibrated part.
- `familiar`: warmer, a flicker of recognition, the start of a half-smile under a gruff exterior, as if asking you to hand him the 8mm.
- `trusted`: open, relaxed, genuine warm expression, gruff-kind teacher letting his patience show.

## Clara

Key: `#00ff00`

Subject: Clara Wen, civic-clinic front desk administrator and trainer, Chinese woman in her thirties or forties, composed but tired, neat shoulder-length dark hair tied back or tucked behind ears, clinic-admin cardigan or clean practical blouse, ID badge shape with no readable text, folder or clipboard edge at chest height, subtle accent #8a7fd6 on cardigan trim or lanyard. Keep this exact clothing and identity consistent across tiers.

Composition: front-facing, centered, chest-up framing, readable silhouette, head and shoulders comfortably inside square frame with generous padding for trim.

- `stranger`: guarded, appraising, reserved, professionally distant as she slides a clipboard across the desk.
- `familiar`: warmer, a flicker of recognition, the start of a half-smile, tired but caring, inviting you to sit down anyway.
- `trusted`: open, relaxed, genuine warm expression, discreetly protective, as if quietly helping you skip the queue.

## Ava

Key: `#00ff00`

Subject: Ava Reid, tenant advocate and neighbour, warm and determined, woman in her late twenties or thirties, medium build, curly or wavy auburn-brown hair tied loosely back, casual layered jacket over simple top, a folder of forms tucked to her chest with no readable text, subtle accent #d6738a on scarf, pin, or folder tab. Keep this exact clothing and identity consistent across tiers.

Composition: front-facing, centered, chest-up framing, readable silhouette, hair and shoulders comfortably inside square frame with generous padding for trim.

- `stranger`: guarded, appraising, reserved, alert stairwell look as she clocks a new tenant and weighs whether they need advice.
- `familiar`: warmer, a flicker of recognition, the start of a half-smile, kettle-on neighbour energy with determined eyes.
- `trusted`: open, relaxed, genuine warm expression, steady and determined as she invites you to sit and explain the situation together.
