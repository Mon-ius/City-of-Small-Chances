// Central game state shape and factory. Keeping all defaults in one place makes
// save migration and "new game" setup trivial. Future milestones (jobs, NPCs,
// opportunity web, economy) extend this object — fields are namespaced.

import { DAY_START_MIN } from "./time.js";
import { hashSeed } from "./rng.js";

export const SAVE_VERSION = 1;

// Condition meters, per the book's "Survival, Health and Personal Condition".
export const CONDITION_KEYS = ["energy", "hunger", "stress", "health", "hope"];

export const CONDITION_META = {
  energy: { label: "Energy", icon: "⚡", good: "high", desc: "Drives work quality and movement. Sleep and food restore it." },
  hunger: { label: "Fed", icon: "🍚", good: "high", desc: "How well-fed you are. Eat before it bottoms out." },
  stress: { label: "Stress", icon: "🌀", good: "low", desc: "Rises with deadlines and overwork. High stress narrows your options." },
  health: { label: "Health", icon: "❤️", good: "high", desc: "Illness and weather hurt it; rest and care restore it." },
  hope: { label: "Hope", icon: "✨", good: "high", desc: "Your sense that things can get better. Quietly shapes recovery." },
};

export function newGameState(profile) {
  const seedBase = hashSeed((profile.name || "drifter") + ":" + profile.background);
  return {
    version: SAVE_VERSION,
    createdAt: profile.createdAt || null,

    // Who you are.
    profile: {
      name: profile.name || "Newcomer",
      pronouns: profile.pronouns || "they/them",
      background: profile.background, // id from data/content.js
      trait: profile.trait, // id
      skillSeed: profile.skill, // starting skill id
    },

    // Calendar.
    day: 1,
    clock: DAY_START_MIN,
    weather: "clear", // set by weather system each morning

    // Money. The obligation/debt deadline is the campaign clock.
    money: 0,
    obligation: {
      kind: profile.background, // re-used to flavour the debt
      total: 0,
      remaining: 0,
      dueDay: 45, // first-arc deadline (book: 45-day EA arc)
    },

    // Condition meters 0..100.
    condition: {
      energy: 70,
      hunger: 65,
      stress: 25,
      health: 90,
      hope: 55,
    },

    // Practical skills 0..100 (book §18).
    skills: {
      logistics: 5,
      service: 5,
      maintenance: 5,
      cooking: 5,
      communication: 5,
      focus: 5,
      resilience: 5,
    },

    // Inventory / possessions (book opportunity components).
    inventory: {
      bicycle: false,
      safetyShoes: false,
      laptop: false,
      umbrella: false,
    },

    // Per-day bookkeeping, reset each morning, surfaced in the report.
    ledger: blankLedger(),

    // Lifetime stats for endings/telemetry-lite.
    stats: {
      daysSurvived: 0,
      earned: 0,
      spent: 0,
      shiftsWorked: 0,
      mealsEaten: 0,
    },

    // RNG state (so saves are deterministic across reloads).
    rng: { state: seedBase >>> 0, seedBase: seedBase >>> 0 },

    // Game flow flags.
    flags: {
      tutorialSeen: false,
      gameOver: false,
      ending: null,
    },

    log: [], // recent narrative lines (capped)
  };
}

export function blankLedger() {
  return {
    earned: 0,
    spent: 0,
    items: [], // { label, money, note }
    conditionStart: null, // snapshot taken at wake
    opportunities: [], // strings describing state changes
    warnings: [],
  };
}

// Clamp helper used everywhere conditions/skills move.
export function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}
