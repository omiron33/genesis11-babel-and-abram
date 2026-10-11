// Print a scene's camera at times: node --import ./tools/dev-register.mjs tools/cam.mjs <scene> t1,t2,...
import fs from 'node:fs';
const [scene, ts] = process.argv.slice(2);
const film = JSON.parse(fs.readFileSync(new URL('../film.json', import.meta.url)));
const s = film.scenes.find((x) => x.scene === scene);
const m = await import(`/song/scenes/${scene}.js`);
const sc = await m.default({ id: s.id, from: s.from, to: s.to });
for (const t of (ts ?? `${s.from + 0.01},${(s.from + s.to) / 2},${s.to - 0.01}`).split(',').map(Number)) {
  const c = sc.camera(t);
  console.log(t.toFixed(2), 'pos', c.pos.map((v) => v.toFixed(2)).join(' '), 'target', c.target.map((v) => v.toFixed(2)).join(' '), 'fov', (c.fov ?? 40).toFixed(1));
}
