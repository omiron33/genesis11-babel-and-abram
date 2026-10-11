// s13-ur-lamps: "Haran had a son and his name was Lot / Haran died in Ur while his father was alive /
// Abram took Sarai, Nahor took Milcah / But Sarai was barren / She had no child"
// Back on the river, now at Ur, at night before the journey. Clay lamps float on little reed rafts by
// the bank, tied to one another by cords like a family tree: Terah's lamp, cords to his sons' lamps
// (Abram, Nahor, Haran), and Haran's tied to a small lamp, Lot. On "Haran died" Haran's flame goes out
// and his cord slackens, Lot's lamp still tied on. Sarai's raft comes to Abram's and Milcah's to
// Nahor's, each pair tied. Abram's and Sarai's rafts drift on together toward the bank, where the mud
// is dry and cracked and nothing floats. Each line is cut into the bank face above.
import lyrics from '/timing.js';
import { track } from '/song/lib/cam.js';
import { riverScene, bankX } from '/song/lib/x-river.js';
import { skyMix, grade, FINISH, smooth, clamp01 } from '/song/lib/look.js';
import { inscribe, anchorAt } from '/song/lib/type.js';
export const kind = 'shader';

const lerp = (a, b, k) => a + (b - a) * k;
export default (P) => {
  const A = anchorAt(lyrics, P.from, 'Haran had a son', 'Haran died', 'Abram took Sarai', 'But Sarai', 'She had no child');
  const L = A.lines;
  const span = [[6.5, 14], [6, 14.5], [21, 28.5], [34.5, 40], [34.8, 39.6]];
  const row = [0, 1, 0, 0, 1];
  const DRY = [32, 46];
  const at = (dx, z) => [bankX(z) + dx, z];
  // lamp k: [x, z, flame, size] at time t
  const lamps = (t) => {
    const dead = smooth(clamp01((t - (L[1].start + 0.25)) / 0.6));
    const sJoin = smooth(clamp01((t - (L[2].start + 0.3)) / 1.4)), mJoin = smooth(clamp01((t - (L[2].words[3].start)) / 1.4));
    const drift = smooth(clamp01((t - (L[2].end - 0.2)) / (P.to - L[2].end + 0.2)));
    const sway = (k) => [0.12 * Math.sin(t * 0.5 + k * 2.1), 0.15 * Math.sin(t * 0.37 + k * 1.3)];
    const T = at(3.4, 10), H = at(4.6, 7.2), Lot = at(5.4, 5.6);
    // Abram's and Nahor's rafts drift upstream to where their brides wait, then Abram's goes on to the dry bank
    const up = smooth(clamp01((t - (L[1].end - 0.6)) / 1.8));
    const N = [lerp(at(3.9, 13.2)[0], at(3.6, 24.5)[0], up), lerp(13.2, 24.5, up)];
    const A0 = [lerp(at(2.4, 12.8)[0], at(2.2, 23.0)[0], up), lerp(12.8, 23.0, up)], A1 = at(3.4, 35.5);
    const Ap = [lerp(A0[0], A1[0], drift), lerp(A0[1], A1[1], drift)];
    const S0 = at(6.6, 21.5), Sp = [lerp(lerp(S0[0], A0[0] + 0.45, sJoin), A1[0] + 0.45, drift), lerp(lerp(S0[1], A0[1] + 0.35, sJoin), A1[1] + 0.35, drift)];
    const M0 = at(6.8, 26.5), Mp = [lerp(M0[0], N[0] + 0.5, mJoin), lerp(M0[1], N[1] + 0.3, mJoin)];
    const list = [[...T, 1, 2.6], [...Ap, 1, 2.2], [...N, 1, 2.2], [...H, 1 - dead, 2.2], [...Lot, 1, 1.5], [...Sp, 1, 2.1], [...Mp, 1, 2.1]];
    return list.map((l, k) => { const s = sway(k); return [l[0] + s[0], l[1] + s[1], l[2], l[3]]; });
  };
  const cords = (t) => {
    const dead = smooth(clamp01((t - (L[1].start + 0.25)) / 1.2));
    const sJoin = clamp01((t - (L[2].start + 1.6)) / 0.2), mJoin = clamp01((t - (L[2].words[3].start + 1.6)) / 0.2);
    return [[0, 1, 1], [0, 2, 1], [0, 3, 1 + 0.9 * dead], [3, 4, 1], [1, 5, sJoin], [2, 6, mJoin]];
  };
  // the camera frames each line on the bank face as it is sung, the lamps on the water in front of it
  const zc = (k) => (span[k][0] + span[k][1]) / 2;
  const keys = [{ t: P.from, pos: [bankX(zc(0) - 6) + 7.5, 1.5, zc(0) - 7.5], look: [bankX(zc(0)) + 1, 0.7, zc(0)] }];
  L.forEach((l, k) => {
    // for the marriages, stand back so the pairs of rafts on the water and the line on the bank share the frame
    const z = zc(k), y = row[k] ? 0.75 : 1.2, back = 0;
    keys.push({ t: l.start + 0.1, pos: [bankX(z - 5) + 6.8 + back, 1.45 + back * 0.3, z - 5.6 - back], look: [bankX(z), y, z] });
    keys.push({ t: l.end + 0.35, pos: [bankX(z - 4.6) + 6.4 + back, 1.45 + back * 0.3, z - 5.0 - back], look: [bankX(z), y, z] });
  });
  keys.push({ t: P.to, pos: [bankX(zc(4) - 3) + 5.5, 1.6, zc(4) - 4.4], look: [bankX(zc(4) + 2) + 2, 0.2, zc(4) + 2] });
  const cam = track(keys, { handheld: { amount: 0.7, seed: 131 }, fov: 48 });
  const Z0 = 0, Z1 = 48, W = 8192, H = 512, FACE = 1.4;
  const lampU = (t) => { const a = new Array(48).fill(0); lamps(t).forEach((l, k) => a.splice(k * 4, 4, ...l)); return a; };
  const cordU = (t) => { const a = new Array(48).fill(0); cords(t).forEach((c, k) => a.splice(k * 4, 4, c[0], c[1], c[2], 0)); return a; };
  return riverScene(P, {
    name: 's13-ur-lamps', cam,
    textSize: [W, H],
    sky: (t) => ({ ...skyMix('twilight', 'night', smooth(clamp01((t - P.from) / 1.2)) * 0.85 + 0.1), uMoon: 0.0, uFogDen: 0.002, uFogCol: [0.02, 0.022, 0.03] }),
    uniforms: { uCamps: new Array(24).fill(0), uThreadZ: [0, 0], uTextZ: [Z0, Z1], uDryZ: DRY, uLamps: lampU(P.from), uCords: cordU(P.from), uWind: 0.12 },
    update(t, u) {
      const l = lampU(t), c = cordU(t);
      for (let i = 0; i < 48; i++) { u.uLamps.value[i] = l[i]; u.uCords.value[i] = c[i]; }
    },
    drawText(ctx, t) {
      const ppm = W / (Z1 - Z0), sx = ppm / (H / FACE);
      L.forEach((l, k) => {
        const [za, zb] = span[k];
        const x0 = (Z1 - zb) * ppm, x1 = (Z1 - za) * ppm;
        ctx.save(); ctx.translate(x0, 0); ctx.scale(sx, 1);
        inscribe(ctx, t, [{ words: l.words }], { x: 10, y: row[k] ? H * 0.52 : H * 0.06, w: (x1 - x0) / sx - 20, h: H * 0.42 }, { size: Math.round(H * 0.33), valign: 'middle', font: 'name' });
        ctx.restore();
      });
    },
    post: () => grade({ exposure: 1.25, bloom: 0.14 }),
    finish: () => FINISH,
  });
};
