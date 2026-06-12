// The conversation screen (book §12/§13). You step up to someone who's present in
// your district and choose how to spend a little time with them: catch up, share a
// meal, lend a hand, ask a favour, or settle up with a gift. Each choice shows its
// honest cost and effect, then plays out — shifting trust, respect, affection and
// debt, and leaving a mark in their memory of you. Re-renders itself in place after
// each action (it isn't a LIVE screen, so we drive the refresh by hand).

import { el, clear, mount } from "./dom.js";
import { CONDITION_META } from "../core/state.js";
import { getNpc, STAGES } from "../data/npcs.js";
import {
  getRel, bondScore, stageFor, voiceLine, socialActions, doSocial, isPresent,
} from "../systems/relationships.js";
import { getDistrict } from "../data/districts.js";

export function talkScreen(root, game, sm, ctx) {
  const state = game.store.state;
  const npc = getNpc(ctx && ctx.npcId);
  if (!npc) { sm.show("city"); return; }

  let lastResult = null;

  function render() {
    clear(root);
    // If time has moved them on (a long action pushed past their shift), bow out.
    if (!isPresent(state, npc)) { renderGone(); return; }

    const rel = getRel(state, npc.id);
    const stage = stageFor(rel);
    const bond = bondScore(rel);
    const acts = socialActions(state, npc);

    const debtChip = rel.debt >= 6
      ? el("span.talk__chip.talk__chip--debt", { text: `You owe a favour` })
      : rel.debt <= -6 ? el("span.talk__chip.talk__chip--owed", { text: `They owe you` }) : null;
    const conflictChip = rel.conflict >= 10 ? el("span.talk__chip.talk__chip--conflict", { text: `Tension` }) : null;

    // The bond ladder, with the current rung lit.
    const ladder = el("div.talk__ladder", {}, STAGES.map((s, i) =>
      el("span.talk__rung" + (i === stage.index ? ".is-on" : "") + (i < stage.index ? ".is-done" : ""), {
        title: s.name, text: s.name,
      })));

    const actionEls = acts.map(({ action, cost, enabled, reason }) =>
      el("button.socialact" + (enabled ? "" : ".socialact--off"), {
        disabled: enabled ? null : true,
        title: enabled ? action.desc : reason,
        onClick: enabled ? () => onAct(action.id) : null,
      }, [
        el("span.socialact__icon", { text: action.icon }),
        el("div.socialact__body", {}, [
          el("div.socialact__name", { text: action.label }),
          el("div.socialact__desc", { text: enabled ? action.desc : reason }),
        ]),
        el("div.socialact__cost", {}, [
          el("span.tag", { text: `${action.minutes}m` }),
          cost ? el("span.tag.tag--money", { text: `$${cost}` }) : null,
        ]),
      ]));

    mount(root, el("section.screen.talk", { style: `--accent:${npc.color}` }, [
      el("div.talk__card", {}, [
        // Header — who they are and where you stand with them.
        el("div.talk__head", {}, [
          el("span.talk__face", { text: npc.icon }),
          el("div.talk__id", {}, [
            el("div.talk__name", { text: npc.name }),
            el("div.talk__sub", {}, [
              el("span.talk__role", { text: npc.role }),
              el("span.talk__at", { text: `${getDistrict(npc.anchor).icon} ${getDistrict(npc.anchor).short}` }),
            ]),
          ]),
          el("div.talk__standing", {}, [
            el("span.talk__stage", { text: rel.met ? stage.name : "Stranger" }),
            el("div.talk__bar", { title: `Bond ${bond}/100` }, [el("div.talk__fill", { style: `width:${Math.max(4, bond)}%` })]),
            el("div.talk__chips", {}, [debtChip, conflictChip]),
          ]),
        ]),

        ladder,

        // What they say — coloured by stage and by what they remember of you.
        el("div.talk__speech", {}, [
          el("p.talk__line", { text: voiceLine(npc, rel) }),
          stage.index >= 2 ? el("p.talk__pressure", { text: `— ${npc.pressure}` }) : null,
        ]),

        // The blurb until you know them; their memory of you once you do.
        rel.met && rel.memory.length
          ? el("div.talk__memory", {}, [
              el("div.talk__memlabel", { text: "Between you" }),
              el("div.talk__memlist", {}, rel.memory.slice(-3).reverse().map((m) =>
                el("span.talk__mem", { text: `Day ${m.day} · ${m.text}` }))),
            ])
          : el("p.talk__blurb", { text: npc.blurb }),

        // The result of your last action, if any.
        lastResult ? renderResult(lastResult) : null,

        // What you can do together.
        el("div.socialacts", {}, actionEls),

        el("button.btn.btn--ghost.btn--block", { onClick: () => sm.show("city") }, ["← Step away"]),
      ]),
    ]));
  }

  function renderResult(r) {
    const condDeltas = Object.keys(CONDITION_META).map((k) => {
      const v = Math.round((r.after[k] ?? 0) - (r.before[k] ?? 0));
      if (!v) return null;
      const meta = CONDITION_META[k];
      const goodDir = meta.good === "low" ? -1 : 1;
      const tone = v * goodDir > 0 ? "ok" : "bad";
      return el(`span.talk__delta.tone-${tone}`, { text: `${meta.icon} ${v > 0 ? "+" : ""}${v}` });
    }).filter(Boolean);

    const bondShift = r.bondAfter - r.bondBefore;
    const bits = [];
    if (bondShift) bits.push(el("span.talk__delta.tone-ok", { text: `🔗 ${bondShift > 0 ? "+" : ""}${bondShift} bond` }));
    if (r.money) bits.push(el("span.talk__delta.tone-ok", { text: `💰 +$${r.money}` }));
    if (r.cost) bits.push(el("span.talk__delta.tone-bad", { text: `💰 -$${r.cost}` }));

    return el("div.talk__result", {}, [
      el("p.talk__resultline", { text: r.line }),
      r.boon ? el("div.talk__boon", { text: `✦ ${r.boon} — ${r.boonNote}` }) : null,
      r.stageUp ? el("div.talk__stageup", { text: `You're now ${r.stageUp.name.toLowerCase()} with ${r.npc.short}.` }) : null,
      r.metNow ? el("div.talk__stageup", { text: `You've met ${r.npc.name}.` }) : null,
      (bits.length || condDeltas.length) ? el("div.talk__deltas", {}, [...bits, ...condDeltas]) : null,
    ]);
  }

  function onAct(actionId) {
    const r = doSocial(game, npc.id, actionId);
    if (!r) return;
    lastResult = r;
    if (r.forcedSleep) { sm.show("report", { report: game.sleep(true) }); return; }
    render();
  }

  function renderGone() {
    clear(root);
    mount(root, el("section.screen.talk", { style: `--accent:${npc.color}` }, [
      el("div.talk__card", {}, [
        el("div.talk__head", {}, [
          el("span.talk__face", { text: npc.icon }),
          el("div.talk__id", {}, [
            el("div.talk__name", { text: npc.name }),
            el("div.talk__sub", {}, [el("span.talk__role", { text: npc.role })]),
          ]),
        ]),
        el("p.talk__line", { text: `${npc.short} has moved on — there's nobody here to talk to now.` }),
        el("button.btn.btn--primary.btn--block", { onClick: () => sm.show("city") }, ["← Back to the city"]),
      ]),
    ]));
  }

  render();
}
