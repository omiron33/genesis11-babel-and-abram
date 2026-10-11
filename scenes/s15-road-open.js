// s15-road-open: "ABRAM! / Toward the land of Canaan / ABRAM! / The road is open / ABRAM! / ABRAM!"
// The road climbs through a pass between sandstone cliffs, morning sun reaching into it. Each ABRAM
// has its own reveal: the first cut in the left cliff as the camera comes round it, the second in the
// right cliff, the third high on the left wall at the crest; on the last the camera rises over the
// crest and the land opens west, hills and a far green valley in the haze, with ABRAM pressed into the
// road at the brink. "Toward the land of Canaan" and "The road is open" are pressed into the road.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { desertScene, wallDecals, roadX, roadY, PASS } from '/song/lib/x-desert.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, region } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'ABRAM!', 'Toward the land', 'ABRAM!', 'The road is open', 'ABRAM!', 'ABRAM!');
  const L = A.lines;
  const camZ = (t) => 214 + (t - P.from) * 3.4;
  // the cliff along the road on the left carries the first five calls in two panels, read as the camera
  // walks along it: ABRAM / Toward the land of Canaan, then ABRAM / The road is open / ABRAM; the last
  // ABRAM lies pressed in the road at the crest, where the land opens west
  const p1 = camZ(L[1].start) + 9.5, p2 = camZ(L[3].start) + 9.5;
  const face = (z) => roadX(z) + 13.0;
  const base = (z) => roadY(z) + 4.0;
  const walls = wallDecals([
    { axis: 'x-', at: face(p1), u0: p1 - 6, u1: p1 + 6, y0: base(p1) + 2.6, y1: base(p1) + 6.6, uv: [0, 5 / 6, 1, 1] },
    { axis: 'x-', at: face(p1), u0: p1 - 6, u1: p1 + 6, y0: base(p1), y1: base(p1) + 2.2, uv: [0, 4 / 6, 1, 5 / 6] },
    { axis: 'x-', at: face(p2), u0: p2 - 6, u1: p2 + 6, y0: base(p2) + 5.2, y1: base(p2) + 8.6, uv: [0, 3 / 6, 1, 4 / 6] },
    { axis: 'x-', at: face(p2), u0: p2 - 6, u1: p2 + 6, y0: base(p2) + 2.8, y1: base(p2) + 5.0, uv: [0, 2 / 6, 1, 3 / 6] },
    { axis: 'x-', at: face(p2), u0: p2 - 6, u1: p2 + 6, y0: base(p2) - 0.6, y1: base(p2) + 2.6, uv: [0, 1 / 6, 1, 2 / 6] },
  ]);
  const zr3 = camZ(L[5].end) + 8;
  const decal = [roadX(zr3) + 3.6, zr3 - 0.9, roadX(zr3) - 3.6, zr3 + 0.9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const decalUV = [0, 0, 1, 1 / 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const keys = [];
  const at = (t, look, up = 0) => { const z = camZ(t); return { t, pos: [roadX(z) - 2.0, roadY(z) + 1.8 + up, z], look }; };
  const P1 = [face(p1), base(p1) + 3.2, p1], P2 = [face(p2), base(p2) + 4.0, p2];
  keys.push(at(P.from, P1), at(L[1].end + 0.3, P1), at(L[2].start - 0.1, P2), at(L[4].end + 0.2, P2));
  keys.push(at(L[5].start, [roadX(zr3), roadY(zr3), zr3 + 1], 0.6), at(L[5].end + 0.3, [roadX(zr3), roadY(zr3), zr3 + 1.5], 1.6));
  keys.push(at(P.to, [roadX(zr3 + 300), roadY(zr3 + 300), zr3 + 400], 2.6));
  const cam = track(keys, { handheld: { amount: 0.9, seed: 151 }, fov: 54 });
  return desertScene(P, {
    name: 's15-road-open', cam,
    textSize: [4096, 6144],
    sky: () => ({ ...skyMix('sunrise', 'dusk', 0.0), uCloud: 0.25, uSkyTop: [0.08, 0.17, 0.42], uSkyHor: [0.62, 0.6, 0.58], uSunDir: [-0.62, 0.38, -0.69], uSunCol: [3.0, 2.3, 1.6], uFogDen: 0.00045, uFogCol: [0.55, 0.58, 0.62] }),
    uniforms: { ...walls, uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 0, 0, 0], uCliffs: 2, uPanels: [p1, p2, -1e4], uTracks: [-1000, 1000, 1e4, 1], uGreen: 1, uWindD: 0.3 },
    drawText(ctx, t) {
      const R = (k) => [0, 1 - (k + 1) / 6, 1, 1 - k / 6];
      const abram = (li) => [{ words: [{ ...L[li].words[0], w: 'ABRAM' }] }];
      region(ctx, R(0), 12, 4, (c, b) => inscribe(c, t, abram(0), b, { size: Math.round(b.h * 0.86), valign: 'middle', font: 'name' }));
      region(ctx, R(1), 12, 2.2, (c, b) => inscribe(c, t, [{ words: L[1].words }], { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.62), valign: 'middle', font: 'name' }));
      region(ctx, R(2), 12, 3.4, (c, b) => inscribe(c, t, abram(2), b, { size: Math.round(b.h * 0.86), valign: 'middle', font: 'name' }));
      region(ctx, R(3), 12, 2.2, (c, b) => inscribe(c, t, [{ words: L[3].words }], { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.62), valign: 'middle', font: 'name' }));
      region(ctx, R(4), 12, 3.2, (c, b) => inscribe(c, t, abram(4), b, { size: Math.round(b.h * 0.86), valign: 'middle', font: 'name' }));
      region(ctx, R(5), 7.2, 1.8, (c, b) => inscribe(c, t, abram(5), { x: 30, y: 0, w: b.w - 60, h: b.h }, { size: Math.round(b.h * 0.8), valign: 'middle', font: 'caps' }));
    },
    post: () => grade({ exposure: 1.0, bloom: 0.1 }),
    finish: () => FINISH,
  });
};
