#!/bin/zsh
# Render test stills of one scene at given times and make a contact sheet.
#   tools/look.sh <scene> <t1,t2,...> [samples] [extra-params-json-fields]
S=${0:A:h:h}; E=${ARK_ENGINE:-$S/../ark-video-studio-farm2}
scene=$1; ts=$2; samples=${3:-16}; extra=${4:-}
read from to <<< $(python3 -c "import json;s=[x for x in json.load(open('$S/film.json'))['scenes'] if x['scene']=='$scene'][0];print(s['from'],s['to'])")
cd $E && node photoreal/render.mjs stills --song $S --scene $scene --params "{\"from\":$from,\"to\":$to${extra:+,$extra}}" --t $ts --samples $samples 2>&1 | grep -v "404\|Feedback" | grep -i "error\|ms$" | head -20
python3 - "$S/out/$scene/stills" "$ts" "$S/out/sheet-$scene.jpg" <<'PY'
import sys
from PIL import Image
d, ts, out = sys.argv[1:4]
fs = [f"{d}/{d.split('/')[-2]}-{float(t):.2f}.png" for t in ts.split(',')]
n = len(fs); cols = 2 if n > 1 else 1; rows = (n + 1) // 2
sh = Image.new('RGB', (960 * cols, 540 * rows))
for i, f in enumerate(fs):
    try: sh.paste(Image.open(f).resize((960, 540)), ((i % 2) * 960, (i // 2) * 540))
    except Exception as e: print('missing', f)
sh.save(out, quality=86)
print(out)
PY
