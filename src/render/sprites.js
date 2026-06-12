// Procedural sprite art for camera-facing billboards (people on the quay) and
// solid-colour textures for the low-poly avatar. Front-view figures on a
// transparent canvas. Used as the reliable default; codex-authored SVGs in
// assets/sprites/ are layered in on top when present and valid.

function spriteCanvas(w = 128, h = 256) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

const SKIN = ["#e8b98f", "#c98e62", "#9c6a43", "#f0c9a0", "#7a4f33"];
const CLOTH = ["#3c5a64", "#2e3f5c", "#5c5036", "#6e3b3b", "#b08a3e", "#46604a"];

// Draw a simple, readable standing person. `seed` varies appearance.
export function citizenSprite(seed = 1, role = "worker") {
  const c = spriteCanvas(), ctx = c.getContext("2d");
  const W = c.width, H = c.height;
  const rnd = (n) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const skin = SKIN[Math.floor(rnd(1) * SKIN.length)];
  const coat = CLOTH[Math.floor(rnd(2) * CLOTH.length)];
  const pants = CLOTH[Math.floor(rnd(3) * CLOTH.length)];
  const cx = W / 2;

  // soft contact shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath(); ctx.ellipse(cx, H - 12, 34, 9, 0, 0, 7); ctx.fill();

  const legW = 18, legH = 78, legY = H - 22;
  // legs
  ctx.fillStyle = pants;
  ctx.fillRect(cx - 20, legY - legH, legW, legH);
  ctx.fillRect(cx + 2, legY - legH, legW, legH);
  // shoes
  ctx.fillStyle = "#1c1d22";
  ctx.fillRect(cx - 22, legY - 8, legW + 4, 12);
  ctx.fillRect(cx + 0, legY - 8, legW + 4, 12);

  // torso (coat)
  const torsoH = 86, torsoW = 52, torsoY = legY - legH;
  ctx.fillStyle = coat;
  roundRect(ctx, cx - torsoW / 2, torsoY - torsoH, torsoW, torsoH, 10);
  ctx.fill();
  // coat shading
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.fillRect(cx, torsoY - torsoH, torsoW / 2, torsoH);
  // collar / detail by role
  ctx.fillStyle = role === "vendor" ? "#cfc6b0" : "rgba(255,255,255,0.10)";
  ctx.fillRect(cx - torsoW / 2, torsoY - torsoH, torsoW, 12);

  // arms
  ctx.fillStyle = coat;
  ctx.fillRect(cx - torsoW / 2 - 12, torsoY - torsoH + 6, 12, torsoH - 16);
  ctx.fillRect(cx + torsoW / 2, torsoY - torsoH + 6, 12, torsoH - 16);
  // hands
  ctx.fillStyle = skin;
  ctx.fillRect(cx - torsoW / 2 - 12, torsoY - 18, 12, 12);
  ctx.fillRect(cx + torsoW / 2, torsoY - 18, 12, 12);

  // shoulder bag for courier
  if (role === "courier") {
    ctx.strokeStyle = "#2a2d33"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(cx - 24, torsoY - torsoH + 6); ctx.lineTo(cx + 24, torsoY - 20); ctx.stroke();
    ctx.fillStyle = "#8a5a2a"; roundRect(ctx, cx + 14, torsoY - 36, 26, 30, 5); ctx.fill();
  }

  // head + hair
  const headR = 22, headY = torsoY - torsoH - headR + 4;
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx, headY, headR, 0, 7); ctx.fill();
  const hairC = role === "elder" ? "#cfd2d6" : ["#1c1a18", "#2c2520", "#3a2c22", "#11100f"][Math.floor(rnd(4) * 4)];
  ctx.fillStyle = hairC;
  ctx.beginPath(); ctx.arc(cx, headY - 4, headR, Math.PI, 2 * Math.PI); ctx.fill();
  ctx.fillRect(cx - headR, headY - 6, headR * 2, 6);

  // cane for elder
  if (role === "elder") {
    ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx + 34, torsoY - 20); ctx.lineTo(cx + 40, H - 18); ctx.stroke();
  }

  return c;
}

// Small solid-colour texture for avatar parts.
export function solidTex(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 4;
  const ctx = c.getContext("2d");
  ctx.fillStyle = hex; ctx.fillRect(0, 0, 4, 4);
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const ROLES = ["worker", "vendor", "courier", "elder", "youth"];
