// The thin DOM layer for in-world interaction: a context-prompt pill that appears
// when you're near a point of interest, a small panel that opens when you act, and
// a corner stats readout (money + energy). Everything is created here and appended
// to the body (kept out of index.html so all the interaction concerns live
// together). Nothing here ever lets the page scroll — the prompt is a fixed pill,
// the panel is a fixed self-contained card, the stats are a fixed cluster.

export function createInteractionUI() {
  const prompt = document.createElement("div");
  prompt.id = "hud-prompt";
  prompt.className = "hud-prompt";
  prompt.hidden = true;
  document.body.appendChild(prompt);

  const overlay = document.createElement("div");
  overlay.id = "hud-panel";
  overlay.className = "hud-panel";
  overlay.hidden = true;
  overlay.innerHTML =
    `<div class="panel__card" role="dialog" aria-modal="true" aria-labelledby="panel-title">
       <button class="panel__close" type="button" aria-label="Close">×</button>
       <div class="panel__scroll">
         <h2 class="panel__title" id="panel-title"></h2>
         <p class="panel__lead"></p>
         <div class="panel__banner" hidden></div>
         <ul class="panel__list"></ul>
         <p class="panel__foot"></p>
       </div>
     </div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector(".panel__card");
  const titleEl = overlay.querySelector(".panel__title");
  const leadEl = overlay.querySelector(".panel__lead");
  const bannerEl = overlay.querySelector(".panel__banner");
  const listEl = overlay.querySelector(".panel__list");
  const footEl = overlay.querySelector(".panel__foot");
  const closeBtn = overlay.querySelector(".panel__close");

  let closeCb = null;
  const doClose = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    if (closeCb) closeCb();
  };
  closeBtn.addEventListener("click", doClose);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) doClose(); }); // backdrop

  // Render one actionable row: a button when the shift is open, a dimmed row when not.
  function renderItem(item, onItem) {
    const li = document.createElement("li");
    if (item.state === "open" && onItem) {
      li.className = "panel__actrow";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "panel__act";
      btn.innerHTML =
        `<span class="panel__act-key"></span>
         <span class="panel__act-text"><span class="panel__act-label"></span><span class="panel__act-sub"></span></span>`;
      const keyEl = btn.querySelector(".panel__act-key");
      if (item.key != null) keyEl.textContent = item.key; else keyEl.hidden = true;
      btn.querySelector(".panel__act-label").textContent = item.label || "";
      btn.querySelector(".panel__act-sub").textContent = item.sub || "";
      btn.addEventListener("click", (e) => { e.stopPropagation(); onItem(item.key != null ? item.key - 1 : 0); });
      li.appendChild(btn);
    } else {
      li.className = "panel__row is-locked";
      li.innerHTML =
        `<span class="panel__row-label"></span><span class="panel__row-sub"></span><span class="panel__row-note"></span>`;
      li.querySelector(".panel__row-label").textContent = item.label || "";
      li.querySelector(".panel__row-sub").textContent = item.sub || "";
      const noteEl = li.querySelector(".panel__row-note");
      noteEl.textContent = item.note || "";
      noteEl.hidden = !item.note;
    }
    return li;
  }

  return {
    showPrompt(text) { prompt.textContent = text; prompt.hidden = false; },
    hidePrompt() { prompt.hidden = true; },
    // data: { title, accent, lead, banner, foot, lines?: string[], items?: object[] }
    // onItem(index): called when an open item button is clicked (index is 0-based).
    openPanel(data, onItem) {
      titleEl.textContent = data.title || "";
      card.style.setProperty("--accent", data.accent || "#6fa8ff");
      leadEl.textContent = data.lead || "";
      leadEl.hidden = !data.lead;
      bannerEl.textContent = data.banner || "";
      bannerEl.hidden = !data.banner;
      listEl.innerHTML = "";
      if (data.items) {
        for (const item of data.items) listEl.appendChild(renderItem(item, onItem));
      } else {
        for (const line of data.lines || []) {
          const li = document.createElement("li");
          li.textContent = line;
          listEl.appendChild(li);
        }
      }
      footEl.textContent = data.foot || "";
      footEl.hidden = !data.foot;
      overlay.hidden = false;
    },
    closePanel: doClose,
    isOpen() { return !overlay.hidden; },
    promptText() { return prompt.hidden ? "" : prompt.textContent; },
    panelTitle() { return overlay.hidden ? "" : titleEl.textContent; },
    bannerText() { return bannerEl.hidden ? "" : bannerEl.textContent; },
    onClose(cb) { closeCb = cb; },
  };
}

// The corner readout: money in hand and an energy bar. Updated whenever they change.
export function createStatsHUD() {
  const wrap = document.createElement("div");
  wrap.id = "hud-stats";
  wrap.className = "hud-stats";
  wrap.innerHTML =
    `<div class="hud-stat hud-stat--money"><span class="hud-stat__icon">💴</span><span class="hud-stat__money">$0</span></div>
     <div class="hud-stat hud-stat--energy"><span class="hud-stat__icon">⚡</span><span class="hud-stat__bar"><span class="hud-stat__fill"></span></span></div>`;
  document.body.appendChild(wrap);
  const moneyEl = wrap.querySelector(".hud-stat__money");
  const fillEl = wrap.querySelector(".hud-stat__fill");
  return {
    set(money, energy) {
      moneyEl.textContent = `$${Math.round(money)}`;
      const e = Math.max(0, Math.min(100, energy));
      fillEl.style.width = `${e}%`;
      fillEl.style.background = `hsl(${Math.round((e / 100) * 120)} 70% 48%)`; // green→red as it drains
    },
    moneyText() { return moneyEl.textContent; },
    energyPct() { return parseFloat(fillEl.style.width) || 0; },
  };
}
