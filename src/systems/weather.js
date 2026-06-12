// Weather. The book makes weather a first-class economic force: rain changes
// travel, illness risk, delivery demand and mood. For v0.0.1 it sets the daily
// mood and a small health/stress pressure; later milestones read it for jobs.

export const WEATHER = {
  clear: { label: "Clear", icon: "☀️", blurb: "A clean sky. The city feels possible.", illness: 0 },
  cloud: { label: "Overcast", icon: "☁️", blurb: "Grey and still. Sound carries.", illness: 0.02 },
  rain: { label: "Rain", icon: "🌧️", blurb: "Steady rain on the awnings. Streets gleam.", illness: 0.08 },
  storm: { label: "Storm", icon: "⛈️", blurb: "Wind drives the rain sideways. Stay dry if you can.", illness: 0.14 },
  heat: { label: "Heat", icon: "🔆", blurb: "Heavy, wet heat. Everything slows.", illness: 0.05 },
};

const TABLE = [
  { value: "clear", weight: 38 },
  { value: "cloud", weight: 26 },
  { value: "rain", weight: 20 },
  { value: "storm", weight: 6 },
  { value: "heat", weight: 10 },
];

// Roll the day's weather. Slight autocorrelation: storms rarely follow clear.
export function rollWeather(state, rng) {
  let table = TABLE;
  if (state.weather === "clear") table = TABLE.filter((t) => t.value !== "storm");
  if (state.weather === "storm") table = TABLE.map((t) => (t.value === "rain" ? { ...t, weight: 34 } : t));
  return rng.weighted(table);
}

export function weatherMeta(id) {
  return WEATHER[id] || WEATHER.clear;
}
