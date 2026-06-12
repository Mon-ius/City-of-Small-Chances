// The Game orchestrator. Owns the store and RNG, exposes high-level actions the
// UI calls (start, performActivity, sleep), and runs the day cycle. This is the
// seam between systems (pure-ish logic) and UI (rendering).

import { Store } from "./core/store.js";
import { makeRng } from "./core/rng.js";
import { newGameState, blankLedger, clamp } from "./core/state.js";
import { saveGame, loadGame } from "./core/save.js";
import { DAY_START_MIN } from "./core/time.js";
import { rollWeather, weatherMeta } from "./systems/weather.js";
import { applySkills } from "./systems/condition.js";
import { performActivity, pushLog } from "./systems/activities.js";
import { getBackground, getTrait, getStartSkill } from "./data/content.js";

export class Game {
  constructor() {
    this.store = new Store(null);
    this.rng = null;
    this._autosaveOn = true;
  }

  get state() {
    return this.store.state;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  startNew(profile) {
    const state = newGameState(profile);
    state.createdAt = new Date().toISOString();

    // Apply background economics.
    const bg = getBackground(profile.background);
    state.money = bg.startMoney;
    state.obligation.total = bg.obligation;
    state.obligation.remaining = bg.obligation;

    // Apply trait + starting skill.
    const trait = getTrait(profile.trait);
    if (trait.effect) {
      const { startBonus, health, ...skillBias } = trait.effect;
      applySkills(state, skillBias);
      if (startBonus) state.money += startBonus;
      if (health) state.condition.health = clamp(state.condition.health + health);
    }
    const skill = getStartSkill(profile.skill);
    applySkills(state, skill.grant);

    this.store.state = state;
    this.rng = makeRng(state.rng.state);

    // First morning setup.
    this._beginDay(true);
    pushLog(state, `You arrive in Haiyun City with $${state.money} and a debt that won't wait.`);
    this.autosave();
    this.store.emit();
    return state;
  }

  resume() {
    const state = loadGame();
    if (!state) return null;
    this.store.state = state;
    this.rng = makeRng(state.rng.state);
    return state;
  }

  // ── Actions ────────────────────────────────────────────────────────────
  performActivity(id) {
    return performActivity(this, id);
  }

  // End the day: sleep restores condition based on where/how you sleep, then a
  // new day begins. Returns the day-report payload (the ledger we just closed).
  sleep(forced = false) {
    const state = this.state;
    const closing = state.ledger;
    const endedWeather = state.weather;
    const endedDay = state.day;

    // Sleep recovery scales with hope and inversely with stress.
    const c = state.condition;
    const quality = clamp(0.55 + (c.hope - c.stress) / 200, 0.3, 1);
    c.energy = clamp(c.energy + Math.round(40 * quality + 8));
    c.stress = clamp(c.stress - Math.round(18 * quality));
    c.health = clamp(c.health + Math.round(6 * quality));
    if (forced) {
      c.stress = clamp(c.stress + 6); // collapsing into bed at midnight isn't restful
    }

    state.stats.daysSurvived++;
    pushLog(state, forced ? "Midnight catches you mid-step. You stumble home and sleep." : "You sleep, and the city quiets.");

    // Advance the calendar, then build the report against the upcoming day so
    // its "before tomorrow" warnings are correct.
    state.day += 1;
    state.clock = DAY_START_MIN;
    const report = this._closeDayReport(closing, endedDay, endedWeather);
    this._beginDay(false);

    this.autosave();
    this.store.emit();
    return report;
  }

  // ── Internals ──────────────────────────────────────────────────────────
  _beginDay(isFirst) {
    const state = this.state;
    state.weather = rollWeather(state, this.rng);
    state.rng.state = this.rng.getState();

    // Fresh ledger, snapshot condition at wake for the next report.
    state.ledger = blankLedger();
    state.ledger.conditionStart = { ...state.condition };

    // Weather morning pressure (mild for v0.0.1).
    const wx = weatherMeta(state.weather);
    if (!isFirst && wx.illness > 0 && this.rng.chance(wx.illness)) {
      state.condition.health = clamp(state.condition.health - this.rng.int(4, 10));
      state.ledger.warnings.push(`The ${wx.label.toLowerCase()} got into your chest overnight.`);
      pushLog(state, `You wake with a rough throat — the ${wx.label.toLowerCase()} took something out of you.`);
    }
  }

  _closeDayReport(ledger, endedDay, endedWeather) {
    const state = this.state;
    const start = ledger.conditionStart || state.condition;
    const conditionDelta = {};
    for (const k of Object.keys(state.condition)) {
      conditionDelta[k] = Math.round(state.condition[k] - (start[k] ?? state.condition[k]));
    }
    return {
      endedDay, // the day that just finished
      day: state.day, // the upcoming day
      weather: endedWeather,
      earned: ledger.earned,
      spent: ledger.spent,
      net: ledger.earned - ledger.spent,
      items: ledger.items,
      conditionDelta,
      warnings: ledger.warnings,
      money: state.money,
      tomorrow: this._tomorrowWarnings(),
    };
  }

  _tomorrowWarnings() {
    const state = this.state;
    const w = [];
    const daysToDue = state.obligation.dueDay - state.day;
    if (daysToDue <= 7 && state.obligation.remaining > 0) {
      w.push(`Obligation deadline in ${daysToDue} day${daysToDue === 1 ? "" : "s"}: $${state.obligation.remaining} still owed.`);
    }
    if (state.condition.hunger <= 25) w.push("Start tomorrow hungry and your energy won't hold.");
    if (state.condition.health <= 35) w.push("Your health is fragile — a hard shift could tip into illness.");
    if (state.money < 20) w.push("Cash is dangerously low. Tomorrow you'll need to earn early.");
    return w;
  }

  autosave() {
    if (this._autosaveOn) saveGame(this.state);
  }
  saveNow() {
    return saveGame(this.state);
  }
}
