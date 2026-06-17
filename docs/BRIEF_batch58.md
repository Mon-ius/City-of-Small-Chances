# Batch 58 — the shopfronts come alive: an awning, a glazed shop window & a window flower box (PROP_Shop_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *finish what Batch 56 began on the east building row.*
Batch 56 gave the signed-but-blank ground floors their entrance: a **door**, a **bracket lantern**, a stack of
**crates** at the threshold. But everything *around* those doors is still flat painted plaster — the buildings
advertise shops (Tavern, Chandlery, HarbourGate, FerryStop) yet have **no windows to look into, no awning over
the glass, nothing growing at the sill.** A real shop row reads by its windows and its awnings; a lived-in street
softens its stone with a flower box on the sill. This batch adds the **next layer of the shopfront**: a faded
canvas **awning** angled out over the glass, a small-paned glazed **shop window** with a dim goods display behind
it to fill the blank wall, and a timber **window flower box** spilling blooms and trailing green. Three
**chroma-key cutouts** the orchestrator mounts **flat on the building fronts** — all **FIXED façade cutouts**
(the Batch-9 harbourSigns / Batch-56 door idiom: `cutoutPlane` at an explicit position, `rotation.y = FACADE`
facing the street, **NOT billboarded, no contact-shadow blob** — they hang on the wall). They share the muted
weathered period-harbour palette exactly — salt-faded canvas, grey-green timber, dull glass, earthy blooms — and
they are **deliberately distinct in silhouette** from the door/lantern/crates already on the row: an **awning**
reads by its sloped striped canopy and scalloped valance, a **window** by its glazed small panes in a timber
frame, a **flower box** by its long low timber trough of foliage. **You (codex) generate + chroma-key + log only.
Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing façade cutouts `assets/sprites/props/PROP_Shop_Door.png`,
`PROP_Shop_Lantern.png` and `PROP_Shop_Crates.png`. Each is a **single subject, painted front-on, even diffuse
light, on a SOLID flat chroma background, no ground shadow, no scene, no second object,** in the muted weathered
period-harbour palette (worn timber, dull paint, black iron). Match that handling exactly — painterly not
photoreal, one clean subject filling most of the frame. These mount **flat on a wall**, seen dead front-on, so
paint each **face-on / orthographic**, not in perspective. Keep them **honest and unromantic**: scuffed timber,
salt-faded canvas, dull old glass, earthy blooms — muted reds, golds, blues, greens, NEVER a bright or hot
colour. Paint each so it **reads clearly from the front** as the thing it is.

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is the safe universal key here — the
awning's faded stripes, the window's timber/glass and (critically) the flower box's **green foliage** carry
muted reds, golds, blues and greens, and magenta/hot-pink appears in none of them. **No magenta/hot-pink
anywhere on any subject** — and on the flower box, **the blooms must be red / gold / white / blue, NEVER pink
or magenta** (a pink geranium would read as the key). State the key used per sprite in
`tools/gen/prompts/batch58.md` (MAGENTA for all three).

## What to make — THREE shopfront-dressing props (awning, window, flower box)

1. **`PROP_Shop_Awning`** — *shade over the glass.* A single **shop awning / canopy** seen dead front-on, a
   sloped rectangular canvas hood projecting from the wall with a **scalloped or straight valance hanging at its
   front edge**, salt-faded **muted stripes** (a dull red/ochre and dirty cream, NEVER pink), a little sag,
   sun-bleach and patching, a plain timber or iron frame just visible at the top where it fixes to the wall.
   Reads instantly as a shop awning. **LANDSCAPE** framing (about 3 wide × 2 tall), the top edge where it
   mounts to the wall along the TOP of the image. (Magenta key.)
2. **`PROP_Shop_Window`** — *a window to look into.* A single **small-paned glazed shop window** seen dead
   front-on, a timber-framed window divided into a grid of small panes (a shopfront sash or bay), the **old
   glass dull and greenish-grey with faint reflections**, behind it a **dim, vague suggestion of goods on a
   shelf** (soft shapes only, no detail), a plain weathered timber frame and sill. Reads instantly as a shop
   window. Roughly **SQUARE-to-portrait** framing (about 1 wide × 1.2 tall), the whole window centred and
   filling most of the frame. (Magenta key.) **No readable text/numbers/letters on the glass** — no shop name,
   no prices, no signage.
3. **`PROP_Shop_FlowerBox`** — *life at the sill.* A single **timber window flower box** seen dead front-on, a
   long low weathered-plank trough planted with a **tumble of small blooms and trailing green foliage** spilling
   over the front edge — the blooms in **muted red, gold, white and blue ONLY (absolutely no pink or magenta)**,
   the leaves a dull sage / grey-green (NOT bright grass-green). Reads instantly as a window box of flowers.
   **LANDSCAPE** framing (about 2.4 wide × 1 tall), the timber trough resting along the BOTTOM of the image, the
   trailing foliage hanging below it. (Magenta key.)

Each reads as its piece of shopfront dressing instantly by silhouette; **no readable text/numbers/letters** (no
shop names, no prices, no labels).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject **dead front-on**
(flat orthographic, even light, no cast shadow, no perspective floor, no second subject) on the solid magenta
background. Save the raws to `tools/gen/source_batch58/`. Write your prompts (and the key colour used per
sprite) to `tools/gen/prompts/batch58.md`. (If an `image_gen` call returns a server error, just retry — it
succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch58.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, MAGENTA `#ff00ff`) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (downscale, keep aspect). Output to
**`assets/sprites/props/`** as `PROP_Shop_Awning.png`, `PROP_Shop_Window.png`, `PROP_Shop_FlowerBox.png`
(8-bit RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0), **0% residual
magenta fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept — awning landscape,
window square-to-portrait, flower box landscape), file size, and a one-line note that it reads as its piece of
shopfront dressing with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 58 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not** edit
anything else, do **not** run git, do **not** touch `src/`.
