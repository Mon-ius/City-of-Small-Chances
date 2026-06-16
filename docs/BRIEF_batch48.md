# Batch 48 — life on the cobbles: harbour cat, dock dog & pigeons (PROP_Animal_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *put animals on the quay.* Batch 43
gave the harbour life in the air (gulls); the citizens give it people. But a working port
also keeps a **menagerie at your feet** — the cat dozing on a bollard, the scruffy dog at a
doorway, the pigeons working the cobbles for crumbs — and the quay has none. This batch adds
**three chroma-key animal cutouts** that the orchestrator scatters, sparsely, as billboards
(the proven Batch-3 citizen / Batch-43 gull idiom) with soft contact shadows where they sit on
the ground, so the harbour has life at the player's own eye level. **You (codex) generate +
chroma-key + log only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into
`world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing harbour cutout props `assets/sprites/props/PROP_Gull_Perched.png`
and `PROP_Quay_LobsterPots.png`. Each is a **single subject, painted front-on / slight
three-quarter, even diffuse light, on a SOLID flat chroma background, no ground shadow, no
scene, no second object,** in the muted period-harbour palette. Match that: one clean animal
per image (the pigeons are a single small tight group — see below), filling most of the frame,
upright as it sits/stands on the ground, painterly not photoreal. These stand as upright
camera-facing cutouts, so paint each so it **reads clearly from the front.**

## Chroma key — GREEN, the animals are not green

Generate each on a **solid pure-green `#00ff00`** background. Fur and feather are browns, greys,
black, white, tan, ginger — **no green anywhere on the animal.** State the key used per sprite in
`tools/gen/prompts/batch48.md` (it should be GREEN for all three).

## What to make — THREE harbour animals (a cat, a dog, pigeons)

1. **`PROP_Animal_Cat`** — *a harbour cat sitting upright.* A short-haired cat sitting on its
   haunches, tail curled round its front paws, ears up, looking out — a tabby or ginger or
   black-and-white. Calm, settled, the kind that owns the quay. Roughly **portrait** framing (a
   sitting cat is taller than wide). (Green key.)
2. **`PROP_Animal_Dog`** — *a scruffy dock dog sitting.* A medium mongrel sitting alert on its
   haunches, a working dog's rough brown/black/tan coat, ears half-cocked. Roughly **square**
   framing. (Green key.)
3. **`PROP_Animal_Pigeons`** — *a small group of pigeons on the ground.* Two or three city
   pigeons standing/pecking close together on the ground, the usual blue-grey with an
   iridescent neck and a pale-barred wing, one head down. A single tight cluster, **wider than
   tall** framing. (Green key.)

Each reads as its animal instantly by silhouette; **no readable text/numbers/letters.**

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single animal
(or the pigeon cluster) front-on on the solid green background (flat even light, no cast shadow,
no ground, no second subject). Save the raws to `tools/gen/source_batch48/`. Write your prompts
(and the key colour used per sprite) to `tools/gen/prompts/batch48.md`. (If an `image_gen` call
returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch48.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (these are small props —
downscale, keep aspect). Output to **`assets/sprites/props/`** as `PROP_Animal_Cat.png`,
`PROP_Animal_Dog.png`, `PROP_Animal_Pigeons.png` (8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0),
**0% residual green fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect
kept — cat portrait, dog ~square, pigeons wider-than-tall), file size, and a one-line note that
it reads as its animal with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 48 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do
**not** edit anything else, do **not** run git, do **not** touch `src/`.
