import os, sys, shutil, html as H
from PIL import Image
D=sys.argv[1]; P=D+'/PARA-POSTAR'
md=open(D+'/legendas.md').read(); secs=md.split('\n## ')[1:]
names=['1 - Principal - Servicos','2 - Demita o caderno','3 - CRM e IA','4 - Numeros reais','5 - 5 sinais','6 - Um dia na loja']
FONTS='<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=IBM+Plex+Sans:wght@700&display=swap" rel="stylesheet">'
pdf=[]; readme=['WORQERA · ORDEM PARA POSTAR NO INSTAGRAM','','Cada pasta é um carrossel. Suba as imagens na ordem 01, 02, 03...','Copie o texto de legenda.txt e cole na legenda do post.','Responda todo comentário (QUERO / DEMITIDO) no direct no mesmo dia.','Sugestão: 1 post a cada 2 ou 3 dias, entre 11h e 13h ou 18h e 20h.','']
for k,(sec,name) in enumerate(zip(secs,names),1):
    title,body=sec.split('\n',1); body=body.strip().rstrip('-').strip()
    src='out/'+name.replace(' ','_'); dst=f'{P}/{name}'; os.makedirs(dst,exist_ok=True)
    fs=sorted(os.listdir(src))
    for f in fs: shutil.copyfile(f'{src}/{f}',f'{dst}/{f}'); pdf.append(Image.open(f'{src}/{f}').convert('RGB'))
    open(f'{dst}/legenda.txt','w').write(body+'\n')
    readme.append(f'{k}º post: {name}  ({len(fs)} imagens)')
    lines=body.split('\n'); tags=' '.join(l for l in lines if l.startswith('#')); cap='\n'.join(l for l in lines if not l.startswith('#')).strip()
    size=24 if len(cap)<620 else 22
    th=''.join(f'<img src="{src}/{f}" style="width:142px;height:178px;border-radius:10px;border:1px solid #E2E8F0">' for f in fs[:6])
    capx=H.escape(cap).replace(chr(10),'<br>')
    for kw in ('QUERO','DEMITIDO'): capx=capx.replace(kw,f'<b style="color:#7C3AED">{kw}</b>')
    page=f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>*{{margin:0;padding:0;box-sizing:border-box}}body{{width:1080px;height:1350px;background:#F3F4F8;font-family:Inter;color:#0F172A;padding:70px 72px}}</style></head><body>
<div style="display:flex;align-items:center;gap:14px;font-weight:700;font-size:32px"><img src="assets/worqera-logo.png" style="width:50px;height:50px;border-radius:12px">Worqera</div>
<div style="font-family:'IBM Plex Sans';font-weight:700;font-size:22px;letter-spacing:.34em;color:#7C3AED;margin-top:40px">LEGENDA · POST {k}</div>
<div style="display:flex;gap:12px;margin-top:24px">{th}</div>
<div style="background:#fff;border:1px solid #E5E7EB;border-radius:22px;padding:30px 34px;margin-top:26px;font-size:{size}px;line-height:1.48">{capx}
<div style="color:#7C3AED;margin-top:14px;font-size:{size-2}px">{H.escape(tags)}</div></div></body></html>'''
    open(f'cap{k}.html','w').write(page)
    os.system(f'"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1080,1350 --virtual-time-budget=5000 --screenshot=cap{k}.png "file://{os.getcwd()}/cap{k}.html" >/dev/null 2>&1')
    pdf.append(Image.open(f'cap{k}.png').convert('RGB'))
open(f'{P}/LEIA-ME.txt','w').write('\n'.join(readme)+'\n')
pdf[0].save(D+'/Worqera_Posts_Novos.pdf',save_all=True,append_images=pdf[1:],resolution=144)
print(len(pdf))
