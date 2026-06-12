// WebGL2 helpers: context creation, shader/program compilation, buffer + VAO
// setup, and texture upload. Thin wrappers over the raw API, no abstraction tax.

export function getContext(canvas) {
  const gl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: "high-performance",
  });
  return gl; // may be null if WebGL2 unsupported — caller falls back
}

export function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile error: " + log + "\n" + numberLines(src));
  }
  return sh;
}

export function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  // Cache uniform + attribute locations.
  const uniforms = {};
  const nU = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nU; i++) {
    const info = gl.getActiveUniform(prog, i);
    uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(prog, info.name);
  }
  const attribs = {};
  const nA = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < nA; i++) {
    const info = gl.getActiveAttrib(prog, i);
    attribs[info.name] = gl.getAttribLocation(prog, info.name);
  }
  return { prog, uniforms, attribs };
}

// Build a VAO from interleaved vertex data [pos(3) normal(3) uv(2)] + indices.
export function createMesh(gl, attribs, vertices, indices) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const stride = 8 * 4; // 8 floats
  if (attribs.aPos >= 0) {
    gl.enableVertexAttribArray(attribs.aPos);
    gl.vertexAttribPointer(attribs.aPos, 3, gl.FLOAT, false, stride, 0);
  }
  if (attribs.aNormal >= 0) {
    gl.enableVertexAttribArray(attribs.aNormal);
    gl.vertexAttribPointer(attribs.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);
  }
  if (attribs.aUv >= 0) {
    gl.enableVertexAttribArray(attribs.aUv);
    gl.vertexAttribPointer(attribs.aUv, 2, gl.FLOAT, false, stride, 6 * 4);
  }

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  return { vao, count: indices.length };
}

// Upload a canvas/image as a mipmapped, repeating texture.
export function createTexture(gl, source, { repeat = true, flipY = true } = {}) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.generateMipmap(gl.TEXTURE_2D);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  // Anisotropy if available — sharpens textures at grazing angles (streets).
  const ext = gl.getExtension("EXT_texture_filter_anisotropic");
  if (ext) {
    const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
  return tex;
}

function numberLines(src) {
  return src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n");
}
