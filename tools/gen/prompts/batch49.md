# Batch 49 Prompts

Generated with built-in image_gen (GPT-Image-2). All three raws use a solid pure-black
`#000000` background. This is not chroma key: final transparency is built by converting source
pixel luminance to alpha, then forcing RGB to one uniform warm smoke-grey to avoid black halos.

## PROP_Smoke_Wisp

```text
Use case: stylized-concept
Asset type: game prop sprite source for luminance-to-alpha smoke cutout
Primary request: PROP_Smoke_Wisp, a thin faint wisp of pale grey-white chimney smoke for a stylized-realism harbour scene.
Scene/backdrop: solid pure black #000000 background only, perfectly flat and even; no gradient, no stars, no glow, no floor, no scene.
Subject: a single soft translucent woodsmoke wisp rising from the bottom centre of the frame, narrow and tall portrait framing, barely-there pale grey-white smoke, gently curling and leaning to one side as if in a light harbour breeze, widening and dissipating upward.
Style: soft painterly vapour, muted hearth/cookfire smoke, pale grey-white, no hard edges, no black soot, no solid blobs.
Composition: smoke only, generous black padding around all sides, bottom-centre origin, tall portrait silhouette.
Restrictions: no chimney, no roof, no building, no text, no numbers, no letters, no watermark, no objects, no stars, no background texture. Background must be exactly solid pure black #000000 because alpha will be built from pixel luminance, not chroma-key removal.
```

## PROP_Smoke_Plume

```text
Use case: stylized-concept
Asset type: game prop sprite source for luminance-to-alpha smoke cutout
Primary request: PROP_Smoke_Plume, a steady medium plume of pale grey-white chimney smoke for a stylized-realism harbour scene.
Scene/backdrop: solid pure black #000000 background only, perfectly flat and even; no gradient, no stars, no glow, no floor, no scene.
Subject: one soft translucent woodsmoke plume rising from the bottom centre of the frame, medium width and tall portrait framing, gently leaning to one side in a light harbour breeze, spreading into a feathered soft top, visible but still airy.
Style: soft painterly vapour, muted hearth/cookfire smoke, pale grey-white, no hard edges, no black soot, no solid blobs.
Composition: smoke only, generous black padding around all sides, bottom-centre origin, tall rising silhouette, wider than a thin wisp but not a dense industrial column.
Restrictions: no chimney, no roof, no building, no text, no numbers, no letters, no watermark, no objects, no stars, no background texture. Background must be exactly solid pure black #000000 because alpha will be built from pixel luminance, not chroma-key removal.
```

## PROP_Smoke_Column

```text
Use case: stylized-concept
Asset type: game prop sprite source for luminance-to-alpha smoke cutout
Primary request: PROP_Smoke_Column, a fuller column of pale grey-white chimney smoke for a stylized-realism harbour scene.
Scene/backdrop: solid pure black #000000 background only, perfectly flat and even; no gradient, no stars, no glow, no floor, no scene.
Subject: one fuller denser woodsmoke column rising from the bottom centre of the frame, wider and tall portrait framing, climbing and softly billowing like a busy kitchen chimney, widening and dissipating upward, gently leaning to one side in a light harbour breeze.
Style: soft painterly vapour, muted hearth/cookfire smoke, pale grey-white, translucent feathered margins, no hard silhouette, no black industrial soot, no solid opaque blob.
Composition: smoke only, generous black padding around all sides, bottom-centre origin, full rising column silhouette wider than the steady plume but still soft and translucent.
Restrictions: no chimney, no roof, no building, no text, no numbers, no letters, no watermark, no objects, no stars, no background texture. Background must be exactly solid pure black #000000 because alpha will be built from pixel luminance, not chroma-key removal.
```
