// Save / load to localStorage. The book asks for autosave at day start and
// sleep, integrity validation, and versioned migration. We implement a small,
// honest version of that for the web build.

import { SAVE_VERSION } from "./state.js";
import { HOME_DISTRICT } from "../data/districts.js";

const KEY = "cosc.save.v1";
const SETTINGS_KEY = "cosc.settings.v1";

export function hasSave() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function saveGame(state) {
  try {
    const payload = JSON.stringify({ v: SAVE_VERSION, savedAt: isoNow(), state });
    localStorage.setItem(KEY, payload);
    return true;
  } catch (e) {
    console.warn("Save failed:", e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.state) return null;
    return migrate(parsed.state, parsed.v || 0);
  } catch (e) {
    console.warn("Load failed:", e);
    return null;
  }
}

export function deleteSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function saveMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { savedAt: parsed.savedAt, day: parsed.state?.day, name: parsed.state?.profile?.name };
  } catch {
    return null;
  }
}

// Settings persist separately so they survive a deleted save.
export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

// Forward-migrate older saves. Currently a no-op stub; each future schema bump
// adds a step here.
function migrate(state, fromVersion) {
  let s = state;
  // v2 — the map & districts milestone: pre-map saves had no location; they all
  // began in the Old Harbour arc, so land them at home with a clean trip count.
  if (fromVersion < 2) {
    if (!s.location) s.location = HOME_DISTRICT;
    if (s.stats && typeof s.stats.tripsMade !== "number") s.stats.tripsMade = 0;
  }
  // v3 — jobs & work mastery: older saves had no per-job mastery store.
  if (fromVersion < 3) {
    if (!s.jobs || typeof s.jobs !== "object") s.jobs = { mastery: {} };
    if (!s.jobs.mastery) s.jobs.mastery = {};
    if (s.stats && typeof s.stats.injuries !== "number") s.stats.injuries = 0;
  }
  s.version = SAVE_VERSION;
  return s;
}

function isoNow() {
  // Date is allowed in the browser; only the workflow sandbox forbids it.
  return new Date().toISOString();
}
