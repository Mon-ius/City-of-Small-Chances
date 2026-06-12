// Deterministic, seedable PRNG (mulberry32). Keeps the simulation reproducible
// so that save/load and "explainable" opportunity rolls behave consistently.

export function makeRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    // raw float in [0,1)
    float: next,
    // integer in [min, max] inclusive
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    // float in [min, max)
    range: (min, max) => min + next() * (max - min),
    // chance roll, p in [0,1]
    chance: (p) => next() < p,
    // pick one element
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // weighted pick: items = [{ value, weight }]
    weighted: (items) => {
      const total = items.reduce((s, i) => s + i.weight, 0);
      let r = next() * total;
      for (const item of items) {
        r -= item.weight;
        if (r <= 0) return item.value;
      }
      return items[items.length - 1].value;
    },
    // export current internal state so it can be saved/restored
    getState: () => a >>> 0,
    setState: (s) => {
      a = s >>> 0;
    },
  };
}

// Hash an arbitrary string into a 32-bit seed (for named seeds / character names).
export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
