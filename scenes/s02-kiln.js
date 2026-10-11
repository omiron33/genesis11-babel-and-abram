// s02-kiln: "Higher, higher / Fire in the kiln / Higher, higher / Heaven's just a hill"
// The big kiln at the head of the brickfield, its fire roaring in the mouth and sparks going up. The
// four lines are fired into the bricks of its dome above the mouth, stacked from the mouth to the
// crown, each glowing kiln-hot as it is sung. The camera rises over the dome with them, so each line
// faces it in turn, and on "hill" lifts its eyes past the smoke to the tower standing on the plain.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { plainScene } from '/song/lib/x-plain.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from - 0.5, 'Higher, higher', 'Fire in the kiln', 'Higher, higher', "Heaven's just a hill");
  const L = A.lines;
  const K = [18.32, 40], S = 1.6;
  const surf = (phiDeg, out) => {
    const f = phiDeg * Math.PI / 180;
    const p = [K[0], S * (0.2 + 2.0 * Math.sin(f)), K[1] - S * 2.2 * Math.cos(f)];
    const n = [0, Math.sin(f), -Math.cos(f)];
    return { at: p, cam: p.map((v, i) => v + n[i] * out) };
  };
  // each line's latitude band centre on the dome (44-82 degrees, four bands)
  const lat = [48.5, 57, 65.5];
  const keys = [{ t: P.from, pos: [K[0] + 0.8, 1.4, K[1] - 7.5], look: [K[0], 1.2, K[1] - 3.4] }];
  L.slice(0, 3).forEach((l, k) => {
    const s = surf(lat[k], 3.4 + 0.4 * k);
    keys.push({ t: l.start + 0.15, pos: [s.cam[0] + 0.5 - 0.3 * k, s.cam[1], s.cam[2]], look: s.at });
  });
  // the last line is on the chimney's front; the camera comes level with it, the tower beyond
  const chY = S * 2.75, chZ = K[1] - S * 0.75;
  keys.push({ t: L[3].start + 0.2, pos: [K[0] - 0.3, chY + 0.5, chZ - 5.2], look: [K[0] + 0.2, chY + 0.1, chZ] });
  keys.push({ t: P.to, pos: [K[0] - 0.5, chY + 1.2, chZ - 6.4], look: [K[0] + 0.8, chY + 0.6, chZ + 40] });
  const cam = track(keys, { handheld: { amount: 0.9, seed: 31 }, fov: 48 });
  const TW = 2048, TH = Math.round(2048 * 0.95 / 3.2) * 4 / 3;
  return plainScene(P, {
    name: 's02-kiln', cam,
    textSize: [TW, TH],
    sky: () => ({ ...skyMix('sunrise', 'dusk', 0.7), uSunDir: [0.7, 0.16, 0.7], uFogDen: 0.0016, uFogCol: [0.4, 0.3, 0.24] }),
    uniforms: {
      uKiln: [K[0], K[1], S, 1.0, K[0] + 10, 44, 0.9, 0.9, K[0] - 9, 47, 0.85, 0.8], uKilnText: 1, uKilnUV: [0, 0.25, 1, 1], uKilnUV2: [0, 0, 1, 0.25],
      uTower: [70, 1350, 1, 0.5], uWind: 0.5, uBricks: 1,
    },
    drawText(ctx, t) {
      const rh = TH / 4;
      // the dome's three bands fill the canvas's top three quarters, lowest band lowest
      L.slice(0, 3).forEach((l, k) => inscribe(ctx, t, [{ words: l.words }], { x: 60, y: TH - rh - (k + 1) * rh * 1.0, w: TW - 120, h: rh }, { size: Math.round(rh * 0.62), valign: 'middle', font: 'name' }));
      // the chimney: the bottom quarter, drawn to the chimney's own proportions (1.5 x 0.85 kiln units)
      ctx.save(); ctx.translate(0, TH - rh); ctx.scale(1, rh / (TW * 0.85 / 1.5));
      inscribe(ctx, t, [{ words: L[3].words }], { x: 60, y: 0, w: TW - 120, h: TW * 0.85 / 1.5 }, { size: 300, valign: 'middle', font: 'name' });
      ctx.restore();
    },
    post: () => grade({ exposure: 1.0, bloom: 0.16 }),
    finish: () => FINISH,
  });
};
