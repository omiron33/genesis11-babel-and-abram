// The plain of Shinar: flat alluvial silt beside a wide slow river, reed beds along its margins, a
// field of mud bricks drying in rows, domed brick kilns with their fires and smoke, and the tower on
// the horizon in the dust haze with fires climbing its terraces. The wind runs across it all (reeds
// lean and the water darkens with ripples where a gust has reached). Time of day, which words are
// stamped where, the kilns' fire and the light that comes down from the cloud are set per shot.
//
// Metres, y up. The river runs along z on the -x side; the brickfield lies east of it (+x); the
// tower stands far up the plain toward +z.
import { G_COMMON } from '/song/lib/g-common.js';
import { TOWER_GLSL } from '/song/lib/tower.js';
import { LIFE_GLSL } from '/kit/life.js';

export const riverX = (z) => -52 + 14 * Math.sin(z * 0.0045 + 0.6) + 5 * Math.sin(z * 0.013);
export const RIVER_HW = 30;
export const TOWER_AT = [70, 0, 1350];
// bricks: cells across x (long side) and along z
export const BRICK = { cx: 0.62, cz: 0.42, bx: 0.56, bz: 0.36, h: 0.09 };
export const BF = { x0: -4, z0: 0, x1: 60, z1: 30 };      // the brickfield
export const groundY = (x, z) => {
  const d = Math.abs(x - riverX(z));
  return -1.7 * (1 - smooth(RIVER_HW - 6, RIVER_HW + 3, d)) + 0.08 * Math.sin(x * 0.05) * Math.sin(z * 0.04);
};
function smooth(a, b, x) { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); }
// a brick's top centre (cell i across, j along)
export const brickTop = (i, j) => [BF.x0 + (i + 0.5) * BRICK.cx, BRICK.h, BF.z0 + (j + 0.5) * BRICK.cz];

export const PLAIN_GLSL = /* glsl */ `
uniform float uFront;           // the wind's leading edge along z (the opening's one breath); 1e4: wind everywhere
uniform float uWind;            // wind strength behind the front
uniform float uExposureSky;
uniform vec4 uTower;            // x, z, scale, how many terrace fires burn (0..1)
uniform float uDecal[16];       // up to 4 word rects on the ground: x0, z0, x1, z1
uniform float uDecalUV[16];     // ...and where each reads in the text canvas: u0, v0, u1, v1
uniform float uDecalKind[4];    // 0 none, 1 pressed into wet silt, 2 pressed into sand, 3 written in ash
uniform float uStrip[8];        // brick rows that carry words: the z of each row's near edge (< -1e3: none)
uniform vec2 uStripX;           // the x span the word rows cover (cell-aligned)
uniform float uStrips;          // canvas strips (rows of the text canvas given to brick rows)
uniform vec4 uStripCanvas;      // the canvas region the strips use: u0, v0, u1, v1
uniform float uKiln[12];        // up to 3 kilns: x, z, size, fire (0..1)
uniform vec4 uKilnUV;           // canvas region for kiln 0's fired words on its dome: u0, v0, u1, v1
uniform vec4 uKilnUV2;          // ...and on the front of its chimney
uniform float uKilnText;        // 1 when kiln 0 carries words
uniform vec4 uLight;            // the light come down: x, z, column radius, strength
uniform float uColBottom;       // how far down the column has come (its lower end's height)
uniform vec4 uPool;             // the light spreading over the ground from it: x, z, radius, width of its edge
uniform float uStorm;           // storm cloud over the tower (0..1)
uniform float uBricks;          // how much of the field is laid out (0..1, by distance from the kilns)
uniform float uPitchGloss;
uniform float uSand;            // sand drifted over the brickfield after the storm (0..1)
uniform vec3 uClear;            // a patch the wind has swept clear of sand: x, z, radius

const float RIVER_HW = 30.0;
const float WATER_Y = -0.55;
float riverX(float z) { return -52.0 + 14.0 * sin(z * 0.0045 + 0.6) + 5.0 * sin(z * 0.013); }

float groundLo(vec2 q) {
  float d = abs(q.x - riverX(q.y));
  float h = -1.7 * (1.0 - smoothstep(RIVER_HW - 6.0, RIVER_HW + 3.0, d)) + 0.08 * sin(q.x * 0.05) * sin(q.y * 0.04);
  // far: a faint swell of the plain, and dunes beginning on the far horizon
  h += 0.6 * (fbm(q * 0.004, 4) - 0.5) * smoothstep(60.0, 400.0, length(q - vec2(20.0, 40.0)));
  return h;
}
float ground(vec2 q) {
  float h = groundLo(q);
  float d = abs(q.x - riverX(q.y));
  // the dry plain: cracked and trodden; the wet silt near the water: smooth
  float wet = smoothstep(RIVER_HW + 9.0, RIVER_HW + 1.0, d);
  h += (1.0 - wet) * (0.04 * (fbm(q * 0.6, 4) - 0.5) + 0.004 * (vnoise(q * 7.0) - 0.5));
  h += wet * 0.006 * (vnoise(q * 3.0) - 0.5);
  // ripple marks the water left on the silt
  h += wet * 0.004 * sin(dot(q, vec2(0.3, 2.4)) * 6.0 + 2.0 * fbm(q * 0.6, 2));
  // drifted sand over the abandoned brickfield: long drifts, wind ripples on them
  if (uSand > 0.0) {
    float drift = 0.15 + 0.09 * sin(dot(q, vec2(0.18, 0.06)) + 2.0 * fbm(q * 0.05, 3)) + 0.06 * (fbm(q * 0.3, 4) - 0.5);
    float rip = 0.008 * sin(dot(q, vec2(1.0, 0.35)) * 9.0 + 3.0 * fbm(q * 0.4, 3));
    // the drifts lie deep and smooth where the words are pressed
    for (int k = 0; k < 4; k++) {
      if (uDecalKind[k] < 0.5) continue;
      vec2 a = min(vec2(uDecal[k * 4], uDecal[k * 4 + 1]), vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]));
      vec2 b = max(vec2(uDecal[k * 4], uDecal[k * 4 + 1]), vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]));
      vec2 dd = max(max(a - q, q - b), 0.0);
      float m = smoothstep(2.8, 0.1, length(dd));
      drift = mix(drift, max(drift, 0.21), m); rip *= 1.0 - 0.8 * m;
    }
    h += uSand * (drift + rip) * smoothstep(-8.0, 4.0, q.x - riverX(q.y) - RIVER_HW) * smoothstep(uClear.z * 0.5, uClear.z, length(q - uClear.xy));
  }
  // decals that press into the ground
  for (int k = 0; k < 4; k++) {
    float kind = uDecalKind[k];
    if (kind < 0.5 || kind > 2.5) continue;
    vec2 a = vec2(uDecal[k * 4], uDecal[k * 4 + 1]), b = vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]);
    vec2 uv = (q - a) / (b - a);
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
    vec2 cuv = mix(vec2(uDecalUV[k * 4], uDecalUV[k * 4 + 1]), vec2(uDecalUV[k * 4 + 2], uDecalUV[k * 4 + 3]), uv);
    h -= 0.025 * textureLod(uTextShade, cuv, 0.0).a * 0.6 + 0.02 * textureLod(uText, cuv, 0.0).a;
  }
  return h;
}
vec3 groundN(vec2 q, float t) {
  float e = 0.004 + t * 0.0012;
  return normalize(vec3(ground(q - vec2(e, 0.0)) - ground(q + vec2(e, 0.0)), 2.0 * e, ground(q - vec2(0.0, e)) - ground(q + vec2(0.0, e))));
}

// ---------------------------------------------------------------- the wind
// how far the reeds lean and the water ripples at q: still ahead of the front, gusting behind it
float windAt(vec2 q) {
  float behind = smoothstep(uFront + 4.0, uFront - 10.0, q.y);
  return behind * uWind * lifeGust(q, vec2(-0.15, 1.0), 9.0);
}

// ---------------------------------------------------------------- bricks
// mud bricks laid flat in rows to dry; cell (i, j); a few cells empty, the rest slightly askew
vec3 brickLocal(vec3 p, out vec2 cell) {
  vec2 g = (p.xz - vec2(${'${BX0}'}, ${'${BZ0}'})) / vec2(${'${CX}'}, ${'${CZ}'});
  cell = floor(g);
  vec2 f = (fract(g) - 0.5) * vec2(${'${CX}'}, ${'${CZ}'});
  float h = hash12(cell);
  float a = (h - 0.5) * 0.06;
  f = mat2(cos(a), -sin(a), sin(a), cos(a)) * f + (hash22(cell + 3.1) - 0.5) * 0.02;
  return vec3(f.x, p.y - groundLo(p.xz), f.y);
}
// the word strip a point on a brick top reads, and where in it (u, v in canvas), or -1
vec2 stripUV(vec2 xz, vec2 cell) {
  if (uStrips < 0.5) return vec2(-1.0);
  float u = (xz.x - uStripX.x) / (uStripX.y - uStripX.x);
  if (u < 0.0 || u > 1.0) return vec2(-1.0);
  for (int k = 0; k < 8; k++) {
    if (float(k) >= uStrips) break;
    float z0 = uStrip[k];
    if (z0 < -1e3) continue;
    float v = (xz.y - z0) / ${'${CZ}'};
    if (v < 0.0 || v > 1.0) continue;
    // canvas strips run from the top of the region down; v up the canvas is toward -z (the reader stands at -z)
    float sv = (float(k) + 1.0 - v) / uStrips;
    return vec2(mix(uStripCanvas.x, uStripCanvas.z, u), mix(uStripCanvas.w, uStripCanvas.y, sv));
  }
  return vec2(-1.0);
}

bool inField(vec2 xz) { return xz.x > ${'${BX0}'} && xz.x < ${'${BX1}'} && xz.y > ${'${BZ0}'} && xz.y < ${'${BZ1}'}; }
float brickPresent(vec2 cell) {
  vec2 c = vec2(${'${BX0}'}, ${'${BZ0}'}) + (cell + 0.5) * vec2(${'${CX}'}, ${'${CZ}'});
  float laid = step(hash12(cell + 7.7), 0.93);
  // bricks that carry words are always there
  vec2 xz = c;
  if (stripUV(xz, cell).x >= 0.0) laid = 1.0;
  // the field fills out from the kilns end as the work goes on
  float reach = mix(0.0, 160.0, uBricks);
  return laid * step(length(c - vec2(20.0, 40.0)), reach);
}
float brickSD(vec3 p, out vec2 cell) {
  vec3 q = brickLocal(p, cell);
  float d = sdBox(q - vec3(0.0, ${'${BH}'} * 0.5, 0.0), vec3(${'${BX}'} * 0.5, ${'${BH}'} * 0.5, ${'${BZ}'} * 0.5) - 0.012) - 0.012;
  // soft hand-moulded edges, slumped a little, finger-smoothed tops
  d += 0.004 * (vnoise(q * 30.0 + vec3(cell, 0.0).xzy) - 0.5) + 0.006 * smoothstep(0.03, 0.0, abs(q.y - ${'${BH}'})) * (vnoise(q.xz * 12.0) - 0.5);
  if (brickPresent(cell) < 0.5) d = max(d, q.y - 0.001 + 0.2);
  return d;
}
// ---------------------------------------------------------------- kilns
// A domed updraft kiln of mud brick: a low dome on a plinth, a stoking mouth at the front (toward -z)
// glowing with the fire, a chimney rising from the crown. size 1 is 2.2 m radius.
float kilnSD(vec3 p, int k, out float part) {
  vec3 c = vec3(uKiln[k * 4], 0.0, uKiln[k * 4 + 1]);
  float s = uKiln[k * 4 + 2];
  if (s <= 0.0) { part = 0.0; return 1e5; }
  vec3 q = (p - c) / s;
  q.y -= groundLo(c.xz) / s;
  float bound = length(q - vec3(0.0, 2.6, 0.0)) - 5.5;
  if (bound > 0.5) { part = 0.0; return bound * s; }
  float dome = sdEllipsoid(q - vec3(0.0, 0.2, 0.0), vec3(2.2, 2.0, 2.2));
  dome = max(dome, -q.y);
  float plinth = sdBox(q - vec3(0.0, 0.25, 0.0), vec3(2.5, 0.25, 2.5) - 0.1) - 0.1;
  float d = smin(dome, plinth, 0.25);
  // the chimney: a tapering brick stack from the crown
  float hgt = 1.3;
  float r = mix(0.78, 0.62, sat((q.y - 1.8) / hgt));
  float ch = max(length(q.xz) - r, max(1.6 - q.y, q.y - (2.0 + hgt)));
  ch = max(ch, -(length(q.xz) - (r - 0.16)));   // hollow at the top
  d = min(d, ch);
  // the stoking mouth: an arch at the front
  vec3 m = q - vec3(0.0, 0.0, -2.1);
  float mouth = max(sdBox(m - vec3(0.0, 0.55, 0.0), vec3(0.45, 0.55, 0.9)), -(m.y - 0.0));
  mouth = min(mouth, length(m.xy - vec2(0.0, 1.1)) - 0.45 + max(abs(m.z) - 0.9, 0.0));
  d = max(d, -mouth);
  part = q.y > 1.9 && length(q.xz) < 0.75 ? 2.0 : 1.0;
  // brick relief on the outside
  if (d < 0.08) {
    vec2 uv = vec2(atan(q.z, q.x) * 2.2, q.y);
    vec4 b = brickPattern(uv * s * vec2(1.0, 1.0));
    d += 0.012 * b.x / s + 0.01 * (vnoise(q * 9.0) - 0.5);
  }
  return d * s;
}
// fire light from the kilns' mouths (with flicker)
vec3 kilnLight(vec3 p, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 3; k++) {
    float s = uKiln[k * 4 + 2], f = uKiln[k * 4 + 3];
    if (s <= 0.0 || f <= 0.0) continue;
    vec3 c = vec3(uKiln[k * 4], groundLo(vec2(uKiln[k * 4], uKiln[k * 4 + 1])) + 0.6 * s, uKiln[k * 4 + 1] - 2.6 * s);
    vec3 d = c - p; float r2 = dot(d, d);
    float fl = lifeFlicker(uTime, float(k) * 2.3);
    acc += vec3(1.0, 0.42, 0.12) * 9.0 * f * fl * s * sat(dot(n, d * inversesqrt(r2)) * 0.8 + 0.2) / (r2 + 1.0);
  }
  return acc;
}

// ---------------------------------------------------------------- the tower on the horizon
vec3 toTower(vec3 p) { return (p - vec3(uTower.x, groundLo(uTower.xy), uTower.y)) / uTower.z; }

float sceneSD(vec3 p, out float mat, out vec2 cell, bool withBricks) {
  mat = 0.0; cell = vec2(0.0);
  float d = 1e5;
  if (withBricks && p.y < 0.3 && inField(p.xz)) {
    vec2 c; float b = brickSD(p, c);
    if (b < d) { d = b; mat = 1.0; cell = c; }
  }
  for (int k = 0; k < 3; k++) {
    float part; float kd = kilnSD(p, k, part);
    if (kd < d) { d = kd; mat = 2.0 + float(k) * 0.1 + (part > 1.5 ? 0.05 : 0.0); }
  }
  if (uTower.z > 0.0) {
    float td = towerSD(toTower(p)) * uTower.z;
    if (td < d) { d = td; mat = 3.0; }
  }
  return d;
}
float sceneSD(vec3 p, out float mat, out vec2 cell) { return sceneSD(p, mat, cell, true); }
vec3 sceneN(vec3 p, float t) {
  vec2 e = vec2(0.0008 + t * 0.0004, 0.0); float m; vec2 c;
  return normalize(vec3(sceneSD(p + e.xyy, m, c) - sceneSD(p - e.xyy, m, c), sceneSD(p + e.yxy, m, c) - sceneSD(p - e.yxy, m, c), sceneSD(p + e.yyx, m, c) - sceneSD(p - e.yyx, m, c)));
}

// ---------------------------------------------------------------- reeds
// Tall reeds in beds along the water's edge: stalks on a jittered grid, each leaning with the wind
// (its tip lagging), a feathery plume at the top. Returns coverage and colour at a point in the layer.
float reedBed(vec2 q) {
  float d = abs(q.x - riverX(q.y));
  float band = smoothstep(RIVER_HW - 8.0, RIVER_HW - 4.0, d) * smoothstep(RIVER_HW + 2.5, RIVER_HW - 0.5, d);
  return band * smoothstep(0.3, 0.5, fbm(q * 0.07 + 3.0, 3));
}
vec4 reedAt(vec3 p) {
  float bed = reedBed(p.xz);
  if (bed <= 0.0) return vec4(0.0);
  float H = 2.6 + 0.8 * vnoise(p.xz * 0.4);
  float base = groundLo(p.xz);
  float y = (p.y - base) / H;
  if (y < 0.0 || y > 1.05) return vec4(0.0);
  float w = windAt(p.xz);
  vec2 sway = lifeSway(vec3(p.x, 0.0, p.z), y, vec2(-0.15, 1.0), 0.5 * w + 0.03).xz + vec2(0.0, 0.25 * w * y * y);
  vec2 g = (p.xz - sway) / 0.075;
  vec2 id = floor(g), f = fract(g);
  float cov = 0.0, plume = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = id + vec2(i, j);
    vec2 h = hash22(c);
    float alive = step(hash12(c + 1.3), bed * 0.85);
    float top = 0.82 + 0.2 * hash12(c + 5.1);
    vec2 o = vec2(i, j) + h + (hash22(c + 9.0) - 0.5) * 0.6 * y - f;
    float r = 0.15 * (1.0 - 0.45 * y);
    float stalk = alive * step(y, top) * smoothstep(r, r * 0.4, length(o));
    float pl = alive * smoothstep(top - 0.12, top - 0.05, y) * smoothstep(top + 0.06, top, y) * smoothstep(0.42, 0.1, length(o));
    cov = max(cov, max(stalk, pl * 0.7)); plume = max(plume, pl);
  }
  vec3 col = mix(vec3(0.07, 0.065, 0.035), vec3(0.3, 0.26, 0.14), y * y);
  col = mix(col, vec3(0.55, 0.47, 0.36), plume);
  return vec4(col, cov);
}
`;

const SHADE = /* glsl */ `
vec3 atmosphere(vec3 col, vec3 ro, vec3 rd, float t) {
  float fog = 1.0 - exp(-t * uFogDen * (0.4 + 0.6 * exp(-max(ro.y, 0.0) * 0.02)));
  vec3 fc = uFogCol + uSunCol * 0.3 * pow(max(dot(rd, uSunDir), 0.0), 6.0);
  return mix(col, fc, fog);
}
float softShadow(vec3 p, vec3 l) {
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 24; i++) {
    vec3 q = p + l * t; float m; vec2 c;
    float h = min(q.y - groundLo(q.xz) + 0.05 * exp(-t * 2.0), sceneSD(q, m, c));
    res = min(res, 8.0 * h / t);
    t += clamp(h, 0.02, 3.0);
    if (res < 0.01 || t > 80.0) break;
  }
  return sat(res);
}

// the sky over the plain: the shared sky, plus a storm cloud over the tower and the light come down
vec3 plainSky(vec3 rd, vec3 ro) {
  vec3 col = skyColor(rd, 0.0) * uExposureSky;
  if (uStorm > 0.0) {
    vec3 tw = normalize(vec3(uTower.x, 150.0 * uTower.z, uTower.y) - ro);
    float a = dot(rd, tw);
    float over = smoothstep(0.75, 0.98, a) * smoothstep(-0.02, 0.06, rd.y);
    float n = fbm(rd.xz / (rd.y + 0.15) * 2.0 + vec2(uTime * 0.01, 0.0), 5);
    vec3 dark = uSkyTop * 0.5 + vec3(0.004, 0.004, 0.006);
    col = mix(col, dark * (0.6 + 0.8 * n), over * uStorm * smoothstep(0.3, 0.6, n + 0.3));
    // the tower's fires light the cloud's underside above it
    col += vec3(1.0, 0.42, 0.14) * 0.05 * uTower.w * uStorm * pow(sat(a), 60.0) * n;
  }
  if (uLight.w > 0.0) {
    // the bright place in the cloud where the light comes down
    vec3 lc = normalize(vec3(uLight.x, 420.0, uLight.y) - ro);
    float a = dot(rd, lc);
    // the cloud's underside lit round the opening, its folds showing; the opening itself bright
    float ang = acos(clamp(a, -1.0, 1.0));
    float n2 = fbm(rd.xz / (abs(rd.y) + 0.12) * 3.0 + vec2(uTime * 0.02, 0.0), 5);
    float near = exp(-ang * 18.0);
    col += vec3(1.0, 0.95, 0.85) * uLight.w * (0.5 * smoothstep(0.012, 0.004, ang) * (0.7 + 0.3 * n2) + 0.35 * near * n2 * n2) * smoothstep(-0.01, 0.03, rd.y);
  }
  return col;
}

vec3 water(vec3 p, vec3 rd, vec3 ro, float t) {
  float w = windAt(p.xz);
  // ripples: a calm glassy swell everywhere, small wind-driven ripples where the gust has reached
  vec2 q = p.xz;
  float e = 0.03;
  float calm = 0.003, rip = 0.025 * w;
  float h0 = calm * fbm(q * 0.4 + vec2(0.0, -uTime * 0.05), 3) + rip * fbm(q * 3.0 + vec2(uTime * 0.4, uTime * 1.2), 4);
  float hx = calm * fbm((q + vec2(e, 0.0)) * 0.4 + vec2(0.0, -uTime * 0.05), 3) + rip * fbm((q + vec2(e, 0.0)) * 3.0 + vec2(uTime * 0.4, uTime * 1.2), 4);
  float hz = calm * fbm((q + vec2(0.0, e)) * 0.4 + vec2(0.0, -uTime * 0.05), 3) + rip * fbm((q + vec2(0.0, e)) * 3.0 + vec2(uTime * 0.4, uTime * 1.2), 4);
  vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(30.0, 200.0, t) * 0.7));
  vec3 r = reflect(rd, n);
  float fres = 0.02 + 0.98 * pow(1.0 - sat(dot(-rd, n)), 5.0);
  vec3 refl = plainSky(r, p);
  // the far bank and its reeds in the reflection: a dark band low on the reflected horizon
  float bank = smoothstep(0.06, 0.0, r.y) * 0.9;
  refl = mix(refl, uFogCol * 0.35 + uAmb * 0.2, bank);
  // the tower's fires on the water
  vec3 body = vec3(0.02, 0.025, 0.02) * (uAmb * 4.0 + uSunCol * 0.15);
  return mix(body, refl, fres);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.02, hit = -1.0, mat = 0.0; vec2 cell = vec2(0.0);
  bool isWater = false;
  float tw = rd.y < 0.0 ? (WATER_Y - ro.y) / rd.y : 1e9;
  for (int i = 0; i < 360; i++) {
    vec3 p = ro + rd * t;
    float hg = p.y - ground(p.xz);
    if (t > 40.0) hg = p.y - groundLo(p.xz);
    float m; vec2 c;
    // over the brickfield, step straight to the plane of the brick tops; below it, march the bricks
    float top = groundLo(p.xz) + ${'${BH}'} + 0.003;
    bool overField = inField(p.xz) && p.y > top && rd.y < 0.0;
    float o = sceneSD(p, m, c, !overField);
    if (overField) o = min(o, (p.y - top) / -rd.y + 0.001);
    if (hg < 0.0015 * t) {
      float lo = t - max(0.01, hg * 0.5 + 0.01), hi = t;
      for (int k = 0; k < 6; k++) { float mid = 0.5 * (lo + hi); vec3 qq = ro + rd * mid; if (qq.y - ground(qq.xz) < 0.0) hi = mid; else lo = mid; }
      hit = hi; mat = 0.0; break;
    }
    if (o < 0.0004 * t + 0.0002) { hit = t; mat = m; cell = c; break; }
    t += min(o, max(0.006 + t * 0.003, hg * 0.5));
    if (t > 4000.0 || (p.y > 400.0 && rd.y > 0.0)) break;
  }
  if (tw > 0.0 && tw < 1e8 && (hit < 0.0 || tw < hit)) { hit = tw; isWater = true; }
  float depth = hit < 0.0 ? 1e5 : hit;
#ifdef DBG_MAT
  { vec3 pp = ro + rd * hit; return vec3(mat == 1.0 ? 1.0 : 0.0, isWater ? 1.0 : 0.0, sat((pp.y - groundLo(pp.xz)) * 5.0)); }
#endif
  vec3 col;
  if (hit < 0.0) col = plainSky(rd, ro);
  else if (isWater) {
    vec3 p = ro + rd * hit;
    col = water(p, rd, ro, hit);
    col = atmosphere(col, ro, rd, hit);
  } else {
    vec3 p = ro + rd * hit;
    vec3 n, alb; vec3 emit = vec3(0.0); float spec = 0.0, gloss = 0.0;
    if (mat == 0.0) {
      n = groundN(p.xz, hit);
      float d = abs(p.x - riverX(p.z));
      float wet = smoothstep(RIVER_HW + 9.0, RIVER_HW + 1.0, d);
      vec3 dry = mix(vec3(0.45, 0.38, 0.28), vec3(0.58, 0.5, 0.38), fbm(p.xz * 0.3, 4));
      dry *= 0.85 + 0.25 * vnoise(p.xz * 8.0);
      // dried cracks in the dry silt
      vec2 vc = voronoiEdge(p.xz * 2.3 + 0.35 * vec2(fbm(p.xz * 1.1, 3), fbm(p.xz * 1.1 + 7.0, 3)));
      dry *= 1.0 - 0.22 * (1.0 - wet) * smoothstep(0.035, 0.0, vc.x) * smoothstep(0.45, 0.7, fbm(p.xz * 0.15, 3));
      vec3 silt = mix(vec3(0.2, 0.17, 0.13), vec3(0.3, 0.26, 0.19), fbm(p.xz * 0.5, 3)) * (0.9 + 0.2 * vnoise(p.xz * 4.0));
      alb = mix(dry, silt, wet);
      gloss = wet * (0.35 + 0.35 * smoothstep(0.4, 0.7, fbm(p.xz * 0.3 + 2.0, 3)));
      // the field's floor between the bricks: trodden, with straw
      if (inField(p.xz)) alb *= 0.85 + 0.15 * vnoise(p.xz * 20.0);
      if (uSand > 0.0) alb = mix(alb, mix(vec3(0.56, 0.47, 0.35), vec3(0.68, 0.58, 0.44), fbm(p.xz * 0.4, 3)), uSand * 0.85);
      for (int k = 0; k < 4; k++) {
        float kind = uDecalKind[k];
        if (kind < 0.5) continue;
        vec2 a = vec2(uDecal[k * 4], uDecal[k * 4 + 1]), b = vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]);
        vec2 uv = (p.xz - a) / (b - a);
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
        vec2 cuv = mix(vec2(uDecalUV[k * 4], uDecalUV[k * 4 + 1]), vec2(uDecalUV[k * 4 + 2], uDecalUV[k * 4 + 3]), uv);
        vec4 tx = texture(uText, cuv);
        if (kind < 1.5) {
          // pressed into wet silt: the impression holds a skin of water that catches the sky
          alb = mix(alb, vec3(0.05, 0.045, 0.04), tx.a * 0.85);
          gloss = max(gloss, tx.a);
        } else if (kind < 2.5) {
          alb = mix(alb, alb * 0.18, tx.a);
        } else {
          // written in the grey ash: the letters are the dark ground showing through
          vec3 ash = mix(vec3(0.42, 0.41, 0.4), vec3(0.6, 0.59, 0.57), fbm(p.xz * 6.0, 3));
          float asharea = sat(texture(uTextShade, cuv).a * 6.0 + 0.6);
          alb = mix(alb, ash, asharea * (1.0 - tx.a));
          alb = mix(alb, vec3(0.06, 0.045, 0.035), tx.a);
        }
      }
    } else if (mat == 1.0) {
      n = sceneN(p, hit);
      vec3 q = brickLocal(p, cell);
      float h = hash12(cell);
      alb = mix(vec3(0.46, 0.37, 0.26), vec3(0.6, 0.5, 0.36), h) * (0.85 + 0.3 * fbm(q.xz * 14.0 + h * 10.0, 3));
      // chopped straw in the clay, and a few cracks from drying
      alb *= 1.0 - 0.18 * smoothstep(0.7, 0.9, vnoise(vec2(q.x * 70.0 + h * 9.0, q.z * 12.0)));
      vec2 vc = voronoiEdge(q.xz * 9.0 + h * 13.0);
      alb *= 1.0 - 0.3 * smoothstep(0.03, 0.0, vc.x) * step(0.6, h);
      // the stamped word, filled with pitch
      if (q.y > ${'${BH}'} - 0.02) {
        vec2 suv = stripUV(p.xz, cell);
        if (suv.x >= 0.0) {
          vec4 tx = texture(uText, suv);
          vec4 sh = texture(uTextShade, suv);
          vec2 sp = 1.0 / vec2(textureSize(uTextShade, 0));
          float sx = texture(uTextShade, suv + vec2(sp.x, 0.0)).a - texture(uTextShade, suv - vec2(sp.x, 0.0)).a;
          float sy = texture(uTextShade, suv + vec2(0.0, sp.y)).a - texture(uTextShade, suv - vec2(0.0, sp.y)).a;
          n = normalize(n + vec3(sx, 0.0, sy) * 4.0 * (1.0 - tx.a));
          float fill = tx.a > 0.01 ? tx.r / tx.a : 0.0;
          vec3 pressed = alb * 0.55;
          vec3 pitch = vec3(0.012, 0.010, 0.009);
          alb = mix(alb, mix(pressed, pitch, fill), tx.a);
          // a little lip of clay pushed up round each stamp
          alb *= 1.0 + 0.12 * sh.a * (1.0 - tx.a);
          gloss = max(gloss, tx.a * fill * uPitchGloss);
        }
      }
    } else if (mat < 3.0) {
      n = sceneN(p, hit);
      int k = int(floor((mat - 2.0) * 10.0 + 0.01));
      vec3 c = vec3(uKiln[k * 4], 0.0, uKiln[k * 4 + 1]);
      float s = uKiln[k * 4 + 2];
      vec3 q = (p - c) / s; q.y -= groundLo(c.xz) / s;
      vec2 uv = vec2(atan(q.z, q.x) * 2.2, q.y) * s;
      vec4 b = brickPattern(uv);
      alb = mix(vec3(0.38, 0.26, 0.17), vec3(0.55, 0.38, 0.24), b.y) * (1.0 - 0.45 * b.x);
      // soot round the mouth and up the chimney
      float soot = smoothstep(1.2, 0.0, length(q.xy - vec2(0.0, 0.9)) - 0.0) * smoothstep(-1.0, -2.2, q.z);
      soot = max(soot, smoothstep(2.2, 7.0, q.y) * 0.7);
      alb *= 1.0 - 0.75 * soot;
      // inside the mouth: the fire
      float fire = uKiln[k * 4 + 3];
      if (q.z > -2.2 && q.y < 1.62 && abs(q.x) < 0.52) {
        // the tunnel walls glow hotter the deeper in they are; the coals at its back are white-hot
        float deep = sat((q.z + 2.1) / 1.0);
        float turb = fbm(vec2(q.x * 5.0, q.y * 3.0 - uTime * 2.6) + float(k) * 3.0, 4);
        vec3 hot = mix(vec3(1.0, 0.25, 0.04), vec3(1.0, 0.62, 0.25), deep);
        emit += hot * (0.06 + 3.5 * deep * deep * deep) * fire * lifeFlicker(uTime + q.y, float(k) * 2.3) * (0.45 + 0.9 * turb);
        alb *= 0.25;
      }
      // words fired into the dome above the mouth, glowing kiln-hot in the brick: the canvas region
      // is laid over the dome by longitude and latitude (arc lengths in kiln units)
      if (k == 0 && uKilnText > 0.5) {
        float phi = asin(clamp((q.y - 0.2) / 2.0, -1.0, 1.0));
        float lam = atan(q.x, -q.z);
        vec2 arc = vec2(-lam * 2.2 * cos(phi), phi * 2.1);
        vec2 tuv = vec2((arc.x + 1.6) / 3.2, (arc.y - 1.62) / 0.95);
        bool chim = q.y > 1.95 && length(q.xz) < 0.82;
        if (chim) tuv = vec2((-lam * 0.7 + 0.75) / 1.5, (q.y - 2.2) / 0.85);
        if (tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0 && q.z < 0.3) {
          if (chim) { vec2 cuv2 = mix(uKilnUV2.xy, uKilnUV2.zw, tuv); vec3 tx2 = normalize(vec3(-cos(lam), 0.0, -sin(lam))); vec4 i2 = inscription(cuv2, n, tx2, vec3(0.0, 1.0, 0.0), 2.6); alb *= 1.0 - 0.7 * i2.a; emit += i2.rgb; }
          else {
          vec2 cuv = mix(uKilnUV.xy, uKilnUV.zw, tuv);
          vec3 tx3 = normalize(vec3(-cos(lam), 0.0, -sin(lam))), ty3 = normalize(cross(n, tx3));
          vec4 ins = inscription(cuv, n, tx3, ty3, 2.6);
          alb *= 1.0 - 0.7 * ins.a; emit += ins.rgb;
          }
        }
      }
    } else {
      n = sceneN(p, hit);
      vec3 q = toTower(p);
      float face = abs(n.x) > abs(n.z) ? q.z : q.x;
      vec4 b = brickPattern(vec2(face, q.y) * uTower.z);
      float hh = fbm(q.xz * 0.05 + q.y * 0.02, 3);
      alb = mix(vec3(0.42, 0.32, 0.22), vec3(0.55, 0.43, 0.3), hh);
      // the courses and the ramps read as faint lines at this distance
      alb *= 0.9 + 0.1 * sin(q.y * 2.0);
      alb *= 1.0 - 0.25 * smoothstep(0.6, 0.85, fbm(vec2(face * 0.08, q.y * 0.02), 3));    // rain wash and soot
      // the glazed band near the top of each stage
      float stage = clamp(floor((q.y - 24.0) / 18.0) + 1.0, 0.0, 6.0);
      float band = smoothstep(0.4, 0.0, abs(q.y - (tY1(stage) - 2.6)) - 1.0) * step(stage, 4.5);
      alb = mix(alb, vec3(0.06, 0.12, 0.28), band * 0.85);
    }
    // light: sun or moon with soft shadow, sky, the kilns' fire, the light come down
    float sh = (mat == 3.0 || hit > 300.0) ? 1.0 : softShadow(p + n * 0.01, uSunDir);
    float dif = sat(dot(n, uSunDir));
    vec3 lit = uSunCol * dif * sh + uAmb * (0.6 + 0.4 * n.y) + (uSkyHor * 0.25 + uSkyTop * 1.2) * sat(n.y * 0.5 + 0.5);
    lit += kilnLight(p, n);
    if (uLight.w > 0.0) {
      float r = length(p.xz - uPool.xy);
      // lit from the column itself, low across the plain, so every impression in the ground shows
      vec3 ld = normalize(vec3(uPool.x, 60.0, uPool.y) - p);
      lit += vec3(1.0, 0.96, 0.88) * uLight.w * smoothstep(uPool.z, uPool.z - uPool.w, r) * (0.12 + 2.2 * sat(dot(n, ld)));
    }
    col = alb * lit + emit;
    // gloss: wet silt and pitch reflect the sky
    if (gloss > 0.0) {
      vec3 r = reflect(rd, n);
      float fres = 0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0);
      col = mix(col, plainSky(r, p) * 0.9, gloss * fres);
      col += uSunCol * gloss * 0.6 * pow(sat(dot(r, uSunDir)), 200.0) * sh;
    }
    col = atmosphere(col, ro, rd, hit);
  }
  // reeds near the camera: march back through the reed layer in front of the hit
  if (rd.y < 0.25 && ro.y < 6.0) {
    float tEnd = min(depth, 120.0);
    float tr = 1.0; vec3 acc = vec3(0.0);
    float ts = 0.3;
    for (int k = 0; k < 110; k++) {
      if (ts > tEnd || tr < 0.04) break;
      vec3 q = ro + rd * ts;
      float dt = 0.045 + ts * 0.03;
      if (q.y < groundLo(q.xz) + 3.6 && reedBed(q.xz) > 0.0) {
        vec4 r = reedAt(q);
        if (r.a > 0.0) {
          float yk = sat((q.y - groundLo(q.xz)) / 3.0);
          vec3 c = r.rgb * (uSunCol * (0.25 + 0.75 * yk) * (0.5 + 0.5 * sat(dot(normalize(vec3(uSunDir.x, 0.0, uSunDir.z)), -rd) * -1.0 + 0.5)) + uAmb * (0.5 + yk) + kilnLight(q, -rd));
          c += r.rgb * uSunCol * 0.9 * pow(sat(dot(rd, uSunDir)), 5.0) * yk;     // back-lit against a low sun
          c = atmosphere(c, ro, rd, ts);
          float a = r.a * sat(dt / 0.12);
          acc += tr * a * c; tr *= 1.0 - a;
        }
      }
      ts += dt;
    }
    col = acc + tr * col;
  }
  // the light come down: a column of light in the dusty air
  if (uLight.w > 0.0) {
    vec2 oc = ro.xz - uLight.xy; vec2 d2 = rd.xz;
    float a = dot(d2, d2), b = dot(oc, d2), c = dot(oc, oc) - uLight.z * uLight.z;
    float disc = b * b - a * c;
    if (disc > 0.0) {
      float t0 = max((-b - sqrt(disc)) / a, 0.0), t1 = min((-b + sqrt(disc)) / a, depth);
      float acc = 0.0;
      for (int k = 0; k < 20; k++) {
        float tt = mix(t0, t1, (float(k) + 0.5) / 20.0);
        vec3 q = ro + rd * tt;
        float r = length(q.xz - uLight.xy) / uLight.z;
        if (q.y > uColBottom && q.y < 420.0) acc += (1.0 - r * r) * (0.6 + 0.6 * lifeHaze(q, vec3(2.0, 0.0, 0.5), 30.0)) * smoothstep(uColBottom, uColBottom + 25.0, q.y);
      }
      col += vec3(1.0, 0.96, 0.86) * uLight.w * 0.012 * acc * max(t1 - t0, 0.0) / max(uLight.z, 1.0);
    }
  }
  // the fires climbing the tower's terraces
  if (uTower.w > 0.0) {
    for (int k = 0; k < 6; k++) {
      float y = (24.0 + 18.0 * float(k)) * uTower.z;
      float hw = (92.0 - 12.5 * float(k + 1)) * uTower.z;
      float base = groundLo(uTower.xy);
      for (int j = 0; j < 7; j++) {
        float fx = (float(j) / 6.0 - 0.5) * 2.0 * hw * 0.95;
        vec3 w = vec3(uTower.x + fx, base + y + 1.0 * uTower.z, uTower.y + hw + 10.5 * uTower.z);
        float on = step(hash11(float(k * 7 + j)), uTower.w);
        float dist = length(w - ro);
        col += on * vec3(1.0, 0.5, 0.18) * 1.6 * lifeFlicker(uTime, float(k * 7 + j)) * lifeGlow(ro, rd, w, 0.7 + dist * 0.0012, depth);
      }
    }
  }
  // flames licking out of each kiln's mouth, and sparks going up
  for (int k = 0; k < 3; k++) {
    float s = uKiln[k * 4 + 2], f = uKiln[k * 4 + 3];
    if (s <= 0.0 || f <= 0.0) continue;
    vec3 c = vec3(uKiln[k * 4], groundLo(vec2(uKiln[k * 4], uKiln[k * 4 + 1])), uKiln[k * 4 + 1]);
    // the mouth plane, z = -2.15 s in front of the kiln
    float tp = (c.z - 2.2 * s - ro.z) / rd.z;
    if (tp > 0.0 && tp < depth + 0.5) {
      vec3 q = (ro + rd * tp - c) / s;
      float y = q.y - 0.05;
      if (abs(q.x) < 0.8 && y > 0.0 && y < 2.3) {
        float tongue = fbm(vec2(q.x * 3.2 + float(k), y * 2.2 - uTime * 3.1), 4);
        float shape = smoothstep(0.55, 0.15, abs(q.x) + 0.18 * y) * smoothstep(2.2, 0.9, y + 0.6 * tongue) * smoothstep(0.0, 0.25, y);
        float dens = smoothstep(0.5, 0.85, tongue + 0.3 * (1.0 - y / 2.2)) * shape;
        col += mix(vec3(1.0, 0.28, 0.04), vec3(1.0, 0.7, 0.32), sat(1.0 - y / 1.6)) * 3.2 * f * dens * lifeFlicker(uTime, float(k) + 5.0);
      }
    }
    col += lifeEmbers(ro, rd, depth, c + vec3(0.0, 1.9 * s, -2.0 * s), 0.35 * s, 1.6 * s, 22, vec3(0.3, 0.0, 0.2) * uWind, 0.012 * s, float(k) + 1.0) * f;
  }
  // kiln smoke: a column off each chimney, lit by the fire below and the sky
  for (int k = 0; k < 3; k++) {
    float s = uKiln[k * 4 + 2];
    if (s <= 0.0) continue;
    vec3 c = vec3(uKiln[k * 4], groundLo(vec2(uKiln[k * 4], uKiln[k * 4 + 1])) + 3.3 * s, uKiln[k * 4 + 1]);
    vec2 d2 = rd.xz; float dd = max(dot(d2, d2), 1e-5);
    float tc = dot(c.xz - ro.xz, d2) / dd;
    float acc = 0.0;
    for (int m = 0; m < 10; m++) {
      float tt = tc + (float(m) - 4.5) * 0.9 * s;
      if (tt < 0.0 || tt > depth) continue;
      vec3 q = ro + rd * tt;
      float hh = q.y - c.y;
      if (hh < 0.0 || hh > 40.0) continue;
      vec2 axis = c.xz + vec2(0.06 * hh * hh * 0.1 * uWind + 0.8 * sin(hh * 0.2 - uTime * 0.4), 0.3 * hh * uWind * 0.2);
      float r = length(q.xz - axis);
      float wdt = (0.35 + hh * 0.18) * s;
      acc += exp(-r * r / (wdt * wdt)) * smoothstep(40.0, 10.0, hh) * (0.4 + 0.8 * fbm(vec2(r * 1.5, hh * 0.35 - uTime * 0.7) + float(k), 4));
    }
    float dens = 1.0 - exp(-acc * 0.3);
    float q0y = 0.0;
    vec3 smokeC = vec3(0.16, 0.14, 0.12) * (uAmb * 3.0 + uSunCol * 0.35 + uSkyHor * 0.4) + vec3(1.0, 0.4, 0.12) * 0.05 * uKiln[k * 4 + 3] * exp(-max(q0y, 0.0));
    col = mix(col, smokeC, dens * 0.75);
  }
#ifndef NO_MOTES
  col += lifeMotes(ro, rd, depth, ro + rd * 3.0, vec3(3.0, 1.5, 3.0), 40, 0.003, vec3(0.6, 0.05, 0.3) * uWind, vec3(1.0, 0.85, 0.6) * 0.15, 5.0);
#endif
  return col;
}
`;

export function plainFrag(extra = '') {
  const sub = (s) => s.replaceAll('${BX0}', BF.x0.toFixed(2)).replaceAll('${BZ0}', BF.z0.toFixed(2)).replaceAll('${BX1}', BF.x1.toFixed(2)).replaceAll('${BZ1}', BF.z1.toFixed(2))
    .replaceAll('${CX}', BRICK.cx.toFixed(3)).replaceAll('${CZ}', BRICK.cz.toFixed(3)).replaceAll('${BX}', BRICK.bx.toFixed(3)).replaceAll('${BZ}', BRICK.bz.toFixed(3)).replaceAll('${BH}', BRICK.h.toFixed(3));
  return LIFE_GLSL + G_COMMON + TOWER_GLSL + sub(PLAIN_GLSL) + extra + sub(SHADE);
}

// a plain shot: plainScene(P, { name, cam, sky(t), uniforms, update(t, u), drawText(ctx, t), textSize, post, finish })
export function plainScene(P, o) {
  const sky0 = o.sky(P.from);
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: o.textSize ?? [2048, 2048],
    frag: plainFrag((P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '')),
    uniforms: {
      ...sky0, uFront: 1e4, uWind: 0.4, uExposureSky: 1, uTower: [TOWER_AT[0], TOWER_AT[2], 1, 0].slice(0, 4),
      uDecal: new Array(16).fill(0), uDecalUV: new Array(16).fill(0), uDecalKind: [0, 0, 0, 0],
      uStrip: new Array(8).fill(-1e4), uStripX: [0, 1], uStrips: 0, uStripCanvas: [0, 0, 1, 1],
      uKiln: new Array(12).fill(0), uKilnUV: [0, 0, 1, 1], uKilnUV2: [0, 0, 1, 1], uKilnText: 0,
      uSand: 0, uClear: [0, -1e4, 1], uLight: [0, 0, 1, 0], uColBottom: 0, uPool: [0, 0, 0, 1], uStorm: 0, uBricks: 1, uPitchGloss: 0.5,
      uFocus: 5, uAperture: 0,
      ...(o.uniforms ?? {}),
    },
    camera: o.cam,
    update(t, u) {
      const s = o.sky(t);
      for (const [k, v] of Object.entries(s)) { if (!u[k]) continue; if (Array.isArray(v)) u[k].value.set(...v); else u[k].value = v; }
      const c = o.cam(t);
      u.uFocus.value = c.focus ?? 5; u.uAperture.value = c.aperture ?? 0;
      o.update?.(t, u);
    },
    drawText: o.drawText,
    post: o.post,
    finish: o.finish,
  };
}
