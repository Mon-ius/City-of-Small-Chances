// Bootstrap. Build the Game, mount the screen manager, show the title.

import { Game } from "./game.js";
import { ScreenManager } from "./ui/screens.js";
import { loadSettings } from "./core/save.js";

function boot() {
  const root = document.getElementById("app");
  if (!root) return;

  const game = new Game();
  window.__cosc = game; // handy for debugging in the console

  // Apply any persisted display settings (text scale) early.
  const settings = loadSettings();
  if (settings.textScale) document.documentElement.style.setProperty("--text-scale", settings.textScale);

  const sm = new ScreenManager(root, game);

  // Debug hooks (used by smoke tests / manual inspection): #debug-city spins up
  // a quick game and drops you into the city; #debug-report shows a day report.
  const hash = location.hash;
  if (hash.startsWith("#debug-city")) {
    // #debug-city  or  #debug-city:<minute>:<weather>  for lighting checks
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    const parts = hash.split(":");
    if (parts[1]) game.store.state.clock = parseInt(parts[1], 10) || game.store.state.clock;
    if (parts[2]) game.store.state.weather = parts[2];
    game.store.state.location = parts[3] || "old_harbour";
    sm.show("city");
  } else if (hash.startsWith("#debug-walk")) {
    // #debug-walk[:<minute>[:<weather>]] — follow camera + mid-stride avatar
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    const parts = hash.split(":");
    if (parts[1]) game.store.state.clock = parseInt(parts[1], 10) || game.store.state.clock;
    if (parts[2]) game.store.state.weather = parts[2];
    game.store.state.location = parts[3] || "old_harbour";
    sm.show("city");
    const r = sm.cityView?.renderer;
    if (r) { r.setMode("follow"); r.player.pos = [3, 2]; r.player.facing = 0.7; r.player.walkPhase = 1.2; r.player.amp = 0.7; }
  } else if (hash.startsWith("#debug-figure")) {
    // #debug-figure — deterministic close orbit on the avatar + nearby crowd
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    const parts = hash.split(":");
    if (parts[1]) game.store.state.clock = parseInt(parts[1], 10) || game.store.state.clock;
    if (parts[2]) game.store.state.weather = parts[2];
    game.store.state.location = parts[3] || "old_harbour";
    sm.show("city");
    const r = sm.cityView?.renderer;
    if (r) {
      r.player.pos = [0, 0]; r.player.facing = 0; r.player.walkPhase = 1.2; r.player.amp = 0.7;
      r.cam.autoSpin = 0; r.cam.target = [0, 3, 0]; r.cam.dist = 16; r.cam.elevation = 0.14; r.cam.azimuth = 0.05;
    }
  } else if (hash.startsWith("#debug-shift")) {
    // #debug-shift[:<jobId>] — jump straight into a shift scene for a job.
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    const parts = hash.split(":");
    const jobId = parts[1] || "market_haul";
    // Place the player where/when the job is open so it resolves as available.
    const where = { market_haul: ["market_row", 600], harbour_labour: ["old_harbour", 540], dock_load: ["dockside", 540], courier_run: ["market_row", 720], civic_filing: ["uptown", 600] }[jobId] || ["market_row", 600];
    game.store.state.location = where[0];
    game.store.state.clock = where[1];
    if (jobId === "courier_run") game.store.state.inventory.bicycle = true;
    if (jobId === "civic_filing") game.store.state.skills.focus = 14;
    // :auto pre-masters the job so the auto-resolve button (and result screen) show.
    if (parts[2] === "auto") game.store.state.jobs.mastery[jobId] = { xp: 200, shifts: 12, best: 88 };
    sm.show("shift", { jobId });
    // #debug-shift:<job>:play starts the rhythm game; :auto resolves instantly.
    if (parts[2] === "play") setTimeout(() => document.querySelector(".shift__controls .btn--primary")?.click(), 60);
    if (parts[2] === "auto") setTimeout(() => document.querySelector(".shift__controls .btn:not(.btn--primary):not(.btn--ghost)")?.click(), 60);
  } else if (hash === "#debug-report") {
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    game.performActivity("day_labour");
    game.performActivity("eat_out");
    sm.show("report", { report: game.sleep(false) });
  } else {
    sm.show("title");
  }

  // Global keyboard: Esc returns to title from play.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sm.current?.name === "city") sm.show("title");
  });

  // Fade out then fully remove the boot splash so it can never linger over the UI.
  document.body.classList.add("ready");
  const bootEl = document.getElementById("boot");
  if (bootEl) setTimeout(() => bootEl.remove(), 550);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
