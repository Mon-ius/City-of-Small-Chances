# Batch 29 — fx-007: the "working a shift" montage (4 painted job scenes)

**Milestone:** `fx-007` (shift-scene visuals). In the book a worked shift is a
*moment*, not an instant clock-jump. The walkable game currently jumps the clock
silently when you work a shift off the notice board. This batch paints **4 brief
full-screen work illustrations — one per job family** — that the orchestrator
(Claude Code) will play as a momentary montage when a shift completes, giving the
labour weight. **You (codex) generate + post-process + log only. Do NOT touch
`src/`. Do NOT run git.**

## Match the existing key-art style EXACTLY

Look first at the existing painted scenes: `assets/ui/keyart/KEYART_Act_Dawn.png`,
`KEYART_Act_Dusk.png`, `KEYART_Act_Storm.png`, `KEYART_Ending_Settled.png`. Each is
a **640×360 (16:9) opaque painted illustration** of the same Old Harbour world across
moods — a grounded, slightly storybook painterly look, muted period-harbour palette
(wet stone, weathered timber, canvas, lamplight, grey-green water), soft depth and
atmosphere, **no UI, no text**. Match that look, framing, resolution and palette
precisely so a shift scene feels like the same world seen up close.

These are **full-frame opaque scenes** (no transparency, no chroma key) — paint edge
to edge like the key-art.

## What to make — 4 job-family shift scenes (one moment of the work each)

Each is a single readable moment of that family's labour, the worker mid-effort,
the harbour present in the scene. **Absolutely no readable text, letters or numbers**
— any signage/paper is abstract greeked marks only (the project's hard rule).

1. **`SHIFT_Labour`** — *heavy work on the quay.* A harbour labourer mid-heave,
   hoisting a heavy hessian sack or a crate onto a stack or hand-cart, back bent
   with the strain, sweat-sheen, sleeves rolled. The quay, moored boat and grey-green
   water behind, working daylight. (Covers market-haulage / harbour day-labour /
   dock loading.)

2. **`SHIFT_Delivery`** — *the courier run.* A bike courier leaning hard into a fast
   turn down a narrow harbour street, a satchel slung across the back, the wheels and
   the passing buildings carrying motion-blur/speed lines, low urgent light. (Covers
   the bike courier run.)

3. **`SHIFT_Admin`** — *the records desk.* A clerk at a civic records desk under a
   green-shaded lamp, stacks of ledgers and loose papers, a hand mid-stamp, the quiet
   indoor counterpoint to the quay — warm interior lamplight, a window onto the
   harbour beyond. (Covers the civic records desk.)

4. **`SHIFT_Service`** — *the stall / the counter.* A cook-vendor at a steaming food
   stall, ladling a bowl over a glowing brazier, steam rising into the evening, a
   waiting customer half-seen — warm, busy, sensory. (Future service work; ship-ready.)

The four should read instantly as **four different kinds of work** by composition,
setting and light: straining outdoor lift / speeding street / quiet lamplit desk /
warm steaming stall.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. One image per scene, **16:9
landscape**. Save raw to `tools/gen/source_batch29/` as `SHIFT_Labour.png` …
`SHIFT_Service.png`. Write your prompts to `tools/gen/prompts/batch29.md`. (If the
first `image_gen` call returns a server error, just retry — it succeeds on the second
attempt.)

## Post-process — opaque 640×360 scenes

Write `tools/gen/postprocess_batch29.sh` (model it on the key-art post-process if one
exists, else simple ImageMagick):
- resize/crop to exactly **640×360** (16:9), centre-crop if the gen aspect differs,
- 8-bit RGB (opaque — these are NOT keyed), quantise to keep each file small
  (aim < ~160 KB like the key-art),
- output to **`assets/ui/shifts/`** (create it) as
  `SHIFT_{Labour,Delivery,Admin,Service}.png`.

Verify with Pillow and report per file: dimensions (must be 640×360), that it is
opaque (no alpha or fully-opaque alpha), file size, and a one-line note that the
scene reads as its job and carries **no legible text**.

## Log (no git, no `src/`)

Append **one** Batch 29 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
