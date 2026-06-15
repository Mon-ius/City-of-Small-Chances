// The Old Harbour, built procedurally in Three.js: a cobbled quayside street with
// the harbour water on the west, a row of lived-in buildings on the east, street
// lamps, a market stall, crates and bollards, a moored boat — under a graded dawn
// sky with a warm low sun and soft shadows. No textures load over the network;
// everything is geometry + materials so it renders the instant the module does.
//
// buildWorld(scene) returns the play-area bounds (for clamping the player) and an
// array of ambient citizens that patrol the quay.

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
function makeBuilding(x, z, w, h, d, color) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const body = box(w, h, d, color);
  body.position.y = h / 2;
  g.add(body);

  const roof = box(w + 0.3, 0.3, d + 0.3, COLORS.roof);
  roof.position.y = h + 0.15;
  g.add(roof);

  // Windows on the −x face.
  const cols = Math.max(2, Math.floor(d / 1.6));
  const rows = Math.max(2, Math.floor(h / 1.7));
  const winW = 0.5, winH = 0.7;
  const faceX = -w / 2 - 0.03;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = (r * 7 + c * 3 + Math.floor(x + z)) % 3 === 0;
      const win = box(0.06, winH, winW, lit ? 0xffe6b0 : 0x10151b, {
        emissive: lit ? 0xffcaa0 : 0x000000,
        emissiveIntensity: lit ? 0.35 : 0,
        cast: false,
      });
      const zz = (c - (cols - 1) / 2) * (d / cols);
      const yy = 1.2 + r * ((h - 1.6) / Math.max(1, rows - 1 || 1));
      win.position.set(faceX, Math.min(yy, h - 0.8), zz);
      g.add(win);
    }
  }
  return g;
}

function makeLamp(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const pole = box(0.12, 3.0, 0.12, 0x1c1f24);
  pole.position.y = 1.5;
  g.add(pole);
  const arm = box(0.5, 0.1, 0.1, 0x1c1f24);
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

  // ── Ground + water.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: COLORS.cobble, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // The street: a lighter strip the player walks along (runs N–S, along z).
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 80),
    new THREE.MeshStandardMaterial({ color: COLORS.street, roughness: 1 }),
  );
  street.rotation.x = -Math.PI / 2;
  street.position.set(-3, 0.01, 0);
  street.receiveShadow = true;
  scene.add(street);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 120),
    new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.25, metalness: 0.5 }),
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
      new THREE.CylinderGeometry(0.22, 0.26, 0.7, 10),
      new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.7 }),
    );
    bollard.position.set(-11.1, 1.15, z);
    bollard.castShadow = true;
    scene.add(bollard);
  }

  // ── A row of harbour buildings on the east side (fronts facing the water).
  const facades = [
    { w: 7, h: 8.5, d: 7, c: 0x7a5d4a },
    { w: 6, h: 6.5, d: 6.5, c: 0x5d6b73 },
    { w: 8, h: 11, d: 8, c: 0x6a5247 },
    { w: 6.5, h: 7.5, d: 7, c: 0x4f5a52 },
    { w: 7, h: 9.5, d: 7.5, c: 0x73584a },
    { w: 6, h: 6, d: 6.5, c: 0x586169 },
  ];
  let zCursor = -30;
  for (const f of facades) {
    makeBuildingInto(scene, 9 + f.w / 2, zCursor + f.d / 2, f.w, f.h, f.d, f.c);
    zCursor += f.d + 2.5;
  }

  // ── Street lamps along the quay.
  const lampHeads = [];
  for (let z = -28; z <= 28; z += 14) {
    const { group, head } = makeLamp(-9.5, z);
    scene.add(group);
    lampHeads.push(head);
  }

  // ── A market stall with a striped awning, mid-street.
  const stall = new THREE.Group();
  stall.position.set(-5, 0, 4);
  const counter = box(2.6, 0.9, 1.4, 0x5a4636);
  counter.position.y = 0.45;
  stall.add(counter);
  const awning = box(3.0, 0.12, 1.8, 0xb4452f, { cast: true });
  awning.position.y = 1.9;
  awning.rotation.z = -0.12;
  stall.add(awning);
  for (let i = 0; i < 2; i++) {
    const post = box(0.1, 1.9, 0.1, 0x2a211a);
    post.position.set(i ? 1.3 : -1.3, 0.95, 0.7);
    stall.add(post);
  }
  scene.add(stall);

  // ── Stacks of crates for texture near a wall.
  const crateMat = [0x7d6444, 0x6b5538, 0x836a48];
  const crateSpots = [[-1, -8], [-0.2, -8], [-0.6, -8.7], [6, 14], [6.6, 14]];
  crateSpots.forEach(([x, z], i) => {
    const c = box(0.9, 0.9, 0.9, crateMat[i % 3]);
    c.position.set(x, 0.45 + (i % 2 ? 0.9 : 0), z);
    scene.add(c);
  });

  // ── A moored boat out on the water for life on the horizon.
  const boat = new THREE.Group();
  boat.position.set(-20, 0, -6);
  const hull = box(3.2, 1.0, 8, 0x3a2c22);
  hull.position.y = 0.2;
  boat.add(hull);
  const cabin = box(2.2, 1.4, 3, 0x6b5a44);
  cabin.position.set(0, 1.3, -0.5);
  boat.add(cabin);
  const mast = box(0.18, 5, 0.18, 0x241b14);
  mast.position.set(0, 3, 1.5);
  boat.add(mast);
  scene.add(boat);

  // ── A notice board for the "read the board" interactable.
  const boardSpot = INTERACTABLES.find((i) => i.id === "board");
  if (boardSpot) {
    const bg = new THREE.Group();
    bg.position.set(boardSpot.x, 0, boardSpot.z);
    const postL = box(0.12, 1.8, 0.12, 0x3a2f25); postL.position.set(-0.75, 0.9, 0); bg.add(postL);
    const postR = box(0.12, 1.8, 0.12, 0x3a2f25); postR.position.set(0.75, 0.9, 0); bg.add(postR);
    const panel = box(1.8, 1.15, 0.1, 0x6b5535); panel.position.set(0, 1.55, 0); bg.add(panel);
    for (let i = 0; i < 3; i++) {
      const note = box(0.42, 0.32, 0.02, 0xe8e0cf, { cast: false });
      note.position.set(-0.47 + i * 0.47, 1.6, 0.06);
      bg.add(note);
    }
    bg.rotation.y = -0.4; // angle it toward the street
    scene.add(bg);
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

  const bounds = { minX: -10.5, maxX: 6.5, minZ: -34, maxZ: 34 };
  return { bounds, citizens, lampHeads, markers, sun, hemi, ambient, skyDome, paintSky };
}

// Wrapper so makeBuilding (which builds a Group) is added to the scene.
function makeBuildingInto(scene, x, z, w, h, d, color) {
  scene.add(makeBuilding(x, z, w, h, d, color));
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
