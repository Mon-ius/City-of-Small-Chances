// The Old Harbour, built procedurally in Three.js: a cobbled quayside street with
// the harbour water on the west, a row of lived-in buildings on the east, street
// lamps, a market stall, crates and bollards, a moored boat — under a graded dawn
// sky with a warm low sun and soft shadows. No textures load over the network;
// everything is geometry + materials so it renders the instant the module does.
//
// buildWorld(scene) returns the play-area bounds (for clamping the player), an
// array of ambient citizens that patrol the quay, and a set of painted citizen
// billboards (camera-facing sprite quads) the frame loop turns to face the camera.

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
const SPRITE_DIR = "./assets/sprites/citizens/";
const SIGNAGE_DIR = "./assets/sprites/signage/";
const SKY_DIR = "./assets/sprites/sky/";
const PROP_SPRITE_DIR = "./assets/sprites/props/";
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

// ── Citizen billboards (Batch 3): painted full-body cutouts with transparent
// alpha, generated with GPT-Image-2 and chroma-keyed. Each is a single upright
// quad turned to face the camera every frame (cylindrical billboarding, done in
// main.js) so the painted figure always reads front-on. The albedo carries warm
// dusk shading already; we light it lightly and floor it with a touch of emissive
// so it neither flickers as you orbit nor goes black after dark.
function spritePlane(map, height) {
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    emissive: 0xffffff,
    emissiveMap: map,
    emissiveIntensity: 0.28,
  });
  const w = height * 0.5; // sprites ship 512×1024 (1:2)
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
  plane.position.y = height / 2; // feet on the ground
  plane.castShadow = false;      // a camera-facing plane casts a bad rotating shadow
  return plane;
}
function citizenSprite(role, height = 1.85) {
  return spritePlane(_texLoader.load(`${SPRITE_DIR}CHAR_Harbour_Citizen_${role}_albedo.png`), height);
}
// The named major NPCs (Batch 22, spr-003): full-body sprites painted to match
// each character's talk-panel portrait, same billboard treatment as the citizens.
function npcSprite(name, height = 1.85) {
  return spritePlane(_texLoader.load(`${SPRITE_DIR}CHAR_NPC_${name}_albedo.png`), height);
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
  const windowMat = windowAtlasMaterial();
  const woodMat = surfaceMaterial("PlankWood", [1, 1]);
  // Weathered clay-tile roof (Batch 11): a single shared tile, repeated so the
  // pitched lids read as rows of tiles rather than a flat grey cap.
  const roofMat = surfaceMaterial("Roof", [4, 4]);

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

  // ── Quay wall separating the street from the water, with bollards on top.
  const quay = box(1.2, 0.9, 80, COLORS.quay, { cast: true });
  quay.position.set(-11.4, 0.45, 0);
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
  // All share the one painted plaster body + window-atlas material; per-building
  // variety comes from size and from the window-cell hashing inside makeBuilding.
  const facades = [
    { w: 7, h: 8.5, d: 7 },
    { w: 6, h: 6.5, d: 6.5 },
    { w: 8, h: 11, d: 8 },
    { w: 6.5, h: 7.5, d: 7 },
    { w: 7, h: 9.5, d: 7.5 },
    { w: 6, h: 6, d: 6.5 },
  ];
  let zCursor = -30;
  for (const f of facades) {
    makeBuildingInto(scene, 9 + f.w / 2, zCursor + f.d / 2, f.w, f.h, f.d, plasterMat, windowMat, roofMat);
    zCursor += f.d + 2.5;
  }

  // ── Street lamps along the quay.
  const lampHeads = [];
  for (let z = -28; z <= 28; z += 14) {
    const { group, head } = makeLamp(-9.5, z, metalMat);
    scene.add(group);
    lampHeads.push(head);
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

  // Mei's wares (Batch 17): painted market goods dressing the stall — two heaped
  // produce baskets and a steaming noodle bowl up on the counter, a string of dried
  // wares hung under the awning, and a sack stack + a restock crate on the ground
  // beside it. Each is a flat alpha cutout sized to its PNG aspect and added to the
  // stall group, so it inherits the stall's place and faces +z toward the customer
  // (the way the player walks in) — the same fixed-cutout trick as the noodle sign
  // and the parked courier bike. Lightly self-lit so the goods read after dark.
  const stallGoods = [
    // [file, w, h, [x, y, z], emissive]
    ["PROP_Food_NoodleBowl", 0.62, 0.625, [0.55, 1.2, 0.42], 0.18],
    ["PROP_Market_BasketFruit", 0.83, 0.58, [-0.6, 1.22, 0.42], 0.1],
    ["PROP_Market_HangingWares", 0.68, 0.62, [0.95, 1.45, 0.55], 0.1],
    // Mei's cooking gear (Batch 20, closing spr-006): a seasoned wok + ladle +
    // chopsticks at the left of the counter, where she works the bowls.
    ["PROP_Kit_Utensils", 0.64, 0.537, [-1.3, 1.2, 0.42], 0.12],
    ["PROP_Market_BasketVeg", 0.78, 0.5, [-1.95, 0.3, 1.2], 0.06],
    ["PROP_Market_Sacks", 0.97, 0.48, [1.8, 0.29, 1.2], 0.05],
    ["PROP_Market_Crate", 0.84, 0.54, [-2.3, 0.31, 0.4], 0.06],
  ];
  for (const [file, w, h, [x, y, z], emissive] of stallGoods) {
    const good = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive });
    good.position.set(x, y, z);
    stall.add(good);
  }
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
  scene.add(boat);

  // ── A notice board for the "read the board" interactable.
  const boardSpot = INTERACTABLES.find((i) => i.id === "board");
  if (boardSpot) {
    const bg = new THREE.Group();
    bg.position.set(boardSpot.x, 0, boardSpot.z);
    const postL = box(0.12, 1.8, 0.12, 0x3a2f25); postL.position.set(-0.75, 0.9, 0); bg.add(postL);
    const postR = box(0.12, 1.8, 0.12, 0x3a2f25); postR.position.set(0.75, 0.9, 0); bg.add(postR);
    const panel = box(1.8, 1.15, 0.1, 0x6b5535); panel.position.set(0, 1.55, 0); bg.add(panel);
    // A painted cluster of pinned notes & curled flyers overlaid on the panel face.
    const notes = cutoutPlane(`${SIGNAGE_DIR}DECAL_BoardNotes.png`, 1.55, 0.98, { emissive: 0.2 });
    notes.position.set(0, 1.58, 0.061);
    bg.add(notes);
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

  // ── Ambient citizens patrolling the quay.
  const citizens = [];
  const roster = [
    { kind: "vendor", x: -5, z: 6, span: 3 },
    { kind: "worker", x: 2, z: -14, span: 10 },
    { kind: "commuter", x: -7, z: -2, span: 14 },
    { kind: "elder", x: 4, z: 18, span: 6 },
  ];
  roster.forEach((r, i) => {
    const fig = createFigure(r.kind);
    fig.root.position.set(r.x, 0, r.z - r.span / 2);
    scene.add(fig.root);
    citizens.push(makePatrol(fig, r.z - r.span / 2, r.z + r.span / 2, i));
  });

  // ── A standing crowd of painted citizen billboards milling along the quay.
  // Static positions (these figures watch the water and loiter rather than walk —
  // a walking flat sprite reads badly); main.js turns each to face the camera.
  // Placed clear of the interactables (vendor −5,4 · board 5,−6) and the spawn.
  const billboards = [];
  const shadowTex = shadowTexture();
  const crowd = [
    { role: "Fisher",       x: -9.5, z: -14 },
    { role: "DockWorker",   x:  2.0, z: -11 },
    { role: "Elder",        x: -2.0, z: -24 },
    { role: "Commuter",     x: -5.0, z:  28 },
    { role: "Youth",        x:  3.0, z:  10 },
    { role: "MarketVendor", x: -7.5, z:   8 },
    { role: "DockWorker",   x: -9.0, z:  22 },
    { role: "Commuter",     x:  1.0, z: -28 },
  ];
  for (const c of crowd) {
    const plane = citizenSprite(c.role);
    plane.position.set(c.x, plane.position.y, c.z);
    scene.add(plane);
    billboards.push(plane);

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
  // you pass on the quay. Placed clear of the interactables and the spawn.
  const namedLocals = [
    { name: "Mei", x: -5.0, z: 3.1 },   // behind her stall counter (stall at −5,4)
    { name: "Tomo", x: -8.8, z: -7 },   // the quay mechanic, water-side at his patch
    { name: "Jun", x: 3.0, z: -7 },     // the dispatcher near the board + parked bike
    { name: "Rafiq", x: 4.7, z: -12 },  // the foreman with the dock gang, north end
  ];
  for (const p of namedLocals) {
    const plane = npcSprite(p.name);
    plane.position.set(p.x, plane.position.y, p.z);
    scene.add(plane);
    billboards.push(plane);
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 16),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(p.x, 0.02, p.z);
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
  return { bounds, citizens, billboards, clouds, lampHeads, markers, sun, hemi, ambient, skyDome, paintSky, setSkyBlend, setOvercast, tintClouds };
}

// Wrapper so makeBuilding (which builds a Group) is added to the scene.
function makeBuildingInto(scene, x, z, w, h, d, bodyMat, windowMat, roofMat) {
  scene.add(makeBuilding(x, z, w, h, d, bodyMat, windowMat, roofMat));
}

// A citizen that walks back and forth between two z values, facing its direction.
// Speed is derived from the index so renders stay deterministic (no Math.random).
function makePatrol(fig, z0, z1, index = 0) {
  let dir = 1;
  const speed = 1.05 + ((index * 0.37) % 0.6);
  return {
    fig,
    update(dt) {
      let z = fig.root.position.z + dir * speed * dt;
      if (z > z1) { z = z1; dir = -1; }
      else if (z < z0) { z = z0; dir = 1; }
      fig.root.position.z = z;
      fig.root.rotation.y = dir > 0 ? 0 : Math.PI;
      fig.update(dt, speed);
    },
  };
}
