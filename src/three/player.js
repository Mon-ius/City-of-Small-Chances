// Low-poly inhabitants of the harbour, built from boxes — one builder shared by
// the player avatar and the ambient citizens. Each figure exposes limb pivots so
// it can stride: legs and arms swing in opposition, with a gentle body bob.
//
// A figure's root Group is positioned/rotated by the caller (the player is driven
// by input; citizens follow a simple path). `update(dt, speed)` animates the gait.

import * as THREE from "three";

const PALETTES = {
  player:   { coat: 0x2f9e8f, legs: 0x26303a, skin: 0xdda982, hair: 0x2b2118 },
  vendor:   { coat: 0xc8543b, legs: 0x3a2d24, skin: 0xe0b48c, hair: 0x161210 },
  worker:   { coat: 0xd9a13a, legs: 0x2c343d, skin: 0xc98f63, hair: 0x20160f },
  commuter: { coat: 0x4b6c9a, legs: 0x222831, skin: 0xe7c3a0, hair: 0x35251a },
  elder:    { coat: 0x7d7f88, legs: 0x303338, skin: 0xd8b48f, hair: 0xb9bcc4 },
};

function box(w, h, d, color, rough = 0.85) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A limb hangs from a pivot placed at the joint, so rotating the pivot swings it.
function limb(w, h, d, color, jointY, x) {
  const pivot = new THREE.Object3D();
  pivot.position.set(x, jointY, 0);
  const mesh = box(w, h, d, color);
  mesh.position.y = -h / 2; // hang below the joint
  pivot.add(mesh);
  return pivot;
}

export function createFigure(kind = "player") {
  const p = PALETTES[kind] ?? PALETTES.commuter;
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs vertically without moving the root
  root.add(body);

  const hipY = 0.82;
  const shoulderY = 1.46;

  const torso = box(0.42, 0.66, 0.26, p.coat);
  torso.position.y = hipY + 0.33;
  body.add(torso);

  const hips = box(0.4, 0.18, 0.26, p.legs);
  hips.position.y = hipY + 0.02;
  body.add(hips);

  const neck = box(0.12, 0.08, 0.12, p.skin);
  neck.position.y = shoulderY + 0.12;
  body.add(neck);

  const head = box(0.28, 0.3, 0.27, p.skin);
  head.position.y = shoulderY + 0.33;
  body.add(head);

  const hair = box(0.3, 0.12, 0.29, p.hair);
  hair.position.y = shoulderY + 0.5;
  body.add(hair);

  const legL = limb(0.16, 0.8, 0.18, p.legs, hipY, -0.11);
  const legR = limb(0.16, 0.8, 0.18, p.legs, hipY, 0.11);
  const armL = limb(0.12, 0.62, 0.13, p.coat, shoulderY, -0.29);
  const armR = limb(0.12, 0.62, 0.13, p.coat, shoulderY, 0.29);
  body.add(legL, legR, armL, armR);

  const figure = {
    root,
    body,
    legL, legR, armL, armR,
    _phase: 0,
    update(dt, speed = 0) {
      const moving = speed > 0.05;
      // Stride frequency scales with speed; amplitude eases in when moving.
      this._phase += dt * (moving ? 7.5 : 2.2);
      const amp = moving ? 0.7 : 0.04;
      const s = Math.sin(this._phase) * amp;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      armL.rotation.x = -s * 0.8;
      armR.rotation.x = s * 0.8;
      // Body bob: twice per stride when walking, a faint breath when idle.
      body.position.y = moving ? Math.abs(Math.sin(this._phase)) * 0.06 : Math.sin(this._phase) * 0.01;
    },
  };
  return figure;
}
