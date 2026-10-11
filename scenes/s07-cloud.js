// s07-cloud: "Behold, the people is one / and they have all one language / and this they begin to do /
// and now nothing will be withheld from them / Come, let Us go down / and confound their language
// there / that they may not understand / one another's speech"
// Night above the storm: a deck of cloud lit by the moon, lightning flickering deep in it. The camera
// glides over it toward the place where the tower lies hidden underneath. God's words are light
// gathered in the cloud's own surface, each line glowing in the cloud ahead as it is spoken, never on
// bright sky. On "Come, let Us go down" the camera dives into the cloud and comes out under it: the
// unfinished top of the tower is close below, its fires and scaffolding, and the last lines glow in
// the cloud's underside ahead.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { towerScene } from '/song/lib/x-tower.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Behold, the people', 'and they have all', 'and this they begin', 'and now nothing', 'Come, let Us go down', 'and confound', 'that they may not', "one another's speech");
  const L = A.lines;
  const ZL = [130, 112, 94, 76, 50, 31, 21, 11];          // where each line glows, along z
  const ZN = 140, ZF = -34, HX = 22, LD = 9;               // the rect of cloud that carries them
  const keys = [{ t: P.from, pos: [2, 214, ZL[0] + 42], look: [0, 190, ZL[0] - 6] }];
  L.slice(0, 5).forEach((l, k) => keys.push({ t: l.start + 0.3, pos: [(k % 2 ? 2 : -2), 211 - k, ZL[k] + 38], look: [0, 190, ZL[k] - 8] }));
  // on "Come, let Us go down" the camera sinks toward the words and goes down into the cloud with them
  keys.push({ t: L[4].end + 0.25, pos: [0, 205, ZL[4] + 28], look: [0, 186, ZL[4]] });
  keys.push({ t: L[5].start + 0.1, pos: [1, 118, 66], look: [0, 140, ZL[5]] });
  L.slice(5).forEach((l, k) => keys.push({ t: l.start + 0.3, pos: [(k % 2 ? -1 : 1.5), 114 - k, 60 - 2 * k], look: [0, 140, ZL[5 + k]] }));
  keys.push({ t: P.to, pos: [0, 110, 56], look: [0, 124, 0] });
  const cam = track(keys, { handheld: { amount: 1.0, seed: 77, metres: 2 }, fov: 50 });
  const TW = 2048, TH = Math.round(TW * (ZN - ZF) / (2 * HX));
  const flashes = [150.4, 156.3, 163.0, 169.9, 174.6];
  return towerScene(P, {
    name: 's07-cloud', cam,
    textSize: [TW, TH],
    sky: () => ({ ...skyMix('night', 'twilight', 0.0), uMoon: 1.0, uMoonDir: [0.3, 0.45, -0.84], uFogDen: 0.0009, uFogCol: [0.02, 0.022, 0.03] }),
    uniforms: { uFires: 1.0, uCloudY: 158, uCloudDen: 1.3, uPlainFires: 1.0, uWindT: 0.8, uStorm: 1.0, uCloudText: [HX, ZN, ZF, 1], uFlashAt: [0, 170, 0] },
    update(t, u) {
      let f = 0;
      for (const ft of flashes) { const d = t - ft; if (d > 0 && d < 0.5) f = Math.max(f, Math.exp(-d * 9) + 0.6 * Math.exp(-Math.abs(d - 0.16) * 30)); }
      u.uFlash.value = 0.8 * f;
      const k = flashes.findIndex((ft) => t - ft > -0.1 && t - ft < 0.6);
      u.uFlashAt.value.set(40 * Math.sin(k * 2.3), 170, 60 - 30 * k);
    },
    drawText(ctx, t) {
      const pxm = TH / (ZN - ZF);
      L.forEach((l, k) => {
        const cy = (ZL[k] - ZF) * pxm, h = (k >= 5 ? 9.5 : LD) * pxm;
        // the lines in the cloud's underside are read from below: drawn flipped top to bottom
        ctx.save();
        if (k >= 5) { ctx.translate(0, cy); ctx.scale(1, -1); ctx.translate(0, -cy); }
        inscribe(ctx, t, [{ words: l.words }], { x: 40, y: cy - h / 2, w: TW - 80, h }, { size: Math.round(h * 0.62), valign: 'middle', font: 'name', tint: [235, 228, 210] });
        ctx.restore();
      });
    },
    post: () => grade({ exposure: 1.3, bloom: 0.18 }),
    finish: () => FINISH,
  });
};
