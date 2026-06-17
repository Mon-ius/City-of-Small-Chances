# Batch 60 — harbour waterbirds: cormorant, heron & ducks (PROP_Bird_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *the wildlife that actually shares a
working harbour with the people.* The quay has gulls (Batch 43) overhead and on the rails, but
the wide water and the sea-wall coping carry no other living creature — and a real port is alive
with waterbirds: a cormorant hung out to dry on the coping, a grey heron standing sentinel at the
edge, a raft of mallards riding the sheltered water. This batch adds the three as chroma-key
cutouts: the cormorant and heron PERCH on the sea-wall coping (the Batch-43 perched-gull idiom —
feet on the image bottom, billboarded, NO contact shadow); the ducks FLOAT on the near water (the
Batch-54 near-craft idiom — waterline on the image bottom, sat on the water surface, billboarded,
NO contact shadow). They are deliberately varied in value and silhouette: a black-bronze
wing-drying cormorant, a tall blue-grey hunched heron, a low brown-and-green raft of ducks.
**codex generates + chroma-keys + logs only. Do NOT touch `src/`. Do NOT run git.** (The
orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing bird cutouts `assets/sprites/props/PROP_Gull_Perched.png`,
`PROP_Gull_Calling.png`, `PROP_Gull_Flying.png`. Each is a **single bird, painted side/front-on
at a natural eye level, even diffuse light, on a SOLID flat chroma background, no ground shadow,
no scene, no second bird,** in the muted weathered period-harbour palette. Match that handling
exactly — painterly not photoreal, one clean subject filling most of the frame. Keep them
**honest and unromantic**: a working-harbour cormorant, heron and ducks, weathered and real,
never a bright or hot colour, never a fairytale bird.

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is safe — the cormorant is
black-bronze, the heron blue-grey/off-white/charcoal, the mallards green-black/chestnut/grey-brown/
white with dull-yellow bills; hot-pink/magenta appears on none of them. **No magenta/hot-pink
anywhere on any subject.** State the key used per sprite in `tools/gen/prompts/batch60.md` (MAGENTA
for all three).

## What to make — THREE harbour waterbirds

1. **`PROP_Bird_Cormorant`** — *the wing-dryer.* A great cormorant perched upright, dark wings held
   half-spread to dry in the classic heraldic pose, glossy black-bronze, a hook-tipped bill, an
   S-curved neck, webbed feet together as if gripping a ledge. **SQUARE** (about 1×1), feet on the
   BOTTOM. NO post (it perches straight on the coping). (Magenta key.)
2. **`PROP_Bird_Heron`** — *the sentinel.* A grey heron standing tall and still, neck folded into a
   hunched S, a long dagger bill, long thin legs, blue-grey back, pale neck, black eye-stripe and
   crest plume, dull ochre legs. **PORTRAIT** (tall and narrow, about 1 wide × 1.6 tall), feet on
   the BOTTOM. (Magenta key.)
3. **`PROP_Bird_Ducks`** — *the raft.* Three mallard ducks floating low together — one green-headed
   drake (white neck-ring, chestnut breast, grey body) and two mottled-brown hens, folded wings,
   dull-yellow bills. **LANDSCAPE** (wide and low, about 3 wide × 2 tall), the waterline on the
   BOTTOM. (Magenta key.)

Each reads as its bird instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single bird front/
side-on at a natural eye level (even light, no cast shadow, no scenery, no second bird) on the
solid magenta background. Save the raws to `tools/gen/source_batch60/`. Write your prompts (and the
key colour per sprite) to `tools/gen/prompts/batch60.md`. (If an `image_gen` call returns a server
error, just retry — it succeeds on a later attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Run `tools/gen/postprocess_batch60.sh` (the codex chroma-key remover, `--auto-key border --despill
--force`, MAGENTA) to produce clean RGBA cutouts: **alpha-0 corners, 0% colour fringe**, tightly
cropped, **longest side 512** (downscale, keep aspect). Output to **`assets/sprites/props/`** as
`PROP_Bird_Cormorant.png`, `PROP_Bird_Heron.png`, `PROP_Bird_Ducks.png` (8-bit RGBA, quantised).

Verify with Pillow and report per sprite: **RGBA**, **alpha-0 corners**, **0% residual magenta
fringe**, **0% visible pure-key**, pixel dimensions (longest side 512; cormorant square, heron
portrait, ducks landscape), file size, and a one-line note that it reads as its bird with no
legible text.

## Log (no git, no `src/`)

Append **one** Batch 60 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
