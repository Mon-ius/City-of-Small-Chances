# Batch 4B GPT-Image-2 prompts: HUD/status/weather icons

Generated with Codex built-in `image_gen` (GPT-Image-2), not the CLI fallback. `Money` was generated first as the required smoke test; the PNG landed in `$CODEX_HOME/generated_images/019ecbd3-0688-7952-ad74-c632fafd979e/` and was copied to `tools/gen/source_batch4b/Money.png`.

All sources were generated as square 1024x1024 icon cutouts on a flat `#00ff00` chroma-key background, then copied to `tools/gen/source_batch4b/` for the re-runnable local post-process step.

Each prompt used this exact shared envelope, with the `Primary request`, `Subject`, `Lighting/mood`, `Color palette`, and `Avoid` fields replaced by the per-asset fields below:

```text
Use case: stylized-concept
Asset type: HUD/status UI icon for a Three.js browser game, final transparent 128x128 PNG
Primary request: <primary request>
Art direction: City of Small Chances, clean bold lightly painterly flat icon finish, warm dusk harbour palette, crisp silhouette, readable at 32-48 px.
Subject: <subject>
Style/medium: polished flat game icon, subtle painterly warmth and value shading.
Composition/framing: single centered subject, square 1024x1024, generous even padding, consistent visual weight, no frame or badge.
Lighting/mood: <lighting/mood>
Color palette: <color palette>
Background removal constraints: background must be one uniform #00ff00 fill with no shadows, no gradient, no texture, no reflections, no floor plane, and no lighting variation. Do not use #00ff00 anywhere in the subject. No cast shadow, no contact shadow, no watermark, no text, no logos.
Avoid: <avoid>
```

Weather prompts used `Asset type: weather HUD UI icon for a Three.js browser game, final transparent 128x128 PNG`.

## Resource

### Money

- Primary request: Create a Money icon: a compact hand holding a few brass coins and a folded cash note, readable as the wallet/cash readout, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: simple open hand silhouette with two or three round coins and one small folded banknote; no currency symbols, no text, no numerals.
- Lighting/mood: warm lamplight with subtle cool harbour fill, crisp edges.
- Color palette: brass gold coins, muted warm hand tone, pale cream note; colour-blind-safe by shape and value, not hue alone.
- Avoid: tiny details, muddy brushwork, photorealism, emoji style, outlines too thin, baked drop shadow.

## Condition Meters

### Energy

- Primary request: Create an Energy icon: a bold lightning bolt wrapped with a small stamina pulse arc, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: one strong angular lightning bolt with a simple curved motion/pulse mark, clear vigour/stamina meaning; no text, no numerals.
- Lighting/mood: warm lamplight with subtle cool harbour fill, crisp edges.
- Color palette: warm gold and pale cream highlights with darker amber underside; colour-blind-safe by shape and value.
- Avoid: muddy brushwork, emoji style, fine filigree, baked drop shadow.

### Hunger / Fed

- Primary request: Create a Hunger/Fed icon: a simple warm rice bowl with a spoon or chopsticks and a small steam curl, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: one rounded bowl filled with rice, one utensil shape, one or two simple steam curls; reads as being fed rather than hunger warning; no text.
- Lighting/mood: warm lamplight with subtle cool harbour fill, crisp edges.
- Color palette: cream rice, muted ceramic blue-grey bowl, warm orange rim; colour-blind-safe by bowl/steam silhouette.
- Avoid: tiny grains, restaurant logo, emoji style, photorealism, baked drop shadow.

### Stress

- Primary request: Create a Stress icon: a tight pressure knot or spiral squeezed by two small bracket-like pressure marks, centered on a perfectly flat solid #00ff00 chroma-key background.
- Art direction override: City of Small Chances, clean bold lightly painterly flat icon finish, warm dusk harbour world but cooler tense mood, crisp silhouette, readable at 32-48 px.
- Subject: one compact tangled spiral/knot shape, slightly angular and compressed, with two simple pressure marks; reads as tension/overwhelm where LOW is good; no text.
- Lighting/mood: restrained cool harbour fill with small warm edge highlight, crisp edges.
- Color palette: cool blue-grey and muted violet with pale highlights; colour-blind-safe by knot/pressure silhouette.
- Avoid: decorative swirl only, water wave, emoji style, thin lines, muddy brushwork, baked drop shadow.

### Health

- Primary request: Create a Health icon: a sturdy heart combined with a small care cross/bandage shape, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: one bold heart silhouette with a simple diagonal bandage or small medical cross inset; reads as wellbeing/care, no text.
- Lighting/mood: warm lamplight with subtle cool harbour fill, crisp edges.
- Color palette: deep muted red heart, cream bandage/cross, darker burgundy shadows; colour-blind-safe by heart+care shape.
- Avoid: realistic organ, hospital logo, emoji style, thin details, baked drop shadow.

### Hope

- Primary request: Create a Hope icon: a small bright spark emerging above an open cupped hand or tiny harbour lantern flame, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: one simple four-point star/spark with two smaller glints rising from a small cupped hand or lamp base; reads as optimism and recovery, no text.
- Lighting/mood: warm hopeful lamplight against clean silhouette, crisp edges.
- Color palette: pale cream spark, warm gold glow, muted hand/lamp base; colour-blind-safe by spark-in-hand silhouette.
- Avoid: magic wand, fairy dust cloud, thin lines, emoji style, baked drop shadow.

## Weather

### Clear

- Primary request: Create a Clear weather icon: a bold sun disk with simple triangular rays, centered on a perfectly flat solid #00ff00 chroma-key background.
- Subject: one sun disk with chunky evenly spaced rays; no face, no text.
- Lighting/mood: warm clear daylight/lamplight, crisp edges.
- Color palette: warm gold, pale cream highlights, amber shadows; colour-blind-safe by sun-ray silhouette.
- Avoid: smiling face, thin rays, gradient background, baked drop shadow, emoji style.

### Cloud

- Primary request: Create a Cloud/overcast weather icon: one chunky layered cloud silhouette, centered on a perfectly flat solid #00ff00 chroma-key background.
- Art direction override: City of Small Chances, clean bold lightly painterly flat icon finish, cool harbour palette with warm dusk edge, crisp silhouette, readable at 32-48 px.
- Subject: one simple heavy cloud made from broad rounded lobes and flat underside; no rain, no sun, no text.
- Lighting/mood: overcast but not gloomy, cool grey-blue with warm rim highlight, crisp edges.
- Color palette: blue-grey cloud, pale grey highlights, darker underside; colour-blind-safe by cloud silhouette.
- Avoid: tiny mist, face, rain drops, gradient background, baked drop shadow, emoji style.

### Rain

- Primary request: Create a Rain weather icon: a compact cloud with three bold raindrops beneath it, centered on a perfectly flat solid #00ff00 chroma-key background.
- Art direction override: City of Small Chances, clean bold lightly painterly flat icon finish, cool harbour rain palette with warm dusk edge, crisp silhouette, readable at 32-48 px.
- Subject: one simple cloud and exactly three large tear-shaped raindrops beneath; no lightning, no text.
- Lighting/mood: wet harbour coolness with a small warm rim highlight, crisp edges.
- Color palette: blue-grey cloud, pale blue raindrops, darker underside; colour-blind-safe by cloud+drop silhouette.
- Avoid: thin rain streaks, storm lightning, umbrella, gradient background, baked drop shadow, emoji style.

### Storm

- Primary request: Create a Storm weather icon: a dark compact cloud with one bold lightning bolt beneath it, centered on a perfectly flat solid #00ff00 chroma-key background.
- Art direction override: City of Small Chances, clean bold lightly painterly flat icon finish, dramatic harbour storm palette, crisp silhouette, readable at 32-48 px.
- Subject: one heavy dark cloud and one large angular lightning bolt; optional two short rain ticks, but the bolt must dominate; no text.
- Lighting/mood: cool storm cloud with warm lightning highlight, crisp edges.
- Color palette: dark blue-grey cloud, pale gold lightning, deep underside; colour-blind-safe by cloud+bolt silhouette.
- Avoid: tiny bolt, too many rain streaks, face, gradient background, baked drop shadow, emoji style.

### Heat

- Primary request: Create a Heat weather icon: a heavy hot sun disk with three rising heatwave shimmer lines beneath it, centered on a perfectly flat solid #00ff00 chroma-key background.
- Art direction override: City of Small Chances, clean bold lightly painterly flat icon finish, hot harbour palette, crisp silhouette, readable at 32-48 px.
- Subject: one large sun disk, short blunt rays or halo, and exactly three thick wavy heat lines; reads as heatwave/heavy sun, no text.
- Lighting/mood: hot oppressive sun, crisp edges.
- Color palette: pale yellow sun, orange amber heat lines, darker warm underside; colour-blind-safe by sun+waves silhouette.
- Avoid: thermometer, fire, face, thin lines, gradient background, baked drop shadow, emoji style.
