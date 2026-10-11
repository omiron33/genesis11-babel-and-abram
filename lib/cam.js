// A camera moved through keyframes in time, for shots that must linger at one place and travel on
// to the next (read a stone, then walk on). Each coordinate of the position, the look point and the
// lens is a monotone cubic through its keys (C1, no overshoot), so the path curves through the keys
// and the speed changes smoothly; the first and last keys carry the speed of their neighbours, so a
// shot enters and leaves moving. The kit's hand-held drift is layered on top.
import { handheld as hand } from '/kit/motion.js';

function pchip(ts, ys, m0, m1) {
  const n = ts.length, h = [], d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = ts[i + 1] - ts[i]; d[i] = (ys[i + 1] - ys[i]) / h[i]; }
  if (n === 2) { m[0] = m[1] = d[0]; }
  else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
    }
    m[0] = d[0]; m[n - 1] = d[n - 2];
  }
  if (m0 !== undefined) m[0] = m0;
  if (m1 !== undefined) m[n - 1] = m1;
  return (t) => {
    if (t <= ts[0]) return ys[0] + m[0] * (t - ts[0]);
    if (t >= ts[n - 1]) return ys[n - 1] + m[n - 1] * (t - ts[n - 1]);
    let i = 0; while (t > ts[i + 1]) i++;
    const s = (t - ts[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}
const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]), mul = (a, s) => a.map((v) => v * s);
const nrm = (a) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// keys: [{ t, pos: [x,y,z], look: [x,y,z], fov?, focus?, aperture?, roll? }]
// o: { handheld: amount or handheld() options (default 0.6), fov, focus, aperture } defaults
export function track(keys, o = {}) {
  const ts = keys.map((k) => k.t);
  // the shot enters and leaves moving: the end velocities point along the first and last
  // segments at no less than endSpeed (default a third of the shot's average speed)
  const n = keys.length;
  let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(...sub(keys[i].pos, keys[i - 1].pos));
  const avg = len / Math.max(1e-6, ts[n - 1] - ts[0]);
  const vmin = o.endSpeed ?? avg * 0.9;
  const endVel = (a, b, dt) => { const d = sub(b, a); const l = Math.hypot(...d) || 1e-6; const v = Math.max(l / dt, vmin); return d.map((x) => (x / l) * v); };
  const v0 = endVel(keys[0].pos, keys[1].pos, ts[1] - ts[0]), v1 = endVel(keys[n - 2].pos, keys[n - 1].pos, ts[n - 1] - ts[n - 2]);
  const P = [0, 1, 2].map((j) => pchip(ts, keys.map((k) => k.pos[j]), v0[j], v1[j]));
  const L = [0, 1, 2].map((j) => pchip(ts, keys.map((k) => k.look[j])));
  const sc = (name, def) => (keys.every((k) => k[name] === undefined) ? () => def : pchip(ts, keys.map((k) => k[name] ?? def)));
  const fov = sc('fov', o.fov ?? 40), focus = sc('focus', o.focus ?? 0), aperture = sc('aperture', o.aperture ?? 0), roll = sc('roll', 0);
  const hh = typeof o.handheld === 'object' ? o.handheld : { amount: o.handheld ?? 0.6 };
  const autoFocus = keys.every((k) => k.focus === undefined) && o.focus === undefined;
  const cam = (t) => {
    let pos = P.map((f) => f(t)), target = L.map((f) => f(t));
    let r = roll(t);
    const dist = Math.hypot(...sub(target, pos));
    if (hh.amount > 0) {
      const h = hand(t, hh);
      const ww = nrm(sub(target, pos)), uu = nrm(cross(ww, [0, 1, 0])), vv = cross(uu, ww);
      pos = add(pos, add(mul(uu, h.pos[0]), add(mul(vv, h.pos[1]), mul(ww, h.pos[2]))));
      target = add(target, add(mul(uu, h.yaw * dist), mul(vv, h.pitch * dist)));
      r += h.roll;
    }
    return { pos, target, fov: fov(t), roll: r, focus: autoFocus ? dist : focus(t), aperture: aperture(t) };
  };
  cam.speed = (t) => { const e = 1 / 240; const a = P.map((f) => f(t - e)), b = P.map((f) => f(t + e)); return Math.hypot(...sub(b, a)) / (2 * e); };
  return cam;
}
