// The in-world shift scene (book §9 "work mastery without repetition"). A shift
// is a short, skill-expressive **work-rhythm** mini-game: a cursor sweeps a track
// each beat; you act when it crosses the lit zone. Closer to the bright core =
// higher quality = better pay and faster mastery. Skill, mastery and energy widen
// the zone and slow the sweep, so getting better *feels* better. At mastery you
// can read the pattern a beat ahead, and eventually auto-resolve.
//
// Rendering is canvas 2D (glow, sparks, combo flair); the scoring is a pure fn
// (scoreBeat) so it stays testable. The RAF loop self-stops when its canvas
// detaches from the DOM, so leaving the screen tears everything down cleanly.

import { el, clear, mount } from "./dom.js";
import { getJob, JOB_FAMILIES } from "../data/jobs.js";
import {
  shiftParams, jobStatus, resolveShift, autoResolveQuality,
  getMastery, masteryProgress, qualityWord, MASTERY_MAX,
} from "../systems/jobs.js";
import { CONDITION_META } from "../core/state.js";

// Pure scoring for one beat. `pos` and `center` are 0..1 across the track; `band`
// and `perfect` are half-widths. Returns { score 0..1, tier }. A small combo
// bonus rewards consecutive clean hits. Exported for the node sim.
export function scoreBeat(pos, center, band, perfect, combo = 0) {
  const d = Math.abs(pos - center);
  if (d > band) return { score: 0, tier: "miss" };
  const tier = d <= perfect ? "perfect" : "good";
  // 1.0 at the core, easing down to ~0.55 at the band edge.
  const base = 0.55 + 0.45 * (1 - d / band);
  const bonus = Math.min(combo * 0.015, 0.09);
  return { score: Math.min(1, base + bonus), tier };
}

// A seeded-ish sequence of zone centres for the shift, kept away from the edges.
function makeZones(n, rng) {
  const zones = [];
  for (let i = 0; i < n; i++) zones.push(0.2 + rng() * 0.6);
  return zones;
}

export function shiftScreen(root, game, sm, ctx) {
  const state = game.store.state;
  const job = getJob(ctx.jobId);
  if (!job) { sm.show("city"); return; }

  const status = jobStatus(state, job);
  if (!status.available) { sm.show("city"); return; }

  const fam = JOB_FAMILIES[job.family] || { label: job.family, color: "#c9803f" };
  const params = shiftParams(state, job);
  const mastery = getMastery(state, job.id);

  // ── Header (job identity + mastery) ──────────────────────────────────────
  const stars = "★".repeat(mastery.level) + "☆".repeat(MASTERY_MAX - mastery.level);
  const header = el("div.shift__head", {}, [
    el("div.shift__id", {}, [
      el("span.shift__icon", { text: job.icon }),
      el("div", {}, [
        el("h2.shift__name", { text: job.name }),
        el("div.shift__sub", {}, [
          el("span.shift__fam", { text: fam.label, style: `--fam:${fam.color}` }),
          el("span.shift__where", { text: `${status.window} · ${job.minutes}m` }),
        ]),
      ]),
    ]),
    el("div.shift__mastery", {}, [
      el("div.shift__stars", { text: stars, title: `Mastery ${mastery.level}/${MASTERY_MAX}` }),
      el("div.shift__xpbar", {}, [el("div.shift__xpfill", { style: `width:${Math.round(masteryProgress(mastery.xp) * 100)}%; --fam:${fam.color}` })]),
    ]),
  ]);

  // ── Canvas track ─────────────────────────────────────────────────────────
  const canvas = el("canvas.shift__canvas");
  const readout = el("div.shift__readout", {}, [
    el("div.shift__beat", { text: `Beat 0 / ${params.beats}` }),
    el("div.shift__combo", { text: "" }),
    el("div.shift__qual", { text: "" }),
  ]);
  const tapBtn = el("button.shift__tap", { type: "button" }, ["TAP"]);
  const stage = el("div.shift__stage", {}, [canvas, readout, tapBtn]);

  const controls = el("div.shift__controls");
  const tip = el("p.shift__tip", { text: `Press SPACE or tap when the sweep crosses the lit zone. ${params.verb} each ${params.unit} on the beat.` });

  mount(root, el("section.screen.shift", { style: `--fam:${fam.color}` }, [
    header,
    el("div.shift__brief", { text: job.blurb }),
    stage, tip, controls,
  ]));

  // ── Game state ───────────────────────────────────────────────────────────
  const beatEl = readout.querySelector(".shift__beat");
  const comboEl = readout.querySelector(".shift__combo");
  const qualEl = readout.querySelector(".shift__qual");

  const zones = makeZones(params.beats, makeUiRng(job.id.length * 97 + params.beats * 31 + state.day));
  let phase = "ready";       // ready | playing | done
  let beat = 0;              // current beat index
  let beatStart = 0;         // performance.now() at beat start
  let scored = false;        // acted this beat?
  let combo = 0, bestCombo = 0;
  const scores = [];
  const sparks = [];
  let shake = 0;
  let raf = 0;
  let keyHandler = null;

  // Canvas crispness.
  function sizeCanvas() {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 200;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const cx = canvas.getContext("2d");
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function begin() {
    phase = "playing";
    beat = 0; combo = 0; bestCombo = 0; scores.length = 0; scored = false;
    beatStart = now();
    renderControls();
    loop();
  }

  function act() {
    if (phase !== "playing" || scored) return;
    scored = true;
    const dur = params.tempoMs;
    const pos = clamp01((now() - beatStart) / dur);
    const center = zones[beat];
    const r = scoreBeat(pos, center, params.band, params.perfectBand, combo);
    scores.push(r.score);
    if (r.tier === "miss") {
      combo = 0; shake = 1;
    } else {
      combo++; bestCombo = Math.max(bestCombo, combo);
      burst(center, r.tier);
    }
    flashReadout(r.tier);
  }

  function nextBeat() {
    beat++;
    if (beat >= params.beats) { finish(); return; }
    scored = false;
    beatStart = now();
  }

  function finish() {
    phase = "done";
    const quality = scores.length ? scores.reduce((a, b) => a + b, 0) / params.beats : 0;
    const result = resolveShift(game, job.id, quality, { auto: false });
    showResult(result);
  }

  function autoResolve() {
    const q = autoResolveQuality(state, job);
    const result = resolveShift(game, job.id, q, { auto: true });
    phase = "done";
    showResult(result);
  }

  // ── Rendering ────────────────────────────────────────────────────────────
  function loop() {
    if (!canvas.isConnected) { teardown(); return; }
    if (phase !== "playing") return;
    const dims = sizeCanvas();
    draw(dims);
    // Beat timeout → counts as a miss, advance.
    if (now() - beatStart >= params.tempoMs) {
      if (!scored) { scores.push(0); combo = 0; shake = 1; flashReadout("miss"); }
      nextBeat();
    }
    beatEl.textContent = `Beat ${Math.min(beat + 1, params.beats)} / ${params.beats}`;
    comboEl.textContent = combo >= 2 ? `combo ×${combo}` : "";
    comboEl.classList.toggle("is-hot", combo >= 4);
    raf = requestAnimationFrame(loop);
  }

  function draw({ w, h }) {
    const cx = canvas.getContext("2d");
    const sx = shake ? (Math.sin(now() / 18) * 6 * shake) : 0;
    shake = Math.max(0, shake - 0.06);
    cx.clearRect(0, 0, w, h);
    cx.save();
    cx.translate(sx, 0);

    const padX = 26, trackY = h * 0.52, trackH = 26;
    const trackW = w - padX * 2;
    const toX = (p) => padX + p * trackW;

    // Track.
    roundRectPath(cx, padX, trackY - trackH / 2, trackW, trackH, trackH / 2);
    const tg = cx.createLinearGradient(0, trackY, 0, trackY + trackH);
    tg.addColorStop(0, "#11202c"); tg.addColorStop(1, "#0a141c");
    cx.fillStyle = tg; cx.fill();
    cx.strokeStyle = "rgba(255,255,255,0.06)"; cx.lineWidth = 1; cx.stroke();

    // Preview of the next zone (mastery perk), drawn faint behind.
    if (params.preview && beat + 1 < params.beats && phase === "playing") {
      drawZone(cx, toX, trackY, trackH, zones[beat + 1], params.band, params.perfectBand, fam.color, 0.16);
    }
    // Current good zone — shown in the ready idle frame too, so you can see the
    // target before you begin (dimmed until the shift starts).
    if (phase !== "done") {
      drawZone(cx, toX, trackY, trackH, zones[beat], params.band, params.perfectBand, fam.color, phase === "playing" ? 1 : 0.5);
    }
    // Sweeping cursor (only while the shift is live).
    if (phase === "playing") {
      const pos = clamp01((now() - beatStart) / params.tempoMs);
      const cxx = toX(pos);
      cx.save();
      cx.shadowColor = "#fff"; cx.shadowBlur = 14;
      cx.strokeStyle = "#fdf6e3"; cx.lineWidth = 3;
      cx.beginPath(); cx.moveTo(cxx, trackY - trackH); cx.lineTo(cxx, trackY + trackH); cx.stroke();
      cx.fillStyle = "#fdf6e3";
      cx.beginPath(); cx.moveTo(cxx, trackY - trackH - 2); cx.lineTo(cxx - 6, trackY - trackH - 12); cx.lineTo(cxx + 6, trackY - trackH - 12); cx.closePath(); cx.fill();
      cx.restore();
    }

    // Progress pips.
    const pipY = trackY + trackH + 22, pipR = 5, gap = 18;
    const startX = w / 2 - ((params.beats - 1) * gap) / 2;
    for (let i = 0; i < params.beats; i++) {
      cx.beginPath(); cx.arc(startX + i * gap, pipY, pipR, 0, Math.PI * 2);
      const s = scores[i];
      cx.fillStyle = i >= scores.length ? "rgba(255,255,255,0.12)"
        : s === 0 ? "#7a2e30" : s >= 0.86 ? "#e8c35a" : "#3f6f57";
      cx.fill();
    }

    // Sparks.
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.t += 0.045; p.x += p.vx; p.y += p.vy; p.vy += 0.12;
      if (p.t >= 1) { sparks.splice(i, 1); continue; }
      cx.globalAlpha = 1 - p.t;
      cx.fillStyle = p.c;
      cx.beginPath(); cx.arc(p.x, p.y, p.r * (1 - p.t), 0, Math.PI * 2); cx.fill();
    }
    cx.globalAlpha = 1;
    cx.restore();
  }

  function burst(center, tier) {
    const w = canvas.clientWidth || 640, h = canvas.clientHeight || 200;
    const padX = 26, trackW = w - padX * 2, x = padX + center * trackW, y = h * 0.52;
    const color = tier === "perfect" ? "#fff3c4" : fam.color;
    const n = tier === "perfect" ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      sparks.push({ x, y, vx: Math.cos(a) * (1.6 + Math.random() * 2), vy: Math.sin(a) * (1.6 + Math.random() * 2) - 1, r: tier === "perfect" ? 4 : 3, c: color, t: 0 });
    }
  }

  function flashReadout(tier) {
    qualEl.textContent = tier === "perfect" ? "PERFECT" : tier === "good" ? "good" : "miss";
    qualEl.className = "shift__qual is-" + tier;
    qualEl.classList.remove("pop"); void qualEl.offsetWidth; qualEl.classList.add("pop");
  }

  // ── Controls per phase ───────────────────────────────────────────────────
  function renderControls() {
    clear(controls);
    if (phase === "ready") {
      tapBtn.style.display = "none";
      const btns = [
        el("button.btn.btn--primary", { onClick: begin }, [`Work the shift — ${params.verb} the rhythm`]),
      ];
      if (status.canAuto) btns.push(el("button.btn", { onClick: autoResolve }, ["Auto-resolve (mastered)"]));
      btns.push(el("button.btn.btn--ghost", { onClick: leave }, ["Not now — back to the city"]));
      mount(controls, ...btns);
      tip.textContent = `Press SPACE or tap when the sweep crosses the lit zone. ${params.verb} each ${params.unit} on the beat.`
        + (status.canPreview ? " You can read one beat ahead." : "");
    } else if (phase === "playing") {
      tapBtn.style.display = "";
    }
  }

  function leave() { teardown(); sm.show("city"); }

  function showResult(result) {
    teardown();
    if (!result) { sm.show("city"); return; }
    clear(root);
    const q = result.quality;
    const tone = q >= 0.75 ? "ok" : q >= 0.45 ? "mid" : "bad";
    const condRows = Object.entries(result.after).map(([k]) => {
      const d = Math.round(result.after[k] - result.before[k]);
      if (!d) return null;
      const meta = CONDITION_META[k];
      const good = meta.good === "low" ? -1 : 1;
      return el(`span.shift__delta.tone-${d * good > 0 ? "ok" : "bad"}`, { text: `${meta.icon} ${d > 0 ? "+" : ""}${d}` });
    }).filter(Boolean);

    const skillRows = Object.entries(result.skillGrant).map(([k, v]) =>
      el("span.shift__delta.tone-ok", { text: `${k} +${v}` }));

    mount(root, el("section.screen.shift.shift--done", { style: `--fam:${fam.color}` }, [
      el("div.shift__result", {}, [
        el("div.shift__resulthead", {}, [
          el("span.shift__icon", { text: job.icon }),
          el("div", {}, [
            el("h2", { text: result.auto ? "Shift auto-resolved" : "Shift complete" }),
            el("div.shift__sub", { text: `${job.name} — ${result.auto ? "worked on muscle memory" : qualityWord(q)}` }),
          ]),
        ]),
        el("div.shift__score", {}, [
          el("div.shift__scorebar", {}, [el(`div.shift__scorefill.tone-${tone}`, { style: `width:${Math.round(q * 100)}%` })]),
          el("div.shift__scorelabel", { text: `${Math.round(q * 100)}% quality` }),
        ]),
        el("div.shift__pay", {}, [el("span.shift__paybig", { text: `+$${result.pay}` }), el("span", { text: "for the shift" })]),
        el("div.shift__deltas", {}, [...condRows, ...skillRows]),
        result.injury ? el("div.warnbox", {}, [el("div.warnbox__line", { text: "⚠ You picked up a strain — mind your health and energy." })]) : null,
        result.leveledUp ? el("div.shift__unlock", { text: "▲ " + result.masteryUnlock }) : null,
        el("button.btn.btn--primary.btn--block", {
          onClick: () => {
            if (result.forcedSleep) sm.show("report", { report: game.sleep(true) });
            else sm.show("city");
          },
        }, [result.forcedSleep ? "Midnight — sleep and see the day →" : "Back to the city →"]),
      ]),
    ]));
  }

  function teardown() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (keyHandler) { window.removeEventListener("keydown", keyHandler); keyHandler = null; }
  }

  // ── Input wiring ─────────────────────────────────────────────────────────
  keyHandler = (e) => {
    if (e.key === " " || e.key === "Enter") {
      if (phase === "playing") { e.preventDefault(); act(); }
    } else if (e.key === "Escape") {
      if (phase === "ready") leave();
    }
  };
  window.addEventListener("keydown", keyHandler);
  tapBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); act(); });
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); if (phase === "playing") act(); });

  renderControls();
  // Draw an initial idle frame so the track is visible before "Begin".
  requestAnimationFrame(() => { const d = sizeCanvas(); draw(d); });
}

// ── helpers ──────────────────────────────────────────────────────────────────
function now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

function roundRectPath(cx, x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}

function drawZone(cx, toX, trackY, trackH, center, band, perfect, color, alpha) {
  const x0 = toX(center - band), x1 = toX(center + band);
  const px0 = toX(center - perfect), px1 = toX(center + perfect);
  cx.save();
  cx.globalAlpha = alpha;
  // Good band.
  cx.shadowColor = color; cx.shadowBlur = 16 * alpha;
  roundRectPath(cx, x0, trackY - trackH / 2, x1 - x0, trackH, 6);
  cx.fillStyle = hexA(color, 0.42); cx.fill();
  // Perfect core.
  cx.shadowBlur = 22 * alpha;
  roundRectPath(cx, px0, trackY - trackH / 2 - 3, px1 - px0, trackH + 6, 5);
  cx.fillStyle = hexA("#fff7df", 0.9); cx.fill();
  cx.restore();
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// A tiny mulberry32 so zone layouts vary by job/day without touching the save RNG.
function makeUiRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
