// The river upstream: a wide slow river at night, black water reflecting the stars and the fires, a
// steep bank of grey clay cut by the current on the right as you go upstream, the far bank a low line
// of reeds. Along the bank top a scarlet thread runs on low stakes from camp to camp; at each camp a
// small fire burns on the bank top, a few stones round it, and side threads branch off inland into
// the dark. Names and lines are cut into the clay face of the bank by each camp. The sky can run fast
// (the days growing shorter). At Ur the same water carries clay lamps on little reed rafts, tied to
// one another by cords, and a stretch of the bank is dry cracked mud.
//
// Metres, y up, water at y = 0; upstream is +z; the near bank's face runs along x = bankX(z), the land
// on its -x side.
import { G_COMMON } from '/song/lib/g-common.js';
import { LIFE_GLSL } from '/kit/life.js';

export const bankX = (z) => -6 + 1.2 * Math.sin(z * 0.045) + 0.5 * Math.sin(z * 0.13 + 1.0);
export const BANK_H = 1.6;

export const RIVER_GLSL = /* glsl */ `
uniform float uExposureSky, uSpin, uWind;
uniform float uCamps[24];       // up to 12 camps: z of each camp, and its fire (0..1)
uniform float uThreadZ[2];      // the thread runs from z0 to z1 along the bank top
uniform float uBranch[24];      // side threads: z where each leaves the main thread, and its angle inland
uniform float uTextZ[2];        // the bank face carries text from z0 to z1 (canvas u = 1 - (z - z0) / (z1 - z0))
uniform float uLamps[48];       // up to 12 floating lamps: x, z, flame (0..1), size
uniform float uCords[48];       // up to 12 cords between lamps: index a, index b, slack, 0
uniform float uDryZ[2];         // the bank's foot is dry cracked mud from z0 to z1
uniform float uDay;             // 0 night .. 1 day: the sky running through days

float bankXf(float z) { return -6.0 + 1.2 * sin(z * 0.045) + 0.5 * sin(z * 0.13 + 1.0); }
float bankTop(vec2 q) { return ${'${BH}'} + 0.35 * (fbm(q * 0.08, 3) - 0.5) + 0.006 * max(bankXf(q.y) - q.x, 0.0); }
// the land as a heightfield: the bank top inland of the face, the riverbed out from it (the face itself
// is a vertical wall in sceneSD)
float land(vec2 q, bool detail) {
  float d = q.x - bankXf(q.y);                         // > 0 out over the river
  float h;
  if (d < 0.0) {
    h = bankTop(q);
    if (detail) h += 0.03 * (fbm(q * 2.0, 4) - 0.5);
  } else {
    h = -0.7 - 1.3 * smoothstep(0.0, 14.0, d);
    if (detail && q.y > uDryZ[0] && q.y < uDryZ[1] && d < 5.0) {
      // the dry stretch: cracked plates of mud at the bank's foot, a little above the water
      vec2 vc = voronoiEdge(q * 3.2 + 0.6 * vec2(fbm(q * 1.5, 3), fbm(q * 1.5 + 4.0, 3)));
      float plate = 0.14 - 0.06 * smoothstep(0.07, 0.0, vc.x) + 0.015 * smoothstep(0.15, 0.03, vc.x) + 0.012 * (vc.y - 0.5);
      h = max(h, plate * smoothstep(5.0, 3.5, d) * smoothstep(uDryZ[0], uDryZ[0] + 2.0, q.y) * smoothstep(uDryZ[1], uDryZ[1] - 2.0, q.y));
    }
  }
  // the far bank, low and flat
  h = max(h, -0.6 + 0.9 * smoothstep(70.0, 90.0, q.x));
  return h;
}
// the cut face of the bank: a wall on the bank's line, slightly uneven, from the riverbed to the bank top
float faceSD(vec3 p) {
  // the cut face: smooth where the water has scoured it, with runnels, ledges of harder clay and a few
  // slumps; the words are cut where it is smoothest
  float bx = bankXf(p.z) + 0.006 * (fbm(vec2(p.z * 2.0, p.y * 3.0), 3) - 0.5)
;
  float d = p.x - bx;
  return max(d, p.y - bankTop(p.xz)) * 0.9;
}
vec3 landN(vec2 q, float t) {
  float e = 0.004 + t * 0.001;
  return normalize(vec3(land(q - vec2(e, 0.0), true) - land(q + vec2(e, 0.0), true), 2.0 * e, land(q - vec2(0.0, e), true) - land(q + vec2(0.0, e), true)));
}

// stakes on the bank top, and the scarlet thread sagging between them
const float STAKE_DZ = 3.2;
vec3 stakeAt(float i) { float z = i * STAKE_DZ; return vec3(bankXf(z) - 1.2, ${'${BH}'} + 0.4 * (fbm(vec2(bankXf(z) - 1.2, z) * 0.08, 3) - 0.5), z); }
float stakes(vec3 p) {
  if (p.z < uThreadZ[0] - 1.0 || p.z > uThreadZ[1] + 1.0) return 1e5;
  float i = floor(p.z / STAKE_DZ + 0.5);
  vec3 s = stakeAt(i);
  vec3 q = p - s;
  float d = sdCapsule(q, vec3(0.0, -0.1, 0.0), vec3(0.02 * sin(i * 3.1), 0.55, 0.0), 0.022);
  return d;
}
// distance to the thread (a sagging curve between stake tops), in the plane of the bank top
float threadD(vec3 p) {
  if (p.z < uThreadZ[0] || p.z > uThreadZ[1]) return 1e5;
  float i0 = floor(p.z / STAKE_DZ);
  vec3 a = stakeAt(i0) + vec3(0.0, 0.52, 0.0), b = stakeAt(i0 + 1.0) + vec3(0.0, 0.52, 0.0);
  float s = (p.z - a.z) / (b.z - a.z);
  vec3 c = mix(a, b, s) - vec3(0.0, 0.12 * 4.0 * s * (1.0 - s), 0.0);
  return length(p.xy - c.xy);
}
// side threads leaving the main thread inland (-x) at an angle, sagging to the ground in the dark
float branchD(vec3 p) {
  float d = 1e5;
  for (int k = 0; k < 12; k++) {
    float z0 = uBranch[k * 2];
    if (z0 < -1e3) continue;
    float ang = uBranch[k * 2 + 1];
    vec3 a = vec3(bankXf(z0) - 1.2, ${'${BH}'} + 0.45, z0);
    vec3 dir = normalize(vec3(-cos(ang), 0.0, sin(ang)));
    vec3 ap = p - a;
    float s = clamp(dot(ap, dir), 0.0, 14.0);
    vec3 c = a + dir * s - vec3(0.0, 0.03 * s, 0.0);
    d = min(d, length(p - c));
  }
  return d;
}

// cords tying the lamps' rafts to one another, lying just on the water
float cordD(vec3 p) {
  float d = 1e5;
  for (int k = 0; k < 12; k++) {
    float sl = uCords[k * 4 + 2];
    if (sl <= 0.0) continue;
    int ia = int(uCords[k * 4]), ib = int(uCords[k * 4 + 1]);
    vec3 a = vec3(uLamps[ia * 4], 0.02, uLamps[ia * 4 + 1]), b = vec3(uLamps[ib * 4], 0.02, uLamps[ib * 4 + 1]);
    vec3 ab = b - a; float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    vec3 c = a + ab * h;
    // a taut cord runs straight; a slack one bows out sideways along the water
    vec3 side = normalize(cross(ab, vec3(0.0, 1.0, 0.0)));
    c += side * (sl - 1.0) * 0.6 * 4.0 * h * (1.0 - h) * length(ab) * 0.25;
    d = min(d, length(p - c));
  }
  return d;
}
// a floating clay lamp on a disc of bound reeds
float lampRaft(vec3 p, int k, out vec3 wick) {
  vec3 c = vec3(uLamps[k * 4], 0.0, uLamps[k * 4 + 1]);
  float s = uLamps[k * 4 + 3];
  vec3 q = (p - c) / s;
  float bob = 0.012 * sin(uTime * 1.3 + float(k) * 2.1);
  q.y -= bob;
  float raft = max(length(q.xz) - 0.16, abs(q.y) - 0.018) - 0.006;
  raft += 0.004 * sin(atan(q.z, q.x) * 18.0);
  vec3 lq = q - vec3(0.0, 0.016, 0.0);
  float a = float(k) * 1.7;
  lq.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * lq.xz;
  float lamp = lampSD(lq + vec3(0.02, 0.0, 0.0));
  vec3 w = LAMP_WICK - vec3(0.02, 0.0, 0.0);
  w.xz = mat2(cos(a), sin(a), -sin(a), cos(a)) * w.xz;
  wick = c + (w + vec3(0.0, 0.016 + bob, 0.0)) * s;
  return min(raft, lamp) * s;
}

// mat: 1 land, 2 stake, 3 raft/lamp
float sceneSD(vec3 p, out float mat) {
  mat = 0.0; float d = 1e5;
  float fa = faceSD(p);
  if (fa < d) { d = fa; mat = 4.0; }
  float st = stakes(p);
  if (st < d) { d = st; mat = 2.0; }
  for (int k = 0; k < 12; k++) {
    if (uLamps[k * 4 + 3] <= 0.0) continue;
    vec3 c = vec3(uLamps[k * 4], 0.0, uLamps[k * 4 + 1]);
    float bd = length(p - c) - 0.3 * uLamps[k * 4 + 3];
    if (bd > 0.1) { d = min(d, bd); continue; }
    vec3 w; float r = lampRaft(p, k, w);
    if (r < d) { d = r; mat = 3.0; }
  }
  return d;
}
vec3 sceneN(vec3 p) {
  vec2 e = vec2(0.0008, 0.0); float m;
  return normalize(vec3(sceneSD(p + e.xyy, m) - sceneSD(p - e.xyy, m), sceneSD(p + e.yxy, m) - sceneSD(p - e.yxy, m), sceneSD(p + e.yyx, m) - sceneSD(p - e.yyx, m)));
}

// light from the camp fires and the floating lamps near p
vec3 campFire(int k) { float z = uCamps[k * 2]; return vec3(bankXf(z) - 2.4, ${'${BH}'} + 0.4 * (fbm(vec2(bankXf(z) - 2.4, z) * 0.08, 3) - 0.5) + 0.12, z); }
vec3 fireLight(vec3 p, vec3 n) {
  vec3 acc = vec3(0.0);
  for (int k = 0; k < 12; k++) {
    float f = uCamps[k * 2 + 1];
    if (f <= 0.0) continue;
    vec3 c = campFire(k) + vec3(0.0, 0.35, 0.0);
    vec3 d = c - p; float r2 = dot(d, d);
    if (r2 > 900.0) continue;
    acc += vec3(1.0, 0.45, 0.15) * 4.0 * f * lifeFlicker(uTime, float(k) * 3.3) * sat(dot(n, d * inversesqrt(r2)) * 0.8 + 0.2) / (r2 + 0.5);
  }
  for (int k = 0; k < 12; k++) {
    float f = uLamps[k * 4 + 2], s = uLamps[k * 4 + 3];
    if (f <= 0.0 || s <= 0.0) continue;
    vec3 c = vec3(uLamps[k * 4], 0.12 * s, uLamps[k * 4 + 1]);
    vec3 d = c - p; float r2 = dot(d, d);
    acc += vec3(1.0, 0.5, 0.2) * 0.35 * f * s * lifeFlicker(uTime, float(k) * 5.1 + 2.0) * sat(dot(n, d * inversesqrt(r2)) * 0.8 + 0.2) / (r2 + 0.05);
  }
  return acc;
}
`;

const SHADE = /* glsl */ `
vec3 sky(vec3 rd) { return skyColor(rd, uSpin) * uExposureSky; }
vec3 atmosphere(vec3 col, vec3 ro, vec3 rd, float t) {
  float fog = 1.0 - exp(-t * uFogDen);
  vec3 fc = uFogCol + uSunCol * 0.2 * pow(max(dot(rd, uSunDir), 0.0), 6.0);
  return mix(col, fc, fog);
}
// march the land (heightfield) and the small things
float marchLand(vec3 ro, vec3 rd, float tmax, out float mat) {
  float t = 0.02; mat = 0.0;
  for (int i = 0; i < 260; i++) {
    vec3 p = ro + rd * t;
    float h = p.y - land(p.xz, t < 60.0);
    float m; float o = sceneSD(p, m);
    if (o < 0.0004 * t + 0.0002) { mat = m; return t; }
    if (h < 0.001 * t) {
      float lo = t - max(0.01, h * 0.5 + 0.01), hi = t;
      for (int k = 0; k < 6; k++) { float mid = 0.5 * (lo + hi); vec3 q = ro + rd * mid; if (q.y - land(q.xz, true) < 0.0) hi = mid; else lo = mid; }
      mat = 1.0; return hi;
    }
    // the bank face is steep: small steps near it
    t += min(o, max(0.004 + t * 0.002, h * 0.35));
    if (t > tmax) break;
  }
  return -1.0;
}
vec3 shadeLand(vec3 p, vec3 rd, float t, float mat) {
  vec3 n, alb; vec3 emit = vec3(0.0);
  if (mat == 1.0 || mat == 4.0) {
    n = mat == 4.0 ? sceneN(p) : landN(p.xz, t);
    if (mat == 4.0) {
      // relief in the light only: runnels down the cut and layers of harder clay across it
      float e = 0.01;
      float r0 = fbm(vec2(p.z * 1.6, p.y * 0.25), 3) + 0.25 * sin(p.y * 14.0 + 2.0 * fbm(vec2(p.z * 0.3, p.y), 2));
      float rz = fbm(vec2((p.z + e) * 1.6, p.y * 0.25), 3) + 0.25 * sin(p.y * 14.0 + 2.0 * fbm(vec2((p.z + e) * 0.3, p.y), 2));
      float ry = fbm(vec2(p.z * 1.6, (p.y + e) * 0.25), 3) + 0.25 * sin((p.y + e) * 14.0 + 2.0 * fbm(vec2(p.z * 0.3, p.y + e), 2));
      n = normalize(n + vec3(0.0, -(ry - r0) / e, -(rz - r0) / e) * 0.02);
    }
    float d = p.x - bankXf(p.z);
    float face = mat == 4.0 ? 1.0 : 0.0;
    vec3 clay = mix(vec3(0.2, 0.185, 0.17), vec3(0.3, 0.275, 0.24), fbm(vec2(p.z * 1.3, p.y * 3.0), 4));
    // fine layers in the cut face, silt laid by old floods, and the marks of the current
    clay *= 0.8 + 0.3 * fbm(vec2(p.z * 3.0, p.y * 14.0), 3);
    // runnels where rain has run down the cut, pits where clods have fallen out
    clay *= 1.0 - 0.15 * smoothstep(0.55, 0.8, fbm(vec2(p.z * 5.0, p.y * 0.6), 3));
    clay *= 1.0 - 0.2 * smoothstep(0.62, 0.8, fbm(vec2(p.z, p.y) * 5.0, 3));
    vec3 top = mix(vec3(0.2, 0.18, 0.13), vec3(0.3, 0.27, 0.2), fbm(p.xz * 0.6, 3));
    alb = mix(top, clay, face);
    // wet dark band at the waterline
    alb *= 1.0 - 0.5 * smoothstep(0.25, 0.0, p.y);
    // the dry stretch: pale cracked mud
    if (p.z > uDryZ[0] && p.z < uDryZ[1] && d > -0.2 && p.y > 0.05) {
      vec2 vc = voronoiEdge(p.xz * 3.2 + 0.6 * vec2(fbm(p.xz * 1.5, 3), fbm(p.xz * 1.5 + 4.0, 3)));
      vec3 dry = mix(vec3(0.3, 0.27, 0.22), vec3(0.4, 0.36, 0.29), vc.y) * (0.8 + 0.3 * fbm(p.xz * 8.0, 3)) * (1.0 - 0.8 * smoothstep(0.05, 0.0, vc.x));
      alb = mix(alb, dry, smoothstep(uDryZ[0], uDryZ[0] + 2.0, p.z) * smoothstep(uDryZ[1], uDryZ[1] - 2.0, p.z) * (1.0 - face));
    }
    // words cut into the clay face, filled with firelight where a fire is near
    if (face > 0.3 && p.z > uTextZ[0] && p.z < uTextZ[1] && p.y > 0.15 && p.y < ${'${BH}'} - 0.05) {
      vec2 uv = vec2(1.0 - (p.z - uTextZ[0]) / (uTextZ[1] - uTextZ[0]), (p.y - 0.15) / (${'${BH}'} - 0.2));
      vec4 ins = inscription(uv, n, vec3(0.0, 0.0, -1.0), vec3(0.0, 1.0, 0.0), 1.6);
      alb *= 1.0 - 0.75 * ins.a;
      emit += ins.rgb;
    }
  } else if (mat == 2.0) {
    n = sceneN(p);
    alb = vec3(0.16, 0.11, 0.07) * (0.8 + 0.4 * vnoise(vec2(p.y * 30.0, p.z)));
  } else {
    n = sceneN(p);
    // the raft of reeds, and the clay lamp on it
    alb = p.y < 0.03 ? vec3(0.32, 0.27, 0.14) : vec3(0.42, 0.24, 0.12);
  }
  vec3 lit = uSunCol * sat(dot(n, uSunDir)) + uAmb * (0.6 + 0.4 * n.y) + (uSkyHor * 0.2 + uSkyTop) * sat(n.y * 0.5 + 0.5) * 0.6;
  lit += fireLight(p + n * 0.02, n);
  vec3 col = alb * lit + emit;
  return atmosphere(col, p - rd * t, rd, t);
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float mat;
  float tw = rd.y < 0.0 ? -ro.y / rd.y : 1e9;
  float tl = marchLand(ro, rd, 3000.0, mat);
  vec3 col; float depth;
  if (tl > 0.0 && tl < tw) {
    vec3 p = ro + rd * tl;
    col = shadeLand(p, rd, tl, mat);
    depth = tl;
  } else if (tw < 1e8) {
    // the water: dark and still, rippled a little by the current and the wind, reflecting
    vec3 p = ro + rd * tw;
    depth = tw;
    vec2 q = p.xz;
    float e = 0.02;
    float amp = 0.004 + 0.01 * uWind;
    float h0 = fbm(q * vec2(0.9, 0.35) + vec2(0.0, -uTime * 0.25), 4) * amp + fbm(q * 3.0 + vec2(uTime * 0.2, -uTime * 0.6), 3) * amp * 0.4;
    float hx = fbm((q + vec2(e, 0.0)) * vec2(0.9, 0.35) + vec2(0.0, -uTime * 0.25), 4) * amp + fbm((q + vec2(e, 0.0)) * 3.0 + vec2(uTime * 0.2, -uTime * 0.6), 3) * amp * 0.4;
    float hz = fbm((q + vec2(0.0, e)) * vec2(0.9, 0.35) + vec2(0.0, -uTime * 0.25), 4) * amp + fbm((q + vec2(0.0, e)) * 3.0 + vec2(uTime * 0.2, -uTime * 0.6), 3) * amp * 0.4;
    vec3 n = normalize(vec3(h0 - hx, e, h0 - hz));
    n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(20.0, 300.0, tw) * 0.8));
    vec3 r = reflect(rd, n);
    float fres = 0.03 + 0.97 * pow(1.0 - sat(dot(-rd, n)), 5.0);
    // the reflection: the bank and the fires, then the sky
    float rm; float tr = marchLand(p + n * 0.01, r, 400.0, rm);
    vec3 refl = tr > 0.0 ? shadeLand(p + r * tr, r, tr, rm) : sky(r);
    // the fires and lamps in the reflection
    for (int k = 0; k < 12; k++) {
      float f = uCamps[k * 2 + 1];
      if (f <= 0.0) continue;
      refl += f * flameLight(p, r, tr > 0.0 ? tr : 1e4, campFire(k), 9.0, float(k) * 3.3);
    }
    for (int k = 0; k < 12; k++) {
      float f = uLamps[k * 4 + 2], s = uLamps[k * 4 + 3];
      if (f <= 0.0 || s <= 0.0) continue;
      vec3 w; lampRaft(vec3(uLamps[k * 4], 0.1, uLamps[k * 4 + 1]), k, w);
      refl += f * flameLight(p, r, 1e4, w, 1.4 * s, float(k) * 5.1 + 2.0);
    }
    vec3 body = vec3(0.01, 0.012, 0.012) + fireLight(p, vec3(0.0, 1.0, 0.0)) * 0.02;
    col = mix(body, refl, fres);
    col = atmosphere(col, ro, rd, tw);
  } else { col = sky(rd); depth = 1e5; }
  // the thread and its branches: a scarlet fibre lit by the fires, drawn by its distance to the ray
  {
    float tt = 0.3;
    for (int k = 0; k < 48; k++) {
      vec3 q = ro + rd * tt;
      if (tt > depth) break;
      float d = min(min(threadD(q), branchD(q)), cordD(q));
      float px = tt * 0.0009;
      if (d < 0.006 + px) {
        float cov = sat((0.005 + px - d) / max(px, 0.0005)) * sat(0.006 / (px + 0.002));
        vec3 tc = vec3(0.5, 0.03, 0.03) * (uAmb * 3.0 + fireLight(q, vec3(0.0, 1.0, 0.0)) + uSunCol * 0.5);
        col = mix(col, tc, sat(cov));
        break;
      }
      tt += max(d * 0.8, 0.01);
      if (tt > 80.0) break;
    }
  }
  // the camp fires and their sparks
  for (int k = 0; k < 12; k++) {
    float f = uCamps[k * 2 + 1];
    if (f <= 0.0) continue;
    vec3 c = campFire(k);
    float dist = length(c - ro);
    if (dist < 80.0) col += f * (flameLight(ro, rd, depth, c, 7.0, float(k) * 3.3) + flameLight(ro, rd, depth, c + vec3(0.13, -0.02, 0.05), 5.0, float(k) * 3.3 + 1.0) + flameLight(ro, rd, depth, c + vec3(-0.11, -0.02, -0.06), 4.5, float(k) * 3.3 + 2.0)) + f * 0.6 * lifeEmbers(ro, rd, depth, c + vec3(0.0, 0.15, 0.0), 0.15, 1.0, 10, vec3(0.2, 0.0, 0.3) * uWind, 0.006, float(k));
    else col += f * vec3(1.0, 0.5, 0.18) * lifeGlow(ro, rd, c + vec3(0.0, 0.15, 0.0), 0.05 + dist * 0.001, depth);
  }
  for (int k = 0; k < 12; k++) {
    float f = uLamps[k * 4 + 2], s = uLamps[k * 4 + 3];
    if (f <= 0.0 || s <= 0.0) continue;
    vec3 w; lampRaft(vec3(uLamps[k * 4], 0.1, uLamps[k * 4 + 1]), k, w);
    col += f * flameLight(ro, rd, depth, w, 1.4 * s, float(k) * 5.1 + 2.0);
  }
#ifndef NO_MOTES
  col += lifeMotes(ro, rd, depth, ro + rd * 3.0, vec3(3.0, 1.5, 3.0), 30, 0.003, vec3(0.1, 0.03, 0.4), vec3(1.0, 0.8, 0.5) * 0.1, 11.0);
#endif
  return col;
}
`;

export function riverFrag(extra = '') {
  const sub = (s) => s.replaceAll('${BH}', BANK_H.toFixed(2));
  return LIFE_GLSL + G_COMMON + sub(RIVER_GLSL) + extra + sub(SHADE);
}

export function riverScene(P, o) {
  const sky0 = o.sky(P.from);
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: o.textSize ?? [8192, 512],
    frag: riverFrag((P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '')),
    uniforms: {
      ...sky0, uExposureSky: 1, uSpin: 0, uWind: 0.3,
      uCamps: new Array(24).fill(0), uThreadZ: [0, 0], uBranch: new Array(24).fill(-1e4), uTextZ: [0, 1],
      uLamps: new Array(48).fill(0), uCords: new Array(48).fill(0), uDryZ: [0, 0], uDay: 0,
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
