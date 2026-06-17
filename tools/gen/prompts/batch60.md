# Batch 60 Prompts

Key colour: MAGENTA #ff00ff for all three (black-bronze cormorant, blue-grey heron,
brown/green/chestnut/white mallard ducks, dull ochre bills/legs, grey weathered timber —
no magenta/hot-pink anywhere on any subject, so nothing reads as the key).

Driven one-image-per-`codex exec` invocation (reads-forbidden), three attempts per bird,
harvested the cleanest locally — the burst sidesteps codex burning its turn `sed`-reading
the imagegen SKILL.md before calling `image_gen`. Each invocation was wrapped:

> You already know the image_gen skill — do NOT read SKILL.md or any file, do NOT inspect
> references, begin the image_gen call immediately. Generate exactly ONE image with image_gen
> (<size> size), prompt: <P> . That is the only thing to do; after the image is generated you
> are done.

Sizes: cormorant = square (1024x1024), heron = portrait (1024x1536), ducks = landscape
(1536x1024). The cormorant and heron are PERCHED/STANDING birds (the orchestrator perches
them on the sea-wall coping, the perched-gull idiom — feet on the image bottom, NO contact
shadow); the ducks FLOAT (the near-craft idiom — waterline on the image bottom, sat on the
water surface, NO contact shadow).

## PROP_Bird_Cormorant_raw.png  (square 1024x1024)

"Painterly game-art sprite, not photoreal. A single great cormorant seabird perched upright with its dark wings held half-spread out to dry in the classic heraldic cormorant pose, seen from a front-three-quarter view at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the bird filling most of the frame. Glossy blackish-bronze plumage, a long hook-tipped dull-yellow and grey bill, a slim S-curved neck, dark webbed feet together as if gripping a flat ledge. Honest working-harbour wildlife. Muted weathered period-harbour palette — black-bronze feathers, dull yellow-grey bill, NO bright colour, NO pink. Flat even diffuse overcast light. The bird's feet rest along the BOTTOM of the image. SQUARE framing. No wall, no post, no water, no scenery, no second bird, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the cormorant."

## PROP_Bird_Heron_raw.png  (portrait 1024x1536)

"Painterly game-art sprite, not photoreal. A single grey heron wading bird standing tall and still, its long neck folded into a hunched S, a long dagger-like bill, long thin legs, seen from the side at a natural standing eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the bird filling most of the frame. Soft blue-grey back and wings, a pale off-white neck and head with a black eye-stripe and thin dark crest plume, dull ochre-yellow legs and bill. Honest working-harbour wildlife, patient and watchful. Muted weathered period-harbour palette — blue-grey, off-white, charcoal, dull ochre, NO bright colour, NO pink. Flat even diffuse overcast light. The heron's feet rest along the BOTTOM of the image. PORTRAIT framing, tall and narrow. No wall, no water, no scenery, no second bird, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the heron."

## PROP_Bird_Ducks_raw.png  (landscape 1536x1024)

"Painterly game-art sprite, not photoreal. A small raft of three mallard ducks floating together on calm water, seen from a low front-three-quarter eye level, centred on a SOLID PURE-MAGENTA #ff00ff background, the ducks filling most of the frame. One drake with a bottle-green head, a thin white neck-ring, a chestnut breast and pale grey body, and two mottled-brown hens, all sitting low on the waterline with folded wings and dull-yellow bills. Honest working-harbour wildlife. Muted weathered period-harbour palette — green-black, chestnut, grey-brown, off-white, dull yellow, NO bright colour, NO pink. Flat even diffuse overcast light. The ducks' waterline rests along the BOTTOM of the image. LANDSCAPE framing, wide and low. No wall, no scenery beyond the birds, no second group, no cast shadow, no text, no letters, no numbers, no watermark. Solid flat magenta fill everywhere except the three ducks."
