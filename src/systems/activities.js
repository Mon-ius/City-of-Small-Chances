// Activity resolution. Given an activity definition and current state, check it
// can be done, apply its costs and effects, advance the clock, grow skills, and
// record everything in the day ledger and narrative log.

import { ACTIVITIES } from "../data/content.js";
import { getDistrict } from "../data/districts.js";
import { advanceClock, minutesLeft } from "../core/time.js";
import { applyCondition, applySkills, passiveDrift } from "./condition.js";

// List activities from a pool (default: all). `pool` is an array of activity ids.
export function listActivities(state, pool = null) {
  const defs = pool
    ? pool.map((id) => ACTIVITIES.find((a) => a.id === id)).filter(Boolean)
    : ACTIVITIES;
  return defs.map((a) => {
    const enoughTime = minutesLeft(state) >= a.minutes;
    const enoughMoney = state.money >= (a.cost || 0);
    const reqOk = a.requires ? a.requires(state) : true;
    let reason = null;
    if (!enoughTime) reason = "Not enough time left today.";
    else if (!enoughMoney) reason = `Costs $${a.cost} — you can't afford it.`;
    else if (!reqOk) reason = a.requiresNote || "You can't do this right now.";
    return { def: a, enabled: enoughTime && enoughMoney && reqOk, reason };
  });
}

// Activities you can do where you currently stand (book §6 — places gate work).
export function listLocalActivities(state) {
  return listActivities(state, getDistrict(state.location).activities);
}

// Perform an activity by id. Returns a result summary for the UI, or null if it
// could not be performed.
export function performActivity(game, id) {
  const state = game.store.state;
  const a = ACTIVITIES.find((x) => x.id === id);
  if (!a) return null;

  // Gate checks.
  if (minutesLeft(state) < a.minutes) return null;
  if (state.money < (a.cost || 0)) return null;
  if (a.requires && !a.requires(state)) return null;

  const rng = game.rng;
  const before = { ...state.condition };

  // Compute effect deltas.
  const delta = a.apply ? a.apply(state.condition, state, rng) : {};

  // Money first (cost out, earnings in).
  if (a.cost) {
    state.money -= a.cost;
    state.ledger.spent += a.cost;
    state.stats.spent += a.cost;
    addLedger(state, a.name, -a.cost, "cost");
  }
  if (typeof delta.money === "number" && delta.money !== 0) {
    state.money += delta.money;
    if (delta.money > 0) {
      state.ledger.earned += delta.money;
      state.stats.earned += delta.money;
      addLedger(state, a.name, +delta.money, a.isWork ? "wages" : "income");
    }
  }

  // Condition + skills.
  applyCondition(state, delta);
  applySkills(state, a.skill);

  // Time passes — clock + passive drift.
  passiveDrift(state, a.minutes);
  const roll = advanceClock(state, a.minutes);

  // Bookkeeping.
  if (a.isWork) state.stats.shiftsWorked++;
  if (id === "cook_meal" || id === "eat_out") state.stats.mealsEaten++;

  // Narrative.
  pushLog(state, a.note || `You ${a.name.toLowerCase()}.`);

  // Persist the running RNG state so reloads stay deterministic.
  state.rng.state = rng.getState();

  const result = {
    activity: a,
    pay: delta._pay || (delta.money > 0 ? delta.money : 0),
    before,
    after: { ...state.condition },
    forcedSleep: roll.rolledOver,
  };

  game.store.emit();
  game.autosave();
  return result;
}

export function addLedger(state, label, money, kind) {
  state.ledger.items.push({ label, money, kind });
}

export function pushLog(state, line) {
  state.log.push({ day: state.day, line });
  if (state.log.length > 40) state.log.shift();
}
