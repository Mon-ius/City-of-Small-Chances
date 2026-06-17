# Batch 56 — open for business: a door, a bracket lantern & a crate of wares give the façades a shopfront (PROP_Shop_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *make the signed buildings read as the shops they advertise.*
The east building row already carries hanging shop signs high on the wall (Tavern, Chandlery, HarbourGate,
FerryStop), pasted posters, washing strung overhead, and clipped bay topiary in tubs *flanking* each doorway —
but the **ground floor under every sign is blank wall.** The signs promise a tavern, a chandlery, a ferry
office; the wall below delivers nothing. There is **no door** on any building (you cannot see where you'd go
in), **no light at building level** (only the tall street lamps — the façades go dark and dead after dusk),
and **no goods at any threshold** (the cargo on the quay is weathered industrial casks, never a shop's tidy
wares). This batch adds that missing shopfront layer right where the topiary already frames it: **a weathered
timber door, a warm bracket wall-lantern beside it, and a tidy stack of retail crates at the step.** Three
**chroma-key cutouts** the orchestrator mounts on the building fronts under the existing signs — the door and
lantern as **FIXED façade cutouts** (the proven Batch-9 `harbourSigns` idiom — flat on the wall facing the
street at `yaw = −π/2`, NOT billboarded — a door and a wall-lamp hang still and face the walkable side), the
crate stack ground-planted at the threshold. They share the existing weathered period-harbour palette — worn
timber, black iron, faded paint — with **one new note: the lantern's warm amber glass**, which (lit emissive)
finally puts a warm light at the doors after dark. **You (codex) generate + chroma-key + log only. Do NOT
touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout style EXACTLY

Look first at the existing façade cutouts `assets/sprites/signage/SIGN_Tavern.png`,
`SIGN_Chandlery.png` and the prop `assets/sprites/props/PROP_Cargo_Barrels.png`. Each is a **single subject,
painted front-on, even diffuse light, on a SOLID flat chroma background, no ground shadow, no scene, no second
object,** in the muted weathered period-harbour palette (worn timber, rusted/black iron, faded paint). Match
that handling exactly — painterly not photoreal, one clean subject filling most of the frame. These are
working shopfront fixtures, so keep them **honest and unromantic**: salt-faded timber, scuffed paint, black
wrought iron, plain retail crates — the one allowed warm accent is the **amber glass of the lantern** (a soft
lit honey-gold, the only glow), kept rich but not neon. Paint each so it **reads clearly from the front** as
the thing it is.

## Chroma key — MAGENTA `#ff00ff`

Generate each on a **solid pure-magenta `#ff00ff`** background. Magenta is the safe universal key here — it
appears nowhere in weathered timber, black iron, faded paint, warm amber glass, or any market produce the
crates might hold — **no magenta/hot-pink anywhere on any subject** (keep painted reds muted and earthy, never
a pink that reads as the key). State the key used per sprite in `tools/gen/prompts/batch56.md` (MAGENTA for
all three).

## What to make — THREE shopfront fixtures (door, lantern, crates)

1. **`PROP_Shop_Door`** — *the way in.* A single **weathered closed timber door in its frame**, seen
   dead front-on, set in a plain stone or plaster surround with a worn stone **step at the foot**. Vertical
   plank or simple panelled door, salt-faded paint over grey timber, simple **black iron furniture** (a ring
   or lever handle, maybe a small knocker or a tiny glazed light over the lintel), honest and plain. Reads
   instantly as a shut harbour-house/shop door. **Tall PORTRAIT** framing (about 1 wide × 2 tall), the
   **stone step on the BOTTOM EDGE** of the image, the lintel near the top. (Magenta key.)
2. **`PROP_Shop_Lantern`** — *a light at the door.* A **wrought-iron bracket wall-lantern**: a black iron
   arm/bracket fixed to a wall at the top, carrying a glazed lantern with **warm amber glass panes** and a
   little peaked iron cap. Weathered black iron, the **amber glass softly glowing** (it will be lit emissive
   in-engine, so paint the glass as the warm light source). Reads as a mounted wall lamp. Upright
   **portrait-ish** framing (about 0.6 wide × 0.9 tall), the bracket fixing at the TOP edge (as it mounts to
   the wall), the lantern hanging just below. (Magenta key.)
3. **`PROP_Shop_Crates`** — *wares at the step.* A small tidy stack of **two or three retail wooden crates /
   open boxes** of goods set down at a shop door — clean sawn-timber boxes (NOT weathered industrial casks),
   one or two holding a little market produce or wrapped wares (muted earthy colours, no hot pink). Reads as a
   shopkeeper's goods stacked at the threshold. Roughly **SQUARE** framing (about 1 wide × 1 tall), the boxes
   sitting on the BOTTOM EDGE of the image. (Magenta key.)

Each reads as its fixture instantly by silhouette; **no readable text/numbers/letters** (no shop names, no
prices, no labels).

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single subject front-on on the
solid magenta background (flat even light, no cast shadow, no ground, no second subject). Save the raws to
`tools/gen/source_batch56/`. Write your prompts (and the key colour used per sprite) to
`tools/gen/prompts/batch56.md`. (If an `image_gen` call returns a server error, just retry — it succeeds on
the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch56.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, MAGENTA `#ff00ff`) to produce a clean RGBA cutout: **alpha-0 corners,
0% colour fringe**, the subject tightly cropped, the **longest side 512** (downscale, keep aspect). Output to
**`assets/sprites/props/`** as `PROP_Shop_Door.png`, `PROP_Shop_Lantern.png`, `PROP_Shop_Crates.png` (8-bit
RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent** (alpha 0), **0% residual
magenta fringe** at the alpha edge, the pixel dimensions (longest side 512, aspect kept — door tall portrait,
lantern portrait-ish, crates square-ish), file size, and a one-line note that it reads as its fixture with no
legible text.

## Log (no git, no `src/`)

Append **one** Batch 56 progress line to `docs/ART_PLAN.md`. Do **not** change any checkbox, do **not** edit
anything else, do **not** run git, do **not** touch `src/`.
