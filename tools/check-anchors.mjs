import fs from 'node:fs';
const film = JSON.parse(fs.readFileSync('film.json'));
const L = JSON.parse(fs.readFileSync('data/lyrics.json'));
for (const s of film.scenes) {
  const src = fs.readFileSync(`scenes/${s.scene}.js`, 'utf8');
  const m = src.match(/anchorAt\(lyrics, P\.from[^,]*, ([^)]*)\)/);
  if (!m) continue;
  const { anchorAt } = await import('/song/lib/type.js');
  const prefixes = eval('[' + m[1] + ']');
  const A = anchorAt(L, s.from, ...prefixes);
  const starts = A.lines.map((l) => l.start);
  const dup = new Set(starts).size !== starts.length;
  const inside = starts.every((t) => t >= s.from - 0.1 && t < s.to);
  console.log(s.scene, dup ? 'DUP' : 'ok', inside ? 'inside' : 'OUTSIDE', starts.map((t) => t.toFixed(1)).join(' '));
}
