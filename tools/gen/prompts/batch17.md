# Batch 17 Prompts — Market-Stall Goods

Generated with Codex built-in `image_gen` skill (GPT-Image-2), then post-processed from chroma-key sources with `tools/gen/postprocess_batch17.sh`.

Smoke test first:
- `PROP_Market_Sacks` generated first and landed at `/Users/monius/.codex/generated_images/019ecd87-647f-78e1-8a49-72047a9fae7e/ig_02797e34d1c32959016a30850e9f888191982c5a97de3ce6cd.png`, then copied to `tools/gen/source_batch17/PROP_Market_Sacks.png`.

Shared constraints for all prompts:
- Use case: `background-extraction`
- Asset type: Three.js browser game prop sprite cutout, 1024x1024 source for transparent PNG post-processing.
- Style: warm painterly stylised realism, believable texture, readable silhouette, game prop billboard.
- Composition: full subject in frame with clear margin on all sides, centred, side-on / three-quarter front, clean silhouette.
- Lighting: even soft warm dusk-harbour light on the object only; no cast shadow, no contact shadow, no floor plane.
- Chroma key: perfectly flat solid key background only, no shadows, gradients, texture, reflections, floor plane, or lighting variation.
- Text: none.
- Avoid: readable text, real brands, logos, borders, watermarks, background scenery, table surfaces, drop shadows, cropped subjects.

## PROP_Market_Sacks

Key: `#00ff00`

Prompt: low stack of plump grain or rice sacks in coarse hessian, a couple of rows, honestly creased, market-stall bulk goods for a stylised dusk-harbour life-sim. Subject is a low side-on / three-quarter front stack of unlabelled hessian sacks, warm practical harbour palette, generous but honest working-market feeling, no luxury and no squalor. Tan hessian, muted warm browns, subtle cool dusk accents; do not use `#00ff00` in the subject. Coarse woven burlap, seams, tied corners, natural creases, slight dust. Avoid labels, luxury packaging, squalor, spilled grain.

## PROP_Market_BasketVeg

Key: `#ff00ff`

Prompt: woven basket heaped with fresh leafy vegetables and greens: bok choy, cabbage, spring onion, generous and just-picked. Subject is a rustic woven market basket overflowing with leafy green vegetables, honest working-market abundance for Mei's harbour stall. Varied fresh greens, pale cabbage ribs, warm straw basket, subtle harbour warmth; do not use `#ff00ff` in the subject. Woven wicker, leafy crinkles, cabbage folds, spring onion stems, natural vegetable matte texture. Avoid wilting/squalor, cropped leaves, magenta in subject.

## PROP_Market_BasketFruit

Key: `#00ff00`

Prompt: woven basket heaped with warm-toned ripe fruit: oranges, apples, persimmons, instantly readable as fresh market fruit. Subject is a rustic woven basket overflowing with warm fruit, honest working-market abundance for a dusk harbour stall. Oranges, reds, persimmon amber, straw-brown basket, small muted leaf accents only; do not use `#00ff00` in the subject. Woven wicker, varied fruit skins, matte painterly highlights, natural small imperfections. Avoid rotting fruit and green-dominant subject.

## PROP_Market_Crate

Key: `#00ff00`

Prompt: open slatted wooden crate of mixed market goods: root vegetables, a few unlabeled jars of preserves, and a melon, a just-delivered restock object. Subject is a sturdy open slatted wooden crate, side-on / three-quarter front, filled with mixed humble produce and plain jars, working harbour market supply. Weathered warm wood, earthy root-veg oranges and browns, muted melon rind, amber glass, small color variety; do not use `#00ff00` in the subject. Slatted timber, rough crate edges, dusty root vegetables, glass jars with blank lids and no labels. Avoid labels, readable marks, luxury packaging, modern barcode.

## PROP_Food_NoodleBowl

Key: `#00ff00`

Prompt: single steaming bowl of noodles with chopsticks resting across, clearly hot and fresh street food from Mei's stall. Subject is a warm ceramic noodle bowl filled with noodles, broth, simple garnish, chopsticks laid across the rim, a few readable curls of warm steam above the bowl. Warm ceramic, golden broth, wheat noodles, reddish garnish, pale steam; avoid green-heavy garnish and do not use `#00ff00` in the subject. Glazed ceramic bowl, noodle strands, wooden chopsticks, translucent-looking but visible painterly steam curls. Keep margin around steam. Avoid readable bowl markings, brand logo, cropped steam.

## PROP_Market_HangingWares

Key: `#ff00ff`

Prompt: hung string or cluster of dried goods: chillies, garlic, onions, and a few dried fish on a simple cord at top, as if hung from a stall frame. Subject is vertical-to-wide hanging market wares tied to a plain cord, dried chillies, garlic bulbs, onions, small dried fish, practical display goods for Mei's stall. Dried red chillies, ivory garlic, warm onion skins, muted tan dried fish, simple brown cord; do not use `#ff00ff` in the subject. Braided cord, papery onion skins, garlic cloves, wrinkled dried chillies, matte dried fish. Avoid green herbs, readable tags, brands, gore, wet fish shine, stall frame, cropped cord, magenta in subject.
