// The film's shared look: times of day for the sky and its light, the grade, and small helpers.
// The arc of the light follows the generations: a warm dusk for Adam, night falling through the
// middle generations, deep moonlit night for the count of days and the doorway, a cold blue dawn on
// Enoch's ridge, a stormy dusk over Lamech's field, and the sunrise for Noe.
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const mix = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * k) : a + (b - a) * k);

export const SKIES = {
  dusk: {
    uSunDir: norm([0.8, 0.17, 0.6]), uSunCol: [3.0, 1.55, 0.7], uSkyTop: [0.09, 0.13, 0.30], uSkyHor: [0.85, 0.48, 0.28],
    uMoonDir: norm([0.6, 0.35, 0.7]), uStars: 0.0, uCloud: 0.6, uCloudSpeed: 0.035, uMoon: 0.0,
    uFogCol: [0.24, 0.17, 0.15], uFogDen: 0.0028, uAmb: [0.09, 0.09, 0.13], uExposureSky: 1.0,
  },
  twilight: {
    uSunDir: norm([0.7, 0.04, 0.7]), uSunCol: [1.3, 0.62, 0.36], uSkyTop: [0.02, 0.035, 0.1], uSkyHor: [0.34, 0.2, 0.2],
    uMoonDir: norm([-0.5, 0.3, 0.8]), uStars: 0.55, uCloud: 0.45, uCloudSpeed: 0.03, uMoon: 0.0,
    uFogCol: [0.09, 0.08, 0.11], uFogDen: 0.0035, uAmb: [0.06, 0.065, 0.1], uExposureSky: 1.0,
  },
  night: {
    uSunDir: norm([0.45, 0.42, 0.78]), uSunCol: [0.3, 0.37, 0.58], uSkyTop: [0.004, 0.007, 0.02], uSkyHor: [0.03, 0.04, 0.07],
    uMoonDir: norm([0.45, 0.42, 0.78]), uStars: 1.0, uCloud: 0.25, uCloudSpeed: 0.02, uMoon: 1.0,
    uFogCol: [0.03, 0.035, 0.055], uFogDen: 0.003, uAmb: [0.03, 0.036, 0.062], uExposureSky: 1.0,
  },
  predawn: {
    uSunDir: norm([0.2, -0.05, 1.0]), uSunCol: [0.5, 0.45, 0.6], uSkyTop: [0.02, 0.035, 0.08], uSkyHor: [0.2, 0.2, 0.28],
    uMoonDir: norm([-0.5, 0.25, 0.6]), uStars: 0.3, uCloud: 0.5, uCloudSpeed: 0.025, uMoon: 0.3,
    uFogCol: [0.1, 0.11, 0.15], uFogDen: 0.006, uAmb: [0.05, 0.06, 0.09], uExposureSky: 1.0,
  },
  sunrise: {
    uSunDir: norm([0.15, 0.07, 1.0]), uSunCol: [3.0, 1.7, 0.85], uSkyTop: [0.08, 0.14, 0.3], uSkyHor: [0.75, 0.48, 0.32],
    uMoonDir: norm([-0.5, 0.25, 0.6]), uStars: 0.0, uCloud: 0.45, uCloudSpeed: 0.03, uMoon: 0.0,
    uFogCol: [0.42, 0.33, 0.28], uFogDen: 0.004, uAmb: [0.12, 0.12, 0.15], uExposureSky: 1.0,
  },
};
// a sky between two named skies (k 0..1)
export function skyMix(a, b, k) {
  const A = SKIES[a], B = SKIES[b], o = {};
  for (const key of Object.keys(A)) o[key] = key.endsWith('Dir') ? norm(mix(A[key], B[key], k)) : mix(A[key], B[key], k);
  return o;
}
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// the grade shared by every shot; per-shot exposure and a little lift
export function grade(o = {}) {
  return { exposure: 1.0, bloom: 0.1, threshold: 0.9, knee: 0.6, grain: 0.022, vignette: 0.5, ca: 0.2, contrast: 1.04, saturation: 0.95, lift: [0.004, 0.005, 0.009], gain: [1, 0.99, 0.97], ...o };
}
export const FINISH = { flare: { amount: 0.035, threshold: 1.2, tint: [1.0, 0.72, 0.45], length: 0.22 }, grade: { shadows: [0.0, 0.01, 0.035], highlights: [1.0, 0.94, 0.84], amount: 0.45 } };
