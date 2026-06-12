// Jobs system (book §9). Turns the declarative job tables (data/jobs.js) into:
//   • availability — are you here, in a time window, qualified, with time/energy?
//   • difficulty   — the shift-scene tuning, scaled by skill, mastery and energy
//   • resolution   — convert a finished shift's quality (0..1) into pay, skill
//                    growth, condition cost, injury risk and mastery progress
//   • mastery      — XP curve that unlocks pattern preview, then auto-resolve
// The UI (ui/shift.js, ui/jobboard.js) renders; all the numbers live here so they
// stay testable in isolation (node sim) and honest (book: no opaque formulas).

import { JOBS, getJob } from "../data/jobs.js";
import { advanceClock, minutesLeft, fmtClock } from "../core/time.js";
import { applyCondition, applySkills, passiveDrift } from "./condition.js";
import { addLedger, pushLog } from "./activities.js";
import { bumpRep } from "./reputation.js";
import { clamp } from "../core/state.js";

// ── Mastery curve ──────────────────────────────────────────────────────────
// Cumulative XP needed to *reach* each level. ~2 shifts to L1, ~4 to L2 (preview),
// ~7 to L3, ~11 to L4 (auto-resolve), ~16 to L5 (full mastery).
export const MASTERY_XP = [0, 14, 36, 70, 120, 190];
export const MASTERY_MAX = MASTERY_XP.length - 1;

export function masteryLevel(xp) {
  let lvl = 0;
  for (let i = 0; i < MASTERY_XP.length; i++) if (xp >= MASTERY_XP[i]) lvl = i;
  return lvl;
}

export function getMastery(state, jobId) {
  const m = (state.jobs && state.jobs.mastery && state.jobs.mastery[jobId]) || { xp: 0, shifts: 0, best: 0 };
  return { xp: m.xp || 0, shifts: m.shifts || 0, best: m.best || 0, level: masteryLevel(m.xp || 0) };
}

// Progress (0..1) from current level toward the next, for the UI bar.
export function masteryProgress(xp) {
  const lvl = masteryLevel(xp);
  if (lvl >= MASTERY_MAX) return 1;
  const lo = MASTERY_XP[lvl], hi = MASTERY_XP[lvl + 1];
  return clamp((xp - lo) / (hi - lo), 0, 1);
}

// ── Availability ─────────────────────────────────────────────────────────────
function inWindow(clock, windows) {
  return windows.some(([from, to]) => clock >= from && clock < to);
}

// The next window opening at/after `clock` today, or null if all have passed.
function nextWindow(clock, windows) {
  const upcoming = windows
    .filter(([from]) => from > clock)
    .sort((a, b) => a[0] - b[0]);
  return upcoming.length ? upcoming[0] : null;
}

export function windowText(job) {
  return job.windows.map(([f, t]) => `${fmtClock(f)}–${fmtClock(t)}`).join(" · ");
}

// Full status of a job for the board: can you start it now, and if not, why?
export function jobStatus(state, job) {
  const here = state.location === job.district;
  const open = inWindow(state.clock, job.windows);
  const qualifies = job.requires ? job.requires(state) : true;
  const hasTime = minutesLeft(state) >= job.minutes;
  const mastery = getMastery(state, job.id);

  let reason = null;
  if (!here) reason = "You're not in this district.";
  else if (!qualifies) reason = job.requiresNote || "You don't meet the requirements.";
  else if (!open) {
    const nxt = nextWindow(state.clock, job.windows);
    reason = nxt ? `Opens at ${fmtClock(nxt[0])}.` : "No shifts left today.";
  } else if (!hasTime) reason = "Not enough time left in the day.";

  const [lo, hi] = payRange(state, job, mastery.level);
  return {
    job, mastery,
    available: here && open && qualifies && hasTime,
    here, open, qualifies, hasTime,
    reason, payLo: lo, payHi: hi,
    window: windowText(job),
    canAuto: mastery.level >= job.mastery.autoAt,
    canPreview: mastery.level >= job.mastery.previewAt,
  };
}

// Jobs you can see from where you stand (any in this district, gated below).
export function listLocalJobs(state) {
  return JOBS.filter((j) => j.district === state.location).map((j) => jobStatus(state, j));
}

// ── Weather modifiers ────────────────────────────────────────────────────────
// Physical work is slower & worth a touch less in bad weather; delivery work is
// worth MORE (demand spikes) but the shift runs faster (harder). Book §8/§19.
function weatherPay(job, weather) {
  const wet = weather === "rain", storm = weather === "storm";
  if (job.pay.weather === "physical") return storm ? 0.85 : wet ? 0.93 : 1;
  if (job.pay.weather === "delivery") return storm ? 1.2 : wet ? 1.12 : 1;
  return 1;
}
function weatherTempo(job, weather) {
  const wet = weather === "rain", storm = weather === "storm";
  if (job.pay.weather === "delivery") return storm ? 0.82 : wet ? 0.9 : 1; // faster = harder
  if (job.pay.weather === "physical") return storm ? 0.94 : wet ? 0.97 : 1;
  return 1;
}

function primaryAvg(state, job) {
  const sum = job.primary.reduce((a, k) => a + (state.skills[k] || 0), 0);
  return sum / job.primary.length;
}

// ── Pay ──────────────────────────────────────────────────────────────────────
// raw = (base + skill/skillDiv) × qualityMult × weather × mastery. Floors so even
// a poor shift pays something; jitter added at resolve time (not in estimates).
function payCore(state, job, quality, level) {
  const skillBonus = primaryAvg(state, job) / job.pay.skillDiv;
  const qualityMult = 0.55 + quality * 0.75;     // 0.55 → 1.30
  const masteryMult = 1 + level * 0.03;          // up to +15%
  const wx = weatherPay(job, state.weather);
  const raw = (job.pay.base + skillBonus) * qualityMult * masteryMult * wx;
  return Math.max(Math.round(job.pay.base * 0.4), Math.round(raw));
}

// UI estimate band: a fair-to-good shift (quality 0.5 → 0.95).
export function payRange(state, job, level) {
  return [payCore(state, job, 0.5, level), payCore(state, job, 0.95, level)];
}

// ── Shift difficulty ─────────────────────────────────────────────────────────
// Returns the mini-game tuning. A wider `band` (good-zone half-width as a fraction
// of the track) is easier; higher `tempoMs` (ms per cursor sweep) is slower/easier.
// Skill, mastery and energy widen the band and slow the sweep; bad weather narrows.
export function shiftParams(state, job) {
  const mastery = getMastery(state, job.id);
  const skillNorm = clamp(primaryAvg(state, job) / 100, 0, 1);
  const energyNorm = clamp(state.condition.energy / 100, 0, 1);

  let band = job.task.band + skillNorm * 0.1 + mastery.level * 0.012 + (energyNorm - 0.5) * 0.04;
  band = clamp(band, 0.08, 0.42);

  let tempoMs = job.task.tempo * (1 + skillNorm * 0.15) * weatherTempo(job, state.weather);
  tempoMs = clamp(tempoMs, 700, 2200);

  return {
    beats: job.task.beats,
    tempoMs,
    band,
    perfectBand: band * 0.34,
    verb: job.task.verb,
    unit: job.task.unit,
    preview: mastery.level >= job.mastery.previewAt,
    masteryLevel: mastery.level,
  };
}

// Auto-resolve (mastery ≥ autoAt): a fair quality from skill, energy, mastery and
// weather — deliberately a touch below good manual play, so skill still pays.
export function autoResolveQuality(state, job) {
  const skillNorm = clamp(primaryAvg(state, job) / 100, 0, 1);
  const energyNorm = clamp(state.condition.energy / 100, 0, 1);
  const level = getMastery(state, job.id).level;
  const wxPenalty = weatherTempo(job, state.weather) < 0.95 ? 0.08 : 0;
  return clamp(0.46 + skillNorm * 0.4 + level * 0.04 + (energyNorm - 0.5) * 0.12 - wxPenalty, 0.2, 0.95);
}

// ── Condition cost ───────────────────────────────────────────────────────────
// Effort scales with shift length and family; a poor shift stresses you more.
function shiftCondition(job, quality) {
  const m = job.minutes;
  const physical = job.pay.weather === "physical";
  const delivery = job.family === "delivery";
  const sloppy = quality < 0.5;
  if (job.family === "admin") {
    return { energy: -(8 + Math.round(m / 20)), hunger: -(6 + Math.round(m / 26)), stress: sloppy ? 8 : 4, hope: quality > 0.6 ? 3 : 1 };
  }
  const base = physical ? 22 : delivery ? 18 : 16;
  return {
    energy: -(base + Math.round(m / 12)),
    hunger: -(8 + Math.round(m / 16)),
    stress: sloppy ? 9 : 5,
    health: physical && sloppy ? -2 : 0,
    hope: quality > 0.6 ? 3 : 1,
  };
}

// ── Resolution ───────────────────────────────────────────────────────────────
// Apply a completed shift. `quality` ∈ [0,1] from the mini-game (or auto-resolve).
// `auto` flags an auto-resolved shift (less mastery XP, no narrative "you nailed it").
export function resolveShift(game, jobId, quality, { auto = false } = {}) {
  const state = game.store.state;
  const job = getJob(jobId);
  if (!job) return null;

  const status = jobStatus(state, job);
  if (!status.available) return null;

  const rng = game.rng;
  quality = clamp(quality, 0, 1);
  const beforeMastery = getMastery(state, job.id);
  const before = { ...state.condition };

  // Pay (with a little jitter on top of the core estimate).
  const pay = Math.max(0, payCore(state, job, quality, beforeMastery.level) + rng.int(-3, 5));
  state.money += pay;
  state.ledger.earned += pay;
  state.stats.earned += pay;
  addLedger(state, `${job.name} (${qualityWord(quality)})`, +pay, "wages");

  // Condition + skill growth (skills scale with how well you worked).
  applyCondition(state, shiftCondition(job, quality));
  const skillGrant = {};
  const growth = 1 + Math.round(quality * 2); // 1..3
  for (const k of job.primary) skillGrant[k] = growth;
  applySkills(state, skillGrant);

  // Time passes.
  passiveDrift(state, job.minutes);
  const roll = advanceClock(state, job.minutes);

  // Injury risk — tired and sloppy, physical work can hurt you.
  let injury = false;
  if (job.risk.chance > 0 && state.condition.energy < job.risk.atEnergy && quality < 0.55) {
    const odds = job.risk.chance * (1 + (0.55 - quality));
    if (rng.chance(odds)) {
      injury = true;
      const hit = rng.int(job.risk.healthHit[0], job.risk.healthHit[1]);
      applyCondition(state, { health: -hit, stress: +8, hope: -3 });
      state.stats.injuries = (state.stats.injuries || 0) + 1;
      pushLog(state, `You strain something on the ${job.name.toLowerCase()} — it'll nag for a day or two.`);
    }
  }

  // Mastery progress.
  const xpGain = auto ? Math.round(4 + quality * 6) : Math.round(6 + quality * 10);
  const slot = ensureMastery(state, job.id);
  slot.xp += xpGain;
  slot.shifts += 1;
  slot.best = Math.max(slot.best, Math.round(quality * 100));
  const afterMastery = getMastery(state, job.id);
  const leveledUp = afterMastery.level > beforeMastery.level;
  let unlock = null;
  if (leveledUp) {
    if (afterMastery.level === job.mastery.previewAt) unlock = "You can now read the pattern a beat ahead.";
    else if (afterMastery.level === job.mastery.autoAt) unlock = "Mastered: you can auto-resolve this shift.";
    else unlock = `Mastery ${afterMastery.level} — you work cleaner and faster.`;
  }

  // Reputation: clean work builds the district's trust in you; a sloppy shift or
  // an injury dents it. This feeds the Opportunity Web's reputation gates.
  const repDelta = bumpRep(state, job.district, injury ? -2 : quality >= 0.6 ? 2 : quality < 0.4 ? -1 : 1);

  // Stats + narrative.
  state.stats.shiftsWorked++;
  if (!injury) pushLog(state, shiftLine(job, quality, auto));
  state.rng.state = rng.getState();

  const result = {
    job, quality, pay, auto, injury, repDelta,
    level: afterMastery.level, leveledUp, masteryUnlock: unlock, xpGain,
    skillGrant, before, after: { ...state.condition },
    forcedSleep: roll.rolledOver,
  };

  game.store.emit();
  game.autosave();
  return result;
}

function ensureMastery(state, jobId) {
  if (!state.jobs) state.jobs = { mastery: {} };
  if (!state.jobs.mastery) state.jobs.mastery = {};
  if (!state.jobs.mastery[jobId]) state.jobs.mastery[jobId] = { xp: 0, shifts: 0, best: 0 };
  return state.jobs.mastery[jobId];
}

export function qualityWord(q) {
  if (q >= 0.9) return "flawless";
  if (q >= 0.75) return "sharp";
  if (q >= 0.55) return "solid";
  if (q >= 0.35) return "scrappy";
  return "rough";
}

function shiftLine(job, q, auto) {
  if (auto) return `You work the ${job.name.toLowerCase()} on muscle memory. The pay clears.`;
  if (q >= 0.9) return `You move like the work was made for you. The ${job.unit}s fly.`;
  if (q >= 0.7) return `A clean, steady ${job.name.toLowerCase()}. Good day's pay.`;
  if (q >= 0.45) return `You get through the ${job.name.toLowerCase()}, sweat and all.`;
  return `It's a slog. You finish the ${job.name.toLowerCase()}, barely in rhythm.`;
}
