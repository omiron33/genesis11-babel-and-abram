// Shared GLSL for the Genesis 5 worlds: a thin-lens camera ray, a sky with stars and moving cloud,
// the clay lamp and its flame, and the inscription shading (words cut into a surface and filled with
// light as they are sung). Every world prefixes its own code with LIFE_GLSL + G_COMMON.
export const G_COMMON = /* glsl */ `
uniform float uFocus, uAperture;      // focus distance (m) and lens radius (m); 0 = pinhole

// A second low-discrepancy point from the pixel jitter, mapped to the unit disc, so every sub-frame
// also samples the aperture: depth of field comes out of the same averaging as motion blur.
vec2 lensDisc() {
  vec2 u = fract(uJitter * vec2(1.6180339, 2.4142136) + vec2(0.37, 0.71) + uFrame * vec2(0.1371, 0.2913)) * 2.0 - 1.0;
  float r, a;
  if (abs(u.x) > abs(u.y)) { r = u.x; a = 0.7853982 * (u.y / (u.x + 1e-6)); }
  else { r = u.y; a = 1.5707963 - 0.7853982 * (u.x / (u.y + 1e-6)); }
  return r * vec2(cos(a), sin(a));
}
vec3 lensRay(vec2 fc, out vec3 ro) {
  vec3 rd = camRay(fc, ro);
  if (uAperture <= 0.0) return rd;
  vec3 ww = normalize(uCamTarget - uCamPos);
  vec3 up = vec3(sin(uCamRoll), cos(uCamRoll), 0.0);
  vec3 uu = normalize(cross(ww, up)), vv = cross(uu, ww);
  float ft = uFocus / max(dot(rd, ww), 1e-3);
  vec3 fp = ro + rd * ft;
  vec2 d = lensDisc() * uAperture;
  ro += uu * d.x + vv * d.y;
  return normalize(fp - ro);
}

vec3 srgb2lin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }

// ---------------------------------------------------------------- sky
uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyHor, uMoonDir;
uniform float uStars, uCloud, uCloudSpeed, uMoon, uFogDen;
uniform vec3 uFogCol, uAmb;

float starField(vec3 rd, float spin) {
  // the sky turns about the pole (years under the turning sky)
  vec3 d = rd;
  float c = cos(spin), s = sin(spin);
  vec3 ax = normalize(vec3(0.0, 0.62, -0.78));
  d = d * c + cross(ax, d) * s + ax * dot(ax, d) * (1.0 - c);
  vec3 q = d * 260.0;
  vec3 id = floor(q), f = fract(q) - 0.5;
  float h = hash13(id);
  float star = smoothstep(0.985, 1.0, h) * smoothstep(0.42, 0.0, length(f + (hash33(id) - 0.5) * 0.6));
  float tw = 0.75 + 0.25 * sin(uTime * (2.0 + 5.0 * hash13(id + 3.1)) + h * 40.0);
  return star * tw * (0.4 + 2.2 * pow(hash13(id + 7.7), 6.0));
}
// cloud cover along a direction, moving with the wind
float cloudAt(vec3 rd) {
  if (rd.y < 0.0) return 0.0;
  vec2 uv = rd.xz / (rd.y + 0.12) * 1.4 + vec2(uTime * uCloudSpeed, uTime * uCloudSpeed * 0.35);
  float n = fbm(uv * 0.55, 6);
  float n2 = fbm(uv * 1.7 + vec2(4.0, uTime * uCloudSpeed * 0.6), 4);
  return smoothstep(0.52 - 0.32 * uCloud, 0.95, n * 0.8 + n2 * 0.3) * smoothstep(0.0, 0.18, rd.y);
}
vec3 skyColor(vec3 rd, float spin) {
  float h = max(rd.y, 0.0);
  vec3 col = mix(uSkyHor, uSkyTop, pow(h, 0.45));
  float sd = max(dot(rd, uSunDir), 0.0);
  col += uSunCol * (0.06 * pow(sd, 6.0) + 0.5 * pow(sd, 120.0)) * smoothstep(-0.02, 0.03, uSunDir.y);
  col += uSunCol * 0.25 * pow(sd, 2.0) * exp(-h * 6.0);        // the glow along the horizon toward the sun
  col += vec3(0.75, 0.82, 1.0) * uStars * starField(rd, spin) * smoothstep(0.0, 0.25, rd.y);
  float md = max(dot(rd, uMoonDir), 0.0);
  col += vec3(0.85, 0.9, 1.0) * uMoon * (smoothstep(0.99993, 0.99996, md) * 2.0 + 0.02 * pow(md, 60.0));
  float c = cloudAt(rd);
  // cloud: dark undersides, bright edges toward the sun, lit from below near the horizon at dusk
  float edge = c * (1.0 - c) * 4.0;
  vec3 under = mix(uSkyTop * 1.6 + uSkyHor * 0.25, uSkyHor * 0.8, exp(-h * 5.0));
  vec3 cc = under + uSunCol * (0.05 + 0.35 * pow(sd, 4.0) * edge + 0.12 * exp(-h * 8.0));
  col = mix(col, cc, c * 0.95);
  return col;
}

// ---------------------------------------------------------------- the clay lamp
// A wheel-thrown oil lamp, about 12 cm long: a round body pinched to a spout, a filling hole on top
// with oil, a fired-clay skin with finger marks. Local frame: spout along +x, up +y, base at y=0.
float lampSD(vec3 q) {
  // body: a low round bowl, flat-topped, with a raised rim round the filling hole
  vec3 b = q - vec3(0.0, 0.022, 0.0);
  float body = sdEllipsoid(b, vec3(0.052, 0.024, 0.049));
  body = smax(body, q.y - 0.036, 0.008);                       // flattened top
  // the pinched spout, flattened sideways, reaching out to the wick
  vec3 s = q; s.z *= 1.35;
  float sp = sdRoundCone(s, vec3(0.02, 0.026, 0.0), vec3(0.083, 0.03, 0.0), 0.02, 0.0105);
  float d = smin(body, sp, 0.016);
  // rim round the filling hole, and the hole itself (oil inside)
  float rim = length(vec2(length(q.xz - vec2(-0.006, 0.0)) - 0.021, q.y - 0.037)) - 0.0045;
  d = smin(d, rim, 0.004);
  d = smax(d, -(length(q.xz - vec2(-0.006, 0.0)) - 0.0165) * 1.0, 0.002);
  d = max(d, -(q.y - 0.024) * 0.0 - 1.0);
  // the wick hole at the spout's tip
  d = smax(d, -(length(q - vec3(0.084, 0.034, 0.0)) - 0.005), 0.002);
  // a small knob handle at the back
  d = smin(d, length(vec2(length(q.xy - vec2(-0.057, 0.03)) - 0.009, q.z)) - 0.0035, 0.004);
  d = smax(d, -q.y, 0.003);                                     // flat foot
  d += 0.0007 * (vnoise(q * 170.0) - 0.5) + 0.0005 * (vnoise(q * 45.0) - 0.5);
  return d;
}
vec3 lampNormal(vec3 q) {
  vec2 e = vec2(0.0006, 0.0);
  return normalize(vec3(lampSD(q + e.xyy) - lampSD(q - e.xyy), lampSD(q + e.yxy) - lampSD(q - e.yxy), lampSD(q + e.yyx) - lampSD(q - e.yyx)));
}
// where the flame sits in the lamp's frame (the wick at the spout's tip)
const vec3 LAMP_WICK = vec3(0.085, 0.04, 0.0);

// The flame: a soft teardrop of light that leans with the draught, breathes and flickers, with a
// blue root on the wick. Emission picked up along a ray (ro, rd) that stops at depth; f is the
// flame's world position at the wick, s its size multiplier, seed makes each flame its own.
vec3 flameLight(vec3 ro, vec3 rd, float depth, vec3 f, float s, float seed) {
  float fl = lifeFlicker(uTime, seed);
  float lean = 0.35 * lifeFractal(uTime * 1.3, seed + 5.0);
  float H = 0.034 * s * (0.8 + 0.4 * fl);
  vec3 acc = vec3(0.0);
  // march a short way through the flame's bounding sphere
  vec3 c = f + vec3(lean * 0.004 * s, H * 0.45, 0.0);
  vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - (H * 1.2) * (H * 1.2);
  float disc = b * b - cc;
  if (disc < 0.0) return acc;
  float t0 = max(-b - sqrt(disc), 0.0), t1 = min(-b + sqrt(disc), depth);
  if (t1 <= t0) return acc;
  float dt = (t1 - t0) / 14.0;
  for (int i = 0; i < 14; i++) {
    vec3 p = ro + rd * (t0 + dt * (float(i) + 0.5)) - f;
    float y = p.y / H;                                   // 0 at the wick, 1 at the tip
    if (y < -0.15 || y > 1.15) continue;
    float wob = lifeFractal(uTime * 6.0 - y * 3.0, seed + 2.0) * 0.12 * y;
    vec2 r = (p.xz - vec2((lean * y * y + wob) * H, 0.0)) / (H * 0.26);
    float prof = (y < 0.25 ? mix(0.55, 1.0, smoothstep(-0.15, 0.25, y)) : mix(1.0, 0.0, smoothstep(0.25, 1.05, y)));
    float rr = length(r) / max(prof, 0.05);
    float dens = smoothstep(1.0, 0.25, rr) * smoothstep(-0.15, 0.05, y) * smoothstep(1.15, 0.7, y);
    vec3 hot = mix(vec3(1.0, 0.42, 0.08), vec3(1.0, 0.86, 0.6), smoothstep(0.6, 0.0, rr) * smoothstep(0.9, 0.2, y));
    vec3 blue = vec3(0.12, 0.25, 1.0) * smoothstep(0.25, 0.0, y) * smoothstep(0.5, 1.0, rr) * 0.6;
    acc += (hot * 42.0 * fl + blue * 30.0) * dens * dt / H;
  }
  // a soft halo round it, as the eye sees a flame in the dark
  acc += vec3(1.0, 0.55, 0.2) * 0.02 * fl * lifeGlow(ro, rd, f + vec3(0.0, H * 0.4, 0.0), H * 0.6, depth);
  return acc;
}

// Clay shading (fired terracotta, darker where oil has soaked it), lit by its own flame from above.
vec3 clayColor(vec3 q) {
  float g = fbm(q * 90.0, 4);
  vec3 c = mix(vec3(0.30, 0.14, 0.07), vec3(0.52, 0.29, 0.15), g);
  c = mix(c, c * 0.45, smoothstep(0.05, 0.03, q.y) * 0.0 + smoothstep(0.03, 0.08, -q.x + 0.0) * 0.0);
  return c;
}

// ---------------------------------------------------------------- inscriptions
// Words cut into a surface and filled with light. uv: where the point lies in the text texture.
// Returns (emission rgb, cut mask) and perturbs the normal n so the cut edges catch the light.
vec4 inscription(vec2 uv, inout vec3 n, vec3 tx, vec3 ty, float glow) {
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec4(0.0);
  vec4 c = textureLod(uText, uv, 0.0);
  // a broad bevel from the blurred copy of the words: the walls of each cut catch the light on one
  // side and fall into shadow on the other
  vec2 sp = 1.0 / vec2(textureSize(uTextShade, 0));
  float sx = texture(uTextShade, uv + vec2(sp.x, 0.0)).a - texture(uTextShade, uv - vec2(sp.x, 0.0)).a;
  float sy = texture(uTextShade, uv + vec2(0.0, sp.y)).a - texture(uTextShade, uv - vec2(0.0, sp.y)).a;
  vec4 sh = texture(uTextShade, uv);
  n = normalize(n + (tx * sx - ty * sy) * 5.0 * (1.0 - c.a));
  vec3 ink = c.a > 0.01 ? srgb2lin(c.rgb / c.a) : vec3(0.0);
  // the light sits down in the cut: brightest at the bottom of each stroke
  float core = smoothstep(0.75, 1.0, c.a);
  // a dark lip round the cut where the surface breaks away
  float rim = smoothstep(0.02, 0.35, sh.a) * (1.0 - c.a);
  vec3 spill = sh.a > 0.01 ? srgb2lin(sh.rgb / sh.a) * sh.a : vec3(0.0);
  // the cut's walls: dark where they face away from the light, so each stroke reads as a groove
  float wall = c.a * (1.0 - core);
  return vec4(ink * (0.08 * wall + 0.9 * core) * glow + spill * glow * 0.02, max(c.a * (0.55 + 0.45 * (1.0 - core)), rim * 0.5));
}
`;
