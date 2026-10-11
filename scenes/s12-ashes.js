// s12-ashes: "ABRAM! / Abram, Nahor, and Haran / ABRAM! / Out of the ashes of Babel / One name rising /
// ABRAM!"
// Sunrise. Across a river channel a long sandstone ridge faces the dawn. As the sun comes up its light
// comes down the face and ABRAM is there, cut huge in the rock, with "Abram, Nahor, and Haran" below.
// The camera comes down to the grey ash of a cold kiln on the near bank, the ashes of Babel, where
// the next two lines are written, then back up to the ridge in full sun for the last call, and down to
// the river under it, the water catching the low sun.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { desertScene, wallDecals, RIDGE1 } from '/song/lib/x-desert.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt, region, title } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'ABRAM!', 'Abram, Nahor', 'ABRAM!', 'Out of the ashes', 'One name rising', 'ABRAM!');
  const L = A.lines;
  const FZ = RIDGE1.z;                    // where the cliff face stands
  const ASH = { x0: 9, z0: 88, x1: -9, z1: 97 };
  const rows = 4;                         // canvas: ABRAM, the names, the two ash lines
  const walls = wallDecals([
    { axis: 'z-', at: FZ, u0: 40, u1: -40, y0: 14, y1: 32, uv: [0, 1 - 1 / rows, 1, 1] },
    { axis: 'z-', at: FZ, u0: 26, u1: -26, y0: 6.5, y1: 12.0, uv: [0, 1 - 2 / rows, 1, 1 - 1 / rows] },
  ]);
  const cam = track([
    { t: P.from, pos: [2, 3.0, 36], look: [0, 22, FZ] },
    { t: L[1].start + 0.4, pos: [1.5, 3.2, 42], look: [0, 15, FZ] },
    { t: L[3].start + 0.3, pos: [0.6, 4.2, 74], look: [0, 0, (ASH.z0 + ASH.z1) / 2 - 1] },
    { t: L[4].end + 0.2, pos: [-0.4, 4.0, 78], look: [0, 0.2, (ASH.z0 + ASH.z1) / 2 + 1] },
    { t: L[5].start + 0.2, pos: [-0.8, 3.8, 80], look: [0, 21, FZ] },
    { t: P.to, pos: [-1.0, 4.0, 82], look: [0, -1.5, 112] },
  ], { handheld: { amount: 0.8, seed: 121 }, fov: 52 });
  return desertScene(P, {
    name: 's12-ashes', cam,
    textSize: [4096, 4096],
    sky: (t) => {
      const k = smooth(clamp01((t - P.from) / 2.0));
      return { ...skyMix('predawn', 'sunrise', 0.4 + 0.6 * k), uSunDir: [0.12, 0.04 + 0.05 * k, -0.99], uSunCol: [3.2 * k + 0.2, 1.8 * k + 0.12, 0.9 * k + 0.08], uFogDen: 0.0014, uFogCol: [0.45, 0.36, 0.3] };
    },
    uniforms: {
      ...walls,
      uDecal: [ASH.x0, ASH.z0, ASH.x1, ASH.z1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], uDecalUV: [0, 0, 1, 2 / rows, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], uDecalKind: [3, 0, 0, 0],
      uRiver: [112, 6, -2.2, 1], uWindD: 0.2, uCliffs: 1,
    },
    update(t, u) {
      // the light comes down the face: the shadow line falls from the ridge top to its foot
      u.uSunLine.value = 60 - 70 * smooth(clamp01((t - (P.from + 0.1)) / 0.9));
    },
    drawText(ctx, t) {
      const H = ctx.canvas.height / rows;
      // ABRAM, cut in the rock: it is there before it is sung, unseen until the light reaches it
      region(ctx, [0, 1 - 1 / rows, 1, 1], 80, 18, (c, b) => {
        c.save(); c.font = `600 ${Math.round(b.h * 0.86)}px "EB Garamond"`; c.letterSpacing = `${Math.round(b.h * 0.06)}px`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = '#fff'; c.fillText('ABRAM', b.w / 2, b.h * 0.54); c.restore();
      });
      region(ctx, [0, 1 - 2 / rows, 1, 1 - 1 / rows], 52, 5.5, (c, b) => inscribe(c, t, [{ words: L[1].words }], { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: Math.round(b.h * 0.7), valign: 'middle', font: 'name' }));
      // the ash: the bottom half of the canvas, two lines
      region(ctx, [0, 0, 1, 2 / rows], 18, 9, (c, b) => {
        inscribe(c, t, [{ words: L[3].words }], { x: 40, y: b.h * 0.08, w: b.w - 80, h: b.h * 0.4 }, { size: Math.round(b.h * 0.24), valign: 'middle', font: 'name' });
        inscribe(c, t, [{ words: L[4].words }], { x: 40, y: b.h * 0.52, w: b.w - 80, h: b.h * 0.4 }, { size: Math.round(b.h * 0.26), valign: 'middle', font: 'name' });
      });
      void H; void title;
    },
    post: () => grade({ exposure: 1.0, bloom: 0.12 }),
    finish: () => FINISH,
  });
};
