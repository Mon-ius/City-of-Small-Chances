// Minimal column-major mat4 / vec3 math for the WebGL renderer. No deps. Only
// what the scene needs: perspective, lookAt, model transforms, and a normal
// matrix. Column-major to match WebGL's uniformMatrix4fv(.., false, ..).

export const V = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
};

export const M = {
  identity: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),

  multiply(a, b) {
    // returns a * b
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return o;
  },

  perspective(fovyRad, aspect, near, far) {
    const f = 1 / Math.tan(fovyRad / 2);
    const nf = 1 / (near - far);
    const o = new Float32Array(16);
    o[0] = f / aspect;
    o[5] = f;
    o[10] = (far + near) * nf;
    o[11] = -1;
    o[14] = 2 * far * near * nf;
    return o;
  },

  lookAt(eye, center, up) {
    const z = V.norm(V.sub(eye, center));
    const x = V.norm(V.cross(up, z));
    const y = V.cross(z, x);
    const o = new Float32Array(16);
    o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0;
    o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
    o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0;
    o[12] = -V.dot(x, eye);
    o[13] = -V.dot(y, eye);
    o[14] = -V.dot(z, eye);
    o[15] = 1;
    return o;
  },

  translation(v) {
    const o = M.identity();
    o[12] = v[0]; o[13] = v[1]; o[14] = v[2];
    return o;
  },

  scaling(v) {
    const o = M.identity();
    o[0] = v[0]; o[5] = v[1]; o[10] = v[2];
    return o;
  },

  rotationY(rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const o = M.identity();
    o[0] = c; o[2] = -s; o[8] = s; o[10] = c;
    return o;
  },

  rotationX(rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    const o = M.identity();
    o[5] = c; o[6] = s; o[9] = -s; o[10] = c;
    return o;
  },

  // Compose translate * rotateY * scale — the common case for placing meshes.
  trs(pos, rotY, scl) {
    let m = M.translation(pos);
    if (rotY) m = M.multiply(m, M.rotationY(rotY));
    if (scl) m = M.multiply(m, M.scaling(scl));
    return m;
  },

  // 3x3 normal matrix (transpose of inverse of upper-left 3x3) as mat3 in a
  // length-9 array, padded to mat3 layout for the shader (std140-free, we use
  // a plain mat3 uniform). For our rigid+uniform-scale transforms the inverse
  // transpose equals the rotation, but we compute it properly for safety.
  normalMat3(m4) {
    const a00 = m4[0], a01 = m4[1], a02 = m4[2];
    const a10 = m4[4], a11 = m4[5], a12 = m4[6];
    const a20 = m4[8], a21 = m4[9], a22 = m4[10];
    const b01 = a22 * a11 - a12 * a21;
    const b11 = -a22 * a10 + a12 * a20;
    const b21 = a21 * a10 - a11 * a20;
    let det = a00 * b01 + a01 * b11 + a02 * b21;
    det = det ? 1 / det : 0;
    return new Float32Array([
      b01 * det,
      (-a22 * a01 + a02 * a21) * det,
      (a12 * a01 - a02 * a11) * det,
      b11 * det,
      (a22 * a00 - a02 * a20) * det,
      (-a12 * a00 + a02 * a10) * det,
      b21 * det,
      (-a21 * a00 + a01 * a20) * det,
      (a11 * a00 - a01 * a10) * det,
    ]);
  },
};
