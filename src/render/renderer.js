// The WebGL2 renderer for the Old Harbour. Owns the GL context, programs,
// baked textures, the scene, an orbit camera, and a render loop whose lighting
// follows the simulation's time-of-day and weather. Pure vanilla WebGL2.

import { getContext, createProgram, createTexture } from "./gl.js";
import { M, V } from "./mat.js";
import { buildHarbourScene } from "./scene.js";
import { makeRng } from "../core/rng.js";
import * as Tex from "./textures.js";

const VERT = `#version 300 es
precision highp float;
in vec3 aPos; in vec3 aNormal; in vec2 aUv;
uniform mat4 uProj, uView, uModel; uniform mat3 uNormalMat;
out vec3 vNormal; out vec2 vUv; out vec3 vWorld;
void main(){
  vec4 world = uModel * vec4(aPos,1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMat * aNormal);
  vUv = aUv;
  gl_Position = uProj * uView * world;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNormal; in vec2 vUv; in vec3 vWorld;
uniform sampler2D uAlbedo; uniform sampler2D uEmissive;
uniform vec3 uSunDir, uSunColor, uAmbient, uFogColor;
uniform vec3 uEmissiveColor; uniform vec3 uCamPos;
uniform vec2 uUvScroll;
uniform float uFogDensity, uWindowGlow, uSpecular, uShininess, uTime;
out vec4 outColor;
void main(){
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunDir);
  vec2 uv = vUv + uUvScroll * uTime;
  vec3 albedo = texture(uAlbedo, uv).rgb;
  float diff = max(dot(N, L), 0.0);
  vec3 lit = albedo * (uAmbient + uSunColor * diff);
  // specular (water / wet surfaces)
  if (uShininess > 0.0) {
    vec3 Vd = normalize(uCamPos - vWorld);
    vec3 Hh = normalize(L + Vd);
    float spec = pow(max(dot(N, Hh), 0.0), uShininess);
    lit += uSunColor * spec * uSpecular;
  }
  // emissive windows, modulated by darkness
  vec3 emis = texture(uEmissive, vUv).rgb * uEmissiveColor * uWindowGlow;
  vec3 color = lit + emis;
  // exp2 distance fog into sky/haze color
  float dist = length(vWorld - uCamPos);
  float f = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
  color = mix(color, uFogColor, clamp(f, 0.0, 1.0));
  outColor = vec4(color, 1.0);
}`;

// Map sim time (minutes) + weather → lighting environment.
export function computeEnv(timeMin, weather) {
  const dayFrac = (timeMin - 360) / 720; // 0 at 06:00, 1 at 18:00
  const isDay = dayFrac >= 0 && dayFrac <= 1;
  const theta = dayFrac * Math.PI;
  let elev = isDay ? Math.sin(theta) : -0.2;

  let sunDir, sunColor, ambient, sky;
  if (isDay) {
    sunDir = V.norm([Math.cos(theta), Math.max(Math.sin(theta), 0.06) + 0.05, 0.42]);
    // warm at horizon, neutral-bright at noon
    const warm = 1 - Math.min(elev * 1.3, 1);
    sunColor = [1.0, 0.86 + 0.1 * (1 - warm), 0.66 + 0.28 * (1 - warm)].map((c) => c * (0.55 + 0.75 * elev));
    ambient = [0.34 + 0.12 * elev, 0.38 + 0.13 * elev, 0.46 + 0.12 * elev];
    sky = [0.46 + 0.2 * elev, 0.56 + 0.2 * elev, 0.66 + 0.18 * elev];
  } else {
    // night: cool moonlight, dark blue sky
    sunDir = V.norm([0.3, 0.7, 0.45]);
    sunColor = [0.22, 0.27, 0.4];
    ambient = [0.12, 0.15, 0.22];
    sky = [0.06, 0.09, 0.14];
  }

  let windowGlow = Math.min(Math.max(1 - elev * 1.5, 0), 1);
  let fogDensity = 0.0045;

  // weather adjustments
  switch (weather) {
    case "rain":
      sunColor = sunColor.map((c) => c * 0.62);
      ambient = ambient.map((c) => c * 0.85);
      sky = sky.map((c) => c * 0.6 + 0.04);
      fogDensity = 0.011;
      windowGlow = Math.min(windowGlow + 0.25, 1);
      break;
    case "storm":
      sunColor = sunColor.map((c) => c * 0.45);
      ambient = ambient.map((c) => c * 0.7 + 0.02);
      sky = sky.map((c) => c * 0.45 + 0.03);
      fogDensity = 0.016;
      windowGlow = Math.min(windowGlow + 0.35, 1);
      break;
    case "cloud":
      sunColor = sunColor.map((c) => c * 0.78);
      sky = sky.map((c) => c * 0.78 + 0.03);
      fogDensity = 0.0075;
      break;
    case "heat":
      sunColor = [sunColor[0] * 1.05, sunColor[1] * 0.98, sunColor[2] * 0.82];
      sky = [sky[0] * 1.04, sky[1] * 0.98, sky[2] * 0.86];
      fogDensity = 0.009;
      break;
  }
  return { sunDir, sunColor, ambient, sky, fogDensity, windowGlow };
}

export class HarbourRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = getContext(canvas);
    this.ok = !!this.gl;
    if (!this.ok) return;

    const gl = this.gl;
    this.program = createProgram(gl, VERT, FRAG);

    // bake textures → GL textures
    const black = createTexture(gl, Tex.blackPixel());
    const mk = (canvasTex, opts) => createTexture(gl, canvasTex, opts);
    const facA = mk(Tex.facadeAlbedo(256, [78, 86, 98]));
    const facB = mk(Tex.facadeAlbedo(256, [96, 84, 74]));
    const facC = mk(Tex.facadeAlbedo(256, [70, 80, 80]));
    const emis = mk(Tex.facadeEmissive(256));

    const facadeMat = (albedo) => ({ albedo, emissive: emis, emissiveColor: [1, 1, 1], uvScroll: [0, 0], specular: 0.0, shininess: 0 });
    this.mats = {
      road: { albedo: mk(Tex.asphaltTex(256)), emissive: black, emissiveColor: [0, 0, 0], uvScroll: [0, 0], specular: 0.12, shininess: 24 },
      quay: { albedo: mk(Tex.quayTex(256)), emissive: black, emissiveColor: [0, 0, 0], uvScroll: [0, 0], specular: 0.08, shininess: 16 },
      water: { albedo: mk(Tex.waterTex(256)), emissive: black, emissiveColor: [0, 0, 0], uvScroll: [0.004, 0.011], specular: 0.9, shininess: 64 },
      roof: { albedo: mk(Tex.roofTex(128)), emissive: black, emissiveColor: [0, 0, 0], uvScroll: [0, 0], specular: 0, shininess: 0 },
      facadeA: facadeMat(facA),
      facadeB: facadeMat(facB),
      facadeC: facadeMat(facC),
    };

    const rng = makeRng(0xC05C); // fixed seed → stable skyline
    this.scene = buildHarbourScene(gl, this.program.attribs, this.mats, rng);

    // camera state (orbit) — an establishing 3/4 shot looking down the street
    this.cam = { azimuth: 0.42, elevation: 0.46, dist: 88, target: [0, 8, 0], autoSpin: 0.012 };
    this.env = computeEnv(8 * 60, "clear");
    this._dragging = false;
    this._last = [0, 0];
    this._time = 0;
    this._raf = null;
    this._wireInput();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  setEnv(timeMin, weather) {
    if (!this.ok) return;
    this.env = computeEnv(timeMin, weather);
  }

  resize() {
    if (!this.ok) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  _wireInput() {
    const c = this.canvas;
    const down = (e) => { this._dragging = true; this.cam.autoSpin = 0; const p = pt(e); this._last = p; };
    const move = (e) => {
      if (!this._dragging) return;
      const p = pt(e);
      this.cam.azimuth += (p[0] - this._last[0]) * 0.005;
      this.cam.elevation = Math.min(Math.max(this.cam.elevation - (p[1] - this._last[1]) * 0.004, 0.08), 0.85);
      this._last = p;
    };
    const up = () => { this._dragging = false; };
    c.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.cam.dist = Math.min(Math.max(this.cam.dist + Math.sign(e.deltaY) * 4, 26), 110);
    }, { passive: false });
    const pt = (e) => [e.clientX, e.clientY];
  }

  start() {
    if (!this.ok || this._raf) return;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      this._time += dt;
      if (this.cam.autoSpin) this.cam.azimuth += this.cam.autoSpin * dt;
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _draw() {
    const gl = this.gl;
    this.resize();
    const { sky, sunDir, sunColor, ambient, fogDensity, windowGlow } = this.env;
    gl.clearColor(sky[0], sky[1], sky[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera
    const { azimuth, elevation, dist, target } = this.cam;
    const eye = [
      target[0] + dist * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + dist * Math.sin(elevation),
      target[2] + dist * Math.cos(elevation) * Math.cos(azimuth),
    ];
    const aspect = this.canvas.width / Math.max(1, this.canvas.height);
    const proj = M.perspective((55 * Math.PI) / 180, aspect, 0.5, 600);
    const view = M.lookAt(eye, target, [0, 1, 0]);

    const { prog, uniforms: U } = this.program;
    gl.useProgram(prog);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uSunDir, sunDir);
    gl.uniform3fv(U.uSunColor, sunColor);
    gl.uniform3fv(U.uAmbient, ambient);
    gl.uniform3fv(U.uFogColor, sky);
    gl.uniform1f(U.uFogDensity, fogDensity);
    gl.uniform1f(U.uWindowGlow, windowGlow);
    gl.uniform3fv(U.uCamPos, eye);
    gl.uniform1f(U.uTime, this._time);
    gl.uniform1i(U.uAlbedo, 0);
    gl.uniform1i(U.uEmissive, 1);

    let lastMat = null;
    for (const it of this.scene.items) {
      gl.uniformMatrix4fv(U.uModel, false, it.model);
      gl.uniformMatrix3fv(U.uNormalMat, false, M.normalMat3(it.model));
      const m = it.material;
      if (m !== lastMat) {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.albedo);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, m.emissive);
        gl.uniform3fv(U.uEmissiveColor, m.emissiveColor);
        gl.uniform2fv(U.uUvScroll, m.uvScroll);
        gl.uniform1f(U.uSpecular, m.specular);
        gl.uniform1f(U.uShininess, m.shininess);
        lastMat = m;
      }
      gl.bindVertexArray(it.mesh.vao);
      gl.drawElements(gl.TRIANGLES, it.mesh.count, gl.UNSIGNED_SHORT, 0);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.stop();
  }
}
