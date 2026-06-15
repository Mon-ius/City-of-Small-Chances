// The harbour's voice — procedural audio, synthesised live with the Web Audio
// API. No audio files cross the network: every sound is built from oscillators
// and filtered noise the moment it's needed, matching the project's instant-boot,
// no-binary-bloat ethos. One AudioContext drives a quiet ambient bed (sea wash,
// gulls, a night lamp hum) under one-shot SFX (footsteps, coins, panel open/close,
// UI confirm/deny).
//
// Browsers forbid audio before a user gesture, so the context is created
// suspended and resumed on the first key/pointer press. createAudio() always
// returns an object with the full method surface; if Web Audio is missing it's a
// silent stub, so callers never need to guard.

const STORE_KEY = "cosc.muted";

export function createAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return stub();

  let ctx;
  try {
    ctx = new Ctx();
  } catch (e) {
    return stub();
  }

  // ── Buses: master → destination; ambient + sfx feed the master so a single
  // mute or volume change covers everything.
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const ambientBus = ctx.createGain();
  ambientBus.gain.value = 0.0; // faded in when ambient starts
  ambientBus.connect(master);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.85;
  sfxBus.connect(master);

  let muted = readMuted();
  master.gain.value = muted ? 0.0 : 0.9;

  // ── A looping noise buffer reused by the sea, wind and footstep voices.
  const noiseBuf = makeNoise(ctx, 2.2);

  let ambientStarted = false;
  let lampHumGain = null;
  let seaSwellLFO = null;
  let gullTimer = 4.0;     // seconds until the next gull
  let gullRate = 14;       // average seconds between gulls (lower by day)
  let strideAccum = 0;     // metres walked since the last footstep
  let leftFoot = true;

  // ── Ambient bed: sea wash (filtered noise with a slow swell), a thin wind
  // layer, and a lamp hum that only rises after dark.
  function startAmbient() {
    if (ambientStarted) return;
    ambientStarted = true;

    // Sea: brown-ish noise through a low-pass that breathes open and shut.
    const sea = ctx.createBufferSource();
    sea.buffer = noiseBuf;
    sea.loop = true;
    const seaLP = ctx.createBiquadFilter();
    seaLP.type = "lowpass";
    seaLP.frequency.value = 420;
    seaLP.Q.value = 0.6;
    const seaGain = ctx.createGain();
    seaGain.gain.value = 0.5;
    sea.connect(seaLP).connect(seaGain).connect(ambientBus);
    sea.start();

    // Swell: a slow LFO opens the filter and lifts the gain like waves lapping.
    seaSwellLFO = ctx.createOscillator();
    seaSwellLFO.frequency.value = 0.11;
    const swellToCut = ctx.createGain();
    swellToCut.gain.value = 240;
    seaSwellLFO.connect(swellToCut).connect(seaLP.frequency);
    const swellToGain = ctx.createGain();
    swellToGain.gain.value = 0.18;
    seaSwellLFO.connect(swellToGain).connect(seaGain.gain);
    seaSwellLFO.start();

    // Wind: a higher, very quiet band of noise for air over the water.
    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuf;
    wind.loop = true;
    const windBP = ctx.createBiquadFilter();
    windBP.type = "bandpass";
    windBP.frequency.value = 720;
    windBP.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    wind.connect(windBP).connect(windGain).connect(ambientBus);
    wind.start();

    // Lamp hum: a faint mains-ish tone, silent by day, lifted at night via
    // setTimeOfDay(). Two partials for a little warmth.
    lampHumGain = ctx.createGain();
    lampHumGain.gain.value = 0.0;
    lampHumGain.connect(ambientBus);
    for (const [f, g] of [[60, 0.6], [120, 0.25]]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = g;
      o.connect(og).connect(lampHumGain);
      o.start();
    }

    // Fade the whole bed up gently so it never pops in.
    ambientBus.gain.setValueAtTime(0.0001, ctx.currentTime);
    ambientBus.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 2.5);
  }

  // ── Resume on the first gesture (autoplay policy), then start the bed.
  function resume() {
    if (ctx.state === "suspended") ctx.resume();
    startAmbient();
  }
  const firstGesture = () => {
    resume();
    window.removeEventListener("pointerdown", firstGesture);
    window.removeEventListener("keydown", firstGesture);
  };
  window.addEventListener("pointerdown", firstGesture);
  window.addEventListener("keydown", firstGesture);

  // ── Per-frame housekeeping: footstep cadence while walking, gull scheduling.
  function update(dt, speed = 0) {
    if (muted || ctx.state !== "running") return;

    if (speed > 0.1) {
      strideAccum += speed * dt;
      if (strideAccum >= 1.55) { // one footfall every ~1.55 m
        strideAccum = 0;
        footstep();
      }
    } else {
      strideAccum = 1.4; // primed so the next step lands promptly
    }

    gullTimer -= dt;
    if (gullTimer <= 0) {
      gull();
      gullTimer = gullRate * (0.6 + Math.random() * 0.9);
    }
  }

  // ── Time of day shapes the bed: gulls call often by day and rarely at night;
  // the lamp hum rises after dusk. min is the in-game minute (0..1440).
  function setTimeOfDay(min) {
    const hour = (min / 60) % 24;
    const day = hour >= 7 && hour <= 18;
    const night = hour >= 20 || hour <= 5;
    gullRate = day ? 9 : 22;
    if (lampHumGain) {
      const target = night ? 0.04 : hour >= 18 || hour <= 6 ? 0.02 : 0.0;
      lampHumGain.gain.setTargetAtTime(target, ctx.currentTime, 4.0);
    }
  }

  // ── One-shot voices ──────────────────────────────────────────────────────

  // A soft footfall: a short low-passed noise thud, alternating pitch L/R.
  function footstep() {
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = leftFoot ? 230 : 200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(lp).connect(g).connect(sfxBus);
    src.start(t);
    src.stop(t + 0.18);
    leftFoot = !leftFoot;
  }

  // A bright little cascade of coins — played when a shift pays out.
  function pay() {
    const base = ctx.currentTime + 0.01;
    const notes = [1180, 1560, 1980, 2360];
    notes.forEach((f, i) => blip(f, base + i * 0.06, 0.12, "triangle", 0.16));
  }

  // A short rising two-note when a panel opens.
  function panelOpen() {
    const t = ctx.currentTime + 0.005;
    blip(520, t, 0.1, "sine", 0.12);
    blip(780, t + 0.07, 0.12, "sine", 0.12);
  }

  // A short falling note when a panel closes.
  function panelClose() {
    const t = ctx.currentTime + 0.005;
    blip(660, t, 0.09, "sine", 0.1);
    blip(440, t + 0.06, 0.12, "sine", 0.1);
  }

  // A neutral tick for navigating / selecting.
  function select() {
    blip(880, ctx.currentTime + 0.003, 0.05, "square", 0.05);
  }

  // A warm confirming two-note (an action succeeded).
  function confirm() {
    const t = ctx.currentTime + 0.005;
    blip(660, t, 0.1, "triangle", 0.13);
    blip(990, t + 0.08, 0.16, "triangle", 0.13);
  }

  // A low buzz when something can't be done (a locked shift).
  function deny() {
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.22);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(lp).connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.28);
  }

  // A gull cry: a triangle with a quick downward pitch sweep through a band-pass.
  function gull() {
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.type = "triangle";
    const top = 1300 + Math.random() * 500;
    o.frequency.setValueAtTime(top, t);
    o.frequency.exponentialRampToValueAtTime(top * 0.55, t + 0.18);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(bp).connect(g).connect(ambientBus);
    o.start(t);
    o.stop(t + 0.24);
  }

  // A short enveloped tone — the building block for the UI/coin voices.
  function blip(freq, t, dur, type = "sine", peak = 0.12) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ── Mute ───────────────────────────────────────────────────────────────
  function setMuted(m) {
    muted = m;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(m ? 0.0 : 0.9, t, 0.05);
    try { localStorage.setItem(STORE_KEY, m ? "1" : "0"); } catch (e) {}
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  return {
    resume, update, setTimeOfDay,
    footstep, pay, panelOpen, panelClose, select, confirm, deny, gull,
    setMuted, toggleMute, isMuted,
  };
}

// A short looping buffer of softened (brown-ish) noise.
function makeNoise(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02; // integrate toward brown noise
    data[i] = last * 3.2;
  }
  return buf;
}

function readMuted() {
  try { return localStorage.getItem(STORE_KEY) === "1"; } catch (e) { return false; }
}

// A no-op stand-in when Web Audio is unavailable, so callers never branch.
function stub() {
  const noop = () => {};
  return {
    resume: noop, update: noop, setTimeOfDay: noop,
    footstep: noop, pay: noop, panelOpen: noop, panelClose: noop,
    select: noop, confirm: noop, deny: noop, gull: noop,
    setMuted: noop, toggleMute: () => false, isMuted: () => false,
  };
}
