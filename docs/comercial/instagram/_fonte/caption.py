import os, re, html as H, sys
import lib
from lib import ic, glow, FONTS
MD = sys.argv[1]
POSTS = {'Post 4': ('post-4-servicos-principal', 13), 'Post 8': ('post-8-crm-ia', 7), 'Post 5': ('post-5-numeros-reais', 6),
         'Post 7': ('post-7-5-sinais', 7), 'Post 6': ('post-6-um-dia-na-loja', 7)}
txt = open(MD).read()
for sec in txt.split('\n## ')[1:]:
    title, body = sec.split('\n', 1)
    key = title.split(' · ')[0]
    folder, n = POSTS[key]
    body = body.strip().rstrip('-').strip()
    lines = body.split('\n')
    tags = [l for l in lines if l.startswith('#')]
    cap = '\n'.join(l for l in lines if not l.startswith('#')).strip()
    size = 25 if len(cap) < 600 else (23 if len(cap) < 740 else 21)
    cap_html = H.escape(cap).replace('\n', '<br>')
    cap_html = re.sub(r'QUERO', '<b style="color:#F0ABFC">QUERO</b>', cap_html)
    thumbs = ''.join(f'<img src="../out/{folder}/{i:02d}.png" style="width:150px;height:188px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.12);flex:none">' for i in range(1, min(n, 6) + 1))
    more = f'<span style="flex:none;width:80px;display:flex;align-items:center;justify-content:center;font-family:JetBrains Mono;color:#A9A6BF;font-size:20px">+{n-6}</span>' if n > 6 else ''
    page = f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{lib.CSS}html,body{{width:1080px;height:1350px}}</style></head><body>
{glow(540, 120, 1300, 'rgba(124,58,237,.45)')}{glow(900, 1200, 900, 'rgba(99,102,241,.25)')}
<div class="sl" style="left:0"><div class="hdr"><div class="brand"><img src="assets/worqera-logo.png">Worqera</div><div class="cnt">LEGENDA</div></div>
<div style="position:relative;z-index:4;flex:1;display:flex;flex-direction:column">
<div style="height:30px"></div><div class="tag"><i></i>{H.escape(title)} · {n} telas</div><div style="height:26px"></div>
<div style="display:flex;gap:12px;overflow:hidden">{thumbs}{more}</div><div style="height:26px"></div>
<div class="gl" style="flex:1;padding:30px 34px;background:rgba(14,12,26,.82);margin-bottom:40px;display:flex;flex-direction:column">
<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px"><img src="assets/worqera-logo.png" style="width:48px;height:48px;border-radius:50%"><b style="font-size:23px">worqera</b><span style="font-size:19px;color:#A9A6BF">· legenda do post</span></div>
<div style="font-size:{size}px;line-height:1.48;color:#ECEAF6">{cap_html}</div>
<div style="font-size:{size-2}px;line-height:1.5;color:#A5B4FC;margin-top:16px">{H.escape(' '.join(tags))}</div></div>
</div></div></body></html>'''
    open(f'html/cap-{folder}.html', 'w').write(page)
    print(folder, len(cap), size)
