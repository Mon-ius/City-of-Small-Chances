# Batch 42 — dress the working quay: harbour clutter cutouts (PROP_Quay_*, WIRED LIVE)

**Milestone:** environment polish toward AAA quality — *make the quay read as a working
port.* The walkable harbour now has painted ground, varied building walls (Batch 40) and
roofs (Batch 41), a dressed market stall, a notice board, crates/barrels, lamps and a
moored boat — but the long quay itself is still mostly **bare deck**. Real working
harbours are cluttered with the gear of the trade: coiled mooring rope, fishing nets hung
to dry, buoys and fenders, stacked lobster/crab pots. This batch adds **four chroma-key
cutout props** that the orchestrator scatters along the quay — the same proven idiom as
the Batch-17 market goods and Batch-18 vehicles. **You (codex) generate + chroma-key + log
only. Do NOT touch `src/`. Do NOT run git.** (The orchestrator wires them into `world.js`.)

## Match the existing cutout-prop style EXACTLY

Look first at the existing harbour cutout props
`assets/sprites/props/PROP_Market_Crate.png` and `PROP_Market_Sacks.png` (Batch 17) and
`assets/sprites/props/PROP_Vehicle_Scooter.png` (Batch 18). Each is a **single object,
painted front-on / slight-side-on, even diffuse light, on a SOLID flat chroma background**
for keying, **no ground shadow, no scene, no second object**, in the muted period-harbour
palette. Match that: one clean object per image, filling most of the frame, upright as it
would sit on the deck, painterly not photoreal. These will be stood up as flat cutouts
against/near harbour structures, so paint each so it **reads clearly from the front**.

## Chroma key — GREEN default, MAGENTA for any green/teal subject

Generate each on a **solid pure-green `#00ff00`** background **UNLESS the subject itself
contains green or teal** (e.g. a green fishing net, green floats) — for those use a
**solid pure-magenta `#ff00ff`** background instead, so the key never eats the subject.
State which key you used for each in `tools/gen/prompts/batch42.md`.

## What to make — FOUR harbour-clutter cutouts

1. **`PROP_Quay_RopeCoil`** — *a coil of thick mooring rope.* A neat flat-ish spiral coil
   of heavy tarred hemp rope as it sits on a quay, natural brown/ochre, the lay of the
   rope visible. (Green key.)
2. **`PROP_Quay_FishingNet`** — *a heaped / draped fishing net.* A bundle of fishing net
   with a few cork/float beads and a hint of rope edge, as if dropped or hung to dry.
   (If you paint the net green/teal — common — use the **magenta** key.)
3. **`PROP_Quay_Buoys`** — *a cluster of harbour buoys / fenders.* Two or three round or
   cylindrical mooring buoys / fenders roped together, weathered orange-red and off-white,
   the kind hung along a harbour wall. (Green key — keep them warm/red, not green.)
4. **`PROP_Quay_LobsterPots`** — *a stack of lobster / crab pots.* Two or three woven
   wicker/withy creel pots stacked, domed traps with the netting and entry hole reading,
   weathered tan/brown. (Green key.)

Each reads its object instantly by silhouette; **no readable text/numbers/letters**.

## Generate

Use your built-in **`image_gen` skill (GPT-Image-2)**. For each, generate the single prop
front-on on the solid chroma background (flat even light, no cast shadow, no ground, no
second object). Save the raws to `tools/gen/source_batch42/`. Write your prompts (and the
key colour used per prop) to `tools/gen/prompts/batch42.md`. (If an `image_gen` call
returns a server error, just retry — it succeeds on the second attempt.)

## Post-process — chroma-key to clean RGBA cutouts

Write `tools/gen/postprocess_batch42.sh` that runs the codex chroma-key remover
`$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py` on each raw
(`--auto-key border --despill --force`, GREEN or MAGENTA per the prop) to produce a clean
RGBA cutout: **alpha-0 corners, 0% colour fringe**, the subject tightly cropped, the
**longest side 512** (downscale, keep aspect — these are mid-size props, not full-figure).
Output to **`assets/sprites/props/`** as `PROP_Quay_RopeCoil.png`,
`PROP_Quay_FishingNet.png`, `PROP_Quay_Buoys.png`, `PROP_Quay_LobsterPots.png` (8-bit
RGBA, quantised small).

Verify with Pillow and report for each: it is **RGBA**, **corners fully transparent**
(alpha 0), **0% residual green/magenta fringe** at the alpha edge, the pixel dimensions
(longest side 512, aspect kept), file size, and a one-line note that it reads as its object
with no legible text.

## Log (no git, no `src/`)

Append **one** Batch 42 progress line to `docs/ART_PLAN.md`. Do **not** change any
checkbox, do **not** edit anything else, do **not** run git, do **not** touch `src/`.
