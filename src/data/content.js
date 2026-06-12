// Authored content tables. Character-creation options and the starting set of
// activities. Data-driven so later milestones add jobs, NPCs and locations the
// same way (book §24 "data-driven, tool-friendly").

// ── Background obligations (book §5). Each sets the campaign clock pressure. ──
export const BACKGROUNDS = [
  {
    id: "debt",
    name: "Carried debt",
    blurb: "You left a city owing money to people who keep careful records.",
    obligation: 1800,
    startMoney: 240,
    note: "A weekly repayment looms. Falling behind invites harder terms.",
  },
  {
    id: "medical",
    name: "Medical cost",
    blurb: "A family illness drained everything. You came here to rebuild.",
    obligation: 1500,
    startMoney: 300,
    note: "Periodic care payments. Your own health matters doubly now.",
  },
  {
    id: "family",
    name: "Family support",
    blurb: "Someone back home depends on what you can send each month.",
    obligation: 1600,
    startMoney: 280,
    note: "Remittances are a promise. Missing one is felt, not just logged.",
  },
  {
    id: "relocation",
    name: "Relocation deadline",
    blurb: "A conditional offer holds your place — but only for so long.",
    obligation: 1400,
    startMoney: 320,
    note: "You must prove stability before the deadline or lose the opening.",
  },
];

// ── Starting traits (book §5). Small persistent biases. ──
export const TRAITS = [
  { id: "persistent", name: "Persistent", blurb: "Setbacks slow you less.", effect: { resilience: 6 } },
  { id: "sociable", name: "Sociable", blurb: "People warm to you faster.", effect: { communication: 6 } },
  { id: "meticulous", name: "Meticulous", blurb: "Few mistakes under pressure.", effect: { focus: 6 } },
  { id: "resilient", name: "Resilient", blurb: "You recover from strain.", effect: { resilience: 4, health: 4 } },
  { id: "quick", name: "Quick learner", blurb: "Skills grow a touch faster.", effect: { logistics: 3, service: 3 } },
  { id: "frugal", name: "Frugal", blurb: "You stretch every dollar.", effect: { focus: 3, startBonus: 60 } },
];

// ── Starting skill specialisations (book §5 / §18). ──
export const START_SKILLS = [
  { id: "service", name: "Service", blurb: "Retail, food, hospitality.", grant: { service: 12 } },
  { id: "logistics", name: "Logistics", blurb: "Delivery, warehouse, routing.", grant: { logistics: 12 } },
  { id: "maintenance", name: "Maintenance", blurb: "Repair, tools, facilities.", grant: { maintenance: 12 } },
  { id: "communication", name: "Communication", blurb: "Admin, negotiation, dialogue.", grant: { communication: 12 } },
  { id: "admin", name: "Admin / Focus", blurb: "Office tasks, study, accuracy.", grant: { focus: 12 } },
  { id: "cooking", name: "Cooking", blurb: "Food jobs and meal prep.", grant: { cooking: 12 } },
];

// ── Activities available in the Old Harbour arrival arc. ──
// Each activity declares time/money cost and condition/skill deltas. The engine
// (systems/activities.js) applies them and writes the ledger. `available(state)`
// gates an activity; `effect(state, rng)` returns a result description.
export const ACTIVITIES = [
  {
    id: "rest_home",
    name: "Rest in your room",
    icon: "🛏️",
    desc: "Lie down for a while. Cheap recovery, but the day ticks on.",
    minutes: 120,
    cost: 0,
    apply: (c) => ({ energy: +16, stress: -10, health: +3, hope: +1 }),
    note: "A quiet hour. The ceiling has a water stain shaped like a country.",
  },
  {
    id: "cook_meal",
    name: "Cook a simple meal",
    icon: "🍳",
    desc: "Rice, eggs, whatever's cheap. Hunger and a little hope.",
    minutes: 45,
    cost: 6,
    apply: (c) => ({ hunger: +28, hope: +3, energy: +4 }),
    skill: { cooking: 1 },
    note: "It isn't much, but it's yours and it's warm.",
  },
  {
    id: "eat_out",
    name: "Eat at the noodle stall",
    icon: "🍜",
    desc: "Fast, filling, and you might overhear something useful.",
    minutes: 35,
    cost: 14,
    apply: (c) => ({ hunger: +34, stress: -4, hope: +2 }),
    note: "Steam, broth, the clatter of bowls. The owner nods at regulars.",
  },
  {
    id: "walk_harbour",
    name: "Walk the Old Harbour",
    icon: "🚶",
    desc: "Learn the streets. Costs energy, but the city stops being a stranger.",
    minutes: 90,
    cost: 0,
    apply: (c) => ({ energy: -8, stress: -6, hope: +2 }),
    skill: { logistics: 1 },
    note: "Market awnings, cables overhead, the smell of salt and frying oil.",
  },
  {
    id: "day_labour",
    name: "Pick up day labour",
    icon: "📦",
    desc: "Hauling crates at the market. Honest pay, real exhaustion.",
    minutes: 180,
    cost: 0,
    requires: (s) => s.condition.energy >= 20,
    requiresNote: "You need at least 20 energy to take a hauling shift.",
    apply: (c, s, rng) => {
      const base = 42;
      const skillBonus = Math.round((s.skills.logistics + s.skills.maintenance) / 6);
      const energyPenalty = s.condition.energy < 40 ? -8 : 0;
      const pay = base + skillBonus + rng.int(-4, 8) + energyPenalty;
      return {
        money: +Math.max(20, pay),
        energy: -26,
        hunger: -12,
        stress: +6,
        health: s.condition.energy < 25 ? -6 : -1,
        hope: +2,
        _pay: Math.max(20, pay),
      };
    },
    skill: { logistics: 2, maintenance: 1 },
    note: "Your back remembers this work tomorrow. The cash is in your hand today.",
    isWork: true,
  },
  {
    id: "ask_around",
    name: "Ask around for work",
    icon: "💬",
    desc: "Talk to stall owners and idlers. Information is its own currency.",
    minutes: 60,
    cost: 0,
    apply: (c) => ({ stress: +2, energy: -4, hope: +1 }),
    skill: { communication: 1 },
    note: "Most shrug. One or two remember your face. That's how it starts.",
    discovers: true,
  },
];

export function getBackground(id) {
  return BACKGROUNDS.find((b) => b.id === id) || BACKGROUNDS[0];
}
export function getTrait(id) {
  return TRAITS.find((t) => t.id === id) || TRAITS[0];
}
export function getStartSkill(id) {
  return START_SKILLS.find((s) => s.id === id) || START_SKILLS[0];
}
