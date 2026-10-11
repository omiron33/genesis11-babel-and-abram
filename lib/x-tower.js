// The tower close: its battered brick walls course by course (bricks of different firings, mortar
// joints, a layer of reed matting every ninth course with a course set in black pitch above it, rain
// streaks, salt bloom near the foot), the ramps that climb its front face with their parapets and
// paving, clay braziers burning along the parapets, a band of blue glazed brick near the top of each
// stage, the top two stages unfinished with timber scaffolding, and the cloud that sits on its top.
// Words live on the walls: up to eight slots, each a rect on the front (+z) face of a stage, read in
// the text canvas; how they burn (fired glow, or glazed yellow in the blue band) is per slot.
//
// Tower-local metres, y up, the front face toward +z; the plain around it at y = 0.
import { G_COMMON } from '/song/lib/g-common.js';
import { TOWER_GLSL, tierY1, hwAt, rampAt } from '/song/lib/tower.js';
import { LIFE_GLSL } from '/kit/life.js';

export { tierY1, hwAt, rampAt };
// braziers along ramp k's parapet: every BRAZ_DX metres
export const BRAZ_DX = 11;

const TOWERX = /* glsl */ `
uniform float uSlot[32];        // 8 word slots on the front faces: stage, x0, x1, y0 (bottom of the text), and
uniform float uSlotB[32];       // ...y1, canvas u0, u1, kind (0 off, 1 fired glow, 2 glazed letters, 3 breaking)
uniform float uSlotV[16];       // canvas v0, v1 per slot
uniform float uSlotS[8];        // the slope of each slot's baseline (dy per dx), to run along a ramp
uniform float uFires;           // braziers burning (0..1)
uniform float uCloudY;          // cloud base height
uniform float uCloudDen;        // how thick the cloud is
uniform float uStorm;           // storm (wind, lightning) 0..1
uniform float uFlash;           // lightning in the cloud now (0..1)
uniform vec3 uFlashAt;          // where the lightning lights the cloud
uniform float uWindT;           // wind strength
uniform float uExposureSky;
uniform float uCrack;           // the walls cracking (0..1) during the confusion
uniform float uPlainFires;      // kilns and camps glowing on the plain below (0..1)
uniform float uDust;            // dust blowing off the tower in the storm (0..1)
uniform vec4 uCloudText;        // words of light in the cloud's top: x half width, the rect's near z and far z, and 1 when on
uniform vec4 uPtFire;           // one more fire on the ground (x, y, z, strength): a brazier on a stand by the work

// ---------------------------------------------------------------- scaffolding on the unfinished stages
float scaffold(vec3 p) {
  // vertical poles a metre out from the front wall of stages 5 and 6, every 3.2 m, lashed ledgers
  float d = 1e5;
  for (float k = 5.0; k <= 6.0; k += 1.0) {
    float y0 = tY0(k) + (k < 5.5 ? 13.0 : 0.0), y1 = tY1(k) + 3.0;
    if (p.y < y0 - 1.0 || p.y > y1 + 1.0) continue;
    float zw = tHWat(k, p.y) + 1.1;
    float hw = tHWat(k, y0) - 2.0;
    vec2 q = vec2(p.x, p.z - zw);
    float cell = floor(q.x / 3.2 + 0.5);
    float lean = 0.03 * (hash11(cell + k * 7.0) - 0.5);
    float px = q.x - cell * 3.2 - lean * (p.y - y0);
    float pole = length(vec2(px, q.y)) - 0.085 - 0.012 * vnoise(vec2(p.y * 3.0, cell));
    pole = max(pole, max(abs(p.x) - hw, max(y0 - p.y, p.y - (y1 - 2.5 * hash11(cell * 3.1 + k)))));
    d = min(d, pole);
    // ledgers: horizontal poles every 2 m
    float ly = mod(p.y - y0, 2.0) - 1.0;
    float ledger = length(vec2(ly, q.y + 0.12)) - 0.06;
    ledger = max(ledger, max(abs(p.x) - hw, max(y0 - p.y, p.y - y1 + 3.0)));
    d = min(d, ledger);
    // putlogs into the wall
    float pl = length(vec2(ly, px)) - 0.05;
    pl = max(pl, max(abs(q.y + 0.55) - 0.6, max(abs(p.x) - hw, max(y0 - p.y, p.y - y1 + 3.0))));
    d = min(d, pl);
  }
  return d;
}

// ---------------------------------------------------------------- braziers
// a clay fire-pot on the parapet of ramp k at index i
vec3 brazierAt(float k, float i) {
  float y0 = tY1(k), y1 = tY1(k + 1.0);
  float L = tHWat(k + 1.0, y0) - 6.0;
  float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
  float x = -L + 4.0 + i * ${'${BDX}'};
  float s = (x + L) / (2.0 * L);
  float ry = y0 + (y1 - y0) * s;
  return vec3(dir * x, ry + 1.1 + 0.32, tHWat(k + 1.0, ry) + T_RW - 0.3);
}
float brazierSD(vec3 p, out vec3 fireAt) {
  fireAt = vec3(0.0);
  float k = clamp(floor((p.y - 24.0) / 18.0), 0.0, 5.0);
  float best = 1e5;
  for (float j = 0.0; j <= 1.0; j += 1.0) {
    float kk = k - j;
    if (kk < 0.0) continue;
    float y0 = tY1(kk);
    float L = tHWat(kk + 1.0, y0) - 6.0;
    float dir = mod(kk, 2.0) < 0.5 ? 1.0 : -1.0;
    float i = clamp(floor((dir * p.x + L - 4.0) / ${'${BDX}'} + 0.5), 0.0, floor((2.0 * L - 8.0) / ${'${BDX}'}));
    vec3 c = brazierAt(kk, i);
    vec3 q = p - c;
    float bowl = sdEllipsoid(q - vec3(0.0, -0.05, 0.0), vec3(0.34, 0.26, 0.34));
    bowl = max(bowl, q.y - 0.1);
    bowl = max(bowl, -sdEllipsoid(q - vec3(0.0, 0.0, 0.0), vec3(0.29, 0.2, 0.29)));
    float foot = sdRoundCone(q, vec3(0.0, -0.32, 0.0), vec3(0.0, -0.12, 0.0), 0.16, 0.1);
    float d = min(bowl, foot);
    if (d < best) { best = d; fireAt = c + vec3(0.0, 0.02, 0.0); }
  }
  return best;
}

// ---------------------------------------------------------------- the scene
// mat: 1 wall, 2 ramp, 3 scaffold, 4 brazier, 5 ground
float sceneSD(vec3 p, out float mat) {
  mat = 5.0;
  float d = p.y - (0.05 * fbm(p.xz * 0.2, 3));
  float t = towerSD(p);
  // the brick relief, near the surface only: mortar joints a centimetre deep
  if (t < 0.25) {
    vec3 n0 = abs(p.x) > abs(p.z) ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec2 uv = vec2(abs(p.x) > abs(p.z) ? p.z : p.x, p.y);
    vec4 b = brickPattern(uv);
    t += 0.011 * b.x + 0.006 * (hash12(vec2(b.y * 91.0, 3.0)) - 0.5) * (1.0 - b.x);
    // broken and weathered brick faces, more toward the corners and the top
    t += 0.01 * (fbm(p * 3.0, 3) - 0.5);
    if (uCrack > 0.0) t += 0.05 * uCrack * smoothstep(0.025, 0.0, voronoiEdge(uv * 1.4 + 3.0).x) * step(0.35, hash12(floor(uv * 0.5)));
  }
  if (t < d) { d = t; mat = 1.0; }
  float sc = scaffold(p);
  if (sc < d) { d = sc; mat = 3.0; }
  vec3 fa; float br = brazierSD(p, fa);
  if (br < d) { d = br; mat = 4.0; }
#ifdef EXTRA_SD
  float ex = extraSD(p);
  if (ex < d) { d = ex; mat = 6.0; }
#endif
  return d;
}
vec3 sceneN(vec3 p, float t) {
  vec2 e = vec2(0.002 + t * 0.0004, 0.0); float m;
  return normalize(vec3(sceneSD(p + e.xyy, m) - sceneSD(p - e.xyy, m), sceneSD(p + e.yxy, m) - sceneSD(p - e.yxy, m), sceneSD(p + e.yyx, m) - sceneSD(p - e.yyx, m)));
}

// fire light from the braziers nearest p (each flickering on its own)
vec3 fireLight(vec3 p, vec3 n) {
  if (uFires <= 0.0) return vec3(0.0);
  vec3 acc = vec3(0.0);
  float k0 = clamp(floor((p.y - 24.0) / 18.0), 0.0, 5.0);
  for (float j = -1.0; j <= 1.0; j += 1.0) {
    float k = k0 + j;
    if (k < 0.0 || k > 5.0) continue;
    float y0 = tY1(k);
    float L = tHWat(k + 1.0, y0) - 6.0;
    float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
    float ic = floor((dir * p.x + L - 4.0) / ${'${BDX}'} + 0.5);
    for (float di = -1.0; di <= 1.0; di += 1.0) {
      float i = ic + di;
      if (i < 0.0 || i > floor((2.0 * L - 8.0) / ${'${BDX}'})) continue;
      vec3 c = brazierAt(k, i) + vec3(0.0, 0.35, 0.0);
      vec3 d = c - p; float r2 = dot(d, d);
      float fl = lifeFlicker(uTime, k * 13.0 + i);
      acc += vec3(1.0, 0.45, 0.15) * 7.0 * uFires * fl * sat(dot(n, d * inversesqrt(r2)) * 0.85 + 0.15) / (r2 + 0.6);
    }
  }
  return acc;
}

// words on the front faces: emission and albedo change for a point on a wall
vec4 wallWords(vec3 p, inout vec3 n, inout vec3 alb) {
  vec4 res = vec4(0.0);
  if (n.z < 0.5) return res;
  for (int s = 0; s < 8; s++) {
    float kind = uSlotB[s * 4 + 3];
    if (kind < 0.5) continue;
    float x0 = uSlot[s * 4 + 1], x1 = uSlot[s * 4 + 2], y0 = uSlot[s * 4 + 3], y1 = uSlotB[s * 4];
    vec2 uv = vec2((p.x - x0) / (x1 - x0), (p.y - y0 - uSlotS[s] * (p.x - x0)) / (y1 - y0));
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) continue;
    if (abs(p.z - tHWat(uSlot[s * 4], p.y)) > 0.3) continue;
    vec2 cuv = vec2(mix(uSlotB[s * 4 + 1], uSlotB[s * 4 + 2], uv.x), mix(uSlotV[s * 2], uSlotV[s * 2 + 1], uv.y));
    if (kind < 1.5 || kind > 2.5) {
      vec4 ins = inscription(cuv, n, vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), 3.0);
      alb *= 1.0 - 0.7 * ins.a;
      res.rgb += ins.rgb; res.a = max(res.a, ins.a);
    } else {
      // glazed yellow letters set in the blue glazed band
      vec4 tx = texture(uText, cuv);
      vec3 ink = tx.a > 0.01 ? srgb2lin(tx.rgb / tx.a) : vec3(0.0);
      alb = mix(alb, vec3(0.75, 0.55, 0.12) * (0.6 + 0.6 * ink.r), tx.a);
      res.rgb += vec3(1.0, 0.7, 0.25) * 0.35 * tx.a * ink.g;      // the glaze catching the firelight as each line is sung
      res.a = max(res.a, tx.a);
    }
  }
  return res;
}

// cloud on the top of the tower: density at p
float cloudTop(vec2 xz) {
  vec2 w = vec2(uTime * 0.6, uTime * 0.2) * (0.5 + uStorm);
  return uCloudY + 36.0 + 16.0 * (fbm((xz + w) * 0.006, 5) - 0.5) + 5.0 * (fbm((xz + w * 1.6) * 0.03, 3) - 0.5);
}
float cloudDen(vec3 p) {
  if (p.y < uCloudY - 24.0) return 0.0;
  float top = cloudTop(p.xz);
  if (p.y > top + 1.0) return 0.0;
  // a cloud deck: a heaped top, turbulence inside, ragged wisps hanging from its base
  vec3 q = p * 0.02 + vec3(uTime * 0.01, -uTime * 0.006, uTime * 0.004) * (1.0 + 2.0 * uStorm);
  float n = fbm(q + 0.8 * (vec3(fbm(q + 3.1, 3), fbm(q + 7.4, 3), fbm(q + 1.9, 3)) - 0.5), 5);
  float baseH = uCloudY - 10.0 + 18.0 * (n - 0.5);
  float d = smoothstep(top + 0.4, top - 2.5, p.y) * smoothstep(baseH - 6.0, baseH + 6.0, p.y) * (0.55 + 0.9 * n);
  return sat(d) * uCloudDen;
}
`;

const SHADE = /* glsl */ `
vec3 atmosphere(vec3 col, vec3 ro, vec3 rd, float t) {
  float fog = 1.0 - exp(-t * uFogDen);
  vec3 fc = uFogCol + uSunCol * 0.25 * pow(max(dot(rd, uSunDir), 0.0), 6.0);
  return mix(col, fc, fog);
}
float softShadow(vec3 p, vec3 l) {
  float res = 1.0, t = 0.05; float m;
  for (int i = 0; i < 32; i++) {
    float h = sceneSD(p + l * t, m);
    res = min(res, 10.0 * h / t);
    t += clamp(h, 0.05, 6.0);
    if (res < 0.01 || t > 160.0) break;
  }
  return sat(res);
}
vec3 towerSky(vec3 rd) {
  vec3 col = skyColor(rd, 0.0) * uExposureSky;
  return col;
}

vec3 shade(vec2 fc) {
  vec3 ro; vec3 rd = lensRay(fc, ro);
  float t = 0.05, hit = -1.0, mat = 0.0;
  for (int i = 0; i < 320; i++) {
    vec3 p = ro + rd * t;
    float m; float d = sceneSD(p, m);
    if (d < 0.0005 * t + 0.0003) { hit = t; mat = m; break; }
    t += d * 0.9;
    if (t > 6000.0 || (p.y > 400.0 && rd.y > 0.0)) break;
  }
  float depth = hit < 0.0 ? 1e5 : hit;
  vec3 col;
  if (hit < 0.0) col = towerSky(rd);
  else {
    vec3 p = ro + rd * hit;
    vec3 n = sceneN(p, hit);
    vec3 alb; vec3 emit = vec3(0.0); float gloss = 0.0;
    if (mat == 1.0) {
      bool sideX = abs(n.x) > abs(n.z) && abs(n.y) < 0.6;
      vec2 uv = vec2(sideX ? p.z : p.x, p.y);
      vec4 b = brickPattern(uv);
      // far away the courses are finer than a pixel: fade them to their average so they don't shimmer
      float lod = smoothstep(0.13, 0.05, hit * 0.0009 / max(0.2, abs(dot(n, rd))));
      b.x = mix(0.3, b.x, lod); b.y = mix(0.4, b.y, lod); b.z *= lod; b.w *= lod;
      if (n.y > 0.6) {
        // paving on the ramps and terraces: bricks laid flat, dust and straw in the joints
        vec4 pb = brickPattern(p.xz * vec2(1.0, 1.0) * 0.5);
        float lodp = smoothstep(0.13, 0.05, hit * 0.0009 / max(0.2, abs(rd.y))); pb.x = mix(0.3, pb.x, lodp); pb.y = mix(0.4, pb.y, lodp);
        alb = mix(vec3(0.42, 0.33, 0.24), vec3(0.56, 0.45, 0.32), pb.y) * (1.0 - 0.35 * pb.x);
        alb = mix(alb, vec3(0.6, 0.52, 0.4), 0.35 * smoothstep(0.4, 0.8, fbm(p.xz * 0.7, 3)));
      } else {
        // fired bricks of different batches: yellow, buff, red-brown, a few overfired almost black
        float h = b.y;
        vec3 bc = h < 0.6 ? mix(vec3(0.36, 0.29, 0.21), vec3(0.45, 0.37, 0.27), h / 0.6) : h < 0.92 ? mix(vec3(0.38, 0.25, 0.18), vec3(0.3, 0.2, 0.15), (h - 0.6) / 0.32) : vec3(0.13, 0.1, 0.085);
        bc *= 0.75 + 0.45 * fbm(vec2(uv.x * 7.0, uv.y * 16.0) + h * 30.0, 4);
        // large patches: older and newer work, dust, damp
        bc *= 0.7 + 0.5 * fbm(uv * vec2(0.08, 0.12) + 2.0, 4);
        vec3 mortar = vec3(0.3, 0.26, 0.21) * (0.8 + 0.4 * vnoise(uv * 30.0));
        alb = mix(bc, mortar, b.x * 0.85);
        // reed matting layers and the pitch course above each
        alb = mix(alb, vec3(0.3, 0.25, 0.14) * (0.7 + 0.6 * vnoise(vec2(uv.x * 40.0, uv.y * 6.0))), b.z);
        alb = mix(alb, vec3(0.03, 0.028, 0.025), b.w * 0.8);
        gloss = max(gloss, b.w * 0.3);
        // pitch dribbled down from the pitch courses, rain streaks, salt bloom near the foot
        float drip = smoothstep(0.75, 0.95, vnoise(vec2(uv.x * 3.0, 0.0))) * smoothstep(0.0, 0.6, fract(uv.y / (9.0 * 0.095)));
        alb *= 1.0 - 0.18 * drip * step(0.75, hash11(floor(uv.x * 3.0))) * smoothstep(0.3, 0.7, fbm(uv * 0.5, 2));
        alb *= 1.0 - 0.2 * smoothstep(0.55, 0.85, fbm(vec2(uv.x * 0.6, uv.y * 0.05), 3));
        alb = mix(alb, vec3(0.6, 0.57, 0.52), 0.18 * smoothstep(1.5, 0.0, p.y - tY0(clamp(floor((p.y - 24.0) / 18.0) + 1.0, 0.0, 6.0))) * smoothstep(0.4, 0.7, fbm(uv * 1.3, 3)));
        // soot above the braziers
        // the glazed band near the top of each finished stage
        float stage = clamp(floor((p.y - 24.0) / 18.0) + 1.0, 0.0, 6.0);
        float by = tY1(stage) - 2.6;
        float band = step(abs(p.y - by), 1.25) * step(stage, 4.5);
        vec3 glaze = mix(vec3(0.02, 0.07, 0.24), vec3(0.04, 0.13, 0.38), h) * (1.0 - 0.6 * b.x);
        alb = mix(alb, glaze, band);
        gloss = max(gloss, band * (1.0 - b.x) * 0.7);
        vec4 w = wallWords(p, n, alb);
        emit += w.rgb;
      }
    } else if (mat == 3.0) {
      alb = mix(vec3(0.2, 0.14, 0.09), vec3(0.34, 0.25, 0.16), vnoise(vec2(p.y * 20.0, p.x * 3.0 + p.z * 3.0)));
    } else if (mat == 4.0) {
      alb = vec3(0.3, 0.17, 0.1) * (0.8 + 0.4 * fbm(p * 12.0, 3));
      vec3 fa; brazierSD(p, fa);
      emit += vec3(1.0, 0.35, 0.08) * 3.0 * uFires * smoothstep(-0.05, 0.08, p.y - fa.y + 0.08) * lifeFlicker(uTime, fa.x);
    } else if (mat == 6.0) {
#ifdef EXTRA_SD
      extraShade(p, n, alb, emit, gloss);
#endif
    } else {
      alb = mix(vec3(0.36, 0.3, 0.22), vec3(0.48, 0.4, 0.3), fbm(p.xz * 0.3, 4));
    }
    float sh = softShadow(p + n * 0.02, uSunDir);
    float ao = 0.0; { float m; for (int k = 1; k <= 4; k++) { float hk = 0.15 * float(k); ao += (hk - sceneSD(p + n * hk, m)) / hk; } ao = sat(1.0 - 0.22 * ao); }
    vec3 lit = uSunCol * sat(dot(n, uSunDir)) * sh + (uAmb * (0.6 + 0.4 * n.y) + (uSkyHor * 0.25 + uSkyTop * 1.2) * sat(n.y * 0.5 + 0.5)) * ao;
    lit += fireLight(p, n) * (0.4 + 0.6 * ao);
    if (uPtFire.w > 0.0) { vec3 d = uPtFire.xyz + vec3(0.0, 0.3, 0.0) - p; float r2 = dot(d, d); lit += vec3(1.0, 0.45, 0.15) * 9.0 * uPtFire.w * lifeFlicker(uTime, 77.0) * sat(dot(n, d * inversesqrt(r2)) * 0.85 + 0.15) / (r2 + 0.6) * (0.4 + 0.6 * ao); }
    // lightning in the cloud lights everything from above
    lit += vec3(0.6, 0.65, 0.85) * uFlash * 0.5 * sat(n.y * 0.6 + 0.4) * smoothstep(-80.0, 0.0, p.y - uCloudY);
    col = alb * lit + emit;
    if (gloss > 0.0) {
      vec3 r = reflect(rd, n);
      float fres = 0.04 + 0.96 * pow(1.0 - sat(dot(-rd, n)), 5.0);
      col += gloss * fres * (towerSky(r) * 0.6 + fireLight(p + r * 0.5, r) * 0.08);
    }
    col = atmosphere(col, ro, rd, hit);
  }
  // fires on the parapets
  if (uFires > 0.0) {
    float k0 = clamp(floor((ro.y - 24.0) / 18.0), 0.0, 5.0);
    for (float j = -1.0; j <= 1.0; j += 1.0) {
      float k = k0 + j;
      if (k < 0.0 || k > 5.0) continue;
      float L = tHWat(k + 1.0, tY1(k)) - 6.0;
      float nI = floor((2.0 * L - 8.0) / ${'${BDX}'});
      for (float i = 0.0; i <= 16.0; i += 1.0) {
        if (i > nI) break;
        vec3 c = brazierAt(k, i) + vec3(0.0, 0.05, 0.0);
        float dist = length(c - ro);
        if (dist < 60.0) col += uFires * flameLight(ro, rd, depth, c + vec3(0.0, 0.06, 0.0), 13.0, k * 13.0 + i);
        else col += uFires * vec3(1.0, 0.5, 0.18) * 1.2 * lifeGlow(ro, rd, c + vec3(0.0, 0.15, 0.0), 0.08 + dist * 0.0012, depth);
      }
      // sparks off the nearest braziers
      float L2 = tHWat(k + 1.0, tY1(k)) - 6.0;
      float dir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
      float ic = clamp(floor((dir * ro.x + L2 - 4.0) / ${'${BDX}'} + 0.5), 0.0, nI);
      col += uFires * lifeEmbers(ro, rd, depth, brazierAt(k, ic) + vec3(0.0, 0.15, 0.0), 0.15, 1.2, 14, vec3(0.6, 0.0, 0.3) * uWindT, 0.008, k + ic);
    }
    // the other stages' fires and the plain's, as points of light
  }
  if (uPtFire.w > 0.0) {
    col += uPtFire.w * flameLight(ro, rd, depth, uPtFire.xyz, 16.0, 77.0);
    col += uPtFire.w * lifeEmbers(ro, rd, depth, uPtFire.xyz + vec3(0.0, 0.3, 0.0), 0.2, 1.4, 18, vec3(0.4, 0.0, 0.2) * uWindT, 0.009, 7.0);
  }
  if (uPlainFires > 0.0 && rd.y < 0.0) {
    // kilns and camps far below on the plain, flickering
    float tg = -ro.y / rd.y;
    if (tg < depth) {
      vec2 g = (ro.xz + rd.xz * tg) / 60.0;
      vec2 id = floor(g); vec2 f = fract(g) - 0.5 - (hash22(id) - 0.5) * 0.7;
      float on = step(hash12(id + 2.0), 0.35) * step(150.0, length(id * 60.0));
      float pix = 0.0016 * tg / 60.0;
      col += on * uPlainFires * vec3(1.0, 0.45, 0.15) * 0.8 * lifeFlicker(uTime, hash12(id) * 40.0) * smoothstep(0.006 + pix, 0.0, length(f)) * exp(-tg * 0.0008);
    }
  }
  // the cloud deck on the tower's top, lit by the moon above, the fires below and the lightning in it;
  // God's words, when there are any, glow in its upper surface
  if (uCloudDen > 0.0) {
    float yLo = uCloudY - 26.0, yHi = uCloudY + 50.0;
    float tc0 = rd.y != 0.0 ? (yLo - ro.y) / rd.y : -1.0;
    float tc1 = rd.y != 0.0 ? (yHi - ro.y) / rd.y : -1.0;
    float a = min(tc0, tc1), b = max(tc0, tc1);
    if (ro.y > yLo && ro.y < yHi) a = 0.0;
    a = max(a, 0.0); b = min(b, min(depth, 1500.0));
    float tText = -1.0;
    if (b > a) {
      float tr = 1.0; vec3 acc = vec3(0.0);
      float dt = (b - a) / 56.0;
      float jit = hash12(fc + uFrame * 0.7);
      vec3 moon = normalize(uMoonDir);
      // where the words sit: the deck's top surface seen from above (a heightfield, found exactly), its
      // underside plane seen from below
      if (uCloudText.w > 0.0) {
        if (ro.y > uCloudY) {
          float tt = a;
          for (int k = 0; k < 48; k++) { vec3 q = ro + rd * tt; float h = q.y - cloudTop(q.xz); if (h < 0.02) { tText = tt; break; } tt += max(h * 0.6, 0.05); if (tt > b) break; }
        } else if (rd.y > 0.0) tText = (uCloudY - 12.0 - ro.y) / rd.y;
      }
      for (int k = 0; k < 56; k++) {
        vec3 q = ro + rd * (a + dt * (float(k) + jit));
        float den = cloudDen(q);
        if (den <= 0.0) continue;
        float top = cloudTop(q.xz);
        float under = max(top - q.y, 0.0);
        vec2 e = vec2(2.0, 0.0);
        vec3 nt = normalize(vec3(cloudTop(q.xz - e.xy) - cloudTop(q.xz + e.xy), 4.0, cloudTop(q.xz - e.yx) - cloudTop(q.xz + e.yx)));
        vec3 c = (vec3(0.55, 0.6, 0.78) * uMoon * 0.9 + uSunCol * 0.4) * (0.08 + 0.92 * pow(sat(dot(nt, moon)), 1.5)) * exp(-under * 0.12);
        c += uAmb * 0.7 + uSkyTop * 0.4;
        c += vec3(1.0, 0.42, 0.14) * 0.08 * uFires * exp(-max(q.y - (uCloudY - 20.0), 0.0) * 0.06) * smoothstep(160.0, 0.0, length(q.xz));
        c += vec3(0.6, 0.65, 0.85) * uFlash * 1.4 * exp(-length(q - uFlashAt) * 0.016);
        float s = den * dt * 0.06;
        acc += tr * c * s; tr *= exp(-s);
        if (tr < 0.02) break;
      }
      col = col * tr + acc;
    }
    // God's words in the cloud's surface: added over the cloud, sharp, only where the letters are
    if (tText > 0.0) {
      vec3 hq = ro + rd * tText;
      vec2 uv = vec2((hq.x + uCloudText.x) / (2.0 * uCloudText.x), (uCloudText.y - hq.z) / (uCloudText.y - uCloudText.z));
      if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0)))) {
        vec4 tx = textureLod(uText, uv, 0.0);
        float a = smoothstep(0.2, 0.6, tx.a);
        vec3 ink = tx.a > 0.01 ? srgb2lin(tx.rgb / tx.a) : vec3(0.0);
        // the cloud breathes light around the letters
        float glow = textureLod(uTextShade, uv, 0.0).a;
        col += ink * a * 1.6 + vec3(0.9, 0.85, 0.75) * glow * 0.05;
      }
    }
  }
  if (uDust > 0.0) {
    // dust torn off the tower by the storm, streaming across the frame
    float acc = 0.0;
    for (int k = 0; k < 10; k++) {
      float tt = 1.0 + float(k) * float(k) * 0.6;
      if (tt > depth) break;
      vec3 q = ro + rd * tt;
      acc += fbm(q * 0.25 - vec3(uTime * 3.0, uTime * 0.4, uTime * 1.2) * uWindT, 4) * 0.5;
    }
    col = mix(col, vec3(0.16, 0.11, 0.08) * (0.3 + uFires) + uFogCol, sat(acc * 0.1 * uDust));
  }
#ifndef NO_MOTES
  col += lifeMotes(ro, rd, depth, ro + rd * 3.0, vec3(3.0, 1.5, 3.0), 30, 0.003, vec3(0.8, 0.05, 0.3) * uWindT, vec3(1.0, 0.7, 0.45) * 0.12 * (0.3 + uFires), 7.0);
#endif
  return col;
}
`;

export function towerFrag(extra = '') {
  const sub = (s) => s.replaceAll('${BDX}', BRAZ_DX.toFixed(1));
  return LIFE_GLSL + G_COMMON + TOWER_GLSL + extra + sub(TOWERX) + sub(SHADE);
}

// slots: [{ stage, x0, x1, y0, y1, u0, u1, v0, v1, kind }]
export function slotUniforms(slots) {
  const a = new Array(32).fill(0), b = new Array(32).fill(0), v = new Array(16).fill(0), sl = new Array(8).fill(0);
  slots.forEach((s, i) => {
    a.splice(i * 4, 4, s.stage, s.x0, s.x1, s.y0);
    b.splice(i * 4, 4, s.y1, s.u0 ?? 0, s.u1 ?? 1, s.kind ?? 1);
    v.splice(i * 2, 2, s.v0 ?? 0, s.v1 ?? 1);
    sl[i] = s.slope ?? 0;
  });
  return { uSlot: a, uSlotB: b, uSlotV: v, uSlotS: sl };
}

export function towerScene(P, o) {
  const sky0 = o.sky(P.from);
  return {
    name: o.name, from: P.from, to: P.to,
    textSize: o.textSize ?? [4096, 2048],
    frag: towerFrag((P.dbg ?? '').split(',').filter(Boolean).map((d) => `#define ${d}\n`).join('') + (o.extra ?? '')),
    uniforms: {
      ...sky0, uExposureSky: 1, uFires: 1, uCloudY: 125, uCloudDen: 1, uStorm: 0, uFlash: 0, uFlashAt: [0, 150, 0], uWindT: 0.4, uCrack: 0, uPlainFires: 0, uDust: 0, uPtFire: [0, 0, 0, 0], uCloudText: [0, 0, 0, 0],
      ...slotUniforms(o.slots ?? []),
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
