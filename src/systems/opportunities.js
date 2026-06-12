// Opportunity Web — evaluation, state machine and the book's "debugging rule"
// (book §11). This turns the declarative opportunities (data/opportunities.js)
// into something the UI can show honestly: for each chance we work out which of
// its requirement components are met, what *state* it's in (Hidden → Rumoured →
// Known/locked → Available → Yours-now), and — crucially — a plain-language
// reason string that explains exactly why it's where it is. The book is emphatic
// that nothing here is opaque: "every opportunity must produce a reason like
// 'Appeared because the player has Logistics 20, owns a bicycle, met Jun, and it
// is raining after 17:00.'" Everything below exists to keep that promise.

import { OPPORTUNITIES, OPP_CATEGORIES, getOpportunity } from "../data/opportunities.js";
import { getRel, bondScore } from "./relationships.js";
import { getNpc } from "../data/npcs.js";
import { getRep, repWord } from "./reputation.js";
import { getDistrict } from "../data/districts.js";
import { weatherMeta } from "./weather.js";
import { fmtClock } from "../core/time.js";
import { addLedger, pushLog } from "./activities.js";

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Plain skill names + how you actually raise each (book: "recommended path").
const SKILL_NAMES = {
  logistics: "Logistics", service: "Service", maintenance: "Maintenance",
  cooking: "Cooking", communication: "Communication", focus: "Focus", resilience: "Resilience",
};
const SKILL_PATHS = {
  logistics: "courier runs and haulage shifts raise it",
  service: "stall and counter work raises it",
  maintenance: "harbour and dock work — or a lesson from Tomo — raise it",
  cooking: "cooking your own meals raises it",
  communication: "desk work and time spent with people raise it",
  focus: "the civic records desk and library study raise it",
  resilience: "hard shifts and hard days raise it",
};

// Possessions: the book asks us to show affordable alternatives / rentals.
const ITEM_INFO = {
  bicycle: { name: "a bicycle", get: "Buy one second-hand, or rent by the day at the market." },
  safetyShoes: { name: "safety shoes", get: "Buy a pair — or borrow Rafiq's steel-toes as a favour." },
  laptop: { name: "a laptop", get: "Save for one, or use the library's machines for now." },
  umbrella: { name: "an umbrella", get: "A few coins at any market stall." },
};

// The seven states a chance can be in, with the word + tone the UI shows.
export const OPP_STATES = {
  hidden: { word: "Hidden", tone: "faint" },
  rumoured: { word: "Rumoured", tone: "warn" },
  locked: { word: "Known", tone: "mid" },
  available: { word: "Available", tone: "ok" },
  committed: { word: "Taken", tone: "ok" },
  missed: { word: "Missed", tone: "bad" },
  transformed: { word: "Yours now", tone: "ok" },
};

// ── Requirement evaluation ───────────────────────────────────────────────────
// Each evaluator returns a uniform descriptor the UI and reason-builder share:
//   met      — is this component satisfied?
//   known    — do you know enough to even see the specifics? (book: relationship
//              clues are hidden until you've met the person)
//   label    — the checklist line ("Logistics 12 / 20")
//   progress — 0..1 for the little progress bar
//   hint     — how to satisfy it (the book's per-component guidance)
//   phrase   — plain noun phrase when met   ("Logistics 22")
//   need     — plain phrase when unmet      ("Logistics up to 20 (now 12)")
function evalReq(state, req) {
  switch (req.kind) {
    case "skill": {
      const cur = state.skills[req.skill] || 0;
      const name = SKILL_NAMES[req.skill] || req.skill;
      const met = cur >= req.min;
      return {
        kind: "skill", met, known: true,
        label: `${name} ${cur} / ${req.min}`, progress: clamp01(cur / req.min),
        hint: met ? null : `Raise ${name} — ${SKILL_PATHS[req.skill] || "practice raises it"}.`,
        phrase: `${name} ${cur}`, need: `${name} up to ${req.min} (now ${cur})`,
      };
    }
    case "relationship": {
      const npc = getNpc(req.npc);
      const rel = getRel(state, req.npc);
      const b = bondScore(rel);
      // Book: show the relationship requirement only once its clue is known —
      // i.e. once you've actually met the person it hinges on.
      if (!rel.met) {
        return {
          kind: "relationship", met: false, known: false,
          label: "Someone you've yet to meet", progress: 0,
          hint: "This leans on a person you haven't met. Find them and introduce yourself.",
          phrase: null, need: "to meet the right person",
        };
      }
      const met = b >= req.min;
      return {
        kind: "relationship", met, known: true,
        label: `${npc.short}'s trust — bond ${b} / ${req.min}`, progress: clamp01(b / req.min),
        hint: met ? null : `Spend time with ${npc.short}: catch up, share meals, lend a hand.`,
        phrase: `${npc.short}'s trust (bond ${b})`, need: `more of ${npc.short}'s trust (bond ${b}/${req.min})`,
      };
    }
    case "reputation": {
      const cur = getRep(state, req.district);
      const d = getDistrict(req.district);
      const met = cur >= req.min;
      return {
        kind: "reputation", met, known: true,
        label: `${d.short}: ${repWord(cur)} (${cur} / ${req.min})`, progress: clamp01(cur / Math.max(1, req.min)),
        hint: met ? null : `Build your name in ${d.short}: work clean shifts and show up for people there. Sloppy work and injuries set it back.`,
        phrase: `a ${repWord(cur)} name in ${d.short}`, need: `a stronger name in ${d.short} (${cur}/${req.min})`,
      };
    }
    case "possession": {
      const has = !!(state.inventory && state.inventory[req.item]);
      const info = ITEM_INFO[req.item] || { name: req.item, get: "" };
      return {
        kind: "possession", met: has, known: true,
        label: has ? `You have ${info.name}` : `Need ${info.name}`, progress: has ? 1 : 0,
        hint: has ? null : info.get,
        phrase: info.name, need: info.name,
      };
    }
    case "timing": {
      // Book: show the temporary window and its expiry. Our windows recur (they
      // hinge on weather + hour), so we describe the window rather than a date.
      const okWeather = !req.weather || req.weather.includes(state.weather);
      const okTime = req.after == null || state.clock >= req.after;
      const met = okWeather && okTime;
      const windowLabel = req.label || describeWindow(req);
      let hint = null;
      if (!met) {
        if (!okWeather) hint = `Only when it's ${weatherList(req)}${req.after != null ? `, not before ${fmtClock(req.after)}` : ""}. Right now the sky won't oblige.`;
        else hint = `The weather's right, but it's not ${fmtClock(req.after)} yet.`;
      }
      return {
        kind: "timing", met, known: true, transient: true,
        label: `Window: ${windowLabel}`, progress: met ? 1 : 0,
        hint, phrase: windowLabel, need: `the right window (${windowLabel})`,
      };
    }
    case "history": {
      const cur = (state.stats && state.stats[req.stat]) || 0;
      const what = req.label || req.stat;
      const met = cur >= req.min;
      return {
        kind: "history", met, known: true,
        label: `${cap(what)} — ${cur} / ${req.min}`, progress: clamp01(cur / req.min),
        hint: met ? null : `This opens up as your record grows — ${req.min} ${what} (you're at ${cur}).`,
        phrase: `${cur} ${what}`, need: `${req.min} ${what} (you have ${cur})`,
      };
    }
    default:
      return { kind: req.kind, met: true, known: true, label: String(req.kind), progress: 1, hint: null, phrase: null, need: null };
  }
}

function describeWindow(req) {
  const parts = [];
  if (req.weather) parts.push(weatherList(req));
  if (req.after != null) parts.push(`after ${fmtClock(req.after)}`);
  return parts.join(", ") || "any time";
}
function weatherList(req) {
  return req.weather.map((w) => weatherMeta(w).label.toLowerCase()).join(" or ");
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── Claim bookkeeping ────────────────────────────────────────────────────────
function claimInfo(state, opp) {
  const v = state.opportunities && state.opportunities.claimed && state.opportunities.claimed[opp.id];
  if (v == null) return null;
  if (typeof v === "number") return { firstDay: v, lastDay: v, count: 1 };
  return v;
}
function recordClaim(state, opp) {
  const day = state.day;
  const prev = claimInfo(state, opp);
  state.opportunities.claimed[opp.id] = prev
    ? { firstDay: prev.firstDay, lastDay: day, count: prev.count + 1 }
    : { firstDay: day, lastDay: day, count: 1 };
}

// Remember every chance you've laid eyes on, so it can never un-discover itself
// (book). Idempotent; safe to call on every render.
export function noteDiscoveries(state) {
  if (!state.opportunities) state.opportunities = { seen: {}, claimed: {} };
  if (!state.opportunities.seen) state.opportunities.seen = {};
  for (const opp of OPPORTUNITIES) {
    if (!state.opportunities.seen[opp.id] && safe(opp.discover, state)) state.opportunities.seen[opp.id] = true;
  }
}
function safe(fn, state) { try { return !!fn(state); } catch { return false; } }

// ── State machine ────────────────────────────────────────────────────────────
export function opportunityStatus(state, opp) {
  const reqs = opp.requires.map((r) => evalReq(state, r));
  const allMet = reqs.every((r) => r.met);
  const claim = claimInfo(state, opp);
  const discovered = !!(state.opportunities && state.opportunities.seen && state.opportunities.seen[opp.id]) || safe(opp.discover, state);
  const clueKnown = safe(opp.clue, state);

  // A one-off you've taken becomes a permanent fixture (Transformed). A
  // repeatable one falls back through the machine to show if it's ready again.
  if (claim && !opp.repeatable) return { status: "transformed", reqs, claim };
  if (!discovered) return { status: "hidden", reqs, claim };
  if (!clueKnown) return { status: "rumoured", reqs, claim };
  if (allMet) return { status: "available", reqs, claim };
  return { status: "locked", reqs, claim };
}

// ── The book's reason string (debugging rule) ────────────────────────────────
export function opportunityReason(state, opp, st) {
  st = st || opportunityStatus(state, opp);
  const reqs = st.reqs;
  const have = reqs.filter((r) => r.met).map((r) => r.phrase).filter(Boolean);
  const need = reqs.filter((r) => !r.met).map((r) => r.need).filter(Boolean);
  const where = opp.district ? ` around ${getDistrict(opp.district).short}` : "";

  switch (st.status) {
    case "hidden":
      return "Hidden — nothing in your life points here yet.";
    case "rumoured":
      return `You've caught wind of this${where}, but you don't yet know what it would take.`;
    case "available":
      return `Available because you've got ${joinAnd(have)}.`;
    case "transformed": {
      const c = st.claim;
      return `Yours now — taken on day ${c ? c.firstDay : "?"}. It's part of your life in the city.`;
    }
    case "missed":
      return "The window for this one passed.";
    case "locked":
    default: {
      const lead = have.length ? `You've already got ${joinAnd(have)}` : "You've made a start";
      return `${lead}, but still need ${joinAnd(need)}.`;
    }
  }
}

function joinAnd(arr) {
  arr = arr.filter(Boolean);
  if (!arr.length) return "—";
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

// ── Public listing ───────────────────────────────────────────────────────────
export function describeOpportunity(state, opp) {
  const st = opportunityStatus(state, opp);
  return {
    opp, status: st.status, reqs: st.reqs, claim: st.claim,
    state: OPP_STATES[st.status], category: OPP_CATEGORIES[opp.category],
    reason: opportunityReason(state, opp, st),
    repeatable: !!opp.repeatable,
  };
}

export function listOpportunities(state, { includeHidden = false } = {}) {
  noteDiscoveries(state);
  const list = OPPORTUNITIES.map((opp) => describeOpportunity(state, opp));
  return includeHidden ? list : list.filter((o) => o.status !== "hidden");
}

// Compact counts for the city-side "Prospects" panel.
export function prospectSummary(state) {
  noteDiscoveries(state);
  let available = 0, locked = 0, rumoured = 0, taken = 0;
  for (const opp of OPPORTUNITIES) {
    const { status } = opportunityStatus(state, opp);
    if (status === "available") available++;
    else if (status === "locked") locked++;
    else if (status === "rumoured") rumoured++;
    else if (status === "transformed") taken++;
  }
  return { available, locked, rumoured, taken, visible: available + locked + rumoured + taken };
}

// ── Claiming ─────────────────────────────────────────────────────────────────
export function claimOpportunity(game, id) {
  const state = game.store.state;
  const opp = getOpportunity(id);
  if (!opp) return null;
  const st = opportunityStatus(state, opp);
  if (st.status !== "available") return null;

  const moneyBefore = state.money;
  delete state._lastSurgePay;
  opp.reward.apply(state, game.rng);
  state.rng.state = game.rng.getState();
  recordClaim(state, opp);

  const moneyDelta = state.money - moneyBefore;
  if (moneyDelta) addLedger(state, `Opportunity — ${opp.title}`, moneyDelta, moneyDelta > 0 ? "income" : "spend");
  pushLog(state, `✦ ${opp.reward.line}`);
  if (!state.ledger.opportunities) state.ledger.opportunities = [];
  state.ledger.opportunities.push(`Took up: ${opp.title}`);

  const result = {
    opp, line: opp.reward.line, note: opp.reward.note,
    moneyDelta, repeatable: !!opp.repeatable,
    surgePay: state._lastSurgePay || 0,
  };
  delete state._lastSurgePay;

  game.store.emit();
  game.autosave();
  return result;
}
