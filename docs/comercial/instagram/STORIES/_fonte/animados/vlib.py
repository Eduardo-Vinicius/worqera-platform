# shared builder for flat animated videos
base=open('story.html').read()
HEAD=base[:base.index('</head>')]
JS=base[base.index('<script>'):]
CSS='''<style>
.warm{background:#F6F3EE;color:#15131c}
.mint{background:#EEF8F1;color:#15131c}
.ebx{position:absolute;left:84px;top:250px;font-family:'IBM Plex Sans';font-weight:700;font-size:26px;letter-spacing:.28em;text-transform:uppercase;color:#7C3AED}
.navy .ebx,.purple .ebx{color:#D8C7FF}
.hx{position:absolute;left:84px;right:84px;top:305px;font-size:86px;font-weight:800;letter-spacing:-.035em;line-height:1.04}
.hx b{color:#7C3AED;font-weight:800}.navy .hx b,.purple .hx b{color:#D8C7FF}
.abs{position:absolute}
.floor{position:absolute;left:0;right:0;top:1440px;bottom:0;background:#E9E2D6}
.counter{position:absolute;z-index:2;left:380px;width:640px;top:1150px;height:330px;background:#4C1D95;border-radius:26px 26px 0 0}
.counter:before{content:"";position:absolute;left:-20px;right:-20px;top:-28px;height:40px;background:#6D28D9;border-radius:14px}
.plaque{position:absolute;left:220px;top:110px;display:flex;align-items:center;gap:14px;color:#fff;font-weight:800;font-size:40px}
.plaque img{width:64px;height:64px;border-radius:16px}
.bubble{position:absolute;background:#fff;border-radius:30px;padding:24px 30px;font-size:34px;font-weight:600;box-shadow:0 18px 40px -20px rgba(0,0,0,.35)}
.bubble:after{content:"";position:absolute;bottom:-18px;left:60px;border:18px solid transparent;border-top-color:#fff;border-bottom:0}
.tab{position:absolute;left:110px;right:110px;top:560px;height:980px;background:#111;border-radius:56px;padding:16px;box-shadow:0 40px 80px -30px rgba(40,20,80,.5)}
.tabs{width:100%;height:100%;background:#F7F6FA;border-radius:42px;padding:44px 44px;position:relative;overflow:hidden}
.tabs h4{font-size:44px;font-weight:800;letter-spacing:-.02em}
.tabs .stp{font-size:24px;color:#6b6877;margin-top:6px}
.fld{margin-top:20px;background:#fff;border:2px solid #e3e1ea;border-radius:20px;padding:18px 24px}
.fld label{display:block;font-size:20px;color:#7C3AED;font-weight:700}
.fld p{font-size:34px;font-weight:600;margin-top:4px;white-space:nowrap;overflow:hidden;clip-path:inset(0 100% 0 0)}
.svcs{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px}
.svc{font-size:28px;font-weight:700;padding:16px 24px;border-radius:999px;border:2px solid #e3e1ea;background:#fff;color:#55525f}
.svc.on{background:#7C3AED;border-color:#7C3AED;color:#fff}
.tot{display:flex;justify-content:space-between;align-items:center;margin-top:20px;font-size:30px;color:#55525f}
.tot b{font-size:52px;color:#15131c;letter-spacing:-.03em}
.cbtn{position:absolute;left:44px;right:44px;bottom:44px;background:#0f9d77;color:#fff;font-weight:800;font-size:38px;text-align:center;padding:30px;border-radius:24px}
.ripple{position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.55)}
.printer{position:absolute;left:240px;width:600px;top:640px;height:210px;background:#2a2733;border-radius:34px}
.printer:after{content:"";position:absolute;left:70px;right:70px;bottom:40px;height:16px;background:#0b0a10;border-radius:8px}
.printer i{position:absolute;right:46px;top:40px;width:22px;height:22px;border-radius:50%;background:#22c55e}
.lclip{position:absolute;left:300px;width:480px;top:810px;height:820px;overflow:hidden}
.lab{width:480px;border-radius:0 0 24px 24px;overflow:hidden;box-shadow:0 30px 60px -25px rgba(0,0,0,.45)}
.lab img{width:100%;display:block}
.toast{position:absolute;left:84px;right:84px;top:540px;background:#15131c;color:#fff;border-radius:24px;padding:24px 30px;font-size:32px;font-weight:700;display:flex;gap:16px;align-items:center}
.toast i{width:20px;height:20px;border-radius:50%;background:#22c55e;display:block}
.trk{position:absolute;left:470px;top:560px;width:500px;height:1000px;background:#111;border-radius:64px;padding:14px}
.trks{width:100%;height:100%;background:#fff;border-radius:52px;overflow:hidden}
.trkh{background:#7C3AED;color:#fff;padding:60px 34px 30px;font-size:30px;font-weight:700}
.trkh small{display:block;font-size:22px;opacity:.85;font-weight:500}
.trkb{padding:34px}
.trkb .code{font-family:'JetBrains Mono',monospace;font-size:56px;font-weight:700}
.step{display:flex;align-items:center;gap:20px;margin-top:30px;font-size:30px;font-weight:600;color:#9a97a6}
.step i{width:46px;height:46px;border-radius:50%;border:4px solid #d9d6e2;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:24px;color:#fff;flex:none}
.step.done{color:#15131c}.step.done i{background:#16a34a;border-color:#16a34a}
.step.now{color:#7C3AED}.step.now i{border-color:#7C3AED;background:#ede9fe}
.board{position:absolute;left:50px;right:50px;top:620px;height:900px;display:flex;gap:16px}
.bcol{flex:1;background:#fff;border-radius:26px;padding:16px;border:1px solid #e6e4ec;position:relative}
.bcol h5{font-size:22px;font-weight:800;display:flex;align-items:center;gap:8px;margin:6px 4px 14px}
.bcol h5 i{width:12px;height:12px;border-radius:50%;display:block}
.bcol h5 em{margin-left:auto;font-style:normal;font-size:20px;color:#8b8899}
.who{display:flex;gap:6px;margin:0 4px 14px}.who span{width:34px;height:34px;border-radius:50%;display:block;border:2px solid #fff}
.bc{background:#F7F6FA;border-radius:16px;padding:14px;margin-bottom:12px;border:1px solid #ecebf2}
.bc b{font-family:'JetBrains Mono',monospace;font-size:22px}.bc p{font-size:19px;color:#6b6877;margin-top:4px}
.bc.hot{position:absolute;left:16px;top:150px;width:calc(100% - 32px);background:#fff;border:3px solid #7C3AED;z-index:3;box-shadow:0 16px 30px -14px rgba(80,40,160,.5)}
.lock{position:absolute;left:250px;top:560px;width:580px;height:1000px;border-radius:70px;background:linear-gradient(180deg,#5b21b6,#1e1b4b);padding:14px;box-shadow:0 40px 80px -30px rgba(40,20,80,.6)}
.locks{width:100%;height:100%;border-radius:58px;border:2px solid rgba(255,255,255,.12);color:#fff;text-align:center;padding-top:110px;position:relative}
.locks .tm{font-size:120px;font-weight:300;letter-spacing:-.04em}
.locks .dt{font-size:26px;opacity:.8}
.nt{position:absolute;left:20px;right:20px;background:rgba(255,255,255,.92);color:#111;border-radius:28px;padding:22px;display:flex;gap:16px;text-align:left}
.nt .ic{width:58px;height:58px;border-radius:14px;background:#25D366;flex:none}
.nt b{font-size:24px}.nt p{font-size:23px;line-height:1.3;margin-top:2px}.nt small{float:right;font-size:18px;color:#777}
.heart{position:absolute;font-size:60px}
.clock{position:absolute;right:84px;top:240px;background:#15131c;color:#fff;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:44px;padding:14px 26px;border-radius:18px}
.navy .clock,.purple .clock{background:#fff;color:#15131c}
.cnt{font-variant-numeric:tabular-nums}
</style>'''
KX='''
  walk:[[{transform:'translateX(-560px)'},{transform:'translateX(0)'}],1300,'cubic-bezier(.3,.7,.4,1)'],
  bob:[[{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'},{transform:'translateY(-14px)'},{transform:'translateY(0)'}],1300,'linear'],
  type:[[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0 0 0)'}],900,'steps(18)'],
  sel:[[{background:'#fff',color:'#55525f',borderColor:'#e3e1ea'},{background:'#7C3AED',color:'#fff',borderColor:'#7C3AED'}],200],
  tapr:[[{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1)',offset:.4},{opacity:0,transform:'scale(1.6)'}],600],
  print:[[{transform:'translateY(-100%)'},{transform:'translateY(0)'}],1600,'cubic-bezier(.4,0,.2,1)'],
  fade:[[{opacity:0},{opacity:1}],350],
  check:[[{opacity:.4},{opacity:1}],250],
  hop1:[[{transform:'translate(0,0)'},{transform:'translate(0,-30px)',offset:.3},{transform:'translate(var(--dx),-30px)',offset:.75},{transform:'translate(var(--dx),0)'}],800,'cubic-bezier(.4,0,.2,1)'],
  float:[[{opacity:0,transform:'translateY(0) scale(.6)'},{opacity:1,transform:'translateY(-80px) scale(1)',offset:.4},{opacity:0,transform:'translateY(-220px) scale(1.1)'}],1600,'ease-out'],
  hand:[[{transform:'translateX(0)'},{transform:'translateX(-210px)'}],700,'cubic-bezier(.3,.7,.4,1)'],
  kb:[[{transform:'scale(1)'},{transform:'scale(1.08)'}],4000,'linear'],
'''
def person(shirt='#7C3AED',hair='#2b1d14',skin='#E8B48F',pants='#1f2937',w=260,happy=False,cap=None,hold='',flip=False):
    mouth='M100 122 Q120 145 140 122' if happy else 'M104 126 Q120 136 136 126'
    f=' transform="translate(240,0) scale(-1,1)"' if flip else ''
    return f'''<svg width="{w}" viewBox="0 0 240 470"><g{f}>
<rect x="78" y="300" width="36" height="150" rx="18" fill="{pants}"/><rect x="126" y="300" width="36" height="150" rx="18" fill="{pants}"/>
<ellipse cx="92" cy="455" rx="30" ry="14" fill="#111"/><ellipse cx="148" cy="455" rx="30" ry="14" fill="#111"/>
<rect x="106" y="130" width="28" height="44" fill="{skin}"/>
<rect x="56" y="160" width="128" height="170" rx="52" fill="{shirt}"/>
<rect x="30" y="178" width="34" height="132" rx="17" fill="{shirt}"/><rect x="176" y="178" width="34" height="132" rx="17" fill="{shirt}"/>
<circle cx="47" cy="318" r="18" fill="{skin}"/><circle cx="193" cy="318" r="18" fill="{skin}"/>
<circle cx="120" cy="92" r="58" fill="{skin}"/>
<path d="M62 92 Q60 30 120 30 Q182 30 178 92 Q170 58 120 56 Q72 58 62 92Z" fill="{hair}"/>
<circle cx="100" cy="98" r="6" fill="#1a1a1a"/><circle cx="140" cy="98" r="6" fill="#1a1a1a"/>
<path d="{mouth}" stroke="#1a1a1a" stroke-width="6" fill="none" stroke-linecap="round"/>
{'<circle cx="88" cy="116" r="9" fill="#f9a8a8" opacity=".6"/><circle cx="152" cy="116" r="9" fill="#f9a8a8" opacity=".6"/>' if happy else ''}
{hold}</g></svg>'''
SNEAKER='<g transform="translate(150,268) scale(.9)"><path d="M0 40 Q4 6 34 4 L52 22 Q78 34 112 38 Q130 42 128 58 L0 58Z" fill="#fff" stroke="#15131c" stroke-width="5"/><path d="M8 58 L128 58" stroke="#7C3AED" stroke-width="10"/><path d="M40 20 L60 44" stroke="#7C3AED" stroke-width="6"/></g>'
PHONE='<g transform="translate(168,240)"><rect x="0" y="0" width="56" height="96" rx="12" fill="#15131c"/><rect x="6" y="8" width="44" height="78" rx="6" fill="#ede9fe"/></g>'
def build(fname,scenes,chapters=None):
    S=[];t=0
    for cls,dur,inner in scenes:
        S.append(f'<section class="sc {cls}" data-s="{round(t,3)}" data-e="{round(t+dur,3)}">{inner}</section>'); t+=dur
    js=JS.replace("const K={","const K={"+KX).replace('window.TOTAL=23.5;',f'window.TOTAL={round(t,3)};')
    js=js.replace('const chapters=scenes.slice(1,6);',f'const chapters={chapters or "[]"};')
    open(fname,'w').write(HEAD+CSS+'</head><body>\n'+'\n'.join(S)+'\n<div class="prog" id="prog"></div>\n'+js)
    return round(t,3)
