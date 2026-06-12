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
  if (hash === "#debug-city") {
    game.startNew({ name: "Tester", pronouns: "they/them", background: "debt", trait: "persistent", skill: "logistics" });
    sm.show("city");
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
