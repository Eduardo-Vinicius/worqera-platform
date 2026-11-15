#!/bin/bash
cd "$(dirname "$0")"; rm -f png/*.png
for f in html/*.html; do
  b=$(basename "$f" .html); n=$(grep -o 'class="cnt">[0-9]*/[0-9]*' "$f" | head -1 | sed 's/.*\///')
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=$((10#$n*1080)),1350 --virtual-time-budget=6000 --screenshot="png/$b.png" "file://$PWD/$f" >/dev/null 2>&1
done
python3 - <<'PY'
import os
from PIL import Image
for f in sorted(os.listdir('png')):
    im=Image.open('png/'+f).convert('RGB'); name=f[:-4]; n=im.width//1080
    os.makedirs(f'out/{name}',exist_ok=True)
    for i in range(n): im.crop((i*1080,0,(i+1)*1080,1350)).save(f'out/{name}/{i+1:02d}.png')
    s=Image.new('RGB',(3*400+20,((n+2)//3)*510),(40,40,40))
    for i in range(n): s.paste(im.crop((i*1080,0,(i+1)*1080,1350)).resize((400,500)),((i%3)*410,(i//3)*510))
    s.save(f'sheet-{name}.jpg',quality=86)
print('ok')
PY
