// Jobs (book §9 "Work, Jobs and Career Progression"). A job is a richer thing
// than a one-click activity: it has entry requirements, time windows, a pay model
// that rewards performance, and a mastery curve. Declarative content — the live
// notice board (src/three/interactions.js) reads these to score and run a shift.
//
// Field guide
//   family       book job taxonomy (flavour + colour theme)
//   district     where the work is (you must be standing there, in a time window)
//   windows      [[fromMin,toMin], ...] minutes-of-day the shift is offered
//   minutes      how long the shift takes on the clock
//   requires     gate fn(state) + requiresNote
//   primary      skills that drive pay quality and that the shift grows
//   pay          { base, skillDiv, weather } — interpreted by playerstate.work()
//   task         shift tuning: beats, tempo, band, verb/unit/theme
//   risk         { atEnergy, chance, healthHit } — injury when tired & sloppy
//   mastery      xp thresholds (reserved for future mastery scaling)

export const JOB_FAMILIES = {
  labour: { label: "Day labour", color: "#c9803f" },
  delivery: { label: "Delivery", color: "#3f96c9" },
  admin: { label: "Care / admin", color: "#8a7fd6" },
  service: { label: "Service", color: "#56b89a" },
};

export const JOBS = [
  {
    id: "market_haul",
    name: "Market haulage",
    family: "labour",
    icon: "📦",
    district: "market_row",
    blurb: "Shift crates and sacks for the stalls before the lunch rush. Find the rhythm and the morning flies.",
    windows: [[6 * 60, 16 * 60]],
    minutes: 150,
    requires: (s) => s.condition.energy >= 15,
    requiresNote: "You need at least 15 energy to keep up with the haulers.",
    primary: ["logistics", "maintenance"],
    pay: { base: 38, skillDiv: 6, weather: "physical" },
    task: { beats: 7, tempo: 1500, band: 0.20, verb: "Load", unit: "crate" },
    risk: { atEnergy: 25, chance: 0.18, healthHit: [4, 9] },
    mastery: { previewAt: 2, autoAt: 4 },
  },
  {
    id: "harbour_labour",
    name: "Harbour day labour",
    family: "labour",
    icon: "⚓",
    district: "old_harbour",
    blurb: "Honest waterfront work — netting, barrels, the morning catch. Your back remembers it tomorrow.",
    windows: [[6 * 60, 15 * 60]],
    minutes: 180,
    requires: (s) => s.condition.energy >= 20,
    requiresNote: "A harbour shift needs at least 20 energy.",
    primary: ["logistics", "maintenance"],
    pay: { base: 46, skillDiv: 5, weather: "physical" },
    task: { beats: 8, tempo: 1400, band: 0.18, verb: "Heave", unit: "barrel" },
    risk: { atEnergy: 28, chance: 0.22, healthHit: [5, 10] },
    mastery: { previewAt: 2, autoAt: 4 },
  },
  {
    id: "dock_load",
    name: "Dockside container loading",
    family: "labour",
    icon: "🏗️",
    district: "dockside",
    blurb: "The best pay on the waterfront, and the hardest. The forklifts never stop and neither can you.",
    windows: [[6 * 60, 14 * 60]],
    minutes: 210,
    requires: (s) => s.condition.energy >= 30,
    requiresNote: "The yard won't take you below 30 energy — too dangerous.",
    primary: ["logistics", "maintenance"],
    pay: { base: 66, skillDiv: 4, weather: "physical" },
    task: { beats: 9, tempo: 1250, band: 0.16, verb: "Stack", unit: "container" },
    risk: { atEnergy: 35, chance: 0.28, healthHit: [6, 12] },
    mastery: { previewAt: 2, autoAt: 4 },
  },
  {
    id: "courier_run",
    name: "Bike courier run",
    family: "delivery",
    icon: "🚲",
    district: "market_row",
    blurb: "Parcels across the city on two wheels. Rain spikes demand and the pay — if you can keep the pace.",
    windows: [[11 * 60, 14 * 60], [18 * 60, 21 * 60]],
    minutes: 120,
    requires: (s) => s.inventory.bicycle && s.condition.energy >= 18,
    requiresNote: "Courier work needs your own bicycle and 18+ energy.",
    primary: ["logistics", "communication"],
    pay: { base: 30, skillDiv: 5, weather: "delivery" },
    task: { beats: 8, tempo: 1150, band: 0.17, verb: "Deliver", unit: "parcel" },
    risk: { atEnergy: 22, chance: 0.20, healthHit: [4, 9] },
    mastery: { previewAt: 2, autoAt: 4 },
  },
  {
    id: "civic_filing",
    name: "Civic records desk",
    family: "admin",
    icon: "🗂️",
    district: "uptown",
    blurb: "Stamp, sort and file on a day contract. Clean, quiet, exacting — every form on the mark.",
    windows: [[9 * 60, 17 * 60]],
    minutes: 180,
    requires: (s) => s.skills.focus >= 10,
    requiresNote: "The office wants proven focus (10+) before a desk contract.",
    primary: ["focus", "communication"],
    pay: { base: 52, skillDiv: 3, weather: "none" },
    task: { beats: 9, tempo: 1300, band: 0.15, verb: "Stamp", unit: "form" },
    risk: { atEnergy: 0, chance: 0, healthHit: [0, 0] },
    mastery: { previewAt: 2, autoAt: 4 },
  },
];

export function getJob(id) {
  return JOBS.find((j) => j.id === id) || null;
}

export function jobsInDistrict(districtId) {
  return JOBS.filter((j) => j.district === districtId);
}
