// Screen definitions + a tiny screen manager. Screens are functions that render
// into a host element and wire their own buttons back to the Game and manager.

import { el, clear, mount, toast } from "./dom.js";
import { renderHud } from "./hud.js";
import { BACKGROUNDS, TRAITS, START_SKILLS, getBackground } from "../data/content.js";
import { listActivities } from "../systems/activities.js";
import { conditionWarnings } from "../systems/condition.js";
import { hasSave, deleteSave, saveMeta } from "../core/save.js";
import { weatherMeta } from "../systems/weather.js";
import { CONDITION_META } from "../core/state.js";
import { minutesLeft } from "../core/time.js";

export class ScreenManager {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.current = null;
    // Re-render the active screen whenever state changes.
    game.store.subscribe(() => this._refresh());
  }
  show(name, ctx) {
    this.current = { name, ctx };
    this._render();
  }
  _render() {
    clear(this.root);
    const fn = SCREENS[this.current.name];
    fn(this.root, this.game, this, this.current.ctx || {});
  }
  // Light refresh: only re-render screens that depend on live state.
  _refresh() {
    if (this.current && LIVE_SCREENS.has(this.current.name)) this._render();
  }
}

const LIVE_SCREENS = new Set(["city"]);

// ── Title ────────────────────────────────────────────────────────────────
function titleScreen(root, game, sm) {
  const meta = hasSave() ? saveMeta() : null;
  mount(
    root,
    el("section.screen.title", {}, [
      el("div.title__art", {}, [
        el("div.title__skyline"),
        el("div.title__rain"),
      ]),
      el("div.title__panel", {}, [
        el("h1.title__name", { text: "City of Small Chances" }),
        el("p.title__tag", { text: "Every day matters. Work, rest, connect — and choose what kind of life is worth protecting." }),
        el("div.title__btns", {}, [
          meta
            ? el("button.btn.btn--primary", { onClick: () => { game.resume(); sm.show("city"); } }, [
                `Continue — ${meta.name}, Day ${meta.day}`,
              ])
            : null,
          el("button.btn" + (meta ? "" : ".btn--primary"), { onClick: () => sm.show("create") }, ["New life"]),
          meta
            ? el("button.btn.btn--ghost", {
                onClick: () => {
                  if (confirm("Erase your saved life and start over? This can't be undone.")) {
                    deleteSave();
                    sm.show("title");
                  }
                },
              }, ["Erase save"])
            : null,
        ]),
        el("p.title__foot", { text: "v0.0.1 · Old Harbour arrival arc · keyboard & mouse" }),
      ]),
    ])
  );
}

// ── Character creation ─────────────────────────────────────────────────────
function createScreen(root, game, sm) {
  const choice = { name: "", pronouns: "they/them", background: BACKGROUNDS[0].id, trait: TRAITS[0].id, skill: START_SKILLS[1].id };

  const cardGroup = (items, key, render) =>
    el("div.choices", {}, items.map((it) =>
      el("button.choice", {
        dataset: { sel: choice[key] === it.id ? "1" : "" },
        onClick: (e) => {
          choice[key] = it.id;
          [...e.currentTarget.parentNode.children].forEach((c) => (c.dataset.sel = ""));
          e.currentTarget.dataset.sel = "1";
        },
      }, render(it))
    ));

  mount(
    root,
    el("section.screen.create", {}, [
      el("div.create__inner", {}, [
        el("button.btn.btn--ghost.create__back", { onClick: () => sm.show("title") }, ["← Back"]),
        el("h2", { text: "Who arrives in Haiyun City?" }),

        el("label.field", {}, [
          el("span.field__label", { text: "Name" }),
          el("input.field__input#name-input", { type: "text", placeholder: "A name to be remembered by", maxlength: "24" }),
        ]),
        el("label.field", {}, [
          el("span.field__label", { text: "Pronouns" }),
          el("input.field__input#pronoun-input", { type: "text", value: "they/them", maxlength: "16" }),
        ]),

        el("h3", { text: "What brought you here?" }),
        cardGroup(BACKGROUNDS, "background", (b) => [
          el("div.choice__title", { text: b.name }),
          el("div.choice__blurb", { text: b.blurb }),
          el("div.choice__meta", { text: `Start $${b.startMoney} · owe $${b.obligation}` }),
        ]),

        el("h3", { text: "What kind of person are you?" }),
        cardGroup(TRAITS, "trait", (t) => [
          el("div.choice__title", { text: t.name }),
          el("div.choice__blurb", { text: t.blurb }),
        ]),

        el("h3", { text: "What can you already do?" }),
        cardGroup(START_SKILLS, "skill", (s) => [
          el("div.choice__title", { text: s.name }),
          el("div.choice__blurb", { text: s.blurb }),
        ]),

        el("div.create__go", {}, [
          el("button.btn.btn--primary", {
            onClick: () => {
              const name = (document.getElementById("name-input").value || "").trim() || "Newcomer";
              const pronouns = (document.getElementById("pronoun-input").value || "").trim() || "they/them";
              game.startNew({ ...choice, name, pronouns });
              toast("Your first day begins.", "good");
              sm.show("city");
            },
          }, ["Begin the first day →"]),
        ]),
      ]),
    ])
  );
}

// ── City (main play loop) ──────────────────────────────────────────────────
function cityScreen(root, game, sm) {
  const state = game.store.state;
  const hud = el("div#hud-host");
  const acts = listActivities(state);
  const warnings = conditionWarnings(state);
  const wx = weatherMeta(state.weather);
  const noTime = minutesLeft(state) < 30;

  const actionList = el("div.actions", {}, acts.map(({ def, enabled, reason }) =>
    el("button.action" + (enabled ? "" : ".action--off"), {
      disabled: enabled ? null : true,
      title: enabled ? def.desc : reason,
      onClick: enabled ? () => {
        const res = game.performActivity(def.id);
        if (!res) return;
        if (res.pay) toast(`+$${res.pay} — ${def.name}`, "good");
        if (res.forcedSleep) {
          toast("It's past midnight. You have to sleep.", "warn");
          openReport(sm, game, game.sleep(true));
        }
      } : null,
    }, [
      el("span.action__icon", { text: def.icon }),
      el("div.action__body", {}, [
        el("div.action__name", { text: def.name }),
        el("div.action__desc", { text: enabled ? def.desc : reason }),
      ]),
      el("div.action__cost", {}, [
        el("span.tag", { text: `${def.minutes}m` }),
        def.cost ? el("span.tag.tag--money", { text: `$${def.cost}` }) : null,
      ]),
    ])
  ));

  const lastLog = state.log.slice(-5).reverse();

  mount(
    root,
    el("section.screen.city", {}, [
      hud,
      el("div.city__main", {}, [
        el("div.city__col", {}, [
          el("div.panel", {}, [
            el("div.panel__head", {}, [
              el("h2", { text: "Old Harbour" }),
              el("span.panel__hint", { text: wx.blurb }),
            ]),
            el("p.city__lede", { text: cityLede(state) }),
            warnings.length
              ? el("div.warnbox", {}, warnings.map((w) => el("div.warnbox__line", { text: "⚠ " + w })))
              : null,
            actionList,
          ]),
        ]),
        el("div.city__col.city__col--side", {}, [
          el("div.panel.panel--log", {}, [
            el("div.panel__head", {}, [el("h3", { text: "Today" })]),
            el("div.loglist", {}, lastLog.length
              ? lastLog.map((l) => el("div.loglist__line", { text: l.line }))
              : [el("div.loglist__empty", { text: "The day is yours to shape." })]),
          ]),
          el("div.panel", {}, [
            el("button.btn.btn--primary.btn--block", {
              onClick: () => {
                if (!noTime && !confirm("Sleep now and end the day? You still have time left.")) return;
                openReport(sm, game, game.sleep(false));
              },
            }, [noTime ? "Sleep — end the day" : "Sleep early"]),
            el("button.btn.btn--ghost.btn--block", { onClick: () => sm.show("title") }, ["Save & quit to title"]),
          ]),
        ]),
      ]),
    ])
  );
  renderHud(hud, state);
}

// ── End-of-day report ──────────────────────────────────────────────────────
function reportScreen(root, game, sm, ctx) {
  const r = ctx.report;
  const wx = weatherMeta(r.weather);
  const netTone = r.net > 0 ? "ok" : r.net < 0 ? "bad" : "mid";

  const condRows = Object.entries(r.conditionDelta).map(([k, v]) => {
    const meta = CONDITION_META[k];
    const goodDir = meta.good === "low" ? -1 : 1;
    const tone = v === 0 ? "mid" : v * goodDir > 0 ? "ok" : "bad";
    const sign = v > 0 ? "+" : "";
    return el("div.report__cond", {}, [
      el("span.report__cond-icon", { text: meta.icon }),
      el("span.report__cond-label", { text: meta.label }),
      el(`span.report__cond-val.tone-${tone}`, { text: `${sign}${v}` }),
    ]);
  });

  mount(
    root,
    el("section.screen.report", {}, [
      el("div.report__card", {}, [
        el("div.report__top", {}, [
          el("h2", { text: `Day ${r.endedDay} — End of day` }),
          el("span.report__wx", { text: `${wx.icon} ${wx.label}` }),
        ]),
        el("div.report__money", {}, [
          el("div.report__money-cell", {}, [el("span.k", { text: "Earned" }), el("span.v.tone-ok", { text: `+$${r.earned}` })]),
          el("div.report__money-cell", {}, [el("span.k", { text: "Spent" }), el("span.v.tone-bad", { text: `-$${r.spent}` })]),
          el("div.report__money-cell", {}, [el("span.k", { text: "Net" }), el(`span.v.tone-${netTone}`, { text: `${r.net >= 0 ? "+" : ""}$${r.net}` })]),
          el("div.report__money-cell", {}, [el("span.k", { text: "On hand" }), el("span.v", { text: `$${r.money}` })]),
        ]),
        r.items.length
          ? el("div.report__ledger", {}, r.items.map((it) =>
              el("div.report__ledger-row", {}, [
                el("span", { text: it.label }),
                el(`span.tone-${it.money >= 0 ? "ok" : "bad"}`, { text: `${it.money >= 0 ? "+" : ""}$${it.money}` }),
              ])
            ))
          : el("p.report__none", { text: "No money moved today." }),
        el("h3", { text: "How the day left you" }),
        el("div.report__conds", {}, condRows),
        r.warnings.length
          ? el("div.warnbox", {}, r.warnings.map((w) => el("div.warnbox__line", { text: "⚠ " + w })))
          : null,
        r.tomorrow.length
          ? el("div.report__tomorrow", {}, [
              el("h3", { text: "Before tomorrow" }),
              ...r.tomorrow.map((t) => el("div.report__tomorrow-line", { text: "→ " + t })),
            ])
          : null,
        el("button.btn.btn--primary.btn--block", { onClick: () => sm.show("city") }, [`Begin Day ${r.day} →`]),
      ]),
    ])
  );
}

function openReport(sm, game, report) {
  sm.show("report", { report });
}

// Flavour line that reflects the current state, so the city feels responsive.
function cityLede(state) {
  const c = state.condition;
  if (c.hunger <= 15) return "Your stomach is a fist. Everything smells like food you can't spare time for.";
  if (c.energy <= 15) return "Your legs are heavy. The harbour blurs at the edges.";
  if (c.stress >= 75) return "Your thoughts won't settle. One thing at a time, you tell yourself.";
  if (state.money < 15) return "Your pocket is nearly empty. Today you earn or you go without.";
  if (c.hope >= 70) return "Something in you has steadied. The day feels workable.";
  return "Gulls, diesel, frying oil. The harbour wakes around you, indifferent and full of small chances.";
}

export const SCREENS = {
  title: titleScreen,
  create: createScreen,
  city: cityScreen,
  report: reportScreen,
};
