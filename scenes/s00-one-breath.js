// s00-one-breath: the title, then "Once the whole earth / had one word / one mouth / one breath".
// Grey dawn on the wet silt beside the river, everything still. In the first second one breath of
// wind runs across the water and the reeds in a single front, every reed bending together, and the
// camera, already gliding low over the silt, follows it. The title presses into the wet silt, then
// the four phrases one after another, each impression holding a skin of water that catches the sky.
// After "one breath" the wind runs on ahead across the plain toward a faint terraced shape on the
// horizon, and the camera rises after it.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { plainScene } from '/song/lib/x-plain-wet.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt, region, title } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Once the whole earth', 'had one word', 'one mouth', 'one breath');
  const L = A.lines;
  const X = -9.5;
  const camZ = (t) => -31 + t * 1.0;
  // where each phrase is pressed: about five metres ahead of where the camera is when it is sung
  const zOf = (t) => camZ(t) + 5.6;
  const T = { z0: -26.4, z1: -24.6, x0: X + 3.2, x1: X - 3.2 };            // the title
  const rows = L.map((l, k) => ({ z0: zOf(l.start) - 0.7, z1: zOf(l.start) + 0.7, x0: X + 2.6, x1: X - 2.6 }));
  // canvas: the title in the top fifth, each phrase a strip below it
  const N = 5, uvOf = (k) => [0, 1 - (k + 1) / N, 1, 1 - k / N];
  const decal = new Array(16).fill(0), decalUV = new Array(16).fill(0);
  const put = (k, r, uv) => { decal.splice(k * 4, 4, r.x0, r.z0, r.x1, r.z1); decalUV.splice(k * 4, 4, ...uv); };
  // four decals: the title, then rows 0-2 share three slots and row 3 reuses the title's slot once the title is behind
  put(0, T, uvOf(0)); put(1, rows[0], uvOf(1)); put(2, rows[1], uvOf(2)); put(3, rows[2], uvOf(3));
  // a low glide over the silt, looking down at the words about five metres ahead; after "one breath"
  // it rises and looks up the plain after the wind
  const at = (t, y, ahead, dx = 0) => ({ t, pos: [X + dx, y, camZ(t)], look: [X + dx * 0.5, 0.35, camZ(t) + ahead] });
  const keys = [{ t: 0, pos: [X + 0.3, 2.2, camZ(0)], look: [X + 3, 2.5, camZ(0) + 120] }, at(4.2, 2.4, 6.4, 0.1), at(10, 2.45, 6.0, -0.1), at(L[3].start + 0.9, 2.5, 6.2, -0.2)];
  keys.push({ t: 20.5, pos: [X - 0.5, 4.0, camZ(20.5) + 1.5], look: [X + 2, 1.5, camZ(20.5) + 60] });
  keys.push({ t: P.to, pos: [X - 1.0, 7.5, camZ(P.to) + 6], look: [X + 12, 25, camZ(P.to) + 600] });
  const cam = track(keys, { handheld: { amount: 0.35, seed: 11 }, fov: 50 });
  return plainScene(P, {
    name: 's00-one-breath', cam,
    textSize: [2048, 2400],
    sky: (t) => ({ ...skyMix('predawn', 'sunrise', 0.45 + 0.4 * smooth(t / 28)), uSunDir: [0.62, 0.02 + 0.035 * t / 28, 0.78], uFogDen: 0.0016 }),
    uniforms: { uDecal: [...decal], uDecalUV: decalUV, uDecalKind: [1, 1, 1, 1], uTower: [70, 1350, 1, 0], uBricks: 0, uWind: 1.0, uFogDen: 0.0016 },
    update(t, u) {
      // the breath: a front just behind the camera at the start, keeping a little ahead of it, then
      // running on fast across the plain after "one breath"
      const after = Math.max(0, t - (L[3].start + 0.4));
      u.uFront.value = camZ(t) + 2.0 + 0.35 * t + 7.0 * after * after * 0.35;
      // once the title is far behind, its slot carries the fourth phrase
      const r = t > L[3].start - 2.5 ? rows[3] : T;
      u.uDecal.value[0] = r.x0; u.uDecal.value[1] = r.z0; u.uDecal.value[2] = r.x1; u.uDecal.value[3] = r.z1;
    },
    drawText(ctx, t) {
      region(ctx, uvOf(0), T.x1 - T.x0, T.z1 - T.z0, (c, b) => {
        if (t < L[3].start - 2.5) {
          title(c, t, 'BABEL AND ABRAM', b.w / 2, b.h * 0.55, { t0: 0.5, dur: 1.4, size: 190, tracking: 0.1 });
          title(c, t, 'GENESIS 11', b.w / 2, b.h * 0.92, { t0: 1.6, dur: 1.2, size: 110, tracking: 0.3 });
        } else inscribe(c, t, [{ words: L[3].words }], { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: 330, valign: 'middle' });
      });
      L.slice(0, 3).forEach((l, k) => region(ctx, uvOf(k + 1), 5.2, 1.4, (c, b) => inscribe(c, t, [{ words: l.words }], { x: 40, y: 0, w: b.w - 80, h: b.h }, { size: 330, valign: 'middle' })));
    },
    post: () => grade({ exposure: 1.05, bloom: 0.12 }),
    finish: () => FINISH,
  });
};
