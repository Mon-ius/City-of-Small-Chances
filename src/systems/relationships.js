// Relationships & social memory (book §12 "Relationship-Driven Economy" and §13
// "NPC Simulation and Social Memory"). Turns the NPC tables (data/npcs.js) into:
//   • presence  — who is standing in your district right now, from their schedule
//   • a bond     — a 0..100 composite of trust/respect/affection (minus conflict)
//                  that crosses STAGE thresholds and gates favours
//   • actions    — catch up, share a meal, lend a hand, ask a favour, give a gift,
//                  each with honest costs and a readable effect preview
//   • memory     — a capped log of what happened between you, which colours how
//                  they greet you and how favours land (book's social-memory rule)
// All numbers live here so they stay testable in a node sim and honest in the UI.

import { NPCS, getNpc, STAGES } from "../data/npcs.js";
import { advanceClock, minutesLeft } from "../core/time.js";
import { applyCondition, applySkills, passiveDrift } from "./condition.js";
import { addLedger, pushLog } from "./activities.js";
import { clamp } from "../core/state.js";

// ── Relationship variables ───────────────────────────────────────────────────
// trust/respect/affection 0..100 (the positive axes). conflict 0..100 (unresolved
// harm). debt: signed — positive = you owe them, negative = they owe you.
function blankRel(day) {
  return { trust: 0, respect: 0, affection: 0, conflict: 0, debt: 0, met: false, firstDay: day || 1, lastTalk: null, lastFavourDay: 0, memory: [] };
}

export function getRel(state, npcId) {
  const r = state.social && state.social.rel && state.social.rel[npcId];
  return r ? { ...blankRel(state.day), ...r } : blankRel(state.day);
}

function ensureRel(state, npcId) {
  if (!state.social) state.social = { rel: {} };
  if (!state.social.rel) state.social.rel = {};
  if (!state.social.rel[npcId]) state.social.rel[npcId] = blankRel(state.day);
  return state.social.rel[npcId];
}

// A single closeness score, used for stages and favour gates. Trust and warmth
// matter most; respect supports. The positive weights sum to >1 on purpose: a
// focused friendship (warm + trusted, even without working together) can still
// climb, rather than being capped by a strict three-way average. Conflict bites.
export function bondScore(rel) {
  const v = 0.5 * rel.trust + 0.42 * rel.affection + 0.34 * rel.respect - 0.6 * rel.conflict;
  return Math.round(clamp(v, 0, 100));
}

export function stageFor(rel) {
  const b = bondScore(rel);
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) if (b >= STAGES[i].at) idx = i;
  return { ...STAGES[idx], index: idx, bond: b };
}

// ── Schedule & presence ──────────────────────────────────────────────────────
// The active schedule segment for an NPC at a given minute-of-day.
export function npcAt(npc, clock) {
  for (const seg of npc.schedule) if (clock < seg.to) return seg;
  return npc.schedule[npc.schedule.length - 1];
}

export function isPresent(state, npc) {
  const seg = npcAt(npc, state.clock);
  return !!seg && seg.district === state.location;
}

// Everyone standing where you stand, right now — the "people here" list.
export function peoplePresent(state) {
  return NPCS.filter((n) => isPresent(state, n)).map((npc) => {
    const rel = getRel(state, npc.id);
    return { npc, rel, stage: stageFor(rel), segment: npcAt(npc, state.clock) };
  });
}

// ── Voice — greeting line, coloured by stage and memory ──────────────────────
export function voiceLine(npc, rel) {
  const st = stageFor(rel);
  // Social memory talks back: a standing debt either way shades the greeting.
  if (rel.debt >= 12) return `${pickVoice(npc, st)} (You can feel the favour you owe sitting between you.)`;
  if (rel.debt <= -10) return `${pickVoice(npc, st)} (They still owe you one, and you both know it.)`;
  return pickVoice(npc, st);
}

function pickVoice(npc, st) {
  if (st.index >= 3) return npc.voice.trusted;
  if (st.index >= 1) return npc.voice.familiar;
  return npc.voice.stranger;
}

// ── Social actions ───────────────────────────────────────────────────────────
// Each action declares its time/money cost, a gate (why it might be unavailable),
// and an apply() returning the deltas doSocial() will book. Keeping apply pure of
// side effects (it only reads state + rng and returns a descriptor) makes the
// whole system unit-testable.
export const SOCIAL_ACTIONS = [
  {
    id: "chat",
    label: "Catch up",
    icon: "🗨️",
    minutes: 10,
    desc: "A few words. Costs nothing but time — and the first chat of the day means the most.",
    cost: () => 0,
    gate: () => null,
    apply: ({ rel, rng, day }) => {
      // Diminishing returns: repeat chats the same day land softer (social memory).
      const sameDay = rel.lastTalk && rel.lastTalk.day === day;
      const n = sameDay ? rel.lastTalk.count : 0;
      const scale = 1 / (1 + n);
      const aff = Math.max(1, Math.round(rng.int(4, 6) * scale));
      const tru = Math.max(0, Math.round(rng.int(1, 3) * scale));
      return {
        rel: { affection: aff, trust: tru },
        condition: { stress: -2, hope: +1 },
        memory: rel.met ? null : { kind: "meet", text: "You introduced yourself." },
        line: sameDay ? "You trade a few more words — pleasant, if thinner than before." : "You catch up. The small talk does its quiet work.",
      };
    },
  },
  {
    id: "meal",
    label: "Share a meal",
    icon: "🍲",
    minutes: 30,
    desc: "Break bread together. Costs a little money; feeds you and warms them to you.",
    cost: (npc) => npc.mealCost || 9,
    gate: (state, npc) => {
      if (!npc.offersMeal) return "They're not one to sit and eat with — not here.";
      if (state.money < (npc.mealCost || 9)) return `Costs $${npc.mealCost || 9} — you can't spare it.`;
      return null;
    },
    apply: ({ rng }) => ({
      rel: { affection: rng.int(5, 8), trust: 3 },
      condition: { hunger: +28, hope: +4, energy: +4, stress: -4 },
      memory: { kind: "meal", text: "You shared a meal." },
      meal: true,
      line: "You eat together. For half an hour the city's weight lifts a little.",
    }),
  },
  {
    id: "help",
    label: "Lend a hand",
    icon: "🤝",
    minutes: 40,
    desc: "Pitch in on whatever they're doing. Tiring, but it earns real respect — and they'll remember.",
    cost: () => 0,
    gate: (state, npc, rel) => {
      if (!rel.met) return "Introduce yourself first.";
      if (state.condition.energy < 25) return "You're too worn out to be any use.";
      return null;
    },
    apply: ({ rng }) => ({
      rel: { respect: rng.int(6, 10), trust: 5, debt: -rng.int(8, 14) }, // they now owe you
      condition: { energy: -14, stress: +3, hope: +3 },
      skills: { communication: 1 },
      memory: { kind: "help", text: "You helped them out when it counted." },
      line: "You roll your sleeves up and pitch in. They notice — people always notice who shows up.",
    }),
  },
  {
    id: "favour",
    label: "Ask a favour",
    icon: "🙏",
    minutes: 15,
    desc: "Call in their goodwill. Only works once you've earned it — and it puts you in their debt.",
    cost: () => 0,
    gate: (state, npc, rel) => {
      if (rel.lastFavourDay === state.day) return "You've already leaned on them today.";
      const owed = rel.debt <= -6; // they owe you — a favour is easy to ask
      if (!owed && stageFor(rel).index < 2) return "You're not close enough to ask — yet.";
      return null;
    },
    apply: ({ npc, rng }) => {
      const fav = npc.favour;
      const money = fav.money ? rng.int(fav.money[0], fav.money[1]) : 0;
      return {
        rel: { affection: 1, debt: fav.debt || 8 }, // you now owe them
        favour: true,
        money,
        favourApply: fav.apply,
        memory: { kind: "favour", text: `They did you a favour: ${fav.note}.` },
        line: fav.line,
        boon: fav.label,
      };
    },
  },
  {
    id: "gift",
    label: "Give a gift",
    icon: "🎁",
    minutes: 10,
    desc: "A small token — or paying back what you owe. Settles debt and warms the bond.",
    cost: () => 10,
    gate: (state) => (state.money < 10 ? "Costs $10 — your pocket's too light." : null),
    apply: ({ rel, rng }) => {
      const repaying = rel.debt > 0;
      return {
        rel: { affection: rng.int(3, 6), trust: 2, debt: -10 }, // settles what you owe
        memory: { kind: repaying ? "repay" : "gift", text: repaying ? "You paid back what you owed." : "You brought them a small gift." },
        line: repaying ? "You settle up. Trust, it turns out, compounds." : "A small thing, given freely. It lands warmer than its price.",
      };
    },
  },
];

export function getAction(id) {
  return SOCIAL_ACTIONS.find((a) => a.id === id) || null;
}

// Actions for the conversation UI: each with whether it's enabled and why not.
export function socialActions(state, npc) {
  const rel = getRel(state, npc.id);
  return SOCIAL_ACTIONS.map((a) => {
    const cost = a.cost(npc);
    let reason = a.gate(state, npc, rel);
    if (!reason && minutesLeft(state) < a.minutes) reason = "Not enough time left in the day.";
    return { action: a, cost, enabled: !reason, reason };
  });
}

// ── Resolution ───────────────────────────────────────────────────────────────
// Perform a social action. Applies the descriptor from apply(), advances the
// clock, records memory, and returns a result the UI renders (deltas, stage-up,
// memory line, any boon). Returns null if the action can't be done.
export function doSocial(game, npcId, actionId) {
  const state = game.store.state;
  const npc = getNpc(npcId);
  const action = getAction(actionId);
  if (!npc || !action) return null;
  if (!isPresent(state, npc)) return null;

  const cost = action.cost(npc);
  const rel = ensureRel(state, npc.id);
  const gate = action.gate(state, npc, rel);
  if (gate) return null;
  if (state.money < cost) return null;
  if (minutesLeft(state) < action.minutes) return null;

  const rng = game.rng;
  const bondBefore = bondScore(rel);
  const stageBefore = stageFor(rel).index;
  const wasMet = rel.met;
  const before = { ...state.condition };

  const res = action.apply({ state, npc, rel, rng, day: state.day }) || {};

  // Money: a cost out, an occasional cash boon in (e.g. a dispatcher's tip).
  if (cost) {
    state.money -= cost;
    state.ledger.spent += cost;
    state.stats.spent += cost;
    addLedger(state, `${action.label} — ${npc.short}`, -cost, "social");
  }
  if (res.money) {
    state.money += res.money;
    state.ledger.earned += res.money;
    state.stats.earned += res.money;
    addLedger(state, `${npc.short}'s tip-off`, +res.money, "income");
  }

  // Relationship variables.
  if (res.rel) {
    if (res.rel.trust) rel.trust = clamp(rel.trust + res.rel.trust);
    if (res.rel.respect) rel.respect = clamp(rel.respect + res.rel.respect);
    if (res.rel.affection) rel.affection = clamp(rel.affection + res.rel.affection);
    if (res.rel.conflict) rel.conflict = clamp(rel.conflict + res.rel.conflict);
    if (res.rel.debt) rel.debt = clamp(rel.debt + res.rel.debt, -100, 100);
  }

  // The favour's concrete, traceable effect (book: NPCs have material impact).
  if (res.favourApply) res.favourApply(state);
  if (res.favour) { rel.lastFavourDay = state.day; state.stats.favoursAsked = (state.stats.favoursAsked || 0) + 1; }

  // Condition + skills.
  if (res.condition) applyCondition(state, res.condition);
  if (res.skills) applySkills(state, res.skills);
  if (res.meal) state.stats.mealsEaten++;

  // Social memory — first meeting and notable beats, capped so it stays recent.
  if (!wasMet) { rel.met = true; rel.firstDay = state.day; state.stats.peopleMet = (state.stats.peopleMet || 0) + 1; }
  if (res.memory) {
    rel.memory.push({ day: state.day, kind: res.memory.kind, text: res.memory.text });
    if (rel.memory.length > 12) rel.memory.shift();
  }

  // Chat's same-day counter (drives diminishing returns next time).
  if (action.id === "chat") {
    rel.lastTalk = rel.lastTalk && rel.lastTalk.day === state.day ? { day: state.day, count: rel.lastTalk.count + 1 } : { day: state.day, count: 1 };
  }

  // Time passes.
  passiveDrift(state, action.minutes);
  const roll = advanceClock(state, action.minutes);

  // Narrative.
  pushLog(state, `${npc.short}: ${res.line}`);
  state.rng.state = rng.getState();

  const bondAfter = bondScore(rel);
  const stageAfter = stageFor(rel).index;

  const result = {
    npc, action, line: res.line, boon: res.boon || null, boonNote: res.favour ? npc.favour.note : null,
    money: res.money || 0, cost,
    relDelta: res.rel || {},
    bondBefore, bondAfter, stageUp: stageAfter > stageBefore ? stageFor(rel) : null,
    metNow: !wasMet,
    before, after: { ...state.condition },
    forcedSleep: roll.rolledOver,
  };

  game.store.emit();
  game.autosave();
  return result;
}
