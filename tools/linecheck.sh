#!/bin/zsh
# Render a still near the end of every sung line in each scene and make one labelled sheet per scene:
#   tools/linecheck.sh [scene ...]   (all scenes by default)
S=${0:A:h:h}; E=${ARK_ENGINE:-$S/../ark-video-studio-farm2}
scenes=(${@:-$(python3 -c "import json;print(' '.join(s['scene'] for s in json.load(open('$S/film.json'))['scenes']))")})
for sc in $scenes; do
  read from to ts <<< $(python3 - "$S" "$sc" <<'PY'
import json, sys
S, sc = sys.argv[1:3]
s = [x for x in json.load(open(f'{S}/film.json'))['scenes'] if x['scene'] == sc][0]
L = json.load(open(f'{S}/data/lyrics.json'))['lines']
ts = [round(min(l['end'] + 0.25, s['to'] - 0.04), 2) for l in L if s['from'] - 0.3 <= l['start'] < s['to']]
print(s['from'], s['to'], ','.join(map(str, ts)) or round((s['from'] + s['to']) / 2, 2))
PY
)
  (cd $E && node photoreal/render.mjs stills --song $S --scene $sc --params "{\"from\":$from,\"to\":$to}" --t $ts --samples ${SAMPLES:-6} 2>&1 | grep -i "error" | head -3)
  python3 - "$S/out/$sc/stills" "$ts" "$S/out/lines-$sc.jpg" "$sc" <<'PY'
import sys
from PIL import Image, ImageDraw
d, ts, out, sc = sys.argv[1:5]
ts = ts.split(',')
cols = 3; rows = (len(ts) + cols - 1) // cols
sh = Image.new('RGB', (640 * cols, 360 * rows))
dr = ImageDraw.Draw(sh)
for i, t in enumerate(ts):
    f = f"{d}/{sc}-{float(t):.2f}.png"
    try: sh.paste(Image.open(f).convert('RGB').resize((640, 360)), ((i % cols) * 640, (i // cols) * 360))
    except Exception: pass
    dr.text(((i % cols) * 640 + 8, (i // cols) * 360 + 6), t, fill=(255, 255, 0))
sh.save(out, quality=85)
print(out)
PY
done
