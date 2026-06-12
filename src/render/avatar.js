// The player avatar: a low-poly box figure assembled from a single unit cube
// drawn many times with per-part transforms. Limbs swing from a walk phase so
// the figure reads as a person moving through the harbour, not a mannequin.
// Lit by the main scene shader using flat solid-colour textures.

import { createMesh, createTexture } from "./gl.js";
import { M } from "./mat.js";
import { solidTex } from "./sprites.js";

// Unit cube centered on the origin (1×1×1), CCW outward faces, with normals and
// (unused but format-required) UVs. Scaled per body part via the model matrix.
function unitCube() {
  const h = 0.5, v = [], idx = [];
  let base = 0;
  const face = (c, n) => {
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let i = 0; i < 4; i++) v.push(c[i][0], c[i][1], c[i][2], n[0], n[1], n[2], uv[i][0], uv[i][1]);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  };
  face([[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]], [0, 0, 1]);   // +Z
  face([[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]], [0, 0, -1]); // -Z
  face([[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]], [1, 0, 0]);   // +X
  face([[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]], [-1, 0, 0]); // -X
  face([[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]], [0, 1, 0]);   // +Y
  face([[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]], [0, -1, 0]); // -Y
  return { vertices: new Float32Array(v), indices: new Uint16Array(idx) };
}

const chain = (...mats) => mats.reduce((a, b) => M.multiply(a, b));

// Build the avatar once: one shared cube mesh + solid-colour part textures.
export function buildAvatar(gl, attribs) {
  const cube = createMesh(gl, attribs, ...meshArgs(unitCube()));
  const tex = (hex) => createTexture(gl, solidTex(hex), { repeat: false, flipY: false });
  const skin = tex("#e6b58c");
  const jacket = tex("#2f6f7e");
  const jacketDark = tex("#255a66");
  const pants = tex("#373c47");
  const hair = tex("#241f1c");
  const shoe = tex("#15161b");

  // Static parts: [name, size[w,h,d], center[x,y,z], tex]
  const statics = [
    ["hips", [1.02, 0.62, 0.62], [0, 1.72, 0], pants],
    ["torso", [1.32, 1.52, 0.72], [0, 2.76, 0], jacket],
    ["chest", [1.18, 0.5, 0.6], [0, 2.4, 0.12], jacketDark],
    ["head", [0.82, 0.82, 0.78], [0, 3.95, 0], skin],
    ["hair", [0.9, 0.34, 0.86], [0, 4.3, -0.02], hair],
  ];
  // Swinging limbs: [name, size[w,len,d], pivot[x,y,z], tex, shoe?]
  const limbs = [
    ["legL", [0.5, 1.5, 0.56], [-0.32, 1.5, 0], pants, shoe],
    ["legR", [0.5, 1.5, 0.56], [0.32, 1.5, 0], pants, shoe],
    ["armL", [0.4, 1.46, 0.44], [-0.86, 3.36, 0], jacket, skin],
    ["armR", [0.4, 1.46, 0.44], [0.86, 3.36, 0], jacket, skin],
  ];

  return { cube, statics, limbs };
}

function meshArgs(geo) { return [geo.vertices, geo.indices]; }

// Compute per-part model matrices (relative to the avatar's feet, facing +Z)
// for a given walk phase and swing amplitude. Returns { bobY, parts }.
export function avatarPose(avatar, walkPhase, amp) {
  const s = Math.sin(walkPhase) * amp;
  const swing = { legL: s, legR: -s, armL: -s * 0.9, armR: s * 0.9 };
  const bobY = Math.abs(Math.sin(walkPhase)) * 0.12 * Math.min(amp / 0.7, 1);
  const parts = [];

  for (const [, size, center, tex] of avatar.statics) {
    parts.push({ local: chain(M.translation(center), M.scaling(size)), tex });
  }
  for (const [name, size, pivot, tex, capTex] of avatar.limbs) {
    const [w, len, d] = size;
    const ang = swing[name] || 0;
    // limb hangs below its pivot; rotate about the pivot
    const local = chain(M.translation(pivot), M.rotationX(ang), M.translation([0, -len / 2, 0]), M.scaling([w, len, d]));
    parts.push({ local, tex });
    // foot / hand cap at the far end of the limb
    if (capTex) {
      const capLen = name.startsWith("leg") ? 0.32 : 0.3;
      const capSize = name.startsWith("leg") ? [w + 0.12, capLen, d + 0.34] : [w + 0.04, capLen, d + 0.04];
      const capOff = name.startsWith("leg") ? [0.0, -len + capLen / 2, 0.12] : [0, -len + capLen / 2, 0];
      const cap = chain(M.translation(pivot), M.rotationX(ang), M.translation(capOff), M.scaling(capSize));
      parts.push({ local: cap, tex: capTex });
    }
  }
  return { bobY, parts };
}
