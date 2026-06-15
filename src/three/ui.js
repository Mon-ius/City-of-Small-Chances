// The thin DOM layer for in-world interaction: a context-prompt pill that appears
// when you're near a point of interest, and a small panel that opens when you act.
// Both are created here and appended to the body (kept out of index.html so all the
// interaction concerns live together). Nothing here ever lets the page scroll —
// the prompt is a fixed pill; the panel is a fixed, self-contained card.

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
       <h2 class="panel__title" id="panel-title"></h2>
       <p class="panel__lead"></p>
       <ul class="panel__list"></ul>
       <p class="panel__foot"></p>
     </div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector(".panel__card");
  const titleEl = overlay.querySelector(".panel__title");
  const leadEl = overlay.querySelector(".panel__lead");
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

  return {
    showPrompt(text) { prompt.textContent = text; prompt.hidden = false; },
    hidePrompt() { prompt.hidden = true; },
    openPanel(data) {
      titleEl.textContent = data.title || "";
      card.style.setProperty("--accent", data.accent || "#6fa8ff");
      leadEl.textContent = data.lead || "";
      leadEl.hidden = !data.lead;
      listEl.innerHTML = "";
      for (const line of data.lines || []) {
        const li = document.createElement("li");
        li.textContent = line;
        listEl.appendChild(li);
      }
      footEl.textContent = data.foot || "";
      footEl.hidden = !data.foot;
      overlay.hidden = false;
    },
    closePanel: doClose,
    isOpen() { return !overlay.hidden; },
    promptText() { return prompt.hidden ? "" : prompt.textContent; },
    panelTitle() { return overlay.hidden ? "" : titleEl.textContent; },
    onClose(cb) { closeCb = cb; },
  };
}
