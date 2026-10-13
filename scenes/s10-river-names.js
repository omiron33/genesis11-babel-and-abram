// s10-river-names: "Shem begat Arphaxad, two years past the flood / Sons and daughters, sons and
// daughters / Arphaxad, Shelah, Eber, Peleg / Sons and daughters, sons and daughters"
// Night on the river upstream, the water black and still. A low glide upstream along the steep clay
// bank, where a single scarlet thread runs on low stakes from camp to camp along the bank top; each
// camp is a small fire reflected in the water, and at each one side threads branch off inland into
// the dark. Each line is cut into the clay face of the bank by its camp as it is sung, lit by the
// fire above it.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { riverScene, bankX } from '/song/lib/x-river.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, wrap } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Shem begat', 'Sons and daughters', 'Arphaxad, Shelah', 'Sons and daughters');
  const L = A.lines;
  const Z0 = 0, Z1 = 80, W = 16384, H = 512, FACE = 1.4;
  // each line's stretch of the bank face (z from, z to)
  
  const camps = [5, 10, 16, 22, 28, 34];
  const camZ = (t) => 3 + (t - P.from) * 1.6;
  const LEN = [6.8, 5.0, 5.0, 5.0];
  let prevB = -1e9;
  // each line, wrapped on two rows, centred about six metres ahead of the camera in the middle of its line
  const span = L.map((l, k) => { const za = Math.max(camZ((l.start + l.end) / 2) + (k === 0 ? 7.6 : 6.2) - LEN[k] / 2, prevB + 0.6); prevB = za + LEN[k]; return [za, za + LEN[k]]; });
  const keys = [];
  for (let t = P.from; t <= P.to + 0.01; t += 1.0) {
    const z = camZ(t);
    // looking at the line being sung (its middle), else along the bank ahead
    const k = L.findIndex((l) => t < l.end + 0.6);
    const lz = k >= 0 ? (span[k][0] + span[k][1]) / 2 : z + 4.5;
    keys.push({ t, pos: [bankX(z) + 6.6 + 0.3 * Math.sin(t * 0.3), 1.6, z], look: [bankX(lz) + 0.2, 0.8, lz] });
  }
  const cam = track(keys, { handheld: { amount: 0.8, seed: 101 }, fov: 50 });
  const campU = new Array(24).fill(0); camps.forEach((z, k) => { campU[k * 2] = z; campU[k * 2 + 1] = 1; });
  const br = new Array(24).fill(-1e4); camps.forEach((z, k) => { br[k * 2] = z + 0.6; br[k * 2 + 1] = 0.5 + 0.3 * Math.sin(k * 2.1); });
  return riverScene(P, {
    name: 's10-river-names', cam,
    textSize: [W, H],
    sky: () => ({ ...skyMix('night', 'twilight', 0.05), uMoon: 0.5, uMoonDir: [0.4, 0.35, -0.85], uSunDir: [0.75, 0.3, -0.6], uSunCol: [0.4, 0.45, 0.65], uAmb: [0.05, 0.055, 0.08], uFogDen: 0.002, uFogCol: [0.02, 0.022, 0.03] }),
    uniforms: { uCamps: campU, uThreadZ: [-10, 90], uBranch: br, uTextZ: [Z0, Z1], uWind: 0.2 },
    update(t, u) { u.uSpin.value = t * 0.004; },
    drawText(ctx, t) {
      const ppm = W / (Z1 - Z0);
      L.forEach((l, k) => {
        const [za, zb] = span[k];
        // canvas x runs against z (the reader faces the bank, upstream on the left)
        const x0 = (Z1 - zb) * ppm, x1 = (Z1 - za) * ppm;
        // the canvas is squeezed along z (fewer pixels per metre than up the face): draw in metres-true units
        const sx = ppm / (H / FACE);
        ctx.save(); ctx.translate(x0, 0); ctx.scale(sx, 1);
        inscribe(ctx, t, wrap([l], k === 0 ? 25 : 22), { x: 10, y: H * 0.06, w: (x1 - x0) / sx - 20, h: H * 0.86 }, { size: Math.round(H * 0.34), leading: 1.12, valign: 'middle', font: 'name' });
        ctx.restore();
      });
    },
    post: () => grade({ exposure: 1.2, bloom: 0.14 }),
    finish: () => FINISH,
  });
};
