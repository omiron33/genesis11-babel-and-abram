// s03-ramp: chorus 1. "Let us build us a city / Let us raise up a tower / With its top in the heavens /
// Let us make us a name / Or the wind will come scatter us / Over the face of the earth / Let us build,
// let us build / Let us make us a name"
// Dusk on the tower: a steady climb up the fourth ramp, the brick wall of the next stage on the right,
// the parapet and the long drop to the plain on the left, braziers burning along the parapet. Each
// chorus line burns into the fired bricks of the wall as it is sung, one stretch of wall per line,
// running up the wall with the ramp. On "Or the wind will come scatter us" a gust throws dust over the
// parapet. The climb goes on toward the cloud sitting on the tower's top.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { towerScene, slotUniforms, hwAt } from '/song/lib/x-tower.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt, region } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from - 0.3, 'Let us build us a city', 'Let us raise up a tower', 'With its top in the heavens', 'Let us make us a name', 'Or the wind will come', 'Over the face of the earth', 'Let us build, let us build', 'Let us make us a name');
  const L = A.lines;
  // ramp 3: from terrace 3 (y 78) at x = +36 up to terrace 4 (y 96) at x = -36
  const RY = (x) => 78 + 18 * (36 - x) / 72, ZW = (y) => hwAt(4, y);
  const v = 2.2, X0 = 33.5;
  const camX = (t) => X0 - v * (t - P.from);
  const LEN = 5.6;
  let prevA = 0;
  const slots = L.map((l, k) => {
    // each line ends about 5 m ahead of where the camera is when it begins, so it is read at an angle
    // of about forty degrees and passes alongside as it is sung
    // lines one after another up the wall, each a little ahead of where the camera is when it begins,
    // never on top of the line before
    const xb = 27.5 - k * (LEN + 1.45), xa = xb - LEN;
    prevA = xa;
    return { stage: 4, x0: xa, x1: xb, y0: RY(xa) + 0.7, y1: RY(xa) + 2.0, slope: -0.25, u0: 0, u1: 1, v0: 1 - (k + 1) / 8, v1: 1 - k / 8, kind: 1 };
  });
  // the camera walks on up the ramp, standing back from the wall; it reaches about 9 m short of each
  // line as the line begins and turns to it, so the whole line stays in frame while it is sung
  const keys = [{ t: P.from, pos: [36, RY(36) + 1.7, ZW(RY(36)) + 6.0], look: [24, RY(24) + 1.4, ZW(RY(24)) + 1] }];
  L.forEach((l, k) => {
    const sl = slots[k], cx = (sl.x0 + sl.x1) / 2;
    const at = (x, t) => ({ t, pos: [x, RY(x) + 1.7, ZW(RY(x)) + 4.3], look: [cx, RY(cx) + 1.45, ZW(RY(cx))] });
    keys.push(at(sl.x1 + 3.2, l.start));
    keys.push(at(sl.x1 + 1.4, l.end + 0.3));
  });
  keys.push({ t: P.to, pos: [slots[7].x0 + 2, RY(slots[7].x0 + 2) + 1.9, ZW(RY(slots[7].x0)) + 6.5], look: [slots[7].x0 - 20, RY(slots[7].x0) + 12, 0] });
  const cam = track(keys, { handheld: { amount: 1.0, seed: 33 }, fov: 58 });
  const gust = (t) => smooth(clamp01((t - L[4].start + 0.3) / 0.8)) * (1 - smooth(clamp01((t - L[5].start - 1.5) / 2.5)));
  return towerScene(P, {
    name: 's03-ramp', cam,
    textSize: [4096, 2048],
    slots,
    sky: (t) => ({ ...skyMix('dusk', 'twilight', 0.45 + 0.35 * (t - P.from) / 27.5), uSunDir: [0.62, 0.05, -0.78], uSunCol: [1.6, 0.8, 0.45], uSkyHor: [0.55, 0.3, 0.22], uAmb: [0.1, 0.085, 0.09], uFogDen: 0.0016, uFogCol: [0.3, 0.2, 0.17] }),
    uniforms: { uFires: 1.0, uCloudY: 112, uCloudDen: 0.8, uPlainFires: 0.6, uWindT: 0.5 },
    update(t, u) {
      u.uDust.value = 0.9 * gust(t);
      u.uWindT.value = 0.5 + 1.5 * gust(t);
    },
    drawText(ctx, t) {
      L.forEach((l, k) => region(ctx, [0, 1 - (k + 1) / 8, 1, 1 - k / 8], LEN, 1.3, (c, b) =>
        inscribe(c, t, [{ words: l.words }], { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: Math.round(b.h * 0.7), valign: 'middle', font: 'name', tint: [255, 140, 60], lead: k === 0 ? 0.2 : 0.04 })));
    },
    post: () => grade({ exposure: 1.1, bloom: 0.14 }),
    finish: () => FINISH,
  });
};
