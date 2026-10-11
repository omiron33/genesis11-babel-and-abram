// s14-out-of-ur: "Terah took his son, took his grandson, took the bride / Out of Ur of the Chaldeans,
// toward Canaan's side / They tried to build a name with brick and fire / But the name comes walking
// out of Ur"
// Dawn on the road west of Ur, the river behind. A low walk beside fresh tracks heading west:
// footprints, hoofprints, cart ruts. Far ahead a caravan, small figures and camels, walks the rise
// toward the hills. The lines are pressed into the sand beside the tracks; by a lone fallen brick the
// camera turns to the east, where the ruined tower stands on the horizon in the haze, then turns back
// west to the tracks and the walkers for the last line.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { desertScene, roadX } from '/song/lib/x-desert.js';
import { skyMix, grade, FINISH } from '/song/lib/look.js';
import { inscribe, anchorAt, region, wrap } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Terah took his son', 'Out of Ur', 'They tried to build', 'But the name comes');
  const L = A.lines;
  const camZ = (t) => -150 + (t - P.from) * 1.45;
  // each line pressed beside the tracks (the road's -x side, read from the road looking west)
  const zL = L.map((l) => camZ(l.end) + 6.0);
  const side = [1, 1, -1, 1];
  // each line lies across the road, the tracks running through it
  const rect = (k) => { const z = zL[k], x = roadX(z); return [x + 10.4, z - 1.3, x + 1.9, z + 1.3]; };
  const decal = new Array(16).fill(0), decalUV = new Array(16).fill(0);
  L.forEach((l, k) => {
    const r = rect(k);
    decal.splice(k * 4, 4, ...r);
    decalUV.splice(k * 4, 4, 0, 1 - (k + 1) / 4, 1, 1 - k / 4);
  });
  const bz = zL[2] - 2.6, bx = roadX(bz) + 4.2;
  const keys = [];
  for (let t = P.from; t <= P.to + 0.01; t += 1.0) {
    const z = camZ(t), x = roadX(z) + 0.4;
    // during the third line the camera turns east, over the brick, to the tower on the horizon
    const back = false;
    const k = L.findIndex((l) => t < l.end + 0.4);
    const kk = k < 0 ? 3 : k;
    const lookAt = back ? [roadX(zL[2]) - 1.5, 0.3, zL[2] - 2.0] : [roadX(zL[kk]) + 4.4, 0.2, zL[kk] + 1.0];
    keys.push({ t, pos: [x + 0.6, back ? 2.6 : 2.1, z], look: lookAt });
  }
  keys.push({ t: P.to + 0.6, pos: [roadX(camZ(P.to)) + 0.4, 1.9, camZ(P.to) + 0.8], look: [roadX(camZ(P.to) + 60), 1.5, camZ(P.to) + 300] });
  const cam = track(keys, { handheld: { amount: 0.9, seed: 141 }, fov: 52 });
  return desertScene(P, {
    name: 's14-out-of-ur', cam,
    textSize: [4096, 4096],
    sky: () => ({ ...skyMix('sunrise', 'dusk', 0.1), uSunDir: [0.25, 0.1, -0.96], uSunCol: [2.9, 1.8, 1.0], uFogDen: 0.0006, uFogCol: [0.55, 0.45, 0.38] }),
    uniforms: {
      uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 2, 2, 2],
      uTracks: [-1000, 1000, 1e4, 1], uBrick: [bx, bz, 0.6, 1],
      uTowerFar: [-60, -1250, 1.5, 0], uCaravan: [roadX(170) + 2, 120, 0, 1], uWindD: 0.5,
    },
    update(t, u) { u.uCaravan.value[2] = (t - P.from) * 1.1; },
    drawText(ctx, t) {
      L.forEach((l, k) => region(ctx, [0, 1 - (k + 1) / 4, 1, 1 - k / 4], 8.5, 2.6, (c, b) =>
        inscribe(c, t, wrap([l], 30), { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: Math.round(b.h * 0.36), leading: 1.15, valign: 'middle', font: 'name' })));
    },
    post: () => grade({ exposure: 1.0, bloom: 0.1 }),
    finish: () => FINISH,
  });
};
