// Geometry + scene assembly. Generates box/plane meshes (pos, normal, uv) with
// world-scaled UV tiling, then lays out the Old Harbour: a quay, a road, a row
// of buildings each side, water beyond the quay, and scattered props.

import { createMesh } from "./gl.js";
import { M } from "./mat.js";

// Box centered on X/Z, sitting on y=0..h. UVs tile by face size / tileWorld so
// window/brick textures repeat at a consistent real-world scale.
export function boxGeometry(w, h, d, tileWorld = 12, vOffsetByHeight = true) {
  const hw = w / 2, hd = d / 2;
  const uW = w / tileWorld, uH = h / tileWorld, uD = d / tileWorld;
  const v = [];
  const idx = [];
  let base = 0;
  // face: 4 verts (pos, normal, uv) + 2 tris
  const face = (corners, normal, us, vs) => {
    for (let i = 0; i < 4; i++) {
      v.push(corners[i][0], corners[i][1], corners[i][2], normal[0], normal[1], normal[2], us[i], vs[i]);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  };
  // +Z (front)
  face([[-hw, 0, hd], [hw, 0, hd], [hw, h, hd], [-hw, h, hd]], [0, 0, 1], [0, uW, uW, 0], [0, 0, uH, uH]);
  // -Z (back)
  face([[hw, 0, -hd], [-hw, 0, -hd], [-hw, h, -hd], [hw, h, -hd]], [0, 0, -1], [0, uW, uW, 0], [0, 0, uH, uH]);
  // +X (right)
  face([[hw, 0, hd], [hw, 0, -hd], [hw, h, -hd], [hw, h, hd]], [1, 0, 0], [0, uD, uD, 0], [0, 0, uH, uH]);
  // -X (left)
  face([[-hw, 0, -hd], [-hw, 0, hd], [-hw, h, hd], [-hw, h, -hd]], [-1, 0, 0], [0, uD, uD, 0], [0, 0, uH, uH]);
  // +Y (top)
  face([[-hw, h, hd], [hw, h, hd], [hw, h, -hd], [-hw, h, -hd]], [0, 1, 0], [0, uW, uW, 0], [0, 0, uD, uD]);
  // -Y skipped (never seen)
  return { vertices: new Float32Array(v), indices: new Uint16Array(idx) };
}

// Flat plane on XZ at y=0, centered, with UV tiling.
export function planeGeometry(w, d, tileWorld = 8) {
  const hw = w / 2, hd = d / 2, uW = w / tileWorld, uD = d / tileWorld;
  const vertices = new Float32Array([
    -hw, 0, hd, 0, 1, 0, 0, 0,
    hw, 0, hd, 0, 1, 0, uW, 0,
    hw, 0, -hd, 0, 1, 0, uW, uD,
    -hw, 0, -hd, 0, 1, 0, 0, uD,
  ]);
  return { vertices, indices: new Uint16Array([0, 1, 2, 0, 2, 3]) };
}

// Build the whole scene. Returns { items:[{mesh, material, model}], picks }.
// opts.water (default true) — harbour/dock districts sit on water; inland
// districts replace the basin with paved ground so the street reads differently.
export function buildHarbourScene(gl, attribs, mats, rng, opts = {}) {
  const water = opts.water !== false;
  const items = [];
  const add = (geo, material, model) => items.push({ mesh: createMesh(gl, attribs, geo.vertices, geo.indices), material, model });

  // Road down the middle (Z axis), quay on each far side, water beyond.
  add(planeGeometry(18, 160, 6), mats.road, M.translation([0, 0.02, 0]));
  add(planeGeometry(40, 160, 5), mats.quay, M.translation([0, 0, 0]));
  // Far flanks: open water at the harbour, paved ground inland.
  if (water) {
    add(planeGeometry(120, 200, 12), mats.water, M.translation([95, -0.4, 0]));
    add(planeGeometry(120, 200, 12), mats.water, M.translation([-95, -0.4, 0]));
  } else {
    add(planeGeometry(120, 200, 9), mats.quay, M.translation([95, -0.05, 0]));
    add(planeGeometry(120, 200, 9), mats.quay, M.translation([-95, -0.05, 0]));
  }

  // Two rows of buildings flanking the road.
  const tints = [mats.facadeA, mats.facadeB, mats.facadeC];
  let z = -70;
  let r = 0;
  while (z < 70) {
    const depth = 14 + rng.float() * 8;
    for (const side of [-1, 1]) {
      const w = 12 + rng.float() * 12;
      const h = 10 + rng.float() * 26;
      const x = side * (12 + depth / 2);
      const rotY = side > 0 ? Math.PI : 0; // face the road
      const geo = boxGeometry(w, h, depth, 11);
      const mat = tints[(r + (side > 0 ? 1 : 0)) % tints.length];
      add(geo, mat, M.trs([x, 0, z + depth / 2], rotY));
      // roof cap
      const roof = boxGeometry(w + 0.6, 0.8, depth + 0.6, 6);
      add(roof, mats.roof, M.translation([x, h, z + depth / 2]));
    }
    z += depth + 3 + rng.float() * 4;
    r++;
  }

  // Props down the quay: crates, lamps, bollards (simple boxes for now).
  for (let i = 0; i < 16; i++) {
    const zz = -60 + i * 8 + rng.float() * 3;
    const side = rng.float() > 0.5 ? 1 : -1;
    const x = side * (10 + rng.float() * 1.5);
    if (rng.float() > 0.5) {
      // crate stack
      const s = 1.4 + rng.float() * 0.6;
      add(boxGeometry(s, s, s, 2), mats.roof, M.translation([x, 0, zz]));
      if (rng.float() > 0.5) add(boxGeometry(s * 0.8, s * 0.8, s * 0.8, 2), mats.roof, M.translation([x + 0.3, s, zz + 0.2]));
    } else {
      // bollard
      add(boxGeometry(0.6, 1.0, 0.6, 1), mats.facadeC, M.translation([x, 0, zz]));
    }
  }

  return { items };
}
