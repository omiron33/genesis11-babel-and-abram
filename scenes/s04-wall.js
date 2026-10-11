// s04-wall: verse 2. "Brick on brick on brick on brick / Hand on hand on hand / One tongue, one
// hammer / One people, one plan / Every morning the kiln / Every evening the stair / Reaching up for a
// heaven / We could climb to from here"
// Night at the foot of the tower. The camera comes down the face of the tower's lowest stage to a new
// wall going up in front of it, and tracks along that wall as it rises band by band: each line is
// stamped into the course being laid, pitch-black in the brick, as it is sung, the bricks of that
// course landing one after another along the wall with a puff of dust. A fire pit by the work lights
// it; the tower's braziers burn above.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { towerScene } from '/song/lib/x-tower.js';
import { skyMix, grade, FINISH, clamp01 } from '/song/lib/look.js';
import { anchorAt, ignite, FONTS } from '/song/lib/type.js';
export const kind = 'shader';

const F = (x) => Number(x).toFixed(3);
const X0 = -5.5, X1 = 5.5, ZF = 121, TH = 1.3, BAND = 0.42, Y0 = 0.25;
const EXTRA = /* glsl */ `
#define EXTRA_SD
uniform vec4 uWallB;     // full height, height of the course being laid, x it has reached, 0
float extraSD(vec3 p) {
  // the new wall: full up to uWallB.x, the course being laid up to uWallB.y where x < uWallB.z
  vec3 q = p - vec3(${F((X0 + X1) / 2)}, 0.0, ${F(ZF - TH / 2)});
  float full = sdBox(q - vec3(0.0, uWallB.x * 0.5, 0.0), vec3(${F((X1 - X0) / 2)}, uWallB.x * 0.5, ${F(TH / 2)}));
  float part = sdBox(vec3(p.x - (${F(X0)} + uWallB.z) * 0.5, q.y - (uWallB.x + uWallB.y) * 0.5, q.z), vec3(max(uWallB.z - ${F(X0)}, 0.0) * 0.5, max(uWallB.y - uWallB.x, 0.0) * 0.5, ${F(TH / 2)}));
  float d = min(full, part);
  if (d < 0.2) {
    vec4 b = brickPattern(abs(p.y - uWallB.x) < 0.01 || abs(p.y - uWallB.y) < 0.01 ? p.xz * vec2(1.0, 2.0) : vec2(p.x, p.y));
    d += 0.012 * b.x + 0.006 * (hash12(vec2(b.y * 91.0, 3.0)) - 0.5);
  }
  // the fire pit: a ring of stones by the work
  float pit = length(vec2(length(p.xz - vec2(3.2, ${F(ZF + 2.6)})) - 0.5, p.y - 0.08)) - 0.12;
  pit += 0.04 * (vnoise(p * 8.0) - 0.5);
  return min(d, pit);
}
void extraShade(vec3 p, inout vec3 n, out vec3 alb, inout vec3 emit, inout float gloss) {
  vec4 b = brickPattern(vec2(p.x, p.y));
  float h = b.y;
  // new bricks, freshly fired: cleaner and warmer than the tower's
  vec3 bc = mix(vec3(0.5, 0.36, 0.24), vec3(0.6, 0.45, 0.3), h) * (0.8 + 0.35 * fbm(vec2(p.x * 7.0, p.y * 16.0) + h * 30.0, 3));
  alb = mix(bc, vec3(0.45, 0.4, 0.33), b.x * 0.85);
  if (p.y < 0.3 && length(p.xz - vec2(3.2, ${F(ZF + 2.6)})) < 0.9) alb = vec3(0.12, 0.1, 0.09);
  // the words, stamped in the face of each band and filled with pitch
  if (n.z > 0.5 && p.x > ${F(X0)} && p.x < ${F(X1)}) {
    float band = floor((p.y - ${F(Y0)}) / ${F(BAND)});
    if (band >= 0.0 && band < 8.0) {
      vec2 uv = vec2((p.x - ${F(X0)}) / ${F(X1 - X0)}, 1.0 - (band + 1.0 - fract((p.y - ${F(Y0)}) / ${F(BAND)})) / 8.0);
      vec4 tx = texture(uText, uv);
      vec2 sp = 1.0 / vec2(textureSize(uTextShade, 0));
      float sx = texture(uTextShade, uv + vec2(sp.x, 0.0)).a - texture(uTextShade, uv - vec2(sp.x, 0.0)).a;
      float sy = texture(uTextShade, uv + vec2(0.0, sp.y)).a - texture(uTextShade, uv - vec2(0.0, sp.y)).a;
      n = normalize(n - vec3(sx, -sy, 0.0) * 3.0 * (1.0 - tx.a));
      float fill = tx.a > 0.01 ? tx.r / tx.a : 0.0;
      alb = mix(alb, mix(alb * 0.5, vec3(0.012, 0.01, 0.009), fill), tx.a);
      gloss = max(gloss, tx.a * fill * 0.5);
    }
  }
}
`;

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Brick on brick', 'Hand on hand', 'One tongue', 'One people', 'Every morning', 'Every evening', 'Reaching up', 'We could climb');
  const L = A.lines;
  // the canvas layout of every line (each word's left and right edge, 0..1 across the wall)
  const W = 4096, H = 2048, SH = H / 8, SIZE = Math.round(SH * 0.5);
  const measure = (() => { const c = new OffscreenCanvas(8, 8).getContext('2d'); c.font = FONTS.name(SIZE); return (s) => c.measureText(s).width; })();
  const layout = L.map((l) => {
    const sp = measure(' '), widths = l.words.map((w) => measure(w.w));
    const total = widths.reduce((a, b) => a + b, 0) + sp * (l.words.length - 1);
    let x = (W - total) / 2;
    return l.words.map((w, i) => { const r = { w, x0: x, x1: x + widths[i] }; x += widths[i] + sp; return r; });
  });
  // course k is laid along the wall while line k is sung: the front of the laying reaches each
  // word's far edge just as that word is sung
  const laid = (t) => {
    let k = L.findIndex((l) => t < l.end + 0.12);
    if (k < 0) return { full: Y0 + BAND * L.length, top: Y0 + BAND * L.length, x: X1 - X0 };
    const lay = layout[k], ts = [L[k].start - 0.35, ...lay.map((r) => r.w.start + 0.04), L[k].end + 0.12];
    const us = [0, ...lay.map((r) => r.x1 / W), 1];
    let u = 0;
    for (let i = 0; i < ts.length - 1; i++) if (t >= ts[i]) u = us[i] + (us[i + 1] - us[i]) * clamp01((t - ts[i]) / Math.max(0.05, ts[i + 1] - ts[i]));
    return { full: Y0 + BAND * k, top: Y0 + BAND * (k + 1), x: u * (X1 - X0) };
  };
  // the camera: down the tower's face to the wall, then close along it, rising with it
  const keys = [
    { t: P.from, pos: [1.5, 12.0, ZF + 6.0], look: [0.5, 2.0, ZF - 1] },
    { t: L[0].start + 0.3, pos: [-0.4, Y0 + BAND * 0.5 + 0.3, ZF + 4.7], look: [-0.2, Y0 + BAND * 0.5, ZF] },
  ];
  // on the course being laid, the whole line in frame, rising with the wall
  L.forEach((l, k) => { if (k) keys.push({ t: l.start + 0.25, pos: [-0.4 + 0.1 * k, Y0 + BAND * (k + 0.5) + 0.3, ZF + 4.7], look: [-0.2 + 0.05 * k, Y0 + BAND * (k + 0.5), ZF] }); });
  keys.push({ t: L[7].end + 0.3, pos: [0.5, Y0 + BAND * 7.5 + 0.35, ZF + 4.6], look: [0.3, Y0 + BAND * 7.5, ZF] });
  keys.push({ t: P.to, pos: [1.4, 4.6, ZF + 4.6], look: [1.5, 25, ZF - 40] });
  const cam = track(keys, { handheld: { amount: 0.9, seed: 44 }, fov: 36 });
  return towerScene(P, {
    name: 's04-wall', cam,
    textSize: [W, H],
    extra: EXTRA,
    sky: () => ({ ...skyMix('twilight', 'night', 0.75), uFogDen: 0.0005, uFogCol: [0.04, 0.04, 0.06] }),
    uniforms: { uFires: 1.0, uCloudY: 112, uCloudDen: 0.7, uPlainFires: 1.0, uWindT: 0.3, uPtFire: [3.2, 0.15, ZF + 2.6, 1.0], uWallB: [0, 0, 0, 0] },
    update(t, u) {
      const w = laid(t);
      u.uWallB.value[0] = w.full; u.uWallB.value[1] = w.top; u.uWallB.value[2] = w.x;
    },
    drawText(ctx, t) {
      ctx.font = FONTS.name(SIZE); ctx.textBaseline = 'middle';
      layout.forEach((lay, k) => lay.forEach((r) => {
        const g = ignite(r.w, t, { lead: 0.02, rise: 0.08 });
        if (g.a <= 0.001) return;
        const cur = L.findIndex((l) => t < l.end + 0.4);
        const age = cur < 0 ? 0 : cur - k;
        ctx.globalAlpha = g.a * (age >= 2 ? 0.45 : 1);
        ctx.fillStyle = `rgb(${Math.round(clamp01((t - r.w.start - 0.1) / 0.4) * (age >= 2 ? 90 : 255))},0,0)`;
        ctx.fillText(r.w.w, r.x0, SH * k + SH * 0.52);
      }));
      ctx.globalAlpha = 1;
    },
    post: () => grade({ exposure: 1.15, bloom: 0.16 }),
    finish: () => FINISH,
  });
};
