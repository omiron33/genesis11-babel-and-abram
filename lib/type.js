// Typography for words cut into the world. Words are drawn into the scene's text canvas, which the
// world's shader reads as an inscription (cut into stone, clay, wood or earth and filled with light).
// A word does not exist until it is sung: it is cut and fills with a bright light on its measured
// onset, then cools to a steady warm glow that stays for the rest of the shot.
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// how alive a word is at time t: 0 before it is sung, a flash on the onset, then a steady glow
export function ignite(w, t, { lead = 0.04, rise = 0.16, cool = 0.9 } = {}) {
  const k = (t - (w.start - lead)) / rise;
  if (k <= 0) return { a: 0, heat: 0 };
  const a = clamp01(k);
  const after = Math.max(0, t - w.start);
  const heat = a * (0.62 + 0.38 * Math.exp(-after / cool));
  return { a: a * a * (3 - 2 * a), heat };
}

// colour of a word's light from its heat: white-gold when fresh, warm amber as it settles
export function heatColor(heat, tint = [255, 196, 120]) {
  const hot = [255, 240, 214];
  const k = clamp01((heat - 0.62) / 0.38);
  const c = tint.map((v, i) => Math.round(v + (hot[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export const FONTS = {
  name: (px) => `600 ${px}px "EB Garamond"`,
  line: (px) => `500 ${px}px "EB Garamond"`,
  italic: (px) => `italic 500 ${px}px "EB Garamond"`,
  caps: (px) => `700 ${px}px "EB Garamond"`,
};

// Lay out lines of words in a box of the canvas and draw each as it is sung.
//   lines: [{ words: [{ w, start, end }] }]  (from anchor() in /timing.js)
//   box: { x, y, w, h } in canvas pixels; align: 'center' | 'left'
//   size: font size in px (shrunk to fit the box width); leading: line spacing in sizes
//   font: FONTS key; caps: draw in capitals; tracking: letter spacing in ems (caps titles)
export function inscribe(ctx, t, lines, box, o = {}) {
  const { align = 'center', leading = 1.22, font = 'line', caps = false, tint, tracking = 0, minAlpha = 0, lead, valign = 'top', fade } = o;
  let size = o.size ?? 120;
  const text = (w) => (caps ? w.toUpperCase() : w);
  const f = FONTS[font];
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`;
  ctx.font = f(size);
  // fit the widest line to the box
  const widthOf = (l) => l.words.reduce((s, w, i) => s + ctx.measureText(text(w.w) + (i < l.words.length - 1 ? ' ' : '')).width, 0);
  const widest = Math.max(...lines.map(widthOf));
  if (widest > box.w) { size = Math.floor(size * box.w / widest); ctx.font = f(size); if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`; }
  const total = size * leading * (lines.length - 1) + size;
  let y = box.y + (valign === 'middle' ? (box.h - total) / 2 : 0) + size * 0.8;
  for (const l of lines) {
    const lw = widthOf(l);
    let x = align === 'center' ? box.x + (box.w - lw) / 2 : box.x;
    for (let i = 0; i < l.words.length; i++) {
      const w = l.words[i];
      const s = text(w.w) + (i < l.words.length - 1 ? ' ' : '');
      const g = ignite(w, t, lead !== undefined ? { lead } : {});
      const a = Math.max(minAlpha, g.a) * (fade ? fade(l, t) : 1);
      if (a > 0.001) {
        ctx.globalAlpha = a;
        ctx.fillStyle = heatColor(g.heat, tint);
        ctx.fillText(text(w.w), x, y);
      }
      x += ctx.measureText(s).width;
    }
    y += size * leading;
  }
  ctx.restore();
  return size;
}

// A title that is not sung (the chapter title before the vocals): it burns in over [t0, t0 + dur].
export function title(ctx, t, str, x, y, { t0, dur = 1.2, size = 200, font = 'caps', tracking = 0.12, tint, align = 'center' } = {}) {
  const k = clamp01((t - t0) / dur);
  if (k <= 0) return;
  ctx.save();
  ctx.font = FONTS[font](size);
  if (tracking) ctx.letterSpacing = `${(tracking * size).toFixed(1)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = k * k * (3 - 2 * k);
  ctx.fillStyle = heatColor(0.62 + 0.38 * Math.exp(-Math.max(0, t - t0 - dur) / 1.2) * k, tint);
  ctx.fillText(str, x, y);
  ctx.restore();
}

// Words of a line as { words } for inscribe, from a measured line (anchor() result line)
export const asLines = (...ls) => ls.map((l) => ({ words: l.words }));

// Break measured lines into rows of at most maxChars characters (words keep their timing).
export function wrap(lines, maxChars = 26) {
  const out = [];
  for (const l of lines) {
    let row = [], n = 0;
    for (const w of l.words) {
      if (row.length && n + w.w.length + 1 > maxChars) { out.push({ words: row }); row = []; n = 0; }
      row.push(w); n += w.w.length + 1;
    }
    if (row.length) out.push({ words: row });
  }
  return out;
}
// the first word in these lines whose text matches (for a name heading that ignites when sung)
export function wordOf(lines, re) {
  for (const l of lines) for (const w of l.words) if (re.test(w.w)) return w;
  return null;
}

// Words set along a circle in the canvas (centre cx, cy, radius R in px), centred on angle a0
// (radians, 0 = up, clockwise), letters upright to the outside, each lit as it is sung.
export function arcText(ctx, t, words, cx, cy, R, a0, { size = 120, font = 'line', tint, caps = false } = {}) {
  ctx.save();
  ctx.font = FONTS[font](size);
  ctx.textBaseline = 'alphabetic';
  const txt = (w) => (caps ? w.toUpperCase() : w);
  const glyphs = [];
  words.forEach((w, i) => { for (const ch of txt(w.w)) glyphs.push({ ch, w }); if (i < words.length - 1) glyphs.push({ ch: ' ', w }); });
  const widths = glyphs.map((g) => ctx.measureText(g.ch).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = a0 - total / R / 2;
  glyphs.forEach((g, i) => {
    const am = a + widths[i] / R / 2;
    const s = ignite(g.w, t);
    if (s.a > 0.001 && g.ch !== ' ') {
      ctx.save();
      ctx.translate(cx + R * Math.sin(am), cy - R * Math.cos(am));
      ctx.rotate(am);
      ctx.globalAlpha = s.a; ctx.fillStyle = heatColor(s.heat, tint);
      ctx.fillText(g.ch, -widths[i] / 2, 0);
      ctx.restore();
    }
    a += widths[i] / R;
  });
  ctx.restore();
}

// Like anchor() from /timing.js, but searching from song time t0 (a chorus that repeats).
export function anchorAt(lyrics, t0, ...prefixes) {
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z' ]/g, '').trim();
  let prev = -1;
  const lines = prefixes.map((p) => {
    const l = lyrics.lines.find((l) => (prev < 0 ? l.start >= t0 - 0.5 : l.start > prev) && norm(l.text).startsWith(norm(p)));
    if (!l) throw Error('no line: ' + p + ' after ' + prev);
    prev = l.start;
    const words = lyrics.words.filter((w) => w.start >= l.start - 0.05 && w.end <= l.end + 0.05);
    return { ...l, words };
  });
  return { lines };
}

// Draw into a region of the text canvas that a world rect of wM x hM metres reads (u0, v0, u1, v1 in
// texture coordinates, v up from the canvas's bottom edge), so draw(ctx, box) gets an undistorted
// box: 1 unit = 1 px at the region's horizontal resolution, box.w x box.h in proportion to metres.
export function region(ctx, uv, wM, hM, draw) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const x0 = uv[0] * W, x1 = uv[2] * W, yTop = (1 - uv[3]) * H, yBot = (1 - uv[1]) * H;
  const bw = x1 - x0, bh = bw * Math.abs(hM / wM);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, yTop, bw, yBot - yTop); ctx.clip();
  ctx.translate(x0, yTop);
  ctx.scale(1, (yBot - yTop) / bh);
  draw(ctx, { x: 0, y: 0, w: bw, h: bh });
  ctx.restore();
}

// Words that break apart after they have been read (the confusion of tongues). The line is drawn
// whole, each word lit at its onset; from t0 over dur it breaks in one of four ways:
//   'wedge'   each letter collapses into a cluster of wedge marks, like cuneiform
//   'swap'    the letters of each word change places
//   'split'   each word cracks in two and the halves slide apart and drop
//   'crumble' the letters fall and break into grains
// Every motion is a pure function of t and the letter's index.
const h1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function wedge(ctx, x, y, s, a, seed) {
  // a cluster of two to four wedges (a triangle head with a tail), as a stylus leaves in clay
  const n = 2 + Math.floor(h1(seed) * 3);
  for (let i = 0; i < n; i++) {
    const ang = (h1(seed + i * 3.1) < 0.5 ? 0 : Math.PI / 2) + (h1(seed + i * 7.7) - 0.5) * 0.5;
    const ox = (h1(seed + i * 1.3) - 0.5) * s * 0.7, oy = (h1(seed + i * 2.9) - 0.5) * s * 0.7;
    ctx.save(); ctx.translate(x + ox, y + oy); ctx.rotate(ang); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.16); ctx.lineTo(s * 0.02, 0); ctx.lineTo(-s * 0.22, s * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillRect(-s * 0.05, -s * 0.03, s * 0.4, s * 0.06);
    ctx.restore();
  }
}
export function breakText(ctx, t, words, box, { size = 120, font = 'name', tint, t0 = 1e9, dur = 0.9, mode = 'wedge', seed = 0 } = {}) {
  ctx.save();
  ctx.font = FONTS[font](size);
  ctx.textBaseline = 'middle';
  const sp = ctx.measureText(' ').width;
  const ws = words.map((w) => ({ w, width: ctx.measureText(w.w).width }));
  const total = ws.reduce((s, x) => s + x.width, 0) + sp * (ws.length - 1);
  let fit = 1;
  if (total > box.w) { fit = box.w / total; size = Math.floor(size * fit); ctx.font = FONTS[font](size); ws.forEach((x) => { x.width = ctx.measureText(x.w.w).width; }); }
  const sp2 = ctx.measureText(' ').width;
  let x = box.x + (box.w - (ws.reduce((s, q) => s + q.width, 0) + sp2 * (ws.length - 1))) / 2;
  const y = box.y + box.h / 2;
  const k = clamp01((t - t0) / dur), ease = k * k * (3 - 2 * k);
  // once broken, the remains fade into the wall
  const after = Math.max(0, t - t0 - dur), remain = Math.exp(-after / 0.7);
  ws.forEach((q, wi) => {
    const g = ignite(q.w, t);
    if (g.a > 0.001) {
      ctx.fillStyle = heatColor(g.heat, tint);
      const letters = [...q.w.w];
      let lx = x;
      const pos = letters.map((ch) => { const cw = ctx.measureText(ch).width; const p = lx; lx += cw; return { ch, x: p, cw }; });
      pos.forEach((p, li) => {
        const id = seed * 101 + wi * 17 + li;
        let px = p.x, py = y, a = g.a, rot = 0, show = true;
        if (k > 0) {
          if (mode === 'swap') { const j = Math.floor(h1(id) * pos.length); px = p.x + (pos[j].x - p.x) * ease; py = y + Math.sin(ease * Math.PI) * size * 0.35 * (h1(id + 2) - 0.5) * 2; }
          else if (mode === 'split') { const side = li < pos.length / 2 ? -1 : 1; px = p.x + side * ease * size * 0.5; py = y + ease * ease * size * 0.6; rot = side * ease * 0.25; }
          else if (mode === 'crumble') { const d = clamp01((k - h1(id) * 0.4) / 0.6); py = y + d * d * size * 1.2; a *= 1 - d; if (d > 0.2) { ctx.globalAlpha = a; for (let m = 0; m < 4; m++) ctx.fillRect(px + h1(id + m) * p.cw, py + h1(id + m + 9) * size * 0.4 - size * 0.2, size * 0.05, size * 0.05); show = d < 0.5; } }
          else if (mode === 'scatter') { const ang = (h1(id) - 0.5) * 1.2; px = p.x + ease * size * (3 + 6 * h1(id + 1)) * Math.cos(ang); py = y + ease * size * 2.5 * Math.sin(ang) - ease * size * 0.5; a *= 1 - ease * 0.85; rot = ease * (h1(id + 3) - 0.5) * 3; }
          else { const d = clamp01((k - h1(id) * 0.5) / 0.5); if (d > 0) { a *= 1 - d; wedge(ctx, p.x + p.cw / 2, y, size * 0.9, g.a * d * remain, id); } }
        }
        a *= remain;
        if (show && a > 0.001) {
          ctx.save(); ctx.globalAlpha = a; ctx.translate(px + p.cw / 2, py); ctx.rotate(rot); ctx.fillText(p.ch, -p.cw / 2, 0); ctx.restore();
        }
      });
    }
    x += q.width + sp2;
  });
  ctx.restore();
}
