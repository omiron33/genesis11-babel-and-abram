// s01-brickfield: "We came out of the east with the flood still in our hair / Found a plain in Shinar
// and we settled there / Said, "Come, let us make bricks, let us burn them through" / Brick for
// stone, and the pitch for glue"
// Morning on the plain: rows of mud bricks drying in the sun, the kilns smoking ahead. Each sung line
// has its own short run of bricks (two rows of six) lying across the camera's path, facing it, one
// word to a brick. The camera walks at the pace of the voice: it slows over each run as the words are
// stamped in one after another (each stamp filling with black pitch), holds the finished line whole,
// then walks on. The last two lines lie one run behind the other, since they are sung back to back.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { plainScene, BF, BRICK } from '/song/lib/x-plain.js';
import { skyMix, grade, FINISH, clamp01 } from '/song/lib/look.js';
import { anchorAt, ignite, FONTS } from '/song/lib/type.js';
export const kind = 'shader';

const PER = 7;                                     // words per brick row
export default (P) => {
  const A = anchorAt(lyrics, P.from, 'We came out of the east', 'Found a plain in Shinar', 'Said, "Come, let us make', 'Brick for stone');
  const L = A.lines;
  const I0 = 33;                                   // first brick column of every run
  const xR = BF.x0 + I0 * BRICK.cx, xL = BF.x0 + (I0 + PER) * BRICK.cx;   // screen-left edge is +x
  const xc = (xL + xR) / 2;
  // brick rows (j) carrying each line: two rows per line, in singing order up the field
  const J = [[12, 13], [23, 24], [33, 34], [42, 43]];
  const rowZ = (j) => BF.z0 + j * BRICK.cz;
  const strips = J.flat().map(rowZ);
  // split each line's words over its two rows
  const rows = L.map((l) => { const n = l.words.length, a = Math.ceil(n / 2); return [l.words.slice(a), l.words.slice(0, a)]; });
  // the camera keeps walking: about 4.6 m short of a run's near row as its line begins, 2.6 m as it
  // ends, and on to the next run between lines; the last two runs lie one behind the other
  const near = (k) => rowZ(J[k][0]);
  const keys = [{ t: P.from, pos: [xc + 0.7, 1.75, near(0) - 7.0], look: [xc + 0.3, 0, near(0) - 1.5] }];
  L.forEach((l, k) => {
    keys.push({ t: l.start, pos: [xc + 0.3 - 0.12 * k, 2.7, near(k) - 3.0], look: [xc + 0.1, 0, near(k) + 0.45] });
    keys.push({ t: l.end + 0.15, pos: [xc + 0.15 - 0.12 * k, 2.6, near(k) - 2.4], look: [xc, 0, near(k) + 0.6] });
  });
  keys.push({ t: P.to, pos: [xc - 0.4, 1.85, near(3) - 0.2], look: [xc - 0.6, 1.0, 40] });
  const cam = track(keys, { handheld: { amount: 0.8, seed: 21 }, fov: 50, endSpeed: 0.5 });
  const SW = 4096, SH = Math.round(SW * BRICK.cz / (PER * BRICK.cx)) * strips.length;
  return plainScene(P, {
    name: 's01-brickfield', cam,
    textSize: [SW, SH],
    sky: () => ({ ...skyMix('sunrise', 'dusk', 0.15), uSunDir: [0.78, 0.26, 0.57], uSunCol: [2.6, 1.75, 1.05], uFogDen: 0.0014, uFogCol: [0.42, 0.36, 0.3] }),
    uniforms: {
      uStrip: [...strips], uStripX: [xL, xR], uStrips: strips.length, uStripCanvas: [0, 0, 1, 1],
      uKiln: [xc, 40, 1.0, 1.0, xc + 10, 44, 0.9, 0.9, xc - 9, 47, 0.85, 0.8], uTower: [70, 1350, 1, 0.2], uWind: 0.5, uBricks: 1,
    },
    post: () => grade({ exposure: 1.0, bloom: 0.1 }),
    finish: () => FINISH,
    drawText(ctx, t) {
      const sh = SH / strips.length, cw = SW / PER;
      rows.forEach((pair, k) => pair.forEach((ws, r) => {
        // the first half of a line lies on the farther row, so the line reads top to bottom
        const strip = k * 2 + r;
        ws.forEach((w, i) => {
          const g = ignite(w, t, { lead: 0.02, rise: 0.09 });
          if (g.a <= 0.001) return;
          const fill = clamp01((t - w.start - 0.12) / 0.45);
          let size = 260;
          ctx.font = FONTS.name(size);
          const tw = ctx.measureText(w.w).width;
          if (tw > cw * 0.88) { size = Math.floor(size * cw * 0.88 / tw); ctx.font = FONTS.name(size); }
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.globalAlpha = g.a;
          ctx.fillStyle = `rgb(${Math.round(fill * 255)},0,0)`;
          // each brick's word, centred on its brick (cell centre; the brick is 0.56 of the 0.62 cell)
          ctx.fillText(w.w, cw * (i + 0.5 + Math.floor((PER - ws.length) / 2)), sh * strip + sh * 0.5 - 0.02 * sh);
        });
      }));
      ctx.globalAlpha = 1;
    },
  });
};
