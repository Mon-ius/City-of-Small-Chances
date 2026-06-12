// Screen definitions + a tiny screen manager. Screens are functions that render
// into a host element and wire their own buttons back to the Game and manager.

import { el, clear, mount, toast } from "./dom.js";
import { renderHud } from "./hud.js";
import { CityView } from "./cityview.js";
import { BACKGROUNDS, TRAITS, START_SKILLS, getBackground } from "../data/content.js";
import { getDistrict } from "../data/districts.js";
import { listLocalActivities } from "../systems/activities.js";
import { travel } from "../systems/travel.js";
import { renderMap } from "./map.js";
import { renderJobBoard } from "./jobboard.js";
import { shiftScreen } from "./shift.js";
import { renderPeople } from "./people.js";
import { talkScreen } from "./talk.js";
import { renderProspects, opportunitiesScreen } from "./opportunities.js";
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
    this.cityView = null; // lazily created persistent 3D viewport
    // Re-render the active screen whenever state changes.
    game.store.subscribe(() => this._refresh());
  }
  ensureCityView() {
    if (!this.cityView) this.cityView = new CityView();
    return this.cityView;
  }
  show(name, ctx) {
    this.current = { name, ctx };
    this._render();
  }
  _render() {
    // Pause the 3D loop whenever we leave the city.
    if (this.current.name !== "city" && this.cityView) this.cityView.stop();
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
        el("p.title__foot", { text: "v0.0.7 · The web of small chances · every opportunity, and exactly what it takes" }),
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
  const district = getDistrict(state.location);
  const hud = el("div#hud-host");
  const acts = listLocalActivities(state);
  const warnings = conditionWarnings(state);
  const wx = weatherMeta(state.weather);
  const noTime = minutesLeft(state) < 30;

  // Travel between districts. travel() emits, which re-renders this screen and
  // rebuilds the 3D world for the new place; we only handle the edge cases.
  const onTravel = (toId, mode) => {
    const res = travel(game, toId, mode);
    if (!res) { toast("You can't make that trip right now.", "warn"); return; }
    if (res.forcedSleep) {
      toast("Midnight overtakes you on the way home.", "warn");
      openReport(sm, game, game.sleep(true));
      return;
    }
    toast(`${res.icon} ${res.to.short} — ${res.minutes} min`, "good");
  };

  // Open the in-world shift scene for a job on the local work board.
  const onStartShift = (jobId) => sm.show("shift", { jobId });

  // Step into a conversation with someone present in this district.
  const onTalk = (npcId) => sm.show("talk", { npcId });

  // Open the Opportunity Web — the traceable map of what's within reach.
  const onOpenWeb = () => sm.show("opportunities");

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
  const hintEl = el("div.city3d__hint", {});
  const camBtn = el("button.city3d__cam", {
    type: "button",
    onClick: () => applyCamMode(sm.ensureCityView().toggleMode()),
  }, []);
  const applyCamMode = (m) => {
    camBtn.textContent = m === "follow" ? "◎ Overview" : "🚶 Walk";
    hintEl.textContent = m === "follow"
      ? "WASD / arrows to walk · C for overview"
      : "drag to look · scroll to zoom · C to walk in";
  };
  const view = el("div.city3d#city3d-host", {}, [
    hintEl,
    el("div.city3d__place", { text: `${district.icon} ${district.name}` }),
    camBtn,
  ]);

  mount(
    root,
    el("section.screen.city", {}, [
      hud,
      view,
      el("div.city__main", {}, [
        el("div.city__col", {}, [
          el("div.panel", {}, [
            el("div.panel__head", {}, [
              el("h2", { text: `${district.icon} ${district.name}` }),
              el("span.panel__hint", { text: wx.blurb }),
            ]),
            el("p.city__lede", { text: district.blurb }),
            el("p.city__lede.city__lede--soft", { text: cityLede(state) }),
            warnings.length
              ? el("div.warnbox", {}, warnings.map((w) => el("div.warnbox__line", { text: "⚠ " + w })))
              : null,
            el("h3.city__here", { text: "Here you can" }),
            actionList,
          ]),
          renderJobBoard(state, onStartShift),
        ]),
        el("div.city__col.city__col--side", {}, [
          renderPeople(state, onTalk),
          renderProspects(state, onOpenWeb),
          renderMap(state, onTravel),
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
  // Mount/refresh the persistent 3D harbour viewport and sync its lighting.
  const cv = sm.ensureCityView();
  cv.attach(view, state);
  cv.syncDistrict(district); // rebuild the 3D world when the district changes
  cv.onModeChange = applyCamMode; // keep the button in sync with keyboard toggles
  applyCamMode(cv.mode);
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
  shift: shiftScreen,
  talk: talkScreen,
  opportunities: opportunitiesScreen,
};
