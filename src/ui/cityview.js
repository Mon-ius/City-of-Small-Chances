// Persistent 3D viewport wrapper. Owns a single <canvas> + HarbourRenderer that
// survive the city screen's per-emit re-renders: we keep one JS reference and
// just re-append the same canvas node, so the WebGL context is never lost.

import { HarbourRenderer } from "../render/renderer.js";

export class CityView {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "city3d__canvas";
    try {
      this.renderer = new HarbourRenderer(this.canvas);
      this.available = !!this.renderer.ok;
    } catch (e) {
      console.warn("3D renderer failed to init:", e);
      this.available = false;
    }
  }

  // Mount into `host` (re-using the same canvas) and sync lighting to state.
  attach(host, state) {
    if (!this.available) {
      host.classList.add("city3d--fallback");
      host.dataset.wx = state.weather;
      return;
    }
    if (this.canvas.parentNode !== host) host.appendChild(this.canvas);
    this.renderer.setEnv(state.clock, state.weather);
    this.renderer.start();
  }

  stop() {
    this.renderer?.stop();
  }

  // Rebuild the 3D world when the player changes district. No-ops if unchanged,
  // so it's safe to call on every city-screen emit.
  syncDistrict(district) {
    if (!this.available || !district) return;
    if (this._districtId === district.id) return;
    this._districtId = district.id;
    this.renderer.setScene(district.seed, { water: district.water });
  }

  // Camera-mode passthrough (orbit establishing shot ↔ follow walk). Safe no-ops
  // when the renderer is unavailable (fallback mode).
  get mode() { return this.renderer?.mode || "orbit"; }
  setMode(m) { return this.renderer ? this.renderer.setMode(m) : "orbit"; }
  toggleMode() { return this.renderer ? this.renderer.toggleMode() : "orbit"; }
  set onModeChange(cb) {
    this._modeCb = cb;
    if (this.renderer) this.renderer._onModeChange = cb;
  }
  get onModeChange() { return this._modeCb; }
}
