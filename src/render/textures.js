// Procedural, seamless textures baked on a 2D canvas, then uploaded to WebGL.
// Original art generated in code — no external image files. Deterministic so the
// city looks the same every load. Returns <canvas> elements.

function makeCanvas(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

// Cheap deterministic hash noise in [0,1). Tileable by wrapping coords mod size.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Speckle grain that wraps seamlessly.
function speckle(ctx, size, density, light, dark, alpha) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = hash2(x, y);
      if (n < density) {
        const i = (y * size + x) * 4;
        const c = n < density / 2 ? dark : light;
        d[i] = lerp(d[i], c[0], alpha);
        d[i + 1] = lerp(d[i + 1], c[1], alpha);
        d[i + 2] = lerp(d[i + 2], c[2], alpha);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
const lerp = (a, b, t) => a + (b - a) * t;

// ── Asphalt / road ─────────────────────────────────────────────────────────
export function asphaltTex(size = 256) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = "#23272e";
  ctx.fillRect(0, 0, size, size);
  // worn patches
  for (let i = 0; i < 28; i++) {
    const x = hash2(i, 7) * size, y = hash2(i, 99) * size, r = 18 + hash2(i, 3) * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const v = hash2(i, 11) > 0.5 ? "rgba(45,50,58,0.35)" : "rgba(20,22,27,0.4)";
    g.addColorStop(0, v); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
  speckle(ctx, size, 0.5, [90, 96, 104], [12, 13, 16], 0.5);
  // subtle cracks
  ctx.strokeStyle = "rgba(8,9,11,0.5)"; ctx.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    let x = hash2(i, 21) * size, y = 0;
    ctx.moveTo(x, y);
    while (y < size) { x += (hash2(i, y) - 0.5) * 10; y += 8; ctx.lineTo((x + size) % size, y); }
    ctx.stroke();
  }
  return c;
}

// ── Wet stone quay ─────────────────────────────────────────────────────────
export function quayTex(size = 256) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = "#3a3b3a";
  ctx.fillRect(0, 0, size, size);
  const cell = size / 4;
  ctx.strokeStyle = "rgba(18,20,20,0.8)"; ctx.lineWidth = 3;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      const off = gy % 2 ? cell / 2 : 0;
      const x = (gx * cell + off) % size, y = gy * cell;
      ctx.fillStyle = `rgb(${52 + hash2(gx, gy) * 18 | 0},${53 + hash2(gx, gy + 1) * 16 | 0},${52 + hash2(gx + 1, gy) * 14 | 0})`;
      ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      ctx.strokeRect(x + 2, y + 2, cell - 4, cell - 4);
    }
  }
  speckle(ctx, size, 0.35, [120, 122, 120], [22, 24, 24], 0.3);
  return c;
}

// ── Building facade albedo (weathered concrete with a window grid) ──────────
export function facadeAlbedo(size = 256, tint = [76, 84, 96]) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  ctx.fillRect(0, 0, size, size);
  // weather streaks
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(20,24,30,${0.04 + hash2(i, 5) * 0.06})`;
    const x = hash2(i, 2) * size;
    ctx.fillRect(x, hash2(i, 9) * size * 0.3, 1 + hash2(i, 1) * 2, size);
  }
  // window grid: 4 cols x 4 rows
  const cols = 4, rows = 4, pad = size * 0.04;
  const cw = size / cols, ch = size / rows;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const x = cx * cw + pad, y = cy * ch + pad, w = cw - pad * 2, h = ch - pad * 2;
      // sill / frame
      ctx.fillStyle = "rgba(15,18,22,0.9)";
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      // glass (dark, faint reflection gradient)
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "#1a2230"); g.addColorStop(0.5, "#0f151d"); g.addColorStop(1, "#222c3a");
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      // mullion
      ctx.strokeStyle = "rgba(10,12,16,0.8)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
    }
  }
  speckle(ctx, size, 0.25, [tint[0] + 30, tint[1] + 30, tint[2] + 30], [10, 12, 16], 0.18);
  return c;
}

// ── Facade emissive (which windows are lit) — modulated by time of day ──────
export function facadeEmissive(size = 256) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, size, size);
  const cols = 4, rows = 4, pad = size * 0.04;
  const cw = size / cols, ch = size / rows;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < rows; cy++) {
      const lit = hash2(cx * 3 + 1, cy * 7 + 2) > 0.45; // ~55% of windows lit
      if (!lit) continue;
      const x = cx * cw + pad, y = cy * ch + pad, w = cw - pad * 2, h = ch - pad * 2;
      const warm = hash2(cx, cy) > 0.3;
      const col = warm ? [255, 214, 150] : [200, 220, 255];
      const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},1)`);
      g.addColorStop(0.7, `rgba(${col[0]},${col[1]},${col[2]},0.85)`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0.2)`);
      ctx.fillStyle = g; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    }
  }
  return c;
}

// ── Gravel roof ─────────────────────────────────────────────────────────────
export function roofTex(size = 128) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  ctx.fillStyle = "#2e3138"; ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 0.6, [80, 84, 90], [18, 20, 24], 0.6);
  // a couple of roof units (vents)
  ctx.fillStyle = "#1c1f24";
  ctx.fillRect(size * 0.2, size * 0.25, size * 0.18, size * 0.12);
  ctx.fillRect(size * 0.6, size * 0.6, size * 0.14, size * 0.14);
  return c;
}

// ── Water (base; ripples animated in shader via uv scroll) ──────────────────
export function waterTex(size = 256) {
  const c = makeCanvas(size), ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, "#12333d"); g.addColorStop(1, "#0c2630");
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(120,180,200,0.10)"; ctx.lineWidth = 1.5;
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    const y = hash2(i, 3) * size;
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) ctx.lineTo(x, y + Math.sin((x / size) * 6.28 + i) * 3);
    ctx.stroke();
  }
  return c;
}

// 1×1 black texture used as a default emissive map.
export function blackPixel() {
  const c = makeCanvas(1);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1, 1);
  return c;
}
