// Points of interest you can walk up to in the harbour, and the proximity test
// that decides which one you're close enough to use. This is the wiring of the
// retained simulation into the 3D world: the content of each panel is read
// straight from the sim's data tables — Mei from the NPC roster, the notice board
// from the job list — so what you read in-world is the real city, not placeholder
// text. As of v0.1.3 the board is live: it reflects the world clock and your own
// pocket, and working an open shift earns its pay and spends the day.

import { JOBS } from "../data/jobs.js";
import { NPCS } from "../data/npcs.js";
import { fmtClock } from "../core/time.js";
import { jobStatus } from "./playerstate.js";

const RADIUS = 3.4; // metres: how close you must stand to get the prompt

const titleCase = (id) =>
  String(id).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function fmtWindow(windows) {
  if (!windows || !windows.length) return "anytime";
  return windows.map(([a, b]) => `${fmtClock(a)}–${fmtClock(b)}`).join(", ");
}

const hours = (min) => {
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
};

// Painted NPC portrait (Batch 4): assets/ui/portraits/CHAR_Portrait_<Name>_<tier>.
// `tier` is the closeness stage; the thin slice has no relationship state yet, so
// callers pass "stranger" to match the stranger voice line shown.
const portraitFor = (npc, tier = "stranger") => {
  const name = (npc.short || npc.id);
  const Cap = name.charAt(0).toUpperCase() + name.slice(1);
  return `./assets/ui/portraits/CHAR_Portrait_${Cap}_${tier}_albedo.png`;
};

// Mei's stall — a first taste of the relationship system, read from npcs.js.
function vendorPanel() {
  const mei = NPCS.find((n) => n.id === "mei") || NPCS[0];
  return {
    title: `${mei.icon || ""} ${mei.name} · ${mei.role}`.trim(),
    accent: mei.color || "#e0833c",
    portrait: portraitFor(mei, "stranger"),
    portraitAlt: `${mei.name}, ${mei.role}`,
    lead: mei.blurb,
    lines: [
      mei.voice && mei.voice.stranger ? mei.voice.stranger : "",
      mei.pressure ? `On her mind: ${mei.pressure}` : "",
      mei.offersMeal && mei.favour ? `Once she trusts you: ${mei.favour.label} — ${mei.favour.note}.` : "",
    ].filter(Boolean),
    foot: "Sitting down for a real conversation arrives in a coming update.",
  };
}

// The notice board — every job going across the city, read live from jobs.js and
// scored against the world clock + your energy. Open shifts are workable buttons.
function boardBuild(ctx) {
  const { nowMin, pstate } = ctx;
  const items = JOBS.map((job, i) => {
    const st = jobStatus(job, nowMin, pstate);
    const base = `${titleCase(job.district)} · ${fmtWindow(job.windows)} · ${hours(job.minutes)} · +$${job.pay.base}`;
    if (st.workable) {
      return {
        state: "open",
        key: i + 1, // press this number (or click) to work it
        label: `${job.icon || "•"} ${job.name}`,
        sub: `${base} · costs ${st.cost} energy`,
      };
    }
    let note;
    if (st.reason === "tired") note = `you're too tired — needs ${st.cost} energy`;
    else if (st.reason === "requires") note = st.note || "you don't meet what this work needs yet";
    else if (st.reason === "no-time") note = "not enough day left for this shift";
    else note = `opens ${fmtClock(job.windows[0][0])}`;
    return { state: "locked", label: `${job.icon || "•"} ${job.name}`, sub: base, note };
  });
  return {
    title: "📋 Harbour notice board",
    accent: "#6fa8ff",
    lead: "Work going across Haiyun City right now — take an open shift:",
    banner: pstate.lastWork || null,
    items,
    foot: "Open shifts pay on the spot and pass the hours. Closed ones wait for their window.",
  };
}

// Work job #i, if it's workable now. Advances the world clock by the shift length.
function boardAct(i, ctx) {
  const { nowMin, pstate, day } = ctx;
  const job = JOBS[i];
  if (!job) return { ok: false };
  const res = pstate.work(job, nowMin);
  if (!res.ok) return res;
  if (day && typeof day.setMinutes === "function") day.setMinutes(nowMin + res.minutes);
  const endMin = day && typeof day.minutes === "number" ? Math.floor(day.minutes) : nowMin + res.minutes;
  pstate.lastWork = `✓ ${job.name}: earned $${res.pay}, −${res.energySpent} energy. It's now ${fmtClock(endMin)}.`;
  return res;
}

// Anchored to real world positions; world.js places matching props/markers here.
export const INTERACTABLES = [
  { id: "vendor", x: -5, z: 4,  marker: 0xffb347, label: "Talk to Mei at the noodle stall", panel: vendorPanel() },
  { id: "board",  x: 5,  z: -6, marker: 0x6fa8ff, label: "Read the harbour notice board",   build: boardBuild, act: boardAct },
];

export function createInteractions(player) {
  const r2 = RADIUS * RADIUS;
  return {
    list: INTERACTABLES,
    // The nearest interactable within reach of the player, or null.
    nearest() {
      const p = player.root.position;
      let best = null, bestD = r2;
      for (const it of INTERACTABLES) {
        const dx = p.x - it.x, dz = p.z - it.z;
        const d = dx * dx + dz * dz;
        if (d <= bestD) { bestD = d; best = it; }
      }
      return best;
    },
  };
}
