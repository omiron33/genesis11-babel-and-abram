// s05-terraces: chorus 2. "Let us build us a city / Let us raise up a tower / With its top in the
// heavens / Let us make us a name / Or the wind will come scatter us / Over the face of the earth /
// Let us build, let us build / Let us make us a name"
// Night: a long crane up the tower's front, stage by stage. Each finished stage carries a band of blue
// glazed brick near its top, and each of the first five lines is set in yellow glaze in one band, read
// in rising order, the fires along the terraces lighting it. Above them the last two stages are
// unfinished, raw brick and scaffolding, and the last three lines burn into the bare brick there, the
// last of all at the ragged top where the brickwork goes up into the cloud.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { towerScene, tierY1, hwAt } from '/song/lib/x-tower.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, region } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from - 0.3, 'Let us build us a city', 'Let us raise up a tower', 'With its top in the heavens', 'Let us make us a name', 'Or the wind will come', 'Over the face of the earth', 'Let us build, let us build', 'Let us make us a name');
  const L = A.lines;
  // the first five lines in the glazed bands of stages 0-4, read in rising order; the last three on the
  // raw brick of unfinished stage 5, running up parallel to the ramp that climbs its face
  const HW = 13, HH = 1.3;
  const ramp4 = (x) => 96 + 18 * (x + 28.25) / 56.5;
  const slots = L.map((l, k) => {
    if (k < 5) { const y = tierY1(k) - 2.6; return { stage: k, x0: -HW, x1: HW, y0: y - HH, y1: y + HH, v0: 1 - (k + 1) / 8, v1: 1 - k / 8, kind: 2 }; }
    const x0 = -30, x1 = -6, off = [6.6, 4.3, 2.0][k - 5], hh = 1.0;
    return { stage: 5, x0, x1, y0: ramp4(x0) + off, y1: ramp4(x0) + off + 2 * hh, slope: 18 / 56.5, v0: 1 - (k + 1) / 8, v1: 1 - k / 8, kind: 1 };
  });
  const mid = (k) => { const s = slots[k]; const cx = (s.x0 + s.x1) / 2; return [cx, (s.y0 + s.y1) / 2 + (s.slope ?? 0) * (cx - s.x0), hwAt(s.stage, s.y0)]; };
  // a steady crane: the camera's height and aim pass through each line's band in the middle of its line
  const keys = [{ t: P.from, pos: [22, tierY1(0) - 6, hwAt(0, 20) + 52], look: [0, tierY1(0) - 3, hwAt(0, 20)] }];
  L.forEach((l, k) => {
    const m = mid(k), tm = (l.start + l.end) / 2;
    const far = k < 5 ? 33 - k : 25;
    // hold on each band from just after it begins until just after it ends, then crane on
    const at = (t, dy) => ({ t, pos: [m[0] + far * 0.22, m[1] + 1.5 + dy, m[2] + far], look: [m[0], m[1] + dy * 0.5, m[2]] });
    keys.push(at(Math.min(l.start + 0.3, tm), -0.4), at(Math.max(l.end + 0.3, tm), 0.4));
  });
  keys.push({ t: P.to, pos: [mid(7)[0] + 13, mid(7)[1] + 4.5, mid(7)[2] + 27], look: [mid(7)[0] + 2, mid(7)[1] + 5, mid(7)[2]] });
  const cam = track(keys, { handheld: { amount: 1.2, seed: 55, metres: 2 }, fov: 46 });
  return towerScene(P, {
    name: 's05-terraces', cam,
    textSize: [4096, 2816],
    slots,
    sky: () => ({ ...skyMix('night', 'twilight', 0.15), uFogDen: 0.0009, uFogCol: [0.03, 0.03, 0.05] }),
    uniforms: { uFires: 1.0, uCloudY: 134, uCloudDen: 1.0, uPlainFires: 1.0, uWindT: 0.6, uStorm: 0.3 },
    drawText(ctx, t) {
      L.forEach((l, k) => region(ctx, [0, 1 - (k + 1) / 8, 1, 1 - k / 8], slots[k].x1 - slots[k].x0, slots[k].y1 - slots[k].y0, (c, b) =>
        inscribe(c, t, [{ words: l.words }], { x: 60, y: 0, w: b.w - 120, h: b.h }, { size: Math.round(b.h * 0.72), valign: 'middle', font: k < 5 ? 'caps' : 'name', tracking: k < 5 ? 0.06 : 0, tint: k < 5 ? [255, 220, 120] : [255, 140, 60] })));
    },
    post: () => grade({ exposure: 1.2, bloom: 0.16 }),
    finish: () => FINISH,
  });
};
