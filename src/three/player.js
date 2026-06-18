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
  } else if (type === "book") {                  // a clerk's ledger / cleric's book at the chest
    const bk = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.05), flatMat(0x4a2e22, 0.6));
    bk.rotation.x = -0.5; g.add(at(bk, -0.02, 1.27, 0.23));
  } else if (type === "sack") {                  // a porter's sack hoisted on the shoulder
    // Pale hemp (not the coat brown — a same-colour sack vanishes into the porter's coat),
    // sat high beside the shoulder and a touch forward so it reads from the front.
    const s = mesh(new THREE.SphereGeometry(0.2, 12, 10), flatMat(0x9c8a5f, 0.92));
    s.scale.set(0.96, 1.3, 0.85); s.rotation.z = 0.26; g.add(at(s, 0.25, 1.68, 0.02));
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
  if (p.prop) {
    const prop = buildProp(p.prop);
    if (prop) body.add(prop);
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
  const idler = seed > 0;
  let stance = idler ? Math.floor((((seed * 3.7) % 1) + 1) % 1 * 3) : 0;
  if (p.prop) stance = 0;
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
    _idleRate: 1.7 + seed * 1.1,        // 1.7..2.8 — each idler breathes at its own pace
    _armBias: (seed - 0.5) * 0.16,      // a small, fixed asymmetric arm hang
    update(dt, speed = 0) {
      const moving = speed > 0.05;
      // Stride frequency scales with speed; amplitude eases in when moving.
      this._phase += dt * (moving ? 7.5 : this._idleRate);
      const amp = moving ? 0.7 : 0.045;
      const s = Math.sin(this._phase) * amp;
      legL.rotation.x = s;
      legR.rotation.x = -s;
      // Arms swing for the walk, or sway gently around the resting stance when idle.
      const base = moving ? 0 : this._stanceArmX;
      armL.rotation.x = base - s * 0.8 + (moving ? 0 : this._armBias);
      armR.rotation.x = base + s * 0.8 + (moving ? 0 : -this._armBias);
      // Body bob: twice per stride when walking, a faint breath when idle.
      body.position.y = moving ? Math.abs(Math.sin(this._phase)) * 0.06 : Math.sin(this._phase) * 0.01;
      // Wandering gaze — idlers at rest only. A figure on the move looks where it is
      // going (head level); the player keeps a level head too (never an idler).
      this.headPivot.rotation.y = (this._idler && !moving)
        ? Math.sin(this._phase * 0.37 + this._gazePhase) * 0.4
        : 0;
    },
  };
  return figure;
}
