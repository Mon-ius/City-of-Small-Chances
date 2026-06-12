// Time & calendar. The book treats time as the main scarce resource: days are
// made of time blocks, and most activities cost minutes. We model an 18-hour
// active day from 06:00 to 24:00, then sleep rolls to the next morning.

export const DAY_START_MIN = 6 * 60; // 06:00
export const DAY_END_MIN = 24 * 60; // 24:00 (midnight) — past this you must sleep

export const BLOCKS = [
  { id: "morning", label: "Morning", from: 6 * 60, to: 11 * 60 },
  { id: "midday", label: "Midday", from: 11 * 60, to: 14 * 60 },
  { id: "afternoon", label: "Afternoon", from: 14 * 60, to: 18 * 60 },
  { id: "evening", label: "Evening", from: 18 * 60, to: 21 * 60 },
  { id: "latenight", label: "Late night", from: 21 * 60, to: 24 * 60 },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Format a minute-of-day value as HH:MM.
export function fmtClock(minOfDay) {
  const m = ((minOfDay % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function blockFor(minOfDay) {
  for (const b of BLOCKS) if (minOfDay >= b.from && minOfDay < b.to) return b;
  return BLOCKS[BLOCKS.length - 1];
}

export function weekdayFor(day) {
  // day is 1-indexed; day 1 = Monday.
  return WEEKDAYS[(day - 1) % 7];
}

// Advance the clock by `minutes`. Returns { rolledOver:boolean } so the caller
// can trigger forced sleep / end-of-day when we run past midnight.
export function advanceClock(state, minutes) {
  state.clock += minutes;
  if (state.clock >= DAY_END_MIN) {
    state.clock = DAY_END_MIN;
    return { rolledOver: true };
  }
  return { rolledOver: false };
}

// How much active time is left today, in minutes.
export function minutesLeft(state) {
  return Math.max(0, DAY_END_MIN - state.clock);
}
