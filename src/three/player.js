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

// ── The standing cast's looks (spr-004). The four walking citizens keep the five
// PALETTES above; the 40 standing roles + 4 named locals each get a muted period
// palette so the quay reads as a whole society — a constable in navy, a priest in
// cassock black, a lady in plum, a soot-black sweep, children scaled down — rather
// than forty identical bodies. A look is { coat, legs, skin, hair, shoe, scale };
// `resolveLook` accepts a look object, a LOOKS key, a PALETTES key, or falls back to
// commuter. Shared skin/hair tones keep the table terse and the crowd coherent.
const SKIN = { pale: 0xe7c3a0, fair: 0xdcb78f, warm: 0xd0a070, tan: 0xc28a5a, deep: 0xab754a };
const HAIR = { black: 0x161210, brown: 0x33241a, grey: 0x9b9a96, white: 0xcfcfca, sandy: 0x6e5436, auburn: 0x4a2a1c };

// L(coat, legs, skin, hair, shoe?, scale?) — terse row builder for the table below.
function L(coat, legs, skin, hair, shoe = 0x1a1713, scale = 1) {
  return { coat, legs, skin, hair, shoe, scale };
}

const LOOKS = {
  // Quayside trades & the working poor.
  Fisher:        L(0x37618a, 0x2b3540, SKIN.tan,  HAIR.brown,  0x20262c),
  DockWorker:    L(0x6a5d49, 0x39342b, SKIN.warm, HAIR.black,  0x241f18, 1.04),
  MarketVendor:  L(0xb5462f, 0x3a2d24, SKIN.warm, HAIR.black),
  Sailor:        L(0x2a3b66, 0x6f7682, SKIN.tan,  HAIR.brown,  0x20242c),
  Porter:        L(0x6b5a44, 0x342d24, SKIN.warm, HAIR.black,  0x231d16, 1.05),
  Washerwoman:   L(0x86736a, 0x4a4038, SKIN.warm, HAIR.grey,   0x2a241f, 0.95),
  Fisherman:     L(0x8a7a3e, 0x3a3424, SKIN.tan,  HAIR.grey,   0x2b2619),
  Fishwife:      L(0x9a5240, 0x46352c, SKIN.tan,  HAIR.brown,  0x2a221c, 0.96),
  Ferryman:      L(0x3a5560, 0x2a3236, SKIN.tan,  HAIR.grey,   0x20262a, 1.02),
  Lamplighter:   L(0x4a4030, 0x2e2920, SKIN.warm, HAIR.black,  0x201c15),
  Innkeeper:     L(0x7a4a3a, 0x3a2d26, SKIN.warm, HAIR.grey,   0x281f18, 1.05),
  Blacksmith:    L(0x4d3526, 0x2e241c, SKIN.deep, HAIR.black,  0x1f1812, 1.06),
  Baker:         L(0xcfc6b4, 0x8c8576, SKIN.warm, HAIR.brown,  0x4a4338),
  Tinker:        L(0x6a5a3a, 0x3a3226, SKIN.tan,  HAIR.grey,   0x2a2419),
  Knifegrinder:  L(0x5a4a38, 0x342c22, SKIN.warm, HAIR.grey,   0x241e16),
  Coalman:       L(0x2a2622, 0x201d19, SKIN.deep, HAIR.black,  0x16130f, 1.04),
  Sweep:         L(0x26231f, 0x201d1a, SKIN.tan,  HAIR.black,  0x14110d, 0.95),
  Dockmaster:    L(0x394a5a, 0x262d34, SKIN.pale, HAIR.grey,   0x20242a, 1.02),
  // The genteel & the official.
  Merchant:      L(0x35302c, 0x2a2622, SKIN.pale, HAIR.grey,   0x1d1915, 1.02),
  Lady:          L(0x6d3b5e, 0x4a2c40, SKIN.pale, HAIR.brown,  0x2a1f26, 0.97),
  Constable:     L(0x1f2a44, 0x1b2236, SKIN.fair, HAIR.black,  0x14161f, 1.03),
  Clerk:         L(0x33384a, 0x23262f, SKIN.pale, HAIR.brown,  0x191b22),
  Priest:        L(0x16171c, 0x141418, SKIN.pale, HAIR.grey,   0x0f1013, 1.01),
  Doctor:        L(0x2c2f34, 0x222428, SKIN.pale, HAIR.brown,  0x17181b),
  Nun:           L(0x1c1c20, 0x18181c, SKIN.pale, HAIR.black,  0x121215, 0.98),
  Schoolmistress:L(0x3a3548, 0x2a2832, SKIN.pale, HAIR.brown,  0x1d1c24, 0.96),
  Soldier:       L(0x7c2b24, 0x2a2d3a, SKIN.fair, HAIR.brown,  0x161820, 1.03),
  Veteran:       L(0x4a4d3a, 0x2e3026, SKIN.warm, HAIR.grey,   0x1f201a),
  TownCrier:     L(0x9a4632, 0x33302a, SKIN.fair, HAIR.grey,   0x23201b, 1.02),
  Musician:      L(0x7a5a2e, 0x3a3026, SKIN.warm, HAIR.brown,  0x261f17),
  // The hard-pressed, the old, the young.
  Beggar:        L(0x6b6258, 0x44403a, SKIN.tan,  HAIR.grey,   0x2a2620, 0.96),
  Widow:         L(0x1c1b1f, 0x18171b, SKIN.pale, HAIR.grey,   0x121116, 0.94),
  OldWoman:      L(0x5d5560, 0x37333a, SKIN.pale, HAIR.white,  0x232026, 0.90),
  Elder:         L(0x7d7f88, 0x303338, SKIN.pale, HAIR.white,  0x1b1c1f, 0.97),
  Mother:        L(0x7e6a52, 0x44392c, SKIN.fair, HAIR.brown,  0x2a241c, 0.97),
  Commuter:      L(0x4b6c9a, 0x222831, SKIN.pale, HAIR.brown,  0x14161b),
  Youth:         L(0x5a8a6b, 0x2e3640, SKIN.fair, HAIR.sandy,  0x1c1f24, 0.92),
  FlowerGirl:    L(0xb07a86, 0x52414a, SKIN.fair, HAIR.auburn, 0x2c232a, 0.80),
  Child:         L(0x9c7b3f, 0x47402f, SKIN.fair, HAIR.brown,  0x2a2519, 0.70),
  Urchin:        L(0x6f6450, 0x423b30, SKIN.tan,  HAIR.brown,  0x281f18, 0.68),
  // The named locals you also meet in the talk panel (Batch 22) — dressed to their role.
  Mei:           L(0xb5462f, 0x3a2d24, 0xe2b98f, HAIR.black,   0x281712, 0.97),
  Tomo:          L(0x39434f, 0x2a3038, SKIN.warm, HAIR.black,  0x1c1f24),
  Jun:           L(0x3a6b4b, 0x2a3228, SKIN.fair, HAIR.black,  0x1a2018, 0.98),
  Rafiq:         L(0x6a4a2e, 0x352a1e, SKIN.deep, HAIR.black,  0x241c14, 1.05),
};

// Headwear by role (spr-005): [type] or [type, feltColour]; buildHat turns it into
// geometry on the crown. Bare-headed roles (vendor, musician, beggar, youth, child,
// the player) are simply omitted, which itself reads as a class tell. Stamped onto the
// LOOKS rows below so a look stays a single flat object the figure builder consumes.
const ROLE_HAT = {
  // Tall hats — the genteel & the officials.
  Merchant: ["top"], Commuter: ["top", 0x21242c], Clerk: ["top", 0x21242c],
  Dockmaster: ["top", 0x222a30], Doctor: ["top", 0x1a1b1f], TownCrier: ["top", 0x2a2520],
  // Domed helmets — the law & the army.
  Constable: ["helmet", 0x141821], Soldier: ["helmet", 0x20231a],
  // Flat caps — the working men.
  DockWorker: ["cap", 0x33302a], Porter: ["cap", 0x322c24], Fisher: ["cap", 0x222a30],
  Coalman: ["cap", 0x15120f], Sailor: ["cap", 0x20242c], Lamplighter: ["cap", 0x2a2419],
  Knifegrinder: ["cap", 0x2c241a], Tinker: ["cap", 0x33301f], Ferryman: ["cap", 0x222a2c],
  Innkeeper: ["cap", 0x2e231b], Urchin: ["cap", 0x3a342a], Veteran: ["cap", 0x35372a],
  Blacksmith: ["cap", 0x241c14], Sweep: ["cap", 0x161310], Elder: ["cap", 0x3a3b3e],
  // Bonnets — the women of the town.
  Lady: ["bonnet", 0x4a2c40], FlowerGirl: ["bonnet", 0x6a5560], Mother: ["bonnet", 0x44392c],
  OldWoman: ["bonnet", 0x37333a], Widow: ["bonnet", 0x121116], Schoolmistress: ["bonnet", 0x2a2832],
  // Kerchiefs — the quayside women at work.
  Washerwoman: ["scarf", 0x7a6a4a], Fishwife: ["scarf", 0x8a4636],
  // Wide brims — the weatherbeaten & the clergy.
  Fisherman: ["brim", 0x6e5e2e], Priest: ["brim", 0x111215], Nun: ["brim", 0x18181c],
  Baker: ["brim", 0xd8d2c4],
  // Named locals.
  Mei: ["scarf", 0x8a3526], Tomo: ["cap", 0x2a3038], Jun: ["cap", 0x223026], Rafiq: ["cap", 0x352a1e],
};
for (const [role, [type, colour]] of Object.entries(ROLE_HAT)) {
  const lk = LOOKS[role];
  if (!lk) continue;
  lk.hat = type;
  if (colour !== undefined) lk.hatColor = colour;
}

// Carried props by role (spr-006) — a second trade tell, in the hands rather than on the
// head. Stamped onto the LOOKS rows like the hats; buildProp turns the keyword into held
// geometry. Most roles carry nothing (the empty-handed are the majority of any crowd).
const ROLE_PROP = {
  Elder: "cane", Veteran: "cane", Beggar: "cane", OldWoman: "cane",
  Lamplighter: "pole", Ferryman: "staff", Fisherman: "staff",
  Fishwife: "basket", FlowerGirl: "basket", MarketVendor: "basket",
  Priest: "book", Clerk: "book", Schoolmistress: "book", Nun: "book",
  Porter: "sack", Coalman: "sack", Tinker: "sack",
  // The named cast carry their own trade tells (spr-016). Rafiq the foreman stays
  // empty-handed so he keeps a foreman's clasped/behind-the-back idle stance.
  Mei: "ladle", Tomo: "wrench", Jun: "book",
};
for (const [role, prop] of Object.entries(ROLE_PROP)) {
  if (LOOKS[role]) LOOKS[role].prop = prop;
}

// Per-role body build (spr-007): girth & breadth, separate from the uniform `scale`
// (height). >1 reads burly — the men of muscle and the well-fed; <1 reads slight — the
// young, the frail, the genteel-thin. Default 1. Stamped onto the LOOKS rows; a body
// without an entry keeps the ordinary frame.
const ROLE_BUILD = {
  // Broad, heavy-set.
  Blacksmith: 1.3, Porter: 1.24, Coalman: 1.2, Innkeeper: 1.22, Tinker: 1.12,
  DockWorker: 1.14, Ferryman: 1.1, Fisherman: 1.08, Constable: 1.12, Soldier: 1.1,
  Sailor: 1.06, Veteran: 1.05, Dockmaster: 1.06, Merchant: 1.08,
  // Slight, narrow.
  Child: 0.9, Urchin: 0.86, FlowerGirl: 0.84, Youth: 0.92, Lady: 0.9, Beggar: 0.9,
  OldWoman: 0.88, Widow: 0.9, Elder: 0.92, Clerk: 0.94, Schoolmistress: 0.92,
  Nun: 0.94, Washerwoman: 0.96, Mei: 0.94,
};
for (const [role, build] of Object.entries(ROLE_BUILD)) {
  if (LOOKS[role]) LOOKS[role].build = build;
}

function resolveLook(look) {
  if (look && typeof look === "object") return look;
  return LOOKS[look] || PALETTES[look] || PALETTES.commuter;
}

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
const HEAD_Y = SHOULDER_Y + 0.3;   // head centre
const HEAD_TOP = HEAD_Y + 0.12;    // roughly where a hat rests on the crown

const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };

// Per-role headwear (spr-005) — the single most legible role cue now that every body
// shares one capsule silhouette. A few cheap primitives parented onto the crown: a
// gentleman's top hat, a working flat cap, a woman's bonnet, a wide clergy/sun brim,
// a domed constable helmet, a kerchief. Returns a Group, or null for the bare-headed.
// `mat` is the caller's felt (a near-black by default) so colour still carries class.
function buildHat(type, mat) {
  const g = new THREE.Group();
  if (type === "top") {                         // gentleman's tall hat
    g.add(at(mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 20), mat), 0, HEAD_TOP + 0.005, 0));
    g.add(at(mesh(new THREE.CylinderGeometry(0.125, 0.135, 0.24, 20), mat), 0, HEAD_TOP + 0.13, 0));
  } else if (type === "cap") {                  // working man's flat cap: low dome + peak
    const dome = mesh(new THREE.SphereGeometry(0.162, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    dome.scale.set(1.05, 0.7, 1.1); g.add(at(dome, 0, HEAD_TOP - 0.02, 0));
    g.add(at(mesh(new THREE.BoxGeometry(0.21, 0.02, 0.11), mat), 0, HEAD_TOP - 0.05, 0.15));
  } else if (type === "bonnet") {               // woman's bonnet: shell over back & crown
    const shell = mesh(new THREE.SphereGeometry(0.172, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), mat);
    shell.scale.set(1.02, 1.06, 1.12); shell.rotation.x = 0.16; g.add(at(shell, 0, HEAD_Y + 0.04, -0.02));
  } else if (type === "brim") {                 // wide-brim sun / clergy hat
    g.add(at(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.016, 22), mat), 0, HEAD_TOP - 0.01, 0));
    const crown = mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat);
    crown.scale.set(1, 0.78, 1); g.add(at(crown, 0, HEAD_TOP - 0.01, 0));
  } else if (type === "helmet") {               // domed constable / garrison helmet
    const dome = mesh(new THREE.SphereGeometry(0.166, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.64), mat);
    dome.scale.set(1.02, 1.2, 1.02); g.add(at(dome, 0, HEAD_Y + 0.05, 0));
    g.add(at(mesh(new THREE.SphereGeometry(0.028, 8, 8), mat), 0, HEAD_TOP + 0.16, 0));
  } else if (type === "scarf") {                // quayside woman's headscarf / kerchief
    const shell = mesh(new THREE.SphereGeometry(0.166, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mat);
    shell.scale.set(1.06, 0.98, 1.08); g.add(at(shell, 0, HEAD_Y + 0.03, -0.01));
  } else {
    return null;
  }
  return g;
}

// A few carried role props (spr-006): cheap held geometry that names a trade at sight —
// a cane, a lamplighter's pole, a market basket, a ledger, a porter's sack, a ferryman's
// staff. Built in body-local space and added to `body`, so a prop rides the breath but
// not the arm-swing — right for a standing figure resting the item against itself or the
// ground. Returns a Group, or null. Props are dark/wood/wicker, lit like the rest.
const woodMat = () => flatMat(0x5a4326, 0.7);
const wickerMat = () => flatMat(0xb08544, 0.82);
function buildProp(type) {
  const g = new THREE.Group();
  if (type === "cane") {                         // a walking cane to the ground
    const shaft = mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.95, 8), woodMat());
    shaft.rotation.x = -0.07; g.add(at(shaft, 0.33, 0.49, 0.12));
    g.add(at(mesh(new THREE.SphereGeometry(0.034, 10, 8), woodMat()), 0.32, 0.97, 0.1));
  } else if (type === "pole") {                  // lamplighter's long pole, lamp above head
    const shaft = mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.0, 8), woodMat());
    shaft.rotation.x = -0.14; g.add(at(shaft, 0.3, 1.15, 0.18));
    g.add(at(mesh(new THREE.SphereGeometry(0.05, 10, 8), flatMat(0xd9a13a, 0.45)), 0.36, 2.08, -0.02));
  } else if (type === "staff") {                 // ferryman's oar / boat-staff with a blade
    const shaft = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.7, 8), woodMat());
    shaft.rotation.x = 0.2; g.add(at(shaft, 0.32, 0.92, 0.16));
    const blade = mesh(new THREE.BoxGeometry(0.12, 0.34, 0.02), woodMat());
    blade.rotation.x = 0.2; g.add(at(blade, 0.28, 0.16, 0.33));
  } else if (type === "basket") {                // market basket carried at the waist
    const bowl = mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.18, 14, 1, true), wickerMat());
    g.add(at(bowl, 0, 0.98, 0.30));
    g.add(at(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), wickerMat()), 0, 0.89, 0.30));
    const handle = mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 14, Math.PI), wickerMat());
    g.add(at(handle, 0, 1.07, 0.30));
  } else if (type === "book") {                  // an open ledger at the chest, a page turning (spr-030)
    const cover = flatMat(0x4a2e22, 0.6);        // dark board
    const paper = flatMat(0xcabf9e, 0.85);       // aged leaves
    const tilt = new THREE.Group();              // the whole ledger tilts its open face up to the reader
    tilt.rotation.x = -0.8;
    tilt.add(at(mesh(new THREE.BoxGeometry(0.30, 0.22, 0.025), cover), 0, 0, -0.014)); // boards beneath
    tilt.add(mesh(new THREE.BoxGeometry(0.28, 0.20, 0.012), paper));                   // the spread of pages
    const leaf = new THREE.Group();              // one sheet, hinged at the central spine (x=0)
    leaf.position.z = 0.012;
    leaf.add(at(mesh(new THREE.BoxGeometry(0.135, 0.185, 0.003), paper), 0.0675, 0, 0)); // lies over the right page
    tilt.add(leaf);
    g.add(at(tilt, -0.02, 1.3, 0.22));
    g.userData.leaf = leaf; g.userData.anim = "read";   // the leaf flips in place (no grip → ledger stays planted)
  } else if (type === "sack") {                  // a porter's sack hoisted on the shoulder
    // Pale hemp (not the coat brown — a same-colour sack vanishes into the porter's coat),
    // sat high beside the shoulder and a touch forward so it reads from the front.
    const s = mesh(new THREE.SphereGeometry(0.2, 12, 10), flatMat(0x9c8a5f, 0.92));
    s.scale.set(0.96, 1.3, 0.85); s.rotation.z = 0.26; g.add(at(s, 0.25, 1.68, 0.02));
  } else if (type === "ladle") {                 // a noodle-seller's ladle, lifted at the hip
    const steel = flatMat(0x9aa0a8, 0.4);
    const handle = mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.52, 8), woodMat());
    handle.rotation.x = -0.55; g.add(at(handle, 0.27, 1.0, 0.17));        // top toward the hand
    const bowl = mesh(new THREE.SphereGeometry(0.075, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), steel);
    bowl.scale.set(1, 0.7, 1); g.add(at(bowl, 0.33, 0.76, 0.31));         // shallow cup, mouth up
    g.userData.grip = [0.27, 1.0, 0.17]; g.userData.anim = "stir";        // worked at the hand (spr-019)
  } else if (type === "wrench") {                 // a quay mechanic's spanner, held at the side
    const steel = flatMat(0x6b7178, 0.42);
    const shaft = mesh(new THREE.BoxGeometry(0.035, 0.34, 0.022), steel);
    shaft.rotation.x = 0.12; g.add(at(shaft, 0.3, 0.82, 0.12));
    const jaw = mesh(new THREE.TorusGeometry(0.052, 0.017, 6, 14, Math.PI * 1.35), steel); // open C-jaw
    jaw.rotation.z = -0.4; g.add(at(jaw, 0.3, 1.0, 0.13));
    g.userData.grip = [0.3, 0.9, 0.12]; g.userData.anim = "turn";         // cranked at the shaft (spr-019)
  } else {
    return null;
  }
  return g;
}

// `look` is the appearance: "player" (the painted hero), a PALETTES key (the four
// walking citizens), a LOOKS key (the 40 standing roles + 4 named locals), or a raw
// look object. `opts.castShadow:false` skips real shadow casting (the standing crowd
// uses cheap contact-blobs instead, so 44 extra bodies don't bloat the shadow map).
export function createFigure(look = "player", opts = {}) {
  const p = resolveLook(look);
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs vertically without moving the root
  root.add(body);

  // Only the hero is painted (spr-001); every other body stays flat block colour —
  // lighter to draw, and visually distinct so the player reads apart from the crowd.
  // One shared material per garment family (coat → torso + arms, trouser → pelvis +
  // legs, skin → head + neck + hands) keeps it to three texture uploads per figure.
  const dressed = look === "player";
  const coatMat = dressed ? playerSkin("Coat", p.coat) : flatMat(p.coat);
  const trouserMat = dressed ? playerSkin("Trouser", p.legs) : flatMat(p.legs);
  const skinMat = dressed ? playerSkin("Skin", p.skin) : flatMat(p.skin, 0.78);
  const hairMat = flatMat(p.hair, 0.7);
  const shoeMat = flatMat(p.shoe, 0.6);

  // Per-role build (spr-007): girth & breadth, separate from the uniform `scale`
  // (height). >1 reads burly — the men of muscle and the well-fed; <1 reads slight —
  // the young, the frail, the genteel-thin. `spread` widens the shoulder/limb stance
  // with the body so a broad frame plants its arms wider, not just thicker.
  const build = p.build ?? 1;
  const spread = 0.55 + 0.45 * build;

  // Torso — a capsule flattened front-to-back and broadened at the shoulders so the
  // silhouette reads as a chest, not a barrel.
  const torso = mesh(new THREE.CapsuleGeometry(0.19, 0.4, 6, 18), coatMat);
  torso.scale.set(1.16 * build, 1.0, 0.66 * build);
  torso.position.y = HIP_Y + 0.34;
  body.add(torso);

  // Pelvis — a smaller flattened capsule bridging hips to torso.
  const pelvis = mesh(new THREE.CapsuleGeometry(0.155, 0.12, 5, 16), trouserMat);
  pelvis.scale.set(1.12 * build, 1.0, 0.72 * build);
  pelvis.position.y = HIP_Y + 0.05;
  body.add(pelvis);

  // Rounded shoulders smooth the arm-to-torso join.
  for (const sx of [-0.24, 0.24]) {
    const sh = mesh(new THREE.SphereGeometry(0.1 * build, 14, 12), coatMat);
    sh.position.set(sx * spread, SHOULDER_Y, 0);
    body.add(sh);
  }

  // Neck stays on the torso; head, hair and hat ride a head pivot at the base of the
  // neck so an idle figure can slowly turn its gaze (spr-008) without the body following.
  const neck = mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.12, 12), skinMat);
  neck.position.y = SHOULDER_Y + 0.07;
  body.add(neck);

  const headBaseY = SHOULDER_Y + 0.18;          // pivot sits at the base of the neck
  const headPivot = new THREE.Group();
  headPivot.position.y = headBaseY;
  body.add(headPivot);

  const head = mesh(new THREE.SphereGeometry(0.145, 20, 18), skinMat);
  head.scale.set(0.92, 1.08, 1.0);
  head.position.y = SHOULDER_Y + 0.3 - headBaseY;
  headPivot.add(head);

  const hair = mesh(
    new THREE.SphereGeometry(0.153, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
    hairMat,
  );
  hair.scale.set(0.97, 1.05, 1.02);
  hair.position.y = SHOULDER_Y + 0.31 - headBaseY;
  headPivot.add(hair);

  // Headwear — the clearest role tell now that every body shares one silhouette
  // (spr-005). Rides the head pivot so it turns with the gaze. Player stays bare-headed.
  if (p.hat) {
    const hat = buildHat(p.hat, flatMat(p.hatColor ?? 0x17140f, 0.72));
    if (hat) { hat.position.y -= headBaseY; headPivot.add(hat); }
  }

  // Carried prop — a trade tell in the hands (spr-006). Rides the breath, not the swing.
  // A worked tool (one with a userData.grip) hangs from a pivot at the grip so it can be
  // stirred or cranked about the hand without the whole tool swinging from the feet (spr-019).
  let propPivot = null, propAnim = null, propLeaf = null;
  if (p.prop) {
    const prop = buildProp(p.prop);
    if (prop) {
      prop.name = "prop:" + p.prop;
      if (prop.userData.grip) {
        const [gx, gy, gz] = prop.userData.grip;
        const pivot = new THREE.Group();
        pivot.name = prop.name;
        pivot.position.set(gx, gy, gz);     // pivot sits at the hand
        prop.position.set(-gx, -gy, -gz);   // counter-offset → meshes stay exactly where they were
        pivot.add(prop);
        body.add(pivot);
        propPivot = pivot; propAnim = prop.userData.anim || null;
      } else {
        body.add(prop);
        // A planted prop (no grip) can still work a moving part of itself — the ledger's
        // turning leaf (spr-030). The figure stays still; only the page sweeps.
        propLeaf = prop.userData.leaf || null;
        propAnim = prop.userData.anim || null;
      }
    }
  }

  // Limb girth tracks build, but gently (0.7 + 0.3·build) — a smith's legs thicken,
  // they don't double — while arm girth tracks build directly for a fuller sleeve.
  const legR0 = 0.088 * (0.7 + 0.3 * build);
  const armR0 = 0.06 * build;

  // Idle stance (spr-008): the standing crowd (seed > 0) rests in one of three poses —
  // arms at the side, hands clasped in front, or hands held behind the back — so they no
  // longer all stand to attention. Prop-carriers keep arms at the side so the held item
  // reads clean. Walkers and the player (seed 0) are always stance 0, i.e. unchanged.
  const seed = opts.seed ?? 0;
  const seated = opts.seated === true;   // perched on a wall, legs dangling (spr-031)
  const benched = opts.benched === true; // sat back on a bench, legs raked to the floor (spr-065)
  const leaning = opts.leaning === true; // loafing back against a wall, feet planted (spr-066)
  const gazing = opts.gazing === true;   // tipped forward over the sea-wall rail, watching the water (spr-067)
  const mending = opts.mending === true; // seated, bowed over the lap, working a net through the hands (spr-068)
  const scrubbing = opts.scrubbing === true; // standing, bent over a washtub, scrubbing cloth on a board (spr-069)
  const warming = opts.warming === true; // stood at the brazier, hands held forward over the coals (spr-070)
  const hailing = opts.hailing === true; // at the sea-wall, one arm flung up hailing a boat (spr-071)
  const scattering = opts.scattering === true; // folded deep at the hips, flicking crumbs to the flock (spr-072)
  const stretching = opts.stretching === true; // both arms flung up overhead, an end-of-shift stretch (spr-073)
  const pointing = opts.pointing === true; // one arm thrown out level, head tracking it, showing the way (spr-074)
  const catching = opts.catching === true; // bent over near-straight legs, hands braced on the thighs, head up — winded (spr-075)
  const grounded = opts.grounded === true; // sat down on the bare cobbles, legs stretched out flat, hands on the thighs (spr-076)
  const casting = opts.casting === true;   // at the sea-wall, both hands on a rod, a line dropped over the water (spr-077)
  const portering = opts.portering === true; // a load balanced on the crown, both arms up and inboard steadying it (spr-078)
  const watching = opts.watching === true; // at ease on watch, both arms swept back, hands clasped behind the spine (spr-079)
  const shading = opts.shading === true; // at the sea-wall, chin tipped UP and one flat hand thrown up as a brow-visor, peering out past the low sun (spr-080)
  const bowing = opts.bowing === true;   // folded forward from the hips in a deferent doffing bow, head dropped low, both arms hanging slack and clear of the thighs (spr-081)
  const glancing = opts.glancing === true; // halted mid-quay, head twisted hard back over one shoulder at a shout from behind, body squared forward, arms hanging easy (spr-082)
  const listening = opts.listening === true; // stood at a slight angle, head CANTED hard to one cocked ear and held there, arms hanging slack — caught listening to something off to the side (spr-083)
  const craning = opts.craning === true; // chin craned hard UP to follow the gulls over the rigging, both arms hanging slack — an open upward stare, no shading hand (spr-084)
  const counting = opts.counting === true; // a vendor counting coins, trickling them between two cupped palms held low at the waist, head dipped to the count (spr-085)
  const reading = opts.reading === true; // a dockmaster halted on the quay reading a manifest held flat between both forward hands at chest height, head bowed to the page (spr-086)
  const cradling = opts.cradling === true; // ONE arm crooked HIGH across the chest cradling a bundle while the OTHER steadies it LOW from below — an over-and-under asymmetric two-hand carry, the bundle body-parented and rising only on the breath (spr-087)
  const offering = opts.offering === true; // a young vendor halted near-upright, ONE arm held forward at chest height presenting a small apple to someone close while the other hangs slack — a near handover (NOT pointing's far empty indication), the apple body-parented and riding only the breath (spr-088)
  const talk = opts.talk === true;       // standing in conversation, gesturing in turn (spr-032)
  const idler = seed > 0;
  let stance = idler ? Math.floor((((seed * 3.7) % 1) + 1) % 1 * 3) : 0;
  if (p.prop || talk) stance = 0;        // a clean arms-at-side base for the talk gesture
  const stanceArmX = stance === 1 ? -0.5 : stance === 2 ? 0.45 : 0;   // pitch the upper arm
  const armZL = stance === 1 ? -0.3 : 0.09;   // the clasped pose rolls the shoulders inward
  const armZR = stance === 1 ? 0.3 : -0.09;   // so the two hands meet in front of the body

  // Legs — capsules from the hip, each ending in a boot toed forward.
  function makeLeg(x) {
    const pivot = new THREE.Object3D();
    pivot.position.set(x, HIP_Y, 0);
    pivot.add(capsuleLimb(0.78, legR0, trouserMat));
    const boot = mesh(new THREE.BoxGeometry(0.13 * build, 0.085, 0.27), shoeMat);
    boot.position.set(0, -0.76, 0.05);
    pivot.add(boot);
    return pivot;
  }
  // Arms — slimmer capsules from the shoulder, each ending in a hand; the shoulder roll
  // (rz) angles them out for a normal hang or inward for the clasped stance.
  function makeArm(x, rz) {
    const pivot = new THREE.Object3D();
    pivot.position.set(x, SHOULDER_Y, 0);
    pivot.rotation.z = rz;
    pivot.add(capsuleLimb(0.62, armR0, coatMat));
    const hand = mesh(new THREE.SphereGeometry(0.055 * build, 12, 10), skinMat);
    hand.position.y = -0.6;
    pivot.add(hand);
    return pivot;
  }

  const legL = makeLeg(-0.1 * spread);
  const legR = makeLeg(0.1 * spread);
  const armL = makeArm(-0.27 * spread, armZL);
  const armR = makeArm(0.27 * spread, armZR);
  body.add(legL, legR, armL, armR);

  // Per-role stature: scale about the root origin (y=0 ground), so feet stay planted
  // and only the height changes — a child reads small, a smith broad-and-tall.
  if (p.scale && p.scale !== 1) root.scale.setScalar(p.scale);
  // The standing crowd opts out of real shadows (it carries a contact-blob instead).
  if (opts.castShadow === false) root.traverse((o) => { if (o.isMesh) o.castShadow = false; });

  // Idle-pose variety (spr-006/008): the per-figure seed (0..1, deterministic from the
  // caller) desyncs the standing crowd so they no longer breathe and shift as one body —
  // a staggered breath phase, its own idle rate, a faint asymmetric arm hang, a resting
  // stance (set above) and now a slow wandering gaze. The gaze turns only the head pivot,
  // only for idlers; walkers and the player leave seed at 0 and keep their motion exactly.
  const figure = {
    root,
    body,
    headPivot,
    legL, legR, armL, armR,
    _idler: idler,
    _stanceArmX: stanceArmX,
    _phase: seed * Math.PI * 2,
    _gazePhase: seed * Math.PI * 2.6,   // gaze sway, decorrelated from the breath
    _swayPhase: seed * Math.PI * 1.7,   // weight-shift rock, decorrelated from both
    _idleRate: 1.7 + seed * 1.1,        // 1.7..2.8 — each idler breathes at its own pace
    _armBias: (seed - 0.5) * 0.16,      // a small, fixed asymmetric arm hang
    _build: build,                      // mass proxy — drives the stride heft (spr-017)
    _fidgety: idler && !p.prop && !talk, // empty-handed idlers fidget; the laden & talkers don't (spr-018/032)
    _fidgetPhase: seed * Math.PI * 3.3, // fidget clock, decorrelated from breath/gaze/sway
    _propPivot: propPivot,              // a worked tool's hand-pivot, or null (spr-019)
    _propLeaf: propLeaf,                // a ledger's turning page-leaf, or null (spr-030)
    _propAnim: propAnim,                // "stir" | "turn" | "read" | null
    _seated: seated,                    // perched on the sea-wall, legs dangling (spr-031)
    _benched: benched,                  // sat back on a bench, legs raked to the floor (spr-065)
    _leaning: leaning,                  // loafing back against a wall, feet planted (spr-066)
    _gazing: gazing,                    // tipped forward over the sea-wall rail, watching the water (spr-067)
    _mending: mending,                  // seated, bowed over the lap, working a net through the hands (spr-068)
    _scrubbing: scrubbing,              // standing, bent over a washtub, scrubbing cloth on a board (spr-069)
    _warming: warming,                  // stood at the brazier, hands held forward over the coals (spr-070)
    _hailing: hailing,                  // at the sea-wall, one arm flung up hailing a boat (spr-071)
    _scattering: scattering,            // folded deep at the hips, flicking crumbs to the flock (spr-072)
    _stretching: stretching,            // both arms flung up overhead, an end-of-shift stretch (spr-073)
    _pointing: pointing,                 // one arm thrown out level, head tracking it, showing the way (spr-074)
    _catching: catching,                 // bent over near-straight legs, hands braced on the thighs, head up — winded (spr-075)
    _grounded: grounded,                 // sat down on the bare cobbles, legs stretched out flat, hands on the thighs (spr-076)
    _casting: casting,                    // at the sea-wall, both hands on a rod, a line dropped over the water (spr-077)
    _portering: portering,                // a load balanced on the crown, both arms up and inboard steadying it (spr-078)
    _watching: watching,                  // at ease on watch, both arms swept back, hands clasped behind the spine (spr-079)
    _shading: shading,                    // at the sea-wall, chin up and one hand a brow-visor against the low sun, peering out (spr-080)
    _bowing: bowing,                      // folded forward from the hips in a deferent doffing bow, head dropped low, arms hanging slack and clear of the thighs (spr-081)
    _glancing: glancing,                  // halted mid-quay, head twisted hard back over one shoulder at a shout from behind, body squared forward, arms hanging easy (spr-082)
    _listening: listening,                // head canted to one cocked ear and held, arms slack and easy — a body caught listening hard to a sound off to the side (spr-083)
    _craning: craning,                    // chin craned UP to the wheeling gulls, arms slack, an open upward stare — the deepest sustained up-gaze, no brow-visor hand (spr-084)
    _counting: counting,                  // a vendor counting coins, trickling them between two cupped palms held low at the waist, the right hand drifting while the left holds steady, head dipped to the count (spr-085)
    _reading: reading,                    // a dockmaster halted on the quay reading a manifest held flat between both forward hands at chest height, head dipped to the page — the FIRST flat document held between two STEADY hands and the FIRST fully-static two-handed idle (spr-086)
    _cradling: cradling,                  // a market woman carrying a bundle against the chest — the LEFT arm cradles HIGH and inboard over a body-parented bundle while the RIGHT steadies it LOW from below, two hands at two heights bracketing the load (0.21m apart, never stacked), head dipped to the bundle — the FIRST one-arm-over/one-arm-under asymmetric CARRY, distinct from portering's symmetric crown-load and reading's side-by-side flat document; bundle rides only the breath so it cannot snap (spr-087)
    _offering: offering,                   // a young vendor halted near-upright presenting a small apple in one forward hand to someone close — the RIGHT arm extended chest-high and INBOARD (hand y≈1.30, z≈0.58) with a slow present-and-settle so the gift eases out and back, the LEFT arm fully slack at the hip (hand y≈0.84), head dipped and turned to the receiver; the FIRST true ONE-arm NEAR offer/handover — distinct from pointing's far level empty arm + head-away, and from reading/counting/cradling's two-handed forward work; the apple parents to fig.body and rides ONLY the breath so it cannot snap (spr-088)
    _talk: talk,                        // standing in conversation, gesturing in turn (spr-032)
    _talkPhase: opts.talkPhase ?? 0,    // turn-taking clock; set antiphase between the pair
    update(dt, speed = 0) {
      const moving = speed > 0.05;
      // Stride cadence scales with pace (sqrt so it eases off), so a laden trudge steps
      // slower than a brisk stride. Capped at 1.78 m/s where the curve passes through the
      // old fixed 7.5 — the player runs faster than that, so the hero's gait is unchanged.
      const cadence = moving ? 4.7 + 2.1 * Math.sqrt(Math.min(speed, 1.78)) : this._idleRate;
      this._phase += dt * cadence;
      // Seated idlers (spr-031) — figures perched on the sea-wall, legs dangling over the
      // water, never walking. The player is never seated (no opts.seated), so this branch is
      // dead code for the hero and its gait stays byte-for-byte unchanged. Legs hang forward
      // off the coping and sway in a slow, slightly-staggered idle kick; hands rest on the
      // thighs; the head drifts as it watches the water. Returns early — no stride, walking
      // lean or weight-shift, which is what would read wrong on a sitting body.
      if (this._seated) {
        const k = this._phase;
        // Forward = +z local = the figure's front (it faces the water); a foot swings to +z
        // for NEGATIVE rotation.x, so the legs hang forward off the coping with −0.5 and the
        // hands rest forward on the thighs likewise.
        legL.rotation.x = -0.5 + Math.sin(k * 0.8) * 0.06;
        legR.rotation.x = -0.5 + Math.sin(k * 0.8 + 1.1) * 0.06;
        armL.rotation.x = -0.5; armL.rotation.z = 0.06;
        armR.rotation.x = -0.5; armR.rotation.z = -0.06;
        body.position.y = Math.sin(k) * 0.008;
        body.rotation.x = 0; body.rotation.z = 0;
        this.headPivot.rotation.x = 0;
        this.headPivot.rotation.y = Math.sin(k * 0.3 + this._gazePhase) * 0.35;
        return;
      }
      // Bench-sitters (spr-065) — unlike the sea-wall perch (legs dangling over the water),
      // a body on the low quay benches sits BACK with its legs raked forward to plant on the
      // cobbles: there is a floor to meet. No knee to fold, so the rigid legs simply rake
      // forward (rotation.x ≈ −0.9 reaches from the 0.49 m seat down to y=0, ~0.63 m ahead of
      // the hip), the hands rest along the thighs and the head drifts as it takes the air. The
      // player is never benched, so this branch is dead code for the hero and its gait is
      // byte-for-byte unchanged. Returns early — no stride, walking lean or weight-shift.
      if (this._benched) {
        const k = this._phase;
        legL.rotation.x = -0.9 + Math.sin(k * 0.7) * 0.05;
        legR.rotation.x = -0.9 + Math.sin(k * 0.7 + 1.3) * 0.05;   // staggered — a slow restful shift
        legL.rotation.z = -0.16; legR.rotation.z = 0.16;           // knees splayed so the two legs read apart, not as one block
        armL.rotation.x = -0.62; armL.rotation.z = 0.1;            // forearms come to rest on the lap
        armR.rotation.x = -0.62; armR.rotation.z = -0.1;
        body.position.y = Math.sin(k) * 0.006;
        body.rotation.x = 0; body.rotation.z = 0;
        this.headPivot.rotation.x = 0.05;                          // a level-to-low gaze over the harbour
        this.headPivot.rotation.y = Math.sin(k * 0.3 + this._gazePhase) * 0.3;
        return;
      }
      // Leaning idlers (spr-066) — a body loafing with its back to a wall: the upper body
      // tips BACK onto the stone while the legs counter-rotate to stay near-upright so the
      // feet stay planted on the deck (root.y = 0). Hands rest low, loosely clasped; the gaze
      // drifts easily along the quay. The player is never leaning, so this branch is dead code
      // for the hero and its gait is byte-for-byte unchanged. Returns early — no stride.
      if (this._leaning) {
        const k = this._phase;
        body.rotation.x = -0.18;                                    // back and shoulders tipped onto the wall
        body.rotation.z = Math.sin(k * 0.4) * 0.012;               // a faint, slow settle
        body.position.y = Math.sin(k) * 0.005;
        legL.rotation.x = 0.06; legL.rotation.z = -0.04;           // legs counter the lean to stay upright, feet a touch apart
        legR.rotation.x = 0.06; legR.rotation.z = 0.04;
        armL.rotation.x = -0.15; armL.rotation.z = 0.28;           // hands rest low, loosely clasped at the waist
        armR.rotation.x = -0.15; armR.rotation.z = -0.28;
        this.headPivot.rotation.x = 0.04;                          // a level, easy gaze along the quay
        this.headPivot.rotation.y = Math.sin(k * 0.22 + this._gazePhase) * 0.28;
        return;
      }
      // Rail-gazers (spr-067) — the forward-tipping counterpart to the wall-lean: a body
      // propped over the sea-wall parapet, weight forward, forearms resting on the coping,
      // watching the water. Where the leaner tips BACK onto a wall behind it, this tips
      // FORWARD over the rail in front of it (head/torso toward +z local = out to sea). The
      // whole figure pivots at the feet, so the boots stay planted while the body forms a
      // forward diagonal and the legs angle back a touch to take the weight. Arms reach
      // forward-and-down onto the coping; the head LIFTS off the forward tip to level the
      // gaze on the horizon. The player is never gazing, so this branch is dead code for the
      // hero and its gait stays byte-for-byte unchanged. Returns early — no stride.
      if (this._gazing) {
        const k = this._phase;
        body.rotation.x = 0.26;                                     // tipped forward, propped over the rail
        body.rotation.z = Math.sin(k * 0.35) * 0.01;               // a faint settle of the weight
        body.position.y = Math.sin(k) * 0.005;
        legL.rotation.x = -0.09; legL.rotation.z = -0.05;          // legs angle back off the forward tip, feet a touch apart
        legR.rotation.x = -0.09; legR.rotation.z = 0.05;
        armL.rotation.x = -0.52; armL.rotation.z = 0.1;            // forearms come forward and down to rest on the coping
        armR.rotation.x = -0.52; armR.rotation.z = -0.1;
        this.headPivot.rotation.x = -0.16;                          // head lifts off the forward tip to watch the horizon
        this.headPivot.rotation.y = Math.sin(k * 0.24 + this._gazePhase) * 0.3;
        return;
      }
      // Net-menders (spr-068) — the harbour's first WORKING body: every other pose RESTS
      // (stands, perches, sits, leans, gazes, talks) but nobody labours. This one sits on the
      // coping (legs dangling like the spr-031 perch) but BOWED over its lap, hands working a
      // net through a slow mending rhythm — one draws the twine across while the other feeds,
      // antiphase, the head down on the work. Placed beside the draped net on the north wall.
      // The player is never mending, so this branch is dead code for the hero and its gait
      // stays byte-for-byte unchanged. Returns early — no stride, lean or weight-shift.
      if (this._mending) {
        const k = this._phase;
        legL.rotation.x = -0.5 + Math.sin(k * 0.7) * 0.04;          // legs hang over the water, a faint rest-kick
        legR.rotation.x = -0.5 + Math.sin(k * 0.7 + 1.1) * 0.04;
        legL.rotation.z = 0; legR.rotation.z = 0;
        body.rotation.x = 0.24;                                     // bowed forward over the lap and the work
        body.rotation.z = 0;
        body.position.y = Math.sin(k) * 0.005;
        const pull = Math.sin(k * 1.4);                             // the working rhythm of the hands
        armL.rotation.x = -1.0 + pull * 0.16; armL.rotation.z = 0.22;   // left hand feeds/holds, in over the lap
        armR.rotation.x = -1.0 - pull * 0.16; armR.rotation.z = -0.22;  // right hand draws the twine across, antiphase
        this.headPivot.rotation.x = 0.34;                          // head bowed, eyes on the hands
        this.headPivot.rotation.y = Math.sin(k * 0.5) * 0.06;      // a small follow of the working hands
        return;
      }
      // Washerwomen (spr-069) — a STANDING worker to set beside the seated mender: bent deep
      // over a washtub, scrubbing cloth up and down a board in a brisk two-handed rhythm. The
      // whole body folds forward at the feet (no waist joint — the rig bends as one over the
      // tub), legs braced and a touch apart to take the effort, hands driving the quick scrub
      // stroke while the torso gives a small bob with each push, head down on the wash. The
      // player is never scrubbing, so this branch is dead code for the hero and its gait stays
      // byte-for-byte unchanged. Returns early — no stride, lean or weight-shift.
      if (this._scrubbing) {
        const k = this._phase;
        body.rotation.x = 0.6;                                      // folded deep over the tub
        body.rotation.z = 0;
        const scrub = Math.sin(k * 4.6);                           // the brisk scrub stroke
        body.position.y = scrub * 0.012;                          // a small bob with each push of the cloth
        legL.rotation.x = 0.0; legL.rotation.z = -0.07;            // feet braced a touch apart
        legR.rotation.x = 0.0; legR.rotation.z = 0.07;
        armL.rotation.x = -0.62 + scrub * 0.34; armL.rotation.z = 0.16;  // both hands drive the cloth up the board...
        armR.rotation.x = -0.62 + scrub * 0.34; armR.rotation.z = -0.16; // ...and draw it back, together
        this.headPivot.rotation.x = 0.16;                          // head down on the wash (the body bow does the rest)
        this.headPivot.rotation.y = Math.sin(k * 0.6) * 0.05;
        return;
      }
      // Warming at the brazier (spr-070) — the harbour's FIRST figure to relate to a world
      // prop: a docker stood square to the coal brazier, torso tipped a touch toward the heat,
      // BOTH arms reaching forward-and-down so the open hands hover over the coals, head bowed
      // to the warmth. A near-upright body (not the deep washtub fold) with the two hands
      // meeting at a point in front of the chest — the 'hands to the fire' shape none of the
      // rest-poses strike; the hands chafe gently antiphase. The player is never warming, so
      // this branch is dead code for the hero and its gait stays byte-for-byte unchanged.
      // Returns early — no stride, lean or weight-shift.
      if (this._warming) {
        const k = this._phase;
        body.rotation.x = 0.12;                                     // a small inclination toward the heat
        body.rotation.z = 0;
        body.position.y = Math.sin(k) * 0.005;                     // an easy, resting breath
        legL.rotation.x = 0.04; legL.rotation.z = -0.06;            // feet planted, braced a touch apart
        legR.rotation.x = 0.04; legR.rotation.z = 0.06;
        const rub = Math.sin(k * 1.6) * 0.05;                      // a slow chafe of the hands at the fire
        armL.rotation.x = -0.95 + rub; armL.rotation.z = 0.18;     // both hands held forward and down...
        armR.rotation.x = -0.95 - rub; armR.rotation.z = -0.18;    // ...over the coals, rubbing antiphase
        this.headPivot.rotation.x = 0.30;                          // eyes down on the glowing coals
        this.headPivot.rotation.y = Math.sin(k * 0.4) * 0.08;      // a small drift over the warmth
        return;
      }
      // Boat-hail (spr-071) — stood at the sea-wall, one arm flung overhead and waving out
      // to a boat on the water: the first NPC silhouette that breaks the shoulder line, an
      // arm raised clear above the head while the other hangs as a low counterweight, chin
      // lifted along the eyeline of the call. The player is never hailing, so this branch is
      // dead code for the hero and its gait stays byte-for-byte unchanged. Returns early.
      if (this._hailing) {
        const k = this._phase;
        body.rotation.x = 0.10;                                    // a slight commitment into the call
        body.rotation.z = Math.sin(k * 0.5) * 0.012;              // a faint settle on the feet
        body.position.y = Math.sin(k) * 0.006;                   // an easy breath
        legL.rotation.x = -0.05; legL.rotation.z = -0.06;         // feet planted, a touch apart
        legR.rotation.x = -0.05; legR.rotation.z = 0.06;
        armR.rotation.x = -2.88;                                  // the hail: flung straight overhead...
        armR.rotation.z = -0.40 + Math.sin(k * 2.2) * 0.30;      // ...the hand sweeping side to side, a wave
        armL.rotation.x = -0.12; armL.rotation.z = 0.18;          // the other arm low, a counterweight
        this.headPivot.rotation.x = -0.18;                        // chin up, eyeline out to the boat
        this.headPivot.rotation.y = 0.16 + Math.sin(k * 0.4) * 0.06; // turned to where the hand points
        return;
      }
      // Crumb-scatterer (spr-072) — the harbour's FIRST figure to feed the living flock: folded
      // deep at the hips over a knot of pigeons at the boots, one hand flicking crumbs across the
      // cobbles while the other cups the feed low at the lap, head bowed on the birds. The deep
      // hip-fold (no knee joint — the WHOLE body tips at the feet over near-straight legs) is the
      // deepest bow in the harbour, deeper than the scrubber's tub-fold. The player is never
      // scattering, so this branch is dead code for the hero and its gait stays byte-for-byte
      // unchanged. Returns early — no stride, lean or weight-shift.
      if (this._scattering) {
        const k = this._phase;
        const scatter = Math.sin(k * 1.5);                         // the rhythmic casting/flicking stroke
        body.rotation.x = 0.64 + scatter * 0.05;                   // a deep hip-fold forward over the birds...
        body.rotation.z = -0.05;                                   // ...weight a touch onto the scattering side
        body.position.y = Math.sin(k) * 0.006;                     // an easy stooped breath
        legL.rotation.x = -0.06; legL.rotation.z = -0.06;          // legs near-straight, raked a hair back to counter the fold
        legR.rotation.x = -0.06; legR.rotation.z = 0.06;
        armR.rotation.x = -1.10 + scatter * 0.40;                  // the scattering hand reaches FORWARD-and-down...
        armR.rotation.z = -0.25 + scatter * 0.34;                  // ...casting the crumbs ahead with a shoulder flick
        armL.rotation.x = -0.50;                                   // the other forearm low...
        armL.rotation.z = 0.34;                                    // ...cupping the feed across the lap
        this.headPivot.rotation.x = 0.30;                          // head bowed, eyes down-forward on the birds
        this.headPivot.rotation.y = Math.sin(k * 0.6) * 0.18;      // a small follow, tracking which bird she feeds
        return;
      }
      // Weary stretch (spr-073) — the upward counterpart to the crumb-scatterer's downward fold:
      // an off-watch body straightening up at the end of a shift, BOTH arms flung up and splayed
      // into an open Y overhead, chin lifted to the sky, the whole frame easing back a touch onto
      // the reach. The single rigid torso can't curve a true spine arch, so the stretch is carried
      // by the TWO raised arms + the lifted chin (what tells it apart from the one-armed hail and
      // the arms-down wall-lean), with only a gentle back-tip — never enough to read as toppling.
      // The player is never stretching, so this branch is dead code for the hero and its gait stays
      // byte-for-byte unchanged. Returns early — no stride, lean or weight-shift.
      if (this._stretching) {
        const k = this._phase;
        const reach = (Math.sin(k * 0.8) + 1) * 0.5;               // a slow 0→1 stretch swell
        body.rotation.x = -0.07 - reach * 0.08;                    // eases gently BACK at the peak of the reach
        body.rotation.z = 0;
        body.position.y = reach * 0.02;                            // rises onto the balls of the feet
        legL.rotation.x = 0.05; legL.rotation.z = -0.07;           // feet planted, a touch apart, hips eased forward
        legR.rotation.x = 0.05; legR.rotation.z = 0.07;
        armL.rotation.x = -2.84 - reach * 0.12;                    // BOTH arms flung up overhead...
        armR.rotation.x = -2.84 - reach * 0.12;
        armL.rotation.z = -(0.40 + reach * 0.20);                  // ...splayed OUT into an open Y (note the
        armR.rotation.z = 0.40 + reach * 0.20;                     // outward signs — the clasp poses pull IN),
        // ...the Y widening as the reach swells to its peak.
        this.headPivot.rotation.x = -0.30 - reach * 0.10;          // chin lifted, face to the sky at the peak
        this.headPivot.rotation.y = 0;
        return;
      }
      // Showing the way (spr-074) — a harbour hand pausing to point a newcomer down the quay to the
      // notice board. A point held at the HORIZONTAL is the rig's native shape: one rigid arm-capsule
      // swung level from the shoulder, the hand-sphere at its tip clear of the head — no elbow implied
      // (the trap that sinks folded-arms and the shoulder-load), no rise toward the head (the salute
      // trap). The whole tell that reads "directing" not "reaching" is that the HEAD turns to follow its
      // OWN pointing hand: head.y and the arm share one slow phase so they sweep as a single unit, a calm
      // repeated "that way, down by the board." The off arm hangs low as a clear counterweight so the
      // silhouette stays unmistakably ONE-arm-out (never the two-handed talk shape). The player is never
      // pointing, so this is dead code for the hero and its gait stays byte-for-byte unchanged.
      if (this._pointing) {
        const k = this._phase;
        const point = Math.sin(k * 0.5);                            // one slow ~12s "that-way" beat, shared by hand + head
        body.rotation.x = 0.06;                                     // a faint commitment forward, toward the way shown
        body.rotation.z = point * 0.012;                            // an easy settle of the weight
        body.position.y = Math.sin(k) * 0.006;                      // a quiet breath
        legL.rotation.x = -0.04; legL.rotation.z = -0.06;           // feet planted, a touch apart, weight even
        legR.rotation.x = -0.04; legR.rotation.z = 0.06;
        armR.rotation.x = -1.52 + point * 0.05;                     // POINTING arm held LEVEL — clamped to the safe
        armR.rotation.z = 0.50 + point * 0.10;                      // ...horizontal band, carried OUT to the figure's RIGHT-
        // ...front (positive z swings it that way), with a slow azimuth re-aim — never up toward -1.7 (the salute read).
        armL.rotation.x = -0.12; armL.rotation.z = 0.16;            // the off arm low, an easy counterweight
        this.headPivot.rotation.x = -0.04;                         // level eyeline OUT along the arm, not bowed, not lifted
        this.headPivot.rotation.y = 0.46 + point * 0.08;           // THE TELL: head turned to TRACK its own hand (same side)
        return;
      }
      // Catching breath (spr-075) — a winded laborer stopped mid-quay, bent moderately at the hips
      // over near-straight legs with the heels of both hands braced on the thighs, and the giveaway:
      // the HEAD IS UP, chin lifted off the bent back. It is the deliberate inverse of the crumb-
      // scatterer (head DOWN, hands at the ground reaching out) — here nothing is reached for, the hands
      // tuck inboard at the hips and the gaze stays forward. The rig has no elbow, so "bracing on the
      // thighs" cannot be sold by a propped-up bent arm; it lives entirely on the hand-spheres kissing
      // the thigh-capsules, so contact is solved in body-LOCAL space (the fold pitches arm and thigh
      // together) and the breath swing on the arms is matched to the body swing so the hands stay
      // planted through the whole heave. The player is never catching, so this is dead code for the hero.
      if (this._catching) {
        const k = this._phase;
        const heave = Math.sin(k * 0.9);                            // a slow recovery breath swelling the fold
        body.rotation.x = 0.34 + heave * 0.05;                      // a MODERATE hip-fold — deeper than the warmer,
        body.rotation.z = 0;                                        // shallower than the scrubber/scatterer; it heaves on each breath
        body.position.y = heave * 0.012;                            // the chest heaves, not a walk-bob
        legL.rotation.x = -0.06; legL.rotation.z = -0.06;          // legs near-straight, raked a hair back to counter the fold,
        legR.rotation.x = -0.06; legR.rotation.z = 0.06;          // feet a touch apart to brace the weight
        armL.rotation.x = -0.30 + heave * 0.05;                    // both arms nearly straight down with a small forward
        armR.rotation.x = -0.30 + heave * 0.05;                    // pitch so the hand-spheres land ON the upper thighs, riding the heave
        armL.rotation.z = 0.28;                                     // inward-clasp signs (+L / −R) bring each hand inboard
        armR.rotation.z = -0.28;                                    // onto its own thigh — braced, not splayed
        this.headPivot.rotation.x = -0.22 + heave * 0.04;         // chin UP off the bent back, lifting on the deep breath
        this.headPivot.rotation.y = Math.sin(k * 0.45 + this._gazePhase) * 0.10; // a small weary drift
        return;
      }
      // Sat down on the cobbles (spr-076) — the harbour's FIRST figure resting on the bare ground
      // rather than any furniture: a young deckhand flopped down on the quay stones, bottom on the
      // cobbles, both legs stretched straight out in front, torso eased gently back, hands resting on
      // the thighs, head easy and gazing out. It is a genuinely new posture CLASS — distinct from the
      // sea-wall perch (legs dangle DOWN over the water), the bench-sit (a raised 0.49 m seat, back
      // upright) and every hip-fold. The body is dropped onto the stones by root.y at the call site;
      // here the legs simply RAKE FLAT forward (negative leg.rotation.x throws the rigid capsules out
      // to +z, the same idiom the bench-sitter uses to reach the floor) and the hands rest on the
      // thighs in body-LOCAL space (the proven bench/catching contact). There is no backward ground-
      // prop — the rigid no-elbow arms can't reach the stones behind a seated body without floating,
      // so the weight rests through the legs and the hands lie easy on the lap. The player is never
      // grounded, so this is dead code for the hero and its gait stays byte-for-byte unchanged.
      if (this._grounded) {
        const k = this._phase;
        const settle = (Math.sin(k) + 1) * 0.5;                     // a slow 0→1 breathing settle
        body.rotation.x = -0.10 - settle * 0.03;                    // torso eased gently BACK (negative reclines)
        body.rotation.z = 0;
        body.position.y = Math.sin(k) * 0.005;                      // a quiet breath
        legL.rotation.x = -1.42 + Math.sin(k * 0.6) * 0.03;        // legs raked FLAT forward along the stones (negative → +z),
        legR.rotation.x = -1.42 + Math.sin(k * 0.6 + 1.0) * 0.03;  // a slow staggered ease so they aren't one frozen block
        legL.rotation.z = -0.10; legR.rotation.z = 0.10;           // legs a touch apart, not a single slab
        armL.rotation.x = -0.58 + Math.sin(k) * 0.02;             // arms forward-down so the hands come to rest ON the thighs,
        armR.rotation.x = -0.58 + Math.sin(k) * 0.02;             // breath-matched so they stay planted through the settle
        armL.rotation.z = 0.22; armR.rotation.z = -0.22;          // inward-clasp signs (+L / −R) tuck each hand onto its thigh
        this.headPivot.rotation.x = -0.02;                         // an easy, near-level gaze out over the water
        this.headPivot.rotation.y = Math.sin(k * 0.3 + this._gazePhase) * 0.30; // a slow, idle wander along the quay
        return;
      }
      // Casting a line over the sea-wall (spr-077) — the harbour's FIRST figure working a long TOOL
      // and the FIRST to engage the WATER itself: a fisher stood square to the sea, BOTH hands gripping
      // a rod butt side-by-side at one height (the warming-pose convergence — never a stacked diagonal
      // grip the no-elbow rig can't make), the rod canting out and up over the water with a static line
      // dropped from its tip. The rod + line are a rigid assembly parented to the body at the fixed
      // grip point (built at the call site), so they ride the breath but NEVER track a swinging hand —
      // and CRITICALLY this branch keeps body.rotation.x = 0 (no hip-fold), because a forward fold would
      // tip the rod while the dropped line's apparent water-end stayed put, reading as a snapped line.
      // The player is never casting, so this is dead code for the hero and its gait is unchanged.
      if (this._casting) {
        const k = this._phase;
        body.rotation.x = 0;                                        // CRITICAL — upright, never fold; protects the rod+line
        body.rotation.z = Math.sin(k * 0.3) * 0.008;               // a near-still waiting settle
        body.position.y = Math.sin(k) * 0.004;                     // a quiet breath
        legL.rotation.x = -0.04; legL.rotation.z = -0.06;         // feet planted square to the water, a touch apart
        legR.rotation.x = -0.04; legR.rotation.z = 0.06;
        armL.rotation.x = -1.32; armL.rotation.z = 0.16;          // both hands brought up and INBOARD (+z.L / −z.R) to meet
        armR.rotation.x = -1.32; armR.rotation.z = -0.16;         // side-by-side at the rod butt, ~chest height, near x=0
        this.headPivot.rotation.x = -0.06;                        // eyeline level-to-slightly-up, on the rod tip / horizon
        this.headPivot.rotation.y = Math.sin(k * 0.22 + this._gazePhase) * 0.18; // a slow, idle scan of the water
        return;
      }
      // Carrying a load on the head (spr-078) — the harbour's FIRST porter to bear a burden balanced on
      // the CROWN: a dock-hand stood square under a wicker basket, BOTH arms swung up overhead (the hail/
      // stretch band, ~-2.78) and INBOARD so the hands steady its rim. The clasp convention pulls the
      // hands TOGETHER (+z.L / −z.R), the exact opposite of the stretch's open splayed-OUT Y — that
      // inward-vs-outward sign is what tells the two arms-up poses apart at a glance. The basket is a
      // static rigid assembly parented to the body at a fixed crown offset (built at the call site), so
      // it rides the breath but NEVER tracks the arms or the head; CRITICALLY this branch holds
      // body.rotation.x = 0 and the head near-level, because any forward fold or bowed head would tip the
      // crown out from under the static basket and read as a load hovering off it (the head-borne cousin
      // of the casting branch's snapped-line trap). The player never porters, so this is dead code.
      if (this._portering) {
        const k = this._phase;
        const settle = Math.sin(k * 0.9) * 0.012;                  // a tiny steadying micro-shift under the load
        body.rotation.x = 0;                                        // CRITICAL — upright, never fold; keeps the crown under the load
        body.rotation.z = Math.sin(k * 0.35) * 0.008;             // a near-still weight settle, sub-1°
        body.position.y = Math.sin(k) * 0.004;                     // a quiet shallow breath; small so the basket rides steady
        legL.rotation.x = 0.03; legL.rotation.z = -0.07;          // feet planted square, a touch apart, braced under the weight
        legR.rotation.x = 0.03; legR.rotation.z = 0.07;
        armL.rotation.x = -2.78 + settle; armL.rotation.z = 0.15; // BOTH arms up overhead (the hail/stretch band) and...
        armR.rotation.x = -2.78 - settle; armR.rotation.z = -0.15;// ...INBOARD (+z.L / −z.R) so the hands meet at the basket rim
        this.headPivot.rotation.x = -0.02;                        // chin near-level — must NOT bow, or the load reads as floating
        this.headPivot.rotation.y = Math.sin(k * 0.22 + this._gazePhase) * 0.12; // a slow, small idle scan along the quay
        return;
      }
      // Standing watch, hands clasped behind the back (spr-079) — the harbour's FIRST pose to take the
      // hands BEHIND the body. Every clasp/brace so far meets at the FRONT (warming, casting, portering),
      // the thighs (catching, grounded) or hangs at the side; this sweeps BOTH arms rearward (POSITIVE
      // arm.rotation.x swings the rigid capsule BACK — negative would throw the hands forward into the
      // plain idle stance, the trap) and pulls them INBOARD (+z.L / −z.R) so the hands meet low behind the
      // spine: a constable's open-chested parade-rest. The tells that part it from plain idle: a SQUARE,
      // faintly reclined chest (never a forward fold), a WIDE planted stance, and a slow wide head-scan
      // along the quay — a figure on watch. Body-only, no prop. The player never watches, so dead code.
      if (this._watching) {
        const k = this._phase;
        const shift = Math.sin(k * 0.55 + this._swayPhase);         // a slow foot-to-foot weight rock
        const breath = Math.sin(k);
        body.rotation.x = -0.03;                                     // a hair BACK — open chest; NEVER a forward fold
        body.rotation.z = shift * 0.02;                            // sub-1.5° weight settle, the only trunk motion
        body.position.y = breath * 0.006;                           // a shallow standing breath
        legL.rotation.x = 0.02; legL.rotation.z = -0.12;          // feet planted in a WIDE, set parade stance
        legR.rotation.x = 0.02; legR.rotation.z = 0.12;
        armL.rotation.x = 0.55 + shift * 0.015;                   // BOTH arms swung BACK (positive = rearward) so the
        armR.rotation.x = 0.55 - shift * 0.015;                   // hands come low behind the hips (~y0.93, z−0.32)...
        armL.rotation.z = 0.30;                                   // ...and INBOARD (+z.L / −z.R) to clasp behind the
        armR.rotation.z = -0.30;                                  // spine — the tell that parts it from the front-hands idle
        this.headPivot.rotation.x = -0.02;                        // near-level eyeline, scanning out — never bowed
        this.headPivot.rotation.y = Math.sin(k * 0.18 + this._gazePhase) * 0.34; // a slow, WIDE watch-sweep of the quay
        return;
      }
      // Shading the eyes, a lookout at the sea-wall (spr-080) — the harbour's FIRST pose built
      // AROUND a head tipped genuinely UP. Catching and hailing brush the chin upward, but only as
      // a side-effect of a fold or a flung arm; here the up-gaze IS the pose. The LEFT hand is thrown
      // UP-and-FORWARD to brow height (armL.rotation.x ≈ -1.88 → hand y≈1.64, z≈+0.57: a visor held
      // OUT in front of the brow, never on it — the rig forbids hand-to-face; the left hand is used so
      // the WSW yaw turns the raised arm TOWARD a player coming up the quay, not onto the far side).
      // NEGATIVE headPivot.x
      // tips the chin up to the horizon (positive would bow it down, the trap), and the head scans the
      // sky-line slow and wide under the shading hand. The off arm hangs low as a clear counterweight
      // so the silhouette reads ONE-hand-to-the-brow, not the two-handed warm/clasp. Body near-upright,
      // a hair into the squint. The player never shades, so this is dead code and the hero's gait is
      // byte-for-byte unchanged. Returns early — no stride, walking lean or weight-shift.
      if (this._shading) {
        const k = this._phase;
        const scan = Math.sin(k * 0.24 + this._gazePhase);          // a slow, wide sweep of the sky-line
        body.rotation.x = 0.04;                                     // a hair forward into the squint, near-still
        body.rotation.z = Math.sin(k * 0.3 + this._swayPhase) * 0.012; // a faint waiting settle on the feet
        body.position.y = Math.sin(k) * 0.005;                      // a quiet breath
        legL.rotation.x = -0.04; legL.rotation.z = -0.06;           // feet planted square to the water, a touch apart
        legR.rotation.x = -0.04; legR.rotation.z = 0.06;
        armL.rotation.x = -1.88 + scan * 0.03;                      // the visor on the LEFT hand (the side the WSW yaw turns toward an approaching player): thrown UP-and-FORWARD to brow height (y≈1.64, z≈+0.58)...
        armL.rotation.z = 0.22;                                     // ...and INBOARD across to the brow CENTRELINE (+z = inboard for the left arm; hand x≈-0.07), so it shades the eyes, not waves beside the head — still 0.58 clear of the head sphere
        armR.rotation.x = -0.10 - this._armBias; armR.rotation.z = -0.18; // the off (right) arm hangs low, an easy counterweight
        this.headPivot.rotation.x = -0.32;                         // chin UP — eyeline out to the horizon under the hand (negative = up)
        this.headPivot.rotation.y = scan * 0.18;                   // a slow horizon scan, tracking what comes in off the sea
        return;
      }
      // A deferent doffing bow (spr-081) — the body folds DEEP from the hips (a courtesy
      // bow, ~26°→36°) and slowly dips lower and rises, so the silhouette reads as an
      // ACTIVE, repeated bob of respect rather than a frozen stoop. The head drops with it,
      // its crown turning down-and-forward — that head-DOWN drop is the doffing tell. Both
      // arms hang slack and dead-straight, splayed a hair OUTBOARD so the dangling hands
      // stay clear of the thigh capsules (reaching for nothing — an empty, deferent bow),
      // which is what keeps it apart from the winded hands-on-thighs catch. The legs stay
      // near-straight and planted. The player never bows, so this is dead code and the
      // hero's gait is byte-for-byte unchanged. Returns early — no stride or weight-shift.
      if (this._bowing) {
        const k = this._phase;
        const nod = (Math.sin(k * 0.7) + 1) * 0.5;                 // a slow 0→1 dip-and-rise of the bow
        body.rotation.x = 0.46 + nod * 0.16;                       // a deep hip-fold that bobs lower and rises (~26°→36°)
        body.rotation.z = Math.sin(k * 0.3 + this._swayPhase) * 0.01; // a faint settle on the feet
        body.position.y = Math.sin(k) * 0.005;                     // a quiet breath
        legL.rotation.x = -0.05; legL.rotation.z = -0.06;          // legs near-straight, planted a touch apart
        legR.rotation.x = -0.05; legR.rotation.z = 0.06;
        armL.rotation.x = -0.04 + this._armBias; armL.rotation.z = -0.06; // arms hang dead-straight, splayed...
        armR.rotation.x = -0.04 - this._armBias; armR.rotation.z = 0.06;  // ...a hair OUTBOARD so the slack hands clear the thighs
        this.headPivot.rotation.x = 0.32 + nod * 0.14;             // head drops with the bow, crown down-and-forward (positive = down)
        this.headPivot.rotation.y = Math.sin(k * 0.3 + this._gazePhase) * 0.05; // an almost-still bowed head
        return;
      }
      // Glancing back over the shoulder (spr-082) — the harbour's FIRST pose to turn the head
      // AWAY from where the body faces. Every shipped pose looks ALONG its facing (forward, down
      // at work, or up at sky/boat); this one twists the head ~60° over one shoulder to look
      // BACK at a shout from behind while the body stays squared forward, arms hanging easy.
      // Pure head-and-shoulder drama: headPivot.rotation.y = -1.05 (the head pivot is a free hinge,
      // no joint forbidden — a realistic neck twist, not a look fully behind) is the whole tell,
      // kept alive by a slow sway; a faint shoulder DROP toward the turned side (body.rotation.z)
      // sells it as a real over-the-shoulder glance, not a detached head-spin. Body-only, no prop
      // to snap. The player never glances, so this is dead code for the hero and its gait is
      // byte-for-byte unchanged. Returns early — no stride or weight-shift.
      if (this._glancing) {
        const k = this._phase;
        body.rotation.x = 0;                                       // no hip-fold — the trunk stays squared, upright
        body.rotation.z = 0.05 + Math.sin(k * 0.5 + this._swayPhase) * 0.015; // a faint shoulder DROP toward the turned side, the small trunk lean that sells a real over-the-shoulder glance
        body.position.y = Math.sin(k) * 0.006;                     // a quiet breath
        legL.rotation.x = -0.02; legL.rotation.z = -0.06;          // one foot a touch back, as if caught mid-turn, feet a touch apart
        legR.rotation.x = 0.06;  legR.rotation.z = 0.07;
        armL.rotation.x = -0.10 + this._armBias; armL.rotation.z = 0.10;  // arms hang easy and asymmetric (a body caught in a pause,
        armR.rotation.x = -0.06 - this._armBias; armR.rotation.z = -0.12; // not posed) — near-straight down beside the hips, one a hair more forward
        this.headPivot.rotation.x = -0.04;                         // level-to-a-hair-up eyeline, as if meeting an eye behind (negative = up)
        this.headPivot.rotation.y = -1.05 + Math.sin(k * 0.4 + this._gazePhase) * 0.10; // THE POSE: head turned HARD back over the shoulder, the slow sway keeping it alive
        return;
      }
      // Listening, head canted to one side (spr-083) — the harbour's FIRST pose to ROLL the head.
      // Every shipped pose pitches (.x: shading/bowing/warming) or twists (.y: glancing) the head;
      // none has ever tipped it sideways. Here headPivot.rotation.z cants the crown hard toward one
      // cocked ear (~24°) and HOLDS it, kept alive by a slow sway so it reads as attending, not a
      // frozen tic; a matching shoulder TILT (body.rotation.z) and a slight head TURN toward the same
      // side sell the cant as a real listening lean, locked to one cadence so ear-cock and turn agree.
      // The arms deliberately do NOTHING — slack, near-straight, asymmetric (a body caught, not posed)
      // — so all the drama is in the head. Body-only, no prop to snap. The player never listens, so this
      // is dead code for the hero and its gait is byte-for-byte unchanged. Returns early — no stride.
      if (this._listening) {
        const k = this._phase;
        const cant = Math.sin(k * 0.4 + this._gazePhase);          // one slow cadence drives the whole cocked-ear cant
        body.rotation.x = 0.02;                                    // a hair forward, a small lean of attention toward the sound (never a fold)
        body.rotation.z = 0.04 + Math.sin(k * 0.4 + this._swayPhase) * 0.012; // a fixed shoulder TILT toward the cocked-ear side, plus a slow settle on the feet
        body.position.y = Math.sin(k) * 0.005;                     // a quiet, even breath
        legL.rotation.x = -0.02; legL.rotation.z = -0.05;          // one foot a touch back, weight gently shifted — an attentive stand
        legR.rotation.x = 0.03;  legR.rotation.z = 0.06;
        armL.rotation.x = -0.10 + this._armBias; armL.rotation.z = 0.08;  // arms hang slack, near-straight down beside the hips (hand y≈0.84),
        armR.rotation.x = -0.06 - this._armBias; armR.rotation.z = -0.10; // slightly asymmetric — a body caught mid-attention, not posed; no reach, no clasp
        this.headPivot.rotation.x = -0.03;                         // eyeline near-level-to-a-hair-up, attending (negative = up)
        this.headPivot.rotation.y = 0.20 + cant * 0.04;            // a slight TURN toward the sound, locked to the cant's cadence so ear-cock and turn agree
        this.headPivot.rotation.z = 0.42 + cant * 0.05;            // THE POSE: head CANTED hard to one side (~24°), the slow sway keeping the cocked ear alive
        return;
      }
      // Craning up at the gulls (spr-084) — the harbour's FIRST pose built around a deep,
      // SUSTAINED upward stare with the hands doing nothing. Where bowing drops the head DOWN
      // and shading tips the chin up but lives on a raised brow-VISOR hand, this throws the
      // face back to the rigging (headPivot.x = -0.55, ~31.5° up — deeper than any side-
      // effect chin-lift: hailing -0.18, shading -0.32, catching -0.22, stretch peak -0.40) and
      // leaves BOTH arms slack at the sides — the silhouette is unmistakably a bare upward gaze,
      // not the brow-shade. The body eases a hair BACK to carry the stare; the head keeps a slow
      // sky-scan so it reads ALIVE (gulls wheeling), never frozen. Body-only: Sailor is propless,
      // zero snap. The player never cranes, so this is dead code for the hero — its gait stays
      // byte-for-byte unchanged. Returns early; sets headPivot.z = 0 (listening left it canted).
      if (this._craning) {
        const k = this._phase;
        const sky = Math.sin(k * 0.3 + this._gazePhase);            // one slow cadence: keeps the up-stare alive (gulls wheeling)
        body.rotation.x = -0.06;                                    // eased a HAIR back to carry the upward gaze (negative reclines), far short of toppling
        body.rotation.z = Math.sin(k * 0.35 + this._swayPhase) * 0.012; // a faint settle on the feet, sub-1°
        body.position.y = Math.sin(k) * 0.005;                      // a quiet, even breath
        legL.rotation.x = 0.04; legL.rotation.z = -0.06;            // hips eased forward (positive) to balance the back-tip, feet a touch apart
        legR.rotation.x = 0.04; legR.rotation.z = 0.06;
        armL.rotation.x = -0.08 + this._armBias; armL.rotation.z = 0.08;  // both arms hang SLACK, near-straight down beside the hips (hand y≈0.84),
        armR.rotation.x = -0.06 - this._armBias; armR.rotation.z = -0.10; // faintly asymmetric — a body caught gazing up, not posed; no reach, no visor hand
        this.headPivot.rotation.x = -0.55 + sky * 0.04;            // THE POSE: chin craned HARD UP to the rigging/gulls (negative = up), kept alive by the slow breath-sway
        this.headPivot.rotation.y = Math.sin(k * 0.4 + this._gazePhase) * 0.20; // a slow scan of the wheeling birds across the sky
        this.headPivot.rotation.z = 0;                             // no head-roll (listening's branch leaves this canted — reset it here)
        return;
      }
      // Counting coins (spr-085) — the harbour's FIRST pose to use held-steady-vs-drifting
      // ASYMMETRIC pair work: both hands cup low and INBOARD at the waist (y≈1.04, z≈0.42 —
      // below warming's y≈1.105 forward-over-coals and casting's y≈1.30 rod-grip), and the
      // RIGHT hand alone tips a hair toward the left on a slow ~6s sine while the left holds
      // steady, reading as coins trickled from one palm to the other and back. Every prior
      // two-handed pose either couples both hands antiphase (warming/mending/scrubbing) or
      // braces them static (catching/grounded); this single-hand drift is wholly new. Propless
      // (Merchant has no ROLE_PROP), body barely stoops (+0.05, never a fold) and never world-
      // anchors anything — zero snap. The player never counts, so this is dead code for the hero
      // and its gait stays byte-for-byte unchanged. Returns early — no stride, lean or weight-shift.
      if (this._counting) {
        const k = this._phase;
        const trickle = Math.sin(k * 1.05);                        // a slow ~6s coin-transfer cadence on the right hand alone
        body.rotation.x = 0.05;                                    // a faint stoop over the cupped hands — never a fold
        body.rotation.z = Math.sin(k * 0.4 + this._swayPhase) * 0.012; // a sub-1° weight settle on the feet
        body.position.y = Math.sin(k) * 0.005;                     // a quiet, even breath
        legL.rotation.x = -0.03; legL.rotation.z = -0.06;          // feet planted, a touch apart, weight even
        legR.rotation.x = -0.03; legR.rotation.z = 0.06;
        armL.rotation.x = -0.78; armL.rotation.z = 0.30;           // LEFT hand holds steady, cupped low and INBOARD at the belly (hand y≈1.04, z≈0.42)...
        armR.rotation.x = -0.78 + trickle * 0.06; armR.rotation.z = -0.30; // ...the RIGHT hand drifts a hair toward it and back, trickling the coins across (clasp signs +z.L / −z.R bring both hands together near x=0)
        this.headPivot.rotation.x = 0.24;                          // head dipped to watch the count in the hands (gentler than bowing's +0.32, aimed at the low hands not the floor)
        this.headPivot.rotation.y = trickle * 0.04;               // a tiny follow of the trickling hand, locked to the transfer cadence
        return;
      }
      // Reading a manifest, halted on the quay (spr-086) — the harbour's FIRST pose to hold a
      // flat document STEADY between two hands, and the FIRST fully-static two-handed idle.
      // Both arms come forward and INBOARD (+z.L / −z.R) so the hands meet side-by-side at
      // chest height (hand y≈1.23, z≈0.56, ~0.28m apart — not stacked), cradling a folded
      // letter that is parented to the body and rides ONLY the breath, so it never world-
      // anchors and cannot snap. Unlike counting (low cupped hands, the right one drifting),
      // both hands here hold dead steady — the only motion is a sub-degree weight settle, a
      // quiet breath, and a tiny line-scan of the head down and across the page. The head dip
      // (+0.22) is shallower than bowing's +0.32 and aimed at the chest-high paper, not the
      // floor; head-roll is reset to 0 (listening leaves it canted). Propless role (Dockmaster
      // carries no ROLE_PROP). The player never reads, so this is dead code for the hero and
      // its gait stays byte-for-byte unchanged. Returns early — no stride, lean or weight-shift.
      if (this._reading) {
        const k = this._phase;
        const scan = Math.sin(k * 0.4 + this._gazePhase);          // a slow line-scan down the page, kept alive but tiny
        body.rotation.x = 0.05;                                    // a faint stoop to the page — never a fold; protects the held letter
        body.rotation.z = Math.sin(k * 0.4 + this._swayPhase) * 0.012; // a sub-1° weight settle on the feet
        body.position.y = Math.sin(k) * 0.005;                     // a quiet, even breath
        legL.rotation.x = -0.03; legL.rotation.z = -0.06;          // feet planted, a touch apart, weight even
        legR.rotation.x = -0.03; legR.rotation.z = 0.06;
        armL.rotation.x = -1.18; armL.rotation.z = 0.24;           // BOTH hands brought forward and INBOARD (+z.L / −z.R) to meet
        armR.rotation.x = -1.18; armR.rotation.z = -0.24;          // side-by-side at chest height (hand y≈1.23, z≈0.56), holding the letter STEADY — no antiphase, no drift
        this.headPivot.rotation.x = 0.22;                          // head dipped to read the page in the hands (gentler than bowing's +0.32, aimed at the chest-high paper not the floor)
        this.headPivot.rotation.y = scan * 0.03;                   // a tiny line-scan across the page, locked to the slow gaze cadence
        this.headPivot.rotation.z = 0;                             // no head-roll (listening's branch leaves this canted — reset it here)
        return;
      }
      // Cradling a bundle against the chest (spr-087) — the harbour's FIRST one-arm-over,
      // one-arm-under asymmetric CARRY. Portering balances a load on the CROWN with both
      // arms swung symmetrically up; reading holds a flat document between two SIDE-BY-SIDE
      // hands at one height; counting cups both hands LOW. This crooks the LEFT arm HIGH and
      // inboard so its hand comes up under the bundle's far rim (y≈1.30), while the RIGHT arm
      // steadies it LOW from below (y≈1.09) — two hands at two heights, 0.21m apart, never
      // stacked, bracketing a body-parented bundle. The bundle parents to fig.body and rides
      // ONLY the breath (the reading-letter / casting-rod idiom), and the body barely stoops
      // (+0.06, never a fold) — so it never world-anchors and cannot snap. The right hand keeps
      // a slow live support-loop so the carry reads ACTIVE, not a frozen clutch. The player
      // never cradles, so this is dead code for the hero and its gait stays byte-for-byte
      // unchanged. Returns early — no stride, walking lean or weight-shift.
      if (this._cradling) {
        const k = this._phase;
        const support = Math.sin(k * 0.5);                          // a slow live support-shift on the lower hand — the tell that reads an ACTIVE cradle, not a stiff grip
        body.rotation.x = 0.06;                                     // a faint protective stoop over the load — never a fold; protects the body-parented bundle
        body.rotation.z = Math.sin(k * 0.4 + this._swayPhase) * 0.012; // a sub-1° weight settle on the feet
        body.position.y = Math.sin(k) * 0.005;                      // a quiet, even breath — the bundle rides this and ONLY this
        legL.rotation.x = -0.02; legL.rotation.z = -0.06;          // feet planted, a touch apart, even under the carried weight
        legR.rotation.x = -0.02; legR.rotation.z = 0.06;
        armL.rotation.x = -1.30; armL.rotation.z = 0.34;          // LEFT arm cradles HIGH and INBOARD across the chest, hand up under the far rim (hand y≈1.30, z≈0.56)
        armR.rotation.x = -0.90 + support * 0.03; armR.rotation.z = -0.30; // RIGHT arm steadies it LOW from below, the slow support-loop keeping the carry alive (hand y≈1.09, z≈0.46) — two hands at two heights, never stacked
        this.headPivot.rotation.x = 0.14;                          // head dipped to the bundle in her arms (between the cradle and the read dip), aimed at the chest-high load not the floor
        this.headPivot.rotation.y = Math.sin(k * 0.3 + this._gazePhase) * 0.12; // a small, easy drift, occasionally checking the load
        this.headPivot.rotation.z = 0;                             // no head-roll (listening's branch leaves this canted — reset it here)
        return;
      }
      // Offering an apple, halted near-upright on the quay (spr-088) — the harbour's FIRST true
      // ONE-arm NEAR handover. The RIGHT arm comes forward and INBOARD to present a small body-
      // parented apple at chest height (hand y≈1.30, z≈0.58), with a slow present-and-settle
      // (±0.03 rad) so the gift eases out and back — reads 'here, take it', not a frozen hold;
      // the LEFT arm hangs fully slack at the hip (hand y≈0.84). The head dips a touch and turns
      // to the receiver on the offering side, locked to the same present cadence so head and hand
      // agree. Distinct from pointing (far, level, EMPTY arm, head turned away) and from the
      // two-handed forward family (reading's flat document, counting's low cupped pair, cradling's
      // over/under carry). The apple parents to fig.body and rides ONLY the breath; the body holds
      // near-still (rotation.x=+0.05, never a fold), so it never world-anchors and cannot snap.
      // The player never offers, so this is dead code for the hero — its gait stays byte-for-byte
      // unchanged. Returns early — no stride, walking lean or weight-shift.
      if (this._offering) {
        const k = this._phase;
        const present = Math.sin(k * 0.45);                         // a slow present-and-settle on the offering hand — the gift eased out and back, the tell that reads an ACTIVE handover not a frozen hold
        body.rotation.x = 0.05;                                     // the faintest commitment forward into the handover — never a fold; protects the body-parented apple
        body.rotation.z = Math.sin(k * 0.4 + this._swayPhase) * 0.012; // a sub-1° weight settle on the feet
        body.position.y = Math.sin(k) * 0.005;                      // a quiet, even breath — the apple rides this and ONLY this
        legL.rotation.x = -0.03; legL.rotation.z = -0.06;          // feet planted, a touch apart, weight even
        legR.rotation.x = -0.03; legR.rotation.z = 0.06;
        armL.rotation.x = -0.05 + this._armBias; armL.rotation.z = 0.06;  // LEFT arm FULLY SLACK — hangs dead-straight at the hip (hand y≈0.84), a slight inboard tuck so it clears the thigh, doing nothing
        armR.rotation.x = -1.30 + present * 0.03; armR.rotation.z = -0.24; // RIGHT arm extended forward and INBOARD presenting the apple at chest height (hand y≈1.30, z≈0.58), the slow present-and-settle easing the gift out and back
        this.headPivot.rotation.x = 0.10;                          // head dipped a touch to the close handover — aimed at the receiver's hand, shallower than reading's +0.22 (not the floor)
        this.headPivot.rotation.y = 0.16 + present * 0.04;         // turned to the receiver on the offering (right) side, locked to the present cadence so head and hand agree
        this.headPivot.rotation.z = 0;                             // no head-roll (listening's branch leaves this canted — reset it here)
        return;
      }
      // Stride heft (spr-017) — a broad, heavy-set frame plants a deeper, more laboured
      // step: it bobs lower and swings a little longer than a slight one, reading as a
      // laden trudge against a light quick walk. Centred on build=1 (the player and the
      // default crowd) so the curves pass through the old fixed 0.7/0.06 amplitudes and
      // the hero's gait stays byte-for-byte unchanged.
      const heft = 1 + (this._build - 1) * 0.7;       // 1.24 → 1.17, 0.94 → 0.96, 1 → 1
      const amp = moving ? 0.7 * (1 + (heft - 1) * 0.5) : 0.045;
      const s = Math.sin(this._phase) * amp;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      // Arms swing for the walk, or sway gently around the resting stance when idle.
      const base = moving ? 0 : this._stanceArmX;
      armL.rotation.x = base - s * 0.8 + (moving ? 0 : this._armBias);
      armR.rotation.x = base + s * 0.8 + (moving ? 0 : -this._armBias);
      // Body bob: twice per stride when walking, a faint breath when idle. The walking
      // bob deepens with heft, so a laden frame lumbers where a slight one skims (spr-017).
      body.position.y = moving ? Math.abs(Math.sin(this._phase)) * 0.06 * heft : Math.sin(this._phase) * 0.01;
      // Walking lean — a moving citizen tips forward into its stride, a brisk one further
      // than a laden trudge (capped at 1.78 m/s like the cadence). `body` pivots at the
      // ground, so the torso and head carry forward while the boots stay planted. Gated to
      // the patrol walkers (idlers in motion); the input-driven player is never an idler,
      // so its run keeps the upright posture it always had.
      body.rotation.x = (this._idler && moving) ? Math.min(speed, 1.78) * 0.045 : 0;
      // Standing weight-shift — idlers at rest rock their weight foot to foot on a slow
      // (~5–8s) cycle. `body` pivots at the ground, so this metronome lean barely stirs the
      // boots (~2mm) while the torso and head sway, reading as settling rather than sliding.
      body.rotation.z = (this._idler && !moving)
        ? Math.sin(this._phase * 0.45 + this._swayPhase) * 0.025
        : 0;
      // Wandering gaze — idlers at rest only. A figure on the move looks where it is
      // going (head level); the player keeps a level head too (never an idler).
      this.headPivot.rotation.y = (this._idler && !moving)
        ? Math.sin(this._phase * 0.37 + this._gazePhase) * 0.4
        : 0;
      // Occasional idle fidget (spr-018) — every ~20s an empty-handed resting figure
      // lifts a hand to check a pocket-watch or adjust a collar, then lets it fall, head
      // dipping to glance at it. A low duty-cycle pulse (only the top sliver of a slow
      // sine, above 0.85) keeps it sparse: a couple of the crowd at any moment, never the
      // whole square at once. Seed-staggered, idlers only — the player never fidgets, so
      // armR/headPivot get += 0 / = 0 and the hero stays byte-for-byte unchanged.
      const fidget = (this._fidgety && !moving)
        ? Math.max(0, Math.sin(this._phase * 0.13 + this._fidgetPhase) - 0.9) / 0.1
        : 0;
      armR.rotation.x += -fidget * 0.85;          // right forearm rises toward the chest
      this.headPivot.rotation.x = -fidget * 0.16; // and the head dips to glance at it
      // Worked tools (spr-019) — the named tradesfolk keep their hands busy at their post.
      // The tool pivots at the grip, so only its head sweeps; the figure stays planted.
      if (this._propPivot) {
        const t = this._phase;
        if (this._propAnim === "stir") {            // Mei works her ladle round the pot
          this._propPivot.rotation.x = Math.sin(t * 1.1) * 0.20;
          this._propPivot.rotation.z = Math.cos(t * 1.1) * 0.20;
        } else if (this._propAnim === "turn") {     // Tomo cranks his spanner on a fitting
          this._propPivot.rotation.x = Math.sin(t * 1.6) * 0.28;
        }
      }
      // A read ledger (spr-030) — Jun the dispatcher (and the crowd's clerks/clerics) work
      // through the pages: the leaf rests flat most of the cycle, then lifts and sweeps over
      // the spine in a brief riffle and settles back. The cube keeps it still between turns,
      // and the gesture returns to 0 each cycle so it loops without a teleporting reset.
      if (this._propLeaf && this._propAnim === "read") {
        const r = Math.max(0, Math.sin(this._phase * 0.55));
        this._propLeaf.rotation.y = r * r * r * 2.5;
      }
      // Conversation (spr-032) — a pair of idlers stand face to face and talk in turns: one
      // holds the floor (lifting and working the forearms, leaning in, nodding to the beat of
      // speech) while the other listens with the odd agreeing dip of the head; then they swap.
      // `_talkPhase` advances slowly and is set ANTIPHASE between the two (0 and π) so exactly
      // one leads at a time. Overrides the wandering gaze + fidget set above (a talker watches
      // its partner, not the harbour) while keeping the breath + weight-shift. Empty-handed
      // idlers only — the player never talks (no opts.talk), so this is dead code for the hero.
      if (this._talk && !moving) {
        this._talkPhase += dt * 0.45;                     // ~14s round, ~7s a turn at the floor
        const tp = this._talkPhase;
        const spk = Math.max(0, Math.sin(tp));            // 0..1 — high while THIS one speaks
        const lst = Math.max(0, -Math.sin(tp));           // its complement — high while listening
        const beat = Math.sin(this._phase * 3.1);         // a quick hand/voice beat over the breath
        // Gesticulate: the speaker lifts and works the forearms; hands come a little inward.
        armR.rotation.x = -spk * (0.7 + beat * 0.2);
        armL.rotation.x = -spk * (0.55 - beat * 0.2);
        armR.rotation.z = -0.12 - spk * 0.12;
        armL.rotation.z = 0.12 + spk * 0.12;
        // Head: both already face the partner (yaw'd face to face). The speaker nods to the
        // beat; the listener gives slow agreeing dips. No wandering gaze.
        this.headPivot.rotation.y = 0;
        this.headPivot.rotation.x =
          -spk * (0.06 + 0.05 * beat) - lst * Math.max(0, Math.sin(this._phase * 0.8)) * 0.10;
        // The speaker leans in a touch (overrides the upright 0 set for a still idler).
        body.rotation.x = spk * 0.06;
      }
    },
  };
  return figure;
}
