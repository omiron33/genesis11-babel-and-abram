// s09-left-off: "They left off building the city / And they called its name Babel / For there the LORD
// confused / the language of all the earth"
// Grey morning after the storm. The brickfield is abandoned: sand has drifted over the rows of bricks,
// only their edges showing here and there, the kilns cold, and far off the unfinished tower stands in
// the haze. A slow walk across the drifts. The lines are pressed into the drifted sand ahead, and
// "Babel" is stamped in the one brick the wind has swept clear.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { plainScene, BF, BRICK } from '/song/lib/x-plain.js';
import { skyMix, grade, FINISH, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt, region, ignite, FONTS } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'They left off', 'And they called', 'For there the LORD', 'the language of all');
  const L = A.lines;
  const XC = 22, W = 2.7, D = 0.56;
  // the four lines in the sand (the second without its last word, which is on the brick)
  const Z = [7.6, 11.4, 15.8, 19.8];
  const decal = new Array(16).fill(0), decalUV = new Array(16).fill(0);
  const rows = 5;
  Z.forEach((z, k) => { decal.splice(k * 4, 4, XC + W, z - D, XC - W, z + D); decalUV.splice(k * 4, 4, 0, 1 - (k + 1) / rows, 1, 1 - k / rows); });
  // the brick: cell (I, J), to the right of the second line
  const I = Math.round((XC - W - 0.5 - BF.x0) / BRICK.cx - 0.5), J = Math.round((Z[1] - BF.z0) / BRICK.cz - 0.5);
  const bx = BF.x0 + (I + 0.5) * BRICK.cx, bz = BF.z0 + J * BRICK.cz;
  const keys = [
    { t: P.from, pos: [XC + 0.8, 2.4, -0.5], look: [XC + 0.3, 0.2, Z[0]] },
    { t: L[0].start + 0.3, pos: [XC + 0.3, 2.6, Z[0] - 6.4], look: [XC, 0.2, Z[0]] },
    { t: L[1].start + 0.3, pos: [XC - 0.6, 2.6, Z[1] - 6.3], look: [XC - 1.3, 0.2, Z[1]] },
    { t: L[1].end + 0.5, pos: [XC - 2.6, 1.9, Z[1] - 2.6], look: [XC - W - 0.5, 0.1, Z[1]] },
    { t: L[2].start + 0.3, pos: [XC - 0.2, 2.6, Z[2] - 6.4], look: [XC, 0.2, Z[2]] },
    { t: L[3].start + 0.3, pos: [XC + 0.2, 2.6, Z[3] - 6.4], look: [XC, 0.2, Z[3]] },
    { t: L[3].end + 0.4, pos: [XC + 0.3, 2.7, Z[3] - 4.4], look: [XC, 0.2, Z[3] + 0.6] },
    { t: P.to, pos: [XC + 0.6, 2.0, Z[3] - 1.0], look: [XC + 8, 6, 600] },
  ];
  const cam = track(keys, { handheld: { amount: 0.7, seed: 99 }, fov: 50 });
  const TW = 4096, TH = 4096;
  return plainScene(P, {
    name: 's09-left-off', cam,
    textSize: [TW, TH],
    sky: () => ({ ...skyMix('predawn', 'sunrise', 0.35), uSunDir: [0.5, 0.12, 0.86], uSunCol: [1.1, 0.95, 0.85], uCloud: 0.85, uFogDen: 0.0035, uFogCol: [0.42, 0.38, 0.34] }),
    uniforms: {
      uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 2, 2, 2],
      uStrip: [bz, -1e4, -1e4, -1e4, -1e4, -1e4, -1e4, -1e4], uStripX: [bx + BRICK.cx / 2, bx - BRICK.cx / 2], uStrips: 1, uStripCanvas: [0, 0, 0.3, 1 / rows],
      uKiln: [18.3, 40, 1.0, 0, 28.3, 44, 0.9, 0, 9.3, 47, 0.85, 0], uTower: [70, 1350, 1, 0], uWind: 0.6, uBricks: 1, uSand: 1, uClear: [bx, bz + 0.21, 0.75],
    },
    drawText(ctx, t) {
      const parts = [L[0].words, L[1].words.slice(0, -1), L[2].words, L[3].words];
      parts.forEach((ws, k) => region(ctx, [0, 1 - (k + 1) / rows, 1, 1 - k / rows], 2 * W, 2 * D, (c, b) =>
        inscribe(c, t, [{ words: ws }], { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: Math.round(b.h * 0.68), valign: 'middle', font: 'name' })));
      // Babel, stamped in the brick and filled with pitch
      const w = L[1].words[L[1].words.length - 1];
      const g = ignite(w, t, { lead: 0.02, rise: 0.1 });
      if (g.a > 0) {
        const x0 = 0, x1 = 0.3 * TW, y0 = TH * (1 - 1 / rows), h = TH / rows;
        ctx.save(); ctx.font = FONTS.caps(Math.round(Math.min(h * 0.75, (x1 - x0) / 3.9))); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = g.a; ctx.fillStyle = `rgb(${Math.round(clamp01((t - w.start - 0.1) / 0.4) * 255)},0,0)`;
        ctx.fillText('BABEL', (x0 + x1) / 2, y0 + h / 2);
        ctx.restore();
      }
    },
    post: () => grade({ exposure: 1.05, bloom: 0.08, saturation: 0.85 }),
    finish: () => FINISH,
  });
};
