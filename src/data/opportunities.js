// The Opportunity Web (book §11 "Opportunity & Progression Web"). The book's
// central idea: chances in this city are never random drops. Each one *appears*
// because of a traceable combination of who you are and what you've done — a
// skill you've raised, a person who trusts you, a district that's learned to
// count on you, a thing you own, the weather and hour, and your own history.
//
// So every opportunity is declared as a set of **requirement components** (the
// book names six: Skill, Relationship, Reputation, Possession, Timing, History),
// plus two soft gates that decide how much of it you can *see*:
//   • discover(state) — the rumour reaches you at all (Hidden → Rumoured)
//   • clue(state)     — you learn what it actually takes (Rumoured → Known)
// When every requirement is met and the clue is known, it's Available to claim.
// Claiming runs reward.apply() — a concrete, tangible change to your state — and
// the book's debugging rule is honoured in systems/opportunities.js, which can
// always say, in plain language, exactly why a chance is where it is.
//
// This file is pure content + declarative requirements; all the evaluation,
// state-machine and reason-string logic lives in systems/opportunities.js.

import { clamp } from "../core/state.js";
import { getRel, bondScore } from "../systems/relationships.js";
import { getRep } from "../systems/reputation.js";

// Categories colour the cards and group the web, echoing the job families.
export const OPP_CATEGORIES = {
  delivery: { label: "Delivery", color: "#3f96c9" },
  labour: { label: "Day labour", color: "#c9803f" },
  trade: { label: "A trade", color: "#56b89a" },
  care: { label: "Care", color: "#e0833c" },
  community: { label: "Community", color: "#d6738a" },
  admin: { label: "Care / admin", color: "#8a7fd6" },
};

// Small helpers for the discover/clue gates (kept readable, not clever).
const met = (state, npcId) => getRel(state, npcId).met;
const bond = (state, npcId) => bondScore(getRel(state, npcId));

export const OPPORTUNITIES = [
  {
    id: "courier_contract",
    title: "Jun's standing route",
    category: "delivery",
    icon: "🛵",
    district: "market_row",
    rumour: "Word at the market: the courier dispatcher is sick of training riders who quit in a week.",
    blurb: "Jun keeps a prime route off the day-board for someone she can rely on. Earn that, and it's yours — a steadier line of work than scrambling for shifts.",
    requires: [
      { kind: "possession", item: "bicycle" },
      { kind: "skill", skill: "logistics", min: 20 },
      { kind: "relationship", npc: "jun", min: 34 },
      { kind: "history", stat: "shiftsWorked", min: 3, label: "shifts worked" },
    ],
    // You hear about it once you've met Jun or done courier-type work.
    discover: (s) => met(s, "jun") || s.stats.shiftsWorked >= 2,
    // You learn what it takes once Jun knows your face.
    clue: (s) => met(s, "jun"),
    reward: {
      line: "Jun tears a route card off the board and presses it into your hand. \"This one's yours now. Don't make me find someone else.\"",
      note: "a standing courier route — steadier money and Jun's backing",
      apply: (s) => { s.money += 40; s.skills.logistics = clamp(s.skills.logistics + 3); s.condition.hope = clamp(s.condition.hope + 6); s.flags.courierContract = true; },
    },
  },
  {
    id: "dockside_ticket",
    title: "A regular on the yard gang",
    category: "labour",
    icon: "🦺",
    district: "dockside",
    rumour: "The lead hand at the yards is quietly building a crew he can trust around the audit.",
    blurb: "Rafiq calls the morning gang. Show the yards you're safe, steady and shod for it, and you get called first — before the casuals scrapping for whatever's left.",
    requires: [
      { kind: "possession", item: "safetyShoes" },
      { kind: "skill", skill: "maintenance", min: 15 },
      { kind: "reputation", district: "dockside", min: 20 },
      { kind: "history", stat: "shiftsWorked", min: 4, label: "shifts worked" },
    ],
    discover: (s) => met(s, "rafiq") || getRep(s, "dockside") >= 8,
    clue: (s) => getRep(s, "dockside") >= 8 || met(s, "rafiq"),
    reward: {
      line: "Rafiq marks your name at the top of the call sheet. \"You're first on the list now. Mind the yellow lines and we'll keep it that way.\"",
      note: "first call on the morning gang — priority dock work",
      apply: (s) => { s.money += 35; s.skills.resilience = clamp(s.skills.resilience + 3); s.condition.hope = clamp(s.condition.hope + 5); s.flags.dockTicket = true; },
    },
  },
  {
    id: "tomo_apprenticeship",
    title: "Tomo's apprentice",
    category: "trade",
    icon: "🔧",
    district: "old_harbour",
    rumour: "The old mechanic by the quay is said to be looking for someone worth passing the trade to.",
    blurb: "Tomo's hands aren't what they were. Prove you can hold a wrench and that you'll come back, and he'll teach you the trade properly — the kind of skill that follows you anywhere.",
    requires: [
      { kind: "skill", skill: "maintenance", min: 25 },
      { kind: "relationship", npc: "tomo", min: 60 },
      { kind: "history", stat: "daysSurvived", min: 5, label: "days survived" },
    ],
    discover: (s) => met(s, "tomo"),
    clue: (s) => bond(s, "tomo") >= 34,
    reward: {
      line: "Tomo clears a corner of the bench and sets it aside. \"That's yours. We start tomorrow. Don't be late and don't be precious.\"",
      note: "a real apprenticeship — maintenance mastery that compounds",
      apply: (s) => { s.skills.maintenance = clamp(s.skills.maintenance + 6); s.skills.focus = clamp(s.skills.focus + 2); s.condition.hope = clamp(s.condition.hope + 10); s.flags.tomoApprentice = true; },
    },
  },
  {
    id: "mei_standing_meal",
    title: "A stool that's always yours",
    category: "care",
    icon: "🍜",
    district: "market_row",
    rumour: "They say Mei keeps a stool for her regulars — and a bowl going for the ones she's decided to look after.",
    blurb: "Become one of Mei's people and there's always a seat and a hot bowl waiting, lean week or not. In this city, a place that's glad to see you is worth more than the broth.",
    requires: [
      { kind: "relationship", npc: "mei", min: 34 },
      { kind: "reputation", district: "market_row", min: 10 },
      { kind: "history", stat: "mealsEaten", min: 3, label: "meals shared" },
    ],
    discover: (s) => met(s, "mei"),
    clue: (s) => bond(s, "mei") >= 14,
    reward: {
      line: "Mei sets a bowl in front of you without being asked. \"You're a regular now. The stool by the window — that one's yours.\"",
      note: "a standing seat at Mei's — warmth and a hot meal when you need it",
      apply: (s) => { s.condition.hunger = clamp(s.condition.hunger + 30); s.condition.hope = clamp(s.condition.hope + 8); s.condition.energy = clamp(s.condition.energy + 6); s.flags.meiRegular = true; },
    },
  },
  {
    id: "ava_tenant_seat",
    title: "A seat at the tenants' table",
    category: "community",
    icon: "📋",
    district: "tenements",
    rumour: "Ava's tenants' table is short of level heads who'll actually show up to the meetings.",
    blurb: "Ava is fighting the block's rent hike on her own hours and burning out. Stand with her and you get a voice in what happens to your home — and an ally who knows which forms buy time.",
    requires: [
      { kind: "relationship", npc: "ava", min: 34 },
      { kind: "skill", skill: "communication", min: 20 },
      { kind: "reputation", district: "tenements", min: 15 },
      { kind: "history", stat: "peopleMet", min: 3, label: "people met" },
    ],
    discover: (s) => met(s, "ava") || s.location === "tenements",
    clue: (s) => bond(s, "ava") >= 14,
    reward: {
      line: "Ava pulls out the chair beside hers. \"Right. You're in. Between us we might actually win this thing.\"",
      note: "a seat at the tenants' table — a hand in your own block's fate",
      apply: (s) => { s.condition.stress = clamp(s.condition.stress - 20); s.condition.hope = clamp(s.condition.hope + 10); s.skills.communication = clamp(s.skills.communication + 2); s.flags.tenantSeat = true; },
    },
  },
  {
    id: "clinic_admin_path",
    title: "A foot in the clinic door",
    category: "admin",
    icon: "🩺",
    district: "uptown",
    rumour: "The clinic's drowning in intake forms; the woman on the desk has muttered more than once about needing real help.",
    blurb: "Clara guards the way into steady clinic work. Show her a steady hand with people and paperwork and she'll put your name forward — a path off the waterfront and into something that lasts.",
    requires: [
      { kind: "relationship", npc: "clara", min: 34 },
      { kind: "skill", skill: "focus", min: 20 },
      { kind: "skill", skill: "communication", min: 15 },
      { kind: "reputation", district: "uptown", min: 10 },
    ],
    discover: (s) => met(s, "clara"),
    clue: (s) => bond(s, "clara") >= 14,
    reward: {
      line: "Clara slides a form across the desk — an application, your name already at the top. \"Sign it. I've seen enough. Let's get you off the docks.\"",
      note: "a foot in the clinic door — the start of steady admin work",
      apply: (s) => { s.money += 30; s.skills.focus = clamp(s.skills.focus + 4); s.skills.communication = clamp(s.skills.communication + 2); s.condition.hope = clamp(s.condition.hope + 6); s.flags.clinicPath = true; },
    },
  },
  {
    id: "storm_courier_surge",
    title: "Storm surge run",
    category: "delivery",
    icon: "⛈️",
    district: "market_row",
    rumour: "When the rain comes down hard, the parcels stack up and the dispatch rate doubles — if you'll brave it.",
    blurb: "Foul weather empties the streets of riders and sends courier pay soaring. Jun will wave you onto a surge run any wet evening — hard, cold, but the best money on two wheels. As often as the storms come.",
    requires: [
      { kind: "possession", item: "bicycle" },
      { kind: "timing", weather: ["rain", "storm"], after: 17 * 60, label: "rain after 17:00" },
      { kind: "relationship", npc: "jun", min: 16 },
    ],
    discover: (s) => met(s, "jun") || s.inventory.bicycle,
    clue: (s) => met(s, "jun"),
    repeatable: true,
    reward: {
      line: "Jun shoves a fat stack of parcels at you through the rain. \"Everyone else went home. Bring me back an empty bag and there's a bonus in it.\"",
      note: "a surge run in the wet — premium pay, as often as the storms come",
      apply: (s, rng) => { const pay = rng ? rng.int(24, 40) : 30; s.money += pay; s.condition.energy = clamp(s.condition.energy - 10); s.condition.stress = clamp(s.condition.stress + 4); s.skills.logistics = clamp(s.skills.logistics + 1); s._lastSurgePay = pay; },
    },
  },
];

export function getOpportunity(id) {
  return OPPORTUNITIES.find((o) => o.id === id) || null;
}
