"""Worqera · carrosséis do Instagram v2 (painel contínuo, 1080x1350 por tela)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
I = json.load(open(os.path.join(HERE, 'icons.json')))
OUT = os.path.join(HERE, 'html'); os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1350

def ic(name, size=None, color=None):
    st = ''
    if size: st += f'width:{size}px;height:{size}px;'
    if color: st += f'color:{color};'
    return f'<span class="ic" style="{st}">{I.get(name, "")}</span>'

CSS = r"""
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;background:#07060E;color:#fff;overflow:hidden;position:relative}
.star svg{fill:currentColor}
.ic{display:inline-flex;width:28px;height:28px;flex:none}.ic svg{width:100%;height:100%}
.mono{font-family:'JetBrains Mono',monospace}
.glow{position:absolute;border-radius:50%;filter:blur(40px);pointer-events:none}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:72px 72px;-webkit-mask-image:radial-gradient(ellipse 60% 55% at 50% 30%,#000 10%,transparent 75%)}
.sl{position:absolute;top:0;overflow:hidden;width:1080px;height:1350px;padding:64px 72px;display:flex;flex-direction:column}
.hdr{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:5}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:29px;letter-spacing:-.02em}
.brand img{width:42px;height:42px;border-radius:11px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 8px 30px rgba(147,51,234,.45)}
.cnt{font-family:'JetBrains Mono';font-size:19px;color:rgba(255,255,255,.4);letter-spacing:.08em}
.ftr{position:absolute;left:72px;right:72px;bottom:58px;display:flex;align-items:center;justify-content:space-between;z-index:5}
.ftr .u{font-family:'JetBrains Mono';font-size:19px;color:rgba(255,255,255,.42);letter-spacing:.06em}
.swipe{display:flex;align-items:center;gap:14px;font-size:20px;font-weight:600;color:rgba(255,255,255,.7)}
.swipe .b{width:54px;height:54px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16)}
.tag{display:inline-flex;align-items:center;gap:12px;font-family:'JetBrains Mono';font-size:18px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#D8B4FE;padding:11px 20px 11px 16px;border-radius:999px;background:rgba(139,92,246,.12);border:1px solid rgba(167,139,250,.3);align-self:flex-start}
.tag i{width:9px;height:9px;border-radius:50%;background:#C084FC;box-shadow:0 0 12px 3px rgba(192,132,252,.8)}
.h{font-weight:800;font-size:96px;line-height:.98;letter-spacing:-.052em}
.h.l{font-size:112px}.h.m{font-size:80px}.h.s{font-size:66px;letter-spacing:-.045em}
.w{background:linear-gradient(180deg,#fff 35%,#C9C3E6);-webkit-background-clip:text;color:transparent}
.a{background:linear-gradient(92deg,#E9D5FF 0%,#C084FC 35%,#A78BFA 65%,#818CF8 100%);-webkit-background-clip:text;color:transparent}
.lead{font-size:32px;line-height:1.42;color:#A9A6BF;letter-spacing:-.01em}
.lead b{color:#fff;font-weight:600}
.gl{background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.11);border-radius:30px;box-shadow:0 40px 90px -30px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.09);backdrop-filter:blur(18px)}
.ib{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;flex:none;background:linear-gradient(180deg,rgba(167,139,250,.28),rgba(124,58,237,.12));border:1px solid rgba(196,181,253,.3);color:#E9D5FF;box-shadow:0 10px 30px -8px rgba(147,51,234,.6)}
.ib .ic{width:32px;height:32px}
.sp{flex:1}
/* ---------- app (claro) ---------- */
.win{background:#fff;border-radius:22px;overflow:hidden;color:#0F172A;box-shadow:0 0 0 1px rgba(255,255,255,.14),0 60px 120px -30px rgba(0,0,0,.85),0 0 120px -20px rgba(147,51,234,.45)}
.wbar{height:44px;background:#F3F2F8;border-bottom:1px solid #E7E5F0;display:flex;align-items:center;padding:0 16px;gap:8px}
.wbar i{width:12px;height:12px;border-radius:50%;background:#E2E0EA}
.wbar i:nth-child(1){background:#FF5F57}.wbar i:nth-child(2){background:#FEBC2E}.wbar i:nth-child(3){background:#28C840}
.url{margin-left:18px;flex:1;max-width:420px;height:26px;border-radius:8px;background:#fff;border:1px solid #E7E5F0;font-family:'JetBrains Mono';font-size:13px;color:#64748B;display:flex;align-items:center;padding:0 12px;gap:8px}
.app{display:flex;height:calc(100% - 44px)}
.side{width:196px;background:#FAFAFD;border-right:1px solid #EEEDF4;padding:18px 12px;flex:none}
.side .lg{display:flex;align-items:center;gap:9px;font-weight:700;font-size:16px;margin:0 6px 20px}
.side .lg img{width:24px;height:24px;border-radius:6px}
.nav{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:#64748B;padding:9px 10px;border-radius:9px;margin-bottom:2px}
.nav .ic{width:17px;height:17px}
.nav.on{background:#F3E8FF;color:#7C3AED;font-weight:600}
.main{flex:1;padding:18px 20px;background:#fff;min-width:0}
.mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mh h4{font-size:20px;font-weight:700;letter-spacing:-.02em}
.chips{display:flex;gap:7px}
.chp{font-size:12px;font-weight:600;padding:6px 10px;border-radius:999px;background:#F1F5F9;color:#475569;display:flex;gap:6px;align-items:center}
.chp b{font-family:'JetBrains Mono';font-weight:600}
.chp.r{background:#FEE2E2;color:#B91C1C}.chp.y{background:#FEF3C7;color:#92400E}.chp.v{background:#F3E8FF;color:#7C3AED}
.cols{display:flex;gap:10px}
.col{flex:1;background:#F6F6FA;border-radius:12px;padding:10px;min-width:0}
.ch{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin:2px 2px 10px}
.ch b{font-family:'JetBrains Mono';font-size:11px;background:#fff;border:1px solid #E7E5F0;border-radius:6px;padding:1px 6px;color:#475569}
.kc{background:#fff;border:1px solid #E8E6F0;border-radius:10px;padding:10px 11px;margin-bottom:8px;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.kc .t1{display:flex;justify-content:space-between;align-items:center}
.kc .cd{font-family:'JetBrains Mono';font-size:12px;font-weight:600;color:#7C3AED}
.kc .nm{font-size:14px;font-weight:700;margin:5px 0 2px;letter-spacing:-.01em}
.kc .sv{font-size:12px;color:#64748B}
.kc .ft{display:flex;align-items:center;justify-content:space-between;margin-top:9px}
.th{display:flex;gap:4px}.th span{width:22px;height:22px;border-radius:6px}
.due{font-size:11px;font-weight:600;padding:3px 7px;border-radius:6px;background:#F1F5F9;color:#475569}
.due.r{background:#FEE2E2;color:#B91C1C}.due.y{background:#FEF3C7;color:#92400E}.due.g{background:#DCFCE7;color:#166534}
.kc.late{border-color:#FCA5A5;box-shadow:0 0 0 3px rgba(239,68,68,.12)}
.kc.hot{border-color:#C4B5FD;box-shadow:0 0 0 3px rgba(139,92,246,.15),0 10px 24px -8px rgba(124,58,237,.35)}
.prs{font-size:10.5px;font-weight:700;color:#7C3AED;background:#F3E8FF;padding:2px 6px;border-radius:5px}
/* ---------- phone ---------- */
.ph{position:relative;width:380px;height:780px;border-radius:62px;background:#0B0B12;padding:12px;box-shadow:0 0 0 2px #2A2838,0 0 0 9px #14131D,0 70px 120px -30px rgba(0,0,0,.9),0 0 140px -30px rgba(147,51,234,.55)}
.scr{position:relative;width:100%;height:100%;border-radius:51px;overflow:hidden;background:#F7F7FB;color:#0F172A}
.isl{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:118px;height:34px;border-radius:20px;background:#000;z-index:9}
.stb{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 30px 0 36px;font-size:16px;font-weight:600}
.stb .r{display:flex;gap:6px}.stb .ic{width:17px;height:17px}
.lab{background:#fff;color:#0F172A;border-radius:16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.8);position:relative;overflow:hidden}
.lab:before{content:"";position:absolute;left:0;right:0;top:0;height:10px;background:repeating-linear-gradient(90deg,#E5E7EB 0 6px,transparent 6px 12px)}
.notif{background:rgba(255,255,255,.82);backdrop-filter:blur(20px);border-radius:24px;padding:14px 16px;display:flex;gap:12px;color:#0F172A;box-shadow:0 10px 30px -10px rgba(0,0,0,.45)}
.wa{width:40px;height:40px;border-radius:11px;background:linear-gradient(180deg,#5BE584,#1FAF55);display:flex;align-items:center;justify-content:center;color:#fff;flex:none}
.wa .ic{width:22px;height:22px}
.bar{border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#A78BFA,#7C3AED)}
.k{font-family:'JetBrains Mono';font-weight:600;letter-spacing:-.03em}
.line{position:absolute;height:2px;background:linear-gradient(90deg,transparent,rgba(192,132,252,.9),transparent)}
.pill{display:inline-flex;align-items:center;gap:10px;font-size:22px;font-weight:600;padding:12px 20px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#E4E1F2}
.pill .ic{width:22px;height:22px;color:#C4B5FD}
.cta{display:inline-flex;align-items:center;gap:18px;font-weight:700;font-size:34px;padding:28px 40px;border-radius:20px;background:linear-gradient(180deg,#A855F7,#7C3AED);box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 20px 60px -10px rgba(147,51,234,.8)}
.cta .ic{width:34px;height:34px}
.cta2{display:inline-flex;align-items:center;gap:16px;font-weight:600;font-size:30px;padding:26px 34px;border-radius:20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.16)}
.cta2 .ic{width:30px;height:30px;color:#86EFAC}
"""

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">'

def glow(x, y, size, color, op=1.0):
    return f'<div class="glow" style="left:{x-size//2}px;top:{y-size//2}px;width:{size}px;height:{size}px;background:radial-gradient(circle,{color} 0%,transparent 68%);opacity:{op}"></div>'

def slide(i, n, body, last=False, grid=True):
    sw = '' if last else f'<div class="swipe">Arraste<span class="b">{ic("ArrowRight", 24)}</span></div>'
    g = '<div class="grid"></div>' if grid else ''
    return f'''<div class="sl" style="left:{i*W}px">{g}
<div class="hdr"><div class="brand"><img src="assets/worqera-logo.png">Worqera</div><div class="cnt">{i+1:02d} / {n:02d}</div></div>
<div style="position:relative;z-index:4;flex:1;display:flex;flex-direction:column">{body}</div>
<div class="ftr"><span class="u">worqera.com</span>{sw}</div></div>'''

def doc(n, layers, slides_html):
    return f'''<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{CSS}
html,body{{width:{n*W}px;height:{H}px}}</style></head><body>{layers}{slides_html}</body></html>'''

def gap(px): return f'<div style="height:{px}px;flex:none"></div>'
def tag(t): return f'<div class="tag"><i></i>{t}</div>'

# ------------------------------------------------------------ mocks
TH = ['linear-gradient(135deg,#F5F5F4,#D6D3D1)', 'linear-gradient(135deg,#1F2937,#4B5563)', 'linear-gradient(135deg,#FDE68A,#F59E0B)',
      'linear-gradient(135deg,#BFDBFE,#3B82F6)', 'linear-gradient(135deg,#FBCFE8,#EC4899)', 'linear-gradient(135deg,#BBF7D0,#16A34A)',
      'linear-gradient(135deg,#E9D5FF,#9333EA)', 'linear-gradient(135deg,#FED7AA,#EA580C)']

def thumbs(*idx):
    return '<div class="th">' + ''.join(f'<span style="background:{TH[i]}"></span>' for i in idx) + '</div>'

def kcard(code, name, svc, due, dcls='', th=(0,), cls='', pairs=None):
    pr = f'<span class="prs">{pairs} pares</span>' if pairs else ''
    return f'''<div class="kc {cls}"><div class="t1"><span class="cd">#{code}</span>{pr}</div>
<div class="nm">{name}</div><div class="sv">{svc}</div>
<div class="ft">{thumbs(*th)}<span class="due {dcls}">{due}</span></div></div>'''

def sidebar(active='Kanban'):
    items = [('LayoutDashboard','Visão geral'),('KanbanSquare','Kanban'),('Inbox','Pedidos'),('Users','Clientes'),
             ('MessageCircle','Orçamentos'),('Wallet','Financeiro'),('Package','Produtos'),('Tv','TV da loja')]
    nav = ''.join(f'<div class="nav {"on" if t==active else ""}">{ic(i)}{t}</div>' for i,t in items)
    return f'<div class="side"><div class="lg"><img src="assets/worqera-logo.png">Worqera</div>{nav}</div>'

def kanban_window(w=1180, h=760, url='app.worqera.com/kanban'):
    cols = [
        ('Recebido', 6, [kcard('0048','Marina','Limpeza e restauração','sex, 14/11','',(0,3)),
                         kcard('0051','Rafael','Troca de solado','seg, 17/11','',(1,)),
                         kcard('0052','Juliana','Higienização','ter, 18/11','',(4,0),pairs=2)]),
        ('Limpeza', 4, [kcard('0412','Ana','Limpeza premium','Atrasado 1d','r',(0,2),'late'),
                        kcard('0419','Bruno','Limpeza + impermeab.','Hoje','y',(3,))]),
        ('Costura', 3, [kcard('0405','Carla','Costura lateral','Hoje','y',(1,7)),
                        kcard('0409','Diego','Reforço de bico','qua, 19/11','',(2,))]),
        ('Pintura', 2, [kcard('0398','Fernanda','Pintura de entressola','Amanhã','',(6,0),'hot')]),
        ('Pronto', 5, [kcard('0377','Gustavo','Restauração','Avisado','g',(5,)),
                       kcard('0390','Helena','Limpeza','Avisado','g',(0,4),pairs=3)]),
    ]
    c = ''.join(f'<div class="col"><div class="ch">{t}<b>{n}</b></div>{"".join(cs)}</div>' for t,n,cs in cols)
    return f'''<div class="win" style="width:{w}px;height:{h}px">
<div class="wbar"><i></i><i></i><i></i><div class="url">{ic("ShieldCheck",13)}{url}</div></div>
<div class="app">{sidebar()}<div class="main">
<div class="mh"><h4>Kanban · hoje</h4><div class="chips"><span class="chp r">Atrasados <b>2</b></span><span class="chp y">Hoje <b>5</b></span><span class="chp">Amanhã <b>8</b></span><span class="chp v">{ic("Plus",13)}Novo pedido</span></div></div>
<div class="cols">{c}</div></div></div></div>'''

def phone(content, bg='#F7F7FB', dark=False, time='9:41'):
    col = '#fff' if dark else '#0F172A'
    return f'''<div class="ph"><div class="scr" style="background:{bg}"><div class="isl"></div>
<div class="stb" style="color:{col}"><span>{time}</span><span class="r">{ic("Signal")}{ic("Wifi")}{ic("BatteryFull")}</span></div>{content}</div></div>'''

def qr_svg(seed=7, n=25):
    import random
    r = random.Random(seed); cells = []
    def finder(x, y):
        return (f'<rect x="{x}" y="{y}" width="7" height="7" fill="#0F172A"/><rect x="{x+1}" y="{y+1}" width="5" height="5" fill="#fff"/>'
                f'<rect x="{x+2}" y="{y+2}" width="3" height="3" fill="#0F172A"/>')
    for yy in range(n):
        for xx in range(n):
            if (xx < 8 and yy < 8) or (xx > n-9 and yy < 8) or (xx < 8 and yy > n-9): continue
            if r.random() < .48: cells.append(f'<rect x="{xx}" y="{yy}" width="1" height="1" fill="#0F172A"/>')
    return f'<svg viewBox="0 0 {n} {n}" shape-rendering="crispEdges" style="width:100%;height:100%;display:block">{"".join(cells)}{finder(0,0)}{finder(n-7,0)}{finder(0,n-7)}</svg>'

def label(w=420, code='0048'):
    return f'''<div class="lab" style="width:{w}px;padding:34px 30px 26px">
<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700;font-size:17px;letter-spacing:.02em">SUA EMPRESA</span><span class="mono" style="font-size:13px;color:#64748B">12/11 · 08:10</span></div>
<div style="display:flex;gap:22px;margin-top:18px;align-items:center">
<div style="width:150px;height:150px;flex:none">{qr_svg()}</div>
<div><div class="mono" style="font-size:58px;font-weight:700;letter-spacing:-.04em;line-height:1">#{code}</div>
<div style="font-size:17px;font-weight:600;margin-top:10px">Marina · Tênis branco</div>
<div style="font-size:15px;color:#64748B;margin-top:4px">Limpeza e restauração</div>
<div style="display:inline-block;margin-top:12px;font-size:14px;font-weight:700;background:#0F172A;color:#fff;border-radius:6px;padding:5px 10px">Prazo sex, 14/11</div></div></div>
<div style="margin-top:20px;border-top:1px dashed #CBD5E1;padding-top:12px;font-size:13px;color:#64748B;display:flex;justify-content:space-between"><span>Acompanhe pelo QR</span><span class="mono">worqera.com/p/…/0048</span></div></div>'''

def wa_lock(notifs, time='14:20'):
    items = ''.join(f'''<div class="notif" style="margin-bottom:10px"><div class="wa">{ic("MessageCircle")}</div><div style="flex:1;min-width:0">
<div style="display:flex;justify-content:space-between"><b style="font-size:15px">{t}</b><span style="font-size:13px;color:#64748B">{when}</span></div>
<div style="font-size:15px;line-height:1.35;margin-top:3px;color:#1E293B">{m}</div></div></div>''' for t, m, when in notifs)
    return phone(f'''<div style="text-align:center;color:#fff;margin-top:26px"><div style="font-size:19px;font-weight:600;opacity:.85">sexta-feira, 14 de novembro</div>
<div style="font-size:100px;font-weight:700;letter-spacing:-.04em;line-height:1.05">{time}</div></div>
<div style="position:absolute;left:14px;right:14px;bottom:70px">{items}</div>
<div style="position:absolute;bottom:14px;left:50%;transform:translateX(-50%);width:130px;height:5px;border-radius:3px;background:rgba(255,255,255,.8)"></div>''',
        bg='radial-gradient(120% 70% at 20% 10%,#7C3AED 0%,#3B0764 45%,#0B0716 100%)', dark=True, time=time)

def app_queue():
    rows = [('0412','Ana','Limpeza premium','Atrasado 1d','r'),('0419','Bruno','Limpeza + impermeab.','Hoje','y'),('0427','Pedro','Limpeza','Amanhã',''),('0431','Lívia','Higienização','sáb, 15/11','')]
    r = ''.join(f'''<div style="background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
{thumbs(0 if k%2==0 else 3)}<div style="flex:1"><div class="mono" style="font-size:13px;color:#7C3AED;font-weight:600">#{c}</div><div style="font-weight:700;font-size:16px">{n}</div><div style="font-size:13px;color:#64748B">{s}</div></div>
<span class="due {cl}" style="font-size:12px">{d}</span></div>''' for k,(c,n,s,d,cl) in enumerate(rows))
    return phone(f'''<div style="padding:6px 18px">
<div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:13px;color:#64748B;font-weight:600">Setor</div><div style="font-size:26px;font-weight:800;letter-spacing:-.03em">Limpeza</div></div>
<div style="width:46px;height:46px;border-radius:14px;background:#7C3AED;color:#fff;display:flex;align-items:center;justify-content:center">{ic("ScanLine",24)}</div></div>
<div style="display:flex;gap:6px;margin:14px 0 14px"><span class="chp r">Atrasados <b>1</b></span><span class="chp y">Hoje <b>1</b></span><span class="chp">Fila <b>4</b></span></div>{r}</div>''')

def app_order():
    return phone(f'''<div style="padding:4px 18px">
<div style="display:flex;align-items:center;gap:8px;font-size:14px;color:#7C3AED;font-weight:600">{ic("ScanLine",18)}QR lido · pedido aberto</div>
<div style="background:#fff;border:1px solid #ECEAF3;border-radius:20px;padding:18px;margin-top:12px">
<div style="display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:30px;font-weight:700;letter-spacing:-.04em">#0048</span><span class="due y">Prazo sex</span></div>
<div style="font-weight:700;font-size:18px;margin-top:6px">Marina · Tênis branco</div><div style="font-size:14px;color:#64748B">Limpeza e restauração</div>
<div style="display:flex;gap:8px;margin-top:14px"><span style="flex:1;height:96px;border-radius:12px;background:{TH[0]}"></span><span style="flex:1;height:96px;border-radius:12px;background:{TH[3]}"></span><span style="flex:1;height:96px;border-radius:12px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;color:#94A3B8">{ic("Camera",26)}</span></div>
<div style="margin-top:16px;font-size:12px;font-weight:700;letter-spacing:.1em;color:#64748B">SETOR ATUAL</div>
<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="chp">Recebido</span>{ic("ChevronRight",16,"#94A3B8")}<span class="chp v">Limpeza</span>{ic("ChevronRight",16,"#94A3B8")}<span class="chp">Pronto</span></div></div>
<div style="margin-top:16px;background:linear-gradient(180deg,#A855F7,#7C3AED);color:#fff;border-radius:18px;padding:18px;text-align:center;font-weight:700;font-size:19px;box-shadow:0 14px 30px -10px rgba(124,58,237,.7)">Mover para Pronto</div>
<div style="margin-top:10px;background:#fff;border:1px solid #ECEAF3;border-radius:18px;padding:16px;text-align:center;font-weight:600;font-size:16px;color:#475569">Adicionar foto</div></div>''')

def dash_window(w=920, h=760):
    bars = [38,52,46,70,58,84,64,92,76,100,88,96]
    b = ''.join(f'<div class="bar" style="flex:1;height:{v}%;opacity:{.45+v/200}"></div>' for v in bars)
    return f'''<div class="win" style="width:{w}px;height:{h}px">
<div class="wbar"><i></i><i></i><i></i><div class="url">{ic("ShieldCheck",13)}app.worqera.com/financeiro</div></div>
<div style="padding:24px 26px;background:#FAFAFD;height:calc(100% - 44px)">
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">Financeiro · hoje</div><span class="chp v">Novembro</span></div>
<div style="display:flex;gap:14px;margin-top:18px">
{''.join(f'<div style="flex:1;background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:16px 18px"><div style="font-size:13px;font-weight:600;color:#64748B">{t}</div><div class="k" style="font-size:30px;margin-top:6px;color:{c}">{v}</div><div style="font-size:12px;color:{sc};margin-top:4px;font-weight:600">{s}</div></div>' for t,v,c,s,sc in [("Caixa do dia","R$ 3.480","#0F172A","+18% vs. sexta passada","#16A34A"),("A receber","R$ 1.260","#0F172A","9 pedidos","#64748B"),("Quem deve","4","#B91C1C","clientes com saldo","#B91C1C")])}
</div>
<div style="display:flex;gap:14px;margin-top:14px">
<div style="flex:1.5;background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:16px 18px"><div style="display:flex;justify-content:space-between"><span style="font-size:14px;font-weight:700">Entradas por dia</span><span class="mono" style="font-size:12px;color:#64748B">últimos 12 dias</span></div>
<div style="display:flex;gap:7px;align-items:flex-end;height:200px;margin-top:16px">{b}</div></div>
<div style="flex:1;background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:16px 18px">
<div style="font-size:14px;font-weight:700;margin-bottom:12px">Top serviços</div>
{''.join(f'<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>{n}</span><b class="mono">{p}%</b></div><div style="height:7px;border-radius:4px;background:#F1F5F9;margin-top:5px"><div style="height:100%;width:{p}%;border-radius:4px;background:#8B5CF6"></div></div></div>' for n,p in [("Limpeza",44),("Restauração",27),("Costura",17),("Pintura",12)])}
</div></div>
<div style="margin-top:14px;background:linear-gradient(90deg,#F5F3FF,#FDF4FF);border:1px solid #E9D5FF;border-radius:16px;padding:16px 18px;display:flex;gap:14px;align-items:center">
<div style="width:40px;height:40px;border-radius:12px;background:#7C3AED;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">{ic("Sparkles",22)}</div>
<div><div style="font-size:12px;font-weight:700;letter-spacing:.1em;color:#7C3AED">RESUMO DO DIA · IA</div><div style="font-size:16px;font-weight:600;margin-top:3px">Hoje: 12 prontos e 3 orçamentos para ligar. 2 pedidos vencem amanhã na Costura.</div></div></div>
</div></div>'''

def crm_card(w=520):
    return f'''<div class="win" style="width:{w}px;padding:24px 26px;border-radius:24px">
<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:700;letter-spacing:.1em;color:#64748B">ORÇAMENTO</span><span class="due y" style="font-size:13px">Ligar hoje</span></div>
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px"><span style="font-size:24px;font-weight:800;letter-spacing:-.02em">Rafael Souza</span><span class="k" style="font-size:26px;color:#7C3AED">R$ 240</span></div>
<div style="font-size:15px;color:#64748B;margin-top:2px">Restauração completa · 2 pares</div>
<div style="display:flex;gap:6px;margin-top:16px">{''.join(f'<span class="chp {"v" if s=="Retorno" else ""}" style="font-size:12px">{s}</span>' for s in ["Novo","Contato","Retorno","Recuperado"])}</div>
<div style="margin-top:16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:14px 16px;font-size:15px;line-height:1.4;color:#14532D">
<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#16A34A;margin-bottom:5px;display:flex;align-items:center;gap:6px">{ic("Sparkles",14)}MENSAGEM PRONTA</div>
Oi, Rafael! Seu orçamento da restauração ainda está de pé. Consigo encaixar esta semana. Bora?</div>
<div style="margin-top:14px;display:flex;gap:10px"><div style="flex:1;background:linear-gradient(180deg,#34D399,#16A34A);color:#fff;border-radius:14px;padding:14px;text-align:center;font-weight:700;font-size:16px">Enviar no WhatsApp</div>
<div style="background:#F1F5F9;border-radius:14px;padding:14px 18px;font-weight:600;font-size:16px;color:#475569">Remarcar</div></div></div>'''

def tv_mock(w=520, h=300):
    rows = [('0412','Limpeza','r'),('0405','Costura','y'),('0398','Pintura',''),('0390','Pronto','g')]
    r = ''.join(f'<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,.05);margin-bottom:7px"><span class="mono" style="font-size:22px;font-weight:700">#{c}</span><span class="due {cl}" style="font-size:14px">{s}</span></div>' for c,s,cl in rows)
    return f'''<div style="width:{w}px;background:#0E0C17;border-radius:18px;padding:12px;box-shadow:0 0 0 2px #2A2838,0 40px 80px -20px rgba(0,0,0,.9)">
<div style="background:#14111F;border-radius:10px;padding:16px;height:{h}px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;letter-spacing:.12em;color:#A78BFA;margin-bottom:10px"><span>TV DA OFICINA</span><span style="color:#4ADE80">● AO VIVO</span></div>{r}</div></div>'''

# ------------------------------------------------------------ helpers de layout
def feature_row(icon, title, desc):
    return f'''<div style="display:flex;gap:24px;align-items:flex-start"><div class="ib">{ic(icon)}</div>
<div><div style="font-size:32px;font-weight:700;letter-spacing:-.02em">{title}</div><div style="font-size:25px;line-height:1.4;color:#A9A6BF;margin-top:6px">{desc}</div></div></div>'''

def callout(x, y, text, icon='Check', color='#C4B5FD'):
    return f'''<div class="gl" style="position:absolute;left:{x}px;top:{y}px;padding:16px 22px;border-radius:18px;display:flex;align-items:center;gap:12px;font-size:23px;font-weight:600;white-space:nowrap;z-index:6;background:rgba(20,16,36,.82)">
<span style="width:34px;height:34px;border-radius:10px;background:rgba(167,139,250,.2);display:flex;align-items:center;justify-content:center;color:{color}">{ic(icon,20)}</span>{text}</div>'''

posts = {}
FADE = '<div style="position:absolute;left:-72px;right:-72px;bottom:-64px;height:280px;background:linear-gradient(180deg,rgba(7,6,14,0),#07060E 78%);z-index:5"></div>'
ILL = '<div class="mono" style="font-size:16px;color:rgba(255,255,255,.38);margin-top:12px">* valores ilustrativos</div>'

