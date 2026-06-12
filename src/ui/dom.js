// Minimal DOM helpers. No framework — just terse element creation and a couple
// of shared widgets (meter bars, toasts) used across screens.

// el("div.card#id", { onClick }, [children]) — tiny hyperscript.
export function el(spec, props = {}, children = []) {
  const [tagAndId, ...classes] = spec.split(".");
  const [tag, id] = tagAndId.split("#");
  const node = document.createElement(tag || "div");
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(" ");
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "dataset") {
      Object.assign(node.dataset, v);
    } else if (v !== null && v !== undefined && v !== false) {
      node.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(parent, ...nodes) {
  for (const n of nodes) if (n) parent.appendChild(n);
  return parent;
}

// A labelled 0..100 meter. `good` = "high" | "low" decides the colour ramp.
export function meterBar(meta, value) {
  const pct = Math.max(0, Math.min(100, value));
  const display = meta.good === "low" ? 100 - pct : pct;
  let tone = "ok";
  if (display < 20) tone = "bad";
  else if (display < 45) tone = "warn";
  else if (display < 75) tone = "mid";
  return el("div.meter", { title: meta.desc }, [
    el("div.meter__head", {}, [
      el("span.meter__icon", { text: meta.icon }),
      el("span.meter__label", { text: meta.label }),
      el("span.meter__val", { text: String(Math.round(pct)) }),
    ]),
    el("div.meter__track", {}, [
      el(`div.meter__fill.tone-${tone}`, { style: `width:${pct}%` }),
    ]),
  ]);
}

// Transient toast in the bottom-centre.
let toastHost = null;
export function toast(message, kind = "info", ms = 2600) {
  if (!toastHost) {
    toastHost = el("div#toast-host");
    document.body.appendChild(toastHost);
  }
  const t = el(`div.toast.toast--${kind}`, { text: message });
  toastHost.appendChild(t);
  requestAnimationFrame(() => t.classList.add("toast--in"));
  setTimeout(() => {
    t.classList.remove("toast--in");
    setTimeout(() => t.remove(), 300);
  }, ms);
}
