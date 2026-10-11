// s16-haran: "They came to Haran and they settled there / And Terah died in Haran / Two hundred and
// five years"
// Dusk at Haran, the sun going down ahead in the west. A stone well curb beside the road, the first
// line pressed into the trodden dust round it; past it by the roadside a cairn of stones, its top stone
// laid flat with the last two lines cut in it. The camera passes the well, comes to the cairn, and
// turns to the road going on west.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { desertScene, wallDecals, roadX, roadY, WELL, CAIRN } from '/song/lib/x-desert.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, region } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'They came to Haran', 'And Terah died', 'Two hundred');
  const L = A.lines;
  const g = roadY(600);
  // the first line in the dust between the road and the well
  const zA = WELL[1] - 2.6;
  void g;
  const decal = [roadX(zA) + 6.5, zA - 0.9, roadX(zA) - 2.0, zA + 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const decalUV = [0, 0.5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  // the cairn's top stone faces the road (+x): its face is about 0.15 m out from the cairn's centre line
  const slabX = CAIRN[0] + 0.2 + 0.09 + 0.02;
  const walls = wallDecals([{ axis: 'x+', at: slabX, u0: CAIRN[1] + 0.66, u1: CAIRN[1] - 0.66, y0: roadY(CAIRN[1]) - 0.1 + 1.36, y1: roadY(CAIRN[1]) - 0.1 + 2.08, uv: [0, 0, 1, 0.5] }]);
  const keys = [
    { t: P.from, pos: [roadX(587) + 1.2, roadY(587) + 2.6, 586.5], look: [roadX(zA) + 2.4, roadY(zA), zA] },
    { t: L[0].end + 0.2, pos: [roadX(592) + 1.6, roadY(592) + 2.6, 591.5], look: [roadX(zA) + 2.2, roadY(zA), zA] },
    { t: L[1].start + 0.2, pos: [slabX + 2.6, roadY(608) + 1.7, 608.6], look: [slabX, roadY(CAIRN[1]) + 1.62, CAIRN[1]] },
    { t: L[2].end + 0.35, pos: [slabX + 2.3, roadY(610) + 1.7, 610.2], look: [slabX, roadY(CAIRN[1]) + 1.62, CAIRN[1]] },
    { t: P.to, pos: [roadX(611) + 0.3, roadY(611) + 1.9, 611], look: [roadX(700), roadY(700), 760] },
  ];
  const cam = track(keys, { handheld: { amount: 0.8, seed: 161 }, fov: 50 });
  return desertScene(P, {
    name: 's16-haran', cam,
    textSize: [4096, 2048],
    sky: () => ({ ...skyMix('dusk', 'twilight', 0.15), uSunDir: [0.15, 0.08, 0.99], uFogDen: 0.0009, uFogCol: [0.42, 0.3, 0.26] }),
    uniforms: { ...walls, uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 0, 0, 0], uWell: 1, uCairn: 1, uTracks: [-1000, 1000, 1e4, 1], uWindD: 0.3 },
    drawText(ctx, t) {
      region(ctx, [0, 0.5, 1, 1], 8.5, 1.8, (c, b) => inscribe(c, t, [{ words: L[0].words }], { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.5), valign: 'middle', font: 'name' }));
      region(ctx, [0, 0, 1, 0.5], 1.32, 0.72, (c, b) => inscribe(c, t, [{ words: L[1].words }, { words: L[2].words }], { x: 20, y: 0, w: b.w - 40, h: b.h }, { size: Math.round(b.h * 0.3), leading: 1.25, valign: 'middle', font: 'name' }));
    },
    post: () => grade({ exposure: 1.05, bloom: 0.12 }),
    finish: () => FINISH,
  });
};
