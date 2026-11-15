import sys, os
sys.path.insert(0, '../../pylib')
from PIL import Image
os.makedirs('out', exist_ok=True)
for f in sorted(os.listdir('png')):
    im = Image.open('png/'+f).convert('RGB'); name = f[:-4]; n = im.width // 1080
    os.makedirs(f'out/{name}', exist_ok=True)
    tiles = []
    for i in range(n):
        t = im.crop((i*1080, 0, (i+1)*1080, 1350)); t.save(f'out/{name}/{i+1:02d}.png'); tiles.append(t)
    sheet = Image.new('RGB', (n*360+ (n-1)*8, 450), (40,40,40))
    for i,t in enumerate(tiles): sheet.paste(t.resize((360,450)), (i*368, 0))
    sheet.save(f'out/{name}-sheet.jpg', quality=85)
print('ok')
