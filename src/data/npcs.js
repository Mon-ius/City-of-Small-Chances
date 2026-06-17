// The people of Haiyun City (book §13 "NPC Simulation and Social Memory").
// Six major NPCs, one anchored to each district (the market hub gets two — it's
// where the city talks). Each has:
//   • a daily SCHEDULE — segments that say which district they're in and what
//     they're doing as the clock turns, so *who's around* depends on the hour.
//   • a ROLE drawn from the book's relationship roles (shop owner, employer,
//     neighbour, trainer…), which colours what they can do for you.
//   • a personal PRESSURE that intersects the player but isn't only about them.
//   • voice LINES at three closeness tiers, and a FAVOUR — a concrete, traceable
//     boon they can grant once you've earned their trust (book: NPCs are economic
//     actors with material impact, not quest boards).
// This is pure content; the live build reads the cards through src/three/interactions.js.

// Self-contained clamp (favour rewards keep meters in 0..100). Kept local so the
// live walkable build needs nothing from the retired simulation engine.
function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

// Closeness ladder shared by every NPC. `bond` (a 0..100 composite of the
// relationship variables) crosses these thresholds to change the stage.
export const STAGES = [
  { id: "stranger", at: 0, name: "Stranger" },
  { id: "acquaint", at: 14, name: "Acquaintance" },
  { id: "familiar", at: 34, name: "Familiar face" },
  { id: "trusted", at: 60, name: "Trusted" },
  { id: "close", at: 84, name: "Close" },
];

// Minute-of-day shorthands keep the schedules readable.
const H = (h, m = 0) => h * 60 + m;

export const NPCS = [
  {
    id: "mei",
    name: "Mei Lin",
    short: "Mei",
    role: "Shop owner",
    icon: "🍜",
    color: "#e0833c",
    anchor: "market_row",
    blurb: "Runs the corner noodle stall. Knows everyone's order and most of their business.",
    pressure: "Her lease renews in the autumn and the rent is climbing faster than her broth.",
    offersMeal: true,
    mealCost: 9,
    schedule: [
      { to: H(10), district: "market_row", where: "work", at: "lighting the burners — broth's not ready yet" },
      { to: H(15), district: "market_row", where: "work", at: "ladling noodles to the lunch rush" },
      { to: H(22), district: "market_row", where: "work", at: "wiping the counter between customers" },
      { to: H(24), district: null, where: "rest", at: "gone up to bed above the shop" },
    ],
    voice: {
      stranger: "She sizes you up over the steam. \"You eating, or just looking?\"",
      familiar: "\"There's the newcomer. Sit, sit — you look like you skipped lunch again.\"",
      trusted: "\"Ah, good. Pull up a stool. I saved you the good broth.\"",
    },
    favour: {
      label: "A bowl on the house",
      line: "She waves your money away and sets down a steaming bowl. \"Eat. We'll call it even.\"",
      debt: 4,
      apply: (state) => { state.condition.hunger = clamp(state.condition.hunger + 30); state.condition.hope = clamp(state.condition.hope + 6); state.condition.energy = clamp(state.condition.energy + 6); },
      note: "a hot meal, no charge",
    },
  },
  {
    id: "jun",
    name: "Jun Park",
    short: "Jun",
    role: "Employer",
    icon: "🛵",
    color: "#3f96c9",
    anchor: "market_row",
    blurb: "Dispatches the courier runs out of a shed at the market's edge. Tracks every minute.",
    pressure: "Down two riders and behind on a contract; she needs reliable legs more than she'll admit.",
    schedule: [
      { to: H(9), district: null, where: "rest", at: "not on shift yet" },
      { to: H(14), district: "market_row", where: "work", at: "barking routes at the courier shed" },
      { to: H(18), district: "old_harbour", where: "work", at: "chasing a late drop down at the quay" },
      { to: H(21), district: "market_row", where: "work", at: "reconciling the day's runs" },
      { to: H(24), district: null, where: "rest", at: "clocked out" },
    ],
    voice: {
      stranger: "She doesn't look up from her clipboard. \"You're not one of mine. What.\"",
      familiar: "\"You again. Good — half my riders couldn't find the harbour with a map.\"",
      trusted: "\"There's my reliable one. Tell me you've got a free hour.\"",
    },
    favour: {
      label: "First in line tomorrow",
      line: "She scrawls a time on a torn ticket. \"Be at the shed at six and the good route's yours. Don't make me regret it.\"",
      debt: 10,
      apply: (state) => { state.skills.logistics = clamp(state.skills.logistics + 2); state.condition.hope = clamp(state.condition.hope + 4); },
      money: [10, 18],
      note: "a paid tip-off and a head start on tomorrow's routes",
    },
  },
  {
    id: "rafiq",
    name: "Rafiq Hassan",
    role: "Employer",
    short: "Rafiq",
    icon: "🦺",
    color: "#c9a23f",
    anchor: "dockside",
    blurb: "Lead hand on the container yards. Decides who gets called onto the morning gang.",
    pressure: "An audit is breathing down his neck; one accident on his watch and the contract's gone.",
    offersMeal: true,
    mealCost: 7,
    schedule: [
      { to: H(8), district: null, where: "rest", at: "not in yet" },
      { to: H(15), district: "dockside", where: "work", at: "calling the gang onto the stacks" },
      { to: H(18), district: "dockside", where: "work", at: "signing off the afternoon manifest" },
      { to: H(20), district: "old_harbour", where: "social", at: "nursing a tea at the harbour caff" },
      { to: H(24), district: null, where: "rest", at: "home with his kids" },
    ],
    voice: {
      stranger: "He keeps one eye on the cranes. \"Mind the yellow lines. You lost?\"",
      familiar: "\"Newcomer. You've got a back on you, I'll give you that.\"",
      trusted: "\"Good to see you. Stick by me and you'll never want for a shift.\"",
    },
    favour: {
      label: "Lend you steel-toes",
      line: "He tosses you a battered pair of steel-toed boots. \"Bring 'em back in one piece. And don't tell the auditor.\"",
      debt: 12,
      apply: (state) => { state.inventory.safetyShoes = true; state.condition.hope = clamp(state.condition.hope + 3); },
      note: "safety shoes, on loan — heavy work gets safer",
    },
  },
  {
    id: "tomo",
    name: "Tomo Sato",
    short: "Tomo",
    role: "Trainer",
    icon: "🔧",
    color: "#56b89a",
    anchor: "old_harbour",
    blurb: "Fixes anything with a motor from a cramped bench by the quay. Teaches if you ask right.",
    pressure: "His hands aren't what they were; he's quietly looking for someone worth passing the trade to.",
    schedule: [
      { to: H(9), district: null, where: "rest", at: "workshop still shuttered" },
      { to: H(19), district: "old_harbour", where: "work", at: "bent over a stripped motor at the bench" },
      { to: H(22), district: "market_row", where: "social", at: "swapping parts gossip at the market" },
      { to: H(24), district: null, where: "rest", at: "closed up for the night" },
    ],
    voice: {
      stranger: "He grunts without looking up. \"Careful — that's calibrated. You need something fixed?\"",
      familiar: "\"Oh, it's you. Hand me that 8mm while you're standing there.\"",
      trusted: "\"Good timing. Watch this — I'll only show it once. Well. Twice.\"",
    },
    favour: {
      label: "Teach you a trick",
      line: "He walks your hands through a repair you'd never have found alone. \"There. Now you owe me a clean bench.\"",
      debt: 8,
      apply: (state) => { state.skills.maintenance = clamp(state.skills.maintenance + 3); state.condition.hope = clamp(state.condition.hope + 4); },
      note: "a maintenance lesson that sticks",
    },
  },
  {
    id: "clara",
    name: "Clara Wen",
    short: "Clara",
    role: "Trainer",
    icon: "🩺",
    color: "#8a7fd6",
    anchor: "uptown",
    blurb: "Runs the front desk of the civic clinic. The gatekeeper to care and an admin career.",
    pressure: "Overworked and underfunded, she resents how much the system asks of people like you.",
    schedule: [
      { to: H(9), district: null, where: "rest", at: "clinic not open yet" },
      { to: H(17), district: "uptown", where: "work", at: "working the clinic front desk" },
      { to: H(19), district: "uptown", where: "work", at: "finishing the day's intake forms" },
      { to: H(24), district: null, where: "rest", at: "gone home uptown" },
    ],
    voice: {
      stranger: "She slides a clipboard across without looking. \"Fill this out. Name at the top.\"",
      familiar: "\"Back again? You're not sick, are you. Sit down anyway.\"",
      trusted: "\"Between us — skip the queue. I'll mark you as seen.\"",
    },
    favour: {
      label: "Slip you a care voucher",
      line: "A voucher slides across the desk, face-down. \"Get that looked at. Don't make me say it twice.\"",
      debt: 9,
      apply: (state) => { state.condition.health = clamp(state.condition.health + 22); state.condition.stress = clamp(state.condition.stress - 8); },
      note: "a clinic voucher — health restored",
    },
  },
  {
    id: "ava",
    name: "Ava Reid",
    short: "Ava",
    role: "Neighbour",
    icon: "📋",
    color: "#d6738a",
    anchor: "tenements",
    blurb: "Tenant advocate two doors down. Knows which forms buy time and which landlords bluff.",
    pressure: "Fighting a block-wide rent hike on her own hours; she's burning out and needs allies.",
    schedule: [
      { to: H(10), district: "tenements", where: "social", at: "knocking doors in the stairwell" },
      { to: H(14), district: "uptown", where: "work", at: "arguing a case at the civic offices" },
      { to: H(19), district: "tenements", where: "social", at: "running the tenants' table in the courtyard" },
      { to: H(24), district: "tenements", where: "rest", at: "door open, kettle on" },
    ],
    voice: {
      stranger: "She clocks you on the stairs. \"New on the block? Keep your rent receipts. All of them.\"",
      familiar: "\"There you are. Kettle's on if you've got a minute.\"",
      trusted: "\"Good — I need a level head. Sit, I'll explain the situation.\"",
    },
    favour: {
      label: "Untangle your paperwork",
      line: "She knows which forms buy you a week of breathing room. Your shoulders drop an inch you didn't know they were carrying.",
      debt: 6,
      apply: (state) => { state.condition.stress = clamp(state.condition.stress - 16); state.condition.hope = clamp(state.condition.hope + 8); },
      note: "a week of breathing room — stress eased",
    },
  },
];

export function getNpc(id) {
  return NPCS.find((n) => n.id === id) || null;
}

// NPCs whose home/anchor district is `districtId` (used for "usually here" hints).
export function npcsAnchoredIn(districtId) {
  return NPCS.filter((n) => n.anchor === districtId);
}
