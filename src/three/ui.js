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
         <div class="panel__head">
           <img class="panel__portrait" alt="" hidden>
           <div class="panel__headtext">
             <h2 class="panel__title" id="panel-title"></h2>
             <p class="panel__lead"></p>
           </div>
         </div>
         <div class="panel__banner" hidden></div>
         <ul class="panel__list"></ul>
         <p class="panel__foot"></p>
       </div>
     </div>`;
  document.body.appendChild(overlay);

  const card = overlay.querySelector(".panel__card");
  const portraitEl = overlay.querySelector(".panel__portrait");
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
    // An optional painted emblem (e.g. a job icon) sits at the leading edge of the row.
    const iconImg = item.iconImg
      ? `<img class="panel__item-icon" src="${item.iconImg}" alt="" draggable="false">`
      : "";
    if (item.state === "open" && onItem) {
      li.className = "panel__actrow";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "panel__act";
      btn.innerHTML =
        `<span class="panel__act-key"></span>
         ${iconImg}
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
        `${iconImg}
         <span class="panel__row-text"><span class="panel__row-label"></span><span class="panel__row-sub"></span><span class="panel__row-note"></span></span>`;
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
      if (data.portrait) {
        portraitEl.src = data.portrait;
        portraitEl.alt = data.portraitAlt || "";
        portraitEl.hidden = false;
      } else {
        portraitEl.hidden = true;
        portraitEl.removeAttribute("src");
      }
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
    `<div class="hud-stat hud-stat--money"><img class="hud-stat__icon hud-stat__img" src="./assets/ui/icons/UI_Icon_Money.png" alt="Money" draggable="false"><span class="hud-stat__money">$0</span></div>
     <div class="hud-stat hud-stat--energy"><img class="hud-stat__icon hud-stat__img" src="./assets/ui/icons/UI_Icon_Energy.png" alt="Energy" draggable="false"><span class="hud-stat__bar"><span class="hud-stat__fill"></span></span><img class="hud-stat__status" alt="" draggable="false" hidden></div>
     <button class="hud-stat hud-stat--mute" type="button" aria-label="Toggle sound" title="Sound (M)"><span class="hud-stat__icon hud-stat__mute-icon">🔊</span></button>`;
  document.body.appendChild(wrap);
  const moneyEl = wrap.querySelector(".hud-stat__money");
  const fillEl = wrap.querySelector(".hud-stat__fill");
  const muteBtn = wrap.querySelector(".hud-stat--mute");
  const muteIcon = wrap.querySelector(".hud-stat__mute-icon");
  const statusEl = wrap.querySelector(".hud-stat__status");

  // Screen-state condition FX (Batch 14, fx-006): full-screen vignette cards that
  // fade in over the world as the body fails — a wordless, colour-redundant channel
  // paired with the energy meter (the accessibility rule: never colour alone). The
  // PNGs carry their own capped alpha (clear centre → tinted edge); we only animate
  // each layer's opacity. LowEnergy + Burnout are driven live from energy here;
  // ColdWet is dormant until a weather/wet state lands in the three slice (setColdWet).
  const fx = document.createElement("div");
  fx.id = "hud-condition";
  fx.className = "hud-condition";
  fx.setAttribute("aria-hidden", "true");
  fx.innerHTML =
    `<div class="cond-layer cond-layer--lowenergy"></div>
     <div class="cond-layer cond-layer--burnout"></div>
     <div class="cond-layer cond-layer--coldwet"></div>`;
  document.body.appendChild(fx);
  const lowEl = fx.querySelector(".cond-layer--lowenergy");
  const burnEl = fx.querySelector(".cond-layer--burnout");
  const coldEl = fx.querySelector(".cond-layer--coldwet");
  // v at/above `lo` → 0, at/below `hi` → 1, linear between (hi < lo).
  const ramp = (v, lo, hi) => Math.max(0, Math.min(1, (lo - v) / (lo - hi)));
  let lowOp = 0, burnOp = 0, coldOp = 0;
  // Cold/wet edge vignette (0..1). Driven by weather today (rain → chill); the
  // public setColdWet method and setWeather both route through here.
  const applyColdWet = (t) => {
    coldOp = Math.max(0, Math.min(1, t || 0));
    coldEl.style.opacity = coldOp.toFixed(3);
  };
  const paintCondition = (energy) => {
    const e = Math.max(0, Math.min(100, energy));
    lowOp = ramp(e, 45, 12);   // fatigue creeps in below 45, full by 12
    burnOp = ramp(e, 22, 0);   // burnout compounds below 22, full at empty
    lowEl.style.opacity = lowOp.toFixed(3);
    burnEl.style.opacity = burnOp.toFixed(3);
  };

  // Condition-STATE badge (Batch 27, ui-003): a discrete painted glyph beside the
  // energy meter that names the body's *state* in words+shape, not just the bar's
  // colour — the same accessibility rule as the vignette (never hue alone). It snaps
  // between two energy-driven states and is hidden in the comfortable middle:
  //   < 22 energy → Burnout (snuffed-candle glyph, matching the burnout vignette)
  //   ≥ 82 energy → Well rested (crescent-moon glyph)
  // The Illness/Injury glyphs in the same set ship ready for a future health state.
  const STATE_ICON = {
    burnout: { src: "./assets/ui/icons/UI_Icon_State_Burnout.png", label: "Burnt out" },
    rested:  { src: "./assets/ui/icons/UI_Icon_State_WellRested.png", label: "Well rested" },
  };
  let statusKey = "";
  const paintStatus = (energy) => {
    const e = Math.max(0, Math.min(100, energy));
    const key = e < 22 ? "burnout" : e >= 82 ? "rested" : "";
    if (key === statusKey) return; // only touch the DOM when the state actually flips
    statusKey = key;
    if (key) {
      const s = STATE_ICON[key];
      statusEl.src = s.src;
      statusEl.alt = s.label;
      statusEl.title = s.label;
      statusEl.hidden = false;
    } else {
      statusEl.hidden = true;
      statusEl.removeAttribute("title");
      statusEl.alt = "";
    }
  };

  // Day-transition veils (Batch 19, fx-005): full-screen opaque cards that play as
  // the living clock rolls past midnight and a new day breaks — the night draws the
  // screen down, time drifts, and the world re-emerges through a warm dawn wash. The
  // veil snaps on at the rollover frame to mask the world's deep-night→dawn relight
  // pop, then clears. Reduced-motion gets a faint golden nod, no dark flash. JS
  // animates each layer's opacity inline (snap vs ease) — main.js only calls
  // playDayTransition() when the day counter ticks over; no other wiring.
  const trans = document.createElement("div");
  trans.id = "hud-transition";
  trans.className = "hud-transition";
  trans.setAttribute("aria-hidden", "true");
  trans.innerHTML =
    `<div class="trans-layer trans-layer--night"></div>
     <div class="trans-layer trans-layer--grain"></div>
     <div class="trans-layer trans-layer--dawn"></div>`;
  document.body.appendChild(trans);
  const nightEl = trans.querySelector(".trans-layer--night");
  const grainEl = trans.querySelector(".trans-layer--grain");
  const dawnEl = trans.querySelector(".trans-layer--dawn");
  const setOp = (el, op, dur) => {
    el.style.transition = dur > 0 ? `opacity ${dur}s ease` : "none";
    el.style.opacity = op.toFixed(3);
  };
  let transGen = 0; // a generation token so a new play cancels any stale timers
  const playDayTransition = () => {
    const gen = ++transGen;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // A soft golden nod to the new day — no dark cover, no flash.
      setOp(dawnEl, 0.22, 0);
      setTimeout(() => { if (gen === transGen) setOp(dawnEl, 0, 0.9); }, 60);
      return;
    }
    // 1) Snap the night cover on (masks the world's single-frame relight pop).
    setOp(nightEl, 0.95, 0);
    setOp(grainEl, 0.28, 0);
    setOp(dawnEl, 0, 0);
    void nightEl.offsetWidth; // force the snap to apply before we animate
    // 2) Hold a beat, then reveal: night recedes, dawn blooms in then clears.
    setTimeout(() => {
      if (gen !== transGen) return;
      setOp(nightEl, 0, 1.5);
      setOp(grainEl, 0, 1.2);
      setOp(dawnEl, 0.6, 0.9);
      setTimeout(() => { if (gen === transGen) setOp(dawnEl, 0, 1.6); }, 950);
    }, 240);
  };

  // Weather FX (Batch 21, fx-002): the rain and mist that move over the harbour on
  // a grey, wet day. Three full-screen cards — a tiled, CSS-scrolled rain layer for
  // the fall, plus a fog veil and a wispier mist veil that drift slowly. Each card
  // carries its own capped alpha; we only animate each layer's opacity here from a
  // day's weather (main.js#weatherFor). Rain also feeds the dormant cold/wet
  // condition vignette — being out in the rain reads as a faint chill at the edges.
  const wx = document.createElement("div");
  wx.id = "hud-weather";
  wx.className = "hud-weather";
  wx.setAttribute("aria-hidden", "true");
  wx.innerHTML =
    `<div class="weather-layer weather-layer--fog"></div>
     <div class="weather-layer weather-layer--mist"></div>
     <div class="weather-layer weather-layer--rain"></div>`;
  document.body.appendChild(wx);
  const fogEl = wx.querySelector(".weather-layer--fog");
  const mistEl = wx.querySelector(".weather-layer--mist");
  const rainEl = wx.querySelector(".weather-layer--rain");
  let rainOp = 0, fogOp = 0, mistOp = 0;
  // rain, fog: 0..1 day intensities. Rain drives the rain layer + a thinner mist
  // companion; fog drives the fog veil (and lifts the mist a touch). The cold/wet
  // edge vignette tracks the rain so a downpour feels chilly without a new asset.
  const setWeather = (rain, fog) => {
    const r = Math.max(0, Math.min(1, rain || 0));
    const f = Math.max(0, Math.min(1, fog || 0));
    rainOp = r;
    fogOp = f;
    mistOp = Math.max(0, Math.min(1, r * 0.6 + f * 0.25));
    rainEl.style.opacity = rainOp.toFixed(3);
    fogEl.style.opacity = fogOp.toFixed(3);
    mistEl.style.opacity = mistOp.toFixed(3);
    applyColdWet(r * 0.5); // out in the rain → a faint cold-wet chill at the edges
  };

  // Shift montage (Batch 29, fx-007): a brief full-screen painted beat that plays
  // when a shift is worked off the notice board — the hours of labour you'd otherwise
  // skip in a silent clock-jump given a moment's weight. One painted scene per job
  // family; the card fades up over everything (z 40, above the panel), holds on the
  // work, then clears to reveal the updated panel + the jumped clock. JS animates the
  // opacity inline (like the day-transition veil); a generation token cancels stale
  // timers if shifts are worked back-to-back; reduced-motion gets a quick soft dim.
  const shift = document.createElement("div");
  shift.id = "hud-shift";
  shift.className = "hud-shift";
  shift.setAttribute("aria-hidden", "true");
  shift.innerHTML = `<img class="shift-art" alt="" draggable="false"><div class="shift-vignette"></div>`;
  document.body.appendChild(shift);
  const shiftArt = shift.querySelector(".shift-art");
  const SHIFT_SCENE = {
    labour:   "./assets/ui/shifts/SHIFT_Labour.png",
    delivery: "./assets/ui/shifts/SHIFT_Delivery.png",
    admin:    "./assets/ui/shifts/SHIFT_Admin.png",
    service:  "./assets/ui/shifts/SHIFT_Service.png",
  };
  let shiftGen = 0, shiftKey = "";
  const fadeShift = (op, dur) => {
    shift.style.transition = dur > 0 ? `opacity ${dur}s ease` : "none";
    shift.style.opacity = op.toFixed(3);
  };
  const playShiftScene = (family) => {
    const src = SHIFT_SCENE[family];
    if (!src) return; // only a worked shift carries a job family
    const gen = ++shiftGen;
    shiftKey = family;
    shiftArt.src = src;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // A brief soft dim of the scene — no long hold, no harsh flash.
      fadeShift(0.5, 0.25);
      setTimeout(() => { if (gen === shiftGen) fadeShift(0, 0.5); }, 420);
      return;
    }
    // Fade the work scene up, hold a beat, then clear to the result.
    fadeShift(0, 0);
    void shift.offsetWidth; // apply the reset before animating the fade-in
    fadeShift(0.96, 0.28);
    setTimeout(() => { if (gen === shiftGen) fadeShift(0, 0.7); }, 1050);
  };

  // The mute button must catch clicks even though the HUD layer ignores them.
  // It keeps the shared .hud-stat painted-plate look (Batch 8); we only re-enable
  // pointer events and inherit the HUD's text colour/font for the emoji glyph.
  Object.assign(muteBtn.style, {
    pointerEvents: "auto", cursor: "pointer", color: "inherit", font: "inherit",
  });
  return {
    set(money, energy) {
      moneyEl.textContent = `$${Math.round(money)}`;
      const e = Math.max(0, Math.min(100, energy));
      fillEl.style.width = `${e}%`;
      fillEl.style.background = `hsl(${Math.round((e / 100) * 120)} 70% 48%)`; // green→red as it drains
      paintCondition(e); // deepen the condition vignette in step with the meter
      paintStatus(e);    // flip the discrete burnout / well-rested badge
    },
    // Cold/wet exposure overlay (0..1). Now driven live by weather via setWeather,
    // but still callable directly for any future wet/exposure state.
    setColdWet(t) { applyColdWet(t); },
    // Set the day's weather: rain & fog intensities (0..1) → the rain/fog/mist
    // overlay layers (+ the cold/wet edge chill). Called from main.js per day.
    setWeather,
    weatherFx() { return { rain: rainOp, fog: fogOp, mist: mistOp }; },
    setMuted(m) { muteIcon.textContent = m ? "🔇" : "🔊"; },
    onMuteToggle(cb) { muteBtn.addEventListener("click", cb); },
    moneyText() { return moneyEl.textContent; },
    energyPct() { return parseFloat(fillEl.style.width) || 0; },
    conditionFx() { return { low: lowOp, burnout: burnOp, coldwet: coldOp }; },
    // The current discrete condition-state badge key ("burnout" | "rested" | "").
    statusState() { return statusKey; },
    // Play the day-rollover veil (called from main.js when the day counter ticks up).
    playDayTransition,
    // Play the brief shift-work montage for a job family (called from main.js when a
    // shift is worked off the notice board). Unknown families are a no-op.
    playShiftScene,
    shiftFx() { return { opacity: parseFloat(shift.style.opacity) || 0, key: shiftKey, src: shiftArt.getAttribute("src") || "" }; },
    transitionFx() {
      return {
        night: parseFloat(nightEl.style.opacity) || 0,
        dawn: parseFloat(dawnEl.style.opacity) || 0,
        grain: parseFloat(grainEl.style.opacity) || 0,
      };
    },
  };
}
