// s06-came-down: the silence, then "And the LORD came down / to see the city / and the tower / the
// children of men had built"
// Evening on the plain, low among the drying bricks, the sky heavy with cloud. Far off the tower stands
// under a vast dark cloud, its terrace fires climbing it. The music stops. A great column of light comes down through the cloud onto
// the tower and the whole sky takes its light, every cloud lit through; it touches the ground, and its light runs out across the plain toward us, slowing as it
// reaches the field of bricks: each line is stamped in a row of bricks there, always there in the dark,
// and is seen only as the light reaches it, the farthest row first.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { plainScene, TOWER_AT } from '/song/lib/x-plain-wet.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { anchorAt, inscribe, region } from '/song/lib/type.js';
export const kind = 'shader';

export default (P) => {
  const A = anchorAt(lyrics, P.from, 'And the LORD came down', 'to see the city', 'and the tower', 'the children of men');
  const L = A.lines;
  // a trodden lane beside the brickfield, running straight toward the tower; each line is pressed
  // large into its dust, the first farthest along it
  const X = 67, ZK = [40, 33, 26, 19], HWID = 5.2, HD = 1.7;
  const T = [TOWER_AT[0], TOWER_AT[2]];
  const dist = (z) => Math.hypot(X - T[0], z - HD - 0.6 - T[1]);
  const TD = 130.6;
  const R = (t) => {
    if (t < TD) return 0;
    const pts = [[TD, 0], [L[0].start, dist(ZK[0])], [L[1].start, dist(ZK[1])], [L[2].start, dist(ZK[2])], [L[3].start, dist(ZK[3])], [L[3].end + 0.6, dist(ZK[3]) + 6], [P.to, dist(ZK[3]) + 400]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ta, ra] = pts[i], [tb, rb] = pts[i + 1];
      if (t <= tb) { const k = (t - ta) / (tb - ta); return ra + (rb - ra) * (i === 0 ? 1 - (1 - k) ** 3 : smooth(k)); }
    }
    return dist(ZK[3]) + 400;
  };
  const decal = new Array(16).fill(0), decalUV = new Array(16).fill(0);
  ZK.forEach((z, k) => { decal.splice(k * 4, 4, X + HWID, z - HD, X - HWID, z + HD); decalUV.splice(k * 4, 4, 0, 1 - (k + 1) / 4, 1, 1 - k / 4); });
  const keys = [
    { t: P.from, pos: [X + 1.0, 4.2, -2], look: [X + 3, 12, 600] },
    { t: 131.6, pos: [X + 0.6, 4.6, 8], look: [X + 4, 26, 600] },
  ];
  // low, so the tower and its column of light stand above the words being revealed
  L.forEach((l, k) => keys.push({ t: l.start + 0.3, pos: [X + 0.4 - 0.2 * k, 4.0, ZK[k] - [7.5, 6.5, 6.5, 8.0][k]], look: [X, 0, ZK[k] + 3.6] }));
  keys.push({ t: P.to, pos: [X - 0.5, 5.5, ZK[3] - 7], look: [X + 2, 25, 600] });
  const cam = track(keys, { handheld: { amount: 0.6, seed: 66 }, fov: 60 });
  return plainScene(P, {
    name: 's06-came-down', cam,
    textSize: [4096, Math.round(4096 * (2 * HD) / (2 * HWID)) * 4],
    sky: () => ({ ...skyMix('dusk', 'twilight', 0.7), uSunDir: [-0.5, -0.04, 0.86], uCloud: 0.7, uMoon: 0.0, uMoonDir: [0, -1, 0], uStars: 0.0, uAmb: [0.02, 0.019, 0.026], uFogDen: 0.0011, uFogCol: [0.06, 0.05, 0.06] }),
    uniforms: {
      uDecal: decal, uDecalUV: decalUV, uDecalKind: [2, 2, 2, 2],
      uTower: [T[0], T[1], 1, 1.0], uStorm: 0.0, uWind: 0.15, uBricks: 1,
      uKiln: new Array(12).fill(0),
      uLight: [T[0], T[1], 85, 0], uReeds: 1, uGlory: 0, uPool: [T[0], T[1], 0, 1],
    },
    update(t, u) {
      // the column comes down out of the cloud over three seconds before it touches the ground
      const down = smooth(clamp01((t - (TD - 3.2)) / 3.2));
      u.uLight.value[3] = 3.2 * smooth(clamp01((t - (TD - 3.4)) / 1.0));
      // as it touches the ground the whole sky takes its light, every cloud lit through
      u.uGlory.value = smooth(clamp01((t - (TD - 0.4)) / 2.5));
      u.uColBottom.value = 420 * (1 - down);
      const r = R(t);
      u.uPool.value[2] = r;
      u.uPool.value[3] = r < dist(ZK[0]) - 300 ? 120 : 1.5;
    },
    drawText(ctx, t) {
      // each line is pressed into the dust as it is sung, where the light has just reached
      L.forEach((l, k) => region(ctx, [0, 1 - (k + 1) / 4, 1, 1 - k / 4], 2 * HWID, 2 * HD, (c, b) =>
        inscribe(c, t, [{ words: l.words }], { x: 50, y: 0, w: b.w - 100, h: b.h }, { size: Math.round(b.h * 0.72), valign: 'middle', font: 'name' })));
    },
    post: () => grade({ exposure: 1.25, bloom: 0.2 }),
    finish: () => FINISH,
  });
};
