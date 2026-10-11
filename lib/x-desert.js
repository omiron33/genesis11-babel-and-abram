// The road west: a desert of gravel and drifted sand with a track worn across it, and ridges of
// layered sandstone, their cliffs stepped in strata, the rock that catches the low sun. The road runs
// toward +z (west), out of Ur (far east, -z) toward Haran and the hills beyond. A long ridge crosses the
// way where the road climbs through a pass between cliffs; near Ur a ridge faces the dawn across a
// river channel. Words are cut into cliff faces (wall decals), pressed into the road (ground decals),
// stamped into a fallen brick, cut into the curb of a well and the top stone of a cairn.
//
// Metres, y up. The road's centre line is x = roadX(z).
import { G_COMMON } from '/song/lib/g-common.js';
import { TOWER_GLSL } from '/song/lib/tower.js';
import { LIFE_GLSL } from '/kit/life.js';

export const roadX = (z) => 6 * Math.sin(z * 0.006) + 2.5 * Math.sin(z * 0.021 + 0.7);
export const PASS = { z0: 200, z1: 262, crest: 250 };
export const RIDGE1 = { z: 128 };            // the dawn ridge's foot (its face looks toward -z)
export const WELL = [roadX(600) + 4.5, 600];
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
// the road's height at z (the rise through the pass; the small noise of the ground left out)
export const roadY = (z) => 6 * sm(PASS.z0 - 30, PASS.crest, z) * sm(PASS.z1 + 60, PASS.crest, z) - 32 * sm(PASS.crest + 10, 760, z);
export const CAIRN = [roadX(611) - 3.5, 611];

export const DESERT_GLSL = /* glsl */ `
uniform float uExposureSky;
uniform float uWDecal[48];      // up to 6 wall decals: axis (0: face looks along -z, 1: +x, 2: -x), plane coordinate, u0, u1 (world), y0, y1, and
uniform float uWDecalUV[24];    // ...canvas u0, v0, u1, v1
uniform float uWDecalOn[6];     // how cut and how lit each is (0 none)
uniform float uDecal[16];       // ground decals: x0, z0, x1, z1
uniform float uDecalUV[16];
uniform float uDecalKind[4];    // 2 pressed into sand, 3 written in ash
uniform vec4 uTracks;           // tracks along the road: z from, z to, fresh end z (prints newer than this not yet made), 0/1
uniform vec4 uRiver;            // a river channel across the way: z centre, half width, water level, on
uniform vec4 uBrick;            // the fallen brick: x, z, yaw, on
uniform float uWell, uCairn;    // the well curb and the cairn at Haran (0/1)
uniform vec4 uTowerFar;         // the ruined tower far behind: x, z, scale, on
uniform vec4 uCaravan;          // the caravan on a crest: x of the line, z start, progress (m), on
uniform float uGreen;           // the far valley west greening in the morning (0..1)
uniform float uWindD;
uniform vec3 uPanels;             // where along the road cliff the three name panels are (z)
uniform float uSunLine;         // the sun reaches only above this height (the shadow of the eastern horizon going down at sunrise)

float roadXf(float z) { return 6.0 * sin(z * 0.006) + 2.5 * sin(z * 0.021 + 0.7); }
float roadYf(float z) { return 6.0 * smoothstep(${'${P0}'} - 30.0, ${'${PC}'}, z) * smoothstep(${'${P1}'} + 60.0, ${'${PC}'}, z) - 32.0 * smoothstep(${'${PC}'} + 10.0, 760.0, z); }

// sandstone: a height built of strata, each bed a step with a sloping talus below its cliff
float strata(float h, float bed) {
  // each bed: a near-vertical cliff then a narrow ledge, so the face reads as stacked sandstone
  float k = h / bed, f = fract(k), i = floor(k);
  return (i + mix(f, smoothstep(0.0, 0.82, f), 0.75)) * bed;
}
float terrainLo(vec2 q) {
  float rd = abs(q.x - roadXf(q.y));
  float h = (0.8 * (fbm(q * 0.01, 4) - 0.5) + 1.2 * (fbm(q * 0.003, 3) - 0.5)) * smoothstep(8.0, 60.0, rd);
  // talus aprons at the foot of the dawn cliff and along the pass walls (the cliffs themselves are solids)
  float zf1 = ${'${R1Z}'} + 3.0 * (fbm(vec2(q.x * 0.02, 2.0), 3) - 0.5);
  float talus = 6.0 * smoothstep(zf1 - 16.0, zf1 + 0.5, q.y) * step(q.y, zf1 + 2.0) * smoothstep(260.0, 200.0, abs(q.x));
  float pr = abs(q.x - roadXf(q.y));
  float inPass = smoothstep(${'${P0}'} - 6.0, ${'${P0}'}, q.y) * smoothstep(${'${P1}'} + 6.0, ${'${P1}'}, q.y);
  talus = max(talus, 2.5 * inPass * smoothstep(8.0, 13.0, q.x - roadXf(q.y)) * smoothstep(-2.0, 2.0, q.x - roadXf(q.y)));
  float passFloor = 6.0 * smoothstep(${'${P0}'} - 30.0, ${'${PC}'}, q.y) * smoothstep(${'${P1}'} + 60.0, ${'${PC}'}, q.y);
  // hills far to the west, and a long valley going down to them
  float west = smoothstep(${'${P1}'} + 60.0, 900.0, q.y);
  // the road keeps to a broad valley floor between them
  float hills = west * 110.0 * fbm(q * 0.0025 + 3.0, 5) * smoothstep(70.0, 320.0, rd);
  float fall = -32.0 * smoothstep(${'${PC}'} + 10.0, 760.0, q.y);
  h += max(talus, 0.0) + passFloor + fall + hills;
  return h;
}
float terrain(vec2 q) {
  float h = terrainLo(q);
  float rd = abs(q.x - roadXf(q.y));
  h += 0.05 * (fbm(q * 0.35, 4) - 0.5) + 0.004 * (vnoise(q * 6.0) - 0.5);
  // ripples in the drifted sand
  h += 0.012 * sin(dot(q, vec2(0.9, 0.4)) * 7.0 + 3.0 * fbm(q * 0.3, 3)) * smoothstep(2.5, 6.0, rd);
  // the road: worn a little lower, with cart ruts
  h -= 0.05 * smoothstep(2.6, 1.2, rd);
#ifndef NO_TRACKS
  if (uTracks.w > 0.0 && q.y > uTracks.x && q.y < uTracks.y) {
    float rx = q.x - roadXf(q.y);
    float fresh = smoothstep(uTracks.z + 0.5, uTracks.z - 0.5, q.y);
    h -= fresh * 0.04 * (exp(-pow((rx - 0.75) / 0.09, 2.0)) + exp(-pow((rx + 0.75) / 0.09, 2.0)));
    // footprints and hoofprints scattered along the road
    vec2 g = vec2(rx, q.y) / vec2(0.45, 0.6);
    vec2 id = floor(g), f = fract(g) - 0.5 - (hash22(id) - 0.5) * 0.6;
    float on = step(hash12(id + 3.0), 0.55) * step(abs(id.x * 0.45), 1.6);
    float print = smoothstep(0.32, 0.18, length(f * vec2(1.6 + 0.8 * step(0.5, hash12(id)), 1.0)));
    h -= fresh * on * print * 0.025;
  }
#endif
  // a river channel: banks sloping down to the water
  if (uRiver.w > 0.0) h -= 3.5 * smoothstep(uRiver.y + 6.0, uRiver.y - 2.0, abs(q.y - uRiver.x));
  for (int k = 0; k < 4; k++) {
    float kind = uDecalKind[k];
    if (kind < 0.5) continue;
    vec2 a = vec2(uDecal[k * 4], uDecal[k * 4 + 1]), b = vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]);
    vec2 uv = (q - a) / (b - a);
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
    vec2 cuv = mix(vec2(uDecalUV[k * 4], uDecalUV[k * 4 + 1]), vec2(uDecalUV[k * 4 + 2], uDecalUV[k * 4 + 3]), uv);
    if (kind < 2.5) h -= 0.02 * textureLod(uTextShade, cuv, 0.0).a * 0.5 + 0.04 * textureLod(uText, cuv, 0.0).a;
  }
  return h;
}
vec3 terrainN(vec2 q, float t) {
  float e = 0.005 + t * 0.0012;
  return normalize(vec3(terrain(q - vec2(e, 0.0)) - terrain(q + vec2(e, 0.0)), 2.0 * e, terrain(q - vec2(0.0, e)) - terrain(q + vec2(0.0, e))));
}

// ---------------------------------------------------------------- things on the road
float brickSDx(vec3 p) {
  if (uBrick.w <= 0.0) return 1e5;
  float bnd = length(p - vec3(uBrick.x, p.y, uBrick.y)) - 0.9;
  bnd = max(bnd, abs(p.y - 0.0) - 1.5);
  if (bnd > 0.3) return bnd;
  vec3 q = p - vec3(uBrick.x, terrainLo(uBrick.xy) - 0.05, uBrick.y);
  float c = cos(uBrick.z), s = sin(uBrick.z);
  q.xz = mat2(c, -s, s, c) * q.xz;
  q.yz = mat2(0.97, -0.24, 0.24, 0.97) * q.yz;        // tipped, half in the sand
  float d = sdBox(q - vec3(0.0, 0.08, 0.0), vec3(0.42, 0.075, 0.42) - 0.015) - 0.015;
  // a corner broken off
  d = max(d, -(dot(q - vec3(0.3, 0.1, 0.3), normalize(vec3(1.0, 0.4, 1.0))) ));
  d += 0.006 * (fbm(q * 12.0, 3) - 0.5);
  return d;
}
float roughStone(vec3 q, vec3 size, float seed) {
  return sdBox(q, size - 0.05) - 0.05;
}
float stoneRough(vec3 p) { return 0.03 * (fbm(p * 4.0, 4) - 0.5) + 0.004 * (vnoise(p * 30.0) - 0.5); }
float wellSD(vec3 p) {
  if (uWell <= 0.0) return 1e5;
  vec3 c = vec3(${'${WX}'}, roadYf(${'${WZ}'}) - 0.12, ${'${WZ}'});
  vec3 q = p - c;
  if (length(q) > 2.6) return length(q) - 2.2;
  float ang = atan(q.z, q.x);
  float d = 1e5;
  for (int course = 0; course < 2; course++) {
    float n = 13.0, off = float(course) * 0.5;
    float i = floor(ang / 6.2831 * n + off + 0.5) - off;
    for (int j = -1; j <= 1; j++) {
      float ii = i + float(j);
      float a = (ii + off) / n * 6.2831;
      vec3 sc = vec3(cos(a) * 1.08, 0.2 + float(course) * 0.33, sin(a) * 1.08);
      vec3 sq = q - sc;
      float ca = cos(-a), sa = sin(-a);
      sq.xz = mat2(ca, -sa, sa, ca) * sq.xz;
      float h = hash11(ii * 3.1 + float(course) * 17.0);
      d = min(d, roughStone(sq, vec3(0.2 + 0.05 * h, 0.16 + 0.03 * h, 0.27), ii + float(course) * 9.0));
    }
  }
  return d + (d < 0.1 ? stoneRough(p) : 0.0);
}
float cairnSD(vec3 p) {
  if (uCairn <= 0.0) return 1e5;
  vec3 c = vec3(${'${CX}'}, roadYf(${'${CZ}'}) - 0.1, ${'${CZ}'});
  vec3 q = p - c;
  if (length(q) > 3.0) return length(q) - 2.6;
  float d = 1e5;
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    float ring = fi < 10.0 ? 0.0 : fi < 18.0 ? 1.0 : fi < 23.0 ? 2.0 : 3.0;
    float n = ring == 0.0 ? 10.0 : ring == 1.0 ? 8.0 : ring == 2.0 ? 5.0 : 3.0;
    float j = fi - (ring == 0.0 ? 0.0 : ring == 1.0 ? 10.0 : ring == 2.0 ? 18.0 : 23.0);
    float a = 6.2831 * j / n + ring * 0.7;
    float rr = (1.3 - ring * 0.38) * (0.85 + 0.2 * hash11(fi));
    vec3 sq = q - vec3(cos(a) * rr, 0.22 + ring * 0.36, sin(a) * rr);
    float ra = hash11(fi * 5.3) * 6.28, rb = (hash11(fi * 7.1) - 0.5) * 0.6;
    sq.xz = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * sq.xz;
    sq.xy = mat2(cos(rb), -sin(rb), sin(rb), cos(rb)) * sq.xy;
    vec3 sz = vec3(0.3, 0.17, 0.24) * (0.8 + 0.5 * hash11(fi * 3.1));
    d = min(d, roughStone(sq, sz, fi));
  }
  if (d < 0.1) d += stoneRough(p);
  // the top stone: a flat slab stood on the pile, its face toward the road, the words cut in it
  vec3 tq = q - vec3(0.2, 1.7, 0.0);
  tq.xy = mat2(0.985, 0.17, -0.17, 0.985) * tq.xy;
  float slab = sdBox(tq, vec3(0.09, 0.48, 0.72) - 0.04) - 0.04;
  slab += (0.02 * (fbm(tq * 4.0 + 99.0, 4) - 0.5)) * smoothstep(0.05, -0.03, tq.x);   // the dressed face toward the road stays smooth
  d = min(d, slab);
  return d;
}
// the ruined tower, far off on the eastern horizon
float towerFarSD(vec3 p) {
  if (uTowerFar.w <= 0.0) return 1e5;
  vec3 q = (p - vec3(uTowerFar.x, -22.0, uTowerFar.y)) / uTowerFar.z;
  return towerSD(q) * uTowerFar.z;
}
// the caravan: small dark figures and camels walking a crest line far off
float caravanSD(vec3 p) {
#ifdef NO_CARAVAN
  return 1e5;
#endif
  if (uCaravan.w <= 0.0) return 1e5;
  // the whole caravan's bounding box first
  float zHead = uCaravan.y + uCaravan.z, zTail = zHead - 8.0 * 7.5;
  float zc = 0.5 * (zHead + zTail), hz = 0.5 * (zHead - zTail) + 2.0;
  vec3 bc = vec3(uCaravan.x, terrainLo(vec2(uCaravan.x, zc)) + 1.5, zc);
  float bound = length(max(abs(p - bc) - vec3(3.5, 4.0, hz), 0.0));
  if (bound > 0.5) return bound;
  float d = 1e5;
  for (int i = 0; i < 9; i++) {
    float fi = float(i);
    float z = uCaravan.y + uCaravan.z - fi * 7.5;
    float x = uCaravan.x + 1.5 * sin(fi * 1.7);
    vec3 c = vec3(x, terrainLo(vec2(x, z)), z);
    vec3 q = p - c;
    if (length(q) > 3.5) { d = min(d, length(q) - 3.0); continue; }
    float stride = sin(uTime * 3.2 + fi * 1.9);
    if (mod(fi, 3.0) < 1.5) {
      // a camel: body, hump, neck and head, four legs
      float b = sdEllipsoid(q - vec3(0.0, 1.55, 0.0), vec3(0.35, 0.38, 0.85));
      b = smin(b, sdEllipsoid(q - vec3(0.0, 1.95, -0.05), vec3(0.26, 0.3, 0.35)), 0.15);
      b = smin(b, sdCapsule(q, vec3(0.0, 1.7, 0.7), vec3(0.0, 2.3, 1.05), 0.1), 0.1);
      b = smin(b, sdEllipsoid(q - vec3(0.0, 2.35, 1.2), vec3(0.1, 0.1, 0.22)), 0.05);
      for (int l = 0; l < 4; l++) {
        float fl = float(l), sx = fl < 1.5 ? 0.6 : -0.6, side = mod(fl, 2.0) < 0.5 ? 0.18 : -0.18;
        float sw = 0.25 * stride * (mod(fl, 2.0) < 0.5 ? 1.0 : -1.0);
        b = min(b, sdCapsule(q, vec3(side, 1.35, sx), vec3(side, 0.0, sx + sw), 0.06));
      }
      d = min(d, b);
    } else {
      // a walker, cloaked, a staff
      float w = sdRoundCone(q, vec3(0.0, 0.1, 0.0), vec3(0.0, 1.45, 0.0), 0.28, 0.16);
      w = smin(w, length(q - vec3(0.0, 1.66, 0.04)) - 0.12, 0.06);
      w = min(w, sdCapsule(q, vec3(0.25, 0.0, 0.25 * stride), vec3(0.3, 1.9, 0.1), 0.025));
      d = min(d, w);
    }
  }
  return d;
}
// the dawn cliff: a wall of sandstone beds behind a wandering face line, seams between the beds
float bedSeam(float y) { float f = fract(y / 6.5); return smoothstep(0.9, 0.975, f) * smoothstep(1.0, 0.975, f); }
float cliff1SD(vec3 p) {
  // a cheap bound first: the block the cliff lives in
  float bound = max(max(abs(p.x) - 270.0, ${'${R1Z}'} - 12.0 - p.z), p.y - 62.0);
  if (bound > 2.0) return bound;
  // buttresses and recesses along the face, gullies cut back into it, each bed stepping back a little
  // the middle of the face is a broad smooth panel where the name is cut
  float panel = smoothstep(36.0, 58.0, abs(p.x));
  float gully = pow(sat(1.0 - abs(fbm(vec2(p.x * 0.03, 7.0), 4) * 2.0 - 1.0)), 3.0) * panel;
  float jx = p.x / 9.1 + 0.6 * fbm(vec2(p.y * 0.04, p.x * 0.01), 3);
  float joint = smoothstep(0.05, 0.0, abs(fract(jx) - 0.5) - 0.45) * step(0.6, hash11(floor(jx) * 3.7)) * smoothstep(0.3, 0.6, fbm(vec2(floor(jx), p.y * 0.06), 2));
  float zf = ${'${R1Z}'} + 6.0 * (fbm(vec2(p.x * 0.025, 2.0), 4) - 0.5) * (0.3 + 0.7 * panel) + 9.0 * gully + 2.2 * (fbm(vec2(p.x * 0.08, p.y * 0.05), 4) - 0.5) * (0.35 + 0.65 * panel) + 0.6 * bedSeam(p.y) + 0.24 * floor(max(p.y, 0.0) / 6.5) + 0.5 * joint;
  float top = 44.0 + 10.0 * (fbm(vec2(p.x * 0.012, 0.0), 3) - 0.5) - 14.0 * gully;
  float d = max(zf - p.z, p.y - top);
  d = max(d, abs(p.x) - 240.0 - 20.0 * fbm(vec2(p.y * 0.05, 1.0), 2));
  if (d < 1.5) d += 0.25 * (fbm(p * 0.45, 4) - 0.5) + 0.04 * (vnoise(p * 3.0) - 0.5);
  return d * 0.55;
}
// the cliff along the road below the pass: a wall of sandstone on the road's +x side, its face looking
// -x toward the road, three smooth panels in it where the name is cut
float passSD(vec3 p) {
  float bound = max(max(${'${P0}'} - 60.0 - p.z, p.z - (${'${P1}'} + 30.0)), max(roadXf(p.z) + 8.0 - p.x, p.y - 70.0));
  if (bound > 2.0) return bound;
  float u = p.z;
  float panel = min(min(smoothstep(4.0, 9.0, abs(u - uPanels.x)), smoothstep(4.0, 9.0, abs(u - uPanels.y))), smoothstep(4.0, 9.0, abs(u - uPanels.z)));
  float gully = pow(sat(1.0 - abs(fbm(vec2(u * 0.04, 3.0), 4) * 2.0 - 1.0)), 3.0) * panel;
  float jx = u / 8.3 + 0.6 * fbm(vec2(p.y * 0.04, u * 0.01), 3);
  float joint = smoothstep(0.05, 0.0, abs(fract(jx) - 0.5) - 0.45) * step(0.6, hash11(floor(jx) * 5.1)) * smoothstep(0.3, 0.6, fbm(vec2(floor(jx), p.y * 0.06), 2));
  float xf = roadXf(p.z) + 13.0 + 4.0 * (fbm(vec2(u * 0.03, 2.0), 4) - 0.5) * (0.3 + 0.7 * panel) + 6.0 * gully + 2.0 * (fbm(vec2(u * 0.09, p.y * 0.05), 4) - 0.5) * (0.35 + 0.65 * panel) + (0.6 * bedSeam(p.y) + 0.5 * joint) * panel + 0.24 * floor(max(p.y, 0.0) / 6.5);
  float top = 38.0 + 10.0 * (fbm(vec2(u * 0.012, 5.0), 3) - 0.5) - 12.0 * gully;
  // the cliff ends past the crest, falling away to the west
  top -= 40.0 * smoothstep(${'${P1}'} - 10.0, ${'${P1}'} + 25.0, p.z) + 30.0 * smoothstep(${'${P0}'} - 20.0, ${'${P0}'} - 55.0, p.z);
  float d = max(xf - p.x, p.y - top);
  if (d < 1.5) d += 0.25 * (fbm(p * 0.45, 4) - 0.5) + 0.04 * (vnoise(p * 3.0) - 0.5);
  return d * 0.55;
}
uniform float uCliffs;            // 1: the dawn cliff, 2: the pass, 3: both
uniform float uRocks[12];         // up to 3 great rocks by the road: x, z, height, face (-1: dressed face looks -x, 1: looks +x)
float rocksSD(vec3 p) {
  float d = 1e5;
  for (int k = 0; k < 3; k++) {
    float h = uRocks[k * 4 + 2];
    if (h <= 0.0) continue;
    vec3 c = vec3(uRocks[k * 4], terrainLo(vec2(uRocks[k * 4], uRocks[k * 4 + 1])) - 1.0, uRocks[k * 4 + 1]);
    vec3 q = p - c;
    if (length(q) > h * 2.0 + 4.0) { d = min(d, length(q) - h * 2.0); continue; }
    float f = uRocks[k * 4 + 3];
    // a weathered block of sandstone, its face toward the road cut flat and dressed
    // a squared block, weathered round at its edges, undercut at its foot
    float r = sdBox(q - vec3(0.0, h * 0.5, 0.0), vec3(h * 0.4, h * 0.5, h * 0.62) - h * 0.12) - h * 0.12;
    r = smax(r, length(q.xz) - h * (0.62 + 0.12 * sat(q.y / h)) , h * 0.1);
    r = smax(r, f * q.x - h * 0.3, 0.4);                          // the dressed face
    r = smax(r, -q.y + 0.2, 0.3);
    r = smax(r, dot(q - vec3(0.0, h * 0.95, 0.0), normalize(vec3(-f * 0.3, 1.0, 0.2))), 0.6);   // a sloping broken top
    float dressed = smoothstep(0.6, 0.0, abs(f * q.x - h * 0.3));
    r += (0.9 * (fbm(q * 0.25, 4) - 0.5) + 0.25 * (fbm(q * 1.1, 3) - 0.5) + 0.05 * (vnoise(q * 4.0) - 0.5)) * (1.0 - 0.9 * dressed) + 0.3 * bedSeam(p.y * 2.3) * (1.0 - dressed);
    d = min(d, r * 0.7);
  }
  return d;
}
// mat: 1 brick, 2 well, 3 cairn, 4 tower, 5 caravan, 6 cliff
float objectsSD(vec3 p, out float mat) {
  mat = 0.0; float d = 1e5;
  float b = brickSDx(p); if (b < d) { d = b; mat = 1.0; }
  float w = wellSD(p); if (w < d) { d = w; mat = 2.0; }
  float c = cairnSD(p); if (c < d) { d = c; mat = 3.0; }
  float t = towerFarSD(p); if (t < d) { d = t; mat = 4.0; }
  float v = caravanSD(p); if (v < d) { d = v; mat = 5.0; }
  if (mod(uCliffs, 2.0) > 0.5) { float c1 = cliff1SD(p); if (c1 < d) { d = c1; mat = 6.0; } }
  if (uCliffs > 1.5) { float c2 = passSD(p); if (c2 < d) { d = c2; mat = 6.0; } }
  float rk = rocksSD(p); if (rk < d) { d = rk; mat = 6.0; }
  return d;
}
vec3 objectsN(vec3 p) {
  vec2 e = vec2(0.001, 0.0); float m;
  return normalize(vec3(objectsSD(p + e.xyy, m) - objectsSD(p - e.xyy, m), objectsSD(p + e.yxy, m) - objectsSD(p - e.yxy, m), objectsSD(p + e.yyx, m) - objectsSD(p - e.yyx, m)));
}

vec3 rockAlb(vec3 p) {
  vec3 stone = mix(vec3(0.5, 0.36, 0.25), vec3(0.7, 0.53, 0.37), smoothstep(0.2, 0.8, fbm(vec2(p.y * 1.3, (p.x + p.z) * 0.05), 3)));
  stone *= 0.75 + 0.4 * fbm(vec2(p.x + p.z, p.y) * 0.35, 5);
  stone *= 0.88 + 0.14 * sin(p.y * 4.0 + (p.x + p.z) * 0.6 + 4.0 * fbm(vec2(p.x + p.z, p.y) * 0.2, 3));
  stone *= 0.8 + 0.35 * fbm(vec2(p.x + p.z, p.y) * 1.3, 4);
  stone *= 1.0 - 0.3 * bedSeam(p.y);
  stone = mix(stone, stone * 0.55, smoothstep(0.55, 0.8, fbm(vec2(p.x + p.z, p.y * 0.2) * 0.15, 3)) * 0.5);
  return stone;
}
// cut words on a cliff face at p (normal n): emission and albedo darkening
vec4 wallWords(vec3 p, inout vec3 n, inout vec3 alb) {
  vec4 res = vec4(0.0);
  for (int k = 0; k < 6; k++) {
    float on = uWDecalOn[k];
    if (on <= 0.0 || abs(n.y) > 0.55) continue;
    float ax = uWDecal[k * 8], pc = uWDecal[k * 8 + 1];
    float u0 = uWDecal[k * 8 + 2], u1 = uWDecal[k * 8 + 3], y0 = uWDecal[k * 8 + 4], y1 = uWDecal[k * 8 + 5];
    float along, depth; vec3 tx;
    if (ax < 0.5) { along = p.x; depth = abs(p.z - pc); tx = vec3(-1.0, 0.0, 0.0); }       // face looks toward -z: a reader looking +z has -x on the right
    else if (ax < 1.5) { along = p.z; depth = abs(p.x - pc); tx = vec3(0.0, 0.0, -1.0); }  // looks +x
    else { along = p.z; depth = abs(p.x - pc); tx = vec3(0.0, 0.0, 1.0); }                 // looks -x
    if (depth > 9.0) continue;
    vec2 uv = vec2((along - u0) / (u1 - u0), (p.y - y0) / (y1 - y0));
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
    vec2 cuv = mix(vec2(uWDecalUV[k * 4], uWDecalUV[k * 4 + 1]), vec2(uWDecalUV[k * 4 + 2], uWDecalUV[k * 4 + 3]), uv);
    vec4 tc = texture(uText, cuv);
    vec2 sp = 1.0 / vec2(textureSize(uTextShade, 0));
    float sx = texture(uTextShade, cuv + vec2(sp.x, 0.0)).a - texture(uTextShade, cuv - vec2(sp.x, 0.0)).a;
    float sy = texture(uTextShade, cuv + vec2(0.0, sp.y)).a - texture(uTextShade, cuv - vec2(0.0, sp.y)).a;
    n = normalize(n + (tx * sx - vec3(0.0, sy, 0.0)) * 6.0 * (1.0 - tc.a) * on);
    // the cut: shadowed walls, a darker floor; the sun reaches into it where it faces the sun
    alb = mix(alb, alb * 0.42, tc.a * on);
    res.a = max(res.a, tc.a * on);
  }
  return res;
}
`;

const SHADE = /* glsl */ `
vec3 atmosphere(vec3 col, vec3 ro, vec3 rd, float t) {
  float fog = 1.0 - exp(-t * uFogDen * (0.35 + 0.65 * exp(-max(ro.y, 0.0) * 0.01)));
  vec3 fc = uFogCol + uSunCol * 0.35 * pow(max(dot(rd, uSunDir), 0.0), 6.0);
  return mix(col, fc, fog);
}
float shadowT(vec3 p, vec3 l) {
  float res = 1.0, t = 0.05;
  for (int i = 0; i < 40; i++) {
    vec3 q = p + l * t; float m;
    float h = min(q.y - terrainLo(q.xz) + 0.1 * exp(-t), objectsSD(q, m));
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.08, 12.0);
    if (res < 0.01 || t > 600.0) break;
  }
  return sat(res);
}
vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.05, hit = -1.0, mat = 0.0;
  for (int i = 0; i < 340; i++) {
    vec3 p = ro + rd * t;
    float hg = p.y - (t < 45.0 ? terrain(p.xz) : terrainLo(p.xz));
    float m; float o = objectsSD(p, m);
    if (hg < 0.0015 * t) {
      float lo = t - max(0.02, hg * 0.5 + 0.02), hi = t;
      for (int k = 0; k < 6; k++) { float mid = 0.5 * (lo + hi); vec3 q = ro + rd * mid; if (q.y - terrain(q.xz) < 0.0) hi = mid; else lo = mid; }
      hit = hi; mat = 0.0; break;
    }
    if (o < 0.0005 * t + 0.0003) { hit = t; mat = m; break; }
    t += min(o, max(0.01 + t * 0.005, hg * 0.5));
    if (t > 6000.0 || (p.y > 600.0 && rd.y > 0.0)) break;
  }
  float depth = hit < 0.0 ? 1e5 : hit;
#ifdef DBG_MAT
  { vec3 hp = ro + rd * hit; return vec3(mat == 6.0 ? 1.0 : 0.0, hp.y / 100.0, (hp.z - 100.0) / 100.0) * 0.4; }
#endif
  vec3 col;
  float tw = (uRiver.w > 0.0 && rd.y < 0.0) ? (uRiver.z - ro.y) / rd.y : -1.0;
  bool water = tw > 0.0 && (hit < 0.0 || tw < hit) && abs((ro + rd * tw).z - uRiver.x) < uRiver.y + 4.0;
  if (water) {
    vec3 p = ro + rd * tw;
    vec2 q = p.xz; float e = 0.03;
    float h0 = fbm(q * vec2(0.3, 0.9) + vec2(uTime * 0.2, 0.0), 4) * 0.02;
    float hx = fbm((q + vec2(e, 0.0)) * vec2(0.3, 0.9) + vec2(uTime * 0.2, 0.0), 4) * 0.02;
    float hz = fbm((q + vec2(0.0, e)) * vec2(0.3, 0.9) + vec2(uTime * 0.2, 0.0), 4) * 0.02;
    vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
    vec3 r = reflect(rd, n);
    float fres = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    // the ridge in the water: march the terrain along the reflected ray (cheaply)
    float tr = 0.5; vec3 refl = skyColor(r, 0.0) * uExposureSky;
    for (int k = 0; k < 60; k++) {
      vec3 qq = p + r * tr;
      float hh = qq.y - terrainLo(qq.xz);
      if (hh < 0.02 * tr) {
        float lit2 = sat(-uSunDir.z) * 0.6;
        refl = atmosphere(vec3(0.5, 0.35, 0.24) * (uSunCol * lit2 + uAmb), p, r, tr);
        break;
      }
      tr += max(hh * 0.5, 0.2 + tr * 0.02);
      if (tr > 800.0) break;
    }
    col = mix(vec3(0.02, 0.025, 0.02) + uAmb * 0.2, refl, fres);
    col = atmosphere(col, ro, rd, tw);
    depth = tw;
  } else if (hit < 0.0) {
    col = skyColor(rd, 0.0) * uExposureSky;
  } else {
    vec3 p = ro + rd * hit;
    vec3 n, alb; vec3 emit = vec3(0.0);
    if (mat == 0.0) {
      n = terrainN(p.xz, hit);
      float rd2 = abs(p.x - roadXf(p.z));
      float slope = 1.0 - n.y;
      // sand, gravel, the worn road, and the sandstone where it is steep: banded by its beds
      vec3 sand = mix(vec3(0.55, 0.42, 0.29), vec3(0.67, 0.53, 0.37), fbm(p.xz * 0.2, 4));
      vec3 gravel = mix(vec3(0.42, 0.35, 0.27), vec3(0.55, 0.46, 0.35), vnoise(p.xz * 3.0));
      alb = mix(sand, gravel, smoothstep(0.45, 0.7, fbm(p.xz * 0.05, 3)) * 0.7);
      alb = mix(alb, vec3(0.5, 0.41, 0.3), smoothstep(2.6, 1.4, rd2) * 0.6);
      float bed = fract(p.y / 6.5);
      vec3 stone = mix(vec3(0.62, 0.4, 0.26), vec3(0.78, 0.55, 0.36), smoothstep(0.2, 0.8, fbm(vec2(p.y * 1.3, (p.x + p.z) * 0.05), 3)));
      stone *= 0.88 + 0.14 * sin(p.y * 4.0 + (p.x + p.z) * 0.6 + 4.0 * fbm(vec2(p.x + p.z, p.y) * 0.2, 3));   // cross-bedding
      stone *= 0.8 + 0.35 * fbm(vec2(p.x + p.z, p.y) * 1.3, 4);
      stone *= 1.0 - 0.25 * smoothstep(0.8, 1.0, bed);                                       // the dark seam under each bed
      stone = mix(stone, stone * 0.55, smoothstep(0.55, 0.8, fbm(vec2(p.x + p.z, p.y * 0.2) * 0.15, 3)) * 0.5);   // desert varnish streaks
      alb = mix(alb, stone, smoothstep(0.25, 0.55, slope));
      // the far valley west, greening in the morning
      alb = mix(alb, mix(vec3(0.2, 0.3, 0.12), vec3(0.3, 0.38, 0.16), fbm(p.xz * 0.02, 3)), uGreen * smoothstep(${'${P1}'} + 300.0, 1600.0, p.z) * smoothstep(0.4, 0.1, slope));
      if (uRiver.w > 0.0) alb = mix(alb, vec3(0.2, 0.17, 0.13), smoothstep(uRiver.y + 4.0, uRiver.y, abs(p.z - uRiver.x)));
      for (int k = 0; k < 4; k++) {
        float kind = uDecalKind[k];
        if (kind < 0.5) continue;
        vec2 a = vec2(uDecal[k * 4], uDecal[k * 4 + 1]), b = vec2(uDecal[k * 4 + 2], uDecal[k * 4 + 3]);
        vec2 uv = (p.xz - a) / (b - a);
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
        vec2 cuv = mix(vec2(uDecalUV[k * 4], uDecalUV[k * 4 + 1]), vec2(uDecalUV[k * 4 + 2], uDecalUV[k * 4 + 3]), uv);
        vec4 tx = texture(uText, cuv);
        if (kind < 2.5) alb = mix(alb, alb * 0.22, tx.a);
        else {
          vec3 ash = mix(vec3(0.4, 0.39, 0.38), vec3(0.58, 0.57, 0.55), fbm(p.xz * 6.0, 3));
          float area = sat(texture(uTextShade, cuv).a * 5.0 + 0.7) * smoothstep(0.0, 0.08, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)) + 0.02 * fbm(p.xz * 3.0, 2));
          alb = mix(alb, ash, area * (1.0 - tx.a));
          alb = mix(alb, vec3(0.08, 0.06, 0.045), tx.a);
        }
      }
      vec4 w = wallWords(p, n, alb);
      emit += w.rgb;
    } else {
      n = objectsN(p);
      if (mat == 1.0) {
        alb = vec3(0.5, 0.36, 0.24) * (0.8 + 0.3 * fbm(p * 10.0, 3));
      } else if (mat == 2.0 || mat == 3.0) {
        alb = mix(vec3(0.38, 0.32, 0.25), vec3(0.58, 0.5, 0.39), fbm(p * 3.0, 4)) * (0.75 + 0.4 * fbm(p * 11.0, 3));
        alb = mix(alb, vec3(0.45, 0.47, 0.36), 0.4 * smoothstep(0.65, 0.8, fbm(p * 5.0 + 3.0, 3)));
      } else if (mat == 4.0) {
        alb = vec3(0.45, 0.35, 0.25);
      } else if (mat == 6.0) {
        alb = rockAlb(p);
      } else alb = vec3(0.05, 0.04, 0.035);
      vec4 w = wallWords(p, n, alb);
      emit += w.rgb;
    }
    float sh = hit > 900.0 ? 1.0 : shadowT(p + n * 0.02, uSunDir);
    vec3 lit = uSunCol * sat(dot(n, uSunDir)) * sh * smoothstep(uSunLine - 2.5, uSunLine + 2.5, p.y) + uAmb * (0.6 + 0.4 * n.y) + (uSkyHor * 0.25 + uSkyTop * 1.1) * sat(n.y * 0.5 + 0.5);
    // light bounced off the sunlit sand onto steep faces
    lit += uSunCol * 0.12 * sat(-n.y + 0.4) * sat(uSunDir.y * 3.0);
    col = alb * lit + emit;
    col = atmosphere(col, ro, rd, hit);
  }
  // dust blown along the ground
  if (uWindD > 0.0) {
    float acc = 0.0;
    for (int k = 0; k < 8; k++) {
      float tt = 1.0 + float(k) * float(k) * 0.9;
      if (tt > depth) break;
      vec3 q = ro + rd * tt;
      acc += fbm(q * 0.35 - vec3(uTime * 2.0, 0.0, uTime * 0.5) * uWindD, 4) * exp(-max(q.y - terrainLo(q.xz), 0.0) * 1.2);
    }
    col = mix(col, uFogCol * 1.2 + uSunCol * 0.1, sat(acc * 0.05 * uWindD));
  }
#ifndef NO_MOTES
  col += lifeMotes(ro, rd, depth, ro + rd * 3.0, vec3(3.0, 1.5, 3.0), 30, 0.003, vec3(0.6, 0.05, 0.3) * uWindD, vec3(1.0, 0.85, 0.6) * 0.12, 13.0);
#endif
  return col;
}
`;

export function desertFrag(extra = '') {
  const F = (x) => Number(x).toFixed(3);
  const sub = (s) => s.replaceAll('${R1Z}', F(RIDGE1.z)).replaceAll('${P0}', F(PASS.z0)).replaceAll('${P1}', F(PASS.z1)).replaceAll('${PC}', F(PASS.crest))
    .replaceAll('${WX}', F(WELL[0])).replaceAll('${WZ}', F(WELL[1])).replaceAll('${CX}', F(CAIRN[0])).replaceAll('${CZ}', F(CAIRN[1]));
  const defs = extra.split('\n').filter((l) => l.startsWith('#define')).join('\n') + '\n';
  return defs + LIFE_GLSL + G_COMMON + TOWER_GLSL + sub(DESERT_GLSL) + extra + sub(SHADE);
}

// wall decals: [{ axis: 'z-' | 'x+' | 'x-', at, u0, u1, y0, y1, uv: [u0, v0, u1, v1], on }]
export function wallDecals(list) {
  const a = new Array(48).fill(0), b = new Array(24).fill(0), on = new Array(6).fill(0);
  list.forEach((d, i) => {
    a.splice(i * 8, 8, d.axis === 'z-' ? 0 : d.axis === 'x+' ? 1 : 2, d.at, d.u0, d.u1, d.y0, d.y1, 0, 0);
    b.splice(i * 4, 4, ...d.uv);
    on[i] = d.on ?? 1;
  });
  return { uWDecal: a, uWDecalUV: b, uWDecalOn: on };
}

export function desertScene(P, o) {
  const sky0 = o.sky(P.from);
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: o.textSize ?? [4096, 4096],
    frag: desertFrag((P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '')),
    uniforms: {
      ...sky0, uExposureSky: 1,
      uWDecal: new Array(48).fill(0), uWDecalUV: new Array(24).fill(0), uWDecalOn: new Array(6).fill(0),
      uDecal: new Array(16).fill(0), uDecalUV: new Array(16).fill(0), uDecalKind: [0, 0, 0, 0],
      uTracks: [0, 0, 0, 0], uRiver: [0, 1, 0, 0], uBrick: [0, 0, 0, 0], uWell: 0, uCairn: 0, uTowerFar: [0, 0, 1, 0], uCaravan: [0, 0, 0, 0], uGreen: 0, uWindD: 0.3, uSunLine: -1e4, uCliffs: 0, uRocks: new Array(12).fill(0), uPanels: [0, 0, 0],
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
