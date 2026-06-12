// Top HUD: date/time/weather, cash & obligation, and the condition meters.
// Always readable, never decorative (book §20). Re-rendered on every emit().

import { el, clear, meterBar } from "./dom.js";
import { CONDITION_META, CONDITION_KEYS } from "../core/state.js";
import { fmtClock, blockFor, weekdayFor, minutesLeft } from "../core/time.js";
import { weatherMeta } from "../systems/weather.js";

export function renderHud(host, state) {
  clear(host);
  const block = blockFor(state.clock);
  const wx = weatherMeta(state.weather);
  const left = minutesLeft(state);
  const leftH = Math.floor(left / 60);
  const leftM = left % 60;

  const daysToDue = state.obligation.dueDay - state.day;
  const dueTone = daysToDue <= 5 ? "bad" : daysToDue <= 12 ? "warn" : "ok";

  host.appendChild(
    el("div.hud", {}, [
      // Left: calendar + clock
      el("div.hud__cell", {}, [
        el("div.hud__big", { text: `Day ${state.day}` }),
        el("div.hud__sub", { text: `${weekdayFor(state.day)} · ${block.label}` }),
      ]),
      el("div.hud__cell", {}, [
        el("div.hud__big", { text: fmtClock(state.clock) }),
        el("div.hud__sub", { text: `${leftH}h ${leftM}m left` }),
      ]),
      el("div.hud__cell.hud__weather", { title: wx.blurb }, [
        el("div.hud__big", { text: wx.icon }),
        el("div.hud__sub", { text: wx.label }),
      ]),
      // Money + obligation
      el("div.hud__cell.hud__money", {}, [
        el("div.hud__big", { text: `$${state.money}` }),
        el(`div.hud__sub.tone-${dueTone}`, {
          text: state.obligation.remaining > 0 ? `owe $${state.obligation.remaining} · ${daysToDue}d` : "obligation cleared",
        }),
      ]),
      // Condition meters
      el("div.hud__meters", {}, CONDITION_KEYS.map((k) => meterBar(CONDITION_META[k], state.condition[k]))),
    ])
  );
}
