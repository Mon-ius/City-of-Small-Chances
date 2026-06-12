// The city map (book §6). A stylised node graph of Haiyun City's districts with
// the player's location marked, plus a travel list giving each reachable place's
// time and fare per mode. Travel is the whole point of the screen — every row is
// an actionable Walk / Cycle / Tram choice with its real cost shown up front.

import { el } from "./dom.js";
import { DISTRICTS, getDistrict } from "../data/districts.js";
import { ACTIVITIES } from "../data/content.js";
import { travelModes } from "../systems/travel.js";

const SVGNS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}, children = []) {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "onClick") n.addEventListener("click", v);
    else n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c != null) n.appendChild(c);
  return n;
}

// Faint road network connecting the districts (purely illustrative).
const EDGES = [
  ["tenements", "market_row"], ["market_row", "old_harbour"],
  ["old_harbour", "dockside"], ["market_row", "uptown"],
  ["tenements", "uptown"], ["market_row", "dockside"],
];

function activityNames(ids) {
  return ids
    .map((id) => ACTIVITIES.find((a) => a.id === id)?.name)
    .filter(Boolean);
}

// Build the map panel. `onTravel(toId, mode)` runs a trip.
export function renderMap(state, onTravel) {
  const here = getDistrict(state.location);

  const edges = EDGES.map(([a, b]) => {
    const A = getDistrict(a), B = getDistrict(b);
    const live = a === here.id || b === here.id;
    return s("line", {
      x1: A.x, y1: A.y, x2: B.x, y2: B.y,
      class: "map__edge" + (live ? " map__edge--live" : ""),
    });
  });

  const nodes = DISTRICTS.map((d) => {
    const isHere = d.id === here.id;
    const onClick = isHere ? null : () => onTravel(d.id, defaultMode(state));
    return s("g", { class: "map__node" + (isHere ? " map__node--here" : ""), onClick, role: onClick ? "button" : null }, [
      s("circle", { cx: d.x, cy: d.y, r: isHere ? 4.4 : 3.4, class: "map__dot" }),
      s("text", { x: d.x, y: d.y - 6, class: "map__label", "text-anchor": "middle" }, [document.createTextNode(d.short)]),
    ]);
  });

  const svg = s("svg", { viewBox: "0 4 100 64", class: "map__svg", preserveAspectRatio: "xMidYMid meet" }, [
    s("rect", { x: 0, y: 0, width: 100, height: 70, class: "map__bg" }),
    ...edges, ...nodes,
  ]);

  // Travel list: every other district, with its modes.
  const rows = DISTRICTS.filter((d) => d.id !== here.id).map((d) => {
    const modes = travelModes(state, d.id);
    const chips = modes.map((m) => {
      const ok = m.enoughTime && m.affordable;
      const why = !m.enoughTime ? "Not enough time left today" : !m.affordable ? `Costs $${m.fare}` : `${m.label} — ${m.minutes} min${m.fare ? `, $${m.fare}` : ", free"}`;
      return el("button.map__go" + (ok ? "" : ".map__go--off"), {
        disabled: ok ? null : true, title: why,
        onClick: ok ? () => onTravel(d.id, m.mode) : null,
      }, [`${m.icon} ${m.minutes}m${m.fare ? ` · $${m.fare}` : ""}`]);
    });
    return el("div.map__row", {}, [
      el("div.map__rowhead", {}, [
        el("span.map__rowicon", { text: d.icon }),
        el("div.map__rowtext", {}, [
          el("div.map__rowname", { text: d.name }),
          el("div.map__rowacts", { text: activityNames(d.activities).join(" · ") }),
        ]),
      ]),
      el("div.map__chips", {}, chips),
    ]);
  });

  return el("div.panel.map", {}, [
    el("div.panel__head", {}, [
      el("h3", { text: "Haiyun City" }),
      el("span.panel__hint", { text: `You're in ${here.name}` }),
    ]),
    svg,
    el("div.map__list", {}, rows),
  ]);
}

// Ground mode the map's node-tap uses: cycling if you own a bike, else walking.
function defaultMode(state) {
  return state.inventory.bicycle ? "cycle" : "walk";
}
