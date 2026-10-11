// s11-days-shorter: "Reu, Serug, Nahor, Terah / Six hundred years, four hundred years, two hundred
// years / The days grow shorter, the line runs on / Out of the scattering, one thread strong / Sons
// and daughters, sons and daughters / Terah begat— / Terah begat—"
// The same river, the glide quickening. Days and nights go over faster and faster, the stars wheeling;
// the camps along the bank come closer together, a side thread branching at each, and the camera
// keeps to the one scarlet thread. Each line is cut into the bank face as it is sung. At Terah's camp
// the thread splits in three, and the camera rises over the bank and follows the first branch inland
// toward the coming dawn.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { riverScene, bankX } from '/song/lib/x-river.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from - 0.2, 'Reu, Serug', 'Six hundred years', 'The days grow shorter', 'Out of the scattering', 'Sons and daughters', 'Terah begat', 'Terah begat');
  const L = A.lines;
  // the glide speeds up through the shot
  const v = (t) => 2.4 + 3.2 * smooth(clamp01((t - P.from) / 14)) - 3.6 * smooth(clamp01((t - 239.5) / 3.5));
  const camZ = (t) => { let z = 60, tt = P.from; const dt = 0.05; while (tt < t) { z += v(tt) * Math.min(dt, t - tt); tt += dt; } return z; };
  const LEN = [8.5, 15, 11.5, 11.5, 10.0, 5.0, 5.0];
  let prevB = -1e9;
  const span = L.map((l, k) => { if (k >= 4) return null; const za = Math.max(camZ(l.end) + 3.2, prevB + 0.6); prevB = za + LEN[k]; return [za, za + LEN[k]]; });
  // Terah's two lines, close ahead of the camera as they are sung; "Sons and daughters" just before them
  // the last three lines share one stretch of the face, one above another
  const tz = Math.max(prevB + 0.6, camZ(L[4].end) + 3.0);
  span[4] = span[5] = span[6] = [tz, tz + 9.5];
  const Z0 = 55, Z1 = span[6][1] + 30;
  // camps: closer together as the days run faster; Terah's is the last, where the thread splits
  const camps = []; let z = 62; while (z < span[5][0] - 2) { camps.push(z); z += 9 - 5 * clamp01((z - 60) / 80); }
  const terah = span[5][0] + 1;
  camps.push(terah);
  const campU = new Array(24).fill(0); camps.slice(-12).forEach((zz, k) => { campU[k * 2] = zz; campU[k * 2 + 1] = 1; });
  const br = new Array(24).fill(-1e4);
  const sides = camps.slice(-9, -1);
  sides.forEach((zz, k) => { br[k * 2] = zz + 0.5; br[k * 2 + 1] = 0.4 + 0.35 * Math.sin(k * 2.3); });
  [0.15, 0.6, 1.05].forEach((a, j) => { br[(9 + j) * 2] = terah + 0.4; br[(9 + j) * 2 + 1] = a; });
  const keys = [];
  for (let t = P.from; t <= 244.7; t += 0.8) {
    const zz = camZ(t);
    keys.push({ t, pos: [bankX(zz) + 4.4, 1.7, zz], look: [bankX(zz + 4.5) + 0.2, 0.8, zz + 4.5] });
  }
  // rise over the bank at Terah's camp and look along the first branch, inland, toward the dawn

  
  keys.push({ t: P.to, pos: [bankX(terah) + 0.6, 4.4, terah - 1.5], look: [bankX(terah) - 40, 2.0, terah + 8] });

  const cam = track(keys, { handheld: { amount: 0.8, seed: 111 }, fov: 50 });
  // days and nights: the cycle shortens; it is coming on to dawn at the end
  const phase = (t) => { const a = P.from, T0 = 7.5, T1 = 1.9, d = 22.3; const k = clamp01((t - a) / d); return 2 * Math.PI * ((t - a) / T0 + ((1 / T1 - 1 / T0) * d * k * k) / 2) + Math.PI; };
  const W = 16384, H = 512, FACE = 1.4;
  return riverScene(P, {
    name: 's11-days-shorter', cam,
    textSize: [W, H],
    sky: (t) => {
      const ph = phase(t), day = 0.5 - 0.5 * Math.cos(ph);
      const end = smooth(clamp01((t - 241.5) / 3.5));
      const k = day * (1 - end) + 0.32 * end;
      const az = ph * 0.5;
      const sd = [0.75 * (1 - end) - 0.9 * end, -0.3 + 0.75 * k * (1 - end) + 0.03 * end, -0.6 + 0.2 * Math.sin(az) * (1 - end) + 0.25 * end];
      return { ...skyMix('night', 'sunrise', k), uSunDir: sd, uMoon: 0.0, uFogDen: 0.0025, uFogCol: [0.03 + 0.25 * k, 0.03 + 0.22 * k, 0.04 + 0.2 * k] };
    },
    uniforms: { uCamps: campU, uThreadZ: [Z0 - 10, Z1], uBranch: br, uTextZ: [Z0, Z1], uWind: 0.3 },
    update(t, u) { u.uSpin.value = phase(t) * 0.25; },
    drawText(ctx, t) {
      const ppm = W / (Z1 - Z0), sx = ppm / (H / FACE);
      L.forEach((l, k) => {
        const [za, zb] = span[k];
        const x0 = (Z1 - zb) * ppm, x1 = (Z1 - za) * ppm;
        ctx.save(); ctx.translate(x0, 0); ctx.scale(sx, 1);
        // the two "Terah begat" lines are cut one above the other, the second left unfinished in the clay
        const box = k === 4 ? { y: H * 0.03, h: H * 0.4 } : k === 5 ? { y: H * 0.45, h: H * 0.26 } : k === 6 ? { y: H * 0.72, h: H * 0.26 } : { y: H * 0.12, h: H * 0.62 };
        inscribe(ctx, t, [{ words: l.words }], { x: 10, y: box.y, w: (x1 - x0) / sx - 20, h: box.h }, { size: Math.round(H * (k >= 5 ? 0.22 : k === 4 ? 0.32 : 0.46)), valign: 'middle', font: 'name' });
        ctx.restore();
      });
    },
    post: () => grade({ exposure: 1.15, bloom: 0.12 }),
    finish: () => FINISH,
  });
};
