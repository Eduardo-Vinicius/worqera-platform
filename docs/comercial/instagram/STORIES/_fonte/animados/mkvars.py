import re
A=open('vA.html').read(); B=open('vB.html').read()
def split(h):
    i=h.index('<section'); j=h.index('<div class="prog"')
    secs=re.findall(r'<section class="sc ([^"]+)" data-s="([^"]+)" data-e="([^"]+)">(.*?)</section>',h[i:j],re.S)
    return h[:i],[(c,float(e)-float(s),x) for c,s,e,x in secs],h[j:]
def join(head,secs,tail,chap):
    out=[];t=0
    for c,d,x in secs:
        out.append(f'<section class="sc {c}" data-s="{round(t,3)}" data-e="{round(t+d,3)}">{x}</section>');t+=d
    tail=re.sub(r'window\.TOTAL=[\d.]+;',f'window.TOTAL={round(t,3)};',tail)
    tail=re.sub(r'const chapters=scenes\.slice\(\d+,\d+\);',f'const chapters=scenes.slice({chap});',tail)
    return head+'\n'.join(out)+'\n'+tail
EXTRA_CSS='''<style>
.logos2{position:absolute;left:84px;right:84px;top:340px;display:flex;gap:26px}
.logos2 div{flex:1;background:#fff;border:1px solid #e6e4ec;border-radius:32px;padding:40px 20px;text-align:center}
.logos2 img{width:230px;height:230px;display:block;margin:0 auto 22px}
.logos2 b{display:block;font-size:32px}.logos2 span{font-size:24px;color:#77748a}
.lab{position:relative}
.lab .ov{position:absolute;left:0;right:0;background:#fff;text-align:center}
.ramos{position:absolute;left:84px;right:84px;top:720px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
.ramo{background:#fff;border:1px solid #e6e4ec;border-radius:30px;padding:34px 30px;display:flex;align-items:center;gap:22px;box-shadow:0 20px 40px -30px rgba(40,20,80,.35)}
.ramo i{font-style:normal;font-size:64px;width:100px;height:100px;border-radius:26px;background:#F3EEFF;display:flex;align-items:center;justify-content:center;flex:none}
.ramo b{font-size:32px;line-height:1.15;letter-spacing:-.01em}
</style>'''
NUMS2=re.search(r'\.nums2[^\n]*\n(?:\.nums2[^\n]*\n)*',B)
EXTRA_CSS=EXTRA_CSS.replace('</style>',(NUMS2.group(0) if NUMS2 else '')+'</style>')
hB,sB,tB=split(B)
partners=[s for s in sB if 'logos2' in s[2]][0]
def label(item):
    # covers shop name + item line on the label image (rendered at 480/1062)
    return ('<div class="lab a" data-a="print" data-d=".9"><img src="c-label.png">'
     '<div class="ov" style="top:36px;height:40px;font-size:24px;letter-spacing:.3em;color:#5B21B6;font-weight:600">WORQERA</div>'
     f'<div class="ov" style="top:252px;height:34px;font-size:22px;color:#64748b">{item}</div></div>')
LAB_OLD='<div class="lab a" data-a="print" data-d=".9"><img src="c-label.png"></div>'
def base(h):
    h=h.replace('Ateliê Sola','Worqera').replace('</head>',EXTRA_CSS+'</head>')
    return h
# ---------- collab ----------
h=base(A)
h=h.replace('O cliente chega<br>com o <b>tênis</b>.','O cliente chega com<br>o <b>tênis</b>, o <b>sapato</b><br>ou a <b>bolsa</b>.')
h=h.replace('<span class="svc">Costura</span><span class="svc">Troca de sola</span>','<span class="svc">Costura</span><span class="svc">Troca de sola</span><span class="svc">Bolsas</span>')
h=h.replace(LAB_OLD,label('1 tênis · Air Force 1'))
hd,ss,tl=split(h)
ss.insert(len(ss)-1,partners)
open('vC1.html','w').write(join(hd,ss,tl,'1,8'))
# ---------- genérico ----------
BOX='<g transform="translate(140,250)"><rect x="0" y="14" width="120" height="86" rx="10" fill="#E0A96D" stroke="#15131c" stroke-width="5"/><path d="M0 40 H120 M60 14 V40" stroke="#15131c" stroke-width="5"/><rect x="40" y="0" width="40" height="18" rx="6" fill="#7C3AED"/></g>'
SNK=re.search(r'<g transform="translate\(150,268\) scale\(\.9\)">.*?</g>',A,re.S).group(0)
h=base(A).replace(SNK,BOX)
h=h.replace('Como funciona,<br>do balcão<br>à <b>entrega</b>.','Recebe, faz<br>e entrega?<br>Isso é <b>Worqera</b>.')
h=h.replace('O cliente chega<br>com o <b>tênis</b>.','O cliente chega<br>com o <b>pedido</b>.')
h=h.replace('Oi! Quero restaurar<br>esse aqui 👟','Oi! Vim deixar<br>isso aqui pra fazer 🙌')
h=h.replace('Nike · Air Force 1','Notebook · tela trincada')
h=re.sub(r'<div class="svcs">.*?</div>','<div class="svcs"><span class="svc a" data-a="sel" data-d="2.2">Diagnóstico</span><span class="svc a" data-a="sel" data-d="2.4">Troca de tela</span><span class="svc">Limpeza</span><span class="svc">Garantia</span></div>',h,1,re.S)
h=h.replace('R$ 180,00','R$ 450,00').replace('+R$ 180','+R$ 450')
h=h.replace('setor Lavagem','setor Triagem')
h=h.replace(LAB_OLD,label('1 item · Notebook'))
h=h.replace('Air Force 1 · prazo','Notebook · prazo')
h=h.replace('<i></i>Lavagem · agora','<i></i>Em execução · agora').replace('<i></i>Acabamento</div>','<i></i>Revisão</div>')
# board: generic sectors + mixed businesses
for a,b in [('Lavagem<em>','Triagem<em>'),('Restauração<em>','Execução<em>'),('Acabamento<em>','Revisão<em>'),
            ('Vans · Costura','Celular · Tela'),('Adidas · Limpeza','Vestido · Ajuste'),('Puma · Sola','Relógio · Bateria'),('Marina · Air Force 1','Marina · Notebook')]:
    h=h.replace(b if False else a,b)
h=h.replace('Kanban · QR · aviso · CRM · IA','Pra qualquer negócio que recebe, faz e entrega')
h=h.replace('Você atende.<br><span style="color:#C99BFF">A Worqera organiza.</span>','Seu negócio,<br><span style="color:#C99BFF">organizado.</span>')
RAMOS='''<p class="ebx a" data-a="up" data-d="0">Pra qualquer ramo</p><div class="hx a" data-a="up" data-d="0.1">Se tem <b>pedido</b>,<br>tem Worqera.</div>
<div class="ramos">'''+''.join(f'<div class="ramo a" data-a="pop" data-d="{.35+i*.22:.2f}"><i>{e}</i><b>{t}</b></div>' for i,(e,t) in enumerate([
 ('👟','Sapataria e<br>lavagem de tênis'),('👕','Lavanderia'),('📱','Assistência<br>técnica'),('✂️','Costura e<br>ajustes'),('⌚','Relojoaria'),('👜','Bolsas e<br>couro'),('🔧','Oficinas'),('🖨️','Gráficas')]))+'</div>'
RAMOS+='<div class="chip a" data-a="pop" data-d="2.4" style="left:84px;top:1640px;background:#110f17;color:#fff;font-size:30px"><span class="dot" style="background:#22c55e"></span>Setores do seu jeito: você monta o fluxo</div>'
hd,ss,tl=split(h)
ss.insert(1,('light',3.6,RAMOS))
ss.insert(len(ss)-1,partners)
open('vC2.html','w').write(join(hd,ss,tl,'2,9'))
# ---------- vB rebrand ----------
open('vB2.html','w').write(B.replace('Ateliê Sola','Worqera'))
print('ok')
