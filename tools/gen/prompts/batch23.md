# Batch 23 prompts

Generated with Codex built-in `image_gen` skill (GPT-Image-2), not the CLI fallback. `SKY_Atmos_Day` was generated first as the required smoke test; the PNG landed in `$CODEX_HOME/generated_images/019ece2d-1406-78c2-a695-ba389f268bcf/` and was copied to `tools/gen/source_batch23/SKY_Atmos_Day.png`. The remaining raw sources were copied into `tools/gen/source_batch23/`; final 1024x1024 opaque sky panels are produced by `tools/gen/postprocess_batch23.sh`.

Shared constraints for every source: tall portrait full-frame sky panel, sky only, no border; vertical sky gradient with zenith at the top and horizon haze toward the bottom; painterly atmospheric scattering, not a flat linear ramp; horizontally seamless and tileable left-to-right; horizontally near-uniform with no strong left/right asymmetry; meaningful sky in the top 60 percent, lower 40 percent easing below the horizon; no text, no sun disc, no foreground, no buildings, no land, no water, no silhouettes, no scenery, no watermark. Style target: warm painterly stylised-realism dusk-harbour game palette for City of Small Chances, compatible with the existing soft drifting cloud billboards layered over the dome.

## SKY_Atmos_Day

Source: `tools/gen/source_batch23/SKY_Atmos_Day.png`

Prompt: bright clear-day harbour sky. Deep clean blue at the zenith easing through soft pale blue into a warm pale near-white harbour haze at the horizon, with real atmospheric scattering and subtle painterly brush texture. Add only a few very soft high wispy cirrus smears, horizontally subtle and near-uniform. Calm, airy, optimistic midday.

## SKY_Atmos_Dusk

Source: `tools/gen/source_batch23/SKY_Atmos_Dusk.png`

Prompt: golden-hour harbour sky. Deep indigo-violet at the zenith easing down through warm rose and coral into a glowing warm amber-orange horizon band in the lower third. The glow is atmospheric scatter only, not a visible sun. Add soft warm-lit cloud haze catching the last light, subtle and diffuse, with painterly multi-stop atmospheric scattering rather than a flat ramp. Wistful, warm, signature harbour dusk mood.

## SKY_Atmos_Night

Source: `tools/gen/source_batch23/SKY_Atmos_Night.png`

Prompt: deep working-port night sky. Near-black indigo at the zenith easing down to slightly lighter deep blue lower down, with faint cool city-glow haze at the horizon. Scatter a gentle believable starfield across the upper 60 percent: small soft white and pale-blue stars, varied brightness, sparse and calm, not dense, not a mat. Keep stars visible enough to survive PNG quantisation. Calm, deep, quiet working-port night sky, a little lonely.
