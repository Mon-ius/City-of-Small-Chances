// Reputation — per-district reliability (book §11). A quiet record of whether the
// people in a district have learned they can count on you. Clean shifts and
// showing up for neighbours build it; injuries and sloppy work dent it. It's an
// input to the Opportunity Web, and (per the book) every change must be
// explainable — so the hooks that move it always say why in the day log.

import { clamp } from "../core/state.js";
import { getDistrict } from "../data/districts.js";

export const REP_MIN = -40;
export const REP_MAX = 100;

// Reputation bands, used for the word + tone the UI shows and the book's
// "Old Harbour reliability positive" style gates.
const BANDS = [
  { at: -40, word: "distrusted", tone: "bad" },
  { at: -12, word: "shaky", tone: "warn" },
  { at: 0, word: "unknown", tone: "mid" },
  { at: 12, word: "known", tone: "mid" },
  { at: 30, word: "reliable", tone: "ok" },
  { at: 55, word: "trusted", tone: "ok" },
  { at: 80, word: "pillar", tone: "ok" },
];

export function getRep(state, districtId) {
  return (state.reputation && typeof state.reputation[districtId] === "number") ? state.reputation[districtId] : 0;
}

export function repBand(value) {
  let b = BANDS[0];
  for (const band of BANDS) if (value >= band.at) b = band;
  return b;
}

export function repWord(value) { return repBand(value).word; }
export function repTone(value) { return repBand(value).tone; }

// Move a district's reputation, clamped, with a defensive guard for partial
// (mid-migration) states. Returns the actual signed delta applied.
export function bumpRep(state, districtId, amount) {
  if (!state.reputation || typeof state.reputation !== "object") state.reputation = {};
  const before = getRep(state, districtId);
  const after = clamp(before + amount, REP_MIN, REP_MAX);
  state.reputation[districtId] = after;
  return after - before;
}

// A short, honest line for the day log when reputation shifts (book: explain
// which actions built or damaged it).
export function repLine(state, districtId, delta) {
  if (!delta) return null;
  const where = getDistrict(districtId).short;
  if (delta > 0) return `Word gets around ${where}: people are starting to count on you.`;
  return `Word gets around ${where}: that didn't go unnoticed.`;
}
