// The tower of Babel: a terraced mass of baked brick on the plain, seven stages, each wall battered
// (leaning in as it rises), with a ramp on each stage's front face climbing from one terrace to the
// next in switchbacks, a parapet along the ramp's outer edge, a band of blue glazed brick near the
// top of every stage, braziers along the terraces, and the top two stages unfinished: ragged courses,
// scaffold poles, going up into the cloud.
//
// Tower-local metres, y up, the front face toward +z. The JS twin gives the same numbers for placing
// cameras and words.
export const TIERS = 7;
export const tierHW = (k) => 92 - 12.5 * k;            // half width of stage k at its foot
export const tierY0 = (k) => (k === 0 ? 0 : 24 + 18 * (k - 1));
export const tierY1 = (k) => 24 + 18 * k;
export const BATTER = 0.09;                             // inward lean per metre of height
export const hwAt = (k, y) => tierHW(k) - BATTER * (y - tierY0(k));
export const RAMP_W = 7.5;
// ramp k runs along the front face of stage k+1, from terrace k (y = tierY1(k)) up to terrace k+1;
// even ramps rise toward +x, odd toward -x. Returns the ramp's walking line at fraction s (0..1).
export function rampAt(k, s) {
  const y0 = tierY1(k), y1 = tierY1(k + 1);
  const L = hwAt(k + 1, y0) - 6;                         // runs from -L to L along x
  const dir = k % 2 === 0 ? 1 : -1;
  const x = dir * (-L + 2 * L * s);
  const y = y0 + (y1 - y0) * s;
  const zWall = hwAt(k + 1, y);                         // the wall face the ramp hugs
  return { x, y, z: zWall + RAMP_W * 0.5, zWall, zEdge: zWall + RAMP_W, L, dir };
}

export const TOWER_GLSL = /* glsl */ `
const float T_BATTER = ${BATTER.toFixed(3)};
const float T_RW = ${RAMP_W.toFixed(2)};
float tHW(float k) { return 92.0 - 12.5 * k; }
float tY0(float k) { return k < 0.5 ? 0.0 : 24.0 + 18.0 * (k - 1.0); }
float tY1(float k) { return 24.0 + 18.0 * k; }
float tHWat(float k, float y) { return tHW(k) - T_BATTER * (y - tY0(k)); }

// the unfinished top: how high the brickwork of stage k has got at (x, z) on its outline
float tRagged(float k, vec2 xz) {
  if (k < 4.5) return tY1(k);
  float a = atan(xz.y, xz.x);
  float n = fbm(vec2(a * 6.0, k * 3.1), 4);
  float steps = floor(n * 9.0) * 1.1;                     // courses stopped at different heights, in steps
  return tY1(k) - (k > 5.5 ? 6.0 : 1.5) - steps * (k > 5.5 ? 1.0 : 0.45);
}

// stage k as a battered square block; d is metres
float tStage(vec3 p, float k) {
  float y0 = tY0(k), y1 = tRagged(k, p.xz);
  float hw = tHWat(k, clamp(p.y, y0, y1));
  vec2 q = abs(p.xz) - vec2(hw);
  float side = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  // buttresses: shallow vertical piers every 5.5 m along each face, as ziggurat walls had
  float u = abs(p.x) > abs(p.z) ? p.z : p.x;
  float pier = smoothstep(0.42, 0.36, abs(fract(u / 5.5) - 0.5)) * smoothstep(hw - 1.0, hw - 6.0, abs(u)) * step(abs(p.z), abs(p.x));   // side faces only: the ramps hug the front
  side -= 0.45 * pier;
  float d = max(side, max(y0 - p.y, p.y - y1));
  return d * 0.95;
}

// ramp k on the front face of stage k+1
float tRamp(vec3 p, float k) {
  float y0 = tY1(k), y1 = tY1(k + 1.0);
  float L = tHWat(k + 1.0, y0) - 6.0;
  float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
  float s = clamp((dir * p.x + L) / (2.0 * L), 0.0, 1.0);
  float ry = y0 + (y1 - y0) * s;                          // the ramp surface here
  float zw = tHWat(k + 1.0, ry);
  // solid from the terrace up to the ramp surface, between the wall and the ramp's outer edge
  float dz = max(zw - 0.5 - p.z, p.z - (zw + T_RW));
  float dy = max(p.y - ry, y0 - 0.2 - p.y);
  float dx = abs(p.x) - (L + 0.5);
  float d = max(max(dz, dy * 0.92), dx);
  // the parapet along the outer edge, 1.1 m above the ramp
  float par = max(max(abs(p.z - (zw + T_RW - 0.3)) - 0.3, p.y - (ry + 1.1)), max(y0 - p.y, dx));
  return min(d, par);
}

// coarse tower: stages and ramps (for far views and shadows)
float towerSD(vec3 p) {
  float b = length(max(abs(p.xz) - vec2(96.0), 0.0));
  float bb = max(b, max(-p.y, p.y - 140.0));
  if (bb > 4.0) return bb;
  float d = 1e5;
  float k = clamp(floor((p.y - 24.0) / 18.0) + 1.0, 0.0, 6.0);
  for (float j = -1.0; j <= 1.0; j += 1.0) {
    float kk = k + j;
    if (kk < 0.0 || kk > 6.0) continue;
    d = min(d, tStage(p, kk));
    if (kk < 6.0) d = min(d, tRamp(p, kk));
  }
  return d;
}

// Brick courses on a wall: u along the wall, v up it (metres). Returns (mortar 0..1, brick id hash,
// reed-mat layer 0..1, pitch course 0..1).
vec4 brickPattern(vec2 uv) {
  const float CH = 0.105, BL = 0.34;
  float row = floor(uv.y / CH);
  float u = uv.x / BL + 0.5 * mod(row, 2.0) + 0.17 * hash11(row * 3.7);
  float col = floor(u);
  vec2 f = vec2(fract(u) * BL, fract(uv.y / CH) * CH);
  float m = 1.0 - smoothstep(0.008, 0.02, min(min(f.x, BL - f.x), min(f.y, CH - f.y)) + 0.006 * (vnoise(uv * 60.0) - 0.5));
  float id = hash12(vec2(col, row));
  float mat = 1.0 - step(0.5, abs(mod(row, 9.0) - 0.0));       // every ninth course a layer of reed matting
  float pitch = step(mod(row, 9.0), 1.5) * (1.0 - mat);        // and the course above it set in pitch
  return vec4(m, id, mat, pitch);
}
`;
