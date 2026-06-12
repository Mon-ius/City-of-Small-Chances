// Travel between districts. Time is the scarce resource (book §6/§7): every hop
// spends minutes, foot travel tires you and rain makes it worse, and the tram
// buys speed and comfort for a fare. A bicycle (inventory) replaces walking with
// faster, cheaper cycling. Returns plain data the map UI renders into choices.

import { advanceClock, minutesLeft } from "../core/time.js";
import { getDistrict, districtDistance } from "../data/districts.js";
import { applyCondition, passiveDrift } from "./condition.js";
import { addLedger, pushLog } from "./activities.js";

// Weather multiplier on foot/cycle time (and a little stress).
function footWeather(weather) {
  return weather === "storm" ? 1.45 : weather === "rain" ? 1.22 : weather === "heat" ? 1.12 : 1;
}

// All travel modes from the current location to `toId`, with time/fare/effects
// and whether each is currently affordable / fits in the day.
export function travelModes(state, toId) {
  const from = getDistrict(state.location);
  const to = getDistrict(toId);
  if (!to || to.id === from.id) return [];
  const d = districtDistance(from.id, to.id);
  const wx = footWeather(state.weather);
  const wet = state.weather === "rain" || state.weather === "storm";
  const modes = [];

  if (state.inventory.bicycle) {
    const min = clampMin(Math.round(d * 0.42 * wx), 6);
    modes.push({ mode: "cycle", label: "Cycle", icon: "🚲", minutes: min, fare: 0,
      energy: -Math.round(min * 0.10), stress: wet ? 3 : -1, hope: 1 });
  } else {
    const min = clampMin(Math.round(d * 0.7 * wx), 8);
    modes.push({ mode: "walk", label: "Walk", icon: "🚶", minutes: min, fare: 0,
      energy: -Math.round(min * 0.14), stress: wet ? 4 : 1, hope: wet ? -1 : 1 });
  }

  // Tram: faster, restful, costs a fare. Always an option between districts.
  const tmin = clampMin(Math.round(d * 0.4), 6);
  const fare = clampMin(Math.round(d * 0.18), 2);
  modes.push({ mode: "tram", label: "Tram", icon: "🚊", minutes: tmin, fare,
    energy: -Math.round(tmin * 0.04), stress: -2, hope: 0 });

  return modes.map((m) => ({
    ...m, toId, fromId: from.id, distance: d,
    affordable: state.money >= m.fare,
    enoughTime: minutesLeft(state) >= m.minutes,
  }));
}

// Execute a move. Returns a result summary (incl. forcedSleep if it ran past
// midnight) or null if the chosen mode can't be afforded / doesn't fit the day.
export function travel(game, toId, mode) {
  const state = game.store.state;
  const opts = travelModes(state, toId);
  if (!opts.length) return null;
  const choice = opts.find((o) => o.mode === mode) || opts[0];
  if (minutesLeft(state) < choice.minutes) return null;
  if (state.money < choice.fare) return null;

  const to = getDistrict(toId);
  if (choice.fare) {
    state.money -= choice.fare;
    state.ledger.spent += choice.fare;
    state.stats.spent += choice.fare;
    addLedger(state, `${choice.icon} ${choice.label} to ${to.short}`, -choice.fare, "transit");
  }
  applyCondition(state, { energy: choice.energy, stress: choice.stress, hope: choice.hope });
  passiveDrift(state, choice.minutes);
  const roll = advanceClock(state, choice.minutes);
  state.location = toId;
  state.stats.tripsMade = (state.stats.tripsMade || 0) + 1;
  pushLog(state, `${choice.icon} You ${choice.label.toLowerCase()} to ${to.name} (${choice.minutes} min${choice.fare ? `, $${choice.fare}` : ""}).`);

  game.store.emit();
  game.autosave();
  return { ...choice, to, forcedSleep: roll.rolledOver };
}

function clampMin(v, lo) { return Math.max(lo, v); }
