// The WebGL2 renderer for the Old Harbour. Owns the GL context, programs,
// baked textures, the scene, an orbit camera, and a render loop whose lighting
// follows the simulation's time-of-day and weather. Pure vanilla WebGL2.

import { getContext, createProgram, createTexture } from "./gl.js";
import { M, V } from "./mat.js";
import { buildHarbourScene } from "./scene.js";
import { buildAvatar, avatarPose } from "./avatar.js";
import { citizenSprite, ROLES } from "./sprites.js";
import { makeRng } from "../core/rng.js";
import * as Tex from "./textures.js";

const clampN = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

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

// Camera-facing billboard shader: an upright quad that always turns to the
// camera (cylindrical), textured with a citizen sprite, fogged to match the
// scene. Alpha-blended; the soft sprite edges read against the harbour haze.
const BILL_VERT = `#version 300 es
precision highp float;
in vec2 aCorner; in vec2 aUv;
uniform mat4 uProj, uView;
uniform vec3 uCenter, uCamRight;
uniform vec2 uSize;
out vec2 vUv;
void main(){
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 pos = uCenter + uCamRight * (aCorner.x * uSize.x) + up * ((aCorner.y + 0.5) * uSize.y);
  vUv = aUv;
  gl_Position = uProj * uView * vec4(pos, 1.0);
}`;

const BILL_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec3 uTint, uFogColor;
uniform float uFog;
out vec4 outColor;
void main(){
  vec4 t = texture(uTex, vUv);
  if (t.a < 0.04) discard;
  vec3 c = t.rgb * uTint;
  c = mix(c, uFogColor, uFog);
  outColor = vec4(c, t.a);
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

    this.blackTex = black;

    // The player avatar (box figure) lit by the main program.
    this.avatar = buildAvatar(gl, this.program.attribs);
    this.player = { pos: [0, 8], facing: Math.PI, walkPhase: 0, amp: 0, moving: false }; // pos = [x, z]

    // Camera-facing citizen billboards: one sprite texture per role.
    this.billProgram = createProgram(gl, BILL_VERT, BILL_FRAG);
    this.billQuad = this._makeBillQuad();
    this.citizens = ROLES.map((role, i) => {
      const cnv = citizenSprite(11 + i * 7, role);
      return { tex: createTexture(gl, cnv, { repeat: false, flipY: true }), aspect: cnv.width / cnv.height };
    });

    // The scene + crowd are built per-district (seed + water flag). Default to
    // the Old Harbour so the establishing view matches the home arc.
    this.sceneSeed = 0xC05C;
    this.sceneOpts = { water: true };
    this.scene = null;
    this.people = [];
    this.setScene(this.sceneSeed, this.sceneOpts);

    // camera state (orbit) — an establishing 3/4 shot looking down the street
    this.cam = { azimuth: 0.42, elevation: 0.46, dist: 88, target: [0, 8, 0], autoSpin: 0.012 };
    this.mode = "orbit";
    this.env = computeEnv(8 * 60, "clear");
    this._dragging = false;
    this._last = [0, 0];
    this._time = 0;
    this._raf = null;
    this._active = false;
    this.keys = new Set();
    this._onModeChange = null;
    this._wireInput();

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
  }

  // A unit quad (corners in [-0.5,0.5]) used for every billboard, instanced via
  // per-draw uniforms. Its own tiny vertex format: aCorner(2) + aUv(2).
  _makeBillQuad() {
    const gl = this.gl;
    const A = this.billProgram.attribs;
    const verts = new Float32Array([
      -0.5, -0.5, 0, 0,
      0.5, -0.5, 1, 0,
      0.5, 0.5, 1, 1,
      -0.5, 0.5, 0, 1,
    ]);
    const idx = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(A.aCorner);
    gl.vertexAttribPointer(A.aCorner, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(A.aUv);
    gl.vertexAttribPointer(A.aUv, 2, gl.FLOAT, false, 16, 8);
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: idx.length };
  }

  // Rebuild the world for a district: a fresh skyline from `seed`, water on/off,
  // and a re-scattered crowd. Disposes the previous scene's VAOs. Cheap enough
  // to call on each arrival; the player resets to the street centre.
  setScene(seed, opts = {}) {
    if (!this.ok) return;
    const gl = this.gl;
    if (this.scene) for (const it of this.scene.items) gl.deleteVertexArray(it.mesh.vao);
    this.sceneSeed = seed >>> 0;
    this.sceneOpts = { water: opts.water !== false };
    const rng = makeRng(this.sceneSeed);
    this.scene = buildHarbourScene(gl, this.program.attribs, this.mats, rng, this.sceneOpts);
    this.people = this._placePeople(rng);
    this.player.pos = [0, 8];
    this.player.facing = Math.PI;
    this.player.amp = 0;
    this.player.walkPhase = 0;
  }

  // Scatter citizens along both kerbs of the road, each a random role/seed with
  // a gentle idle sway phase. Deterministic from the scene rng.
  _placePeople(rng) {
    const people = [];
    for (let i = 0; i < 18; i++) {
      const side = rng.float() > 0.5 ? 1 : -1;
      const x = side * (6.5 + rng.float() * 3.5);
      const z = -64 + i * 7.4 + rng.float() * 3;
      const ci = rng.int(0, this.citizens.length - 1);
      const h = 4.0 + rng.float() * 0.7;
      people.push({ pos: [x, z], ci, height: h, phase: rng.float() * 6.28, sway: 0.06 + rng.float() * 0.08 });
    }
    return people;
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
    const pt = (e) => [e.clientX, e.clientY];
    const down = (e) => { if (this.mode === "follow") return; this._dragging = true; this.cam.autoSpin = 0; this._last = pt(e); };
    const move = (e) => {
      if (!this._dragging || this.mode === "follow") return;
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
      if (this.mode === "follow") return;
      e.preventDefault();
      this.cam.dist = Math.min(Math.max(this.cam.dist + Math.sign(e.deltaY) * 4, 26), 110);
    }, { passive: false });

    // Keyboard: drive the avatar, toggle the camera mode. Only while the city
    // viewport is the active screen and the user isn't typing into a field.
    const MOVE = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];
    window.addEventListener("keydown", (e) => {
      if (!this._active) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (MOVE.includes(k)) { this.keys.add(k); e.preventDefault(); }
      else if (k === "c" || k === "f") { this.toggleMode(); }
    });
    window.addEventListener("keyup", (e) => { this.keys.delete(e.key.toLowerCase()); });
  }

  // Public: switch / toggle camera modes ("orbit" establishing shot ↔ "follow"
  // third-person walk). Fires _onModeChange so the UI label can track it.
  setMode(mode) {
    if (mode === this.mode) return this.mode;
    this.mode = mode;
    if (mode === "follow") {
      this.cam.autoSpin = 0;
    } else {
      this.cam.target = [0, 8, 0];
      this.cam.dist = 88;
      this.cam.elevation = 0.46;
      this.cam.autoSpin = 0.012;
    }
    if (this._onModeChange) this._onModeChange(this.mode);
    return this.mode;
  }
  toggleMode() { return this.setMode(this.mode === "follow" ? "orbit" : "follow"); }

  // Advance the avatar from held keys (camera-relative movement, clamped to the
  // street corridor); ease the walk amplitude in/out so stops settle smoothly.
  _updatePlayer(dt) {
    const p = this.player;
    let mx = 0, mz = 0;
    if (this._active) {
      const k = this.keys;
      if (k.has("w") || k.has("arrowup")) mz += 1;
      if (k.has("s") || k.has("arrowdown")) mz -= 1;
      if (k.has("d") || k.has("arrowright")) mx += 1;
      if (k.has("a") || k.has("arrowleft")) mx -= 1;
    }
    if (mx || mz) {
      const az = this.cam.azimuth;
      const fwd = [-Math.sin(az), -Math.cos(az)];   // horizontal: away from camera
      const right = [Math.cos(az), -Math.sin(az)];  // horizontal: camera right
      let dx = fwd[0] * mz + right[0] * mx;
      let dz = fwd[1] * mz + right[1] * mx;
      const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      const speed = 11;
      p.pos[0] = clampN(p.pos[0] + dx * speed * dt, -9, 9);
      p.pos[1] = clampN(p.pos[1] + dz * speed * dt, -72, 72);
      p.facing = Math.atan2(dx, dz);
      p.walkPhase += dt * 9;
      p.amp = Math.min(p.amp + dt * 6, 0.7);
      p.moving = true;
    } else {
      p.amp = Math.max(p.amp - dt * 6, 0);
      if (p.amp < 0.01) p.walkPhase = 0;
      p.moving = false;
    }
  }

  // In follow mode, ease the orbit camera to trail behind the avatar.
  _updateCamera(dt) {
    if (this.mode !== "follow") return;
    const p = this.player.pos;
    const ease = (cur, tgt, rate) => cur + (tgt - cur) * Math.min(dt * rate, 1);
    this.cam.target[0] = ease(this.cam.target[0], p[0], 5);
    this.cam.target[1] = ease(this.cam.target[1], 2.6, 5);
    this.cam.target[2] = ease(this.cam.target[2], p[1], 5);
    let d = (this.player.facing + Math.PI) - this.cam.azimuth;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    this.cam.azimuth += d * Math.min(dt * 3, 1);
    this.cam.elevation = ease(this.cam.elevation, 0.2, 3);
    this.cam.dist = ease(this.cam.dist, 21, 3);
  }

  start() {
    if (!this.ok) return;
    this._active = true;
    if (this._raf) return;
    let prev = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      this._time += dt;
      this._updatePlayer(dt);
      this._updateCamera(dt);
      if (this.cam.autoSpin) this.cam.azimuth += this.cam.autoSpin * dt;
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._active = false;
    this.keys.clear();
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

    // The avatar shares the main program but is flat-shaded (no emissive/spec).
    this._drawAvatar(U);
    gl.bindVertexArray(null);

    // Citizen billboards in their own program, alpha-blended over the scene.
    this._drawPeople(proj, view, eye);
  }

  _drawAvatar(U) {
    const gl = this.gl;
    const p = this.player;
    const { bobY, parts } = avatarPose(this.avatar, p.walkPhase, p.amp);
    const world = M.trs([p.pos[0], bobY, p.pos[1]], p.facing);

    // flat material setup, shared by every part
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.blackTex);
    gl.uniform3fv(U.uEmissiveColor, [0, 0, 0]);
    gl.uniform2fv(U.uUvScroll, [0, 0]);
    gl.uniform1f(U.uSpecular, 0);
    gl.uniform1f(U.uShininess, 0);
    gl.bindVertexArray(this.avatar.cube.vao);
    for (const part of parts) {
      const model = M.multiply(world, part.local);
      gl.uniformMatrix4fv(U.uModel, false, model);
      gl.uniformMatrix3fv(U.uNormalMat, false, M.normalMat3(model));
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, part.tex);
      gl.drawElements(gl.TRIANGLES, this.avatar.cube.count, gl.UNSIGNED_SHORT, 0);
    }
  }

  _drawPeople(proj, view, eye) {
    const gl = this.gl;
    const { ambient, sunColor, sky, fogDensity } = this.env;
    // camera-facing right vector (horizontal), for cylindrical billboards
    const fwd = V.norm([this.cam.target[0] - eye[0], 0, this.cam.target[2] - eye[2]]);
    const right = V.norm(V.cross(fwd, [0, 1, 0]));
    const tint = [
      Math.min(ambient[0] + sunColor[0] * 0.6, 1.25),
      Math.min(ambient[1] + sunColor[1] * 0.6, 1.25),
      Math.min(ambient[2] + sunColor[2] * 0.6, 1.25),
    ];

    const { prog, uniforms: U } = this.billProgram;
    gl.useProgram(prog);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniform3fv(U.uCamRight, right);
    gl.uniform3fv(U.uTint, tint);
    gl.uniform3fv(U.uFogColor, sky);
    gl.uniform1i(U.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);   // don't write depth: sprites blend, scene already wrote it
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(this.billQuad.vao);

    // sort far→near so alpha blending composites correctly
    const order = this.people
      .map((q, i) => ({ i, d: (q.pos[0] - eye[0]) ** 2 + (q.pos[1] - eye[2]) ** 2 }))
      .sort((a, b) => b.d - a.d);

    for (const { i } of order) {
      const q = this.people[i];
      const c = this.citizens[q.ci];
      const w = q.height * c.aspect;
      const sway = Math.sin(this._time * 0.8 + q.phase) * q.sway;
      const cx = q.pos[0] + right[0] * sway;
      const cz = q.pos[1] + right[2] * sway;
      const dist = Math.hypot(cx - eye[0], cz - eye[2]);
      const fog = 1 - Math.exp(-((dist * fogDensity) ** 2));
      gl.uniform3f(U.uCenter, cx, 0, cz);
      gl.uniform2f(U.uSize, w, q.height);
      gl.uniform1f(U.uFog, Math.min(fog, 1));
      gl.bindTexture(gl.TEXTURE_2D, c.tex);
      gl.drawElements(gl.TRIANGLES, this.billQuad.count, gl.UNSIGNED_SHORT, 0);
    }

    gl.bindVertexArray(null);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.CULL_FACE);
  }

  dispose() {
    this.stop();
  }
}
