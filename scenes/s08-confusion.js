// s08-confusion: "Bring me the— / what? / Brick— pitch— your mouth— / I don't know your mouth /
// Babel, babble, babble, babble / SCATTERED / scattered over the face / of the earth"
// The third ramp at night in the storm, wind tearing dust off the tower. Each shouted phrase burns into
// the wall whole and sharp as it is shouted, is read, and only then breaks: letters collapse into
// wedge marks, swap places, split, crumble. The four Babel beats are four bricks in a row, each
// breaking differently. The wall's brickwork cracks. The camera backs away down the ramp, and on
// "SCATTERED" the burning letters and the dust blow out over the parapet into the dark.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { towerScene, slotUniforms, hwAt } from '/song/lib/x-tower.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { anchorAt, region, breakText } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Bring me the', 'what?', 'Brick— pitch', "I don't know", 'Babel, babble', 'SCATTERED', 'scattered over', 'of the earth');
  const L = A.lines;
  // ramp 2 runs along stage 3's front from x = -48.5 (y 60) up to x = +48.5 (y 78)
  const RY = (x) => 60 + 18 * (x + 48.5) / 97, ZW = (y) => hwAt(3, y);
  const camX = (t) => -22 + 0.95 * (t - P.from);
  // phrases on the wall, each a little ahead of where the camera is when it is shouted, alternating high and low
  const groups = [
    { lines: [0, 1], mode: 'wedge' }, { lines: [2], mode: 'swap' }, { lines: [3], mode: 'split' },
    { lines: [4], mode: 'babel' }, { lines: [5], mode: 'scatter' }, { lines: [6], mode: 'scatter' }, { lines: [7], mode: 'scatter' },
  ];
  const LEN = 4.6, LENS = [4.6, 4.6, 4.6, 8.0, 4.6, 4.6, 4.6];
  const slots = groups.map((g, i) => {
    const t0 = L[g.lines[0]].start;
    const x0 = camX(t0) + 4.2;
    const y0 = RY(x0) + [1.5, 0.45, 2.55][i % 3];
    return { stage: 3, x0, x1: x0 + LENS[i], y0, y1: y0 + 1.0, slope: 18 / 97, v0: 1 - (i + 1) / 8, v1: 1 - i / 8, kind: 1 };
  });
  // backing up the ramp slowly, turned to the phrase being shouted so it stays whole in frame
  const keys = [];
  for (let t = P.from; t <= P.to + 0.01; t += 0.6) {
    const x = camX(t), y = RY(x), zw = ZW(y);
    let g = groups.findIndex((gg) => t < L[gg.lines[gg.lines.length - 1]].end + 0.6);
    if (g < 0) g = groups.length - 1;
    const sl = slots[g], cx = (sl.x0 + sl.x1) / 2;
    keys.push({ t, pos: [x, y + 1.7, zw + 4.4], look: [cx, (sl.y0 + sl.y1) / 2 + sl.slope * (cx - sl.x0) - 0.2, zw] });
  }
  const cam = track(keys, { handheld: { amount: 1.6, seed: 88 }, fov: 60 });
  const storm = (t) => smooth(clamp01((t - P.from) / 3));
  return towerScene(P, {
    name: 's08-confusion', cam,
    textSize: [4096, 4096],
    slots,
    sky: () => ({ ...skyMix('night', 'twilight', 0.0), uSkyTop: [0.006, 0.006, 0.012], uSkyHor: [0.05, 0.035, 0.04], uMoon: 0.0, uFogDen: 0.002, uFogCol: [0.05, 0.045, 0.05] }),
    uniforms: { uFires: 0.9, uCloudY: 118, uCloudDen: 1.2, uPlainFires: 0.7, uWindT: 2.0, uStorm: 1.0 },
    update(t, u) {
      u.uDust.value = 0.3 + 0.7 * storm(t) * (0.6 + 0.4 * smooth(clamp01((t - L[5].start) / 1.5)));
      u.uCrack.value = smooth(clamp01((t - L[4].start) / 2.5));
      u.uFires.value = 0.9 - 0.5 * smooth(clamp01((t - L[5].start) / 4));
      let f = 0; for (const ft of [179.8, 183.7, 186.4]) { const d = t - ft; if (d > 0 && d < 0.5) f = Math.max(f, Math.exp(-d * 10)); }
      u.uFlash.value = 0.6 * f;
    },
    drawText(ctx, t) {
      groups.forEach((g, i) => region(ctx, [0, 1 - (i + 1) / 8, 1, 1 - i / 8], LENS[i], 1.0, (c, b) => {
        const box = { x: 30, y: 0, w: b.w - 60, h: b.h }, size = Math.round(b.h * 0.66);
        if (g.mode === 'babel') {
          // the four Babel beats: one word to a brick-width each, four different breaks
          const ws = L[g.lines[0]].words, modes = ['none', 'swap', 'split', 'crumble'];
          ws.forEach((w, j) => breakText(c, t, [w], { x: box.x + j * box.w / 4, y: 0, w: box.w / 4, h: b.h }, { size, font: j ? 'name' : 'caps', mode: modes[j], t0: j ? w.end + 0.35 : 1e9, dur: 0.9, seed: 40 + j, tint: [255, 140, 60] }));
        } else {
          const ws = g.lines.flatMap((k) => L[k].words);
          const last = ws[ws.length - 1];
          breakText(c, t, ws, box, { size, font: g.lines[0] === 5 ? 'caps' : 'name', mode: g.mode, t0: last.end + (g.mode === 'scatter' ? 0.35 : 0.45), dur: g.mode === 'scatter' ? 1.4 : 0.9, seed: i, tint: [255, 140, 60] });
        }
      }));
    },
    post: () => grade({ exposure: 1.15, bloom: 0.15 }),
    finish: () => FINISH,
  });
};
