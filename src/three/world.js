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

// ── A stack of retail crates at a shop threshold (spr-048) — REAL geometry (three closed
// timber crates of stepped sizes: a solid body, four corner posts, mid-rails round the four
// sides, and an X-brace battened on the front face) rather than a flat billboard cutout.
// Replaces PROP_Shop_Crates. The root sits on the ground and builds upward; facing yaws the
// whole stack toward the street. Self-contained own materials; deterministic layout (no
// Math.random); the kept contact-shadow blob still grounds it.
function buildCrateStack(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6539, roughness: 0.85, metalness: 0 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4d2a, roughness: 0.9, metalness: 0 });

  // One closed slatted crate (origin at its base centre, builds up).
  const crate = (w, h, d) => {
    const g = new THREE.Group();
    const hw = w / 2, hh = h / 2, hd = d / 2, post = 0.05;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, d - 0.02), woodMat);
    body.position.y = hh; body.castShadow = true; body.receiveShadow = true; g.add(body);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {            // four corner posts
      const p = new THREE.Mesh(new THREE.BoxGeometry(post, h, post), postMat);
      p.position.set(sx * (hw - post / 2), hh, sz * (hd - post / 2)); p.castShadow = true; g.add(p);
    }
    for (const sz of [-1, 1]) {                                      // mid-rails front & back
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.02), postMat);
      r.position.set(0, hh, sz * hd); g.add(r);
    }
    for (const sx of [-1, 1]) {                                      // mid-rails left & right
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, d), postMat);
      r.position.set(sx * hw, hh, 0); g.add(r);
    }
    const diag = Math.sqrt(w * w + h * h) * 0.92;                    // X-brace on the front (+z) face
    for (const s of [1, -1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(diag, 0.045, 0.015), postMat);
      b.position.set(0, hh, hd + 0.005); b.rotation.z = s * Math.atan2(h, w); g.add(b);
    }
    return g;
  };

  const big = crate(0.62, 0.50, 0.50); big.position.set(0, 0, 0); big.rotation.y = 0.05; root.add(big);
  const mid = crate(0.50, 0.42, 0.46); mid.position.set(0.03, 0.50, -0.02); mid.rotation.y = -0.12; root.add(mid);
  const side = crate(0.42, 0.36, 0.42); side.position.set(-0.52, 0, 0.14); side.rotation.y = 0.22; root.add(side);

  return { root };
}

// ── A shopfront awning (spr-049) — REAL geometry (a striped canvas sheet slanting down-and-out
// from the wall on two struts, a mounting bar at the back, a front lip bar, and a scalloped
// striped valance hanging off the front) rather than a flat billboard cutout. Replaces
// PROP_Shop_Awning. The root mounts at the wall (x≈8.9) and projects toward the street; after the
// caller's FACADE yaw (−π/2) local +z → world −x (OUT over the window), so the canvas is built long
// in local x (along the wall) and slopes down in local +z. Self-contained own materials;
// deterministic stripe layout (no Math.random).
function buildAwning(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const cream = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const red = new THREE.MeshStandardMaterial({ color: 0xb5453b, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5f5140, roughness: 0.7, metalness: 0.15 });
  const barMat = new THREE.MeshStandardMaterial({ color: 0x463b2e, roughness: 0.7, metalness: 0.2 });
  const stripeOf = (i) => (i % 2 === 0 ? cream : red);

  const W = 2.0, D = 0.92, drop = 0.40;            // width (along wall), projection out, vertical fall
  const slopeLen = Math.sqrt(D * D + drop * drop); // length of the canvas down the slope
  const slopeAng = Math.atan2(drop, D);            // tilt of the canvas from horizontal
  const N = 9, sw = W / N;                          // stripe count & width

  // Mounting bar pinned to the wall (a horizontal cylinder along local x at the back, y0).
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, W + 0.06, 8), barMat);
  back.rotation.z = Math.PI / 2; back.castShadow = true; root.add(back);

  // The canvas: a flat striped sheet built in the local xz plane, then tilted about x so its
  // front edge falls down-and-out. Back edge at z0 (the wall), front edge at z=slopeLen.
  const canvas = new THREE.Group();
  canvas.rotation.x = slopeAng;
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.96, 0.02, slopeLen), stripeOf(i));
    s.position.set((i - (N - 1) / 2) * sw, 0, slopeLen / 2);
    s.castShadow = true; s.receiveShadow = true; canvas.add(s);
  }
  root.add(canvas);

  // Front lip bar along the leading (street) edge.
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, W + 0.04, 8), barMat);
  lip.rotation.z = Math.PI / 2; lip.position.set(0, -drop, D); lip.castShadow = true; root.add(lip);

  // Scalloped striped valance hanging off the front lip (each scallop a flattened half-disc,
  // its stripe matched to the canvas stripe above it).
  for (let i = 0; i < N; i++) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.96, 0.15, 0.02), stripeOf(i));
    flap.position.set((i - (N - 1) / 2) * sw, -drop - 0.075, D); flap.castShadow = true; root.add(flap);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(sw * 0.45, 10, 8), stripeOf(i));
    cup.scale.set(1, 0.55, 0.4); cup.position.set((i - (N - 1) / 2) * sw, -drop - 0.15, D); root.add(cup);
  }

  // Two diagonal support struts from a low wall bracket out to the front lip corners.
  const armLen = Math.sqrt((D - 0.04) * (D - 0.04) + 0.05 * 0.05);
  const armAng = Math.atan2(D - 0.04, 0.05);       // angle of the strut from +y
  for (const sx of [-1, 1]) {
    const ax = sx * (W / 2 - 0.12);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, armLen, 6), frameMat);
    arm.position.set(ax, -0.425, 0.04 + (D - 0.04) / 2);
    arm.rotation.x = armAng; arm.castShadow = true; root.add(arm);
  }

  return { root };
}

// ── A shopfront window (spr-050) — REAL geometry (a stained-wood casing frame, a horizontal
// transom + two vertical mullions dividing it into panes, a tinted glass sheet set behind, and a
// proud sill ledge) rather than a flat billboard cutout. Replaces PROP_Shop_Window. The root sits
// flush on the wall front (x≈8.92); after the caller's FACADE yaw (−π/2) local +z → world −x, so
// the frame is built in the local xy plane and projects a little toward the street (proud of the
// glass). Self-contained own materials; the glass is faintly emissive so it never goes pure black.
function buildShopWindow(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x5a4126, roughness: 0.8, metalness: 0 });
  const sillMat = new THREE.MeshStandardMaterial({ color: 0x7d6f5a, roughness: 0.85, metalness: 0 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x35535e, roughness: 0.12, metalness: 0.25, transparent: true, opacity: 0.5,
    emissive: 0x0c1418, emissiveIntensity: 1, side: THREE.DoubleSide,
  });

  const W = 1.42, H = 1.70, hw = W / 2, hh = H / 2;
  const ft = 0.07, fd = 0.08;                       // frame thickness & proud depth (local +z)

  // Tinted glass, set just behind the casing opening.
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * ft + 0.01, H - 2 * ft + 0.01, 0.02), glassMat);
  glass.position.set(0, 0, 0); root.add(glass);

  // Outer casing — four boards round the opening, each proud toward the street.
  const horiz = (sy) => { const m = new THREE.Mesh(new THREE.BoxGeometry(W, ft, fd), frameMat); m.position.set(0, sy * (hh - ft / 2), fd / 2); m.castShadow = true; root.add(m); };
  const vert = (sx) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ft, H, fd), frameMat); m.position.set(sx * (hw - ft / 2), 0, fd / 2); m.castShadow = true; root.add(m); };
  horiz(1); horiz(-1); vert(-1); vert(1);

  // Glazing bars — a transom near the top, two vertical mullions (a 3-pane upper row over a tall
  // lower display, the classic shopfront division).
  const transom = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * ft, 0.045, fd * 0.7), frameMat);
  transom.position.set(0, 0.40, fd * 0.35); root.add(transom);
  for (const sx of [-1, 1]) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.04, H - 2 * ft, fd * 0.7), frameMat);
    mull.position.set(sx * 0.225, 0, fd * 0.35); root.add(mull);
  }

  // Proud sill ledge at the base (the spr-047 flower box rests against it).
  const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.06, fd + 0.12), sillMat);
  sill.position.set(0, -hh + 0.01, (fd + 0.12) / 2 - 0.04); sill.castShadow = true; sill.receiveShadow = true; root.add(sill);

  return { root };
}

// ── A shopfront door (spr-051) — REAL geometry (a painted casing + lintel proud of the wall, a
// recessed jamb reveal, a ledged-and-braced plank slab set back in the opening, a brass handle on a
// backplate, and a stone threshold step) rather than a flat billboard cutout. Replaces
// PROP_Shop_Door. The root sits flush on the wall front (x≈8.95); after the caller's FACADE yaw
// (−π/2) local +z → world −x (OUT toward the street), so the casing is proud at local +z while the
// slab is recessed at local −z (back into the wall thickness). Self-contained own materials.
function buildShopDoor(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2e4636, roughness: 0.7, metalness: 0 });   // painted green planks
  const railMat = new THREE.MeshStandardMaterial({ color: 0x24382b, roughness: 0.7, metalness: 0 });   // ledges/braces
  const casingMat = new THREE.MeshStandardMaterial({ color: 0x8a7f6a, roughness: 0.85, metalness: 0 }); // painted stone trim
  const jambMat = new THREE.MeshStandardMaterial({ color: 0x3a342b, roughness: 0.95, metalness: 0 });   // shadowed reveal
  const brass = new THREE.MeshStandardMaterial({ color: 0xb5912f, roughness: 0.3, metalness: 0.7 });
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x877c6b, roughness: 0.95, metalness: 0 });

  const W = 1.09, H = 2.30, hw = W / 2, hh = H / 2;
  const proud = 0.04, recess = -0.10;               // casing stands out (local +z), slab sits back (local −z)

  // Casing — two pilasters and a lintel, proud of the wall.
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.20, 0.13, 0.10), casingMat);
  lintel.position.set(0, hh + 0.065, proud); lintel.castShadow = true; root.add(lintel);
  for (const sx of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.13, 0.10), casingMat);
    pil.position.set(sx * (hw + 0.06), 0, proud); pil.castShadow = true; root.add(pil);
  }

  // Recessed jamb reveals — thin panels bridging the wall face to the set-back slab.
  for (const sx of [-1, 1]) {
    const rev = new THREE.Mesh(new THREE.BoxGeometry(0.02, H, 0.16), jambMat);
    rev.position.set(sx * hw, 0, (proud + recess) / 2); root.add(rev);
  }
  const topRev = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, 0.16), jambMat);
  topRev.position.set(0, hh, (proud + recess) / 2); root.add(topRev);

  // Ledged plank slab, set back in the opening — N vertical boards.
  const N = 4, pw = (W - 0.04) / N;
  for (let i = 0; i < N; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.96, H - 0.05, 0.04), doorMat);
    plank.position.set((i - (N - 1) / 2) * pw, 0, recess); plank.castShadow = true; root.add(plank);
  }
  // Three ledges (top/middle/bottom) battened proud of the planks.
  for (const ly of [hh - 0.22, 0, -hh + 0.22]) {
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.11, 0.04), railMat);
    ledge.position.set(0, ly, recess + 0.04); root.add(ledge);
  }

  // Brass handle on a backplate, proud of the slab toward the street.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.02), brass);
  plate.position.set(hw - 0.16, -0.06, recess + 0.06); root.add(plate);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), brass);
  knob.position.set(hw - 0.16, -0.06, recess + 0.10); root.add(knob);

  // Stone threshold step at the base, proud underfoot.
  const step = new THREE.Mesh(new THREE.BoxGeometry(W + 0.10, 0.06, 0.20), stepMat);
  step.position.set(0, -hh + 0.0, 0.06); step.castShadow = true; step.receiveShadow = true; root.add(step);

  return { root };
}

// ── A shopfront wall lantern (spr-052) — REAL geometry (a wall back-plate + a scroll-braced
// bracket arm projecting toward the street, a hanging glazed cage of wrought posts and amber glass,
// a pyramid roof with a finial, and a strongly-emissive flame core) rather than a flat billboard
// cutout. Replaces PROP_Shop_Lantern — the LAST flat cutout on the shopfront row. The root mounts at
// the wall (x≈8.9); after the caller's FACADE yaw (−π/2) local +z → world −x, so the bracket arm and
// the hung cage project OUT toward the player. The amber glass + core keep a strong emissive so the
// lantern still reads as a warm light source after dark (matching the old cutout's emissive 0.8).
function buildShopLantern(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const iron = new THREE.MeshStandardMaterial({ color: 0x1f1c19, roughness: 0.6, metalness: 0.45 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb5912f, roughness: 0.35, metalness: 0.6 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xffcf73, emissive: 0xffb347, emissiveIntensity: 1.4,
    transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0, side: THREE.DoubleSide,
  });
  const flame = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffcf73, emissiveIntensity: 2.5 });

  const cz = 0.20;                                  // how far the hung cage projects from the wall (local +z)
  const cw = 0.085, ch = 0.16;                      // cage half-width and half-height

  // Wall bracket — a back-plate flat on the wall, a horizontal arm out to over the cage, a scroll brace.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.30, 0.035), iron);
  plate.position.set(0, 0.42, -0.018); plate.castShadow = true; root.add(plate);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.028, cz + 0.04), iron);
  arm.position.set(0, 0.50, cz / 2); arm.castShadow = true; root.add(arm);
  const braceLen = Math.sqrt(0.20 * 0.20 + 0.14 * 0.14);
  const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, braceLen, 6), iron);
  brace.position.set(0, 0.40, 0.07); brace.rotation.x = Math.atan2(0.14, 0.20); root.add(brace);
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.19, 6), iron);
  link.position.set(0, 0.405, cz); root.add(link);

  // Pyramid roof + finial atop the cage.
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.11, 4), iron);
  roof.position.set(0, ch + 0.10, cz); roof.rotation.y = Math.PI / 4; roof.castShadow = true; root.add(roof);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), brass);
  finial.position.set(0, ch + 0.17, cz); root.add(finial);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.025, 0.20), iron);
  collar.position.set(0, ch + 0.01, cz); root.add(collar);

  // Glazed cage — four corner posts, four amber glass panes, a strongly-emissive flame core.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.016, 2 * ch, 0.016), iron);
    post.position.set(sx * cw, 0, cz + sz * cw); root.add(post);
  }
  glass.depthWrite = false;
  for (const sz of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(2 * cw - 0.02, 2 * ch - 0.02, 0.008), glass);
    pane.position.set(0, 0, cz + sz * cw); root.add(pane);
  }
  for (const sx of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.008, 2 * ch - 0.02, 2 * cw - 0.02), glass);
    pane.position.set(sx * cw, 0, cz); root.add(pane);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), flame);
  core.position.set(0, -0.01, cz); root.add(core);

  // Base tray under the cage.
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.03, 0.21), iron);
  tray.position.set(0, -ch - 0.02, cz); tray.castShadow = true; root.add(tray);

  return { root };
}

// ── The courier's delivery bicycle (spr-053) — REAL geometry (two spoked wheels, a tubular diamond
// frame, fork, handlebar, saddle, crank + pedals and a front wicker basket) rather than a flat
// side-profile cutout. Replaces PROP_Job_Bicycle. The bike rolls along its local x (wheels are
// vertical tori with the axle along z), root at the ground contact; `facing` yaws the whole machine.
// The biggest single-prop build so far. Self-contained materials; deterministic spoke layout.
function buildBicycle(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xa83232, roughness: 0.45, metalness: 0.3 }); // courier red
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.6, metalness: 0 });
  const wicker = new THREE.MeshStandardMaterial({ color: 0x9a7b46, roughness: 0.85, metalness: 0 });

  const R = 0.32, WB = 1.0;                          // wheel radius, wheelbase (hub-to-hub)
  const V = (a, b, c) => new THREE.Vector3(a, b, c);

  // A tube (cylinder) running between two points — the frame is six of these.
  const tube = (a, b, r, mat) => {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize());
    m.castShadow = true; return m;
  };

  // A spoked wheel in the xy-plane (axle along z), its centre lifted to sit on the ground.
  const wheel = (cx) => {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.028, 8, 24), tyreMat));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 8), steel);
    hub.rotation.x = Math.PI / 2; w.add(hub);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, R - 0.03, 4), steel);
      sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; w.add(sp);
    }
    w.position.set(cx, R, 0); return w;
  };
  root.add(wheel(-WB / 2));                           // rear
  root.add(wheel(WB / 2));                            // front

  // Frame nodes, then the diamond of tubes between them.
  const rh = V(-WB / 2, R, 0), fh = V(WB / 2, R, 0);  // rear / front hubs
  const bb = V(-0.02, 0.20, 0);                       // bottom bracket (crank)
  const st = V(-0.20, 0.66, 0);                       // seat top
  const ht = V(0.34, 0.62, 0);                        // head tube top
  root.add(tube(bb, ht, 0.018, frameMat));            // down tube
  root.add(tube(bb, st, 0.017, frameMat));            // seat tube
  root.add(tube(st, ht, 0.016, frameMat));            // top tube
  root.add(tube(bb, rh, 0.013, frameMat));            // chain stay
  root.add(tube(st, rh, 0.012, frameMat));            // seat stay
  root.add(tube(ht, fh, 0.014, steel));               // fork

  // Handlebar (a bar across z at the head tube) + stem; saddle on the seat tube.
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.38, 8), steel);
  bar.rotation.x = Math.PI / 2; bar.position.set(0.40, 0.66, 0); root.add(bar);
  root.add(tube(ht, V(0.40, 0.66, 0), 0.012, steel)); // stem
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.12), seatMat);
  saddle.position.set(-0.22, 0.69, 0); saddle.castShadow = true; root.add(saddle);

  // Crank axle + two pedals at the bottom bracket.
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), steel);
  axle.rotation.x = Math.PI / 2; axle.position.copy(bb); root.add(axle);
  for (const sz of [-1, 1]) {
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.02, 0.05), steel);
    pedal.position.set(bb.x + sz * 0.05, bb.y - 0.06, sz * 0.08); root.add(pedal);
  }

  // Front wicker delivery basket over the front wheel — the courier's tell.
  const basket = new THREE.Group();
  basket.position.set(0.52, 0.54, 0);
  basket.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.20), wicker));         // floor
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.20), wicker); m.position.set(sx * 0.12, 0.08, 0); basket.add(m); }
  for (const sz of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.02), wicker); m.position.set(0, 0.08, sz * 0.10); basket.add(m); }
  basket.children.forEach((c) => { c.castShadow = true; });
  root.add(basket);

  return { root };
}

// A delivery scooter — the courier's step-up from the bike (spr-054). Length runs
// along local +x (front of the scooter); root sits on the ground. Step-through deck,
// front leg-shield + self-lit headlamp, handlebar with mirrors, a saddle over the
// rear cowl, and a red top-box (the delivery case) on the tail. ~20 meshes.
function buildScooter(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f7d6b, roughness: 0.4, metalness: 0.25 });  // teal courier scooter
  const trim = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.5, metalness: 0.1 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x23201d, roughness: 0.6, metalness: 0 });
  const caseMat = new THREE.MeshStandardMaterial({ color: 0xb5453b, roughness: 0.5, metalness: 0.1 });   // delivery top-box (courier red)
  const glow = new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffd98a, emissiveIntensity: 1.6, roughness: 0.3 });

  const R = 0.18, WB = 0.82;
  // small fat wheel (axle along z, rolling along x), centre lifted to R
  const wheel = (cx) => {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 8, 20), tyreMat));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12), steel);
    hub.rotation.x = Math.PI / 2; w.add(hub);
    w.position.set(cx, R, 0); w.children.forEach((c) => { c.castShadow = true; }); return w;
  };
  root.add(wheel(WB / 2));   // front
  root.add(wheel(-WB / 2));  // rear

  const add = (geo, mat, px, py, pz, ry = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.y = ry; m.castShadow = true; root.add(m); return m;
  };

  add(new THREE.BoxGeometry(0.5, 0.05, 0.28), trim, 0.04, 0.21, 0);            // step-through floorboard
  const cowl = add(new THREE.BoxGeometry(0.16, 0.62, 0.3), bodyMat, 0.42, 0.52, 0);  // front leg-shield
  cowl.rotation.z = -0.12;
  add(new THREE.BoxGeometry(0.1, 0.06, 0.22), bodyMat, 0.41, 0.4, 0);          // front fender
  add(new THREE.SphereGeometry(0.06, 12, 10), glow, 0.52, 0.66, 0);            // headlamp (self-lit)
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 8), steel, 0.46, 0.86, 0);  // handlebar riser
  const bar = add(new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8), steel, 0.47, 0.98, 0);
  bar.rotation.x = Math.PI / 2;                                                // handlebar
  for (const sz of [-1, 1]) {                                                  // mirrors
    add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), steel, 0.45, 1.04, sz * 0.18);
    add(new THREE.BoxGeometry(0.03, 0.07, 0.05), bodyMat, 0.45, 1.1, sz * 0.18);
  }
  add(new THREE.BoxGeometry(0.56, 0.36, 0.3), bodyMat, -0.26, 0.44, 0);        // rear body / engine cowl
  add(new THREE.BoxGeometry(0.46, 0.1, 0.26), seatMat, -0.2, 0.67, 0);         // saddle
  add(new THREE.BoxGeometry(0.3, 0.32, 0.32), caseMat, -0.5, 0.82, 0);         // delivery top-box
  add(new THREE.BoxGeometry(0.32, 0.04, 0.34), trim, -0.5, 0.99, 0);           // top-box lid rim
  add(new THREE.BoxGeometry(0.03, 0.06, 0.08), glow, -0.66, 0.66, 0);          // tail light (self-lit)
  const ks = add(new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), steel, -0.1, 0.12, 0.16);
  ks.rotation.x = 0.4;                                                         // kickstand

  return { root };
}

// A small panel van at the east kerb (spr-054). Length runs along local +x (+x = front);
// the broad cargo side is local +z, so yawing −π/2 turns it to face the street (−x world),
// where the company panel reads. Boxy cargo + lower cab, four fat wheels, tinted glass,
// self-lit head/tail lamps, bumpers and mirrors. ~24 meshes; root sits on the ground.
function buildVan(x, y, z, facing = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = facing;

  const body = new THREE.MeshStandardMaterial({ color: 0x4a6f93, roughness: 0.45, metalness: 0.25 });   // slate-blue van
  const panel = new THREE.MeshStandardMaterial({ color: 0xe6e0d2, roughness: 0.55, metalness: 0.1 });    // company side panel
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x2a3a44, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.7 });
  const bumperMat = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.6, metalness: 0.3 });
  const headlamp = new THREE.MeshStandardMaterial({ color: 0xfff3cf, emissive: 0xffd98a, emissiveIntensity: 1.4, roughness: 0.3 });
  const taillamp = new THREE.MeshStandardMaterial({ color: 0xff6b5a, emissive: 0xc23a2a, emissiveIntensity: 1.2, roughness: 0.4 });

  const L = 3.0, D = 1.3, Rw = 0.28;
  const add = (geo, mat, px, py, pz, rz = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); if (rz) m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  };
  // fat wheel (axle along z so it rolls along x = length)
  const wheel = (cx, cz) => {
    const w = new THREE.Group();
    w.add(new THREE.Mesh(new THREE.TorusGeometry(Rw, 0.1, 8, 20), tyreMat));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), steel);
    hub.rotation.x = Math.PI / 2; w.add(hub);
    w.position.set(cx, Rw, cz); w.children.forEach((c) => { c.castShadow = true; }); root.add(w);
  };
  for (const sx of [L / 2 - 0.55, -L / 2 + 0.55]) for (const sz of [-1, 1]) wheel(sx, sz * (D / 2 - 0.02));

  const floorY = Rw + 0.12;                                                    // chassis floor height
  add(new THREE.BoxGeometry(L, 0.3, D - 0.06), body, 0, floorY, 0);            // lower chassis skirt
  add(new THREE.BoxGeometry(1.9, 1.05, D), body, -0.5, floorY + 0.55, 0);      // cargo box (rear)
  add(new THREE.BoxGeometry(1.0, 0.78, D), body, 1.0, floorY + 0.4, 0);        // cab (front, lower)
  add(new THREE.BoxGeometry(0.06, 0.42, D - 0.18), glass, 1.52, floorY + 0.55, 0, 0.25); // windscreen (leant back)
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.5, 0.34, 0.04), glass, 1.05, floorY + 0.55, sz * (D / 2)); // cab side windows
  add(new THREE.BoxGeometry(1.7, 0.7, 0.03), panel, -0.5, floorY + 0.55, D / 2 + 0.01); // company panel (street side, local +z)
  add(new THREE.BoxGeometry(0.03, 0.95, D - 0.1), steel, -L / 2 - 0.01, floorY + 0.55, 0); // rear cargo-door seam
  add(new THREE.BoxGeometry(0.08, 0.14, D), bumperMat, L / 2 + 0.02, floorY - 0.02, 0);    // front bumper
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.1, 0.16), headlamp, L / 2 + 0.02, floorY + 0.12, sz * (D / 2 - 0.22)); // headlights
  add(new THREE.BoxGeometry(0.08, 0.14, D), bumperMat, -L / 2 - 0.02, floorY - 0.02, 0);   // rear bumper
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.05, 0.12, 0.12), taillamp, -L / 2 - 0.02, floorY + 0.15, sz * (D / 2 - 0.16)); // tail lights
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.04, 0.1, 0.06), body, 1.55, floorY + 0.5, sz * (D / 2 + 0.08)); // door mirrors

  return { root };
}

// A near small craft floating over the water (spr-055) — replaces the flat broadside
// PROP_Boat_* cutouts (Rowboat/Punt/Dinghy) that always billboarded their painted side
// at the player. Now a REAL open hull: a shell triangulated from stations along the
// length, V-bottom with rocker, open at the gunwale so you read down into it. `kind`
// "dory" (clinker rowing dory, oars shipped) | "punt" (flat blunt punt, quant pole) |
// "dinghy" (sailing dinghy, mast + furled tan sail). Length runs local x; root sits at
// the WATERLINE (local y=0), so the keel dips below and the gunwale rides above. No
// billboard — real geometry reads from any angle.
function buildSmallCraft(x, z, kind, yaw = 0) {
  const WL = -0.05; // water surface y (matches the water plane / vessel placement)
  const root = new THREE.Group();
  root.position.set(x, WL, z);
  root.rotation.y = yaw;

  const cfg = {
    dory:   { L: 2.4, B: 0.9,  depth: 0.34, fb: 0.16, profile: "double", hull: 0xcdc6b4, trim: 0x8a5a36 },
    punt:   { L: 2.7, B: 0.86, depth: 0.24, fb: 0.10, profile: "punt",   hull: 0x6f7361, trim: 0x44402f },
    dinghy: { L: 1.7, B: 0.74, depth: 0.34, fb: 0.18, profile: "double", hull: 0xb98a4e, trim: 0xece6d4 },
  }[kind];

  const hullMat = new THREE.MeshStandardMaterial({ color: cfg.hull, roughness: 0.72, metalness: 0, side: THREE.DoubleSide, emissive: new THREE.Color(cfg.hull).multiplyScalar(0.07) });
  const trimMat = new THREE.MeshStandardMaterial({ color: cfg.trim, roughness: 0.6, metalness: 0.05 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.6, metalness: 0 });

  // ── Hull shell: 3 points per station (keel centre + two gunwales) lofted along the length.
  const S = 8, verts = [], idx = [];
  const hb = (t) => cfg.profile === "double"
    ? (cfg.B / 2) * Math.sin(Math.PI * t)                       // pointed both ends
    : (cfg.B / 2) * (0.4 + 0.6 * Math.sin(Math.PI * t));        // blunt ends (punt)
  const keelY = (t) => cfg.fb - cfg.depth * (0.45 + 0.55 * Math.sin(Math.PI * t)); // rocker: deepest amidships
  const push = (a, b, c) => { verts.push(a, b, c); return verts.length / 3 - 1; };
  const station = [];
  for (let i = 0; i <= S; i++) {
    const t = i / S, cx = -cfg.L / 2 + t * cfg.L, w = hb(t), ky = keelY(t);
    station.push([push(cx, ky, 0), push(cx, cfg.fb, w), push(cx, cfg.fb, -w)]); // [keel, port, stbd]
  }
  for (let i = 0; i < S; i++) {
    const [B0, P0, St0] = station[i], [B1, P1, St1] = station[i + 1];
    idx.push(P0, P1, B1, P0, B1, B0); // port flank
    idx.push(B0, B1, St1, B0, St1, St0); // starboard flank
  }
  { const [B, P, St] = station[0]; idx.push(P, St, B); }         // stern closure
  { const [B, P, St] = station[S]; idx.push(St, P, B); }         // bow closure
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, hullMat); hull.castShadow = true; hull.receiveShadow = true; root.add(hull);

  const add = (g, mat, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(g, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); m.castShadow = true; root.add(m); return m;
  };
  // Thwarts (seats) across the beam.
  for (const t of [0.36, 0.62]) add(new THREE.BoxGeometry(0.07, 0.03, hb(t) * 2 * 0.92), trimMat, -cfg.L / 2 + t * cfg.L, cfg.fb - 0.02, 0);

  if (kind === "dory") {
    for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(0.018, 0.018, 1.7, 6), woodMat, -0.1, cfg.fb + 0.02, sz * 0.18, 0, sz * 0.08, Math.PI / 2); // two shipped oars
  } else if (kind === "punt") {
    add(new THREE.CylinderGeometry(0.016, 0.016, 2.5, 6), woodMat, 0, cfg.fb + 0.03, 0.3, 0, 0, Math.PI / 2); // quant pole on the gunwale
  } else if (kind === "dinghy") {
    add(new THREE.CylinderGeometry(0.022, 0.022, 1.35, 8), woodMat, 0.15, cfg.fb + 0.62, 0);                  // mast
    add(new THREE.CylinderGeometry(0.06, 0.09, 1.05, 8), new THREE.MeshStandardMaterial({ color: 0xc8a877, roughness: 0.85 }), 0.15, cfg.fb + 0.5, 0.05); // furled tan sail
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.9, 6), woodMat, -0.1, cfg.fb + 0.12, 0, 0, 0, Math.PI / 2); // boom
  }
  return { root };
}

// ── Far working vessels (spr-056): the wide sea west of the quay carried three painted
// broadside cutouts — a three-masted tall ship, a steam trawler, a sailing barge — that
// turned to face the camera (the cloud/gull billboard idiom) and so read as flat the
// moment the player strafed. Each is now a REAL closed hull: a lofted BufferGeometry built
// from S stations, each station a keel point + port/starboard gunwale, swept into a ship
// plan-form (blunt transom aft, full midships, fine bow), capped with a deck and end faces
// so it's a watertight solid. On top sits per-kind rigging/superstructure. Hull carries a
// faint emissive so the silhouette still reads against dark dusk water (the old cutouts
// used emissive:0.2 for the same reason). Sized to roughly match the retired billboards.
function buildVessel(x, z, kind, yaw = 0) {
  const WL = -0.05;
  const root = new THREE.Group();
  root.position.set(x, WL, z);
  root.rotation.y = yaw;
  const cfg = {
    tallship: { L: 10.5, B: 2.8, fb: 1.0, draft: 1.4, sheer: 0.55, flat: false, hull: 0x3a2f26, trim: 0x6a4a30 },
    trawler:  { L: 6.2,  B: 2.2, fb: 0.7, draft: 1.0, sheer: 0.30, flat: false, hull: 0x2f3b44, trim: 0x8a3b2f },
    barge:    { L: 8.6,  B: 2.6, fb: 0.6, draft: 0.7, sheer: 0.22, flat: true,  hull: 0x40342a, trim: 0x5a4632 },
  }[kind];
  const hullMat = new THREE.MeshStandardMaterial({ color: cfg.hull, roughness: 0.8, metalness: 0.05, side: THREE.DoubleSide, emissive: new THREE.Color(cfg.hull).multiplyScalar(0.1) });
  const trimMat = new THREE.MeshStandardMaterial({ color: cfg.trim, roughness: 0.7, emissive: new THREE.Color(cfg.trim).multiplyScalar(0.12) });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.7 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x8c7a5e, roughness: 0.75, emissive: new THREE.Color(0x8c7a5e).multiplyScalar(0.14) });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xeae3cf, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(0xeae3cf).multiplyScalar(0.16) });
  const tanSailMat = new THREE.MeshStandardMaterial({ color: 0xb89058, roughness: 0.9, side: THREE.DoubleSide, emissive: new THREE.Color(0xb89058).multiplyScalar(0.16) });
  const funnelMat = new THREE.MeshStandardMaterial({ color: 0x33312e, roughness: 0.8 });
  const funnelCapMat = new THREE.MeshStandardMaterial({ color: 0xb5453b, roughness: 0.5, emissive: new THREE.Color(0xb5453b).multiplyScalar(0.6) });

  // Half-beam fraction along the length (u: 0 transom → 1 stem): blunt aft, full midships, fine bow.
  const hb = (u) => {
    let f;
    if (u <= 0.55) { const a = u / 0.55; f = 0.6 + 0.4 * Math.sin(Math.PI * 0.5 * a); }
    else { const a = (u - 0.55) / 0.45; f = Math.cos(Math.PI * 0.5 * a) * 0.96 + 0.04; }
    return (cfg.B / 2) * f;
  };
  // Keel (bottom centreline) depth below the waterline — flat-bottomed for the barge, rockered otherwise.
  const keelY = (u) => {
    if (cfg.flat) { const end = Math.min(1, Math.min(u, 1 - u) / 0.12); return -cfg.draft * (0.4 + 0.6 * end); }
    return -cfg.draft * (0.2 + 0.8 * Math.sin(Math.PI * u));
  };
  // Gunwale (deck edge) height — a gentle sheer, higher at bow and stern.
  const gunY = (u) => cfg.fb + cfg.sheer * (0.5 - 0.5 * Math.sin(Math.PI * u));

  const S = 10, verts = [], idx = [];
  const push = (a, b, c) => { verts.push(a, b, c); return verts.length / 3 - 1; };
  const station = [];
  for (let i = 0; i <= S; i++) {
    const u = i / S, cx = -cfg.L / 2 + u * cfg.L, w = hb(u);
    station.push([push(cx, keelY(u), 0), push(cx, gunY(u), w), push(cx, gunY(u), -w)]); // keel, port, starboard
  }
  for (let i = 0; i < S; i++) {
    const [K0, P0, St0] = station[i], [K1, P1, St1] = station[i + 1];
    idx.push(K0, P0, P1, K0, P1, K1);     // port shell
    idx.push(K0, K1, St1, K0, St1, St0);  // starboard shell
    idx.push(P0, St0, St1, P0, St1, P1);  // deck
  }
  { const [K, P, St] = station[0]; idx.push(K, St, P); } // transom cap
  { const [K, P, St] = station[S]; idx.push(K, P, St); } // stem cap
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const hull = new THREE.Mesh(geo, hullMat); hull.castShadow = true; hull.receiveShadow = true; root.add(hull);

  const add = (g, mat, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(g, mat); m.position.set(px, py, pz); m.rotation.set(rx, ry, rz); m.castShadow = true; root.add(m); return m;
  };
  // Oriented spar (mast/yard/bowsprit/sprit/derrick) between two points.
  const spar = (ax, ay, az, bx, by, bz, r, mat) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 7), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; root.add(m); return m;
  };

  const deck = cfg.fb;
  if (kind === "tallship") {
    spar(cfg.L / 2 - 0.1, deck + 0.2, 0, cfg.L / 2 + 2.2, deck + 1.0, 0, 0.07, mastMat);           // bowsprit
    add(new THREE.BoxGeometry(2.0, 0.7, cfg.B * 0.8), cabinMat, -cfg.L / 2 + 1.1, deck + 0.35, 0);  // poop / raised quarterdeck
    add(new THREE.BoxGeometry(1.1, 0.45, cfg.B * 0.7), cabinMat, cfg.L / 2 - 0.8, deck + 0.22, 0);  // forecastle
    const masts = [
      { x: cfg.L * 0.27, h: 6.6, yards: [2.3, 4.6], yw: [1.7, 1.2] }, // foremast
      { x: 0.0, h: 8.4, yards: [2.8, 5.6], yw: [2.1, 1.5] },          // mainmast
      { x: -cfg.L * 0.28, h: 5.8, yards: [2.0, 4.0], yw: [1.5, 1.0] },// mizzen
    ];
    for (const m of masts) {
      spar(m.x, deck, 0, m.x, deck + m.h, 0, 0.09, mastMat);          // mast
      for (let k = 0; k < m.yards.length; k++) {
        const yy = deck + m.yards[k], yh = m.yw[k], sh = k === 0 ? 1.9 : 1.5;
        spar(m.x, yy, -yh, m.x, yy, yh, 0.05, mastMat);               // yard
        add(new THREE.BoxGeometry(0.06, sh, yh * 2 * 0.9), sailMat, m.x, yy - sh / 2, 0); // square sail
      }
    }
  } else if (kind === "trawler") {
    add(new THREE.BoxGeometry(1.6, 0.95, cfg.B * 0.78), cabinMat, -cfg.L * 0.18, deck + 0.48, 0); // wheelhouse
    add(new THREE.BoxGeometry(1.7, 0.08, cfg.B * 0.82), trimMat, -cfg.L * 0.18, deck + 0.99, 0);  // wheelhouse roof
    add(new THREE.CylinderGeometry(0.28, 0.3, 1.2, 10), funnelMat, -cfg.L * 0.34, deck + 1.0, 0); // funnel
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), funnelCapMat, -cfg.L * 0.34, deck + 1.62, 0); // lit cap band
    spar(cfg.L * 0.18, deck, 0, cfg.L * 0.18, deck + 3.4, 0, 0.07, mastMat);                      // foremast
    spar(cfg.L * 0.18, deck + 0.6, 0, -cfg.L * 0.05, deck + 1.4, 0, 0.05, mastMat);               // derrick boom
    add(new THREE.CylinderGeometry(0.18, 0.18, 0.7, 8), trimMat, cfg.L * 0.3, deck + 0.12, 0, 0, 0, Math.PI / 2); // foredeck winch
    for (const sz of [-1, 1]) add(new THREE.BoxGeometry(cfg.L * 0.9, 0.14, 0.05), trimMat, 0, deck + 0.08, sz * cfg.B * 0.42); // bulwark rails
  } else if (kind === "barge") {
    add(new THREE.BoxGeometry(1.8, 0.55, cfg.B * 0.8), cabinMat, -cfg.L * 0.34, deck + 0.28, 0);  // aft cabin
    add(new THREE.BoxGeometry(cfg.L * 0.4, 0.28, cfg.B * 0.66), trimMat, cfg.L * 0.05, deck + 0.14, 0); // hatch coaming
    const mx = cfg.L * 0.12;
    spar(mx, deck, 0, mx, deck + 6.2, 0, 0.1, mastMat);                                           // tall mast
    spar(mx, deck + 0.6, 0, -cfg.L * 0.3, deck + 5.4, 0, 0.06, mastMat);                          // sprit
    add(new THREE.BoxGeometry(cfg.L * 0.5, 4.4, 0.06), tanSailMat, -cfg.L * 0.06, deck + 3.0, 0.05); // sprit-sail
    add(new THREE.BoxGeometry(cfg.L * 0.28, 1.8, 0.05), tanSailMat, mx - 0.2, deck + 6.0, 0.05);  // topsail
    for (const sz of [-1, 1]) add(new THREE.BoxGeometry(0.08, 1.6, 0.7), trimMat, cfg.L * 0.05, deck - 0.5, sz * cfg.B * 0.52, 0, 0, sz * 0.15); // leeboards
  }
  return { root };
}

// ── Working cargo of the port (spr-057): the quay dressed three flat `PROP_Cargo_*`
// billboards — two stacks of casks, a labourer's hand-barrow, a great laid-up anchor —
// that turned to face the camera and flattened the instant the player rounded them. Each
// is now real geometry, ground-planted (root at y=0) and kept under its soft contact-shadow
// blob. Module-private builders before `buildWorld`, each with self-contained materials.

// A cluster of three iron-hooped casks landed on the quay (LatheGeometry staves with a
// bilge bulge, dark hoop rings, lighter heads). Geometries are shared across the barrels.
function buildCaskStack(x, z, R, H, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e4a2a, roughness: 0.82, metalness: 0 });
  const lidM = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 0.8 });
  const hoopM = new THREE.MeshStandardMaterial({ color: 0x36302a, roughness: 0.55, metalness: 0.4 });
  const prof = [], N = 6;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(R * (0.8 + 0.2 * Math.sin(Math.PI * t)), t * H)); }
  const barrelGeo = new THREE.LatheGeometry(prof, 14);
  const lidGeo = new THREE.CircleGeometry(R * 0.82, 14);
  const hoopGeo = new THREE.CylinderGeometry(R * 1.02, R * 1.02, H * 0.07, 14, 1, true);
  const mkBarrel = (cx, cz, hs) => {
    const g = new THREE.Group(); g.position.set(cx, 0, cz); g.scale.y = hs;
    const b = new THREE.Mesh(barrelGeo, wood); b.castShadow = true; g.add(b);
    const lo = new THREE.Mesh(lidGeo, lidM); lo.rotation.x = -Math.PI / 2; lo.position.y = 0.005; g.add(lo);
    const lt = new THREE.Mesh(lidGeo, lidM); lt.rotation.x = Math.PI / 2; lt.position.y = H - 0.005; g.add(lt);
    for (const hy of [0.2, 0.8]) { const h = new THREE.Mesh(hoopGeo, hoopM); h.position.y = H * hy; g.add(h); }
    root.add(g);
  };
  const s = R * 1.02;
  mkBarrel(-s * 0.9, -s * 0.5, 1.0);
  mkBarrel(s * 0.9, -s * 0.4, 0.92);
  mkBarrel(0, s * 0.75, 1.06);
  return { root };
}

// A labourer's two-wheel hand-barrow stood at rest, tipped up on its wheels and front
// legs with the bed near-vertical and the handles in the air.
function buildHandbarrow(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x33312e, roughness: 0.6, metalness: 0.4 });
  const add = (g, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; root.add(o); return o; };
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  for (const sx of [-1, 1]) {
    add(new THREE.TorusGeometry(0.24, 0.06, 8, 18), iron, sx * 0.34, 0.24, 0.18, 0, Math.PI / 2);      // tyre, disc faces x
    add(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10), iron, sx * 0.34, 0.24, 0.18, 0, 0, Math.PI / 2); // hub
  }
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.68, 8), iron, 0, 0.24, 0.18, 0, 0, Math.PI / 2);          // axle
  add(new THREE.BoxGeometry(0.6, 0.9, 0.05), wood, 0, 0.66, 0.06, -0.32);                                 // bed, leaning back
  for (const sx of [-1, 1]) {
    spar(sx * 0.24, 0.98, -0.07, sx * 0.24, 1.34, -0.16, 0.025, wood);                                    // handle up
    spar(sx * 0.25, 0.42, 0.12, sx * 0.25, 0.0, 0.42, 0.03, wood);                                        // front leg/stop
  }
  return { root };
}

// A great rusted admiralty anchor laid up upright against the sea-wall: shank, ring, stock
// crossbar, and two arms sweeping out to arrow-head flukes. A `spar` orients each member.
function buildAnchor(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0.05, z);
  root.rotation.y = yaw;
  root.rotation.z = 0.1; // propped, leaning
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.62, metalness: 0.5, emissive: new THREE.Color(0x3a241a).multiplyScalar(0.22) });
  const spar = (ax, ay, az, bx, by, bz, r) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 9), iron);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  spar(0, 0.2, 0, 0, 1.5, 0, 0.07);                  // shank
  spar(-0.55, 1.32, 0, 0.55, 1.32, 0, 0.045);        // stock crossbar
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), iron); ring.position.set(0, 1.62, 0); ring.castShadow = true; root.add(ring);
  for (const sz of [-1, 1]) {
    spar(0, 0.22, 0, sz * 0.4, 0.12, 0, 0.06);       // arm throat → elbow
    spar(sz * 0.4, 0.12, 0, sz * 0.62, 0.56, 0, 0.05); // elbow → fluke
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.22), iron); fl.position.set(sz * 0.64, 0.58, 0); fl.rotation.z = sz * -0.6; fl.castShadow = true; root.add(fl); // fluke palm
  }
  return { root };
}

// ── The quay at work (spr-058): the heavy dock gear stood as three flat `PROP_Dock_*`
// billboards — a warping capstan, a raked derrick hoist, a stack of sawn deals — that
// flattened the instant the player rounded them. Now real geometry, ground-planted under
// their soft contact-shadow blobs. Module-private builders before `buildWorld`.

// A squat oak warping capstan: cast-iron base, a barrel-waisted drum (LatheGeometry),
// an iron drumhead, and four capstan bars radiating out near the top.
function buildCapstan(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const oak = new THREE.MeshStandardMaterial({ color: 0x6b5436, roughness: 0.82 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x33302b, roughness: 0.6, metalness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.14, 18), iron); base.position.y = 0.07; base.castShadow = true; root.add(base);
  const prof = [], H = 0.78, N = 6;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(0.34 * (1 - 0.32 * Math.sin(Math.PI * t)), t * H)); }
  const drum = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), oak); drum.position.y = 0.14; drum.castShadow = true; root.add(drum);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.36, 0.12, 18), iron); head.position.y = 0.14 + H; head.castShadow = true; root.add(head);
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(); g.rotation.y = k * Math.PI / 2 + Math.PI / 4;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.9, 8), oak);
    bar.rotation.z = Math.PI / 2; bar.position.set(0.55, 0.14 + H + 0.02, 0); bar.castShadow = true;
    g.add(bar); root.add(g);
  }
  return { root };
}

// A tall raked derrick post with its block-and-tackle: an iron heel block, a raked oak
// post, an out-and-up boom, two hemp guy-stays to the ground, and a hanging block + fall.
function buildDerrick(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const oak = new THREE.MeshStandardMaterial({ color: 0x5e4a30, roughness: 0.82 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x33302b, roughness: 0.6, metalness: 0.4 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x7c7050, roughness: 0.95 });
  const add = (g, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; root.add(o); return o; };
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  add(new THREE.BoxGeometry(0.4, 0.18, 0.4), iron, 0, 0.09, 0);          // heel block
  spar(0, 0.12, 0, 0.2, 2.0, -0.05, 0.08, oak);                          // raked post
  spar(0.12, 1.1, -0.02, 1.0, 1.74, 0.05, 0.06, oak);                    // boom / jib
  spar(0.2, 2.0, -0.05, -0.7, 0.0, 0.45, 0.018, rope);                   // guy-stay aft
  spar(0.2, 2.0, -0.05, -0.45, 0.0, -0.6, 0.018, rope);                  // guy-stay side
  add(new THREE.BoxGeometry(0.1, 0.16, 0.09), iron, 1.0, 1.6, 0.05);     // tackle block
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.62, 6), rope, 1.0, 1.21, 0.05); // fall
  add(new THREE.TorusGeometry(0.05, 0.018, 6, 10), iron, 1.0, 0.9, 0.05, Math.PI / 2); // hook ring
  return { root };
}

// A stack of landed sawn deals: six stacked plank-courses (varied tone + slight hand-stack
// jitter) banded by two cross stickers — low and flat, waiting to be carried off.
function buildTimberStack(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const tones = [0x7a5a32, 0x6e5230, 0x836743];
  const L = 1.6, Wd = 0.5, th = 0.06, courses = 6;
  for (let i = 0; i < courses; i++) {
    const m = new THREE.MeshStandardMaterial({ color: tones[i % 3], roughness: 0.85 });
    const y = th / 2 + i * (th + 0.012);
    const deal = new THREE.Mesh(new THREE.BoxGeometry(L, th, Wd * (0.92 + 0.08 * Math.abs(Math.sin(i * 2.1)))), m);
    deal.position.set(Math.sin(i * 2.3) * 0.04, y, Math.sin(i * 1.7) * 0.03);
    deal.castShadow = true; deal.receiveShadow = true; root.add(deal);
  }
  const battenM = new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.9 });
  for (const bx of [-0.5, 0.5]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, Wd + 0.06), battenM);
    b.position.set(bx, courses * (th + 0.012) + 0.02, 0); b.castShadow = true; root.add(b);
  }
  return { root };
}

// ── A quayside bench (spr-059): a slatted timber seat & back carried on two cast-iron
// ends — front leg, taller back leg, and a seat-frame rail. Built along local x, root
// at the ground; replaces the flat PROP_Quay_Bench cutout.
function buildBench(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5d38, roughness: 0.82 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.5, metalness: 0.45 });
  const add = (g, m, px, py, pz, rx = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(px, py, pz);
    o.rotation.x = rx;
    o.castShadow = true; o.receiveShadow = true; root.add(o); return o;
  };
  const L = 1.5, D = 0.42, sh = 0.44;
  for (const ex of [-(L / 2 - 0.06), L / 2 - 0.06]) {
    add(new THREE.BoxGeometry(0.05, sh, 0.05), iron, ex, sh / 2, D / 2 - 0.06);                 // front leg
    add(new THREE.BoxGeometry(0.05, sh + 0.38, 0.05), iron, ex, (sh + 0.38) / 2, -(D / 2 - 0.06)); // back leg, rises to the backrest
    add(new THREE.BoxGeometry(0.05, 0.05, D), iron, ex, sh, 0);                                  // seat-frame rail
  }
  for (const sz of [-0.13, 0, 0.13]) add(new THREE.BoxGeometry(L, 0.04, 0.11), wood, 0, sh + 0.03, sz); // slatted seat
  add(new THREE.BoxGeometry(L, 0.08, 0.03), wood, 0, sh + 0.22, -(D / 2 - 0.04), -0.12);        // backrest slat, lower
  add(new THREE.BoxGeometry(L, 0.08, 0.03), wood, 0, sh + 0.38, -(D / 2 - 0.02), -0.12);        // backrest slat, upper
  return { root };
}

// ── A parish standpipe pump (spr-059): a tapered cast-iron shaft on a plinth, a boxed
// pump-head with a domed finial, a brass spout drooping forward and a long lever handle
// raked up the back. Spout & handle oriented via a local spar() helper; replaces the
// flat PROP_Quay_Pump cutout.
function buildPump(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const iron = new THREE.MeshStandardMaterial({ color: 0x30332e, roughness: 0.5, metalness: 0.42 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a6f33, roughness: 0.4, metalness: 0.6 });
  const add = (g, m, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(px, py, pz);
    o.rotation.set(rx, ry, rz);
    o.castShadow = true; root.add(o); return o;
  };
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  add(new THREE.BoxGeometry(0.26, 0.12, 0.26), iron, 0, 0.06, 0);            // plinth
  add(new THREE.CylinderGeometry(0.065, 0.09, 0.86, 12), iron, 0, 0.55, 0);  // tapered shaft (0.12..0.98)
  add(new THREE.BoxGeometry(0.17, 0.26, 0.17), iron, 0, 1.05, 0);            // pump-head casing (0.92..1.18)
  add(new THREE.SphereGeometry(0.075, 12, 10), iron, 0, 1.22, 0);            // domed finial
  spar(0, 0.98, 0.07, 0, 0.84, 0.34, 0.04, brass);                          // spout, drooping forward
  spar(0, 1.06, -0.07, 0, 1.2, -0.44, 0.028, iron);                         // handle lever, raked up the back
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), iron, 0, 1.06, -0.06, 0, 0, Math.PI / 2); // handle pivot pin
  return { root };
}

// ── A costermonger's two-wheeled handcart (spr-060): a railed timber deck on a
// transverse-axle pair of spoked iron-tyred wheels, standing level on two back legs,
// shafts raked up to a handle bar, loaded with a crate and two produce mounds. Replaces
// the flat PROP_Market_Cart cutout. Root at the ground, builds upward along local x.
function buildMarketCart(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a3e, roughness: 0.82 });
  const woodDk = new THREE.MeshStandardMaterial({ color: 0x6e5230, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a26, roughness: 0.55, metalness: 0.4 });
  const add = (g, m, px, py, pz, rx = 0, ry = 0, rz = 0) => {
    const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz);
    o.castShadow = true; o.receiveShadow = true; root.add(o); return o;
  };
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  const bedY = 0.56, W = 0.72, Lx = 1.5;
  add(new THREE.BoxGeometry(Lx, 0.07, W), wood, 0, bedY, 0);                            // deck
  add(new THREE.BoxGeometry(Lx, 0.16, 0.04), woodDk, 0, bedY + 0.1, W / 2 - 0.02);      // side rail +z
  add(new THREE.BoxGeometry(Lx, 0.16, 0.04), woodDk, 0, bedY + 0.1, -(W / 2 - 0.02));   // side rail -z
  add(new THREE.BoxGeometry(0.04, 0.16, W), woodDk, -(Lx / 2 - 0.02), bedY + 0.1, 0);   // back board
  const wx = -0.18, R = 0.32;
  add(new THREE.CylinderGeometry(0.04, 0.04, W + 0.12, 8), iron, wx, R, 0, Math.PI / 2); // axle (along z)
  for (const wz of [W / 2 + 0.04, -(W / 2 + 0.04)]) {
    add(new THREE.TorusGeometry(R, 0.05, 8, 16), iron, wx, R, wz);                       // tyre (xy-plane, faces ±z)
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), iron, wx, R, wz, Math.PI / 2); // hub
    for (let s = 0; s < 4; s++) add(new THREE.BoxGeometry(R * 1.7, 0.025, 0.02), wood, wx, R, wz, 0, 0, s * Math.PI / 2 + 0.2); // spokes
  }
  for (const lz of [0.28, -0.28]) add(new THREE.BoxGeometry(0.05, bedY, 0.05), woodDk, -(Lx / 2 - 0.08), bedY / 2, lz); // back legs
  spar(Lx / 2 - 0.04, bedY, 0.26, Lx / 2 + 0.5, bedY + 0.22, 0.26, 0.03, wood);         // shaft +z
  spar(Lx / 2 - 0.04, bedY, -0.26, Lx / 2 + 0.5, bedY + 0.22, -0.26, 0.03, wood);       // shaft -z
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 8), wood, Lx / 2 + 0.5, bedY + 0.22, 0, Math.PI / 2); // handle bar
  add(new THREE.BoxGeometry(0.42, 0.3, 0.5), woodDk, -0.32, bedY + 0.19, 0);            // a crate of goods
  add(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc24a30, roughness: 0.7 }), 0.28, bedY + 0.14, 0.16); // apples
  add(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb8902f, roughness: 0.7 }), 0.34, bedY + 0.12, -0.16); // squashes
  return { root };
}

// ── A tall canvas market parasol (spr-060): a weighted foot, a timber pole, a shallow
// octagonal canvas canopy (apex up) with a hanging valance skirt and a turned finial.
// Replaces the flat PROP_Market_Parasol cutout.
function buildParasol(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const pole = new THREE.MeshStandardMaterial({ color: 0x6b5333, roughness: 0.8 });
  const canvas = new THREE.MeshStandardMaterial({ color: 0xb5503f, roughness: 0.9, side: THREE.DoubleSide });
  const add = (g, m, px, py, pz) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; root.add(o); return o; };
  add(new THREE.CylinderGeometry(0.24, 0.28, 0.1, 14), pole, 0, 0.05, 0);               // weighted foot
  add(new THREE.CylinderGeometry(0.04, 0.05, 2.5, 10), pole, 0, 1.25, 0);               // pole
  add(new THREE.ConeGeometry(1.05, 0.55, 8), canvas, 0, 2.36, 0);                       // octagonal canopy, apex up
  add(new THREE.CylinderGeometry(1.02, 1.06, 0.14, 8, 1, true), canvas, 0, 2.02, 0);    // hanging valance (open skirt)
  add(new THREE.SphereGeometry(0.05, 10, 8), pole, 0, 2.66, 0);                          // finial
  return { root };
}

// ── A crock-seller's huddle of glazed earthenware jars (spr-060): five bellied crocks of
// stepped size, each a LatheGeometry swept from one shared bellied profile (scaled per
// jar) in varied glaze tones. Replaces the flat PROP_Market_Crocks cutout.
function buildCrocks(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const prof = [
    new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.17, 0.015), new THREE.Vector2(0.22, 0.08),
    new THREE.Vector2(0.27, 0.26), new THREE.Vector2(0.21, 0.45), new THREE.Vector2(0.12, 0.55),
    new THREE.Vector2(0.145, 0.6), new THREE.Vector2(0.12, 0.63),
  ];
  const jarGeo = new THREE.LatheGeometry(prof, 16);
  const put = (color, px, pz, s) => {
    const o = new THREE.Mesh(jarGeo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 }));
    o.position.set(px, 0, pz); o.scale.setScalar(s);
    o.castShadow = true; o.receiveShadow = true; root.add(o); return o;
  };
  put(0x9c5a3c, 0, 0, 1.0);        // big terracotta
  put(0x5f6a3e, 0.34, 0.06, 0.78); // olive glaze
  put(0x46586a, -0.3, 0.1, 0.64);  // slate-blue glaze
  put(0xa8986a, 0.08, -0.32, 0.72); // cream
  put(0x7a4a36, -0.26, -0.26, 0.58); // small terracotta
  return { root };
}

// ── A fishmonger's slab (spr-061): a timber trestle table with a back & side lip, a bed
// of crushed ice, and the morning's silver catch laid out in a fan (each fish a scaled
// ellipsoid body with a little tail fin, wrapped in its own yawed group). Replaces the
// flat PROP_Market_FishSlab cutout. Root at the ground, builds upward.
function buildFishSlab(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e5634, roughness: 0.85 });
  const ice = new THREE.MeshStandardMaterial({ color: 0xc6d6e0, roughness: 0.4, emissive: 0x223038, emissiveIntensity: 0.3 });
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xb2bcc4, roughness: 0.45, metalness: 0.25 });
  const add = (g, m, px, py, pz) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  const TY = 0.72, Lx = 1.5, D = 0.7;
  add(new THREE.BoxGeometry(Lx, 0.06, D), wood, 0, TY, 0);                              // tabletop
  for (const lx of [-(Lx / 2 - 0.08), Lx / 2 - 0.08]) for (const lz of [-(D / 2 - 0.08), D / 2 - 0.08]) add(new THREE.BoxGeometry(0.06, TY, 0.06), wood, lx, TY / 2, lz); // 4 legs
  add(new THREE.BoxGeometry(Lx, 0.12, 0.04), wood, 0, TY + 0.06, -(D / 2 - 0.02));      // back lip
  for (const lx of [-(Lx / 2 - 0.02), Lx / 2 - 0.02]) add(new THREE.BoxGeometry(0.04, 0.1, D), wood, lx, TY + 0.05, 0); // side lips
  add(new THREE.BoxGeometry(Lx - 0.1, 0.06, D - 0.1), ice, 0, TY + 0.06, 0.02);         // crushed-ice bed
  const fishData = [[-0.45, -0.05], [-0.2, 0.09], [0.05, -0.03], [0.3, 0.08], [0.5, -0.06]];
  for (let i = 0; i < fishData.length; i++) {
    const [fx, fz] = fishData[i];
    const fg = new THREE.Group(); fg.position.set(fx, TY + 0.12, fz); fg.rotation.y = (i - 2) * 0.24;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), fishMat); body.scale.set(1.7, 0.5, 0.42); body.castShadow = true; fg.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.13, 6), fishMat); tail.position.set(-0.26, 0, 0); tail.rotation.z = -Math.PI / 2; fg.add(tail);
    root.add(fg);
  }
  return { root };
}

// ── A cheesemonger's stacked wheels (spr-061): a low timber crate carrying a pyramid of
// six waxed cheese wheels (flat cylinders) in varied golden tones. Replaces the flat
// PROP_Market_Cheese cutout.
function buildCheese(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x6e5230, roughness: 0.85 });
  const add = (g, m, px, py, pz) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  add(new THREE.BoxGeometry(0.92, 0.42, 0.64), wood, 0, 0.21, 0);                       // crate the wheels stack on
  const wheels = [
    [0xd8b85a, -0.26, 0.0, 0.49, 0.21], [0xceae50, 0.0, -0.04, 0.49, 0.21], [0xdcc068, 0.27, 0.03, 0.49, 0.2],
    [0xd2b258, -0.12, 0.02, 0.63, 0.19], [0xd8bc62, 0.16, -0.02, 0.63, 0.19],
    [0xe0c46e, 0.02, 0.0, 0.77, 0.18],
  ];
  for (const [c, px, pz, py, r] of wheels) add(new THREE.CylinderGeometry(r, r, 0.13, 18), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), px, py, pz);
  return { root };
}

// ── A baker's basket of loaves (spr-061): an open woven basket heaped with round bloomers
// (scaled ellipsoids) and long baguettes (capsules laid flat at varied angles) in golden
// crust tones. Replaces the flat PROP_Market_Bread cutout.
function buildBread(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wicker = new THREE.MeshStandardMaterial({ color: 0xa9854e, roughness: 0.9, side: THREE.DoubleSide });
  const crust = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
  const add = (g, m, px, py, pz, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  add(new THREE.CylinderGeometry(0.44, 0.34, 0.3, 18, 1, true), wicker, 0, 0.15, 0);    // basket wall (open)
  add(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 18), wicker, 0, 0.02, 0);            // basket base
  const round = [[0xc89a5a, -0.16, -0.08, 0.15], [0xb98a48, 0.14, 0.1, 0.16], [0xceaa66, 0.02, -0.14, 0.14], [0xbf935a, -0.1, 0.12, 0.13]];
  for (const [c, px, pz, s] of round) { const o = add(new THREE.SphereGeometry(s, 10, 8), crust(c), px, 0.32, pz); o.scale.set(1.2, 0.8, 1.0); }
  const long = [[0xc89a5a, 0.0, 0.0, 0.4, 0.34], [0xb98a48, -0.05, 0.06, -0.5, 0.3], [0xceaa66, 0.1, -0.05, 1.0, 0.28]];
  for (const [c, px, pz, ry, len] of long) add(new THREE.CapsuleGeometry(0.05, len, 4, 8), crust(c), px, 0.42, pz, 0, ry, Math.PI / 2); // baguette laid flat
  return { root };
}

// ── Clipped bay topiary in a tub (spr-062): a tapered iron-hooped tub, a short trunk and
// a stacked double-ball of clipped foliage (faceted icosahedra). Replaces the flat
// PROP_Plant_PottedTree cutout. Root at the ground; `s` scales the whole tree.
function buildPottedTree(x, z, yaw = 0, s = 1) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  root.scale.setScalar(s);
  const tub = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a352e, roughness: 0.6, metalness: 0.4 });
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4a6b32, roughness: 0.85 });
  const add = (g, m, py) => { const o = new THREE.Mesh(g, m); o.position.y = py; o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  add(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 14), tub, 0.21);                  // tapered tub
  for (const [hy, hr] of [[0.08, 0.21], [0.36, 0.265]]) { const o = add(new THREE.TorusGeometry(hr, 0.018, 6, 16), iron, hy); o.rotation.x = Math.PI / 2; } // 2 hoops
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), bark, 0.67);                 // trunk
  add(new THREE.IcosahedronGeometry(0.40, 1), leaf, 0.98);                          // lower clipped ball
  add(new THREE.IcosahedronGeometry(0.32, 1), leaf, 1.38);                          // upper clipped ball
  return { root };
}

// ── A half-barrel flower planter (spr-062): a bulged iron-hooped wooden tub (lathed
// staves), a dark soil cap, a low leafy mound and a cluster of warm bloom-heads poking
// up. Replaces the flat PROP_Plant_Flowers cutout.
function buildFlowerPlanter(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.88 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a352e, roughness: 0.6, metalness: 0.4 });
  const soil = new THREE.MeshStandardMaterial({ color: 0x2e241a, roughness: 1.0 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x537a36, roughness: 0.85 });
  const add = (g, m, px, py, pz, rx = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.x = rx; o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  const prof = [], R = 0.4, H = 0.5, N = 6;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(R * (0.86 + 0.14 * Math.sin(Math.PI * t)), t * H)); }
  add(new THREE.LatheGeometry(prof, 18), wood, 0, 0, 0);                            // bulged tub
  for (const hy of [0.1, 0.4]) add(new THREE.TorusGeometry(R * 0.96, 0.02, 6, 18), iron, 0, hy, 0, Math.PI / 2); // 2 hoops
  add(new THREE.CylinderGeometry(R * 0.92, R * 0.92, 0.04, 18), soil, 0, H - 0.02, 0); // soil cap
  add(new THREE.IcosahedronGeometry(0.3, 1), leaf, 0, H + 0.12, 0);                 // leafy mound (top ≈0.92)
  // Warm bloom-heads on thin green stems, rising in a ring ABOVE the mound so the colour
  // reads — buried in the foliage they'd vanish (the planter exists for this splash).
  const stem = new THREE.MeshStandardMaterial({ color: 0x3f5a28, roughness: 0.85 });
  const blooms = [
    // [colour, angle, ringRadius, headHeight]
    [0xe8dcc8, 0.0, 0.0, 1.14],  // tall central white
    [0xc23a30, 0.0, 0.2, 0.99], [0xe0a832, 1.05, 0.22, 1.04], [0xe8dcc8, 2.1, 0.18, 0.97],
    [0xc23a30, 3.14, 0.21, 1.06], [0xd86a3a, 4.19, 0.2, 0.99], [0xe0a832, 5.24, 0.22, 1.02],
  ];
  for (const [c, ang, rad, hy] of blooms) {
    const hx = Math.cos(ang) * rad, hz = Math.sin(ang) * rad;
    const sy0 = 0.6, slen = Math.max(0.06, hy - sy0 - 0.04);
    add(new THREE.CylinderGeometry(0.013, 0.017, slen, 5), stem, hx, sy0 + slen / 2, hz); // stem rising from the foliage
    add(new THREE.SphereGeometry(0.075, 8, 7), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }), hx, hy, hz); // bloom head
  }
  return { root };
}

// ── A hardy quayside tree (spr-062): a tapered bark trunk, two raked branches (via a
// local spar() helper) and a leafy crown of five overlapping faceted icosahedra in two
// greens. Replaces the flat PROP_Tree_Quay cutout. `s` scales the whole tree.
function buildQuayTree(x, z, yaw = 0, s = 1) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  root.scale.setScalar(s);
  const bark = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.92 });
  const leaf1 = new THREE.MeshStandardMaterial({ color: 0x44642e, roughness: 0.86 });
  const leaf2 = new THREE.MeshStandardMaterial({ color: 0x537a38, roughness: 0.86 });
  const add = (g, m, px, py, pz) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.3, len, 7), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  add(new THREE.CylinderGeometry(0.14, 0.22, 2.2, 10), bark, 0, 1.1, 0);            // trunk
  spar(0, 2.0, 0, 0.7, 2.7, 0.3, 0.07, bark);                                       // branch 1
  spar(0, 2.0, 0, -0.6, 2.8, -0.25, 0.07, bark);                                    // branch 2
  const crown = [
    [leaf1, 0.0, 3.0, 0.0, 1.0], [leaf2, 0.7, 2.9, 0.3, 0.78], [leaf1, -0.65, 3.0, -0.2, 0.8],
    [leaf2, 0.2, 3.5, -0.2, 0.72], [leaf1, -0.2, 3.35, 0.35, 0.7],
  ];
  for (const [m, cx, cy, cz, r] of crown) add(new THREE.IcosahedronGeometry(r, 0), m, cx, cy, cz);
  return { root };
}

// ── The coaling point (spr-063): a low wide heap of angular black coal lumps banked
// against a three-plank timber retaining kerb, a smooth mound under a scatter of faceted
// anthracite (faceted icosahedra, detail 0) catching a faint sheen. Replaces the flat
// PROP_Quay_CoalHeap cutout. Root at the ground.
function buildCoalHeap(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const plank = new THREE.MeshStandardMaterial({ color: 0x46361f, roughness: 0.92 });
  const coalA = new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.78, metalness: 0.18 });
  const coalB = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.7, metalness: 0.22 });
  const add = (g, m, px, py, pz, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(0, ry, rz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  // A low three-plank kerb (back + two sides), open to the quay (front, −z).
  add(new THREE.BoxGeometry(1.5, 0.26, 0.08), plank, 0, 0.13, 0.62);                 // back board
  add(new THREE.BoxGeometry(0.08, 0.26, 1.2), plank, -0.71, 0.13, 0.04);             // left board
  add(new THREE.BoxGeometry(0.08, 0.26, 1.2), plank, 0.71, 0.13, 0.04);             // right board
  // The smooth banked mound under the loose lumps.
  const mound = add(new THREE.IcosahedronGeometry(0.72, 1), coalA, 0, 0.04, 0.18);
  mound.scale.set(1.0, 0.42, 0.78);
  // A scatter of angular coal lumps, deterministic (sin/cos, no Math.random).
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399, rr = 0.18 + 0.42 * ((i * 0.193) % 1);                       // golden-angle spiral
    const lx = Math.cos(a) * rr, lz = 0.18 + Math.sin(a) * rr * 0.7;
    const sz = 0.1 + 0.09 * ((i * 0.137) % 1);
    add(new THREE.IcosahedronGeometry(sz, 0), i % 2 ? coalB : coalA, lx, 0.12 + sz * 0.5, lz, a, a * 0.5);
  }
  return { root };
}

// ── The pitch cask (spr-063): a hooped oak barrel of black caulking tar — bulged lathed
// staves, three iron hoops, a wet near-black pitch surface (faint sheen) open at the top
// and a wooden stirring paddle stood in it. Replaces the flat PROP_Quay_TarBarrel cutout.
function buildTarBarrel(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x5e4126, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x33302a, roughness: 0.6, metalness: 0.45 });
  const tar = new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.35, metalness: 0.25 });
  const add = (g, m, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  const prof = [], R = 0.32, H = 0.82, N = 6;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(R * (0.82 + 0.18 * Math.sin(Math.PI * t)), t * H)); }
  add(new THREE.LatheGeometry(prof, 18), wood, 0, 0, 0);                             // bulged staved cask
  for (const hy of [0.1, 0.41, 0.72]) add(new THREE.TorusGeometry(R * (hy === 0.41 ? 1.0 : 0.86), 0.02, 6, 18), iron, 0, hy, 0, Math.PI / 2); // 3 hoops
  add(new THREE.CylinderGeometry(R * 0.82, R * 0.82, 0.03, 18), tar, 0, H - 0.03, 0); // wet pitch surface
  add(new THREE.CylinderGeometry(0.018, 0.022, 0.6, 6), wood, 0.07, H + 0.2, 0.04, 0.32, 0.18); // stirring paddle
  return { root };
}

// ── The salt cask (spr-063): a hooped cask heaped with coarse grey-white curing salt —
// bulged lathed staves, three iron hoops, a faceted salt mound rising over the rim and a
// wooden hand-scoop dug into it. Replaces the flat PROP_Quay_SaltBarrel cutout.
function buildSaltBarrel(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: 0x73512f, roughness: 0.9 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x33302a, roughness: 0.6, metalness: 0.45 });
  const salt = new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 1.0 });
  const add = (g, m, px, py, pz, rx = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  const prof = [], R = 0.34, H = 0.78, N = 6;
  for (let i = 0; i <= N; i++) { const t = i / N; prof.push(new THREE.Vector2(R * (0.82 + 0.18 * Math.sin(Math.PI * t)), t * H)); }
  add(new THREE.LatheGeometry(prof, 18), wood, 0, 0, 0);                             // bulged staved cask
  for (const hy of [0.1, 0.39, 0.7]) add(new THREE.TorusGeometry(R * (hy === 0.39 ? 1.0 : 0.86), 0.02, 6, 18), iron, 0, hy, 0, Math.PI / 2); // 3 hoops
  const mound = add(new THREE.IcosahedronGeometry(0.3, 1), salt, 0, H - 0.04, 0);   // heaped salt over the rim
  mound.scale.set(1.0, 0.62, 1.0);
  add(new THREE.CylinderGeometry(0.07, 0.06, 0.06, 10), wood, 0.16, H + 0.05, 0.05); // scoop cup
  add(new THREE.CylinderGeometry(0.014, 0.016, 0.28, 6), wood, 0.24, H + 0.16, 0.05, 0, 0.5); // scoop handle
  return { root };
}

// ── The dockers' coal brazier (spr-064): a splay-legged iron tripod carrying a riveted
// fire-bowl of glowing coals — the LAST flat quay prop. Replaces the PROP_Quay_Brazier
// cutout; the Batch-64 firelight pool + halo FX (driven by the day cycle) are SEPARATE and
// stay, layered over the real coals (basket rim ≈0.8, under the halo at y0.85). The coals
// are self-lit (emissive) so they read hot by day and night. Root at the ground.
function buildBrazier(x, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a27, roughness: 0.62, metalness: 0.55 });
  const coal = new THREE.MeshStandardMaterial({ color: 0x3a1606, roughness: 0.85, emissive: 0xff5012, emissiveIntensity: 1.25 });
  const ember = new THREE.MeshStandardMaterial({ color: 0x4a1c08, roughness: 0.8, emissive: 0xff7a1e, emissiveIntensity: 1.5 });
  const add = (g, m, px, py, pz, ry = 0, rz = 0) => { const o = new THREE.Mesh(g, m); o.position.set(px, py, pz); o.rotation.set(0, ry, rz); o.castShadow = true; o.receiveShadow = true; root.add(o); return o; };
  // Three splayed legs from a base foot-ring up under the bowl (oriented via a local spar).
  const spar = (ax, ay, az, bx, by, bz, r, m) => {
    const a = new THREE.Vector3(ax, ay, az), dir = new THREE.Vector3(bx - ax, by - ay, bz - az), len = dir.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 7), m);
    o.position.copy(a).addScaledVector(dir, 0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    o.castShadow = true; root.add(o); return o;
  };
  for (let i = 0; i < 3; i++) {
    const a = i * (2 * Math.PI / 3) + 0.4;
    spar(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3, Math.cos(a) * 0.12, 0.55, Math.sin(a) * 0.12, 0.028, iron);
  }
  const ring = add(new THREE.TorusGeometry(0.3, 0.022, 6, 18), iron, 0, 0.05, 0); ring.rotation.x = Math.PI / 2; // base foot-ring
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), iron, 0, 0.53, 0);          // bowl floor
  add(new THREE.CylinderGeometry(0.33, 0.22, 0.3, 16, 1, true), iron, 0, 0.68, 0);  // open fire-bowl wall
  const rim = add(new THREE.TorusGeometry(0.33, 0.025, 6, 20), iron, 0, 0.82, 0); rim.rotation.x = Math.PI / 2; // rolled rim
  const heap = add(new THREE.IcosahedronGeometry(0.26, 1), coal, 0, 0.74, 0); heap.scale.set(1.0, 0.5, 1.0); // glowing coal heap
  // A scatter of brighter embers on the heap, deterministic (no Math.random).
  for (let i = 0; i < 5; i++) {
    const a = i * 2.399, rr = 0.05 + 0.14 * ((i * 0.27) % 1);
    add(new THREE.IcosahedronGeometry(0.045 + 0.02 * ((i * 0.13) % 1), 0), ember, Math.cos(a) * rr, 0.8, Math.sin(a) * rr, a, a);
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
    // required possession, stood right where the shift is taken. Now REAL geometry
    // (spr-053, buildBicycle) rather than the old side-profile PROP_Job_Bicycle cutout:
    // two spoked wheels, a tubular diamond frame, fork, handlebar, saddle, crank and a
    // front wicker basket. Rolls along bg-local x; the slight yaw leans it on its stand.
    bg.add(buildBicycle(1.55, 0, 0.2, 0.12).root);
    bg.rotation.y = -0.4; // angle it toward the street
    scene.add(bg);
  }

  // ── Parked vehicles (Batch 18): the working harbour's wheels, fixed side-profile
  // cutouts like the courier bike. A delivery scooter stands near the notice board —
  // the courier's step-up from the bike, parked where the run is taken — and a small
  // panel van waits at the east kerb, its broad side to the street. Each is a flat
  // cutout sized to its PNG aspect, lightly self-lit so it reads after dark; the
  // scooter faces the approaching street (+z, angled), the van faces the street (−x).
  // Now REAL geometry (spr-054) — the two PROP_Vehicle_* cutouts retired: the delivery
  // scooter (the courier's step-up from the bike) stands near the notice board angled to
  // the street, and the panel van waits at the east kerb with its broad company-panel side
  // turned to the street (−x). Both carry self-lit lamps so they read after dark.
  scene.add(buildScooter(3.5, 0, -4.4, 0.35).root);
  scene.add(buildVan(5.7, 0, 11, -Math.PI / 2).root);

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

  // Leaning idlers (spr-066): the harbour has people who stand (spr-009), perch (spr-031),
  // sit (spr-065) and talk (spr-032) — but nobody who LOAFS. These two prop the building
  // fronts up: back and shoulders tipped onto the wall, feet planted a little forward, hands
  // loosely clasped, watching the quay. `createFigure(..., {leaning:true})` early-returns to
  // a leaning update in player.js (a sibling of the seated/benched rest poses). Backed onto
  // PLAIN wall stretches of the x≈9 façades (which face −x toward the street) — a sailor on
  // the south warehouse front (z−26) and a docker by the north building (z12) — WELL clear of
  // every shopfront fitting (doors z2.25/−7.5/21.5, windows z−18.5/−10.2/4.9, crates z20.5/
  // −16.3, door topiary z1/3.5/−8.6/−6.4) and the row-end trees (z−30/27). At x8.7 they sit
  // just off the wall, OUTSIDE the walkable bounds (maxX 6.5), so the player only sees their
  // front. Yaw −π/2 turns the back to the wall; root.y stays 0 (feet on the deck).
  const leaners = [
    { role: "Sailor",     x: 8.7, z: -26, yaw: -Math.PI / 2 }, // off-watch, propping up the warehouse wall
    { role: "DockWorker", x: 8.7, z: 12,  yaw: -Math.PI / 2 }, // a docker taking the weight off, by the north front
  ];
  for (const s of leaners) {
    const seed = (((s.x * 6.3 + s.z * 8.9) % 1) + 1) % 1;
    const fig = createFigure(s.role, { castShadow: false, seed, leaning: true });
    fig.root.position.set(s.x, 0, s.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, s.yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(s.x - 0.1, 0.02, s.z); // feet sit a touch off the wall (−x)
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // Rail-gazers on the sea-wall (spr-067): the iconic harbour image still missing — a body
  // propped over the parapet, watching the water. The seated idlers (spr-031) sit ON the
  // coping with their legs dangling; these STAND on the deck just inboard of it and lean
  // FORWARD over the rail, forearms on the stone. `createFigure(..., {gazing:true})` early-
  // returns to the forward-tipping gaze pose in player.js (the counterpart to the back-lean).
  // The quay wall caps at y=0.90, its deck-side face at x=−10.8; feet plant at x=−10.3 (just
  // off the wall, OUTSIDE the walkable bounds' minX −10.5) so the figure props the rail and
  // the player — who can't pass −10.5 — only ever sees its back, the natural read for someone
  // gazing out to sea. Yaw ≈ −π/2 turns the back to the street and the face to the open water.
  // z −4 and −26 sit on clear stretches: between the perched gulls (z −6,3) and the fenders
  // (z 0) for one, and between the life-ring (z −22) and the south lamp (z −28) for the other,
  // each ≥2 m off the nearest bollard (z multiples of 8). Propless roles — a fisher reading the
  // water and a widow keeping her watch — so nothing floats over the parapet. root.y stays 0.
  const railGazers = [
    { role: "Fisher", x: -10.3, z: -4,  yaw: -Math.PI / 2 + 0.15 }, // a fisher reading the weather off the water
    { role: "Widow",  x: -10.3, z: -26, yaw: -Math.PI / 2 - 0.12 }, // a widow keeping her watch on the empty sea
  ];
  for (const s of railGazers) {
    const seed = (((s.x * 7.7 + s.z * 5.1) % 1) + 1) % 1;
    const fig = createFigure(s.role, { castShadow: false, seed, gazing: true });
    fig.root.position.set(s.x, 0, s.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, s.yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(s.x, 0.02, s.z);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // A net-mender on the sea-wall (spr-068): the harbour's FIRST working body. Every figure so
  // far rests — stands, perches, sits, leans, gazes, talks — but none labours. This one perches
  // on the coping like the spr-031 sitters (hip on the y=0.90 cap, root.y = 0.90 − HIP_Y 0.82 =
  // 0.08) but BOWED over its lap, hands working a slow alternating mending rhythm — the trade of
  // the drying trawl net hung just north at (−10.7, 24). `createFigure(..., {mending:true})`
  // early-returns to the bowed working pose in player.js. Seated at z=22 — 2 m clear of the z=24
  // bollard (and its net) and the z=16 one — and faced EAST (yaw +π/2) toward the deck so the
  // player walking the quay sees the front and the working hands, legs dangling toward the
  // cobbles. A propless `Fisher`, so nothing floats; sits on the wall like the other sitters
  // (no contact blob — the coping carries it).
  {
    const x = -11.0, z = 22, yaw = Math.PI / 2;
    const seed = (((x * 9.1 + z * 4.7) % 1) + 1) % 1;
    const fig = createFigure("Fisher", { castShadow: false, seed, mending: true });
    fig.root.position.set(x, 0.08, z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
  }

  // A washerwoman scrubbing at her tub (spr-069): the seated net-mender (spr-068) gave the
  // harbour its first working hands; this is its first STANDING worker. She stands at the
  // quay-wall edge (x−10.0, clear of the patrol lanes which run x−7…4) folded deep over a
  // wooden washtub, driving cloth up and down a board in a brisk two-handed scrub. The tub is
  // built inline here (a hooped wooden tub, soapy water, a ridged board and a draped wet
  // cloth) — like the net/fenders/planters it is a real prop, not a billboard. `createFigure(
  // ..., {scrubbing:true})` early-returns to the bent-over scrubbing pose in player.js. She
  // faces EAST (yaw +π/2) toward the street so the player sees her at the work; the tub sits
  // just east of her where her hands fall. z=7 is a clear gap (Fisherman −10.2,4 is 3 m south,
  // the W knot ≥3 m east). A propless Washerwoman; a contact blob carries her shadow.
  {
    const wx = -10.0, wz = 7, yaw = Math.PI / 2;     // she faces +x (east, the street)
    const tx = wx + 0.52, tz = wz;                   // the tub sits just in front of her hands
    const woodT = new THREE.MeshStandardMaterial({ color: 0x6e4f33, roughness: 0.78, metalness: 0 });
    const ironT = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: 0.55, metalness: 0.6 });
    const tub = new THREE.Group();
    const tbody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.27, 0.5, 18), woodT);
    tbody.position.y = 0.25; tub.add(tbody);
    for (const hy of [0.12, 0.42]) {                 // two iron hoops banding the staves
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.315 - (0.42 - hy) * 0.05, 0.016, 8, 22), ironT);
      hoop.rotation.x = Math.PI / 2; hoop.position.y = hy; tub.add(hoop);
    }
    const water = new THREE.Mesh(                     // soapy water near the rim
      new THREE.CircleGeometry(0.295, 18),
      new THREE.MeshStandardMaterial({ color: 0xb9c4c2, roughness: 0.3, metalness: 0 }),
    );
    water.rotation.x = -Math.PI / 2; water.position.y = 0.485; tub.add(water);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 0.025), woodT); // washboard against the far rim
    board.position.set(0.1, 0.42, 0); board.rotation.z = 0.6; tub.add(board);      // top tips toward her (−x)
    const cloth = new THREE.Mesh(                     // a wet cloth draped over the near rim
      new THREE.BoxGeometry(0.02, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.9, metalness: 0 }),
    );
    cloth.position.set(-0.3, 0.42, 0.06); tub.add(cloth);
    tub.position.set(tx, 0, tz);
    tub.traverse((o) => { if (o.isMesh) o.castShadow = false; }); // shares the quay's blob-shadow economy
    scene.add(tub);

    const seed = (((wx * 5.3 + wz * 8.1) % 1) + 1) % 1;
    const fig = createFigure("Washerwoman", { castShadow: false, seed, scrubbing: true });
    fig.root.position.set(wx, 0, wz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(wx + 0.15, 0.02, wz);          // her feet sit a touch toward the tub
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A docker warming his hands at the brazier (spr-070): the harbour's FIRST figure to
  // relate to a world prop rather than the rail or a tub of his own. He stands square to the
  // dockers' coal brazier at (−9.8,14) — REUSING that existing prop, no new geometry — torso
  // tipped a touch toward the heat, both hands held forward over the glowing coals, head bowed
  // to the warmth (the `warming:true` pose early-returns in player.js). He faces the fire (yaw
  // points at the brazier), so the player approaching from the street reads a three-quarter
  // front. z≈13 is a clear gap on the open quay: the brazier is ~0.9 m north (a prop, faced
  // not overlapped), the standing Washerwoman (−8.4,11.2) ~2.2 m SE, and x=−9.55 sits off every
  // patrol lane. A propless DockWorker (a burly build 1.14); a contact blob carries his shadow.
  {
    const wx = -9.55, wz = 13.1;
    const yaw = Math.atan2(-9.8 - wx, 14 - wz);      // turn to face the brazier's coals
    const seed = (((wx * 5.3 + wz * 8.1) % 1) + 1) % 1;
    const fig = createFigure("DockWorker", { castShadow: false, seed, warming: true });
    fig.root.position.set(wx, 0, wz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(wx - 0.05, 0.02, wz + 0.12);   // weight a touch toward the fire
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A sailor hailing a boat from the sea-wall (spr-071): the harbour's FIRST silhouette to
  // break the shoulder line — every figure so far keeps its arms at or below the shoulder
  // (rest, lean, gaze, scrub, warm); this one flings one arm clear overhead and waves it out
  // to a boat on the water, the other hanging low as a counterweight, chin lifted along the
  // line of the call (`hailing:true` early-returns in player.js). He stands on the deck just
  // off the parapet at x−10.3 (the rail-gazers' strip, OUTSIDE walkable bounds' minX −10.5),
  // back to the street and face to the open water, so the player — who can't pass −10.5 —
  // reads the raised arm in clean silhouette against the sea. z=−18 is a long clear stretch:
  // 8 m from each rail-gazer (Fisher z−4 is far north, Widow z−26 to the south) and the
  // Beggar (z−10), 2 m off the z−16 bollard, with no wall prop at that span (life-ring z−22,
  // buoys z−13). A propless Sailor; a contact blob carries his shadow. root.y stays 0.
  {
    const hx = -10.3, hz = -18, yaw = -Math.PI / 2 + 0.1; // back to the street, face the water
    const seed = (((hx * 7.7 + hz * 5.1) % 1) + 1) % 1;
    const fig = createFigure("Sailor", { castShadow: false, seed, hailing: true });
    fig.root.position.set(hx, 0, hz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(hx, 0.02, hz);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A crumb-scatterer feeding the flock (spr-072): the harbour's FIRST figure to relate to a
  // LIVING animal rather than the rail, a tub, a brazier or the water — the warmer (spr-070)
  // bound a body to a static prop; this binds one to a moving flock. A fishwife folded DEEP at
  // the hips over a knot of pigeons at her boots, one hand flicking crumbs across the cobbles,
  // the other cupping the feed low at her lap, head bowed on the birds (`scattering:true` early-
  // returns to the deepest bow in the harbour in player.js). She REUSES buildPigeon — a fresh
  // 3-bird flock seeded in her bow-cone — no new geometry, the brazier-warmer's prop-reuse idiom
  // turned on a creature. Placed on the OPEN central-south deck at (−0.5,−3): a live occupancy
  // sweep of every contact-shadow blob found this the most open patch on the quay (≈4.8 m clear
  // of every figure, named local and ground prop), 19 m south of the spawn (−3,16) and BETWEEN
  // the patrol lanes (nearest walker passes ≥1.4 m). She faces ~north (yaw +0.12π) toward the
  // player approaching from the spawn, so they read a three-quarter FRONT-stoop with the birds
  // between. A propless Washerwoman; a contact blob carries her shadow, a softer one the flock.
  {
    const wx = -0.5, wz = -3.0, yaw = Math.PI * 0.12;  // faces ~north, three-quartered toward the approach
    const seed = (((wx * 8.9 + wz * 3.7) % 1) + 1) % 1;
    const fig = createFigure("Washerwoman", { castShadow: false, seed, scattering: true });
    fig.root.position.set(wx, 0, wz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(wx + 0.1, 0.02, wz + 0.2);       // weight a touch toward the birds
    blob.renderOrder = -1;
    scene.add(blob);
    // a FRESH 3-bird flock in her bow-cone (just north/east of her stoop) — REUSE buildPigeon,
    // pushed to critters[] for the per-frame peck clock; distinct phases so they never lockstep.
    const cx = wx + 0.25, cz = wz + 0.6;
    const flock = [
      [0.30, 0.20, 2.2, 0, 0.4],
      [-0.25, 0.35, -0.8, 1, 1.9],
      [0.15, -0.30, 1.3, 2, 3.1],
    ]; // [dx, dz, facing, morph, phase]
    for (const [dx, dz, facing, morph, phase] of flock) {
      const pigeon = buildPigeon(cx + dx, cz + dz, facing, morph, phase);
      scene.add(pigeon.root);
      critters.push(pigeon);
    }
    const flockBlob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 18),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.38 }),
    );
    flockBlob.rotation.x = -Math.PI / 2;
    flockBlob.position.set(cx, 0.02, cz);
    flockBlob.renderOrder = -1;
    scene.add(flockBlob);
  }

  // ── An off-watch sailor stretching (spr-073): the UPWARD counterpart to the crumb-scatterer's
  // deepest downward fold (spr-072). Where the fishwife bows to the cobbles, this body straightens
  // up at the end of a shift — BOTH arms flung overhead and splayed into an open Y, chin lifted to
  // the sky, the frame easing back onto the balls of the feet in a slow reach-and-release swell
  // (`stretching:true` early-returns in player.js). The rig has no spine to arch, so the stretch is
  // carried entirely by the two raised arms + the lifted chin — what tells it apart from the one-
  // armed hail (spr-071) and every arms-down idler. Placed on the working south deck at (−2,−12),
  // ~3.5 m clear of every neighbour (a blob-occupancy sweep found it), among the dock crew (the
  // loader at −11, Rafiq at −12, the veteran at −16) so it reads as one of THEM knocking off, and
  // squarely on the player's southward path ~9 m past the scatterer. Faces north-west (yaw −0.18π),
  // a three-quarter front toward the approaching player and out over the open water. A propless
  // Sailor; a contact blob carries the shadow.
  {
    const sx = -2.0, sz = -12.0, yaw = -Math.PI * 0.18;  // a three-quarter front toward the approach + the water
    const seed = (((sx * 6.1 + sz * 9.7) % 1) + 1) % 1;
    const fig = createFigure("Sailor", { castShadow: false, seed, stretching: true });
    fig.root.position.set(sx, 0, sz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(sx, 0.02, sz);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── An innkeeper showing the way (spr-074): the harbour's FIRST figure whose gesture points at
  // ANOTHER piece of the world. The hail (spr-071) called to open water, the scatterer (spr-072) to
  // a flock at her feet, the stretcher (spr-073) to the sky — each bound to something soft or absent.
  // This one's right arm is thrown out LEVEL and aimed across the deck at the REAL notice board at
  // (5,−6), the lit jobs board the player is already walking toward; the head turns to track its own
  // hand, so it reads as "the work's posted that way, down by the board" — directing, not reaching.
  // A point at the horizontal is the rig's native shape (one rigid arm-capsule, no elbow implied, the
  // hand clear of the head), which is why it beat the shoulder-load (needs an elbow to clamp the sack),
  // the arms-fold (needs an elbow to tuck), and the hands-behind-back (armless from the front approach)
  // in an adversarial pose vet. Placed on the open central-south deck at (−2.5,−8): ~5 m south of the
  // scatterer (−0.5,−3), ~4 m north-east of the stretcher (−2,−12), on the INBOARD edge clear of every
  // patrol lane. A sturdy propless **Innkeeper** (a publican knows the harbour) — no prop, no new
  // geometry; it points at the board already built and lit. Faces NE (yaw +0.81) so the southbound
  // player reads the FRONT, the level arm, AND the board it aims at all on one sightline — a live
  // arm-vector probe put the point dead on the board (0.1°) with the head tracking it (2.3°). A contact blob.
  {
    const px = -2.5, pz = -8.0, yaw = 0.81;  // body three-quartered NE — front to the player, arm out toward the board
    const seed = (((px * 4.3 + pz * 11.2) % 1) + 1) % 1;
    const fig = createFigure("Innkeeper", { castShadow: false, seed, pointing: true });
    fig.root.position.set(px, 0, pz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(px, 0.02, pz);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A winded dock-hand catching breath (spr-075): the harbour's first figure caught
  // mid-RECOVERY rather than mid-work — bent moderately at the hips over near-straight
  // legs, the heels of both hands braced on the thighs, head lifted off the bent back.
  // It is the deliberate inverse of the crumb-scatterer (head down, hands reaching the
  // ground): here the gaze is UP and the hands tuck inboard at the hips, reaching for
  // nothing. Body-only — no prop, no anchor; the read lives entirely in the silhouette,
  // so it's placed three-quartered (yaw 2.40) to face a player coming south from spawn,
  // who reads the bent back with the head turned up toward them. DockWorker (a propless
  // working role who'd plausibly be winded). Clear of the x=-7 patrol lane and the lamp pool.
  {
    const px = -8.4, pz = 6.2, yaw = 2.40;
    const seed = (((px * 5.7 + pz * 8.3) % 1) + 1) % 1;
    const fig = createFigure("DockWorker", { castShadow: false, seed, catching: true });
    fig.root.position.set(px, 0, pz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(px, 0.02, pz);
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A deckhand sat down on the bare cobbles (spr-076): the harbour's FIRST figure resting on the
  // GROUND itself, not on any furniture — a young deckhand flopped onto the quay stones, bottom on the
  // cobbles, legs stretched flat in front, hands on the thighs, gazing out. A genuinely new resting
  // CLASS beside the wall-perch (legs dangling) and the bench-sit (a raised seat). The body is dropped
  // onto the stones with root.y = -0.66 (hip to world y≈0.16), exactly as the bench-sitter uses root.y
  // to ride its seat; the {grounded:true} branch then rakes the legs flat and rests the hands on the
  // lap. Youth (propless, so nothing floats over the lowered lap). Placed ~3.8 m north of the winded
  // dock-hand (spr-075) and clear of the x=-7 patrol lane; three-quartered (yaw 2.30) so a player
  // coming south from spawn reads the legs-out, eased-back profile in clean silhouette.
  {
    const gx = -8.6, gz = 10.0, yaw = 2.30;
    const seed = (((gx * 6.7 + gz * 4.9) % 1) + 1) % 1;
    const fig = createFigure("Youth", { castShadow: false, seed, grounded: true });
    fig.root.position.set(gx, -0.66, gz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(gx + Math.sin(yaw) * 0.45, 0.02, gz + Math.cos(yaw) * 0.45); // forward, under the stretched legs
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A fisher casting a line over the sea-wall (spr-077): the harbour's FIRST figure working a long
  // TOOL and the FIRST to engage the WATER. Stood at the far-south sea-wall corner (x=-10.3, OUTSIDE
  // the walkable bounds, so the player reads its BACK against the open sea), both hands on a rod butt,
  // the rod canting up-and-out over the water with a hair-thin line dropped from the tip to the surface.
  // The rod+line are a rigid assembly parented to fig.body at the fixed grip — they ride the breath but
  // never track a swinging hand (player.js prop contract), and the {casting:true} branch keeps the body
  // upright (no fold) so the dropped line never reads snapped. Far clear of the gazers (z=-4,-26), the
  // hailer (z=-18) and every patrol lane. Fisher (propless, so no ROLE_PROP fights the hand-built rod).
  {
    const fx = -10.3, fz = -31, yaw = -Math.PI / 2 + 0.05; // back to the street, face the open water, faint cant
    const seed = (((fx * 5.9 + fz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Fisher", { castShadow: false, seed, casting: true });
    fig.root.position.set(fx, 0, fz);
    // The rod+line, built at the fixed grip point and hung on the body (rides the breath, never tracks).
    const GRIP = new THREE.Vector3(0, 1.40, 0.42);   // body-local point where the two posed hands meet
    const ROD_LEN = 2.4, ROD_TILT = 1.05;            // +x rotation cants the rod's +y length UP and FORWARD (+z = seaward)
    const WL = -0.05;                                // water surface y (matches the water plane)
    const rodGroup = new THREE.Group();
    rodGroup.position.copy(GRIP);
    rodGroup.rotation.x = ROD_TILT;
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.022, ROD_LEN, 8),       // thin tip → thicker butt
      new THREE.MeshStandardMaterial({ color: 0x5a4326, roughness: 0.7, metalness: 0 }),
    );
    rod.position.y = ROD_LEN / 2;                     // butt at the group origin (the hands), tip out along +y
    rodGroup.add(rod);
    fig.body.add(rodGroup);
    // tip in body-local space, then a vertical line straight down to the water
    const tip = GRIP.clone().add(new THREE.Vector3(0, ROD_LEN * Math.cos(ROD_TILT), ROD_LEN * Math.sin(ROD_TILT)));
    const line = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, tip.y - WL, 5),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0 }),
    );
    line.position.set(tip.x, (tip.y + WL) / 2, tip.z); // spans from the rod tip down to the sea surface
    fig.body.add(line);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.45, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(fx - 0.1, 0.02, fz); // feet a touch off the wall (−x)
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A porter carrying a load on her head (spr-078): the harbour's FIRST figure to bear a burden
  // balanced on the CROWN — a third hauler stood beside the south sack-pair (z=-20), both arms swung up
  // and INBOARD to steady a wicker basket of produce on the head. The basket is a static rigid assembly
  // parented to fig.body at a fixed crown offset (the warming/casting prop idiom — it rides the breath,
  // never tracks the arms), and the {portering:true} branch holds the body upright with a level head so
  // the crown never pitches out from under it (no floating/snapped-load read). x=-4 sits 1m off the -5/-3
  // patrol lanes (the scatterer's precedented clearance) and ~3.3m from the nearest sack-carrier.
  // DockWorker — propless (no ROLE_PROP) and a burly build that reads as a porter.
  {
    const px = -4.0, pz = -20.0, yaw = 0.5; // three-quarter front to a southbound player, load clear against the deck
    const seed = (((px * 5.9 + pz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("DockWorker", { castShadow: false, seed, portering: true });
    fig.root.position.set(px, 0, pz);
    // A wicker basket of produce, built at the crown and hung on the body (rides the breath, never tracks).
    const CROWN = 1.97;                              // body-local base height — just above the cap dome (HEAD_TOP 1.88 + cap)
    const wicker = new THREE.MeshStandardMaterial({ color: 0xb08544, roughness: 0.85, metalness: 0 });
    const basket = new THREE.Group();
    basket.position.set(0, CROWN, 0);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.20, 16, 1, true), wicker); // open-topped wicker
    bowl.position.y = 0.11;                          // bowl centre, rim ~0.21 above the base
    basket.add(bowl);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16), wicker);
    base.position.y = 0.01;                          // closes the bottom so it doesn't read hollow from the front
    basket.add(base);
    const load = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a8a4a, roughness: 0.8, metalness: 0 }), // a low mound of muted produce
    );
    load.scale.set(1, 0.5, 1); load.position.y = 0.21; // sat at the bowl mouth
    basket.add(load);
    fig.body.add(basket);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(px, 0.02, pz); // centred under the planted feet (the load rides over the feet)
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A foreman standing watch at the harbour's north mouth (spr-079): the FIRST figure to take its hands
  // BEHIND the back — an open-chested parade-rest, both arms swept rearward to clasp low behind the spine, a
  // wide planted stance, the head scanning slowly down the quay. Body-only ({watching:true}); the pose is
  // sold entirely in body-local space (the two hands ride the breath together, never a snapping prop), so it
  // sidesteps the prop-snap that sank the rejected yoke/plank/mooring candidates. Set at the open north end
  // (z=28) overseeing the whole quay the player explores; x=-2 sits 1m off the -3 patrol lane (precedented)
  // and ~9m from the nearest figure (mending Fisher -11,22). DockWorker — propless (the hands are occupied).
  {
    const wx = -2.0, wz = 28.0, yaw = Math.PI - 0.5; // 3/4 to a player coming up the quay — front + the arms-gone-behind
    const seed = (((wx * 5.9 + wz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("DockWorker", { castShadow: false, seed, watching: true });
    fig.root.position.set(wx, 0, wz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(wx, 0.02, wz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A lookout shading the eyes at the far-north sea-wall (spr-080): the harbour's FIRST pose built
  // AROUND a head tipped genuinely UP. A sailor at the water's edge throws one flat hand up as a
  // brow-visor against the low sun and tips the chin to the horizon, scanning the sky-line for what
  // comes in off the sea — the off arm hangs low as a clear counterweight so the silhouette reads
  // ONE-hand-to-the-brow, never the two-handed warm/clasp. Body-only ({shading:true}); Sailor is
  // propless (no ROLE_PROP), so the up-thrown empty hand reads as a visor exactly the way the empty
  // hand reads in hailing/pointing — zero prop-snap exposure. Set at the empty far-north sea-wall
  // (z=30, north of the mending Fisher z=22; casting is far south at z=-31); x=-10.3 stands at the
  // water's edge (minX=-10.5) clear of every patrol lane. yaw -π/2-0.7 faces WSW/SW — out over the water
  // toward the harbour mouth, turned SOUTH so the figure's LEFT side (which carries the raised brow-visor,
  // see player.js _shading) turns TOWARD a player coming up the quay from the south: they catch the up-chin
  // + raised arm as a front-three-quarter against the bright sea, not the back of the head.
  {
    const sx = -10.3, sz = 30.0, yaw = -Math.PI / 2 - 0.7; // face WSW/SW — out over the water toward the harbour mouth, turned SOUTH so the raised LEFT-hand visor faces a player coming up the quay from the south
    const seed = (((sx * 5.9 + sz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Sailor", { castShadow: false, seed, shading: true });
    fig.root.position.set(sx, 0, sz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(sx, 0.02, sz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── An innkeeper bent in a deferent bow on the quay-side (spr-081): the harbour's FIRST pose built
  // around a body folded DEEP from the hips with the head dropped. An innkeeper, set back off the
  // water on the EAST side of the quay (clear of the crowded west sea-wall), folds into a courtesy
  // doffing bow toward the open quay — greeting arrivals coming up from the notice board — slowly
  // bobbing lower and rising so it reads as an ACTIVE bow, not a frozen stoop. Body-only
  // ({bowing:true}); Innkeeper has NO ROLE_PROP, so both hands hang slack and empty (reaching for
  // nothing) with zero prop-snap exposure. Placed at (3,9): a clear EAST-side gap a full 1.0m off
  // both the x=2 and x=4 patrol lanes and well clear of the building row (fronts x≈8.45). yaw π-0.5
  // faces SE — folding toward a player on the open quay / by the board (5,-6), so they catch the deep
  // fold and dropped crown as a clear front read, not the back of a bent spine.
  {
    const bx = 3.0, bz = 9.0, yaw = Math.PI - 0.5; // face SE — bow folds toward the open quay where the player and notice board are, so the deep fold + dropped head read front-on
    const seed = (((bx * 5.9 + bz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Innkeeper", { castShadow: false, seed, bowing: true });
    fig.root.position.set(bx, 0, bz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(bx, 0.02, bz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A sailor glancing back over the shoulder, halted mid-quay (spr-082): the harbour's FIRST pose
  // built around a head turned AWAY from where the body faces — caught mid-step at a shout from
  // behind, the trunk still squared forward up the quay while the face cranks ~60° back over one
  // shoulder. Body-only ({glancing:true}); Sailor carries no ROLE_PROP, so the easy-hanging hands
  // hold nothing — zero prop-snap exposure. Set in an open mid-quay gap at (-1.5,-2): a clear 1.5m
  // off both the x=0.5 and x=-3 patrol lanes and >11m from the nearest static figure (portering
  // DockWorker -4,-20; bowing Innkeeper 3,9), the lamps and the board. yaw -π/2+0.7 squares the
  // body WNW (up the quay, away) so the cranked-back face turns toward a player coming up from the
  // south — they catch the divergence of body and gaze as the over-the-shoulder glance, the tell.
  {
    const gx = -1.5, gz = -2.0, yaw = -Math.PI / 2 + 0.7; // body squared WNW up the quay; the head cranks ~60° back so the divergence reads to a player approaching from the south
    const seed = (((gx * 5.9 + gz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Sailor", { castShadow: false, seed, glancing: true });
    fig.root.position.set(gx, 0, gz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(gx, 0.02, gz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A widow listening, head canted to one cocked ear (spr-083): the harbour's FIRST pose built
  // around a head ROLLED sideways — every prior pose only pitched the head down (bowing/shading) or
  // twisted it round (glancing); this one tips the crown ~24° toward one ear and holds it, a body
  // caught attending to a sound off to the side, arms hanging slack and doing nothing. Body-only
  // ({listening:true}); Widow carries no ROLE_PROP, so nothing is parented or world-anchored — zero
  // prop-snap. Set in the empty far-NORTH east interior at (5.8,27): a clear 1.8m off the x=4 patrol
  // lane (whose walkers do brush north to z≈28 — so the extra margin keeps them passing well clear),
  // ~8m from the watching DockWorker (-2,28), clear of lamps and the building row (fronts x≈8.45, so
  // 2.6m of front clearance). yaw π-0.5 faces SE so a player coming up the quay from the south
  // catches the canted head and matching shoulder-tilt in three-quarter silhouette.
  {
    const lx = 5.8, lz = 27.0, yaw = Math.PI - 0.5; // face SE — the sideways head-cant and shoulder-tilt both show to a player approaching from the south
    const seed = (((lx * 5.9 + lz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Widow", { castShadow: false, seed, listening: true });
    fig.root.position.set(lx, 0, lz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(lx, 0.02, lz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A sailor craning up at the gulls (spr-084): the harbour's FIRST pose built around a deep,
  // SUSTAINED upward stare. Bowing drops the head DOWN and shading tips the chin up but lives on a
  // raised brow-VISOR hand; this throws the face back to the rigging (head ~31.5° up) and leaves BOTH
  // arms slack at the sides — the silhouette is a bare upward gaze, not the brow-shade. A slow sky-scan
  // keeps it alive (gulls wheeling), never frozen. Body-only ({craning:true}); Sailor carries no
  // ROLE_PROP, so nothing is parented or world-anchored — zero prop-snap. Set in the empty deep-south
  // EAST interior at (5.5,-29): a clear 1.5m off the x=4 patrol lane (so its walkers pass well clear),
  // ~13m from the portering DockWorker (-4,-20) and ~16m from the casting Fisher (-10.3,-31), clear of
  // lamps and the building row (fronts x≈8.45, so ~3m of front clearance). yaw π+0.5 turns the craned
  // face toward the water/SW so a player coming up the quay from the south catches it in 3/4 front.
  {
    const cx = 5.5, cz = -29.0, yaw = Math.PI + 0.5; // face SW over the water — the up-craned face shows to a player approaching from the south
    const seed = (((cx * 5.9 + cz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Sailor", { castShadow: false, seed, craning: true });
    fig.root.position.set(cx, 0, cz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(cx, 0.02, cz); // a grounding shadow under the planted feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── A merchant counting coins (spr-085): the harbour's FIRST pose to use held-steady-vs-drifting
  // ASYMMETRIC pair work. Both hands cup low and inboard at the waist (y≈1.04, well below warming's
  // hands-over-coals and casting's rod-grip) and the RIGHT hand alone tips a hair toward the left on a
  // slow loop while the left holds steady — coins trickled palm to palm; every prior two-handed pose
  // either couples both hands antiphase or braces them static, so this single-hand drift is wholly new.
  // The head dips to the count (shallower than a bow). Body-only ({counting:true}); Merchant carries no
  // ROLE_PROP, so nothing is parented or world-anchored — zero prop-snap. Set in the empty MID-quay EAST
  // strip at (5.8,-14): 1.8m off the x=4 patrol lane (walkers pass clear), ~8m from the notice board
  // (5,-6), ~15m from the craning Sailor (5.5,-29), clear of lamps and the building row (fronts x≈8.45,
  // so ~2.6m of front clearance) — open cobbles, no tree/bollard. yaw π-0.6 faces SW so a player coming
  // up the quay from the south sees the cupped hands and dipped head in three-quarter front.
  {
    const cx = 5.8, cz = -14.0, yaw = Math.PI - 0.6; // face SW — the cupped low hands and dipped head show to a player approaching from the south
    const seed = (((cx * 5.9 + cz * 7.3) % 1) + 1) % 1;
    const fig = createFigure("Merchant", { castShadow: false, seed, counting: true });
    fig.root.position.set(cx, 0, cz);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(cx, 0.02, cz); // a grounding shadow under the planted feet
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
    // [x, y, z] — w1.09×h2.3 slab centred at y1.15 (base on the deck), flush on the wall front
    // (x8.95), facing −x. Now REAL geometry (spr-051, buildShopDoor) rather than the old
    // PROP_Shop_Door cutout — a recessed, ledged plank door in a proud painted casing.
    [8.95, 1.15, 2.25], // Tavern
    [8.95, 1.15, -7.5], // Chandlery
    [8.95, 1.15, 21.5], // HarbourGate
  ];
  for (const [x, y, z] of shopDoors) {
    scene.add(buildShopDoor(x, y, z, FACADE).root);
  }
  const shopLanterns = [
    // [x, y, z] — the back-plate mounts at the wall front (x8.9), the bracket arm carries the glazed
    // cage out toward the street beside each door, amber glass kept strongly emissive so it reads as
    // a warm light after dark. Now REAL geometry (spr-052, buildShopLantern) — the LAST shopfront
    // cutout retired — rather than the old PROP_Shop_Lantern billboard.
    [8.9, 2.55, 3.15], // beside the Tavern door
    [8.9, 2.55, -6.6], // beside the Chandlery door
    [8.9, 2.55, 22.4], // beside the HarbourGate door
  ];
  for (const [x, y, z] of shopLanterns) {
    scene.add(buildShopLantern(x, y, z, FACADE).root);
  }
  const shopCrates = [
    // [x, z, shadowR, facing] — a stack of retail crates at a doorway threshold, on a soft
    // contact-shadow blob. Placed at the two signed doors without topiary (HarbourGate,
    // FerryStop) so nothing collides with the tubs. Now REAL geometry (spr-048, buildCrateStack)
    // rather than the old PROP_Shop_Crates billboard; facing yaws each stack toward the street.
    [8.0, 20.5, 0.6, -1.1], // by the HarbourGate door
    [8.0, -16.3, 0.6, -1.4], // by the FerryStop sign
  ];
  for (const [x, z, shadowR, facing] of shopCrates) {
    scene.add(buildCrateStack(x, 0, z, facing).root);

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
    // [x, y, z] — w1.42×h1.7 casing flush on the wall front (x8.92), facing −x. Now REAL geometry
    // (spr-050, buildShopWindow) rather than the old PROP_Shop_Window cutout — framed, mullioned
    // and glazed, sitting under the spr-049 awning with the spr-047 flower box on its sill.
    [8.92, 1.75, -18.5], // FerryStop bay
    [8.92, 1.75, -10.2], // Chandlery blank side
    [8.92, 1.75, 4.9], // Tavern bay
  ];
  for (const [x, y, z] of shopWindows) {
    scene.add(buildShopWindow(x, y, z, FACADE).root);
  }
  const shopAwnings = [
    // [x, y, z] — the mounting bar pins to the wall front (x8.9, just above each window's top
    // at y2.6) and the striped canvas slopes down-and-out toward the street, shading the glass.
    // Now REAL geometry (spr-049, buildAwning) rather than the old PROP_Shop_Awning cutout.
    [8.9, 2.92, -18.5],
    [8.9, 2.92, -10.2],
    [8.9, 2.92, 4.9],
  ];
  for (const [x, y, z] of shopAwnings) {
    scene.add(buildAwning(x, y, z, FACADE).root);
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
  // All three are now REAL geometry (buildMarketCart/buildParasol/buildCrocks above,
  // spr-060) — no longer billboards — clustered east of the commuter patrol line
  // (x-7) and clear of the stall goods and the 3D barrels (z2.6–3.5). Each still rests
  // on a soft contact-shadow blob.
  const marketPitch = [
    // [kind, x, z, shadowR, yaw]
    ["parasol", -5.7, 11.4, 0.55, 0],    // tall anchor of the pitch
    ["cart", -6.4, 12.9, 0.95, 0.35],    // the wide costermonger's barrow
    ["crocks", -4.5, 12.0, 0.6, -0.4],   // a huddle of glazed jars
  ];
  for (const [kind, x, z, shadowR, yaw] of marketPitch) {
    const built = kind === "parasol" ? buildParasol(x, z, yaw)
      : kind === "cart" ? buildMarketCart(x, z, yaw)
        : buildCrocks(x, z, yaw);
    scene.add(built.root);

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
  // moored boat (real geometry, near). It used to carry three painted broadside cutouts
  // that turned to face the camera (the cloud/gull billboard idiom) and flattened the
  // instant the player strafed. They are now REAL lofted-hull geometry (spr-056) — a
  // three-masted tall ship at anchor, a steam fishing trawler, a tan-sailed sailing barge —
  // so the harbour reads as a working port with traffic from any angle, not an empty bay.
  // Each `buildVessel` roots its hull at the waterline (keel below, deck above) and is
  // yawed roughly broadside to the quay; placed far out (x≤−40) and hazed by harbour fog.
  const WL = -0.05; // water surface y — shared below by ducks, smoke, glitter, mist, shoreline
  scene.add(buildVessel(-60, -20, "tallship", Math.PI / 2 + 0.22).root);
  scene.add(buildVessel(-44, 28, "trawler", Math.PI / 2 - 0.4).root);
  scene.add(buildVessel(-40, -34, "barge", Math.PI / 2 + 0.5).root);

  // ── Small craft on the near water (Batch 54): the bay carried traffic far out (the
  // Batch-44 tall ship, trawler and barge at x≤−40) and one moored cabin-boat near the
  // quay, but the wide band of near water between the sea-wall and that moored boat was
  // bare. A working harbour is thick with the small craft that ferry between hull and
  // shore — so three craft float there, now ALL REAL open-hull geometry (spr-055), the flat
  // PROP_Boat_* broadside cutouts retired: a clinker rowing dory (oars shipped), a flat
  // blunt harbour punt (quant pole), and a small sailing dinghy with its tan sail furled on
  // the mast. Each `buildSmallCraft` roots at the waterline (keel below, gunwale above) and
  // is yawed ~broadside to the quay so the player looking over the wall reads a real hull
  // from any angle — no billboard turn. Clear of the moored boat at (−20,−6), the buoy line
  // (−10.3,−13) and the far vessels.
  scene.add(buildSmallCraft(-14, 18, "dory", Math.PI / 2 + 0.35).root);    // north band
  scene.add(buildSmallCraft(-13.5, -1, "punt", Math.PI / 2 - 0.28).root);  // mid band near the wall
  scene.add(buildSmallCraft(-16.5, -24, "dinghy", Math.PI / 2 + 0.6).root); // south band

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

  // ── Living green on the grey quay (Batch 46 → spr-062): the harbour is all stone, timber
  // and water — painted ground, gulls, vessels, a far shore — but not one growing thing.
  // This began as three painted plant CUTOUTS; spr-062 rebuilds them as REAL geometry — the
  // loop's own ask, "real … instead of faced picture with fake 3D" — so the green stands in
  // three dimensions and holds up as you walk around it. Clipped bay topiary in iron-hooped
  // tubs flank the building doorways, half-barrel flower planters line the water-side rail (a
  // splash of warm colour), and two hardy trees spring from the cobbles at the building-row
  // ends (vertical green for the skyline). Each builder roots itself at the ground at (x,z);
  // because they're GROUND-PLANTED, each still gets a soft contact-shadow blob (the citizen
  // idiom) to sit it on the deck. Placed clear of the walkable bounds (against the building
  // fronts x≈8 and the water-side wall x≈−10.2), the interactables (vendor −5,4 · board 5,−6)
  // and the named cast.
  const plants = [
    // [kind, x, z, shadowR, yaw, scale] — kind dispatches to a module-private builder.
    // Bay topiary in tubs flanking the harbour doorways (against the façades at x≈8.1,
    // just past the walkable edge — below the hanging shop signs, framing the doors).
    ["topiary", 8.1, 1.0, 0.36, 0.0, 1.0],   // Tavern door, south jamb
    ["topiary", 8.1, 3.5, 0.36, 0.5, 1.0],   // Tavern door, north jamb
    ["topiary", 8.1, -8.6, 0.34, -0.3, 0.95], // Chandlery door, south jamb
    ["topiary", 8.1, -6.4, 0.34, 0.2, 0.95],  // Chandlery door, north jamb
    // Half-barrel flower planters down the water-side quay rail (x≈−10.2, on the deck just
    // inside the sea-wall) — warm reds and golds against the grey stone and water.
    ["flowers", -10.2, -15, 0.55, 0.0, 1.0],
    ["flowers", -10.2, 1, 0.55, 0.6, 1.0],
    ["flowers", -10.2, 18, 0.55, -0.4, 1.0],
    // Hardy quayside trees at the ends of the building row — sprung from a corner of the
    // cobbles, vertical green closing the street's north and south ends.
    ["tree", 7.8, 27, 0.6, 0.4, 1.0],
    ["tree", 7.8, -30, 0.55, -0.5, 0.905],
  ];
  for (const [kind, x, z, shadowR, yaw, scale] of plants) {
    const built =
      kind === "topiary" ? buildPottedTree(x, z, yaw, scale)
      : kind === "flowers" ? buildFlowerPlanter(x, z, yaw)
      : buildQuayTree(x, z, yaw, scale);
    scene.add(built.root);

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
    // [kind, x, z, shadowR, ...params] — now REAL geometry (spr-057), no longer billboards.
    ["casks", -9.8, -24, 0.6, 0.3, 0.95, 0.4], // casks off a boat, south quay (R, H, yaw)
    ["casks", -9.9, -4, 0.55, 0.27, 0.82, -0.3], // a second, smaller stack, mid-quay
    ["barrow", 7.0, 6, 0.42, -1.35], // a barrow at rest by the shopfronts (yaw)
    ["anchor", -10.3, 30, 0.62, 0.55], // a great anchor laid up, north quay (yaw)
  ];
  for (const [kind, x, z, shadowR, ...p] of cargo) {
    const built = kind === "casks" ? buildCaskStack(x, z, p[0], p[1], p[2])
      : kind === "barrow" ? buildHandbarrow(x, z, p[0])
      : buildAnchor(x, z, p[0]);
    scene.add(built.root);

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the cargo
    scene.add(blob);
  }

  // ── Quayside comforts for the people who work it (Batch 51; made solid spr-059 →
  // spr-064): the stones are dressed for cargo, nature and gear, but there is something for
  // the labourers themselves — a back to rest, water to drink, a fire to warm cold hands. A
  // slatted timber bench on cast-iron ends sits on the building kerb and again along the
  // water-side promenade, a black cast-iron parish pump stands at the south kerb, and a
  // dockers' coal brazier burns out on the open quay. All three are now REAL geometry
  // (buildBench/buildPump/buildBrazier above) — spr-064 retired the brazier cutout, the LAST
  // flat quay prop. The Batch-64 firelight pool + halo FX below are SEPARATE (day-cycle
  // driven) and stay, layered over the brazier's self-lit coals. Each rests on a soft
  // contact-shadow blob.
  const comforts = [
    // [kind, x, z, shadowR, yaw] — all REAL geometry now (bench/pump spr-059, brazier spr-064).
    ["bench", 6.5, -16, 0.72, -Math.PI / 2], // a bench by the shopfronts, back to the building, facing the quay
    ["bench", -9.7, 20, 0.68, Math.PI / 2],  // a second bench along the water-side promenade
    ["pump", 6.7, -28, 0.32, -Math.PI / 2],  // a parish standpipe at the south kerb, spout to the open quay
    ["brazier", -9.8, 14, 0.46, 0.5],        // a dockers' brazier on the open quay, coals aglow
  ];
  for (const [kind, x, z, shadowR, yaw] of comforts) {
    const built = kind === "bench" ? buildBench(x, z, yaw)
      : kind === "pump" ? buildPump(x, z, yaw)
      : buildBrazier(x, z, yaw);
    scene.add(built.root);

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the comforts
    scene.add(blob);
  }

  // ── Bench-sitters (spr-065): the two quay benches above (by the shopfronts and along the
  // water-side promenade) were somewhere to rest with nobody resting — every seat in the
  // harbour stood empty while the crowd only ever STOOD. Now a body sits on each, back to the
  // building/water, legs stretched to the cobbles, taking the air. `createFigure(...,
  // {benched:true})` early-returns to a sitting update in player.js (the sea-wall perch's
  // sibling). The hip rides the 0.49 m seat top, so root.y = 0.49 − HIP_Y(0.82) = −0.33, and
  // the sitter shares the bench's yaw so it faces the way the seat faces (front = +z local).
  // Propless roles so no tool floats over the lap; a small contact blob grounds the feet,
  // set ~0.55 m forward (+z local) where the raked legs actually plant.
  const benchSitters = [
    { role: "Merchant", x: 6.5,  z: -16, yaw: -Math.PI / 2 }, // a gentleman taking the air by the shopfronts
    { role: "Fisher",   x: -9.7, z: 20,  yaw: Math.PI / 2 },  // a fisher between tides on the promenade
  ];
  for (const s of benchSitters) {
    const seed = (((s.x * 7.7 + s.z * 5.3) % 1) + 1) % 1;
    const fig = createFigure(s.role, { castShadow: false, seed, benched: true });
    fig.root.position.set(s.x, -0.33, s.z);
    scene.add(fig.root);
    citizens.push(makeStanding(fig, s.yaw));
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(s.x + Math.sin(s.yaw) * 0.55, 0.02, s.z + Math.cos(s.yaw) * 0.55); // forward, under the feet
    blob.renderOrder = -1;
    scene.add(blob);
  }

  // ── Firelight from the brazier (Batch 64): the dockers' coal brazier above (at
  // −9.8,14) glows by its own self-lit coals (buildBrazier's emissive heap) but throws NO
  // light on the stones around it or into the air — the same gap Batch 62 fixed for the
  // street lamps. Lay
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
  const BRZ_X = -9.8, BRZ_Z = 14; // matches the buildBrazier placement above
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
  // reads as goods for sale; the palette runs grey timber and rust end to end. The
  // food-trade colour Mei's produce baskets don't carry is now REAL geometry (spr-061,
  // buildFishSlab/buildCheese/buildBread above) — no longer billboards: a fishmonger's
  // slab of the morning's silver catch landed at the water's edge, a cheesemonger's
  // stacked wheels and a baker's basket of golden loaves along the shopfront kerb. Each
  // still rests on a soft contact-shadow blob; tucked into the gaps clear of the cargo
  // (water-side z −24/−4/14), the building barrow (z 6) and the bench/pump (z −16/−28).
  const wares = [
    // [kind, x, z, shadowR, yaw]
    ["fish", -9.8, -12, 0.72, 0.3],   // the morning catch on ice at the water's edge
    ["cheese", 6.8, 0, 0.56, -0.4],   // a cheesemonger's stacked wheels by the shopfronts
    ["bread", 6.8, 11, 0.64, 0.5],    // a baker's basket of loaves down the kerb
  ];
  for (const [kind, x, z, shadowR, yaw] of wares) {
    const built = kind === "fish" ? buildFishSlab(x, z, yaw)
      : kind === "cheese" ? buildCheese(x, z, yaw)
        : buildBread(x, z, yaw);
    scene.add(built.root);

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
    // [kind, x, z, shadowR, yaw] — now REAL geometry (spr-058), no longer billboards.
    ["capstan", -9.8, -30, 0.46, 0.5], // a warping capstan to haul her in, far-south water deck
    ["derrick", -10.1, -34, 0.4, -0.6], // a derrick hoist raked out over the rail, the south corner
    ["timber", 6.7, 18, 0.7, 0.25], // a stack of landed deals down the building kerb
  ];
  for (const [kind, x, z, shadowR, yaw] of dockWork) {
    const built = kind === "capstan" ? buildCapstan(x, z, yaw)
      : kind === "derrick" ? buildDerrick(x, z, yaw)
      : buildTimberStack(x, z, yaw);
    scene.add(built.root);

    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(shadowR, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.renderOrder = -1; // under the cobbles' specular, never over the gear
    scene.add(blob);
  }

  // ── The working materials of the port (Batch 59 → spr-063): the quay now STORES
  // (rope, nets, casks, anchor), WORKS (capstan, derrick, deals), feeds and rests its
  // people (brazier, bench, pump) and sells (fish, cheese, bread) — but the three
  // commonplace bulk materials a steam-and-sail port is actually heaped with were
  // missing: COAL to fire the boats, TAR to caulk the hulls, SALT to cure the catch.
  // This began as three painted cutouts; spr-063 rebuilds them as REAL geometry — the
  // loop's own ask, "real … instead of faced picture with fake 3D" — so the heavy-labour
  // corner stands in the round. They cluster as a south-quay stores corner on the open
  // deck just inboard of the Batch-53 working berth (capstan −9.8,−30 · derrick −10.1,−34)
  // so the working end of the harbour reads complete. Each builder roots itself at the
  // ground at (x,z); GROUND-PLANTED like the cargo/comforts/wares/dockWork, so each still
  // gets a soft contact-shadow blob. Honest dull palette — black coal, wet pitch, grey
  // salt — no glow.
  const workMaterials = [
    // [kind, x, z, shadowR, yaw] — now REAL geometry (spr-063), no longer billboards.
    ["coal", -4.2, -30.0, 0.85, 0.3], // the coaling point — fuel for the steam boats
    ["tar", -2.5, -30.8, 0.4, -0.4], // a pitch cask for caulking the hulls
    ["salt", -5.7, -31.0, 0.44, 0.5], // coarse salt for curing the catch
  ];
  for (const [kind, x, z, shadowR, yaw] of workMaterials) {
    const built = kind === "coal" ? buildCoalHeap(x, z, yaw)
      : kind === "tar" ? buildTarBarrel(x, z, yaw)
      : buildSaltBarrel(x, z, yaw);
    scene.add(built.root);

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
