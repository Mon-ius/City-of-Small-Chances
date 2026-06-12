// Districts of Haiyun City (book §6 "Map & Districts"). Each is a place on the
// stylised map with its own character, a 3D scene seed, and the activities you
// can only do while you're standing in it. Travel between them costs time, and
// sometimes a fare — the core tension this milestone adds. Coordinates live on a
// 100×70 viewBox shared with the map UI (src/ui/map.js).

export const HOME_DISTRICT = "tenements";

export const DISTRICTS = [
  {
    id: "tenements",
    name: "The Tenements",
    short: "Tenements",
    icon: "🏚️",
    blurb: "Cramped rooms and shared stairwells, the smell of a hundred dinners. Home — for now.",
    x: 18, y: 52, water: false, seed: 0x7E4E,
    activities: ["rest_home", "cook_meal"],
  },
  {
    id: "market_row",
    name: "Market Row",
    short: "Market",
    icon: "🍜",
    blurb: "Awnings, frying oil, the bark of vendors. News reaches here before anywhere else.",
    x: 42, y: 44, water: false, seed: 0x3A11,
    activities: ["eat_out", "ask_around", "run_errand"],
  },
  {
    id: "old_harbour",
    name: "Old Harbour",
    short: "Harbour",
    icon: "⚓",
    blurb: "Quay and cranes, gulls and diesel. The working edge of the city.",
    x: 64, y: 34, water: true, seed: 0xC05C,
    activities: ["walk_harbour", "eat_out"],
  },
  {
    id: "dockside",
    name: "Dockside Yards",
    short: "Docks",
    icon: "📦",
    blurb: "Container stacks and forklifts. Heavy pay for a heavy back.",
    x: 82, y: 20, water: true, seed: 0xD0C5,
    activities: ["ask_around"],
  },
  {
    id: "uptown",
    name: "Civic Quarter",
    short: "Civic",
    icon: "🏛️",
    blurb: "Glass, lanyards and polished floors. Money lives differently up here.",
    x: 30, y: 16, water: false, seed: 0x11C7,
    activities: ["study_library"],
  },
];

export function getDistrict(id) {
  return DISTRICTS.find((d) => d.id === id) || DISTRICTS[0];
}

// Straight-line distance between two districts on the map grid.
export function districtDistance(aId, bId) {
  const a = getDistrict(aId), b = getDistrict(bId);
  return Math.hypot(a.x - b.x, a.y - b.y);
}
