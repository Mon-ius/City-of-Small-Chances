// The Opportunity Web screen + the city-side "Prospects" panel (book §11). The
// web is the game's honest answer to "why can't I do that yet?" — every chance
// is laid out with the exact components it needs (Skill, Relationship,
// Reputation, Possession, Timing, History), each ticked or not, with a hint on
// how to close the gap, and a plain-language reason line underneath. Nothing is
// hidden behind RNG; the path is always legible. Re-renders itself in place after
// a claim (it isn't a LIVE screen).

import { el, clear, mount } from "./dom.js";
import { listOpportunities, claimOpportunity, prospectSummary } from "../systems/opportunities.js";

// The six requirement components, named for the checklist (book §11).
const KIND_LABEL = {
  skill: "Skill", relationship: "Relationship", reputation: "Reputation",
  possession: "Possession", timing: "Timing", history: "History",
};

// Sort so the actionable rises to the top.
const ORDER = { available: 0, locked: 1, rumoured: 2, transformed: 3, missed: 4, hidden: 5 };

export function opportunitiesScreen(root, game, sm) {
  const state = game.store.state;
  let lastClaim = null;

  function render() {
    clear(root);
    const list = listOpportunities(state).sort(
      (a, b) => (ORDER[a.status] - ORDER[b.status]) || a.opp.title.localeCompare(b.opp.title)
    );
    const sum = prospectSummary(state);

    const cards = list.length
      ? list.map((o) => card(o))
      : [el("p.web__empty", { text: "No chances have surfaced yet. Meet people, work the districts, and the web will start to fill in." })];

    mount(root, el("section.screen.web", {}, [
      el("div.web__inner", {}, [
        el("div.web__top", {}, [
          el("button.btn.btn--ghost.web__back", { onClick: () => sm.show("city") }, ["← Back to the city"]),
          el("h2", { text: "The Opportunity Web" }),
          el("p.web__lede", { text: "Chances here aren't luck. Each one appears because of what you've built — a skill, a friendship, a name in a district, a thing you own, the weather and hour, your own record. Here's exactly what each would take." }),
          el("div.web__tally", {}, [
            tally("Available", sum.available, "ok"),
            tally("Known", sum.locked, "mid"),
            tally("Rumoured", sum.rumoured, "warn"),
            tally("Yours", sum.taken, "ok"),
          ]),
        ]),
        lastClaim ? claimInset(lastClaim) : null,
        el("div.web__list", {}, cards),
      ]),
    ]));
  }

  function card(o) {
    const { opp, status, state: stMeta, category, reqs, reason, claim } = o;
    const rumoured = status === "rumoured";
    const taken = status === "transformed";

    const head = el("div.oppcard__head", {}, [
      el("span.oppcard__icon", { text: opp.icon }),
      el("div.oppcard__id", {}, [
        el("div.oppcard__title", { text: opp.title }),
        el("div.oppcard__tags", {}, [
          el("span.oppcard__cat", { style: `--cat:${category.color}`, text: category.label }),
          opp.district ? el("span.oppcard__where", { text: districtTag(opp.district) }) : null,
        ]),
      ]),
      el(`span.oppcard__badge.tone-${stMeta.tone}`, { text: stMeta.word }),
    ]);

    // Rumoured: just the whisper — you don't know the specifics yet.
    if (rumoured) {
      return el("div.oppcard.oppcard--rumoured", { style: `--cat:${category.color}` }, [
        head,
        el("p.oppcard__rumour", { text: `“${opp.rumour}”` }),
        el("div.web__reason", { text: `🔎 ${reason}` }),
      ]);
    }

    // Known / available / taken: full requirement checklist.
    const reqList = el("div.oppcard__reqs", {}, reqs.map((r) =>
      el("div.req" + (r.met ? ".is-met" : "") + (r.known ? "" : ".is-unknown"), {}, [
        el("span.req__mark", { text: r.met ? "✓" : "○" }),
        el("div.req__body", {}, [
          el("div.req__line", {}, [
            el("span.req__kind", { text: KIND_LABEL[r.kind] || r.kind }),
            el("span.req__label", { text: r.label }),
          ]),
          el("div.req__track", {}, [el("div.req__fill" + (r.met ? ".is-met" : ""), { style: `width:${Math.round((r.progress || 0) * 100)}%` })]),
          !r.met && r.hint ? el("div.req__hint", { text: r.hint }) : null,
        ]),
      ])
    ));

    const children = [
      head,
      el("p.oppcard__blurb", { text: opp.blurb }),
      reqList,
      el("div.web__reason", { text: `🔎 ${reason}` }),
    ];

    if (status === "available") {
      children.push(el("div.oppcard__act", {}, [
        el("button.btn.btn--primary", { onClick: () => onClaim(opp.id) }, [opp.repeatable ? "Take the run ▸" : "Take it on ▸"]),
        el("span.oppcard__rewardnote", { text: `✦ ${opp.reward.note}` }),
      ]));
    } else if (taken) {
      children.push(el("div.oppcard__taken", { text: `✦ ${opp.reward.note}${claim && claim.count > 1 ? ` · taken ${claim.count}×` : ""}` }));
    } else if (opp.repeatable && claim) {
      // A repeatable you've done before, waiting on its window again.
      children.push(el("div.oppcard__taken", { text: `Done ${claim.count}× before — comes round again when the conditions line up.` }));
    }

    return el("div.oppcard" + (status === "available" ? ".oppcard--ready" : "") + (taken ? ".oppcard--taken" : ""), {
      style: `--cat:${category.color}`,
    }, children);
  }

  function claimInset(r) {
    return el("div.web__claim", {}, [
      el("p.web__claimline", { text: r.line }),
      el("div.web__claimrow", {}, [
        el("span.web__claimnote", { text: `✦ ${r.note}` }),
        r.surgePay ? el("span.tag.tag--money", { text: `+$${r.surgePay}` })
          : r.moneyDelta ? el("span.tag.tag--money", { text: `${r.moneyDelta > 0 ? "+" : ""}$${r.moneyDelta}` }) : null,
      ]),
    ]);
  }

  function onClaim(id) {
    const r = claimOpportunity(game, id);
    if (!r) return;
    lastClaim = r;
    render();
  }

  function tally(label, n, tone) {
    return el("div.web__tallycell", {}, [
      el(`span.web__tallyn.tone-${tone}`, { text: String(n) }),
      el("span.web__tallylabel", { text: label }),
    ]);
  }

  render();
}

function districtTag(districtId) {
  // Lazy import-free lookup via a tiny static map would duplicate data; instead
  // the system already names districts in reasons, so here we keep it minimal.
  return DISTRICT_SHORT[districtId] || districtId;
}
const DISTRICT_SHORT = {
  tenements: "🏚️ Tenements", market_row: "🍜 Market", old_harbour: "⚓ Harbour",
  dockside: "📦 Docks", uptown: "🏛️ Civic",
};

// ── City-side "Prospects" panel ──────────────────────────────────────────────
// A compact teaser in the city side-column: how many chances are live, the
// nearest one or two, and a way into the full web. `onOpen()` shows the screen.
export function renderProspects(state, onOpen) {
  const sum = prospectSummary(state);
  const list = listOpportunities(state).sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  const head = el("div.panel__head", {}, [
    el("h3", { text: "Prospects" }),
    el("span.panel__hint", { text: sum.available ? `${sum.available} ready` : sum.visible ? "in the works" : "none yet" }),
  ]);

  if (!sum.visible) {
    return el("div.panel.prospects", {}, [
      head,
      el("p.prospects__empty", { text: "Nothing's surfaced yet. Meet people and work the districts — chances will start to show." }),
    ]);
  }

  // Show up to three: prefer available, then known, then rumoured.
  const top = list.slice(0, 3).map((o) => {
    const { opp, status, state: stMeta } = o;
    return el("div.prospect" + (status === "available" ? ".is-ready" : ""), { style: `--cat:${o.category.color}` }, [
      el("span.prospect__icon", { text: opp.icon }),
      el("div.prospect__body", {}, [
        el("div.prospect__title", { text: status === "rumoured" ? "A rumour…" : opp.title }),
        el("div.prospect__status", {}, [el(`span.tone-${stMeta.tone}`, { text: stMeta.word })]),
      ]),
    ]);
  });

  return el("div.panel.prospects", {}, [
    head,
    el("div.prospects__list", {}, top),
    el("button.btn.btn--block.prospects__open", { onClick: () => onOpen() }, ["Open the web ▸"]),
  ]);
}
