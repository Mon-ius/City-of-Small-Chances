// The Old Harbour, built procedurally in Three.js: a cobbled quayside street with
// the harbour water on the west, a row of lived-in buildings on the east, street
// lamps, a market stall, crates and bollards, a moored boat — under a graded dawn
// sky with a warm low sun and soft shadows. No textures load over the network;
// everything is geometry + materials so it renders the instant the module does.
//
// buildWorld(scene) returns the play-area bounds (for clamping the player), an
// array of ambient citizens — both walkers and the standing crowd, all real rounded
// bodies — and a set of camera-facing billboards (props, birds, boats, water FX) the
// frame loop turns to face the camera.

import * as THREE from "three";
import { createFigure } from "./player.js";
import { INTERACTABLES } from "./interactions.js";

const COLORS = {
  cobble: 0x2b2f36,
  street: 0x363b43,
  water: 0x223a4a,
  wall: 0x6f6357,
  quay: 0x4a4640,
  roof: 0x2a2622,
  lampOn: 0xffd27d,
};

// ── Baked art (Batch 1): painterly textures generated with GPT-Image-2 and
// post-processed into albedo + normal + packed ORM (R=AO, G=roughness, B=metal)
// per the glTF convention Three.js samples (roughness←G, metalness←B). Relative
// path keeps it working under the GitHub Pages project sub-path.
const TEX_DIR = "./assets/textures/harbour/";
const SIGNAGE_DIR = "./assets/sprites/signage/";
const SKY_DIR = "./assets/sprites/sky/";
const PROP_SPRITE_DIR = "./assets/sprites/props/";
const DECAL_DIR = "./assets/sprites/decals/";
const FX_DIR = "./assets/sprites/fx/";
const _texLoader = new THREE.TextureLoader();

function surfaceTex(name, { srgb = false, repeat = [1, 1] } = {}) {
  const t = _texLoader.load(TEX_DIR + name);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}

// A tiled PBR surface. roughness/metalness ride on the ORM map's G/B channels,
// so the scalar multipliers stay at 1 unless an override says otherwise. `prefix`
// selects the asset family — ENV_Harbour for environment, PROP_Harbour for props.
function surfaceMaterial(object, repeat, extra = {}, prefix = "ENV_Harbour") {
  const orm = surfaceTex(`${prefix}_${object}_orm.png`, { repeat });
  return new THREE.MeshStandardMaterial({
    map: surfaceTex(`${prefix}_${object}_albedo.png`, { srgb: true, repeat }),
    normalMap: surfaceTex(`${prefix}_${object}_normal.png`, { repeat }),
    roughnessMap: orm,
    metalnessMap: orm,
    roughness: 1,
    metalness: 1,
    ...extra,
  });
}

// Convenience: a Batch-2 prop material (PROP_Harbour_<object>_*).
function propMaterial(object, repeat = [1, 1], extra = {}) {
  return surfaceMaterial(object, repeat, extra, "PROP_Harbour");
}

// One shared material for the 4×4 window atlas; a cell is chosen per window by
// remapping that plane's UVs (so it's a single texture upload, not 16). The
// emissive map glows the lit panes warm at dusk.
function windowAtlasMaterial() {
  const albedo = _texLoader.load(TEX_DIR + "ENV_Harbour_WindowAtlas_albedo.png");
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.anisotropy = 8;
  const emissive = _texLoader.load(TEX_DIR + "ENV_Harbour_WindowAtlas_emissive.png");
  emissive.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({
    map: albedo,
    emissive: 0xffffff,
    emissiveMap: emissive,
    emissiveIntensity: 1.15,
    roughness: 0.55,
    metalness: 0.0,
  });
}

// A window quad facing the street (−x), with its UVs pinned to atlas cell `cell`
// (0..15, row-major from the top-left). winW runs along z, winH along y.
function windowPlane(winW, winH, cell, material) {
  const geo = new THREE.PlaneGeometry(winW, winH);
  const cx = cell % 4, cy = Math.floor(cell / 4);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, cx * 0.25 + u * 0.25, (3 - cy) * 0.25 + v * 0.25);
  }
  uv.needsUpdate = true;
  const m = new THREE.Mesh(geo, material);
  m.rotation.y = -Math.PI / 2;
  return m;
}

// ── Painted alpha-cutout plane (Batch 6 signage & decals): chroma-keyed art on a
// flat quad, lit lightly with a touch of self-emission so the motif stays readable
// after dark (the same trick the citizen billboards use). Default faces +z; the
// caller rotates it to its wall. Used for the noodle-stall sign and board notes.
function cutoutPlane(url, w, h, { emissive = 0.25, alphaTest = 0.45 } = {}) {
  const map = _texLoader.load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: emissive,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

// ── A flat grime decal laid on the ground (Batch 39, DECAL_Ground_*): a soft-edged
// alpha plane lying just above the boardwalk to break the ground tiling and let the
// quay read as worked-on — puddles, oil, moss, scattered debris. Unlike cutoutPlane
// it uses NO alphaTest (the feathered edge must stay soft, not a hard sticker rim)
// and depthWrite off + a polygon offset so it never z-fights the planks. Lit by the
// scene (MeshStandard) so a low-roughness puddle catches a wet sun-glint. renderOrder
// −2 keeps the citizens' contact-shadow blobs (−1) reading on top.
function groundDecal(url, size, x, z, rot = 0, { rough = 0.92, opacity = 1 } = {}) {
  const map = _texLoader.load(url);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    opacity,
    depthWrite: false,
    roughness: rough,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.rotation.z = rot;
  plane.position.set(x, 0.03, z);
  plane.renderOrder = -2;
  plane.receiveShadow = true;
  return plane;
}

// ── Drifting cloud billboards (Batch 6): painted neutral cloud cutouts placed in
// a band near the horizon, INSIDE the sky dome (which the day cycle still paints
// every frame — these add to it, they do not replace it). They are unlit
// (MeshBasic) so tintClouds() can multiply them from near-white at noon, through
// warm at dusk, to near-invisible against the night sky. main.js drifts them
// along x (wrapping) and turns each to face the camera.
function buildClouds(scene) {
  const defs = [
    { tex: "A", x: -120, y: 52, z:  -70, s: 96 },
    { tex: "B", x:   40, y: 44, z: -150, s: 128 },
    { tex: "C", x:  130, y: 60, z:   30, s: 80 },
    { tex: "D", x:  -60, y: 40, z:  140, s: 72 },
    { tex: "A", x:   90, y: 56, z:  120, s: 104 },
    { tex: "B", x: -150, y: 48, z:   60, s: 116 },
    { tex: "C", x:   10, y: 66, z: -120, s: 88 },
  ];
  const clouds = [];
  const wrap = 200; // x loops within ±wrap so clouds never run out
  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const map = _texLoader.load(`${SKY_DIR}FX_Sky_Cloud_${d.tex}.png`);
    map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(d.s, d.s * 0.5),
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        fog: false,
        opacity: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(d.x, d.y, d.z);
    scene.add(mesh);
    clouds.push({ mesh, speed: 0.5 + (i % 3) * 0.35, wrap });
  }
  return clouds;
}

// A soft round contact shadow, so a billboard reads as planted rather than
// floating. One radial-alpha canvas texture is shared by every blob.
let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(0,0,0,0.5)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  _shadowTex = new THREE.CanvasTexture(c);
  _shadowTex.colorSpace = THREE.SRGBColorSpace;
  return _shadowTex;
}

// A soft round smoke puff — a white radial-alpha canvas shared by every chimney
// puff sprite (one texture upload). Each puff keeps its OWN material so its
// opacity can fade independently as it rises and thins. Cf. shadowTexture above.
let _smokeTex = null;
function smokeTexture() {
  if (_smokeTex) return _smokeTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  _smokeTex = new THREE.CanvasTexture(c);
  _smokeTex.colorSpace = THREE.SRGBColorSpace;
  return _smokeTex;
}

// A brick chimney on a home's roof, plus a gentle plume of soft smoke. The puffs
// are camera-facing sprites (one shared soft texture) that rise, widen, drift and
// fade on a looped per-puff lifecycle — animated in main.js from a single clock.
// The puffs are PHASE-staggered, so the column shows smoke at every height at
// once and reads as a continuous plume even in a frozen frame. World-side only —
// no player impact. Deterministic params seeded from the chimney's position + i
// (no Math.random), so the same chimney always smokes the same way.
function addChimneySmoke(scene, x, z, h, w, d, plumes) {
  const cx = x - w * 0.12, cz = z + d * 0.16;
  const roofTop = h + 0.3;
  const stack = box(0.55, 1.1, 0.55, 0x6e5a48, { roughness: 1.0 }); // weathered brick
  stack.position.set(cx, roofTop + 0.55, cz);
  scene.add(stack);
  const cap = box(0.64, 0.14, 0.64, 0x2a2622, { cast: false }); // dark sooted mouth
  cap.position.set(cx, roofTop + 1.12, cz);
  scene.add(cap);

  const mouthY = roofTop + 1.2;
  const tex = smokeTexture();
  const puffs = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xb9bec8, transparent: true, depthWrite: false, opacity: 0 });
    const sp = new THREE.Sprite(mat);
    sp.position.set(cx, mouthY, cz);
    scene.add(sp);
    const seed = (((cx * 1.7 + cz * 2.3 + i * 0.37) % 1) + 1) % 1;
    puffs.push({ sprite: sp, phase: i / N + seed * 0.12, speed: 0.06 + seed * 0.03, sway: 0.6 + seed * 0.5 });
  }
  plumes.push({ mouthX: cx, mouthY, mouthZ: cz, puffs });
}

// Real volumetric steam curling off Mei's hot noodle bowl (spr-042) — the SAME soft
// camera-facing sprite puffs and the SAME main.js plume tick as the chimneys, but tuned
// tiny (a short rise, a tight curl, a pale near-white vapour) and pushed to the shared
// `smokePlumes` array with its own column-tuning fields. REPLACES the old flat
// FX_Smoke_NoodleSteam billboard — vapour you can walk around, not a faced picture. The
// puffs are phase-staggered so the wisp reads continuous even in a frozen frame.
// Deterministic per-puff seeds (no Math.random), so the bowl always steams the same way.
function addBowlSteam(scene, x, y, z, plumes) {
  const tex = smokeTexture();
  const puffs = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xeef3f6, transparent: true, depthWrite: false, opacity: 0 });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    scene.add(sp);
    const seed = (((x * 2.1 + z * 1.3 + i * 0.53) % 1) + 1) % 1;
    puffs.push({ sprite: sp, phase: i / N + seed * 0.1, speed: 0.12 + seed * 0.05, sway: 1.1 + seed * 0.7 });
  }
  // A short, tight, pale column — overrides the chimney defaults in the main.js plume tick.
  plumes.push({ mouthX: x, mouthY: y, mouthZ: z, puffs, rise: 0.62, driftBase: 0.02, driftGain: 0.1, scaleBase: 0.1, scaleGain: 0.22, maxOpacity: 0.5 });
}

// Real rooftop woodsmoke (spr-043) — the three tall-roof plumes that USED to be flat
// luminance-alpha billboards (PROP_Smoke_Column/Plume/Wisp, Batch 49) rebuilt as soft
// sprite-puff columns on the SAME shared plume system as the home chimneys and Mei's bowl
// steam — retiring the LAST faced-picture smoke and closing the "two smoke systems" debt
// (one rising-puff system now, ticked in one place). The puffs stand high over the
// rooflines, so — exactly as the old billboards did — they keep depthTest OFF + a high
// renderOrder to draw over the far sky dome and the day-cycle sky-tint spheres (which sit
// at the far radius and would otherwise depth-occlude a thing this far out); nothing is
// ever physically in front of them up there. SpriteMaterial is unlit, so they read pale by
// day and by night with no emissive map, just as the billboards were tuned to. Deterministic
// per-puff seeds from position + i (no Math.random). `o` carries the column tuning + puff
// count so each of the three roofs gets its own size (busy kitchen column → faint wisp).
function addRoofSmoke(scene, x, y, z, plumes, o) {
  const tex = smokeTexture();
  const puffs = [];
  for (let i = 0; i < o.n; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0xb9bec8, transparent: true, depthWrite: false, depthTest: false, opacity: 0 });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.renderOrder = 4; // over the sky dome + sky-tint spheres (renderOrder 1–3), as the billboards were
    scene.add(sp);
    const seed = (((x * 1.9 + z * 2.7 + i * 0.41) % 1) + 1) % 1;
    puffs.push({ sprite: sp, phase: i / o.n + seed * 0.12, speed: 0.05 + seed * 0.03, sway: 0.5 + seed * 0.5 });
  }
  plumes.push({ mouthX: x, mouthY: y, mouthZ: z, puffs, rise: o.rise, driftBase: 0.12, driftGain: o.drift, scaleBase: o.scaleBase, scaleGain: o.scaleGain, maxOpacity: o.maxOpacity });
}

function box(w, h, d, color, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.9,
    metalness: opts.metalness ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  if (opts.cast !== false) mesh.castShadow = true;
  if (opts.receive !== false) mesh.receiveShadow = true;
  return mesh;
}

// A building: a coloured block, a darker roof, and a grid of warm windows on the
// street-facing (west, −x) wall so it reads as inhabited.
function makeBuilding(x, z, w, h, d, bodyMat, windowMat, roofMat) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = h / 2;
  g.add(body);

  // Painted clay-tile lid (Batch 11) if a roof material is supplied; else the
  // flat fallback colour. The shared tiled material reads as rows from above.
  const roof = roofMat
    ? new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), roofMat)
    : box(w + 0.3, 0.3, d + 0.3, COLORS.roof);
  roof.castShadow = true;
  roof.receiveShadow = true;
  roof.position.y = h + 0.15;
  g.add(roof);

  // Windows on the −x face, each pinned to one cell of the painted window atlas.
  const cols = Math.max(2, Math.floor(d / 1.6));
  const rows = Math.max(2, Math.floor(h / 1.7));
  const winW = 0.5, winH = 0.7;
  const faceX = -w / 2 - 0.05;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = (r * 4 + c * 3 + Math.floor(Math.abs(x) + Math.abs(z))) % 16;
      const win = windowPlane(winW, winH, cell, windowMat);
      const zz = (c - (cols - 1) / 2) * (d / cols);
      const yy = 1.2 + r * ((h - 1.6) / Math.max(1, rows - 1 || 1));
      win.position.set(faceX, Math.min(yy, h - 0.8), zz);
      g.add(win);
    }
  }
  return g;
}

function makeLamp(x, z, metalMat) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.0, 10), metalMat);
  pole.castShadow = true;
  pole.position.y = 1.5;
  g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), metalMat);
  arm.castShadow = true;
  arm.position.set(0.22, 3.0, 0);
  g.add(arm);
  const head = box(0.26, 0.2, 0.26, 0x2a2d33, {
    emissive: COLORS.lampOn,
    emissiveIntensity: 0.15, // dim by day; a future iteration drives this off the clock
    cast: false,
  });
  head.position.set(0.42, 2.95, 0);
  head.name = "lamp-head";
  g.add(head);
  return { group: g, head };
}

// ── Real-body harbour animals (spr-022) ────────────────────────────────────────
// The loop's own ask — "real body instead of faced picture with fake 3D" — applied
// to the cobble animals: the stray dog and the quay cat were camera-facing
// billboards; here they become real rounded geometry in the figure aesthetic
// (smooth capsules/spheres), with a FIXED facing like the citizen figures (no
// billboarding) and a small idle. Each returns { root, update(t) } collected into
// world.critters and ticked from main.js's critter clock (deterministic — no
// Math.random). spr-025 extends this to the pigeon clusters too (buildPigeon) —
// a real-body flock of peckers replaces the last ground-animal cutouts.

// A stray dog hoping for scraps: a tan body on four legs, a snouted head with
// drooping ears, and a tail that wags from the hip. Built facing +x in local space;
// root.rotation.y aims it.
function buildDog(x, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = facing;
  const coat = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.85, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5c4329, roughness: 0.9, metalness: 0 });
  const mk = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; root.add(m); return m; };

  const body = mk(new THREE.CapsuleGeometry(0.13, 0.34, 6, 12), coat, 0, 0.42, 0);
  body.rotation.z = Math.PI / 2;                                  // lie the capsule along X
  mk(new THREE.CapsuleGeometry(0.075, 0.12, 5, 10), coat, 0.26, 0.5, 0).rotation.z = Math.PI / 2.6; // neck, rising
  const head = mk(new THREE.SphereGeometry(0.12, 14, 12), coat, 0.41, 0.57, 0);
  mk(new THREE.CapsuleGeometry(0.05, 0.1, 5, 10), coat, 0.53, 0.53, 0).rotation.z = Math.PI / 2; // snout
  mk(new THREE.SphereGeometry(0.03, 8, 8), dark, 0.6, 0.54, 0);   // wet nose
  const earGeo = new THREE.CapsuleGeometry(0.025, 0.07, 4, 8);
  mk(earGeo, dark, 0.36, 0.61, 0.085).rotation.x = 0.5;           // drooping ears
  mk(earGeo, dark, 0.36, 0.61, -0.085).rotation.x = -0.5;

  const legGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.34, 8);
  for (const [lx, lz] of [[0.19, 0.1], [0.19, -0.1], [-0.17, 0.1], [-0.17, -0.1]]) mk(legGeo, coat, lx, 0.17, lz);

  const tailPivot = new THREE.Group(); tailPivot.position.set(-0.3, 0.52, 0); root.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.2, 4, 8), coat);
  tail.position.set(-0.07, 0.06, 0); tail.rotation.z = -0.8; tail.castShadow = true; tailPivot.add(tail);

  return {
    root,
    update(t) {
      tailPivot.rotation.y = Math.sin(t * 8) * 0.5;              // a hopeful wag
      head.position.y = 0.57 + Math.sin(t * 1.3) * 0.02;         // the odd sniff for scraps
    },
  };
}

// A quay cat settled in a 'loaf' on the sea-wall: a squashed body, a round head with
// pricked ears, and a long tail laid along the coping that flicks at the tip. Faces
// the water; head turns slowly to watch it.
function buildCat(x, z, baseY, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, baseY, z);
  root.rotation.y = facing;
  const fur = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.9, metalness: 0 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.9, metalness: 0 });
  const mk = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; root.add(m); return m; };

  const body = mk(new THREE.SphereGeometry(0.13, 16, 12), fur, 0, 0.11, 0);
  body.scale.set(1.5, 0.85, 1.0);                                // the loaf
  mk(new THREE.SphereGeometry(0.075, 10, 8), fur, 0.13, 0.07, 0).scale.set(1, 0.7, 1.4); // tucked front paws
  const headPivot = new THREE.Group(); headPivot.position.set(0.17, 0.2, 0); root.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), fur); head.castShadow = true; headPivot.add(head);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pale); muzzle.position.set(0.06, -0.02, 0); muzzle.scale.set(0.7, 0.7, 0.9); headPivot.add(muzzle);
  const earGeo = new THREE.ConeGeometry(0.035, 0.07, 6);
  const earL = new THREE.Mesh(earGeo, fur); earL.position.set(-0.01, 0.08, 0.05); earL.rotation.x = -0.2; headPivot.add(earL);
  const earR = new THREE.Mesh(earGeo, fur); earR.position.set(-0.01, 0.08, -0.05); earR.rotation.x = 0.2; headPivot.add(earR);

  const tailPivot = new THREE.Group(); tailPivot.position.set(-0.16, 0.1, 0.02); root.add(tailPivot);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.26, 4, 8), fur);
  tail.position.set(-0.1, 0.02, 0.08); tail.rotation.z = 1.4; tail.rotation.y = 0.5; tail.castShadow = true; tailPivot.add(tail);

  return {
    root,
    update(t) {
      tailPivot.rotation.y = 0.3 + Math.sin(t * 2.2) * 0.28;     // a slow tail flick
      headPivot.rotation.y = Math.sin(t * 0.5) * 0.3;            // watching the water
    },
  };
}

// A grey heron standing sentinel on the sea-wall (spr-023): two thread-thin legs, an
// angled body with folded wings, a long S-curved neck (a pivot carrying two capsules)
// to a small head with a dagger beak. Mostly still — the head scans the water slowly.
// Built facing +x (beak forward) in local space; root.rotation.y aims it.
function buildHeron(x, z, baseY, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, baseY, z);
  root.rotation.y = facing;
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.9, metalness: 0 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd7dce0, roughness: 0.9, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3c4147, roughness: 0.9, metalness: 0 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xd9a23a, roughness: 0.6, metalness: 0 });
  const mk = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };

  const legGeo = new THREE.CylinderGeometry(0.016, 0.014, 0.5, 6);   // feet at coping (local y0) up to body
  mk(legGeo, dark, 0.02, 0.25, 0.05);
  mk(legGeo, dark, 0.02, 0.25, -0.05);
  const body = mk(new THREE.SphereGeometry(0.13, 14, 12), grey, 0, 0.6, 0);
  body.scale.set(1.5, 0.95, 0.85); body.rotation.z = 0.18;          // angled teardrop
  mk(new THREE.CapsuleGeometry(0.05, 0.18, 4, 8), grey, -0.02, 0.6, 0.105).rotation.z = Math.PI / 2; // folded wings
  mk(new THREE.CapsuleGeometry(0.05, 0.18, 4, 8), grey, -0.02, 0.6, -0.105).rotation.z = Math.PI / 2;
  mk(new THREE.ConeGeometry(0.06, 0.18, 6), grey, -0.22, 0.62, 0).rotation.z = -Math.PI / 2;          // tail

  const neck = new THREE.Group(); neck.position.set(0.1, 0.68, 0); root.add(neck);
  mk(new THREE.CapsuleGeometry(0.028, 0.22, 4, 8), pale, 0.0, 0.13, 0, neck).rotation.z = -0.25;       // lower neck rising
  mk(new THREE.CapsuleGeometry(0.026, 0.16, 4, 8), pale, 0.085, 0.3, 0, neck).rotation.z = -0.95;      // upper neck forward
  mk(new THREE.SphereGeometry(0.05, 10, 8), grey, 0.18, 0.4, 0, neck);                                 // head
  mk(new THREE.CapsuleGeometry(0.012, 0.16, 4, 6), beakMat, 0.30, 0.4, 0, neck).rotation.z = Math.PI / 2; // dagger beak
  mk(new THREE.CapsuleGeometry(0.008, 0.08, 3, 6), dark, 0.12, 0.46, 0, neck).rotation.z = -1.2;       // crest plume

  return {
    root,
    update(t) { neck.rotation.y = Math.sin(t * 0.4) * 0.5; }, // the sentinel scans the water
  };
}

// A mallard floating on the near water (spr-023): only the upper body shows (the
// paddling feet are below the surface). A rounded body, a domed head on a short neck,
// a flat bill. Bobs gently on the swell and drifts its heading. `drake` picks the
// green-headed male vs the brown hen. Built facing +x (bill forward).
function buildDuck(x, z, wl, facing = 0, drake = true, phase = 0) {
  const root = new THREE.Group();
  root.position.set(x, wl, z);
  root.rotation.y = facing;
  const bodyMat = new THREE.MeshStandardMaterial({ color: drake ? 0x6e5a3c : 0x8a7350, roughness: 0.92, metalness: 0 });
  const headMat = new THREE.MeshStandardMaterial({ color: drake ? 0x1f5e37 : 0x6b573a, roughness: 0.85, metalness: 0 });
  const billMat = new THREE.MeshStandardMaterial({ color: 0xd9b23a, roughness: 0.6, metalness: 0 });
  const mk = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; root.add(m); return m; };

  const body = mk(new THREE.SphereGeometry(0.12, 14, 12), bodyMat, 0, 0.08, 0);
  body.scale.set(1.6, 0.8, 1.0);                                    // a duck-boat hull
  mk(new THREE.ConeGeometry(0.05, 0.16, 6), bodyMat, -0.2, 0.12, 0).rotation.z = -Math.PI / 2.4; // perky tail
  mk(new THREE.SphereGeometry(0.075, 12, 10), headMat, 0.17, 0.17, 0);                            // head
  mk(new THREE.BoxGeometry(0.09, 0.03, 0.06), billMat, 0.25, 0.15, 0);                            // flat bill

  return {
    root,
    update(t) {
      root.position.y = wl + Math.sin(t * 1.5 + phase) * 0.015;     // bob on the swell
      root.rotation.y = facing + Math.sin(t * 0.6 + phase) * 0.13;  // drift the heading
    },
  };
}

// A cormorant perched with its wings half-spread to dry (spr-024) — the bird's
// signature heraldic pose, because its feathers aren't waterproof. An oily near-black
// body held upright, a snaky neck and hooked bill, a yellow gular throat, and two broad
// feather fans splayed out and swept back. Built facing +x (bill forward); the wings
// breathe open and shut a touch and the head turns as it dries. Replaces the last bird
// billboard on the water (Batch 60 `PROP_Bird_Cormorant`).
function buildCormorant(x, z, baseY, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, baseY, z);
  root.rotation.y = facing;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: 0.6, metalness: 0.2 });   // oily near-black
  const wingMat = new THREE.MeshStandardMaterial({ color: 0x2f3437, roughness: 0.7, metalness: 0.12 });  // wings a touch lighter
  const gularMat = new THREE.MeshStandardMaterial({ color: 0xc7a14a, roughness: 0.6, metalness: 0 });    // yellow throat
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x9a8a66, roughness: 0.5, metalness: 0 });     // horn bill
  const dark = new THREE.MeshStandardMaterial({ color: 0x16191b, roughness: 0.8, metalness: 0 });
  const mk = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };

  const legGeo = new THREE.CylinderGeometry(0.018, 0.016, 0.2, 6);  // short legs set well back
  mk(legGeo, dark, -0.04, 0.1, 0.06);
  mk(legGeo, dark, -0.04, 0.1, -0.06);

  const body = mk(new THREE.SphereGeometry(0.13, 14, 12), bodyMat, 0, 0.42, 0);
  body.scale.set(1.15, 1.55, 0.95); body.rotation.z = -0.28;       // upright, breast lifted
  mk(new THREE.ConeGeometry(0.055, 0.28, 6), bodyMat, -0.16, 0.2, 0).rotation.z = 0.9; // long tail down-back

  const neck = new THREE.Group(); neck.position.set(0.06, 0.62, 0); root.add(neck);
  mk(new THREE.CapsuleGeometry(0.035, 0.16, 4, 8), bodyMat, 0.0, 0.1, 0, neck).rotation.z = -0.15;        // neck column
  mk(new THREE.SphereGeometry(0.06, 12, 10), bodyMat, 0.06, 0.24, 0, neck);                               // head
  mk(new THREE.SphereGeometry(0.035, 8, 8), gularMat, 0.1, 0.2, 0, neck).scale.set(1, 0.8, 0.8);          // throat patch
  mk(new THREE.CapsuleGeometry(0.016, 0.13, 4, 6), beakMat, 0.2, 0.24, 0, neck).rotation.z = Math.PI / 2; // straight bill
  mk(new THREE.ConeGeometry(0.018, 0.04, 6), beakMat, 0.275, 0.225, 0, neck).rotation.z = -Math.PI / 2.2; // hooked tip

  const wing = (sign) => {           // a wing group each side, lifted out and fanned back
    const g = new THREE.Group();
    g.position.set(-0.04, 0.5, sign * 0.07);
    mk(new THREE.CapsuleGeometry(0.03, 0.34, 4, 8), wingMat, -0.05, 0, sign * 0.2, g).rotation.x = sign * Math.PI / 2; // leading edge
    const blade = mk(new THREE.SphereGeometry(0.16, 12, 10), wingMat, -0.08, -0.02, sign * 0.27, g);      // feather fan
    blade.scale.set(0.55, 0.16, 1.5);
    g.rotation.x = sign * -0.55;     // lift the tips
    g.rotation.y = sign * -0.5;      // sweep them back
    root.add(g);
    return g;
  };
  const wingL = wing(1), wingR = wing(-1);

  return {
    root,
    update(t) {
      const a = Math.sin(t * 0.5) * 0.08;            // a slow drying shuffle
      wingL.rotation.x = -0.55 - a; wingR.rotation.x = 0.55 + a;
      neck.rotation.y = Math.sin(t * 0.33 + 1) * 0.3; // the head turns as it dries
    },
  };
}

// A feral pigeon pecking the cobbles (spr-025) — the last ground-animal billboards
// (the cluster cutouts) become real little bodies. A plump body, folded wings, a flat
// fanned tail, a short neck with an iridescent sheen, a small head + beak on a pivot.
// `morph` picks blue-grey / brown-checker / pale plumage. Built facing +x. The head
// jerks down in quick pecks and turns to look around between them; pink feet on the stone.
function buildPigeon(x, z, facing = 0, morph = 0, phase = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = facing;
  const coats = [
    { body: 0x8d929b, head: 0x5e646c, wing: 0x6f757d }, // blue-grey
    { body: 0x9a8a74, head: 0x6f5f4c, wing: 0x7d6e58 }, // brown checker
    { body: 0xb8bcc2, head: 0x8a8f96, wing: 0x9aa0a6 }, // pale
  ];
  const c = coats[morph % coats.length];
  const bodyMat = new THREE.MeshStandardMaterial({ color: c.body, roughness: 0.85, metalness: 0.05 });
  const headMat = new THREE.MeshStandardMaterial({ color: c.head, roughness: 0.8, metalness: 0.05 });
  const wingMat = new THREE.MeshStandardMaterial({ color: c.wing, roughness: 0.85, metalness: 0 });
  const sheenMat = new THREE.MeshStandardMaterial({ color: 0x4f7d6a, roughness: 0.5, metalness: 0.35 }); // neck iridescence
  const beakMat = new THREE.MeshStandardMaterial({ color: 0x3a3833, roughness: 0.6, metalness: 0 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xc0675a, roughness: 0.6, metalness: 0 });   // pink feet
  const mk = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };

  const legGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.06, 5);
  mk(legGeo, legMat, 0.01, 0.03, 0.025);
  mk(legGeo, legMat, 0.01, 0.03, -0.025);

  const body = mk(new THREE.SphereGeometry(0.075, 12, 10), bodyMat, 0, 0.095, 0);
  body.scale.set(1.5, 1.0, 0.95); body.rotation.z = 0.12;          // plump, breast up
  mk(new THREE.CapsuleGeometry(0.025, 0.085, 4, 6), wingMat, -0.01, 0.105, 0.052).rotation.z = Math.PI / 2;  // folded wings
  mk(new THREE.CapsuleGeometry(0.025, 0.085, 4, 6), wingMat, -0.01, 0.105, -0.052).rotation.z = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.12, 0.012, 0.07), bodyMat, -0.12, 0.105, 0).rotation.z = 0.22;             // flat fanned tail

  const headPivot = new THREE.Group(); headPivot.position.set(0.09, 0.15, 0); root.add(headPivot);
  mk(new THREE.CapsuleGeometry(0.022, 0.04, 4, 6), sheenMat, 0, -0.02, 0, headPivot).rotation.z = -0.4;  // iridescent neck
  mk(new THREE.SphereGeometry(0.04, 10, 8), headMat, 0.03, 0.03, 0, headPivot);                          // head
  mk(new THREE.ConeGeometry(0.012, 0.035, 5), beakMat, 0.075, 0.022, 0, headPivot).rotation.z = -Math.PI / 2; // beak

  return {
    root,
    update(t) {
      const p = Math.max(0, Math.sin(t * 1.6 + phase) - 0.55) / 0.45; // quick downward pecks, mostly head-up
      headPivot.rotation.z = -p * 1.3;                                // dip the beak to the stone
      headPivot.rotation.y = (1 - p) * Math.sin(t * 0.5 + phase) * 0.5; // glance about between pecks
    },
  };
}

// A herring gull perched on the sea-wall, a lamp arm, the boat or a rooftop (spr-026):
// the perched/calling gull cutouts become real bodies. A white upright body, a grey
// mantle saddle and folded wings with black tips, a short white neck, a head with a
// dark eye and a yellow bill carrying the red gonydeal spot, on pink legs. Built facing
// +x; a `calling` bird throws its head back to cry, a perched one just scans. The phase
// is seeded from the perch position so no two move alike. The soaring/flying gulls stay
// billboards (the distant cloud/gull idiom) — only the PERCHED flock turns real.
function buildGull(x, z, baseY, facing = 0, calling = false) {
  const root = new THREE.Group();
  root.position.set(x, baseY, z);
  root.rotation.y = facing;
  const phase = x * 0.7 + z * 0.13;                 // deterministic per-perch offset
  const white = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.7, metalness: 0 });
  const mantle = new THREE.MeshStandardMaterial({ color: 0x9aa6ad, roughness: 0.8, metalness: 0 }); // grey back/wings
  const tipMat = new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.8, metalness: 0 }); // black wingtips/eye
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xe5b234, roughness: 0.5, metalness: 0 }); // yellow bill
  const redMat = new THREE.MeshStandardMaterial({ color: 0xcc3322, roughness: 0.5, metalness: 0 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0xe6a6a0, roughness: 0.6, metalness: 0 });  // pink legs
  const mk = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };

  const legGeo = new THREE.CylinderGeometry(0.012, 0.011, 0.16, 6);
  mk(legGeo, legMat, 0.0, 0.08, 0.035);
  mk(legGeo, legMat, 0.0, 0.08, -0.035);

  const body = mk(new THREE.SphereGeometry(0.12, 14, 12), white, 0, 0.24, 0);
  body.scale.set(1.35, 1.5, 1.0); body.rotation.z = -0.2;          // upright, breast out
  const saddle = mk(new THREE.SphereGeometry(0.1, 12, 10), mantle, -0.03, 0.33, 0); // grey mantle over the back
  saddle.scale.set(1.15, 0.5, 0.95);
  mk(new THREE.CapsuleGeometry(0.04, 0.18, 4, 8), mantle, -0.05, 0.27, 0.06).rotation.z = Math.PI / 2;  // folded wings
  mk(new THREE.CapsuleGeometry(0.04, 0.18, 4, 8), mantle, -0.05, 0.27, -0.06).rotation.z = Math.PI / 2;
  mk(new THREE.ConeGeometry(0.03, 0.09, 6), tipMat, -0.2, 0.25, 0.05).rotation.z = Math.PI / 2;          // black wingtips
  mk(new THREE.ConeGeometry(0.03, 0.09, 6), tipMat, -0.2, 0.25, -0.05).rotation.z = Math.PI / 2;
  mk(new THREE.BoxGeometry(0.1, 0.02, 0.09), white, -0.19, 0.26, 0);                                     // short tail

  const headPivot = new THREE.Group(); headPivot.position.set(0.08, 0.36, 0); root.add(headPivot);
  mk(new THREE.CapsuleGeometry(0.04, 0.05, 4, 8), white, 0.0, 0.0, 0, headPivot).rotation.z = -0.3;       // neck
  mk(new THREE.SphereGeometry(0.055, 12, 10), white, 0.05, 0.05, 0, headPivot);                           // head
  mk(new THREE.SphereGeometry(0.011, 6, 6), tipMat, 0.08, 0.075, 0.035, headPivot);                       // eye
  mk(new THREE.SphereGeometry(0.011, 6, 6), tipMat, 0.08, 0.075, -0.035, headPivot);
  mk(new THREE.CapsuleGeometry(0.015, 0.06, 4, 6), beakMat, 0.14, 0.04, 0, headPivot).rotation.z = Math.PI / 2; // bill
  mk(new THREE.SphereGeometry(0.009, 6, 6), redMat, 0.185, 0.022, 0, headPivot);                          // red gonydeal spot

  return {
    root,
    update(t) {
      if (calling) {
        const c = Math.max(0, Math.sin(t * 1.4 + phase));   // the long-call pulses
        headPivot.rotation.z = 0.3 + c * 0.55;              // head thrown back to cry
        headPivot.rotation.y = 0;
      } else {
        headPivot.rotation.z = 0;
        headPivot.rotation.y = Math.sin(t * 0.4 + phase) * 0.55; // scan the harbour
      }
    },
  };
}

// A gull on the wing, gliding high over the water (spr-027) — the last bird billboards
// (the soaring cutout pairs) become real bodies. A streamlined white fuselage, a grey
// back, a small head + yellow bill, a fanned tail, and two long swept wings (grey with
// dark primaries) on shoulder PIVOTS so main.js can beat them. Built facing +x = flight
// forward; main.js drives the wheel path, points the body along its velocity (so it banks
// through the turns instead of facing the camera) and flaps the wings. Returns the wing
// pivots so the caller owns the wingbeat. No legs — they're tucked up in flight.
function buildSoaringGull() {
  const root = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.7, metalness: 0 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa6ad, roughness: 0.8, metalness: 0 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x33383d, roughness: 0.8, metalness: 0 }); // black primaries
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xe5b234, roughness: 0.5, metalness: 0 });
  const mk = (geo, mat, px, py, pz, parent = root) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; parent.add(m); return m; };

  const body = mk(new THREE.SphereGeometry(0.13, 14, 12), white, 0, 0, 0); body.scale.set(1.9, 0.6, 0.55);  // streamlined fuselage
  const back = mk(new THREE.SphereGeometry(0.1, 12, 10), grey, -0.02, 0.045, 0); back.scale.set(1.7, 0.35, 0.5); // grey mantle on top
  mk(new THREE.SphereGeometry(0.06, 10, 8), white, 0.22, 0.02, 0);                                    // head
  mk(new THREE.ConeGeometry(0.02, 0.07, 5), beakMat, 0.31, 0.01, 0).rotation.z = -Math.PI / 2;        // bill
  mk(new THREE.BoxGeometry(0.16, 0.02, 0.15), white, -0.27, 0.01, 0);                                 // fanned tail
  mk(new THREE.BoxGeometry(0.04, 0.022, 0.15), grey, -0.35, 0.01, 0);                                 // grey tail edge

  const mkWing = (sign) => {
    const piv = new THREE.Group();
    piv.position.set(-0.02, 0.02, sign * 0.06);
    root.add(piv);
    const inner = mk(new THREE.SphereGeometry(0.12, 10, 8), grey, -0.03, 0, sign * 0.28, piv); inner.scale.set(0.7, 0.12, 2.6); // long grey blade
    const outer = mk(new THREE.SphereGeometry(0.1, 8, 6), dark, -0.12, 0, sign * 0.55, piv); outer.scale.set(0.5, 0.1, 1.7);    // dark swept primaries
    piv.rotation.x = sign * -0.15; // resting dihedral (a shallow V); main.js overwrites this with the wingbeat
    return piv;
  };
  const leftWing = mkWing(1);
  const rightWing = mkWing(-1);
  return { root, leftWing, rightWing };
}

// A washing line of REAL hanging cloth (spr-033): a sagging rope strung along z with several
// garments hanging from it, each swinging gently in the harbour wind. Replaces a flat laundry
// CUTOUT (a faced picture) with real 3D — the loop's own ask ("real … instead of faced picture
// with fake 3D") applied to a prop. `update(t)` billows each garment about the line (z) axis.
function buildWashingLine(x, yTop, z0, z1, garments, phase) {
  const root = new THREE.Group();
  const len = z1 - z0;
  const sag = Math.min(0.28, len * 0.08);                       // how deep the rope droops mid-span
  const ropeY = (t) => yTop - sag * (1 - (2 * t - 1) ** 2);     // a parabolic catenary
  // The rope itself — a thin dark tube following the droop.
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(x, ropeY(t), z0 + len * t)); }
  const rope = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.014, 5, false),
    new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.9 }),
  );
  root.add(rope);
  // Each garment hangs from a pivot on the rope and sways about the line (z) axis — the wind
  // billowing it toward/away from the wall — with a faint twist about x and a per-garment phase.
  const pivots = [];
  garments.forEach((gmt, i) => {
    const t = gmt.t;                                            // 0..1 position along the line
    const pivot = new THREE.Object3D();
    pivot.position.set(x, ropeY(t), z0 + len * t);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(gmt.w, gmt.h),
      new THREE.MeshStandardMaterial({ color: gmt.color, roughness: 0.85, side: THREE.DoubleSide }),
    );
    cloth.rotation.y = -Math.PI / 2;                            // broad face toward the street (−x)
    cloth.position.y = -gmt.h / 2 - 0.02;                       // hang just below the rope
    pivot.add(cloth);
    root.add(pivot);
    pivots.push({ pivot, amp: 0.10 + (i % 3) * 0.03, rate: 0.7 + (i % 4) * 0.12, off: phase + i * 1.3 });
  });
  return {
    root,
    update(tt) {
      for (const p of pivots) {
        p.pivot.rotation.z = Math.sin(tt * p.rate + p.off) * p.amp;          // billow off the wall
        p.pivot.rotation.x = Math.sin(tt * p.rate * 0.6 + p.off * 1.7) * 0.04; // a faint corner flutter
      }
    },
  };
}

// ── A real life-ring on its station board — a white torus banded with red grab-marks,
// mounted flat against a dark plank. Replaces the old PROP_Quay_LifeRing cutout.
// Arg order: (x, z, y, facing) — y is THIRD; facing yaws the whole group.
function buildLifeRing(x, z, y, facing = Math.PI / 2) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.86, 0.86),
    new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.92 }),
  );
  board.position.x = -0.06;
  board.castShadow = false; board.receiveShadow = true;
  root.add(board);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.082, 12, 28),
    new THREE.MeshStandardMaterial({ color: 0xf4f4ee, roughness: 0.7 }),
  );
  ring.rotation.y = Math.PI / 2;                                // broad face toward the quay (+x)
  ring.castShadow = false;
  root.add(ring);
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.65 });
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.18), bandMat);
    band.position.set(0, Math.sin(a) * 0.32, -Math.cos(a) * 0.32);
    band.castShadow = false;
    root.add(band);
  }
  return { root };
}

// ── A cluster of fishing floats — three egg-shaped buoys with short lanyards, the kind
// lashed to a quay edge. Replaces the flat PROP_Quay_Buoys cutout.
function buildBuoyCluster(x, z, y, facing = Math.PI / 2) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;
  const floats = [
    { r: 0.20, dy: 0.10, dz: -0.20, color: 0xe07b22 },
    { r: 0.16, dy: -0.06, dz: 0.02, color: 0xeae6dc },
    { r: 0.18, dy: 0.03, dz: 0.24, color: 0xb23a34 },
  ];
  for (const f of floats) {
    const float = new THREE.Mesh(
      new THREE.SphereGeometry(f.r, 14, 12),
      new THREE.MeshStandardMaterial({ color: f.color, roughness: 0.6 }),
    );
    float.scale.y = 1.15;                                       // an egg, not a ball
    float.position.set(0, f.dy, f.dz);
    float.castShadow = false;
    root.add(float);
    const lanyard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.9 }),
    );
    lanyard.position.set(0, f.dy + f.r * 1.15 + 0.18, f.dz);
    lanyard.castShadow = false;
    root.add(lanyard);
  }
  return { root };
}

// ── A coil of mooring rope flaked flat on the stone — four concentric loops tapering inward.
// Replaces the PROP_Quay_RopeCoil cutout.
function buildRopeCoil(x, z, y, facing = Math.PI / 2) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a7853, roughness: 0.95 });
  const radii = [0.34, 0.26, 0.18, 0.11];
  radii.forEach((R, i) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.035, 8, 22), mat);
    loop.rotation.x = -Math.PI / 2;
    loop.position.y = i * 0.045;
    loop.castShadow = false;
    root.add(loop);
  });
  return { root };
}

// ── A triangular burgee for the boat's masthead — the spr-033 swaying-cloth idea taken
// horizontal: a chain of cloth segments hinged end-to-end, each lagging the one before so
// a travelling ripple runs from the hoist out to the whipping point. Real rippling cloth,
// not a flat decal. The ribbon streams along local +z (broad faces ±x); the caller places
// and yaws the root. update(tt) is driven on the same elapsed-seconds clock as the washing.
function buildPennant(segments = 6, length = 1.9, hoist = 0.5, color = 0xc0392b) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const segLen = length / segments;
  const pivots = [];
  let parent = root;
  for (let i = 0; i < segments; i++) {
    const pivot = new THREE.Object3D();
    if (i > 0) pivot.position.z = segLen;            // hung off the previous segment's tail
    parent.add(pivot);
    const hL = hoist * (1 - i / segments);           // cloth height at this segment's leading edge…
    const hT = hoist * (1 - (i + 1) / segments);     // …tapering toward the fly point
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
      0,  hL / 2, 0,         // leading top
      0, -hL / 2, 0,         // leading bottom
      0, -hT / 2, segLen,    // trailing bottom
      0,  hT / 2, segLen,    // trailing top
    ]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const cloth = new THREE.Mesh(geo, mat);
    cloth.castShadow = false;
    pivot.add(cloth);
    pivots.push(pivot);
    parent = pivot;
  }
  return {
    root,
    update(tt) {
      for (let i = 0; i < pivots.length; i++) {
        // travelling ripple: each joint lags the one before, the swing growing toward the fly
        pivots[i].rotation.y = (0.05 + i * 0.035) * Math.sin(tt * 2.3 - i * 1.05);
      }
    },
  };
}

// ── A cluster of rope fenders hung over the quay-side wall face — real capsule cylinders
// drooping from short lanyards at the coping, the kind a working berth keeps to cushion
// a hull. Replaces the flat PROP_Quay_Fenders cutout. Hung against the wall's east face
// (default x=−10.8) at depth z0 along the wall.
function buildFenders(z0, copingY = 0.9, wallFaceX = -10.8) {
  const root = new THREE.Group();
  const fenderMat = new THREE.MeshStandardMaterial({ color: 0x7a6a48, roughness: 0.92, metalness: 0 });
  const lanyardMat = new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.95 });
  const spots = [
    { dz: -0.55, len: 0.42, r: 0.12 },
    { dz: 0.0, len: 0.50, r: 0.13 },
    { dz: 0.52, len: 0.40, r: 0.11 },
  ];
  for (const s of spots) {
    const fx = wallFaceX + s.r + 0.02;             // hang just proud of the wall face
    const topY = copingY - 0.06;                    // crown just below the coping lip
    const cy = topY - s.r - s.len / 2;              // capsule centre (total height = len + 2r)
    const fender = new THREE.Mesh(new THREE.CapsuleGeometry(s.r, s.len, 6, 12), fenderMat);
    fender.position.set(fx, cy, z0 + s.dz);
    fender.castShadow = false;
    root.add(fender);
    const lanyard = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), lanyardMat);
    lanyard.position.set(fx, topY + 0.05, z0 + s.dz);
    lanyard.castShadow = false;
    root.add(lanyard);
  }
  return { root };
}

// ── A fixed quay access ladder — two steel side-rails rising past the parapet into a grab
// bar, with rungs from the deck to the coping. Real cylinders, mounted flat on the wall's
// quay-side face. Replaces the flat PROP_Quay_Ladder cutout.
function buildQuayLadder(z0, copingY = 0.9, wallFaceX = -10.8) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a626a, roughness: 0.5, metalness: 0.35 }); // galvanised steel
  const railGap = 0.42, railH = 1.5, rx = wallFaceX + 0.11; // stand proud of the wall (and clear the graffiti decal at z=10)
  const railTopY = copingY + 0.55;                  // rails rise past the parapet as grab-rails
  const railCy = railTopY - railH / 2;
  for (const dz of [-railGap / 2, railGap / 2]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, railH, 8), mat);
    rail.position.set(rx, railCy, z0 + dz);
    rail.castShadow = false;
    root.add(rail);
  }
  // Rungs from just above the deck up to the coping, plus a top grab bar above the parapet.
  const rungYs = [0.15, 0.37, 0.59, 0.81, 1.03, railTopY - 0.07];
  for (const ry of rungYs) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, railGap, 7), mat);
    rung.rotation.x = Math.PI / 2;                  // lie across z, between the rails
    rung.position.set(rx, ry, z0);
    rung.castShadow = false;
    root.add(rung);
  }
  return { root };
}

// ── A stack of D-shape lobster creels on the east kerb — real wire cages (three hooped
// ribs + longitudinal stringers over a slatted base) rather than a flat decal. Replaces
// the PROP_Quay_LobsterPots cutout. Each creel's openings run along its local z.
function buildLobsterPots(x, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = facing;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.9 });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x6e5733, roughness: 0.95 });
  const R = 0.21, depth = 0.42;

  function creel() {
    const c = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(2 * R + 0.04, 0.05, depth), baseMat);
    base.position.y = 0.025;
    base.castShadow = false;
    c.add(base);
    for (const dz of [-depth / 2 + 0.04, 0, depth / 2 - 0.04]) {     // three hooped ribs
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012, 6, 16, Math.PI), frameMat);
      hoop.position.set(0, 0.05, dz);                                 // top half-arc rising off the base
      hoop.castShadow = false;
      c.add(hoop);
    }
    for (let k = 0; k <= 4; k++) {                                    // longitudinal stringers
      const a = (k / 4) * Math.PI;                                    // spread around the half-circle
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, depth, 6), frameMat);
      bar.rotation.x = Math.PI / 2;                                   // lie along z
      bar.position.set(Math.cos(a) * R, 0.05 + Math.sin(a) * R, 0);
      bar.castShadow = false;
      c.add(bar);
    }
    return c;
  }

  const a = creel(); a.position.z = -0.24; root.add(a);               // two creels side by side on the deck…
  const b = creel(); b.position.z = 0.24; root.add(b);
  const top = creel(); top.position.set(0.02, 0.30, 0.0); top.rotation.y = 0.5; root.add(top); // …one tossed on top
  return { root };
}

// ── A trawl net hung out to dry against the north sea-wall — a REAL draped mesh of
// crossing twine (a 3D grid of strands sagging from a head-rope, bulging out and pooling
// toward the deck) with a foot-rope and cork floats, rather than a flat side-profile
// picture. Replaces the last PROP_Quay_FishingNet cutout. Built world-aligned: the
// head-rope hangs near the wall and the drape leans out along +x toward the deck, so it
// is placed with facing 0. Static — the net dries, it does not billow (no tick wiring).
function buildFishingNet(x, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = facing;

  const cols = 12, rows = 9;                                    // ~0.12 m mesh — real netting holes
  const W = 1.45, topY = 1.25, dropLen = 1.18, bulgeMax = 0.66, headSag = 0.06;

  // The draped surface: span along z, drop in y, bulge out (+x, toward the deck) as it falls.
  const node = (i, j) => {
    const u = i / cols, v = j / rows;
    const colTopY = topY - headSag * (1 - (2 * u - 1) ** 2);    // head-rope sags toward the middle
    const depth = bulgeMax * v ** 1.6;                          // leans out increasingly as it hangs
    const billow = 0.03 * Math.sin(u * Math.PI * 3) * v;        // a soft horizontal billow, growing downward
    return new THREE.Vector3(
      depth + billow,                                           // +x toward the deck
      colTopY - v * dropLen,                                    // down the drape
      (u - 0.5) * W * (1 - 0.05 * v),                           // along z, gathering slightly at the foot
    );
  };

  // The twine: every vertical and horizontal strand packed into one LineSegments batch.
  const pts = [];
  for (let i = 0; i <= cols; i++)
    for (let j = 0; j < rows; j++) { const a = node(i, j), b = node(i, j + 1); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  for (let j = 0; j <= rows; j++)
    for (let i = 0; i < cols; i++) { const a = node(i, j), b = node(i + 1, j); pts.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3));
  root.add(new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xc8bb95 })));

  // Head-rope and foot-rope: tubes following the top and bottom edges of the drape.
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7c5c, roughness: 0.95 });
  for (const [j, r] of [[0, 0.022], [rows, 0.016]]) {
    const edge = [];
    for (let i = 0; i <= cols; i++) edge.push(node(i, j));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), cols * 2, r, 6), ropeMat);
    tube.castShadow = false;
    root.add(tube);
  }

  // Cork floats strung along the head-rope.
  const corkMat = new THREE.MeshStandardMaterial({ color: 0xcf7d3a, roughness: 0.85 });
  for (const i of [2, 6, 10]) {
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 8), corkMat);
    cork.position.copy(node(i, 0));
    cork.rotation.x = Math.PI / 2;                              // lie along the head-rope (z)
    cork.castShadow = false;
    root.add(cork);
  }

  return { root };
}

// ── A market basket heaped with produce — a REAL woven basket (a tapered wicker wall
// banded with hoops over a base disc) mounded with round fruit or knobbly veg, rather
// than a flat painted cutout. Replaces the PROP_Market_BasketFruit / BasketVeg cutouts
// on Mei's stall. `kind` "fruit" (round, warm colours) | "veg" (elongated greens). The
// heap is a deterministic ring + crown (no Math.random). Radially symmetric, so it
// ignores the stall's yaw; the root sits at the basket's BASE and builds upward.
function buildProduceBasket(x, y, z, width = 0.8, kind = "fruit") {
  const root = new THREE.Group();
  root.position.set(x, y, z);

  const wicker = new THREE.MeshStandardMaterial({ color: 0xb0894f, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const band = new THREE.MeshStandardMaterial({ color: 0x7c5e32, roughness: 0.9, metalness: 0 });
  const rTop = width * 0.45, rBot = width * 0.36, hB = width * 0.42;   // a shallow, slightly flared market basket

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, hB, 18, 1, true), wicker);
  wall.position.y = hB / 2; wall.castShadow = true; root.add(wall);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(rBot, rBot, 0.02, 18), wicker);
  base.position.y = 0.01; root.add(base);
  for (const ty of [0.12, 0.5, 0.9]) {                                  // hoop bands suggest the weave
    const r = rBot + (rTop - rBot) * ty + 0.008;
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 20), band);
    hoop.rotation.x = Math.PI / 2; hoop.position.y = hB * ty; root.add(hoop);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(rTop + 0.005, 0.018, 8, 22), band);
  rim.rotation.x = Math.PI / 2; rim.position.y = hB; root.add(rim);

  // The heap of produce mounded above the rim.
  const fruitCols = [0xc0392b, 0xe67e22, 0x8e44ad, 0xd4ac0d, 0xc0563b, 0x9b3b2f];   // apples / oranges / plums…
  const vegCols = [0x4a7c2f, 0x6b8e23, 0xe07b39, 0x3f6b2a, 0x8fae4a, 0x556b2f];     // cabbages / carrots / gourds…
  const cols = kind === "veg" ? vegCols : fruitCols;
  const pr = width * 0.11;                                              // produce radius
  const rimY = hB + pr * 0.5;
  const place = (rad, ang, yy, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(pr * (0.88 + (i % 3) * 0.08), 10, 8),
      new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.6, metalness: 0 }),
    );
    m.position.set(Math.cos(ang) * rad, yy, Math.sin(ang) * rad);
    if (kind === "veg") { m.scale.set(0.8, 1.35, 0.8); m.rotation.z = (i % 2 ? 1 : -1) * 0.4; } // knobbly / elongated
    m.castShadow = true; root.add(m);
  };
  for (let k = 0; k < 6; k++) place(rTop * 0.62, (k * Math.PI) / 3, rimY, k);                       // a ring on the rim
  for (let k = 0; k < 3; k++) place(rTop * 0.28, (k * 2 * Math.PI) / 3 + 0.5, rimY + pr * 0.8, k + 6); // a crown
  place(0, 0, rimY + pr * 1.3, 9);                                                                  // one on top

  return { root };
}

// ── A stack of grain sacks slumped beside the stall — REAL plump burlap (two fat sacks
// lying on their sides under a third sitting upright with a gathered, corded neck) rather
// than a flat painted cutout. Replaces the PROP_Market_Sacks cutout. The root sits on the
// ground and builds upward; facing rotates the pile. Static — sacks don't move (no tick).
function buildSackStack(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;
  const burlapA = new THREE.MeshStandardMaterial({ color: 0xc9b186, roughness: 0.97, metalness: 0 }); // oatmeal
  const burlapB = new THREE.MeshStandardMaterial({ color: 0xb7a06f, roughness: 0.97, metalness: 0 }); // a shade darker
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x8a7245, roughness: 0.9, metalness: 0 });   // cord

  // Two plump sacks lying on their sides — capsules squashed a touch as if settled.
  const lying = (mat, px, pz, len, r, tilt) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
    m.rotation.z = Math.PI / 2;          // lie along x
    m.rotation.y = tilt;                 // a slight skew so they don't read machined
    m.scale.set(1, 1, 0.82);             // settled under their own weight
    m.position.set(px, r, pz);
    m.castShadow = true; root.add(m);
  };
  lying(burlapA, 0.0, 0.17, 0.42, 0.18, 0.12);
  lying(burlapB, 0.04, -0.17, 0.44, 0.185, -0.14);

  // A third sack sitting upright on top, its neck gathered, folded over and corded.
  const top = new THREE.Group();
  top.position.set(-0.02, 0.34, 0.0);
  top.rotation.z = 0.08;                  // a soft slump
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), burlapA);
  body.scale.set(0.95, 1.15, 0.9); body.castShadow = true; top.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.1, 0.1, 10), burlapB);
  neck.position.y = 0.21; top.add(neck);
  const fold = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), burlapB);
  fold.scale.set(1.35, 0.7, 1.35); fold.position.y = 0.27; top.add(fold);   // the cinched-over mouth
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.014, 6, 14), tieMat);
  tie.rotation.x = Math.PI / 2; tie.position.y = 0.2; top.add(tie);          // cord round the neck
  root.add(top);

  return { root };
}

// ── Mei's signature noodle bowl, up on the counter — REAL geometry (a glazed open bowl
// with a cobalt rim band, a disc of golden broth, a heaped dome of pale noodles laced with
// a few coiled strands, a scatter of scallion + a pink fishcake slice, and two chopsticks
// resting across the rim) rather than a flat painted cutout. Replaces the PROP_Food_NoodleBowl
// cutout. The root sits ON the counter top (y is the surface height); facing rotates the set.
// Static for now — the rising steam is the next polish (reuse smokeTexture/smokePlumes).
function buildNoodleBowl(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const rTop = 0.17, rBot = 0.10, hB = 0.12;
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.35, metalness: 0, side: THREE.DoubleSide });
  const glaze = new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.3, metalness: 0 }); // cobalt rim band

  // Open bowl wall (truncated cone, both faces shown so the inside reads).
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, hB, 24, 1, true), porcelain);
  wall.position.y = hB / 2; wall.castShadow = true; wall.receiveShadow = true; root.add(wall);
  // A closed base so you don't see through the bottom of the open cone.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(rBot, rBot * 0.82, 0.02, 24), porcelain);
  base.position.y = 0.012; root.add(base);
  // Cobalt rim band just under the lip.
  const band = new THREE.Mesh(new THREE.TorusGeometry(rTop - 0.004, 0.009, 8, 28), glaze);
  band.rotation.x = Math.PI / 2; band.position.y = hB - 0.012; root.add(band);

  // Golden broth: a disc filling the bowl near the rim (faces up).
  const brothY = hB * 0.78;
  const brothR = rBot + (rTop - rBot) * 0.78 - 0.006;
  const broth = new THREE.Mesh(new THREE.CircleGeometry(brothR, 24), new THREE.MeshStandardMaterial({ color: 0xc6862f, roughness: 0.42, metalness: 0 }));
  broth.rotation.x = -Math.PI / 2; broth.position.y = brothY; root.add(broth);

  // Noodle dome rising out of the broth, laced with a few coiled strands.
  const noodleMat = new THREE.MeshStandardMaterial({ color: 0xe7d590, roughness: 0.72, metalness: 0 });
  const mound = new THREE.Mesh(new THREE.SphereGeometry(brothR * 0.72, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), noodleMat);
  mound.scale.set(1, 0.55, 1); mound.position.y = brothY; mound.castShadow = true; root.add(mound);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(brothR * (0.55 - i * 0.13), 0.007, 5, 16), noodleMat);
    ring.rotation.x = Math.PI / 2 + (i % 2 ? 0.18 : -0.14);
    ring.position.set((i - 1) * 0.012, brothY + brothR * (0.26 + i * 0.13), 0.01 * i);
    root.add(ring);
  }
  // Toppings: scallion greens + a pink fishcake slice, scattered on top.
  const toppings = [[0x4e7a32, brothR * 0.5, 0.6], [0x6b9a3a, brothR * 0.42, 2.4], [0xd98a86, brothR * 0.55, 4.3]];
  for (const [col, rad, ang] of toppings) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, metalness: 0 }));
    t.scale.set(1.4, 0.5, 1.4);
    t.position.set(Math.cos(ang) * rad, brothY + brothR * 0.5, Math.sin(ang) * rad);
    root.add(t);
  }

  // Two chopsticks resting across the rim, poking out one side.
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x9a6f3a, roughness: 0.7, metalness: 0 });
  const stick = (off) => {
    const g = new THREE.Group();
    g.position.set(0.02, hB + 0.014, off);
    g.rotation.y = 0.35;   // angled out across the rim in plan
    g.rotation.z = 0.07;   // a slight tilt so it rests on the lip
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.32, 6), stickMat);
    s.rotation.z = Math.PI / 2;   // lay along local x
    s.castShadow = true; g.add(s);
    root.add(g);
  };
  stick(0.035); stick(-0.005);

  return { root };
}

// ── Mei's string of dried wares hung under the awning (spr-044) — REAL geometry (a wooden
// rail with four clusters of hanging market fare: a pair of dried fish, a string of red
// chillies, a link of cured sausages, and a little garlic braid, each on its own twine)
// rather than a flat painted cutout. Replaces the PROP_Market_HangingWares cutout. The root
// sits at the rail under the awning; the wares hang below it. Static — they don't sway (no
// tick). Self-contained own materials; deterministic layout (no Math.random).
function buildHangingWares(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5d3a, roughness: 0.9, metalness: 0 });
  const twine = new THREE.MeshStandardMaterial({ color: 0x6b5a3f, roughness: 1, metalness: 0 });
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xc2b290, roughness: 0.7, metalness: 0 });
  const chilliMat = new THREE.MeshStandardMaterial({ color: 0xbe2f24, roughness: 0.55, metalness: 0 });
  const sausageMat = new THREE.MeshStandardMaterial({ color: 0x8a4b2f, roughness: 0.75, metalness: 0 });
  const garlicMat = new THREE.MeshStandardMaterial({ color: 0xe6ded0, roughness: 0.85, metalness: 0 });

  // The rail the wares hang from (a thin wooden dowel along x).
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.64, 8), wood);
  bar.rotation.z = Math.PI / 2; bar.castShadow = true; root.add(bar);

  // A thin twine from the rail (y0) down to -len at local x; returns the y of its bottom.
  const hang = (px, len) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, len, 5), twine);
    s.position.set(px, -len / 2, 0); root.add(s);
    return -len;
  };

  // 1) a pair of dried fish on the left.
  {
    const y0 = hang(-0.24, 0.16);
    for (const dx of [-0.03, 0.03]) {
      const fish = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), fishMat);
      fish.scale.set(0.42, 1.0, 0.28);                       // flattened, elongated
      fish.position.set(-0.24 + dx, y0 - 0.085, 0); fish.castShadow = true; root.add(fish);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.05, 6), fishMat);
      tail.scale.set(1, 1, 0.4); tail.position.set(-0.24 + dx, y0 - 0.165, 0); root.add(tail);
    }
  }
  // 2) a string of red chillies.
  {
    const y0 = hang(-0.08, 0.09);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.05, 4, 6), chilliMat);
      c.position.set(-0.08 + Math.cos(a) * 0.025, y0 - 0.05 - (i % 3) * 0.022, Math.sin(a) * 0.02);
      c.rotation.z = Math.cos(a) * 0.5; c.rotation.x = 0.2; c.castShadow = true; root.add(c);
    }
  }
  // 3) a link of cured sausages.
  {
    const y0 = hang(0.08, 0.09);
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.03, 5, 8), sausageMat);
      s.scale.set(1, 1, 0.9);
      s.position.set(0.08 + (i % 2 ? 0.018 : -0.018), y0 - 0.04 - i * 0.05, 0);
      s.rotation.z = (i % 2 ? 1 : -1) * 0.4; s.castShadow = true; root.add(s);
    }
  }
  // 4) a little garlic braid on the right.
  {
    const y0 = hang(0.24, 0.11);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 7), garlicMat);
      g.scale.set(1, 0.85, 1);
      g.position.set(0.24 + (i % 2 ? 0.016 : -0.016), y0 - 0.03 - i * 0.045, 0);
      g.castShadow = true; root.add(g);
    }
  }
  return { root };
}

// ── Mei's cooking gear (spr-045) — REAL geometry (a seasoned iron wok, a steel
// ladle resting in it, and a pair of chopsticks laid across the rim) rather than a
// flat painted cutout. Replaces the PROP_Kit_Utensils cutout. The wok is a shallow
// bottom-hemisphere shell (DoubleSide so the inside reads), lifted so its base rests
// on the counter top; two little ear-loops sit at the front/back lip. Self-contained
// own materials; deterministic layout (no Math.random). Footprint kept to ±0.15 in x
// so it tucks between the counter's left edge and the fruit basket beside it.
function buildUtensils(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2823, roughness: 0.45, metalness: 0.55, side: THREE.DoubleSide });
  const ironRim = new THREE.MeshStandardMaterial({ color: 0x1f1c19, roughness: 0.5, metalness: 0.55 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9398a0, roughness: 0.35, metalness: 0.7 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6f3a, roughness: 0.7, metalness: 0 });
  const oil = new THREE.MeshStandardMaterial({ color: 0x6b4a1f, roughness: 0.25, metalness: 0.1 });

  const R = 0.14, wokScaleY = 0.6, wokLift = R * wokScaleY;  // base rests on the counter (y0), rim at +wokLift

  // The wok: lower hemisphere of a sphere, squashed flat into a shallow bowl.
  const wok = new THREE.Group();
  wok.position.y = wokLift;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), iron);
  shell.scale.set(1, wokScaleY, 1); shell.castShadow = true; shell.receiveShadow = true; wok.add(shell);
  // A rolled rim around the lip.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R - 0.006, 0.008, 8, 28), ironRim);
  rim.rotation.x = Math.PI / 2; wok.add(rim);
  // A sheen of oil pooled in the bottom.
  const sheen = new THREE.Mesh(new THREE.CircleGeometry(R * 0.66, 22), oil);
  sheen.rotation.x = -Math.PI / 2; sheen.position.y = -wokLift * 0.45; wok.add(sheen);
  // Two ear-loop handles at the front and back of the lip.
  for (const ez of [R, -R]) {
    const ear = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), ironRim);
    ear.position.set(0, 0, ez); ear.castShadow = true; wok.add(ear);
  }
  root.add(wok);

  // A steel ladle resting in the wok, its handle leaning up and out toward the cook.
  const lad = new THREE.Group();
  lad.position.set(-0.02, 0, 0);
  const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), steel);
  scoop.scale.set(1, 0.7, 1); scoop.position.set(0, 0.035, -0.02); scoop.castShadow = true; lad.add(scoop);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 6), wood);
  handle.rotation.x = 1.0;                       // lean the handle up and toward +z
  handle.position.set(0, 0.105, 0.075); handle.castShadow = true; lad.add(handle);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), wood);
  knob.position.set(0, 0.17, 0.165); lad.add(knob);   // little end-cap where you grip
  root.add(lad);

  // A pair of chopsticks laid across the rim, poking out toward the customer.
  const stickMat = new THREE.MeshStandardMaterial({ color: 0x8a5f30, roughness: 0.7, metalness: 0 });
  const stick = (off) => {
    const g = new THREE.Group();
    g.position.set(0.0, wokLift + 0.012, off);
    g.rotation.y = 0.3;    // angled across the rim in plan
    g.rotation.z = 0.05;   // a slight tilt so it rests on the lip
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.3, 6), stickMat);
    s.rotation.z = Math.PI / 2;   // lay along local x
    s.castShadow = true; g.add(s);
    root.add(g);
  };
  stick(0.05); stick(0.018);

  return { root };
}

// ── A market crate of packed goods beside the stall (spr-046) — REAL geometry (a slatted,
// open-topped wooden crate: four corner posts + horizontal slats with gaps, holding three
// twine-tied paper parcels, one poking above the rim) rather than a flat painted cutout.
// Replaces PROP_Market_Crate — the LAST faced-picture good on Mei's stall. The root sits on
// the ground and builds upward; facing rotates the crate. Self-contained own materials;
// deterministic layout (no Math.random); open-topped so the parcels read from above.
function buildMarketCrate(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const slatMat = new THREE.MeshStandardMaterial({ color: 0x7a5733, roughness: 0.85, metalness: 0 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5f4427, roughness: 0.9, metalness: 0 });
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xcabf9e, roughness: 0.9, metalness: 0 });
  const twineMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3f, roughness: 1, metalness: 0 });

  const hw = 0.26, hd = 0.22, H = 0.40, post = 0.04;   // half-width(x), half-depth(z), height

  // Four corner posts.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(post, H, post), postMat);
    p.position.set(sx * hw, H / 2, sz * hd); p.castShadow = true; root.add(p);
  }
  // A solid floor so you don't see through the crate from above.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.03, hd * 2), slatMat);
  floor.position.y = 0.015; floor.receiveShadow = true; root.add(floor);

  // Horizontal slats on all four sides at three heights, gaps between (it reads as boards).
  const slatH = 0.085, slatT = 0.022;
  for (const sy of [0.07, 0.20, 0.33]) {
    for (const sz of [-1, 1]) {                     // front & back (span x)
      const s = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + post, slatH, slatT), slatMat);
      s.position.set(0, sy, sz * hd); s.castShadow = true; root.add(s);
    }
    for (const sx of [-1, 1]) {                     // left & right (span z)
      const s = new THREE.Mesh(new THREE.BoxGeometry(slatT, slatH, hd * 2 + post), slatMat);
      s.position.set(sx * hw, sy, 0); s.castShadow = true; root.add(s);
    }
  }

  // Three twine-tied paper parcels packed inside; the top one pokes above the rim.
  const parcel = (px, pz, w, ph, d, ry, lift) => {
    const g = new THREE.Group();
    g.position.set(px, lift + ph / 2, pz); g.rotation.y = ry;
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, ph, d), paperMat);
    box.castShadow = true; g.add(box);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.006, 0.012, 0.012), twineMat);
    b1.position.y = ph / 2; g.add(b1);             // twine band across the top, along x
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, d + 0.006), twineMat);
    b2.position.y = ph / 2; g.add(b2);             // …and along z, crossing it
    root.add(g);
  };
  parcel(-0.09, -0.02, 0.20, 0.22, 0.17, 0.18, 0.03);   // low-left
  parcel(0.10, 0.06, 0.17, 0.20, 0.15, -0.30, 0.03);    // low-right
  parcel(0.0, -0.02, 0.17, 0.18, 0.15, 0.50, 0.26);     // stacked on top, poking above the rim

  return { root };
}

// ── A window flower box on a shopfront sill (spr-047) — REAL geometry (a weathered wooden
// trough with a soil bed, a heaped row of leaf-cushioned blooms, and a few trailing vines
// hanging below the front lip) rather than a flat painted cutout. Replaces PROP_Shop_FlowerBox
// — the first OFF-stall cutout converted. Mounted flush on the building front and rotated by
// FACADE (−π/2) so it faces −x toward the street; in the root's local frame +x runs ALONG the
// wall and +z projects OUT toward the player. Self-contained own materials; deterministic
// layout (no Math.random); the trough's back sits at the wall, the blooms rise toward the glass.
function buildFlowerBox(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6f5235, roughness: 0.9, metalness: 0 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 1, metalness: 0 });
  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: 0.8, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x4f7d33, roughness: 0.8, metalness: 0 }),
    new THREE.MeshStandardMaterial({ color: 0x5c8a3a, roughness: 0.8, metalness: 0 }),
  ];
  const bloomMats = [0xc0392b, 0xe6b800, 0xd96aa0, 0xeae6df, 0x8e5aa8, 0xe0772f]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }));

  const L = 1.3, th = 0.26, td = 0.32;   // length (local x, along wall), height, depth (local z, out from wall)

  // The planter trough + a trim rail along the top front edge + a soil bed inset on top.
  const body = new THREE.Mesh(new THREE.BoxGeometry(L, th, td), woodMat);
  body.castShadow = true; body.receiveShadow = true; root.add(body);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(L + 0.02, 0.045, 0.045), woodMat);
  rail.position.set(0, th / 2 - 0.02, td / 2); root.add(rail);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(L * 0.94, 0.05, td * 0.82), soilMat);
  soil.position.y = th / 2 - 0.01; root.add(soil);

  // A heaped row of leaf-cushioned blooms along the top.
  const topY = th / 2 + 0.02;
  const N = 11;
  for (let i = 0; i < N; i++) {
    const fx = (i / (N - 1) - 0.5) * (L - 0.12);    // spread along the length
    const wob = Math.sin(i * 2.3);                  // deterministic wobble
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), leafMats[i % 3]);
    leaf.scale.set(1.2, 0.7, 1.1);
    leaf.position.set(fx, topY, wob * 0.05);
    leaf.castShadow = true; root.add(leaf);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 7), bloomMats[i % bloomMats.length]);
    bloom.scale.set(1, 0.8, 1);
    bloom.position.set(fx + wob * 0.02, topY + 0.06 + (i % 3) * 0.015, 0.03 + wob * 0.04);
    root.add(bloom);
  }
  // A few trailing vines hanging below the front lip.
  for (let i = 0; i < 5; i++) {
    const tx = (i / 4 - 0.5) * (L - 0.2);
    const len = 0.16 + (i % 2) * 0.08;
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, len, 5), leafMats[i % 3]);
    vine.position.set(tx, -th / 2 - len / 2 + 0.04, td / 2 - 0.02);
    vine.rotation.x = 0.2; root.add(vine);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 6), leafMats[(i + 1) % 3]);
    tip.scale.set(1, 1.3, 1); tip.position.set(tx, -th / 2 - len + 0.04, td / 2 + 0.02);
    root.add(tip);
  }

  return { root };
}

export function buildWorld(scene) {
  // ── Sky dome: a vertical gradient painted to a canvas, mapped inside a sphere.
  // paintSky() lets the day cycle recolour it as the hours pass.
  const sky = document.createElement("canvas");
  sky.width = 2; sky.height = 256;
  const sctx = sky.getContext("2d");
  const skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const _mid = new THREE.Color();
  function paintSky(topC, botC) {
    const top = "#" + topC.getHexString();
    const mid = "#" + _mid.copy(topC).lerp(botC, 0.55).getHexString();
    const bot = "#" + botC.getHexString();
    const g = sctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.0, top);
    g.addColorStop(0.6, mid);
    g.addColorStop(1.0, bot);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 2, 256);
    skyTex.needsUpdate = true;
  }
  paintSky(new THREE.Color(0x24344f), new THREE.Color(0xc98a64)); // a sensible dawn default
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(skyDome);

  // ── Painted sky panels (fx-001): three full-sky moods — day, dusk, night —
  // laid just inside the gradient base dome and cross-faded by the day cycle.
  // The gradient dome stays as a load-time fallback; once these load, the night
  // panel (the opaque base of the blend) fully covers it. Plain MeshBasic keeps
  // the panels sRGB-correct + tone-mapped like the rest of the scene; the
  // cross-fade is an exact convex blend done with over-stack opacities (see
  // setSkyBlend). The Batch-6 clouds drift inside these, over the painted sky.
  function skyPanel(file, radius, order) {
    const tex = _texLoader.load(`${SKY_DIR}${file}`);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 16),
      new THREE.MeshBasicMaterial({
        map: tex, side: THREE.BackSide, fog: false,
        transparent: true, depthWrite: false, opacity: order === 1 ? 1 : 0,
      }),
    );
    mesh.renderOrder = order; // night(1) behind, dusk(2), day(3) in front
    scene.add(mesh);
    return mesh;
  }
  // Back-to-front: night is the opaque base; dusk then day blend over it.
  const skyNight = skyPanel("SKY_Atmos_Night.png", 219.6, 1);
  const skyDusk = skyPanel("SKY_Atmos_Dusk.png", 219.3, 2);
  const skyDay = skyPanel("SKY_Atmos_Day.png", 219.0, 3);
  // A convex blend wDay+wDusk+wNight=1 rendered as an over-stack: the front
  // (day) layer's opacity is its own weight; the dusk layer's opacity is its
  // weight normalised by what day leaves behind; night stays opaque underneath.
  // This reproduces wDay·Day + wDusk·Dusk + wNight·Night exactly, no shader.
  function setSkyBlend(wDay, wDusk, wNight) {
    const aDay = Math.max(0, Math.min(1, wDay));
    const rem = 1 - aDay;
    const aDusk = rem > 1e-4 ? Math.max(0, Math.min(1, wDusk / rem)) : 0;
    skyDay.material.opacity = aDay;
    skyDusk.material.opacity = aDusk;
    skyNight.material.opacity = 1; // opaque base
  }
  setSkyBlend(1, 0, 0); // a sensible bright-day default until the cycle sets it

  // ── Overcast veil (fx-004 weather slice): a grey stratus panel laid in front
  // of the day/dusk/night blend, faded in by the day's wetness so a rainy day
  // greys the sky over whatever the time-of-day blend is doing — the rain (a
  // Batch-21 overlay) then falls over a proper overcast instead of clear blue.
  const skyOvercast = skyPanel("SKY_Atmos_Overcast.png", 218.7, 4);
  function setOvercast(t) {
    skyOvercast.material.opacity = Math.max(0, Math.min(0.9, t || 0));
  }
  setOvercast(0); // clear until the weather cycle says otherwise

  // ── The moon (Batch 61): a self-lit disc high over the water, faded in by the day
  // cycle's NIGHT-blend weight so it is invisible by day, swells through dusk, hangs
  // full at deep night and lingers faint at dawn — tracking the painted SKY_Atmos_Night
  // panel it sits in front of. A plain MeshBasic plane (unlit, glows on its own map),
  // placed far and high over the sea (west, where the night sky is most open), oriented
  // to face the scene centre and DoubleSide so the player's small movement never edges
  // it away. renderOrder 5 keeps it in front of the sky panels (1–4); the clouds tint to
  // nothing at night, so moon-over-cloud never reads. fog:false (like the sky panels) so
  // the distance haze never eats it. setMoon(wNight) is driven per in-game minute by the
  // day cycle (the same weight that blends the painted night sky).
  const moonTex = _texLoader.load(`${SKY_DIR}FX_Sky_Moon.png`);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      map: moonTex, transparent: true, depthWrite: false, fog: false,
      opacity: 0, side: THREE.DoubleSide,
    }),
  );
  moon.position.set(-78, 135, -46);
  moon.lookAt(0, 0, 0);
  moon.renderOrder = 5;
  scene.add(moon);
  function setMoon(wNight) {
    moon.material.opacity = Math.max(0, Math.min(1, wNight));
  }

  scene.fog = new THREE.Fog(0x9a8a7a, 35, 150);

  // ── Lighting: cool sky fill + warm sun with soft shadows. The day cycle drives
  // these intensities/colours over the day; hemisphere ground colour is lifted so
  // the foreground street isn't a black void.
  const hemi = new THREE.HemisphereLight(0x9fb4cc, 0x4a4036, 0.9);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x6a7486, 0.18);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe6c2, 2.0);
  sun.position.set(18, 22, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  // ── Shared baked materials for the harbour surfaces (Batch 1 art).
  const plasterMat = surfaceMaterial("Plaster", [2, 2]);
  // Two more painted façade surfaces (Batch 40) so the east-side row stops
  // reading as one building copied six times: warm weathered warehouse brick
  // and a cool grey flaking lime render, each distinct from the beige plaster
  // and the grey quay-wall stone. The facades table rotates the three below.
  const brickMat = surfaceMaterial("Brick", [2, 2]);
  const stuccoMat = surfaceMaterial("StuccoGrey", [2, 2]);
  const windowMat = windowAtlasMaterial();
  const woodMat = surfaceMaterial("PlankWood", [1, 1]);
  // Weathered clay-tile roof (Batch 11): a single shared tile, repeated so the
  // pitched lids read as rows of tiles rather than a flat grey cap.
  const roofMat = surfaceMaterial("Roof", [4, 4]);
  // Two more roof surfaces (Batch 41) so the rooftops stop reading as one lid
  // copied six times now that the walls vary: cool grey slate, and a weathered
  // standing-seam metal warehouse roof. RoofMetal is the only harbour surface
  // with real metalness (its ORM B channel ≈0.47), so it catches the sun.
  const slateRoofMat = surfaceMaterial("RoofSlate", [4, 4]);
  const metalRoofMat = surfaceMaterial("RoofMetal", [4, 4]);

  // ── Shared prop materials (Batch 2 art): painted metal for ironwork, striped
  // canvas for the awning, sailcloth for rigging, twisted hemp for rope. Metalness
  // rides the ORM B channel (high for metal, 0 otherwise), so the multiplier is 1.
  const metalMat = propMaterial("PaintedMetal", [1, 1]);
  const awningMat = propMaterial("AwningStripe", [3, 1], { side: THREE.DoubleSide });
  const sailMat = propMaterial("Sailcloth", [1, 1], { side: THREE.DoubleSide, metalness: 0 });
  const ropeMat = propMaterial("Rope", [6, 1], { metalness: 0 });

  // ── Ground + water.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    surfaceMaterial("Cobblestone", [40, 40]),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The street: a plank boardwalk the player walks along (runs N–S, along z).
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 80),
    surfaceMaterial("PlankWood", [3, 16]),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(-3, 0.01, 0);
  street.receiveShadow = true;
  scene.add(street);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 120),
    surfaceMaterial("Water", [10, 16], {
      metalness: 0.3,
      metalnessMap: null,
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-46, -0.05, 0);
  water.receiveShadow = true;
  scene.add(water);

  // ── Ground grime (Batch 39): puddles, oil, moss & debris scattered over the
  // boardwalk to kill the tiling and make the quay feel worked-on. Authored spots
  // in the play area, clear of the stall / board / crates / named cast / spawn.
  // Moss hugs the damp base of the quay wall (west edge); puddles are low-roughness
  // so they catch a wet sun-glint; oil & debris are matte. [file, size, x, z, rot].
  const PUD = { rough: 0.28 };
  const groundGrime = [
    [`${DECAL_DIR}DECAL_Ground_Moss.png`, 1.8, -10.0, 6.0, 0.2],
    [`${DECAL_DIR}DECAL_Ground_Moss.png`, 1.6, -10.0, -16.0, 1.0],
    [`${DECAL_DIR}DECAL_Ground_Moss.png`, 1.7, -9.9, 24.0, 0.5],
    [`${DECAL_DIR}DECAL_Ground_Puddle.png`, 2.6, -2.5, -2.0, 0.3, PUD],
    [`${DECAL_DIR}DECAL_Ground_Puddle.png`, 2.0, 1.5, 9.5, 1.1, PUD],
    [`${DECAL_DIR}DECAL_Ground_Puddle.png`, 1.9, -7.5, 20.0, 0.7, PUD],
    [`${DECAL_DIR}DECAL_Ground_Puddle.png`, 1.8, 0.5, -24.0, 0.2, PUD],
    [`${DECAL_DIR}DECAL_Ground_OilStain.png`, 1.6, 2.0, -18.0, 0.0],
    [`${DECAL_DIR}DECAL_Ground_OilStain.png`, 1.5, -4.0, -22.0, 0.8],
    [`${DECAL_DIR}DECAL_Ground_OilStain.png`, 1.4, -6.5, 28.0, 0.4],
    [`${DECAL_DIR}DECAL_Ground_Debris.png`, 2.0, -1.5, 13.5, 0.2],
    [`${DECAL_DIR}DECAL_Ground_Debris.png`, 1.7, 2.8, 1.0, 0.9],
    [`${DECAL_DIR}DECAL_Ground_Debris.png`, 1.6, -8.0, 0.0, 0.5],
  ];
  for (const [url, size, x, z, rot, opts] of groundGrime) {
    scene.add(groundDecal(url, size, x, z, rot, opts || {}));
  }

  // ── Quay wall separating the street from the water, with bollards on top.
  // Painted wet-stone masonry (Batch 37, ENV_Harbour_QuayWall) — the harbour's last
  // bare surface; tiled along its 80-unit length so the player walks a real sea-wall
  // of damp salt-stained blocks instead of a flat-colour box.
  const quay = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.9, 80),
    surfaceMaterial("QuayWall", [24, 1]),
  );
  quay.position.set(-11.4, 0.45, 0);
  quay.castShadow = true;
  quay.receiveShadow = true;
  scene.add(quay);
  for (let z = -34; z <= 34; z += 8) {
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 0.7, 12),
      metalMat,
    );
    bollard.position.set(-11.1, 1.15, z);
    bollard.castShadow = true;
    scene.add(bollard);
    // A coil of mooring rope looped over every other bollard.
    if ((z / 8) % 2 === 0) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 8, 18), ropeMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(-11.1, 1.5, z);
      coil.castShadow = true;
      scene.add(coil);
    }
  }

  // ── A row of harbour buildings on the east side (fronts facing the water).
  // Each carries one of three painted façade bodies (Batch 40) AND one of three
  // roofs (Batch 41) so the street mixes brick/plaster/stucco walls under
  // clay/slate/metal lids instead of six copies — body + roof curated per entry
  // so no two neighbours share either surface, the roof never trivially tracks
  // the wall, and all three of each appear; size + window hashing add the rest.
  const facades = [
    { w: 7, h: 8.5, d: 7, body: brickMat, roof: slateRoofMat },
    { w: 6, h: 6.5, d: 6.5, body: plasterMat, roof: roofMat },
    { w: 8, h: 11, d: 8, body: stuccoMat, roof: metalRoofMat },
    { w: 6.5, h: 7.5, d: 7, body: plasterMat, roof: slateRoofMat },
    { w: 7, h: 9.5, d: 7.5, body: brickMat, roof: metalRoofMat },
    { w: 6, h: 6, d: 6.5, body: stuccoMat, roof: roofMat },
  ];
  // Homes (clay/slate roofs) keep a lit hearth → their chimneys smoke; the metal
  // warehouse roofs do not. A quiet sign the row is lived-in, not a stage flat.
  const smokePlumes = [];
  let zCursor = -30;
  for (const f of facades) {
    const bx = 9 + f.w / 2, bz = zCursor + f.d / 2;
    makeBuildingInto(scene, bx, bz, f.w, f.h, f.d, f.body, windowMat, f.roof);
    if (f.roof === roofMat || f.roof === slateRoofMat) {
      addChimneySmoke(scene, bx, bz, f.h, f.w, f.d, smokePlumes);
    }
    zCursor += f.d + 2.5;
  }

  // ── Street lamps along the quay.
  const lampHeads = [];
  for (let z = -28; z <= 28; z += 14) {
    const { group, head } = makeLamp(-9.5, z, metalMat);
    scene.add(group);
    lampHeads.push(head);
  }

  // ── Lamplight on the wet stones (Batch 62): the lamp-heads above warm up after
  // dusk (their emissiveIntensity rides the clock) but cast no light on the ground —
  // the cobbles stayed flat-dark at night. Lay one soft warm pool decal flat on the
  // cobbles beneath each lamp, ADDITIVELY blended so it brightens the stones rather
  // than painting over them, and drive its opacity off the SAME lamp intensity the
  // day cycle feeds the heads (setLampGlow, called from daycycle.js) — off by day,
  // full at deep night. One texture (MeshBasic, self-lit, fog off) instanced under
  // all five lamps; tiny payload, the floor lights up exactly when the lamps do.
  const lampGlows = [];
  const poolTex = _texLoader.load(`${FX_DIR}FX_Light_LampPool.png`);
  poolTex.colorSpace = THREE.SRGBColorSpace;
  for (let z = -28; z <= 28; z += 14) {
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({
        map: poolTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(-9.0, 0.05, z); // under the bulb (head ≈ x−9.08), on the cobbles
    pool.renderOrder = 1; // over the ground grime (renderOrder −2), additive
    scene.add(pool);
    lampGlows.push(pool);
  }
  function setLampGlow(intensity) {
    const o = Math.max(0, Math.min(0.85, intensity * 0.85));
    for (const p of lampGlows) p.material.opacity = o;
  }
  // Lit window panes ride the same dusk ramp as the lamps (spr-020): near-invisible
  // against a sunlit facade by day, warm after dark, so the town's windows visibly come
  // on as evening falls. One shared atlas material → one assignment lights every building.
  function setWindowGlow(intensity) {
    windowMat.emissiveIntensity = 0.05 + Math.max(0, Math.min(1, intensity)) * 1.1;
  }

  // ── A market stall with a striped awning, mid-street.
  const stall = new THREE.Group();
  stall.position.set(-5, 0, 4);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.4), woodMat);
  counter.castShadow = true;
  counter.receiveShadow = true;
  counter.position.y = 0.45;
  stall.add(counter);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.8), awningMat);
  awning.castShadow = true;
  awning.position.y = 1.9;
  awning.rotation.z = -0.12;
  stall.add(awning);
  for (let i = 0; i < 2; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 8), metalMat);
    post.castShadow = true;
    post.position.set(i ? 1.3 : -1.3, 0.95, 0.7);
    stall.add(post);
  }
  // Mei's painted noodle-stall sign, hung under the awning facing the approaching
  // street (+z, the way the player walks in from the spawn).
  const stallSign = cutoutPlane(`${SIGNAGE_DIR}SIGN_NoodleStall.png`, 1.15, 1.15, { emissive: 0.3 });
  stallSign.position.set(0, 1.32, 0.96);
  stall.add(stallSign);

  // Mei's wares: market goods dressing the stall, EVERY one now REAL geometry — the flat alpha
  // cutouts are gone. Each is added to the stall group so it inherits the stall's place and
  // sits where its cutout's base sat: HANGING WARES (spr-044), WOK + utensils (spr-045),
  // NOODLE BOWL (spr-041), two PRODUCE BASKETS (spr-039), SACK STACK (spr-040), and the
  // MARKET CRATE (spr-046) — the last faced-picture good converted.
  stall.add(buildHangingWares(0.95, 1.74, 0.55).root);                   // dried wares hung under the awning
  stall.add(buildUtensils(-1.146, 0.9, 0.42, -0.1).root);                // Mei's wok + ladle + chopsticks, counter-left
  stall.add(buildNoodleBowl(0.55, 0.9, 0.42, -0.15).root);               // Mei's bowl, up on the counter top
  stall.add(buildProduceBasket(-0.6, 0.9, 0.42, 0.83, "fruit").root);     // up on the counter top
  stall.add(buildProduceBasket(-1.95, 0.0, 1.2, 0.78, "veg").root);       // on the ground beside the stall
  stall.add(buildSackStack(1.8, 0.0, 1.2).root);                          // grain sacks slumped on the ground
  stall.add(buildMarketCrate(-2.3, 0.0, 0.4, 0.12).root);                 // a crate of parcels on the ground, stall-left
  scene.add(stall);

  // ── A few barrels by the stall: painted barrel-stave wrap (Batch 11) bound with
  // raised painted-metal hoops. The stave texture tiles once around the circumference.
  const barrelMat = propMaterial("Barrel", [1, 1]);
  const barrelSpots = [[-7.2, 2.6], [-7.0, 3.5], [3.2, -10]];
  barrelSpots.forEach(([x, z]) => {
    const barrel = new THREE.Group();
    barrel.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 1.0, 14), barrelMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.5;
    barrel.add(body);
    for (const hy of [0.18, 0.82]) {
      const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 16, 1, true), metalMat);
      hoop.position.y = hy;
      barrel.add(hoop);
    }
    scene.add(barrel);
  });

  // ── Stacks of crates near a wall, in the painted shipping-crate material (Batch
  // 11): planked faces with metal corner banding and cross-braces, one tile per face.
  const crateMat = propMaterial("Crate", [1, 1]);
  const crateSpots = [[-1, -8], [-0.2, -8], [-0.6, -8.7], [6, 14], [6.6, 14]];
  crateSpots.forEach(([x, z], i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), crateMat);
    c.castShadow = true;
    c.receiveShadow = true;
    c.position.set(x, 0.45 + (i % 2 ? 0.9 : 0), z);
    scene.add(c);
  });

  // ── A moored boat out on the water for life on the horizon.
  const flags = []; // masthead burgee(s) that ripple in the wind (spr-035), ticked on the critter clock
  const boat = new THREE.Group();
  boat.position.set(-20, 0, -6);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 8), woodMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.position.y = 0.2;
  boat.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 3), woodMat);
  cabin.castShadow = true;
  cabin.position.set(0, 1.3, -0.5);
  boat.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5, 8), woodMat);
  mast.castShadow = true;
  mast.position.set(0, 3, 1.5);
  boat.add(mast);
  // A furled-but-open sail of weathered canvas, bowed slightly by the wind.
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2, 6, 6), sailMat);
  const sp = sail.geometry.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const sx = sp.getX(i);
    sp.setZ(i, Math.cos((sx / 2.6) * Math.PI) * 0.35); // gentle billow
  }
  sp.needsUpdate = true;
  sail.geometry.computeVertexNormals();
  sail.position.set(0, 3.3, 1.5);
  sail.castShadow = true;
  boat.add(sail);
  // A crimson burgee at the masthead, rippling in the harbour wind (spr-035) — streams aft
  // (+z) so its broad face turns to the quay; ticked via world.flags on the critter clock.
  const pennant = buildPennant();
  pennant.root.position.set(0, 5.25, 1.5);           // at the mast top (mast tip ≈ y5.5)
  boat.add(pennant.root);
  flags.push(pennant);
  scene.add(boat);

  // ── A notice board for the "read the board" interactable.
  const boardSpot = INTERACTABLES.find((i) => i.id === "board");
  if (boardSpot) {
    const bg = new THREE.Group();
    bg.position.set(boardSpot.x, 0, boardSpot.z);
    // Posts + backing panel in the painted weathered notice-board timber (Batch 38,
    // ENV_Harbour_NoticeBoard) — the harbour's last flat-colour surface. One shared
    // tiled material (greyer, older grain than the boardwalk planks) skins the two
    // posts and the panel the day's shifts get pinned to.
    const boardMat = surfaceMaterial("NoticeBoard", [1, 1]);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), boardMat);
    postL.castShadow = true; postL.receiveShadow = true;
    postL.position.set(-0.75, 0.9, 0); bg.add(postL);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), boardMat);
    postR.castShadow = true; postR.receiveShadow = true;
    postR.position.set(0.75, 0.9, 0); bg.add(postR);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.15, 0.1), boardMat);
    panel.castShadow = true; panel.receiveShadow = true;
    panel.position.set(0, 1.55, 0); bg.add(panel);
    // A painted cluster of pinned notes & curled flyers as the weathered backing.
    const notes = cutoutPlane(`${SIGNAGE_DIR}DECAL_BoardNotes.png`, 1.55, 0.98, { emissive: 0.16 });
    notes.position.set(0, 1.58, 0.061);
    bg.add(notes);
    // ── Bespoke posted notices (Batch 25, fx-003): six distinct documents pinned
    // proud of the backing cluster, so the board you read your shifts off looks like
    // a real working harbour board — a job ad, a harbour bylaw, a ferry timetable, a
    // room-to-let card, a found/lost note, a festival flyer. Each is a fixed alpha
    // cutout (no billboarding) sized to its PNG aspect, scattered in a 3×2 grid with
    // a little jitter + tilt and stepped in z so the layers never z-fight.
    const NOTE_ASPECT = {
      NOTE_JobPosting: 350 / 512, NOTE_HarbourBylaw: 340 / 512, NOTE_FerrySchedule: 315 / 512,
      NOTE_RoomToLet: 437 / 512, NOTE_FoundLost: 469 / 512, NOTE_EventFlyer: 323 / 512,
    };
    const boardNotes = [
      { file: "NOTE_JobPosting",    h: 0.50, x: -0.46, y: 1.80, rot:  0.05 },
      { file: "NOTE_HarbourBylaw",  h: 0.48, x:  0.00, y: 1.82, rot: -0.03 },
      { file: "NOTE_FerrySchedule", h: 0.46, x:  0.46, y: 1.79, rot:  0.06 },
      { file: "NOTE_RoomToLet",     h: 0.40, x: -0.45, y: 1.34, rot: -0.07 },
      { file: "NOTE_FoundLost",     h: 0.39, x:  0.02, y: 1.32, rot:  0.08 },
      { file: "NOTE_EventFlyer",    h: 0.50, x:  0.46, y: 1.36, rot: -0.05 },
    ];
    boardNotes.forEach((n, i) => {
      const note = cutoutPlane(`${SIGNAGE_DIR}${n.file}.png`, n.h * NOTE_ASPECT[n.file], n.h, { emissive: 0.16 });
      note.position.set(n.x, n.y, 0.072 + i * 0.004);
      note.rotation.z = n.rot;
      bg.add(note);
    });
    // A courier's delivery bike (Batch 11) parked at the board — the courier job's
    // required possession, stood right where the shift is taken. Fixed side-profile
    // (no billboarding): a bike reads by its silhouette, so it must not pivot.
    const bike = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Job_Bicycle.png`, 1.5, 1.05, { emissive: 0.12 });
    bike.position.set(1.55, 0.52, 0.2);
    bg.add(bike);
    bg.rotation.y = -0.4; // angle it toward the street
    scene.add(bg);
  }

  // ── Parked vehicles (Batch 18): the working harbour's wheels, fixed side-profile
  // cutouts like the courier bike. A delivery scooter stands near the notice board —
  // the courier's step-up from the bike, parked where the run is taken — and a small
  // panel van waits at the east kerb, its broad side to the street. Each is a flat
  // cutout sized to its PNG aspect, lightly self-lit so it reads after dark; the
  // scooter faces the approaching street (+z, angled), the van faces the street (−x).
  const parkedVehicles = [
    // [file, w, h, [x, y, z], yaw, emissive]
    ["PROP_Vehicle_Scooter", 1.41, 1.0, [3.5, 0.52, -4.4], 0.35, 0.12],
    ["PROP_Vehicle_Van", 3.15, 1.55, [5.7, 0.78, 11], -Math.PI / 2, 0.1],
  ];
  for (const [file, w, h, [x, y, z], yaw, emissive] of parkedVehicles) {
    const v = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive });
    v.position.set(x, y, z);
    v.rotation.y = yaw;
    scene.add(v);
  }

  // ── Quayside working clutter (Batch 42), now ALL real geometry — spr-038 retired the
  // last cutout here (the drying net). The trawl net is a draped 3D mesh of crossing twine
  // hung from a head-rope against the north sea-wall (z=24), bulging out and pooling toward
  // the deck; the lobster pots on the east kerb are a real stack of wire creels (spr-037),
  // turned ~3/4 to the quay so the player reads the hooped cages on approach (from −x). Both
  // sit in the long gaps clear of the stall/board/spawn/crates so nothing blocks the path.
  scene.add(buildFishingNet(-10.7, 24).root);
  scene.add(buildLobsterPots(5.8, -18, -Math.PI / 2 + 0.35).root);

  // ── Quay-edge safety & mooring gear (Batch 55, now all REAL geometry — spr-036 retired
  // the last two cutouts here): the sea-wall the near craft tie up against. A fixed steel
  // access ladder rises from the deck past the parapet into a grab bar (z=10), and a cluster
  // of rope fenders droops from the coping down the quay-side wall face (z=0). Both mount on
  // the wall's east face (x≈−10.8), in the long empty stretches clear of the bollards
  // (z∈{−34…34 step 8}), the perched gulls (z∈{−6,3,12,−19,25}) and the net (z=24).
  scene.add(buildFenders(0).root);                  // rope fenders hung over the coping
  scene.add(buildQuayLadder(10).root);              // steel access ladder, foot on the deck

  // ── The water's-edge mooring & safety gear, now built as REAL geometry (spr-034) rather
  // than billboarded cutouts: a cork life-ring on its station board mounted over the coping,
  // a cluster of fishing floats lashed to the wall, and a coil of mooring rope flaked flat
  // on the deck. All turn their working faces to the walkable quay (+x). Slotted into the
  // same long empty stretches the old cutouts held (life-ring z=−22, buoys z=−13, rope z=16),
  // clear of the bollards, perched gulls and the remaining net/fenders/ladder.
  scene.add(buildLifeRing(-10.7, -22, 1.05, 0).root);          // board flush to the wall, ring facing +x quay
  scene.add(buildBuoyCluster(-10.3, -13, 0.6, 0).root);        // floats hung in a row along the wall (z)
  scene.add(buildRopeCoil(-9.6, 16, 0.04, Math.PI / 2 - 0.3).root); // flat coil — rotationally symmetric

  // ── Floating markers above each interactable, so you can spot them from afar.
  const markers = [];
  for (const it of INTERACTABLES) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22),
      new THREE.MeshStandardMaterial({ color: it.marker, emissive: it.marker, emissiveIntensity: 0.85, roughness: 0.4 }),
    );
    m.position.set(it.x, 2.4, it.z);
    scene.add(m);
    markers.push(m);
  }

  // ── Ambient citizens walking the quay (spr-010). No longer plain palette bodies — each
  // is a fully-dressed role so the people in motion carry the same hats, builds and trade
  // props as the standing crowd: a top-hatted merchant browsing the stall, a broad porter
  // hauling a shoulder sack, a striding commuter, the constable on his beat, a coal-heaver
  // the length of the south quay, a clerk crossing with his ledger, a doctor on a call up
  // north. Props are all shoulder/chest/hat (never a ground cane), so they read while the
  // arms swing. Lanes are clearance-checked against the standing crowd; speeds + a per-
  // walker stride seed keep them from marching in lockstep (no Math.random — stable renders).
  const citizens = [];
  // `pace` is the walker's ground speed (m/s) — its own per-role tempo. A laden porter or
  // coalman trudges; a commuter, clerk or doctor on a call strides. player.js couples the
  // step cadence to this so the slow ones visibly step heavier, not just glide more slowly.
  const roster = [
    { kind: "Merchant",  x: -5,   z: 6,   span: 3,  pace: 1.15 }, // unhurried, surveying his goods
    { kind: "Porter",    x: 2,    z: -14, span: 10, pace: 0.85 }, // laden — a heavy trudge
    { kind: "Commuter",  x: -7,   z: -2,  span: 14, pace: 1.7  }, // somewhere to be, briskly
    { kind: "Constable", x: 4,    z: 18,  span: 6,  pace: 1.1  }, // a measured patrol
    { kind: "Coalman",   x: 0.5,  z: -14, span: 20, pace: 0.9  }, // heavy sacks — slow going
    { kind: "Clerk",     x: -3,   z: 0,   span: 12, pace: 1.6  }, // purposeful, ledger in hand
    { kind: "Doctor",    x: -6.5, z: 25,  span: 10, pace: 1.75 }, // on a call — the quickest
  ];
  roster.forEach((r, i) => {
    const seed = (i + 0.5) / roster.length; // a stable stride-phase offset, 0..1
    const fig = createFigure(r.kind, { seed });
    fig.root.position.set(r.x, 0, r.z - r.span / 2);
    scene.add(fig.root);
    citizens.push(makePatrol(fig, r.z - r.span / 2, r.z + r.span / 2, i, r.pace));
  });

  // ── A standing crowd of real, rounded citizen bodies milling along the quay (spr-004,
  // up from the old flat camera-facing billboards). Each is the shared figure builder
  // dressed in a per-role LOOKS palette, standing on its patch watching the water and
  // breathing the idle gait. Static positions (they loiter rather than walk — a walking
  // body in a fixed spot reads odd); placed clear of the interactables (vendor −5,4 ·
  // board 5,−6) and the spawn. `billboards` still backs the props/birds/clouds below.
  const billboards = [];
  const critters = []; // real-body animals (dog, cat, waterbirds) ticked from main.js (spr-022/023)
  const shadowTex = shadowTexture();
  const crowd = [
    { role: "Fisher",       x: -9.5, z: -14 },
    { role: "DockWorker",   x:  2.0, z: -11 },
    { role: "Elder",        x: -2.0, z: -24 },
    { role: "Commuter",     x: -5.0, z:  28 },
    { role: "Youth",        x:  3.6, z:  10.4, face: [4.3, 11] },   // NE knot (spr-009)
    { role: "MarketVendor", x: -7.2, z:   8.9, face: [-7.3, 10.3] },  // W knot (spr-009)
    { role: "DockWorker",   x: -9.0, z:  22 },
    { role: "Commuter",     x:  1.0, z: -28 },
    // Batch 26 (spr-002): six more roles broaden the port's range of age & class —
    // a child underfoot, a sailor off a boat, a sack-hauling porter, an uptown clerk,
    // a washerwoman at her basket, an old woman on her cane. Placed clear of the
    // interactables (vendor −5,4 · board 5,−6), the named cast and the spawn.
    { role: "Child",        x:  3.9, z:  12.2, face: [4.3, 11] },   // NE knot (spr-009)
    { role: "Sailor",       x: -9.5, z:  -3 },
    { role: "Porter",       x: -7.3, z: -20, face: [-9.2, -20] },  // S pair, two sacks (spr-009)
    { role: "Clerk",        x: -3.2, z:  24 },
    { role: "Washerwoman",  x: -8.4, z:  11.2, face: [-7.3, 10.3] },  // W knot (spr-009)
    { role: "OldWoman",     x: -7.4, z:   1 },
    // Batch 28 (spr-002): six more that span the book's class spectrum — the harbour
    // is "City of Small Chances", so the quay should hold the whole society, from the
    // destitute to the genteel: a beggar against the harbour wall (cap in hand), a
    // fishwife crying her basket, the constable on his beat, a busker on the fiddle,
    // a merchant in a top hat, a lady with a parasol. Spread into gaps along the quay,
    // clear of the interactables (vendor −5,4 · board 5,−6), the named cast and spawn.
    { role: "Beggar",       x: -10.2, z: -10 },
    { role: "Merchant",     x:   3.0, z: -22 },
    { role: "Lady",         x:   4.0, z:   0 },
    { role: "Constable",    x:   5.0, z:   6 },
    { role: "Musician",     x:  -1.0, z:  16 },
    { role: "Fishwife",     x:  -8.0, z:  19 },
    // Batch 32 (spr-002): six more that reach into corners of port society the roster
    // still missed — the inshore fisherman in his oilskins, a nun on her charity round,
    // a war-worn veteran on a cane, a girl selling cut flowers, the harbour-master with
    // his ledger, and a soot-black chimney sweep with his rods. Tucked into real gaps
    // along the quay, clear of the interactables (vendor −5,4 · board 5,−6), the named
    // cast (Mei/Tomo/Jun/Rafiq), the spawn (−3,16) and each other.
    { role: "Fisherman",    x: -10.2, z:   4 },
    { role: "Nun",          x:   0.5, z:  20 },
    { role: "Veteran",      x:  -3.5, z: -16 },
    { role: "FlowerGirl",   x:  -2.5, z:   9 },
    { role: "Dockmaster",   x:   5.0, z: -26 },
    { role: "Sweep",        x:  -8.5, z:  26 },
    // Batch 33 (spr-002): six working trades, each known by the tool it carries — the
    // priest with his book, the doctor with his bag, the lamplighter shouldering his
    // long pole, a barefoot urchin, the innkeeper with his tankard, the ferryman with
    // his oar. Tucked into the remaining gaps along the quay, clear of the interactables
    // (vendor −5,4 · board 5,−6), the named cast (Mei/Tomo/Jun/Rafiq), the spawn (−3,16)
    // and each other.
    { role: "Priest",       x:   2.5, z:  25 },
    { role: "Doctor",       x:  -6.0, z: -12 },
    { role: "Lamplighter",  x:  -6.0, z:  -3 },
    { role: "Urchin",       x:   1.5, z:   4 },
    { role: "Innkeeper",    x:  -6.3, z:  10.8, face: [-7.3, 10.3] },  // W knot (spr-009)
    { role: "Ferryman",     x:   6.0, z: -20 },
    // Batch 34 (spr-002): six more trades and the family life of the port — the smith
    // at his hammer, the baker with his bread, the itinerant tinker laden with pots, a
    // mother cradling her infant, a soldier of the garrison, and the coal-heaver bent
    // under his black sack. Set into the quay's far gaps, clear of the interactables
    // (vendor −5,4 · board 5,−6), the named cast (Mei/Tomo/Jun/Rafiq), the spawn (−3,16)
    // and each other. (30 → 36 standing crowd, toward the 40-NPC EA target.)
    { role: "Blacksmith",   x:  -9.5, z:  30 },
    { role: "Baker",        x:   4.5, z:  18 },
    { role: "Tinker",       x: -9.2, z: -20, face: [-7.3, -20] },  // S pair, two sacks (spr-009)
    { role: "Mother",       x:   0.5, z:  30 },
    { role: "Soldier",      x:   5.3, z:  10.5, face: [4.3, 11] },  // NE knot (spr-009)
    { role: "Coalman",      x:  -8.0, z: -24 },
    // Batch 35 (spr-002): the last four, landing the roster on the book's full 40
    // citizen variants — the schoolmistress with her slate, the knife-grinder at his
    // treadle barrow, the town crier mid-call with his bell, and a widow in mourning
    // black come to the water's edge (the sea's cost, counterpart to the mother above).
    // Set into the final gaps, clear of the interactables (vendor −5,4 · board 5,−6),
    // the named cast (Mei/Tomo/Jun/Rafiq), the spawn (−3,16) and each other.
    { role: "Schoolmistress", x: -1.0, z: -20 },
    { role: "Knifegrinder",   x:  4.0, z:  28 },
    { role: "TownCrier",      x: -4.0, z:  -8 },
    { role: "Widow",          x: -10.0, z: 16 },
  ];
  for (const c of crowd) {
    // A deterministic 0..1 seed per figure (no Math.random — keeps headless renders
    // stable) desyncs each idler's breathing/stance inside createFigure.
    const seed = (((c.x * 12.9 + c.z * 7.3) % 1) + 1) % 1;
    const fig = createFigure(c.role, { castShadow: false, seed });
    fig.root.position.set(c.x, 0, c.z);
    scene.add(fig.root);
    // Face the water (−x) with a deterministic per-figure spread — unless the figure
    // belongs to a conversational cluster (spr-009), in which case it turns to face the
    // group's centre `c.face`, so a few knots of people read as standing and talking
    // rather than a grid all staring at the harbour. (No Math.random — renders stay stable.)
    const yaw = c.face
      ? Math.atan2(c.face[0] - c.x, c.face[1] - c.z)
      : -Math.PI / 2 + (((c.x * 12.9 + c.z * 7.3) % 1.6) - 0.8);
    citizens.push(makeStanding(fig, yaw));

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(c.x, 0.02, c.z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the figure
    scene.add(blob);
  }

  // ── The named cast (Batch 22, spr-003): the harbour's own people, standing where
  // the day tends to put them — Mei working behind her noodle-stall counter, Tomo the
  // quayside mechanic at his patch by the water, Jun the courier dispatcher by the
  // notice board where the runs are taken, Rafiq the dock foreman with the gang to the
  // north. (Clara and Ava belong to uptown and the tenements — ship-ready until those
  // districts become walkable.) Same camera-facing billboard + contact-shadow treatment
  // as the ambient crowd, so the people you meet in the talk panel are the same people
  // you pass on the quay. Now real rounded bodies (spr-004) dressed to their role, each
  // turned to where their work faces. Placed clear of the interactables and the spawn.
  const namedLocals = [
    { name: "Mei",   x: -5.0, z: 3.1,  yaw: 0 },             // behind her counter, facing her customers (stall −5,4)
    { name: "Tomo",  x: -8.8, z: -7,   yaw: -Math.PI / 2 },  // the quay mechanic, facing the water at his patch
    { name: "Jun",   x: 3.0,  z: -7,   yaw: Math.PI / 2 },   // the dispatcher, facing the board + parked bike (5,−6)
    { name: "Rafiq", x: 4.7,  z: -12,  yaw: -Math.PI / 2 - 0.3 }, // the foreman, facing the loading at the north end
  ];
  // The named cast are also collected here (with their home heading) so the frame loop
  // can turn them to face the player when you come close, then ease them back to work.
  const locals = [];
  for (const p of namedLocals) {
    const seed = (((p.x * 12.9 + p.z * 7.3) % 1) + 1) % 1;
    const fig = createFigure(p.name, { castShadow: false, seed });
    fig.root.position.set(p.x, 0, p.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, p.yaw));
    locals.push({ fig, x: p.x, z: p.z, homeYaw: p.yaw });
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(p.x, 0.02, p.z);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // Seated idlers on the sea-wall (spr-031): until now every body in the harbour STOOD —
  // nobody ever sat. These two perch on the coping, legs dangling over the water, watching
  // it. Real rounded bodies in a real rest pose (`createFigure(..., {seated:true})` early-
  // returns to a sitting update in player.js — no knee joint needed, the legs simply hang).
  // The coping top is y=0.90 and the hip sits there, so root.y = 0.90 − HIP_Y(0.82) = 0.08.
  // Placed at the west edge of the coping (x≈−11.8, clear of the x=−11.1 bollards) facing
  // roughly west to the open water; z 6.5 / −13 dodge the perched gulls (z −6,3,12,−19,25),
  // the cat (z 9) and the heron (z 18). Propless roles so no cane floats over the water.
  // Seat at the very west lip of the coping (x=−11.95, the wall face is x=−12.0) so the
  // forward-dangling legs clear the stone almost at once — sitting an inboard 0.2 m buries
  // the thighs in the wall (no knee to fold them). The bum overhangs the edge a touch, as
  // it does on a real wall. The player meets them from the street (east), seeing their back.
  const sitters = [
    { role: "Sailor", x: -11.95, z: 6.5,  yaw: -Math.PI / 2 + 0.25 },
    { role: "Youth",  x: -11.95, z: -13,  yaw: -Math.PI / 2 - 0.2 },
  ];
  for (const s of sitters) {
    const seed = (((s.x * 9.1 + s.z * 4.7) % 1) + 1) % 1;
    const fig = createFigure(s.role, { castShadow: false, seed, seated: true });
    fig.root.position.set(s.x, 0.08, s.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, s.yaw));
  }

  // A conversation pair (spr-032): the crowd already has static face-to-face "knots" (spr-009),
  // but they only STAND turned toward one another — nobody actually talks. These two stand a
  // natural arm's-length apart on the open deck between the spawn (−3,16) and Mei's stall and
  // hold a real exchange: `createFigure(..., {talk:true, talkPhase})` gives each a turn-taking
  // gesture (one gesticulates & leans in while the other listens & nods, then they swap). The
  // pair is set ANTIPHASE (talkPhase 0 and π) so exactly one holds the floor at a time. Placed
  // at x≈0.5, z≈11 — ≥2.5 m clear of every crowd body, the pigeon flocks ((−2.5,6)/(1.5,14)),
  // the patrol lanes and the spawn — and angled a touch off the z-axis so the player coming
  // south from the spawn sees both at a three-quarter view, not one behind the other.
  const talkers = [
    { role: "Fisher",   x: 0.2, z: 10.6, talkPhase: 0 },
    { role: "Merchant", x: 0.9, z: 11.9, talkPhase: Math.PI },
  ];
  for (let i = 0; i < talkers.length; i++) {
    const t = talkers[i];
    const o = talkers[1 - i];                                  // the partner to face
    const seed = (((t.x * 12.9 + t.z * 7.3) % 1) + 1) % 1;
    const fig = createFigure(t.role, { castShadow: false, seed, talk: true, talkPhase: t.talkPhase });
    fig.root.position.set(t.x, 0, t.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, Math.atan2(o.x - t.x, o.z - t.z)));   // turn to face the partner
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(t.x, 0.02, t.z);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── Bespoke harbour signage (Batch 9): painted hanging shop signs and pasted
  // posters on the building façades (which front the quay, facing −x), plus a
  // small wall-tag on the quay wall (facing +x). All are alpha cutouts lit like
  // the Batch 6 signs so they stay readable after dark. The art is original —
  // pictorial marks only, no real-world brands or readable text.
  const FACADE = -Math.PI / 2; // a plane facing −x, toward the player on the street
  const QUAYWALL = Math.PI / 2; // facing +x, off the water-side wall toward the street
  const harbourSigns = [
    // Hanging shop signs standing proud of the x≈9 building fronts (bracket painted in).
    { url: "SIGN_HarbourGate", w: 1.5, h: 1.5, x: 8.45, y: 3.7, z: 21.5, face: FACADE, emissive: 0.32 },
    { url: "SIGN_Tavern", w: 1.4, h: 1.4, x: 8.45, y: 3.5, z: 2.25, face: FACADE, emissive: 0.32 },
    { url: "SIGN_Chandlery", w: 1.4, h: 1.4, x: 8.45, y: 3.5, z: -7.5, face: FACADE, emissive: 0.3 },
    { url: "SIGN_FerryStop", w: 1.3, h: 1.3, x: 8.45, y: 3.4, z: -17.25, face: FACADE, emissive: 0.3 },
    // Weathered posters pasted near-flush to the wall (a touch proud of the windows).
    { url: "POSTER_Harbour", w: 0.95, h: 1.18, x: 8.82, y: 1.85, z: -25.2, face: FACADE, emissive: 0.16 },
    { url: "POSTER_Civic", w: 0.95, h: 1.18, x: 8.82, y: 1.85, z: 13.3, face: FACADE, emissive: 0.16 },
    // A faint painted tag low on the quay wall.
    { url: "DECAL_Graffiti", w: 1.1, h: 1.1, x: -10.75, y: 0.62, z: 10, face: QUAYWALL, emissive: 0.1 },
  ];
  for (const s of harbourSigns) {
    const sign = cutoutPlane(`${SIGNAGE_DIR}${s.url}.png`, s.w, s.h, { emissive: s.emissive });
    sign.position.set(s.x, s.y, s.z);
    sign.rotation.y = s.face;
    scene.add(sign);
  }

  // ── Shopfronts (Batch 56): the building row carried hanging shop signs high on the
  // wall, but the ground floor under every sign was blank — no door to go in by, no
  // light at building level, no shop goods. These three painted cutouts give the
  // signed buildings their shopfront, mounted on the fronts under the matching sign:
  // a weathered timber door flush on the wall (the Batch-9 harbourSigns idiom — FIXED
  // FACADE cutout at yaw −π/2, base on the deck, NOT billboarded), a wrought-iron
  // bracket lantern beside it lit STRONG emissive so its amber glass glows after dusk
  // (the first warm light at building level — until now only the tall street lamps),
  // and a ground-planted stack of retail crates at the threshold (the cargo idiom —
  // billboarded with a soft contact-shadow blob). Doors sit under the Tavern (z2.25),
  // Chandlery (z−7.5) and HarbourGate (z21.5) signs; the Tavern/Chandlery doors are
  // already framed by the Batch-46 topiary tubs. Building fronts are at x≈9, so the
  // door sits flush at x8.95, the lantern a touch proud at x8.7, the crates out on
  // the deck at x8.0 — all clear of the walkable bounds (maxX 6.5).
  const shopDoors = [
    // [x, y, z] — Door 242×512 (h2.3, w1.09), base on deck (y = h/2), facing −x.
    [8.95, 1.15, 2.25], // Tavern
    [8.95, 1.15, -7.5], // Chandlery
    [8.95, 1.15, 21.5], // HarbourGate
  ];
  for (const [x, y, z] of shopDoors) {
    const door = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Shop_Door.png`, 1.09, 2.3, { emissive: 0.12, alphaTest: 0.4 });
    door.position.set(x, y, z);
    door.rotation.y = FACADE;
    scene.add(door);
  }
  const shopLanterns = [
    // [x, y, z] — Lantern 197×512 (h0.95, w0.37), mounted beside each door, amber glass
    // lit strong emissive so it reads as a warm light source after dark.
    [8.7, 2.55, 3.15], // beside the Tavern door
    [8.7, 2.55, -6.6], // beside the Chandlery door
    [8.7, 2.55, 22.4], // beside the HarbourGate door
  ];
  for (const [x, y, z] of shopLanterns) {
    const lantern = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Shop_Lantern.png`, 0.37, 0.95, { emissive: 0.8, alphaTest: 0.4 });
    lantern.position.set(x, y, z);
    lantern.rotation.y = FACADE;
    scene.add(lantern);
  }
  const shopCrates = [
    // [x, z, shadowR] — Crates 512×472 (w1.2, h1.1), ground-planted billboard at a
    // doorway threshold, on a soft contact-shadow blob. Placed at the two signed doors
    // without topiary (HarbourGate, FerryStop) so nothing collides with the tubs.
    [8.0, 20.5, 0.6], // by the HarbourGate door
    [8.0, -16.3, 0.6], // by the FerryStop sign
  ];
  for (const [x, z, shadowR] of shopCrates) {
    const crates = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Shop_Crates.png`, 1.2, 1.1, { emissive: 0.16, alphaTest: 0.4 });
    crates.position.set(x, 0.55, z);
    scene.add(crates);
    billboards.push(crates); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── The shopfronts come alive (Batch 58): Batch 56 gave the signed buildings a
  // door, a lantern and crates at the threshold, but the wall *around* each door was
  // still flat painted plaster — no window to look into, no awning over the glass,
  // nothing growing at the sill. These three FIXED façade cutouts (the Batch-9/56
  // idiom — `cutoutPlane` flat on the building front at `yaw = FACADE = −π/2`, NOT
  // billboarded, no contact-shadow blob) finish three blank bays into proper dressed
  // shopfronts: a small-paned glazed window flush on the wall, a faded striped awning
  // proud of it (shading the glass), and a window flower box on the sill. Three bays
  // dressed — left of the FerryStop sign (z−18.5), the tall Chandlery's blank side
  // (z−10.2), and right of the Tavern door past its topiary (z4.9) — each clear of the
  // doors, lanterns, topiary tubs and the high washing lines (y≈5–6.5).
  const shopWindows = [
    // [x, y, z] — Window 428×512 (w1.42, h1.7), flush on the front (x8.92), facing −x.
    [8.92, 1.75, -18.5], // FerryStop bay
    [8.92, 1.75, -10.2], // Chandlery blank side
    [8.92, 1.75, 4.9], // Tavern bay
  ];
  for (const [x, y, z] of shopWindows) {
    const win = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Shop_Window.png`, 1.42, 1.7, { emissive: 0.14, alphaTest: 0.4 });
    win.position.set(x, y, z);
    win.rotation.y = FACADE;
    scene.add(win);
  }
  const shopAwnings = [
    // [x, y, z] — Awning 512×267 (w2.2, h1.15), proud of the wall (x8.55) so it shades
    // the window below; the painted mounting bar sits along the awning's top edge.
    [8.55, 2.9, -18.5],
    [8.55, 2.9, -10.2],
    [8.55, 2.9, 4.9],
  ];
  for (const [x, y, z] of shopAwnings) {
    const awn = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Shop_Awning.png`, 2.2, 1.15, { emissive: 0.16, alphaTest: 0.4 });
    awn.position.set(x, y, z);
    awn.rotation.y = FACADE;
    scene.add(awn);
  }
  const shopFlowerBoxes = [
    // [x, y, z] — on the sill under each window (x8.78), trailing foliage hanging below — the
    // only softening greenery at building level. Now REAL geometry (spr-047, buildFlowerBox)
    // rather than the old PROP_Shop_FlowerBox cutout — the first off-stall good converted.
    [8.78, 0.82, -18.5],
    [8.78, 0.82, -10.2],
    [8.78, 0.82, 4.9],
  ];
  for (const [x, y, z] of shopFlowerBoxes) {
    scene.add(buildFlowerBox(x, y, z, FACADE).root);
  }

  // ── The market grows (Batch 57): "Market Row" is core, and the player spawns
  // (≈-3,16) right beside the harbour market — yet the live scene held only ONE
  // vendor, Mei's noodle stall at (-5,4). One stall reads as a single shop, not a
  // market; a market is the press of several pitches. This adds a SECOND vendor
  // pitch on the open deck between the spawn and Mei's stall, so the player walks
  // *into* a market: a costermonger's loaded two-wheeled handcart, a crock-seller's
  // cluster of glazed earthenware jars, and a tall canvas parasol shading the pitch.
  // All three are ground-planted camera-facing billboards (the Batch-50 cargo idiom
  // — pushed to `billboards`, base on the image bottom, each on a soft contact-shadow
  // blob), clustered east of the commuter patrol line (x-7) and clear of the stall
  // goods and the 3D barrels (z2.6–3.5).
  const marketPitch = [
    // [file, w, h, x, z, shadowR, emissive] — base planted at y = h/2 on the deck.
    ["PROP_Market_Parasol", 1.74, 2.6, -5.7, 11.4, 0.55, 0.18], // tall anchor of the pitch
    ["PROP_Market_Cart", 2.05, 1.35, -6.4, 12.9, 0.95, 0.16], // the wide costermonger's barrow
    ["PROP_Market_Crocks", 1.15, 0.91, -4.5, 12.0, 0.6, 0.16], // a huddle of glazed jars
  ];
  for (const [file, w, h, x, z, shadowR, emissive] of marketPitch) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── Seagulls (Batch 43 → spr-026): the harbour's defining creature. The perched and
  // calling gulls — along the wet sea-wall top, on the lamp cross-arms, on the moored boat
  // (one at the masthead, calling), and on two rooftops — were camera-facing cutouts; now
  // each is a REAL herring-gull body (buildGull above), the loop's own ask "real body
  // instead of faced picture." They sit ON their perch with a FIXED facing and a small idle
  // (perched birds scan, calling birds throw the head back to cry). baseY is the perch
  // surface (the old cutout's bottom edge); no contact blob — gulls perch on rails, never
  // plant on the ground. Only the SOARING gulls (wheeling high over the water) stay
  // billboards — see soaringGulls just below — the legit distant-flying-bird idiom.
  const gulls = [
    // [calling, x, z, baseY, facing]
    // Along the wet sea-wall top (wall top y≈0.91, x≈−11.4), set between the bollards.
    [false, -11.4, -6, 0.91, 0.5],
    [true, -11.4, 3, 0.91, 0.2],
    [false, -11.4, 12, 0.91, -0.4],
    [false, -11.4, -19, 0.91, 0.7],
    [true, -11.4, 25, 0.91, 0.0],
    // On the lamp cross-arms (arm top y≈2.97, x≈−9.25; lamps at z∈{−28,−14,0,14,28}).
    [false, -9.25, -14, 2.97, 0.3],
    [true, -9.25, 14, 2.97, -0.3],
    // On the moored boat out over the water: one on the gunwale, one at the masthead crying.
    [false, -19.8, -2.5, 0.7, 0.8],
    [true, -20.0, -4.5, 5.53, 1.2],
    // On two harbour rooftops (front edge x≈9), high over the street, facing the road (−x).
    [false, 9.2, -26.5, 8.8, 2.6],
    [true, 9.2, 12.25, 9.8, 2.6],
  ];
  for (const [calling, x, z, baseY, facing] of gulls) {
    const gull = buildGull(x, z, baseY, facing, calling);
    scene.add(gull.root);
    critters.push(gull); // ticked from main.js's critter clock
  }

  // ── Wheeling gulls (Batch 70 → spr-027): the soaring gulls were the LAST bird
  // billboards — two camera-facing cutout frames (PROP_Gull_Flying / _FlyingUp) swapped
  // for a fake flap. Now each soarer is a real `buildSoaringGull()` body — a flattened
  // pearl-grey gull with two pivoting wings — that drifts along a slow Lissajous path over
  // the water. main.js wheels the path, turns the body to face its own heading (atan2 of
  // the path velocity — NO camera-facing), and beats the wings about their shoulder
  // pivots. No contact shadow, no day-cycle hook — gulls wheel by day and dusk the same
  // (the audio already thins the cries at night). Tracked in its own array, NOT in
  // `billboards` nor `critters`: the soaring update owns its heading + wingbeat directly.
  const soaringGulls = [];
  const soarers = [
    // [x0, y0, z0, zAmp, xAmp, yAmp, speed, phase] — wheel about (x0,y0,z0)
    [-25, 9, -2, 16, 4.5, 0.8, 0.10, 0.0],
    [-18, 11, 9, 14, 3.5, 0.7, 0.13, 1.7],
    [-30, 13, -15, 18, 5.0, 0.9, 0.08, 3.1],
    [4, 14, -4, 12, 3.0, 0.6, 0.15, 4.6],
  ];
  for (const [x0, y0, z0, zAmp, xAmp, yAmp, speed, phase] of soarers) {
    const g = buildSoaringGull();
    g.root.position.set(x0, y0, z0);
    scene.add(g.root);
    soaringGulls.push({ root: g.root, leftWing: g.leftWing, rightWing: g.rightWing, x0, y0, z0, zAmp, xAmp, yAmp, speed, phase });
  }

  // ── Vessels on the water (Batch 44): the wide sea west of the quay carried just one
  // moored boat (real geometry, near). These three painted broadside cutouts stand far
  // out as camera-facing billboards (the cloud/gull idiom) — a three-masted tall ship at
  // anchor, a steam fishing trawler, a tan-sailed sailing barge — so the harbour reads as
  // a working port with traffic, not an empty bay. Each ship's painted waterline is the
  // image's bottom edge, so we sit that edge on the water surface (WL): the plane centre
  // is half its height above the water. Placed far enough (x≤−40) that the billboard's
  // slow turn is imperceptible, and lightly hazed by the harbour fog at distance.
  const WL = -0.05; // water surface y (matches the water plane above)
  const vessels = [
    // [file, w, h, x, z] — hull bottom (= image bottom) sits on the waterline.
    ["PROP_Ship_TallShip", 11.4, 10, -60, -20],
    ["PROP_Ship_Trawler", 6.6, 4, -44, 28],
    ["PROP_Ship_Barge", 9.1, 6, -40, -34],
  ];
  for (const [file, w, h, x, z] of vessels) {
    const ship = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.2, alphaTest: 0.35 });
    ship.position.set(x, WL + h / 2, z);
    scene.add(ship);
    billboards.push(ship); // main.js turns it to face the camera each frame
  }

  // ── Small craft on the near water (Batch 54): the bay carried traffic far out (the
  // Batch-44 tall ship, trawler and barge at x≤−40) and one moored cabin-boat near the
  // quay, but the wide band of near water between the sea-wall and that moored boat was
  // bare. A working harbour is thick with the small craft that ferry between hull and
  // shore — so these three painted cutouts float there: a clinker rowing dory, a small
  // sailing dinghy with its tan sail furled, and a flat-bottomed harbour punt. Same idiom
  // as the far vessels above (sit the painted waterline on the water surface WL, NO contact
  // shadow — they float — and billboard each so its broadside always reads), just placed
  // close in (x≈−13..−17, spread across z) so the player looking out over the wall sees a
  // busy small-boat harbour. Clear of the moored boat at (−20,−6), the buoy line (−10.3,−13)
  // and the far vessels. Plane sized to each cutout's true aspect so nothing distorts.
  const nearCraft = [
    // [file, w, h, x, z] — waterline (= image bottom) sits on WL; centre is h/2 above it.
    ["PROP_Boat_Rowboat", 2.4, 0.79, -14, 18], // clinker rowing dory, north band
    ["PROP_Boat_Punt", 2.7, 0.48, -13.5, -1], // flat-bottomed harbour punt, mid band near the wall
    ["PROP_Boat_Dinghy", 1.6, 1.6, -16.5, -24], // furled-sail sailing dinghy, south band
  ];
  for (const [file, w, h, x, z] of nearCraft) {
    const craft = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.2, alphaTest: 0.4 });
    craft.position.set(x, WL + h / 2, z);
    scene.add(craft);
    billboards.push(craft); // main.js turns it to face the camera each frame
  }

  // ── The boats light their lanterns (Batch 67): the moored vessels (the far tall ship,
  // trawler and barge, the near dory/punt/dinghy above) sit dark over the water at night,
  // while the quay lamps (B62), the brazier (B64) and the far lighthouse (B66) all light
  // up — a working harbour shows its boats' running lanterns after dark. Hang a small warm
  // AMBER lantern glow on the vessels (additive, fog-off, self-lit MeshBasic, NO star-
  // glints — an oil lantern, not the navigation beacon), each a camera-facing billboard so
  // the soft halo always reads; opacity rides the night-blend weight (setBoatLights, from
  // daycycle.js) — dark by day, full at deep night, exactly as the moon, lamps and beacon.
  // Placed at each hull so the warm points scatter a constellation of running lights across
  // the dark bay: a stern lantern high on the tall ship, a cabin lantern on the trawler, a
  // bow lantern on the near dory and the dinghy. Far lanterns sized larger so they read at
  // distance; near ones small and close. Clear of the moonglades (B63) and mist banks (B65).
  const boatLights = [];
  const lanternTex = _texLoader.load(`${FX_DIR}FX_Light_BoatLantern.png`);
  lanternTex.colorSpace = THREE.SRGBColorSpace;
  const lanterns = [
    // [x, y, z, size, base] — warm running lights hung at each hull.
    [-59, 4.6, -19, 2.8, 0.9], // tall ship stern lantern (far, large to read at distance)
    [-43.5, 2.2, 28, 1.7, 0.85], // trawler cabin lantern
    [-14, 0.7, 18, 0.7, 0.8], // near dory bow lantern
    [-16.5, 0.85, -24, 0.7, 0.8], // near dinghy lantern
  ];
  for (const [x, y, z, size, base] of lanterns) {
    const lantern = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({
        map: lanternTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        color: new THREE.Color(0xffb860),
      }),
    );
    lantern.position.set(x, y, z);
    lantern.renderOrder = 4;
    lantern.userData.glowBase = base;
    scene.add(lantern);
    billboards.push(lantern); // main.js turns each lantern to face the camera each frame
    boatLights.push(lantern);
  }
  function setBoatLights(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const l of boatLights) l.material.opacity = n * l.userData.glowBase;
  }

  // ── Harbour waterbirds (Batch 60 → spr-023/024): a working port is alive with waterbirds.
  // The HERON sentinel, the raft of DUCKS and the wing-drying CORMORANT were all camera-facing
  // billboards; spr-023/024 rebuild every one as a REAL body (buildHeron/buildDuck/buildCormorant
  // above) — the loop's own ask, "real body instead of faced picture" — perched/floating with a
  // fixed facing and a small idle (the heron scans, the ducks bob and drift, the cormorant's wings
  // breathe as they dry). No bird billboards remain on the water. Coping top ≈0.91 (perched gulls
  // sit there). All clear of the gulls, the quay-edge gear and the near craft, in the long open
  // coping/water gaps off the sea-wall.
  const cormorant = buildCormorant(-11.1, -26, 1.5, 0.4); // wings out to dry, perched on the mooring bollard (top y≈1.5)
  scene.add(cormorant.root);
  critters.push(cormorant);

  const heron = buildHeron(-11.4, 18, 0.91, 2.7); // standing sentinel, looking out over the water
  scene.add(heron.root);
  critters.push(heron);

  // A raft of three mallards on the sheltered near water off the wall — two drakes and a
  // hen at slightly different headings, each bobbing on its own phase.
  const duckSpots = [
    [-12.5, 6.0, 2.6, true, 0.0],
    [-12.0, 6.6, 2.1, false, 1.7],
    [-13.0, 5.4, 3.2, true, 3.4],
  ];
  for (const [dx, dz, df, drake, ph] of duckSpots) {
    const duck = buildDuck(dx, dz, WL, df, drake, ph);
    scene.add(duck.root);
    critters.push(duck);
  }

  // ── Light on the night water (Batch 63): the moon (Batch 61) and the warmed
  // lamps (Batch 62) hang over the harbour, but the biggest surface in the scene —
  // the water — stayed dead-flat and dark after dark, reflecting nothing. The quay
  // camera sees the water EDGE-ON at a grazing angle, so a flat decal laid on the
  // surface foreshortens to an invisible thread; a real light-path on rippled water
  // reads instead as a SHIMMERING VERTICAL COLUMN climbing from the waterline toward
  // its source. So these are camera-facing BILLBOARDS (the boat/duck idiom), not flat
  // decals: one neutral pale-silver shimmer texture, tinted COOL for the open-water
  // moonglade and WARM for the lamp-glints just past the sea-wall, base sat on the
  // water (WL) so each rises off the surface. Additive + fog-off + self-lit (MeshBasic),
  // opacity driven off the night-blend weight (setWaterGlow, from daycycle.js) — dark
  // by day, brightening with the night exactly as the moon and lamps do.
  const waterGlows = [];
  const shimmerTex = _texLoader.load(`${FX_DIR}FX_Light_WaterShimmer.png`);
  shimmerTex.colorSpace = THREE.SRGBColorSpace;
  const shimmers = [
    // [w, h, x, z, tint, base] — cool moonglades in the near-open west water, warm
    // lamp-glints right past the sea-wall under the lamps. Kept close in (x≈−12..−18)
    // and bright so the grazing-angle water actually catches the light.
    [3.2, 2.6, -17, -10, 0xbcd2ff, 0.85], // broad moonglade under the moon, near-open water
    [2.6, 2.2, -19, 4, 0xb6ccff, 0.78], // second moonglade, near-open water
    [1.5, 1.9, -12, -26, 0xffd28a, 0.7], // warm lamp-glint just past the wall, south
    [1.5, 1.9, -12, -12, 0xffd28a, 0.7], // warm lamp-glint, mid (off the central lamp)
    [1.5, 1.9, -12, 16, 0xffd28a, 0.7], // warm lamp-glint, north
  ];
  for (const [w, h, x, z, tint, base] of shimmers) {
    const shim = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: shimmerTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        color: new THREE.Color(tint),
      }),
    );
    shim.position.set(x, WL + h / 2, z); // base of the column on the water surface
    shim.renderOrder = 1;
    shim.userData.glowBase = base;
    scene.add(shim);
    billboards.push(shim); // main.js turns the column to face the camera each frame
    waterGlows.push(shim);
  }
  function setWaterGlow(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const s of waterGlows) s.material.opacity = Math.min(1, n * s.userData.glowBase);
  }

  // ── The sun on the water (Batch 68): the moonglades above light the NIGHT water, but
  // by DAY — when the player is most often out — the wide bay sat flat and dead under
  // bright sun. Real water dazzles with broken sun-glitter. This is the daytime
  // counterpart to the moonglades: bright white-gold specular sparkle dancing on the
  // rippled water, instanced across the open west water as camera-facing billboards (the
  // SAME grazing-angle trick — the water is seen EDGE-ON, so a flat decal foreshortens to
  // nothing; a sun-path reads as a shimmering column climbing from the waterline). Self-
  // lit MeshBasic, AdditiveBlending, fog off; opacity rides the DAY-blend weight
  // (setSunGlitter, from daycycle.js) — dazzling at midday, fading at dawn/dusk, ~0 at
  // night (exactly the inverse of the moonglades). Placed in the open water clear of the
  // moonglade spots (−17,−10 / −19,4) so day and dusk never stack on the same column.
  const sunGlitters = [];
  const glitterTex = _texLoader.load(`${FX_DIR}FX_Light_SunGlitter.png`);
  glitterTex.colorSpace = THREE.SRGBColorSpace;
  const glitters = [
    // [w, h, x, z, base] — bright warm-white sun-paths down the open west water. High base
    // so the bright sparkle cores clip toward white (dazzle) against the already-bright day
    // water — additive light reads far less here than the moonglades do on dark night water.
    [3.2, 3.2, -15, -16, 0.95],
    [2.8, 2.9, -18, -2, 0.9],
    [3.2, 3.2, -16, 14, 0.95],
    [2.6, 2.7, -20, 26, 0.85],
  ];
  for (const [w, h, x, z, base] of glitters) {
    const glit = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: glitterTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
        color: new THREE.Color(0xfff2dc),
      }),
    );
    glit.position.set(x, WL + h / 2, z); // base of the column on the water surface
    glit.renderOrder = 1;
    glit.userData.glowBase = base;
    scene.add(glit);
    billboards.push(glit); // main.js turns the column to face the camera each frame
    sunGlitters.push(glit);
  }
  function setSunGlitter(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const s of sunGlitters) s.material.opacity = Math.min(1, n * s.userData.glowBase);
  }

  // ── Mist on the water (Batch 65): the last four batches lit the NIGHT (moon, lamp
  // pools, water reflections, brazier fire); this one works the other end of the clock —
  // the cool dawn and dusk. The water sat flat and clear at every hour, but a working
  // harbour breathes mist at first light and a haze rising at dusk, burning off under
  // bright midday. A row of soft low banks of sea-mist drift over the near water, each a
  // camera-facing billboard (the cloud/boat idiom, so the soft card always reads) with
  // NORMAL alpha blending (mist VEILS what's behind it — it is not additive light) and
  // fog ON (it is atmosphere — it hazes into the distance and darkens with the night).
  // One neutral texture, instanced low across the water; opacity rides a new day-cycle
  // mist curve (setWaterMist, from daycycle.js) — thick at dawn, a haze at dusk, ~0 at
  // bright midday, faint at deep night.
  const waterMists = [];
  const mistTex = _texLoader.load(`${FX_DIR}FX_Weather_WaterMist.png`);
  mistTex.colorSpace = THREE.SRGBColorSpace;
  const mistBanks = [
    // [w, h, x, z, base] — wide low banks hugging the near/mid water, base on WL.
    [8.5, 2.2, -18, -20, 0.5],
    [9.0, 2.4, -24, -4, 0.55],
    [8.0, 2.0, -20, 12, 0.5],
    [9.5, 2.5, -30, 24, 0.6],
    [8.0, 2.1, -16, 31, 0.48],
  ];
  for (const [w, h, x, z, base] of mistBanks) {
    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: mistTex, transparent: true, opacity: 0,
        depthWrite: false, fog: true, color: new THREE.Color(0xdfe6ea),
      }),
    );
    mist.position.set(x, WL + h / 2, z); // base of the bank on the water surface
    mist.userData.mistBase = base;
    scene.add(mist);
    billboards.push(mist); // main.js turns the bank to face the camera each frame
    waterMists.push(mist);
  }
  function setWaterMist(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const m of waterMists) m.material.opacity = n * m.userData.mistBase;
  }

  // ── The far shore (Batch 45): close the empty horizon — the opposite bank of the bay.
  // A FIXED (NOT billboarded — a horizon must never turn) fog-blended band of painted hazy
  // distant land standing along the far-west edge of the water (x≈−79), facing the quay
  // (+x). Atmospheric-perspective art + the harbour fog sink it into the distance behind the
  // Batch-44 vessels: a rolling-cliff coast, a far-bank town, and a lighthouse headland at
  // the harbour mouth. Each piece's painted shoreline is the image bottom edge, so we sit
  // that edge on the water surface (WL). Segments overlap in z so the bank reads continuous
  // across the western view; low emissive keeps them dim and far, alphaTest depth-sorts them
  // cleanly in front of the sky dome and behind the ships.
  const shore = [
    // [file, w, h, z] — all at x=−79, facing +x, shoreline on the waterline.
    ["PROP_Shore_Cliffs", 54, 5, -42],
    ["PROP_Shore_Town", 50, 5, 4],
    ["PROP_Shore_Lighthouse", 50, 9, 44],
  ];
  for (const [file, w, h, z] of shore) {
    const land = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.14, alphaTest: 0.3 });
    land.position.set(-79, WL + h / 2, z);
    land.rotation.y = Math.PI / 2; // face +x, toward the quay
    scene.add(land);
  }

  // ── The lighthouse shines (Batch 66): the far-shore lighthouse (above) closes the
  // harbour mouth, but its lantern never lit — at night, a dark tower over dark water.
  // Now that the night is richly lit (moon B61, lamp pools B62, water reflections B63,
  // brazier fire B64) a working harbour mouth needs its guiding light. Hang ONE bright
  // warm-white beacon flare at the lantern (additive, fog-off, self-lit MeshBasic), its
  // opacity riding the night-blend weight (setBeacon, from daycycle.js) — dark by day,
  // full at deep night, exactly as the moon and lamps. The lantern's world position is
  // read off the PROP_Shore_Lighthouse sprite: that plane sits at (−79, 4.45, 44) rotated
  // to face +x, so image-x→world-z (z = 44 − local_x) and image-y→world-y (y = 4.45 +
  // local_y); the lantern sits at image-frac (≈0.81 from left, ≈0.07 from top) → world ≈
  // (−79, 8.1, 28.5). The flare billboard sits just in front (x = −78.5) so it draws over
  // the opaque shore plane.
  const beaconGlows = [];
  const beaconTex = _texLoader.load(`${FX_DIR}FX_Light_Beacon.png`);
  beaconTex.colorSpace = THREE.SRGBColorSpace;
  const beacon = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 5.5),
    new THREE.MeshBasicMaterial({
      map: beaconTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      color: new THREE.Color(0xfff0d0),
    }),
  );
  beacon.position.set(-78.5, 8.1, 28.5); // at the lighthouse lantern, just in front of the shore
  beacon.renderOrder = 5; // draws over the opaque shore band
  beacon.userData.glowBase = 0.95;
  scene.add(beacon);
  billboards.push(beacon); // main.js turns the flare to face the camera each frame
  beaconGlows.push(beacon);
  function setBeacon(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const b of beaconGlows) b.material.opacity = n * b.userData.glowBase;
  }

  // ── Living green on the grey quay (Batch 46): the harbour is all stone, timber and
  // water — painted ground, gulls, vessels, a far shore — but not one growing thing.
  // These three painted plant cutouts dress the quay with green: clipped bay topiary in
  // tubs flanking the building doorways, half-barrel flower planters down the water-side
  // rail (a splash of warm colour), and two hardy trees sprung from the cobbles at the
  // building-row ends (vertical green for the skyline). Unlike the gulls/vessels/shore
  // these are GROUND-PLANTED, so each gets a soft contact-shadow blob (the citizen idiom)
  // to sit it on the deck, and each is a camera-facing billboard so its painted face always
  // reads. Each plant's base is the image's bottom edge, so the plane centre is half its
  // height above the ground. Placed clear of the walkable bounds (against the building
  // fronts x≈8 and the water-side wall x≈−10.2), the interactables (vendor −5,4 · board
  // 5,−6) and the named cast.
  const plants = [
    // [file, w, h, x, z, shadowR]
    // Bay topiary in tubs flanking the harbour doorways (against the façades at x≈8.1,
    // just past the walkable edge — below the hanging shop signs, framing the doors).
    ["PROP_Plant_PottedTree", 0.82, 1.7, 8.1, 1.0, 0.36], // Tavern door, south jamb
    ["PROP_Plant_PottedTree", 0.82, 1.7, 8.1, 3.5, 0.36], // Tavern door, north jamb
    ["PROP_Plant_PottedTree", 0.78, 1.62, 8.1, -8.6, 0.34], // Chandlery door, south jamb
    ["PROP_Plant_PottedTree", 0.78, 1.62, 8.1, -6.4, 0.34], // Chandlery door, north jamb
    // Half-barrel flower planters down the water-side quay rail (x≈−10.2, on the deck just
    // inside the sea-wall) — warm reds and golds against the grey stone and water.
    ["PROP_Plant_Flowers", 1.05, 1.02, -10.2, -15, 0.55],
    ["PROP_Plant_Flowers", 1.05, 1.02, -10.2, 1, 0.55],
    ["PROP_Plant_Flowers", 1.05, 1.02, -10.2, 18, 0.55],
    // Hardy quayside trees at the ends of the building row — sprung from a corner of the
    // cobbles, vertical green closing the street's north and south ends.
    ["PROP_Tree_Quay", 2.7, 4.2, 7.8, 27, 0.6],
    ["PROP_Tree_Quay", 2.45, 3.8, 7.8, -30, 0.55],
  ];
  for (const [file, w, h, x, z, shadowR] of plants) {
    const plant = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.18, alphaTest: 0.35 });
    plant.position.set(x, h / 2, z);
    scene.add(plant);
    billboards.push(plant); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the plant
    scene.add(blob);
  }

  // ── Washing day over the quay (Batch 47 → spr-033): the tall façades fronting the quay
  // were the plainest surface left, so a crowded period port hangs its washing out over the
  // street. This began as three painted laundry CUTOUTS (flat faced pictures sagging on the
  // wall); spr-033 rebuilds them as REAL hanging cloth — the loop's own ask, "real … instead
  // of faced picture with fake 3D," applied to a prop. Each line is a sagging rope (catenary)
  // strung along z with real garments hanging off it, every one swinging gently in the wind
  // (`buildWashingLine.update(t)` billows them about the line axis). Strung a little proud of
  // the wall (x=8.5) facing the street (−x), high above the doors/shop-signs and below the
  // rooflines. Ticked from main.js's critter clock via `world.washing`.
  const washing = [];
  const washLines = [
    // [x, yTop, z0, z1, colour palette, garment hang-height] — one line per upper façade.
    { x: 8.5, yTop: 5.7,  z0: -28.2, z1: -24.8, colors: [0x6b5d4a, 0x3a4658, 0x8a8378, 0x55503f, 0x726a55], gh: 0.85 }, // dock work-clothes, southmost building
    { x: 8.5, yTop: 7.05, z0: -9.35, z1: -5.65, colors: [0xece6d6, 0xf0ece2, 0xe2dcc8, 0xeee9da],           gh: 1.05 }, // pale linens (sheets), tall Chandlery wall
    { x: 8.5, yTop: 6.3,  z0: 10.55, z1: 13.95, colors: [0xa8443a, 0x3f6f8a, 0x4f7d5a, 0xc7a14a, 0x8a5a86], gh: 0.85 }, // a splash of colour, north building
  ];
  washLines.forEach((L, li) => {
    const n = L.colors.length;
    const garments = L.colors.map((color, i) => ({
      t: (i + 0.5) / n,                            // evenly spaced, inset from the rope ends
      w: 0.34 + ((i * 7) % 3) * 0.07,              // 0.34..0.48 — varied widths (deterministic)
      h: L.gh * (0.85 + ((i * 5) % 3) * 0.1),      // varied hang lengths
      color,
    }));
    const line = buildWashingLine(L.x, L.yTop, L.z0, L.z1, garments, li * 2.1);
    line.root.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    scene.add(line.root);
    washing.push(line);
  });

  // ── Life on the cobbles (Batch 48 → spr-022): the quay kept no animals at the player's
  // own eye level. The dog and cat began as camera-facing billboards; spr-022 rebuilds
  // them as REAL rounded bodies (buildDog/buildCat above) — the loop's own ask, "real body
  // instead of faced picture with fake 3D" — with a fixed facing and a small idle (the dog
  // wags and sniffs, the cat flicks its tail and watches the water). The PIGEONS stay
  // flat billboards: tiny ground clusters where a real-body flock is overkill and a cutout
  // reads fine. `baseY` is the surface the animal sits on (0 = deck, 0.9 = sea-wall top).
  const dog = buildDog(-7.0, 5.5, 0.4);   // a stray by Mei's stall, turned toward the scraps
  const cat = buildCat(-11.1, 9, 0.9, 3.0); // on the sea-wall coping, looking out over the water
  scene.add(dog.root); scene.add(cat.root);
  critters.push(dog, cat);
  // the dog stands on the deck → a soft contact-shadow blob (the cat is perched, like the gulls — none)
  const dogBlob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 16),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
  );
  dogBlob.rotation.x = -Math.PI / 2;
  dogBlob.position.set(-7.0, 0.02, 5.5);
  dogBlob.renderOrder = -1;
  scene.add(dogBlob);

  // ── Pigeons on the cobbles (Batch 48 → spr-025): the two pigeon CLUSTER cutouts were
  // the last ground-animal billboards; now each is a small flock of REAL pecking bodies
  // (buildPigeon above) — the loop's own ask, "real body instead of faced picture." Each
  // bird has its own scatter spot, heading, plumage morph and peck phase (deterministic, no
  // Math.random) so the flock never pecks in lockstep. A soft contact blob grounds each group.
  const pigeonFlocks = [
    // [cx, cz] cluster centre, then [dx, dz, facing, morph, phase] per bird (offsets in world units)
    [-2.5, 6.0, [
      [0, 0, 0.6, 0, 0.0], [0.35, 0.35, 2.4, 1, 1.3], [-0.35, 0.25, -1.1, 2, 2.6], [0.1, -0.4, 1.8, 0, 3.9],
    ]],
    [1.5, 14.0, [
      [0, 0, 2.0, 1, 0.7], [0.35, 0.3, -0.5, 0, 2.0], [-0.3, -0.3, 3.0, 2, 3.3],
    ]],
  ];
  for (const [cx, cz, birds] of pigeonFlocks) {
    for (const [dx, dz, facing, morph, phase] of birds) {
      const pigeon = buildPigeon(cx + dx, cz + dz, facing, morph, phase);
      scene.add(pigeon.root);
      critters.push(pigeon);
    }
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 18),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.38 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(cx, 0.02, cz);
    blob.renderOrder = -1; // under the cobbles' specular, never over the birds
    scene.add(blob);
  }

  // ── Woodsmoke from the chimneys (spr-043, was Batch 49): the sky over the rooftops was
  // the emptiest zone in the frame — a working port has woodsmoke curling off its roofs, and
  // that single touch makes the buildings read warm and lived-in. This used to be three flat
  // luminance-alpha billboards (PROP_Smoke_Column/Plume/Wisp) — faced pictures of smoke. Now
  // they're REAL rising sprite-puff columns on the shared `smokePlumes` system (the same
  // puffs as the home chimneys and Mei's bowl steam), so ALL smoke in the harbour is one
  // rising-puff system, ticked in one place — the last flat smoke is gone. addRoofSmoke keeps
  // depthTest off + a high renderOrder so the plumes still draw over the far sky dome and the
  // day-cycle sky-tint spheres, exactly as the billboards did; standing high above the
  // rooflines, nothing is ever in front of them. Each roof gets its own column size.
  const roofSmoke = [
    // [x, roofTop, z, {n, rise, drift, scaleBase, scaleGain, maxOpacity}] — mouth sits on the roof.
    [12.6, 11.3, -9.0, { n: 7, rise: 4.8, drift: 1.0, scaleBase: 0.8, scaleGain: 2.2, maxOpacity: 0.5 }], // the tall chandlery: a busy kitchen chimney
    [12.4, 9.8, 10.8, { n: 6, rise: 4.2, drift: 0.85, scaleBase: 0.6, scaleGain: 1.8, maxOpacity: 0.46 }], // a hearth well alight
    [12.0, 8.8, -25.0, { n: 5, rise: 3.4, drift: 0.7, scaleBase: 0.45, scaleGain: 1.3, maxOpacity: 0.42 }], // a fire just catching
  ];
  for (const [x, roofTop, z, o] of roofSmoke) addRoofSmoke(scene, x, roofTop, z, smokePlumes, o);

  // ── Steam off the noodle bowl (spr-042, was Batch 69): Mei's bowl is REAL geometry now
  // (spr-041) and it should breathe like it's hot. The old steam was a single flat
  // FX_Smoke_NoodleSteam billboard hung at a fixed height above the (then flat) bowl — a
  // faced picture of vapour. This replaces it with real volumetric steam: soft sprite
  // puffs rising and curling off the actual bowl, on the SAME shared plume system as the
  // rooftop chimney smoke (addBowlSteam pushes a small-scale plume to `smokePlumes`, ticked
  // in main.js). The mouth sits just above the noodle dome — bowl at stall-local (0.55,0.9,
  // 0.42) → world (−4.45, dome apex ~1.05, 4.42). Vapour you can walk around, lit by the
  // day cycle, occluded correctly by props/people in front (sprites keep depthTest on).
  addBowlSteam(scene, -5 + 0.55, 1.05, 4 + 0.42, smokePlumes);

  // ── The working cargo of the port (Batch 50): the quay is dressed for life — a cat, a
  // dog, pigeons, washing, planters — far more than for work. There are crates and sacks
  // by the stall, but none of the heavy freight a port actually handles. Three painted
  // cargo cutouts now sit, sparsely, in the open working spots: stout iron-hooped casks
  // rolled off a boat onto the quay, a labourer's two-wheel hand-barrow stood at rest by
  // the shopfronts, and a great rusted admiralty anchor laid up with its chain at the
  // north end of the sea-wall. Like the animals these are GROUND-PLANTED camera-facing
  // billboards, each given a soft contact-shadow blob to sit it on the deck; each prop's
  // base is the image's bottom edge, so the plane centre is half its height above the
  // ground. Placed against the water-side wall (x≈−10) and the building kerb (x≈7) in the
  // long gaps clear of the Batch-42 quay clutter, the planters, the named cast and spawn.
  const cargo = [
    // [file, w, h, x, z, shadowR]
    ["PROP_Cargo_Barrels", 1.2, 1.03, -9.8, -24, 0.6], // casks off a boat, south quay
    ["PROP_Cargo_Barrels", 1.1, 0.95, -9.9, -4, 0.55], // a second stack, mid-quay
    ["PROP_Cargo_Handbarrow", 0.8, 1.4, 7.0, 6, 0.42], // a barrow at rest by the shopfronts
    ["PROP_Cargo_Anchor", 1.4, 1.6, -10.3, 30, 0.62], // a great anchor laid up, north quay
  ];
  for (const [file, w, h, x, z, shadowR] of cargo) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.18, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the cargo
    scene.add(blob);
  }

  // ── Quayside comforts for the people who work it (Batch 51): the stones are now
  // dressed for cargo, for nature and for gear, but there is nothing on the quay for
  // the labourers themselves — nowhere to rest a back, no water to drink, no fire to
  // warm cold hands. Three painted cutouts answer that: a slatted timber bench with
  // cast-iron ends set on the building kerb and again along the water-side promenade, a
  // black cast-iron parish pump at the south kerb, and a dockers' coal brazier out on
  // the open quay. Same GROUND-PLANTED camera-facing-billboard idiom as the cargo and
  // animals, each on a soft contact-shadow blob; placed in the long gaps clear of the
  // cargo (water-side z −24/−4/30, the building barrow at z 6). The brazier alone gets a
  // strong emissive (0.6) — cutoutPlane self-illuminates by the sprite's own albedo, so
  // the glowing coals burn warm against the dark iron and read brighter as the day dims.
  const comforts = [
    // [file, w, h, x, z, shadowR, emissive]
    ["PROP_Quay_Bench", 1.5, 0.8, 6.5, -16, 0.72, 0.18], // a bench by the shopfronts, a tired back's rest
    ["PROP_Quay_Bench", 1.42, 0.76, -9.7, 20, 0.68, 0.18], // a second bench along the water-side promenade
    ["PROP_Quay_Pump", 0.7, 1.5, 6.7, -28, 0.32, 0.18], // a parish standpipe at the south kerb
    ["PROP_Quay_Brazier", 0.94, 1.0, -9.8, 14, 0.46, 0.6], // a dockers' brazier on the open quay, coals aglow
  ];
  for (const [file, w, h, x, z, shadowR, emissive] of comforts) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the comforts
    scene.add(blob);
  }

  // ── Firelight from the brazier (Batch 64): the dockers' coal brazier above (at
  // −9.8,14) glows by its own albedo (emissive 0.6) but throws NO light on the stones
  // around it or into the air — the same gap Batch 62 fixed for the street lamps. Lay
  // a HOT fire-glow at the brazier: a flat ground pool on the cobbles around the coals
  // (the player looks DOWN at the quay, so a flat decal reads here — the Batch-62
  // lamp-pool idiom, NOT the grazing-angle water of Batch 63) AND an upright camera-
  // facing halo of firelight standing over the basket. One hot texture, both additive +
  // fog-off + self-lit (MeshBasic), hotter and more orange-red than the amber lamp pool
  // so the fire reads apart from the lamps; opacity driven off the SAME lamp intensity
  // the day cycle feeds the lamp heads (setBrazierGlow, from daycycle.js) — dark by day,
  // full at deep night, exactly when the coals would burn against the dark.
  const brazierGlows = [];
  const brazierTex = _texLoader.load(`${FX_DIR}FX_Light_BrazierGlow.png`);
  brazierTex.colorSpace = THREE.SRGBColorSpace;
  const BRZ_X = -9.8, BRZ_Z = 14; // matches the PROP_Quay_Brazier placement above
  // (1) the hot pool of firelight on the cobbles around the coals.
  const brazierPool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({
      map: brazierTex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }),
  );
  brazierPool.rotation.x = -Math.PI / 2;
  brazierPool.position.set(BRZ_X, 0.04, BRZ_Z); // on the cobbles, just over the grime/water-shimmer
  brazierPool.renderOrder = 1;
  brazierPool.userData.glowBase = 0.78;
  scene.add(brazierPool);
  brazierGlows.push(brazierPool);
  // (2) the upright halo of firelight standing over the coals (basket top ≈ 0.8).
  const brazierHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.7),
    new THREE.MeshBasicMaterial({
      map: brazierTex, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }),
  );
  brazierHalo.position.set(BRZ_X, 0.85, BRZ_Z); // centred on the glowing coals
  brazierHalo.renderOrder = 2;
  brazierHalo.userData.glowBase = 0.62;
  scene.add(brazierHalo);
  billboards.push(brazierHalo); // main.js turns the halo to face the camera each frame
  brazierGlows.push(brazierHalo);
  function setBrazierGlow(intensity) {
    const n = Math.max(0, Math.min(1, intensity));
    for (const g of brazierGlows) g.material.opacity = n * g.userData.glowBase;
  }

  // ── The market's wares (Batch 52): the Old Harbour is a working dock AND a
  // market — Mei's noodle-stall stands mid-street — but almost nothing on the quay
  // reads as goods for sale; the palette runs grey timber and rust end to end. Three
  // painted cutouts add the food-trade colour Mei's produce baskets don't: a
  // fishmonger's slab of the morning's silver catch landed at the water's edge, a
  // cheesemonger's stacked wheels and a baker's basket of golden loaves along the
  // shopfront kerb. Same GROUND-PLANTED camera-facing-billboard idiom as the cargo and
  // comforts, each on a soft contact-shadow blob; tucked into the gaps clear of the
  // cargo (water-side z −24/−4/14), the building barrow (z 6) and the bench/pump
  // (z −16/−28). The fish slab gets a touch more emissive (0.24) so the silver catch
  // and crushed ice glint.
  const wares = [
    // [file, w, h, x, z, shadowR, emissive]
    ["PROP_Market_FishSlab", 1.5, 0.7, -9.8, -12, 0.72, 0.24], // the morning catch on ice at the water's edge (img 2.13:1)
    ["PROP_Market_Cheese", 1.15, 0.9, 6.8, 0, 0.56, 0.2], // a cheesemonger's stacked wheels by the shopfronts (img 1.28:1)
    ["PROP_Market_Bread", 1.35, 0.73, 6.8, 11, 0.64, 0.2], // a baker's basket of loaves down the kerb (img 1.86:1)
  ];
  for (const [file, w, h, x, z, shadowR, emissive] of wares) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the wares
    scene.add(blob);
  }

  // ── The quay at work (Batch 53): the stones now hold everything a dock
  // STORES — coiled rope, drying nets, a laid-up anchor, stacked casks, a
  // barrow, benches, a pump, a brazier, market wares — but nothing that does
  // its actual LABOUR. Three painted cutouts add the heavy working gear the
  // port still lacked: a squat oak WARPING CAPSTAN that hauls a hull snug
  // against the quay, a tall raked DERRICK post with its block-and-tackle hoist
  // for swaying cargo up, and a landed STACK OF SAWN DEALS waiting to be carried
  // off a timber boat. Same GROUND-PLANTED camera-facing-billboard idiom as the
  // cargo/comforts/wares, each on a soft contact-shadow blob; the capstan and
  // derrick sit together as one south-quay working berth on the open water deck
  // (z −30/−34, clear south of the Batch-50 casks at −24), the deals down the
  // long-open building kerb (z 18, north of the Batch-52 bread at 11). Plane
  // sizes track each cutout's true aspect (the deals keyed low and flat). The
  // whole grey-timber-and-rust palette blends with Batches 42/50/51/52; no glow.
  const dockWork = [
    // [file, w, h, x, z, shadowR, emissive]
    ["PROP_Dock_Capstan", 0.88, 1.32, -9.8, -30, 0.46, 0.18], // a warping capstan to haul her in, far-south water deck (img 0.67:1)
    ["PROP_Dock_Derrick", 0.64, 2.1, -10.1, -34, 0.34, 0.18], // a derrick hoist raked over the rail, the south corner (img 0.31:1)
    ["PROP_Dock_Timber", 1.7, 0.465, 6.7, 18, 0.7, 0.18], // a stack of landed deals down the building kerb (img 3.66:1)
  ];
  for (const [file, w, h, x, z, shadowR, emissive] of dockWork) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the gear
    scene.add(blob);
  }

  // ── The working materials of the port (Batch 59): the quay now STORES (rope,
  // nets, casks, anchor), WORKS (capstan, derrick, deals), feeds and rests its
  // people (brazier, bench, pump) and sells (fish, cheese, bread) — but the three
  // commonplace bulk materials a steam-and-sail port is actually heaped with were
  // missing: COAL to fire the boats, TAR to caulk the hulls, SALT to cure the
  // catch. Three painted cutouts add them as a south-quay stores corner, clustered
  // on the open deck just inboard of the Batch-53 working berth (capstan −9.8,−30 ·
  // derrick −10.1,−34) so the heavy-labour end of the harbour reads complete. Same
  // GROUND-PLANTED camera-facing-billboard idiom as the cargo/comforts/wares/dockWork
  // (pushed to `billboards`, base on the image bottom at y = h/2, each on a soft
  // contact-shadow blob); planes sized to each cutout's true aspect (coal a low wide
  // heap 1.59:1, the tar and salt casks tall 0.71/0.76:1). Honest dull palette —
  // black coal, dull pitch, grey-white salt — so low emissive, no glow.
  const workMaterials = [
    // [file, w, h, x, z, shadowR, emissive]
    ["PROP_Quay_CoalHeap", 1.6, 1.01, -4.2, -30.0, 0.85, 0.16], // the coaling point — fuel for the steam boats
    ["PROP_Quay_TarBarrel", 0.82, 1.15, -2.5, -30.8, 0.4, 0.16], // a pitch cask for caulking the hulls
    ["PROP_Quay_SaltBarrel", 0.86, 1.13, -5.7, -31.0, 0.44, 0.18], // coarse salt for curing the catch
  ];
  for (const [file, w, h, x, z, shadowR, emissive] of workMaterials) {
    const item = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive, alphaTest: 0.4 });
    item.position.set(x, h / 2, z);
    scene.add(item);
    billboards.push(item); // main.js turns it to face the camera each frame

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the materials
    scene.add(blob);
  }

  // ── Drifting clouds over the painted dome. tintClouds() lets the day cycle
  // multiply them with the horizon colour each minute (bright by day, warm at
  // dusk, sunk into the night sky after dark); main.js drifts + billboards them.
  const clouds = buildClouds(scene);
  const _cloudTint = new THREE.Color();
  const _white = new THREE.Color(0xffffff);
  function tintClouds(botC, sunI) {
    const lift = Math.min(0.42, Math.max(0, sunI) * 0.16);
    _cloudTint.copy(botC).lerp(_white, lift);
    for (const c of clouds) c.mesh.material.color.copy(_cloudTint);
  }

  const bounds = { minX: -10.5, maxX: 6.5, minZ: -34, maxZ: 34 };
  return { bounds, citizens, locals, billboards, clouds, soaringGulls, smokePlumes, critters, washing, flags, lampHeads, lampGlows, waterGlows, sunGlitters, brazierGlows, waterMists, beaconGlows, boatLights, markers, sun, hemi, ambient, skyDome, moon, paintSky, setSkyBlend, setOvercast, tintClouds, setMoon, setLampGlow, setWindowGlow, setWaterGlow, setSunGlitter, setBrazierGlow, setWaterMist, setBeacon, setBoatLights };
}

// Wrapper so makeBuilding (which builds a Group) is added to the scene.
function makeBuildingInto(scene, x, z, w, h, d, bodyMat, windowMat, roofMat) {
  scene.add(makeBuilding(x, z, w, h, d, bodyMat, windowMat, roofMat));
}

// A citizen who stands and watches the water rather than walking — faced at a fixed
// yaw and just breathing (the idle gait, speed 0). Shares the citizens' update contract
// so main.js animates the standing crowd through the same loop as the walkers.
function makeStanding(fig, yaw) {
  fig.root.rotation.y = yaw;
  return {
    fig,
    update(dt) { fig.update(dt, 0); },
  };
}

// A citizen that walks back and forth between two z values, facing its direction.
// `pace` is the per-role ground speed (see the roster); it falls back to the old
// index-derived spread so renders stay deterministic (no Math.random) if omitted.
function makePatrol(fig, z0, z1, index = 0, pace) {
  let dir = 1;
  const speed = pace ?? 1.05 + ((index * 0.37) % 0.6);
  let yaw = 0; // eased heading — turns over ~0.5s instead of snapping 180° at each end
  return {
    fig,
    speed, // exposed for diagnostics — the per-role ground tempo
    update(dt) {
      // Ease the facing toward the travel heading (0 going +z, π going −z) along the
      // shortest arc, so the end-of-lane turn is a pivot, not a one-frame flip.
      const target = dir > 0 ? 0 : Math.PI;
      const d = Math.atan2(Math.sin(target - yaw), Math.cos(target - yaw));
      yaw += d * Math.min(1, dt * 6);
      fig.root.rotation.y = yaw;
      // While still swinging round (heading not yet caught up) the figure crawls and its
      // legs shuffle — it plants and pivots at the bollard rather than moonwalking back.
      const turning = Math.abs(d) > 0.15;
      const v = turning ? speed * 0.15 : speed;
      let z = fig.root.position.z + dir * v * dt;
      if (z > z1) { z = z1; dir = -1; }
      else if (z < z0) { z = z0; dir = 1; }
      fig.root.position.z = z;
      fig.update(dt, turning ? speed * 0.3 : speed);
    },
  };
}
