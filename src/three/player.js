// The people of the harbour — a real, rounded body built from smooth capsule and
// sphere primitives (no longer blocky "minecraft" boxes). One builder is shared by
// the player avatar and the ambient citizens. Each figure exposes limb pivots so it
// can stride: legs and arms swing in opposition, with a gentle body bob.
//
// A figure's root Group is positioned/rotated by the caller (the player is driven by
// input; citizens follow a simple path). `update(dt, speed)` animates the gait.

import * as THREE from "three";

const PALETTES = {
  player:   { coat: 0x2f9e8f, legs: 0x26303a, skin: 0xdda982, hair: 0x2b2118, shoe: 0x17171c },
  vendor:   { coat: 0xc8543b, legs: 0x3a2d24, skin: 0xe0b48c, hair: 0x161210, shoe: 0x241712 },
  worker:   { coat: 0xd9a13a, legs: 0x2c343d, skin: 0xc98f63, hair: 0x20160f, shoe: 0x191515 },
  commuter: { coat: 0x4b6c9a, legs: 0x222831, skin: 0xe7c3a0, hair: 0x35251a, shoe: 0x14161b },
  elder:    { coat: 0x7d7f88, legs: 0x303338, skin: 0xd8b48f, hair: 0xb9bcc4, shoe: 0x1b1c1f },
};

// spr-001 — the player (and ONLY the player) is dressed in painted PBR cloth & skin
// instead of flat block colour; the rounded geometry hero stays geometry, these maps
// just skin its surfaces. Each material STARTS as the flat palette colour (exactly the
// fallback look) and "dresses" into the painted maps once they load — so a slow or
// missing texture degrades gracefully to flat, never to black. The albedo carries the
// garment's own colour, so the base tint flips to white the instant it lands. The maps
// are seamless/tileable, so RepeatWrapping wraps cloth and skin around the capsules.
const _ptex = new THREE.TextureLoader();
const PLAYER_TEX = "./assets/textures/player/";

function playerSkin(object, tint, repeat = [1, 1]) {
  const mat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.85, metalness: 0.0 });
  const wrap = (t, srgb) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
  };
  _ptex.load(`${PLAYER_TEX}CHAR_Player_${object}_albedo.png`, (t) => {
    wrap(t, true); mat.map = t; mat.color.setHex(0xffffff); mat.needsUpdate = true;
  });
  _ptex.load(`${PLAYER_TEX}CHAR_Player_${object}_normal.png`, (t) => {
    wrap(t, false); mat.normalMap = t; mat.needsUpdate = true;
  });
  _ptex.load(`${PLAYER_TEX}CHAR_Player_${object}_orm.png`, (t) => {
    wrap(t, false); mat.roughnessMap = t; mat.metalnessMap = t;
    mat.roughness = 1; mat.metalness = 1; mat.needsUpdate = true;
  });
  return mat;
}

function flatMat(color, rough = 0.82) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0 });
}

function mesh(geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// A single rounded limb (capsule) hung from a joint pivot at its top, swinging the
// whole limb when the pivot rotates. `total` is joint-to-tip length; the capsule's
// rounded ends read as shoulder/hip and wrist/ankle without extra geometry.
function capsuleLimb(total, radius, material) {
  const len = Math.max(0.02, total - 2 * radius);
  const m = mesh(new THREE.CapsuleGeometry(radius, len, 6, 14), material);
  m.position.y = -total / 2; // top of the capsule sits at the pivot (y=0)
  return m;
}

// Skeleton heights (metres) — preserved from the original figure so world placement,
// camera framing and contact with the ground all stay exactly as before.
const HIP_Y = 0.82;
const SHOULDER_Y = 1.46;

export function createFigure(kind = "player") {
  const p = PALETTES[kind] ?? PALETTES.commuter;
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs vertically without moving the root
  root.add(body);

  // Only the hero is painted (spr-001); ambient citizens stay flat block colour —
  // lighter to draw, and visually distinct so the player reads apart from the crowd.
  // One shared material per garment family (coat → torso + arms, trouser → pelvis +
  // legs, skin → head + neck + hands) keeps it to three texture uploads per figure.
  const dressed = kind === "player";
  const coatMat = dressed ? playerSkin("Coat", p.coat) : flatMat(p.coat);
  const trouserMat = dressed ? playerSkin("Trouser", p.legs) : flatMat(p.legs);
  const skinMat = dressed ? playerSkin("Skin", p.skin) : flatMat(p.skin, 0.78);
  const hairMat = flatMat(p.hair, 0.7);
  const shoeMat = flatMat(p.shoe, 0.6);

  // Torso — a capsule flattened front-to-back and broadened at the shoulders so the
  // silhouette reads as a chest, not a barrel.
  const torso = mesh(new THREE.CapsuleGeometry(0.19, 0.4, 6, 18), coatMat);
  torso.scale.set(1.16, 1.0, 0.66);
  torso.position.y = HIP_Y + 0.34;
  body.add(torso);

  // Pelvis — a smaller flattened capsule bridging hips to torso.
  const pelvis = mesh(new THREE.CapsuleGeometry(0.155, 0.12, 5, 16), trouserMat);
  pelvis.scale.set(1.12, 1.0, 0.72);
  pelvis.position.y = HIP_Y + 0.05;
  body.add(pelvis);

  // Rounded shoulders smooth the arm-to-torso join.
  for (const sx of [-0.24, 0.24]) {
    const sh = mesh(new THREE.SphereGeometry(0.1, 14, 12), coatMat);
    sh.position.set(sx, SHOULDER_Y, 0);
    body.add(sh);
  }

  // Neck + head (a faintly egg-shaped sphere) + a hair cap that leaves the face open.
  const neck = mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.12, 12), skinMat);
  neck.position.y = SHOULDER_Y + 0.07;
  body.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.145, 20, 18), skinMat);
  head.scale.set(0.92, 1.08, 1.0);
  head.position.y = SHOULDER_Y + 0.3;
  body.add(head);

  const hair = mesh(
    new THREE.SphereGeometry(0.153, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat,
  );
  hair.scale.set(0.97, 1.05, 1.02);
  hair.position.y = SHOULDER_Y + 0.31;
  body.add(hair);

  // Legs — capsules from the hip, each ending in a boot toed forward.
  function makeLeg(x) {
    const pivot = new THREE.Object3D();
    pivot.position.set(x, HIP_Y, 0);
    pivot.add(capsuleLimb(0.78, 0.088, trouserMat));
    const boot = mesh(new THREE.BoxGeometry(0.13, 0.085, 0.27), shoeMat);
    boot.position.set(0, -0.76, 0.05);
    pivot.add(boot);
    return pivot;
  }
  // Arms — slimmer capsules from the shoulder, each ending in a hand; angled a touch
  // outward so they clear the torso through the stride.
  function makeArm(x) {
    const pivot = new THREE.Object3D();
    pivot.position.set(x, SHOULDER_Y, 0);
    pivot.rotation.z = x < 0 ? 0.09 : -0.09;
    pivot.add(capsuleLimb(0.62, 0.06, coatMat));
    const hand = mesh(new THREE.SphereGeometry(0.055, 12, 10), skinMat);
    hand.position.y = -0.6;
    pivot.add(hand);
    return pivot;
  }

  const legL = makeLeg(-0.1);
  const legR = makeLeg(0.1);
  const armL = makeArm(-0.27);
  const armR = makeArm(0.27);
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
