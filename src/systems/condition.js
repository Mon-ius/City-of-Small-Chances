// Condition system. Applies deltas to the 0..100 meters, derives status labels,
// and runs the passive drift that happens as time passes (hunger falls, stress
// leaks). Kept readable and fair per the book's anti-"opaque meters" rule.

import { clamp, CONDITION_KEYS } from "../core/state.js";

// Apply a delta object {energy:+5, stress:-3, ...} to state.condition.
export function applyCondition(state, delta) {
  for (const k of CONDITION_KEYS) {
    if (typeof delta[k] === "number") {
      state.condition[k] = clamp(state.condition[k] + delta[k]);
    }
  }
}

// Apply skill growth {logistics:+2}. Skills cap at 100.
export function applySkills(state, grant) {
  if (!grant) return;
  for (const [k, v] of Object.entries(grant)) {
    if (k in state.skills) state.skills[k] = clamp(state.skills[k] + v, 0, 100);
  }
}

// Passive drift per `minutes` of activity. Hunger always falls; energy leaks a
// little when starving; stress slowly self-corrects toward a baseline.
export function passiveDrift(state, minutes) {
  const hours = minutes / 60;
  const c = state.condition;
  c.hunger = clamp(c.hunger - 3.2 * hours);
  if (c.hunger <= 12) c.energy = clamp(c.energy - 2.5 * hours); // hunger saps energy
  if (c.stress > 30) c.stress = clamp(c.stress - 0.8 * hours); // mild decay
  if (c.hunger <= 4 || c.energy <= 4) c.health = clamp(c.health - 1.4 * hours);
}

// Status word + tone for a meter value, honouring whether high or low is good.
export function statusOf(key, value, good) {
  const v = good === "low" ? 100 - value : value;
  if (v >= 75) return { word: "good", tone: "ok" };
  if (v >= 45) return { word: "fair", tone: "mid" };
  if (v >= 20) return { word: "low", tone: "warn" };
  return { word: "critical", tone: "bad" };
}

// Is the player in a state that forces consequences? Used for warnings.
export function conditionWarnings(state) {
  const w = [];
  const c = state.condition;
  if (c.hunger <= 15) w.push("You're going hungry — eat before your strength goes.");
  if (c.energy <= 15) w.push("You're running on empty. Rest or risk mistakes and illness.");
  if (c.health <= 25) w.push("Your health is poor. Push harder and you may fall ill.");
  if (c.stress >= 80) w.push("Stress is near burnout. Your choices are narrowing.");
  if (c.hope <= 15) w.push("Hope is thin. Small wins matter more than they look.");
  return w;
}
