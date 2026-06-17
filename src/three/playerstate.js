// The player's pocket: money, energy, and the rules for working a shift.
// Pure logic, no DOM and no Three.js — deterministic (no Math.random), so the
// same inputs always give the same outcome and the headless smoke can assert it.
//
// This is the second wiring of the retained engine into the walkable world: the
// notice board reads the real job tables (src/data/jobs.js) and working a shift
// spends the same minute-of-day clock the day cycle already runs on.

import { DAY_END_MIN } from "../core/time.js";

// Energy a shift burns, per job family — physical work costs more per minute.
// Clamped so even a short shift is felt and the hardest never wipes you in one go.
const ENERGY_RATE = { labour: 0.10, delivery: 0.09, admin: 0.05, service: 0.05 };

export function energyCost(job) {
  const rate = ENERGY_RATE[job.family] ?? 0.07;
  return Math.min(40, Math.max(6, Math.round(job.minutes * rate)));
}

// Is the shift offered at this minute-of-day? (A job can have several windows.)
export function windowOpen(job, nowMin) {
  return job.windows.some(([a, b]) => nowMin >= a && nowMin <= b);
}

// Shape the lightweight pocket into the state object the sim's job.requires(state)
// gates read — so the board honours the very same entry rules the engine declares
// (a bicycle for courier work, proven focus for the records desk). Skills and
// inventory aren't earnable in the walkable build yet, so those gates stay shut and
// say why; the energy floor is live from the player's own energy.
function simState(player) {
  return {
    condition: { energy: player.energy },
    inventory: player.inventory || {},
    skills: player.skills || {},
  };
}

// Why you can (or can't) work a job right now — legible, like the rest of the game.
export function jobStatus(job, nowMin, player) {
  const cost = energyCost(job);
  if (!windowOpen(job, nowMin)) return { workable: false, reason: "closed", cost };
  if (job.requires && !job.requires(simState(player)))
    return { workable: false, reason: "requires", cost, note: job.requiresNote };
  if (nowMin + job.minutes > DAY_END_MIN) return { workable: false, reason: "no-time", cost };
  if (player.energy < cost) return { workable: false, reason: "tired", cost };
  return { workable: true, cost };
}

export function createPlayerState(opts = {}) {
  return {
    // $240 is the "Carried debt" starting cash from the book's opening: you
    // arrive in Haiyun City owing money, so every shift counts.
    money: opts.money ?? 240,
    energy: opts.energy ?? 100,
    shiftsWorked: 0,
    lastWork: null, // a transient one-line result, shown on the board while it's open

    canWork(job, nowMin) {
      return jobStatus(job, nowMin, this).workable;
    },

    // Apply a shift: pay in hand, energy spent, a shift on the record. Returns the
    // deltas (the caller advances the world clock by `minutes`). No-op if not workable.
    work(job, nowMin) {
      const st = jobStatus(job, nowMin, this);
      if (!st.workable) return { ok: false, reason: st.reason };
      const pay = job.pay.base;
      this.money += pay;
      this.energy = Math.max(0, this.energy - st.cost);
      this.shiftsWorked += 1;
      return { ok: true, pay, energySpent: st.cost, minutes: job.minutes };
    },
  };
}
