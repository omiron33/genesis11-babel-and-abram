// s17-road-ahead: "But the road / is still ahead", then the end title over the long outro.
// Evening past Haran: the road runs on west between the hills toward the last light, the first star
// out above it, wind moving the dust along it. The two phrases are pressed into the road ahead as they
// are sung; further on the end title lies in the road. The camera rises slowly over the road to the
// last sound.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { desertScene, roadX, roadY } from '/song/lib/x-desert.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt, region, title } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'But the road', 'is still ahead');
  const L = A.lines;
  const z0 = 618;
  const zA = z0 + 8.5, zB = z0 + 13.5, zT = z0 + 34;
  const g = (z, hw, hd) => [roadX(z) + hw, z - hd, roadX(z) - hw, z + hd];
  const decal = [...g(zA, 3.2, 0.8), ...g(zB, 3.6, 0.8), ...g(zT, 6.0, 1.6), 0, 0, 0, 0];
  const decalUV = [0, 0.75, 1, 1, 0, 0.5, 1, 0.75, 0, 0, 1, 0.5, 0, 0, 0, 0];
  const y = (z) => roadY(z);
  const cam = track([
    { t: P.from, pos: [roadX(z0) + 0.3, y(z0) + 1.9, z0], look: [roadX(zA), y(zA), zA + 1] },
    { t: L[1].start + 0.3, pos: [roadX(z0 + 4) + 0.2, y(z0 + 4) + 2.3, z0 + 4], look: [roadX(zB), y(zB), zB + 1] },
    { t: 316.0, pos: [roadX(z0 + 12) + 0.1, y(z0 + 12) + 5.5, z0 + 12], look: [roadX(zT), y(zT), zT + 2] },
    { t: 324, pos: [roadX(z0 + 18), y(z0 + 18) + 9, z0 + 18], look: [roadX(zT), y(zT), zT + 6] },
    { t: P.to, pos: [roadX(z0 + 21), y(z0 + 21) + 12.5, z0 + 21], look: [roadX(zT + 30), y(zT + 30), zT + 60] },
  ], { handheld: { amount: 0.7, seed: 171 }, fov: 50 });
  return desertScene(P, {
    name: 's17-road-ahead', cam,
    textSize: [4096, 4096],
    sky: (t) => {
      const k = smooth(clamp01((t - P.from) / (P.to - P.from)));
      return { ...skyMix('dusk', 'twilight', 0.3 + 0.6 * k), uSunDir: [0.05, 0.02 - 0.05 * k, 0.99], uStars: 0.15 + 0.6 * k, uMoon: 0, uFogDen: 0.0008, uFogCol: [0.32, 0.24, 0.24] };
    },
    uniforms: { uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 2, 2, 0], uTracks: [-1000, 2000, 1e4, 1], uWindD: 0.7 },
    drawText(ctx, t) {
      region(ctx, [0, 0.75, 1, 1], 6.4, 1.6, (c, b) => inscribe(c, t, [{ words: L[0].words }], { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.62), valign: 'middle', font: 'name' }));
      region(ctx, [0, 0.5, 1, 0.75], 7.2, 1.6, (c, b) => inscribe(c, t, [{ words: L[1].words }], { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.62), valign: 'middle', font: 'name' }));
      // the end title, pressed into the road further on: the song's title and chapter only
      region(ctx, [0, 0, 1, 0.5], 12, 3.2, (c, b) => {
        title(c, t, 'BABEL AND ABRAM', b.w / 2, b.h * 0.5, { t0: 314.5, dur: 1.6, size: Math.round(b.h * 0.3), tracking: 0.1 });
        title(c, t, 'GENESIS 11', b.w / 2, b.h * 0.85, { t0: 315.6, dur: 1.4, size: Math.round(b.h * 0.18), tracking: 0.3 });
      });
    },
    post: () => grade({ exposure: 1.05, bloom: 0.12 }),
    finish: () => FINISH,
  });
};
