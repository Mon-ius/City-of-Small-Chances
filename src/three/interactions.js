// Points of interest you can walk up to in the harbour, and the proximity test
// that decides which one you're close enough to use. This is the second strand of
// wiring the retained simulation into the 3D world (after the clock): the content
// of each panel is read straight from the sim's data tables — Mei from the NPC
// roster, the notice board from the job list — so what you read in-world is the
// real city, not placeholder text. Full conversations / shift scenes land later;
// this milestone is the approach-and-read loop the book calls a "context prompt".

import { JOBS } from "../data/jobs.js";
import { NPCS } from "../data/npcs.js";
import { fmtClock } from "../core/time.js";

const RADIUS = 3.4; // metres: how close you must stand to get the prompt

const titleCase = (id) =>
  String(id).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function fmtWindow(windows) {
  if (!windows || !windows.length) return "anytime";
  const [a, b] = windows[0];
  return `${fmtClock(a)}–${fmtClock(b)}`;
}

// Mei's stall — a first taste of the relationship system, read from npcs.js.
function vendorPanel() {
  const mei = NPCS.find((n) => n.id === "mei") || NPCS[0];
  return {
    title: `${mei.icon || ""} ${mei.name} · ${mei.role}`.trim(),
    accent: mei.color || "#e0833c",
    lead: mei.blurb,
    lines: [
      mei.voice && mei.voice.stranger ? mei.voice.stranger : "",
      mei.pressure ? `On her mind: ${mei.pressure}` : "",
      mei.offersMeal && mei.favour ? `Once she trusts you: ${mei.favour.label} — ${mei.favour.note}.` : "",
    ].filter(Boolean),
    foot: "Sitting down for a real conversation arrives in a coming update.",
  };
}

// The notice board — every job going across the city, read from jobs.js.
function boardPanel() {
  return {
    title: "📋 Harbour notice board",
    accent: "#6fa8ff",
    lead: "Work going across Haiyun City right now:",
    lines: JOBS.map((j) =>
      `${j.icon || "•"}  ${j.name} — ${titleCase(j.district)}, ${fmtWindow(j.windows)} · from $${j.pay && j.pay.base != null ? j.pay.base : "?"}`),
    foot: "Reach a job's district in its window to work the shift (coming soon).",
  };
}

// Anchored to real world positions; world.js places matching props/markers here.
export const INTERACTABLES = [
  { id: "vendor", x: -5, z: 4,  marker: 0xffb347, label: "Talk to Mei at the noodle stall", panel: vendorPanel() },
  { id: "board",  x: 5,  z: -6, marker: 0x6fa8ff, label: "Read the harbour notice board",   panel: boardPanel() },
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
