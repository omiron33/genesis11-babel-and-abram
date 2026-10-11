// Node loader for checking scene cameras outside the browser: maps the page's absolute paths
// (/song/, /kit/, /timing.js) onto the song folder and the engine's web folder.
//   node --import ./tools/dev-register.mjs tools/cam.mjs s01-adam 30
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const SONG = path.resolve(new URL('..', import.meta.url).pathname);
const WEB = process.env.ARK_WEB ?? path.resolve(SONG, '../ark-video-studio-farm2/photoreal/web');
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('/song/')) return next(pathToFileURL(path.join(SONG, spec.slice(6))).href, ctx);
  if (spec.startsWith('/kit/')) return next(pathToFileURL(path.join(WEB, spec.slice(1))).href, ctx);
  if (spec === '/timing.js') return next(pathToFileURL(path.join(SONG, 'tools/timing-node.mjs')).href, ctx);
  return next(spec, ctx);
}
