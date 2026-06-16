# codex task — Batch 22: the named cast walks the harbour (GPT-Image-2)

You are generating committed **art** for a Three.js browser game (City of Small Chances), a
stylised dusk-harbour life-sim. **First read `docs/ART_PLAN.md`, `docs/ASSET_MANIFEST.md` (entry
**spr-003**), the existing citizen-sprite builder reference `tools/gen/postprocess_batch3.sh`, and
look at the six shipped citizen sprites in `assets/sprites/citizens/CHAR_Harbour_Citizen_*_albedo.png`**
(Fisher/DockWorker/MarketVendor/Elder/Commuter/Youth). **Match that exact style and format** — warm,
painterly, stylised-realism, a single upright full-body figure with warm dusk-harbour shading baked
into the albedo, on a flat chroma background, output **512×1024 RGBA** (1:2), feet at the bottom.

This batch delivers **spr-003 — full-body walkable sprites for the six NAMED major NPCs** (today they
exist only as talk-panel portraits; the orchestrator will stand them up in the walkable harbour — Mei
behind her noodle stall, Tomo at his quay repair bench, Jun and Rafiq among the quay crowd — and ship
the two non-harbour NPCs, Clara and Ava, ready for when their districts become walkable). Each must
read as **its specific character** — the right role, the right signature colour, a recognisable prop —
so a player who has met them in the portrait panel recognises them on the quay. Grounded, humane,
working-class dignity; **never caricature**, never a label.

## The 6 named-NPC sprites (generate large, chroma-keyed) → `assets/sprites/citizens/`

Each is a **single full-body standing figure, facing forward, feet at the bottom**, painted in the
Batch-3 citizen style. Signature colour should dominate their clothing so they read at a glance. No
text anywhere (no name tags, no signage, no readable print on clothing).

1. **CHAR_NPC_Mei** — *Mei Lin, the noodle-stall owner.* Middle-aged East-Asian woman, sturdy and
   capable, sleeves rolled. A warm **burnt-orange (#e0833c)** apron over practical everyday clothes; a
   cloth or ladle in one hand; steam-warmed, sharp knowing expression. The woman who knows everyone's
   order. → **GREEN key.**
2. **CHAR_NPC_Jun** — *Jun Park, the courier dispatcher.* Wiry, impatient, always counting minutes. A
   cool **harbour-blue (#3f96c9)** windbreaker/dispatch vest; a clipboard or handheld tucked under one
   arm; alert, brisk stance. → **GREEN key.**
3. **CHAR_NPC_Rafiq** — *Rafiq Hassan, the dock lead hand.* Broad-shouldered, weathered, steady. An
   **amber-gold (#c9a23f)** hi-vis vest over heavy work clothes; a hard hat held under the arm or on his
   head; the calm authority of a man who calls the morning gang. → **GREEN key.**
4. **CHAR_NPC_Tomo** — *Tomo Sato, the quayside mechanic/trainer.* Older man, careful craftsman,
   reading glasses pushed up on his forehead. A **teal-green (#56b89a)** work shirt / open overalls;
   oil-marked hands; a wrench or small tool in hand. → **MAGENTA key** (his clothing is green — do NOT
   use a green background for him).
5. **CHAR_NPC_Clara** — *Clara Wen, the civic-clinic desk clerk.* Tired but precise, gatekeeper poise.
   A soft **muted-violet (#8a7fd6)** cardigan over clinic-clerk clothes; a clipboard held to her chest.
   → **GREEN key.**
6. **CHAR_NPC_Ava** — *Ava Reid, the tenant advocate.* Determined neighbourly warmth, a little worn-out.
   A warm **rose-pink (#d6738a)** coat or scarf; a folder of papers under one arm. → **GREEN key.**

## How to generate (important)
- Use your **built-in `image_gen` skill (GPT-Image-2)** — the default, no-API-key path. No
  `gpt-image-1.5`, no CLI fallback.
- Generate each **tall (portrait, e.g. 1024×2048 or the nearest portrait size the skill offers)**,
  full-body, the figure centred with clear space all around, on a **flat, evenly-lit pure chroma
  background** — pure **green `#00ff00`** for Mei/Jun/Rafiq/Clara/Ava, pure **magenta `#ff00ff`** for
  **Tomo** — so the post-process can key it out cleanly. No scenery, no shadow on the background, no
  props on the ground — just the standing figure on flat chroma.
- **Smoke-test first:** generate **CHAR_NPC_Mei** as your very first action and confirm a PNG lands in
  `$CODEX_HOME/generated_images/…`. (The first image_gen call sometimes returns a server error — just
  retry; it succeeds.)
- Keep raw generations in `tools/gen/source_batch22/` (gitignored), named `Mei.png`, `Jun.png`,
  `Rafiq.png`, `Tomo.png`, `Clara.png`, `Ava.png`.

## Post-processing (pre-installed tools only — ImageMagick + Python/Pillow, NO new deps)
Write a re-runnable `tools/gen/postprocess_batch22.sh` that **reuses `postprocess_batch3.sh`'s exact
recipe** per figure, but keyed per-subject:
- chroma-key remover at `${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py`
  with `--auto-key border --soft-matte --despill --force`;
- then `magick … -alpha on -trim +repage`, `-resize '486x972>' -background none -gravity center
  -extent 512x1024 -colorspace sRGB -depth 8`, then `PNG32:` with `-colors 192 -define
  png:compression-level=9`;
- output `assets/sprites/citizens/CHAR_NPC_{Mei,Jun,Rafiq,Tomo,Clara,Ava}_albedo.png`.

Verify with Pillow (mirror Batch 3's checks): each final is **512×1024 RGBA**; all four **corners
alpha 0**; **feet/lowest opaque pixel low** (max opaque y ≥ 820 — the figure stands on the ground);
healthy visible coverage (> 18000 opaque px); and **no chroma fringe** — for the GREEN-keyed five check
green fringe (`g>180 and r<80 and b<80`), for **Tomo (magenta)** check magenta fringe
(`r>180 and b>180 and g<80`). Keep each small (quantised to 192 colours like Batch 3).

Final names (match exactly) → `assets/sprites/citizens/`:
- `CHAR_NPC_Mei_albedo.png`, `CHAR_NPC_Jun_albedo.png`, `CHAR_NPC_Rafiq_albedo.png`,
  `CHAR_NPC_Tomo_albedo.png`, `CHAR_NPC_Clara_albedo.png`, `CHAR_NPC_Ava_albedo.png`

## Hard constraints
- **Do NOT modify anything under `src/`.** Pre-installed tools only. **No `npm install`, no new deps.**
- **No text anywhere.** No readable names, no signage, no print on clothing. Faces and bodies grounded
  and humane — real working people, not caricatures or mascots.
- Each final is **512×1024 RGBA**, transparent corners, feet near the bottom, no chroma fringe.
- Tomo on **magenta**, the other five on **green** — do not mix them up (a green shirt on a green key
  keys the shirt away).

## Deliverables checklist
- 6 RGBA PNGs (names above), `tools/gen/prompts/batch22.md`, `tools/gen/postprocess_batch22.sh`.
- Append one progress-log line to `docs/ART_PLAN.md` (what you generated, that built-in image_gen
  worked, total payload size, and each sprite's size + transparent-corner + feet-low + fringe checks).
  Do NOT change any checkbox.

## When done
Print every file you created with sizes and confirm each is 512×1024 RGBA with transparent corners,
feet near the bottom, and no chroma fringe. Do not run git; the orchestrator reviews, stands the cast
up in the walkable harbour, and commits.
