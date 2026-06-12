// The "People here" panel (book §13). Shows whoever is standing in your district
// right now — presence comes from each NPC's daily schedule, so the cast you see
// changes with the hour. Each row carries a portrait, role, your standing with
// them (stage + a bond bar), what they're doing, and a way into a conversation.

import { el } from "./dom.js";
import { peoplePresent, bondScore } from "../systems/relationships.js";
import { npcsAnchoredIn } from "../data/npcs.js";

// `onTalk(npcId)` opens the conversation screen.
export function renderPeople(state, onTalk) {
  const here = peoplePresent(state);

  const head = el("div.panel__head", {}, [
    el("h3", { text: "People here" }),
    el("span.panel__hint", { text: here.length ? `${here.length} around right now` : "Nobody about" }),
  ]);

  if (!here.length) {
    const locals = npcsAnchoredIn(state.location);
    const hint = locals.length
      ? `Quiet for now. ${locals.map((n) => n.short).join(" and ")} keep${locals.length === 1 ? "s" : ""} hours around here — come back later.`
      : "This district keeps to itself. People pass through but few linger.";
    return el("div.panel.people", {}, [head, el("p.people__empty", { text: hint })]);
  }

  const rows = here.map(({ npc, rel, stage, segment }) => {
    const bond = bondScore(rel);
    const owe = rel.debt >= 6 ? el("span.person__tag.person__tag--debt", { text: `you owe`, title: "You owe them a favour." })
      : rel.debt <= -6 ? el("span.person__tag.person__tag--owed", { text: `owes you`, title: "They owe you a favour." })
      : null;

    return el("div.personrow", { style: `--accent:${npc.color}` }, [
      el("span.personrow__face", { text: npc.icon }),
      el("div.personrow__id", {}, [
        el("div.personrow__top", {}, [
          el("span.personrow__name", { text: npc.name }),
          el("span.personrow__role", { text: npc.role }),
        ]),
        el("div.personrow__where", { text: segment.at }),
        el("div.personrow__bond", {}, [
          el("span.personrow__stage", { text: rel.met ? stage.name : "Not yet met" }),
          el("div.personrow__bar", { title: `Bond ${bond}/100` }, [el("div.personrow__fill", { style: `width:${Math.max(4, bond)}%` })]),
          owe,
        ]),
      ]),
      el("button.personrow__talk", { onClick: () => onTalk(npc.id), title: `Talk with ${npc.name}` }, ["Talk ▸"]),
    ]);
  });

  return el("div.panel.people", {}, [head, el("div.people__list", {}, rows)]);
}
