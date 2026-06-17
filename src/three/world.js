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
const DECAL_DIR = "./assets/sprites/decals/";
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
  let zCursor = -30;
  for (const f of facades) {
    makeBuildingInto(scene, 9 + f.w / 2, zCursor + f.d / 2, f.w, f.h, f.d, f.body, windowMat, f.roof);
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

  // ── Quayside working clutter (Batch 42): the everyday gear of a working port,
  // fixed side-profile cutouts like the vehicles. Most sit along the water's edge
  // against the painted sea-wall where it belongs — buoys hung at the wall, a net
  // drying, a coil of mooring rope — with a stack of lobster pots on the east kerb.
  // Each is sized to its PNG aspect, sat on the deck (y = h/2), lightly self-lit so
  // it reads after dark, broad side turned to the walkable quay. Placed in the long
  // gaps clear of the stall/board/spawn/crates so nothing blocks the path.
  const quayClutter = [
    // [file, w, h, [x, y, z], yaw, emissive]
    ["PROP_Quay_Buoys", 1.07, 0.9, [-10.3, 0.45, -13], Math.PI / 2, 0.12],
    ["PROP_Quay_FishingNet", 1.06, 0.7, [-10.0, 0.35, 24], Math.PI / 2, 0.1],
    ["PROP_Quay_RopeCoil", 0.75, 0.45, [-9.6, 0.22, 16], Math.PI / 2 - 0.3, 0.1],
    ["PROP_Quay_LobsterPots", 1.17, 0.8, [5.8, 0.4, -18], -Math.PI / 2, 0.1],
  ];
  for (const [file, w, h, [x, y, z], yaw, emissive] of quayClutter) {
    const c = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive });
    c.position.set(x, y, z);
    c.rotation.y = yaw;
    scene.add(c);
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
    // Batch 26 (spr-002): six more roles broaden the port's range of age & class —
    // a child underfoot, a sailor off a boat, a sack-hauling porter, an uptown clerk,
    // a washerwoman at her basket, an old woman on her cane. Placed clear of the
    // interactables (vendor −5,4 · board 5,−6), the named cast and the spawn.
    { role: "Child",        x:  3.6, z:  13 },
    { role: "Sailor",       x: -9.5, z:  -3 },
    { role: "Porter",       x: -6.5, z: -20 },
    { role: "Clerk",        x: -3.2, z:  24 },
    { role: "Washerwoman",  x: -9.0, z:  12 },
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
    { role: "Innkeeper",    x:  -5.5, z:  11 },
    { role: "Ferryman",     x:   6.0, z: -20 },
    // Batch 34 (spr-002): six more trades and the family life of the port — the smith
    // at his hammer, the baker with his bread, the itinerant tinker laden with pots, a
    // mother cradling her infant, a soldier of the garrison, and the coal-heaver bent
    // under his black sack. Set into the quay's far gaps, clear of the interactables
    // (vendor −5,4 · board 5,−6), the named cast (Mei/Tomo/Jun/Rafiq), the spawn (−3,16)
    // and each other. (30 → 36 standing crowd, toward the 40-NPC EA target.)
    { role: "Blacksmith",   x:  -9.5, z:  30 },
    { role: "Baker",        x:   4.5, z:  18 },
    { role: "Tinker",       x: -10.0, z: -20 },
    { role: "Mother",       x:   0.5, z:  30 },
    { role: "Soldier",      x:   6.0, z:  10 },
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

  // ── Seagulls (Batch 43): the harbour's defining creature, absent until now — a
  // port without gulls doesn't read as a port. Painted herring-gull cutouts perched
  // along the wet sea-wall top, on the lamp cross-arms, on the moored boat (one at
  // the masthead, calling), on two rooftops, and a few soaring high over the water.
  // Each is a camera-facing billboard (pushed to `billboards`, turned to face the
  // camera every frame in main.js) just like the citizens; the perched birds sit ON
  // their surface, the soarers hang high like the drifting clouds. No contact-shadow
  // blob — gulls perch on rails and wing over water, never plant on the ground. Three
  // poses (perched / calling / flying) repeat across the flock; the flyers ship ~2:1.
  const gulls = [
    // [pose, x, y, z, w, h, emissive]
    // Along the wet sea-wall top (wall top y≈0.9, x≈−11.4), set between the bollards.
    ["Perched", -11.4, 1.16, -6, 0.5, 0.5, 0.16],
    ["Calling", -11.4, 1.18, 3, 0.52, 0.52, 0.16],
    ["Perched", -11.4, 1.16, 12, 0.5, 0.5, 0.16],
    ["Perched", -11.4, 1.16, -19, 0.48, 0.48, 0.16],
    ["Calling", -11.4, 1.18, 25, 0.52, 0.52, 0.16],
    // On the lamp cross-arms (arm at y≈3.0, x≈−9.3; lamps sit at z∈{−28,−14,0,14,28}).
    ["Perched", -9.25, 3.2, -14, 0.46, 0.46, 0.18],
    ["Calling", -9.25, 3.22, 14, 0.46, 0.46, 0.18],
    // On the moored boat, out over the water at (−20,·,−6): one on the gunwale, one
    // up at the masthead crying over the harbour.
    ["Perched", -19.8, 0.95, -2.5, 0.5, 0.5, 0.16],
    ["Calling", -20.0, 5.75, -4.5, 0.44, 0.44, 0.2],
    // On two harbour rooftops (front edge x≈9, roof top y≈h+0.3), high over the street.
    ["Perched", 9.2, 9.05, -26.5, 0.5, 0.5, 0.2],
    ["Calling", 9.2, 10.05, 12.25, 0.5, 0.5, 0.2],
    // Soaring high over the water and the quay — a static glide reads like the clouds.
    ["Flying", -25, 9, -2, 1.4, 0.7, 0.22],
    ["Flying", -18, 11, 9, 1.2, 0.6, 0.22],
    ["Flying", -30, 13, -15, 1.5, 0.75, 0.22],
    ["Flying", 4, 14, -4, 1.1, 0.55, 0.22],
  ];
  for (const [pose, x, y, z, w, h, emissive] of gulls) {
    const gull = cutoutPlane(`${PROP_SPRITE_DIR}PROP_Gull_${pose}.png`, w, h, { emissive, alphaTest: 0.4 });
    gull.position.set(x, y, z);
    scene.add(gull);
    billboards.push(gull); // main.js turns it to face the camera each frame
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

  // ── Washing day over the quay (Batch 47): the tall façades fronting the quay were the
  // plainest surface left — bare wall, a grid of windows, a few hanging signs. A crowded
  // period port hangs its washing out over the street, so three painted washing-line
  // cutouts now sag across the upper façades: household linens, everyday clothes, and
  // dock-labour work-clothes. Like the Batch-9 signage these are FIXED cutouts (laundry
  // hangs still on its line — it does not billboard to watch you), hung a little proud of
  // the wall (x≈8.5) facing the street (−x), strung high above the doors and shop signs and
  // below the rooflines, lit a touch (emissive) so they stay readable after dark.
  const laundry = [
    // [file, w, h, y, z] — all at x=8.5, facing −x (FACADE), strung across an upper façade.
    ["PROP_Laundry_Workclothes", 3.4, 1.13, 5.2, -26.5], // over the southmost building (h8.5)
    ["PROP_Laundry_Linens", 3.7, 1.23, 6.5, -7.5], // high on the tall Chandlery wall (h11)
    ["PROP_Laundry_Garments", 3.4, 1.13, 5.8, 12.25], // a splash of colour, north building (h9.5)
  ];
  for (const [file, w, h, y, z] of laundry) {
    const line = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.2, alphaTest: 0.35 });
    line.position.set(8.5, y, z);
    line.rotation.y = FACADE; // face −x, hanging out over the street
    scene.add(line);
  }

  // ── Life on the cobbles (Batch 48): the gulls gave the harbour life in the air and the
  // citizens give it people, but the quay kept no animals at the player's own eye level.
  // A sparse scatter of camera-facing animal billboards (the citizen/gull idiom) puts a
  // little life underfoot: the quay cat settled on the sea-wall coping watching the water
  // (perched on a surface, so no contact-shadow blob — like the gulls), a stray dock dog
  // hoping for scraps by Mei's stall, and two clusters of pigeons working the cobbles
  // (ground-planted, each with a soft contact-shadow blob). `baseY` is the surface the
  // animal sits on (0 = the deck, 0.9 = the sea-wall top); the plane centre is half its
  // height above that. Kept clear of the interactables, the named cast and the spawn.
  const animals = [
    // [file, w, h, x, z, baseY, shadowR] — shadowR 0 = perched on a surface, no blob.
    ["PROP_Animal_Cat", 0.28, 0.55, -11.1, 9, 0.9, 0], // the quay cat on the sea-wall coping
    ["PROP_Animal_Dog", 0.85, 0.85, -7.0, 5.5, 0, 0.42], // a stray by Mei's noodle stall
    ["PROP_Animal_Pigeons", 0.84, 0.4, -2.5, 6.0, 0, 0.34], // pecking the cobbles near the stall
    ["PROP_Animal_Pigeons", 0.78, 0.37, 1.5, 14, 0, 0.32], // a second group out on the quay
  ];
  for (const [file, w, h, x, z, baseY, shadowR] of animals) {
    const animal = cutoutPlane(`${PROP_SPRITE_DIR}${file}.png`, w, h, { emissive: 0.16, alphaTest: 0.4 });
    animal.position.set(x, baseY + h / 2, z);
    scene.add(animal);
    billboards.push(animal); // main.js turns it to face the camera each frame
    if (shadowR > 0) {
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(shadowR, 16),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 }),
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.set(x, 0.02, z);
      blob.renderOrder = -1; // under the cobbles' specular, never over the animal
      scene.add(blob);
    }
  }

  // ── Smoke from the chimneys (Batch 49): the sky over the rooftops was the emptiest
  // zone in the frame — clouds and a few high gulls and nothing else rising. A working
  // port has woodsmoke curling off its roofs; that single touch makes the buildings read
  // as warm and lived-in rather than empty shells. Three luminance-alpha smoke sprites
  // (painted on black, alpha = brightness, so the wisps stay truly soft) stand as
  // billboards over the three tallest roofs — a faint wisp just catching, a steady plume,
  // a fuller column from a busy kitchen. Unlike the cutout props these use NO alphaTest (a
  // feathered edge, never a hard sticker rim). The emissive map carries the plume so it
  // reads pale across the whole day cycle (brightest against the dark night sky, where the
  // lit windows are glowing too — most subtle against a bright sunset, as real smoke is).
  // depthTest + depthWrite are OFF and renderOrder is high so the plume always draws over
  // the sky dome and the day-cycle sky-tint spheres (which sit at the far radius and would
  // otherwise depth-occlude a thing this far out); standing high above the rooflines, it
  // never bleeds over anything that ought to be in front of it.
  const smoke = [
    // [file, w, h, x, z, roofTop] — the plane base sits on the roof (y = roofTop + h/2).
    ["PROP_Smoke_Column", 2.87, 5.2, 12.6, -9.0, 11.3], // the tall chandlery: a busy kitchen chimney
    ["PROP_Smoke_Plume", 1.89, 4.7, 12.4, 10.8, 9.8], // a hearth well alight
    ["PROP_Smoke_Wisp", 1.3, 3.9, 12.0, -25.0, 8.8], // a fire just catching
  ];
  for (const [file, w, h, x, z, roofTop] of smoke) {
    const map = _texLoader.load(`${PROP_SPRITE_DIR}${file}.png`);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false, // true vapour — nothing reads its depth
      depthTest: false, // draw over the far sky dome / sky-tint spheres, never occluded
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      emissive: 0xffffff,
      emissiveMap: map,
      emissiveIntensity: 1.0, // carries the pale plume across day → night
    });
    const plume = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    plume.position.set(x, roofTop + h / 2, z);
    plume.renderOrder = 4; // after the opaque world AND the sky-tint spheres (renderOrder 1–3)
    scene.add(plume);
    billboards.push(plume); // main.js turns it to face the camera each frame
  }

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
