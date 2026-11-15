"""Worqera · Instagram v3 — no padrão visual dos posts 1-3 (fundos alternados, fotos reais, números grandes)."""
import json, os, random
HERE = os.path.dirname(os.path.abspath(__file__))
I = json.load(open(os.path.join(HERE, 'icons.json')))
W, H = 1080, 1350

def ic(name, size=None, color=None):
    st = (f'width:{size}px;height:{size}px;' if size else '') + (f'color:{color};' if color else '')
    return f'<span class="ic" style="{st}">{I.get(name, "")}</span>'

CSS = r"""
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased;position:relative;overflow:hidden;background:#0F172A}
.ic{display:inline-flex;width:30px;height:30px;flex:none}.ic svg{width:100%;height:100%}
.mono{font-family:'JetBrains Mono',monospace}
.s{position:absolute;top:0;width:1080px;height:1350px;padding:70px 72px 72px;display:flex;flex-direction:column;overflow:hidden}
.light{background:#F3F4F8;color:#0F172A}
.white{background:#FFFFFF;color:#0F172A}
.navy{background:#0F172A url(assets/bg-navy-glow.png) center/cover;color:#fff}
.flat{background:#0F172A;color:#fff}
.purple{background:#9333EA url(assets/bg-purple.png) center/cover;color:#fff}
.photo{color:#fff;background-size:cover;background-position:center}
.photo:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,23,42,.35) 0%,rgba(15,23,42,.05) 30%,rgba(15,23,42,.55) 55%,rgba(15,23,42,.94) 100%)}
.s>*{position:relative;z-index:2}
.dim:before{background:linear-gradient(180deg,rgba(15,23,42,.82),rgba(15,23,42,.9))!important}
.brand{display:flex;align-items:center;gap:14px;font-weight:700;font-size:32px;letter-spacing:-.01em}
.brand img{width:50px;height:50px;border-radius:12px}
.cnt{position:absolute;right:72px;top:86px;font-family:'JetBrains Mono';font-size:20px;opacity:.45}
.eb{font-family:'IBM Plex Sans',sans-serif;font-weight:700;font-size:22px;letter-spacing:.34em;text-transform:uppercase;color:#7C3AED}
.navy .eb,.flat .eb,.photo .eb{color:#C99BFF}.purple .eb{color:#EBDCFF}
.h{font-weight:700;font-size:72px;line-height:1.1;letter-spacing:-.025em}
.h.xl{font-size:92px;line-height:1.04}.h.l{font-size:80px}
.hl{color:#9333EA}.navy .hl,.flat .hl,.photo .hl{color:#C99BFF}.purple .hl{color:#F5D0FE}
.p{font-size:30px;line-height:1.42;color:#475569}
.navy .p,.flat .p,.photo .p{color:#CBD5E1}.purple .p{color:#F1E7FF}
.p b{color:#0F172A;font-weight:600}.navy .p b,.flat .p b,.photo .p b,.purple .p b{color:#fff}
.arrow{position:absolute;right:72px;bottom:68px;width:46px;height:46px;color:#7C3AED;z-index:3}
.navy .arrow,.flat .arrow,.photo .arrow,.purple .arrow{color:#fff}
.arrow svg{width:46px;height:46px}
.card{background:#fff;border:1px solid #E5E7EB;border-radius:22px;color:#0F172A}
.dcard{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:22px}
.pcard{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.24);border-radius:22px}
.bub{width:84px;height:84px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none}
.bub .ic{width:38px;height:38px}
.b-red{background:#FDECEF;color:#E11D48}.b-vio{background:#F3E8FF;color:#7C3AED}.b-grn{background:#DCFCE7;color:#16A34A}
.navy .b-vio,.flat .b-vio{background:rgba(201,155,255,.16);color:#D8B4FE}
.big{font-weight:800;letter-spacing:-.045em;line-height:.95}
.rule{height:1px;background:rgba(255,255,255,.14)}.light .rule,.white .rule{background:#E2E8F0}
.sp{flex:1}
.btn{display:inline-flex;align-items:center;gap:16px;background:#fff;color:#6D28D9;font-weight:800;font-size:38px;padding:30px 46px;border-radius:18px;letter-spacing:-.01em}
.btn.v{background:#7C3AED;color:#fff}
.btn .ic{width:38px;height:38px}
.small{font-family:'IBM Plex Sans';font-weight:700;font-size:20px;letter-spacing:.3em;text-transform:uppercase;opacity:.75}
.tagp{display:inline-flex;align-items:center;font-size:21px;font-weight:700;padding:10px 20px;border-radius:999px}
.k-col{background:#F1F5F9;border-radius:16px;padding:16px;flex:1}
.k-h{font-family:'IBM Plex Sans';font-weight:700;font-size:17px;letter-spacing:.14em;color:#64748B;margin-bottom:14px}
.k-c{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px;margin-bottom:12px}
.k-n{font-family:'JetBrains Mono';font-size:16px;color:#64748B}
.k-t{font-weight:700;font-size:22px;margin:4px 0 2px}
.k-s{font-size:17px;color:#64748B}
.k-c.p{border:2px solid #9333EA}.k-c.p .k-s{color:#9333EA}
.k-c.o{border:2px solid #F59E0B}.k-c.o .k-s{color:#D97706}
.k-c.r{border:2px solid #EF4444}.k-c.r .k-s{color:#DC2626}
.k-c.g{border:2px solid #14B8A6}.k-c.g .k-s{color:#0D9488}
.live{display:flex;align-items:center;gap:10px;font-family:'IBM Plex Sans';font-weight:700;font-size:18px;letter-spacing:.3em;color:#0D9488;margin-bottom:20px}
.live i{width:12px;height:12px;border-radius:50%;background:#14B8A6}
.ph{width:400px;border-radius:56px;background:#0F172A;padding:14px;box-shadow:0 40px 80px -30px rgba(15,23,42,.6)}
.ph .scr{border-radius:44px;background:#fff;overflow:hidden;color:#0F172A;padding:30px 26px}
.notif{background:#fff;border-radius:22px;padding:18px 20px;display:flex;gap:14px;color:#0F172A;box-shadow:0 20px 50px -20px rgba(15,23,42,.45)}
.wa{width:48px;height:48px;border-radius:13px;background:#22C55E;display:flex;align-items:center;justify-content:center;color:#fff;flex:none}
.wa .ic{width:26px;height:26px}
.stat{display:flex;align-items:baseline;gap:18px}
.fill svg{fill:currentColor}
"""
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Sans:wght@700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">'

def Z(h, z=1.25): return f'<div style="zoom:{z}">{h}</div>'
def gap(px): return f'<div style="height:{px}px;flex:none"></div>'
def eb(t): return f'<div class="eb">{t}</div>'

def slide(i, n, theme, body, arrow=True, bg=None):
    extra = f' style="left:{i*W}px;background-image:url(assets/{bg})"' if bg else f' style="left:{i*W}px"'
    a = f'<div class="arrow">{I["ArrowRight"]}</div>' if arrow else ''
    return (f'<div class="s {theme}"{extra}><div class="brand"><img src="assets/worqera-logo.png">Worqera</div>'
            f'<div class="cnt">{i+1:02d}/{n:02d}</div>{body}{a}</div>')

def doc(n, slides):
    return (f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>{CSS}html,body{{width:{n*W}px;height:{H}px}}</style></head>'
            f'<body>{"".join(slides)}</body></html>')

# ------------------------------------------------------------ componentes
def prob(icon, text, cls='b-red', sub=None):
    s = f'<div style="font-size:23px;color:#64748B;margin-top:4px">{sub}</div>' if sub else ''
    return (f'<div class="card" style="display:flex;align-items:center;gap:30px;padding:34px 34px;margin-bottom:22px">'
            f'<div class="bub {cls}">{ic(icon)}</div><div><div style="font-size:34px;font-weight:500;line-height:1.3">{text}</div>{s}</div></div>')

def tile(icon, t, d, cls='pcard'):
    return (f'<div class="{cls}" style="padding:26px 26px 24px">{ic(icon, 40)}<div style="font-size:31px;font-weight:700;margin-top:14px;letter-spacing:-.01em">{t}</div>'
            f'<div style="font-size:21px;line-height:1.35;margin-top:6px;opacity:.85">{d}</div></div>')

def kc(code, t, s, cls=''):
    return f'<div class="k-c {cls}"><div class="k-n">#{code}</div><div class="k-t">{t}</div><div class="k-s">{s}</div></div>'

def kanban():
    return f'''<div class="card" style="padding:28px">
<div class="live"><i></i>OPERAÇÃO AO VIVO</div>
<div style="display:flex;gap:14px">
<div class="k-col"><div class="k-h">RECEBIDO</div>{kc('0412','Limpeza','Prazo 5 dias')}{kc('0419','Troca de sola','Prazo 7 dias')}{kc('0423','Higienização','Prazo 3 dias')}</div>
<div class="k-col"><div class="k-h">PRODUÇÃO</div>{kc('0398','Pintura','Setor Pintura','p')}{kc('0405','Costura','Atrasado 1 dia','r')}{kc('0409','Reforço','Vence hoje','o')}</div>
<div class="k-col"><div class="k-h" style="color:#0D9488">PRONTO</div>{kc('0377','Restauração','Cliente avisado','g')}{kc('0390','Limpeza','Cliente avisado','g')}</div>
</div></div>'''

def qr_svg(seed=7, n=25):
    r = random.Random(seed); cells = []
    def finder(x, y):
        return (f'<rect x="{x}" y="{y}" width="7" height="7" fill="#0F172A"/><rect x="{x+1}" y="{y+1}" width="5" height="5" fill="#fff"/>'
                f'<rect x="{x+2}" y="{y+2}" width="3" height="3" fill="#0F172A"/>')
    for yy in range(n):
        for xx in range(n):
            if (xx < 8 and yy < 8) or (xx > n-9 and yy < 8) or (xx < 8 and yy > n-9): continue
            if r.random() < .48: cells.append(f'<rect x="{xx}" y="{yy}" width="1" height="1" fill="#0F172A"/>')
    return f'<svg viewBox="0 0 {n} {n}" shape-rendering="crispEdges" style="width:100%;height:100%;display:block">{"".join(cells)}{finder(0,0)}{finder(n-7,0)}{finder(0,n-7)}</svg>'

def label(w=560):
    return f'''<div class="card" style="width:{w}px;padding:30px 32px;box-shadow:0 30px 60px -30px rgba(15,23,42,.5)">
<div style="display:flex;justify-content:space-between;font-size:19px"><b style="letter-spacing:.06em">SUA EMPRESA</b><span class="mono" style="color:#64748B">12/11 · 08:10</span></div>
<div style="display:flex;gap:26px;margin-top:20px;align-items:center"><div style="width:190px;height:190px;flex:none">{qr_svg()}</div>
<div><div class="mono" style="font-size:66px;font-weight:700;letter-spacing:-.04em;line-height:1">#0048</div>
<div style="font-size:22px;font-weight:600;margin-top:12px">Marina · Tênis branco</div><div style="font-size:19px;color:#64748B;margin-top:4px">Limpeza e restauração</div>
<div style="display:inline-block;margin-top:14px;font-size:18px;font-weight:700;background:#0F172A;color:#fff;border-radius:8px;padding:7px 12px">Prazo sex, 14/11</div></div></div></div>'''

def tracking():
    steps = [('Recebido', 'done'), ('Produção', 'done'), ('Pronto para retirar', 'now'), ('Entregue', 'next')]
    rows = ''
    for t, st in steps:
        if st == 'done': d = f'<span style="width:32px;height:32px;border-radius:50%;background:#16A34A;color:#fff;display:flex;align-items:center;justify-content:center">{ic("Check",18)}</span>'
        elif st == 'now': d = f'<span style="width:32px;height:32px;border-radius:50%;background:#7C3AED;color:#fff;display:flex;align-items:center;justify-content:center">{ic("Check",18)}</span>'
        else: d = '<span style="width:32px;height:32px;border-radius:50%;border:2px solid #CBD5E1"></span>'
        c = '#7C3AED' if st == 'now' else ('#94A3B8' if st == 'next' else '#0F172A')
        rows += f'<div style="display:flex;align-items:center;gap:16px;margin-top:16px">{d}<span style="font-size:22px;font-weight:{700 if st=="now" else 500};color:{c}">{t}</span></div>'
    return f'''<div class="ph"><div class="scr">
<div style="font-size:17px;font-weight:700;color:#7C3AED">Worqera · Consulta</div>
<div style="font-size:36px;font-weight:800;margin-top:10px;letter-spacing:-.02em">Pedido 0048</div>
<div style="font-size:19px;color:#64748B">Limpeza e restauração</div>{rows}
<div class="fill" style="margin-top:26px;display:flex;gap:6px;color:#F59E0B">{''.join(ic("Star",34) for _ in range(5))}</div>
<div style="margin-top:18px;background:#7C3AED;color:#fff;border-radius:14px;padding:16px;text-align:center;font-weight:700;font-size:19px">Avaliar atendimento</div></div></div>'''

def notif(msg, when='agora', who='Sua empresa', w=560):
    return (f'<div class="notif" style="width:{w}px"><div class="wa">{ic("MessageCircle")}</div><div style="flex:1">'
            f'<div style="display:flex;justify-content:space-between"><b style="font-size:21px">{who}</b><span style="font-size:18px;color:#64748B">{when}</span></div>'
            f'<div style="font-size:21px;line-height:1.35;margin-top:4px;color:#1E293B">{msg}</div></div></div>')

def crm_list():
    rows = [('Marina', 'R$ 380', 'Preço', '#FEF3C7', '#92400E', 'Ligar hoje', '#DC2626'), ('Paulo', 'R$ 220', 'Vai pensar', '#EDE9FE', '#6D28D9', 'Hoje', '#475569'),
            ('Júlia', 'R$ 150', 'Prazo', '#FEF3C7', '#92400E', '2º contato', '#475569'), ('Rafael', 'R$ 640', 'Recuperado', '#DCFCE7', '#166534', 'Fechou', '#16A34A')]
    r = ''.join(f'<div style="display:flex;align-items:center;padding:18px 0;border-top:1px solid #F1F5F9;font-size:23px"><b style="width:250px">{n} · <span class="mono" style="font-weight:700">{v}</span></b>'
                f'<span style="background:{bg};color:{fg};font-weight:700;font-size:18px;border-radius:999px;padding:7px 16px;width:170px;text-align:center">{t}</span>'
                f'<span style="flex:1;text-align:right;color:{c};font-size:20px;font-weight:600">{d}</span></div>' for n, v, t, bg, fg, d, c in rows)
    return f'''<div class="card" style="padding:28px 32px 14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:28px">Ligar hoje</b><span style="font-size:20px;color:#64748B">4 retornos</span></div>{r}</div>'''

def ai_card(title='Resumo do dia', nums=(('4', 'prontos para avisar', '#16A34A'), ('3', 'para ligar hoje', '#7C3AED'), ('2', 'atrasados', '#DC2626')), sug='Ligue primeiro para a Marina.'):
    n = ''.join(f'<div style="flex:1;background:#F8FAFC;border:1px solid #EEF2F7;border-radius:16px;padding:20px 18px"><div class="big" style="font-size:64px;color:{c}">{v}</div><div style="font-size:19px;color:#64748B;margin-top:8px">{t}</div></div>' for v, t, c in nums)
    return f'''<div class="card" style="padding:30px 32px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:28px">{title}</b><span class="tagp" style="background:#F3E8FF;color:#7C3AED;font-size:18px;padding:6px 14px">IA</span></div>
<div style="display:flex;gap:14px;margin-top:22px">{n}</div>
<div style="margin-top:22px;font-size:22px"><b style="color:#7C3AED;letter-spacing:.06em;font-size:18px">SUGESTÃO</b>&nbsp; {sug}</div></div>'''

def money_rows(items, theme='dark', size=110):
    out = ''
    for k, (v, t, c) in enumerate(items):
        if k: out += '<div class="rule" style="margin:26px 0"></div>'
        out += f'<div><div class="big" style="font-size:{size}px;color:{c}">{v}</div><div class="p" style="margin-top:12px;font-size:29px">{t}</div></div>'
    return out

def cta(i, n, theme, head, sub, bg=None, keyword='QUERO'):
    return slide(i, n, theme, f'''<div class="sp"></div>{eb('Comece agora')}{gap(26)}
<div class="h xl">{head}</div>{gap(28)}<div class="p" style="max-width:860px">{sub}</div>{gap(46)}
<div><span class="btn">Comente “{keyword}” {ic("ArrowRight")}</span></div>{gap(30)}
<div class="small">ou chame no direct · link na bio</div>{gap(16)}''', arrow=False, bg=bg)

posts = {}

# ======================================================== 1 · PRINCIPAL
N = 9; S = []
S.append(slide(0, N, 'photo', f'''<div class="sp"></div>{eb('Para quem trabalha com pedidos')}{gap(24)}
<div class="h xl"><span class="hl">R$ 1 milhão</span> em pedidos já passaram pela Worqera.</div>{gap(26)}
<div class="p" style="max-width:840px">Sua loja pode ser a próxima a parar de perder pedido, cliente e dinheiro.</div>{gap(40)}''', bg='maos-limpando-tenis.jpg'))
S.append(slide(1, N, 'light', f'''{gap(60)}{eb('Parece familiar?')}{gap(22)}
<div class="h">Quanto o improviso custa na sua loja?</div>{gap(46)}
{prob('ClipboardCheck', 'Pedido anotado no caderno.')}
{prob('PhoneCall', 'Cliente ligando: “já ficou pronto?”')}
{prob('Archive', 'Orçamento que ninguém retoma.')}
{prob('Wallet', 'Caixa que só fecha no fim do mês.')}
<div class="sp"></div><div style="font-size:34px;font-weight:700;color:#7C3AED;padding-bottom:8px">Tem um jeito melhor.</div>'''))
tiles = [('Inbox', 'Pedidos', 'Código, fotos e prazo'), ('Layers', 'Setores', 'Cada um na sua fila'), ('QrCode', 'QR Code', 'Escaneou, moveu'),
         ('Eye', 'Acompanhamento', 'O cliente vê sozinho'), ('Wallet', 'Financeiro', 'Caixa e quem deve'), ('LayoutDashboard', 'Dashboard', 'Atrasos e produção'),
         ('Target', 'CRM', 'Orçamento vira venda'), ('Sparkles', 'IA', 'Diz o que fazer hoje')]
S.append(slide(2, N, 'purple', f'''{gap(60)}{eb('A solução')}{gap(22)}
<div class="h">Tudo da sua loja num sistema só</div>{gap(44)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">{''.join(tile(*t) for t in tiles)}</div>'''))
S.append(slide(3, N, 'light', f'''{gap(60)}{eb('Para a sua equipe')}{gap(22)}
<div class="h">Cada setor vê só a sua fila</div>{gap(24)}
<div class="p">O atraso aparece <b>antes</b> do cliente reclamar. Cada pedido sai com etiqueta e QR: escaneou, moveu.</div>{gap(44)}{Z(kanban())}'''))
S.append(slide(4, N, 'navy', f'''{gap(60)}{eb('Para o seu cliente')}{gap(22)}
<div class="h">O telefone para de tocar</div>{gap(24)}
<div class="p" style="max-width:520px">Pelo QR da etiqueta ele acompanha cada etapa, recebe o aviso no pronto e <b>avalia em 1 toque</b>.</div>
<div style="position:absolute;right:50px;top:400px;zoom:1.3">{tracking()}</div>
<div style="position:absolute;left:72px;top:640px;zoom:1.2">{notif('Seu pedido #0048 ficou pronto! ✅', w=360)}</div>'''))
S.append(slide(5, N, 'light', f'''{gap(60)}{eb('Para as suas vendas')}{gap(22)}
<div class="h">Orçamento perdido vira venda</div>{gap(24)}
<div class="p">Quem não fechou entra numa lista com o motivo, o dia certo de ligar e a mensagem pronta.</div>{gap(40)}{Z(crm_list(), 1.2)}
<div class="sp"></div><div style="display:flex;align-items:center;gap:20px;background:#7C3AED;color:#fff;border-radius:20px;padding:26px 30px;margin-bottom:70px">{ic("TrendingUp",40)}<span style="font-size:29px;font-weight:700">1 orçamento recuperado no mês já paga o plano.</span></div>'''))
S.append(slide(6, N, 'purple', f'''{gap(60)}{eb('Para você, dono')}{gap(22)}
<div class="h">A IA resume o seu dia e mostra por onde começar</div>{gap(44)}{Z(ai_card(), 1.22)}{gap(20)}
<div style="display:flex;gap:16px">{''.join(f'<div class="pcard" style="flex:1;padding:30px 30px"><div style="font-size:23px;opacity:.85">{t}</div><div class="big mono" style="font-size:58px;margin-top:10px;letter-spacing:-.03em">{v}</div></div>' for t, v in [('Caixa do dia', 'R$ 3.480'), ('A receber', 'R$ 1.260')])}</div>
<div class="sp"></div><div style="font-size:19px;opacity:.6;padding-bottom:10px">valores ilustrativos</div>'''))
S.append(slide(7, N, 'navy', f'''{gap(60)}{eb('Prova real')}{gap(22)}
<div class="h">Não é promessa. É número.</div>{gap(40)}<div class="rule"></div>{gap(36)}
{money_rows([('R$ 1 mi+', 'em pedidos criados direto na Worqera', '#C99BFF'), ('1.000+', 'pedidos lançados na plataforma', '#fff'), ('7.000+', 'pedidos do histórico importado', '#fff')])}
<div class="sp"></div><div class="small" style="opacity:.9;margin-bottom:22px">Quem já usa</div>
<div style="display:flex;gap:26px;padding-bottom:6px"><img src="assets/logo-cdt.png" style="width:120px;height:120px;border-radius:50%"><img src="assets/logo-sp.png" style="width:120px;height:120px;border-radius:50%"></div>'''))
S.append(cta(8, N, 'photo', 'Sua loja nesse nível? <span class="hl">Bora.</span>',
             'Teste grátis por 7 dias, sem cartão. Implantação completa em até 12x, com a gente do seu lado.', bg='dona-tablet.jpg'))
posts['1 - Principal - Servicos'] = (N, S)

# ======================================================== 2 · CRM + IA
N = 7; S = []
S.append(slide(0, N, 'purple', f'''<div class="sp"></div>{eb('CRM + Inteligência artificial')}{gap(24)}
<div class="h xl">Quanto dinheiro está parado nos seus orçamentos?</div>{gap(28)}
<div class="p" style="max-width:860px">A maioria das lojas nunca liga de volta para quem não fechou. A Worqera liga o alerta pra você.</div>{gap(60)}'''))
S.append(slide(1, N, 'light', f'''{gap(60)}{eb('Orçamentos')}{gap(22)}
<div class="h">Orçamento recusado não é venda perdida</div>{gap(24)}
<div class="p">Motivo da recusa, dia certo de ligar e mensagem pronta no WhatsApp.</div>{gap(40)}{Z(crm_list(), 1.2)}{gap(20)}
<div class="card" style="padding:22px 28px;background:#7C3AED;border:none;color:#fff;font-size:28px;line-height:1.4"><b>IA</b> · “Oi, Marina! Conseguimos uma condição melhor para você.”</div>'''))
segs = [('37', 'clientes inativos há 90 dias', '#C99BFF'), ('4', 'clientes com saldo em aberto', '#fff'), ('2', 'aniversariantes hoje', '#fff')]
S.append(slide(2, N, 'navy', f'''{gap(60)}{eb('Clientes')}{gap(22)}
<div class="h">Cliente sumido vira venda de novo</div>{gap(40)}<div class="rule"></div>{gap(36)}
{money_rows(segs, size=124)}<div class="sp"></div>{notif('Oi, Rafael! Faz uns 3 meses que você não aparece, sentimos sua falta!', w=936)}{gap(70)}'''))
S.append(slide(3, N, 'white', f'''{gap(60)}{eb('IA · toda manhã')}{gap(22)}
<div class="h">Chegou na loja, já sabe o que fazer</div>{gap(24)}
<div class="p">O dono vê dinheiro e prioridades. Cada setor vê só o que é dele.</div>{gap(44)}
{Z(ai_card(nums=(('12', 'prontos para avisar', '#16A34A'), ('3', 'orçamentos para ligar', '#7C3AED'), ('2', 'atrasados', '#DC2626')), sug='Comece pelos 2 atrasados da Limpeza.'), 1.25)}
<div class="sp"></div><div style="font-size:19px;color:#94A3B8;padding-bottom:10px">valores ilustrativos</div>'''))
wk = [('38', 'pedidos entregues'), ('R$ 9.840', 'faturados na semana'), ('94%', 'no prazo'), ('Preço', 'motivo nº 1 de perda')]
S.append(slide(4, N, 'purple', f'''{gap(60)}{eb('IA · toda semana')}{gap(22)}
<div class="h">Descubra onde você ganha e onde perde dinheiro</div>{gap(44)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">{''.join(f'<div class="pcard" style="padding:40px 32px"><div class="big" style="font-size:80px">{v}</div><div style="font-size:26px;margin-top:12px;opacity:.88">{t}</div></div>' for v, t in wk)}</div>{gap(20)}
<div class="card" style="padding:30px 32px;font-size:28px;line-height:1.4"><b style="color:#7C3AED">Sugestão da IA:</b> reforçar a Costura na terça e ligar hoje para os 3 orçamentos em retorno.</div>
<div class="sp"></div><div style="font-size:19px;opacity:.6;padding-bottom:10px">valores ilustrativos</div>'''))
S.append(slide(5, N, 'light', f'''{gap(60)}{eb('Cobrança')}{gap(22)}
<div class="h">Receba o que te devem</div>{gap(24)}
<div class="p">Quem deve, quanto e desde quando. A mensagem de cobrança sai pronta e educada.</div>{gap(40)}
<div class="card" style="padding:30px 32px"><div class="eb" style="font-size:18px">A receber</div><div class="big mono" style="font-size:84px;margin-top:12px;letter-spacing:-.04em">R$ 1.260</div>
<div style="margin-top:18px">{''.join(f'<div style="display:flex;justify-content:space-between;padding:16px 0;border-top:1px solid #F1F5F9;font-size:23px"><span>{a}</span><b class="mono" style="color:{c}">{b}</b></div>' for a, b, c in [('Helena · pronto há 2 dias', 'R$ 80', '#D97706'), ('Rafael · entregue há 12 dias', 'R$ 240', '#DC2626'), ('Paula · em produção', 'R$ 150', '#475569')])}</div></div>{gap(24)}
{notif('Oi, Helena! Seu pedido está pronto. Fica um saldo de R$ 80,00, pode acertar na retirada ou por Pix.', w=936)}'''))
S.append(cta(6, N, 'navy', 'Menos achismo. <span class="hl">Mais decisão.</span>',
             'CRM e IA no mesmo sistema que roda a sua fila. Um orçamento recuperado no mês já paga o plano.'))
posts['3 - CRM e IA'] = (N, S)

# ======================================================== 3 · NÚMEROS
N = 6; S = []
S.append(slide(0, N, 'navy', f'''<div class="sp"></div>{eb('Números reais')}{gap(30)}
<div class="big" style="font-size:210px;color:#C99BFF">R$ 1 mi+</div>{gap(30)}
<div class="h">em pedidos criados direto na Worqera.</div>{gap(24)}
<div class="p">E isso sem contar o histórico importado.</div>{gap(60)}'''))
S.append(slide(1, N, 'light', f'''{gap(60)}{eb('Operação de verdade')}{gap(22)}
<div class="h">Não é demo. É loja cheia.</div>{gap(40)}<div class="rule"></div>{gap(36)}
{money_rows([('1.000+', 'pedidos lançados na plataforma', '#7C3AED'), ('700+', 'pedidos por mês', '#0F172A'), ('6.000+', 'clientes na base', '#0F172A')], size=150)}'''))
S.append(slide(2, N, 'purple', f'''{gap(60)}{eb('Sem risco')}{gap(22)}
<div class="h">Troque de sistema sem perder nada</div>{gap(24)}
<div class="p">A implantação traz seus clientes e pedidos antigos. Você começa no dia 1 com tudo lá.</div>{gap(50)}
<div class="pcard" style="padding:36px 34px"><div class="big" style="font-size:120px">7.000+</div><div style="font-size:27px;margin-top:12px;opacity:.9">pedidos importados do sistema antigo</div></div>{gap(18)}
<div class="pcard" style="padding:36px 34px"><div class="big" style="font-size:120px">6.000+</div><div style="font-size:27px;margin-top:12px;opacity:.9">clientes com histórico completo</div></div>'''))
def quote(img, q, who, role):
    return (f'<div class="card" style="padding:42px 40px;margin-bottom:24px"><div class="fill" style="display:flex;gap:6px;color:#F59E0B">{"".join(ic("Star", 34) for _ in range(5))}</div>'
            f'<div style="font-size:38px;font-weight:600;line-height:1.3;margin-top:16px;letter-spacing:-.01em">“{q}”</div>'
            f'<div style="display:flex;align-items:center;gap:16px;margin-top:22px"><img src="assets/{img}" style="width:70px;height:70px;border-radius:50%">'
            f'<div><div style="font-size:23px;font-weight:700">{who}</div><div style="font-size:19px;color:#64748B">{role}</div></div></div></div>')
S.append(slide(3, N, 'light', f'''{gap(60)}{eb('Quem já usa')}{gap(22)}
<div class="h">Donos de loja falando por nós</div>{gap(40)}
{quote('logo-cdt.png', 'O que revolucionou não foi a tela — foi o setor. Cada um vê a própria fila.', 'Junior Ribeiro', 'Sócio · Casa do Tênis')}
{quote('logo-sp.png', 'Hoje tem código, setor e prazo. A equipe produz mais porque não perde tempo procurando.', 'Thiago Landes', 'Sócio · Sapataria Paulista')}'''))
S.append(slide(4, N, 'photo', f'''<div class="sp"></div>{eb('De onde veio')}{gap(24)}
<div class="h xl">Nasceu dentro da operação. <span class="hl">Não numa sala de reunião.</span></div>{gap(26)}
<div class="p" style="max-width:880px">Foi criada no meio da produção, com fila de verdade. Cada recurso existe porque alguém precisou dele numa segunda-feira cheia.</div>{gap(40)}''', bg='oficina-costura.jpg'))
S.append(cta(5, N, 'photo', 'A próxima loja pode ser a sua.', 'Sapataria, lavanderia, assistência, ateliê. Teste grátis por 7 dias com pedido real. Sem cartão.', bg='tecnico-celular.jpg'))
posts['4 - Numeros reais'] = (N, S)

# ======================================================== 4 · 5 SINAIS
N = 7; S = []
S.append(slide(0, N, 'photo', f'''<div class="sp"></div>{eb('Checklist · salve este post')}{gap(24)}
<div class="h xl"><span class="hl">5 sinais</span> de que sua loja está perdendo dinheiro</div>{gap(26)}
<div class="p">Quantos você reconhece? Conta no final.</div>{gap(40)}''', bg='bancada-sapataria.jpg'))
sinais = [('Ninguém sabe dizer, agora, quantos pedidos estão atrasados.', 'Atrasados, vence hoje e vence amanhã no topo do kanban.', 'AlertTriangle', 'light'),
          ('O telefone toca o dia todo com “já ficou pronto?”', 'O cliente acompanha pelo QR e recebe o aviso no pronto.', 'PhoneCall', 'navy'),
          ('Tem pedido pronto esquecido na prateleira.', 'Prateleira com “parado há 3+ dias” e botão de avisar.', 'Archive', 'light'),
          ('Orçamento recusado nunca mais é retomado.', 'CRM com dia de retorno e mensagem pronta.', 'RefreshCw', 'purple'),
          ('O caixa só fecha na planilha de domingo.', 'Caixa do dia, a receber e quem deve, na hora.', 'FileSpreadsheet', 'white')]
for k, (pb, sol, icn, th) in enumerate(sinais):
    dark = th in ('navy', 'purple')
    numc = '#C99BFF' if th == 'navy' else ('#F5D0FE' if th == 'purple' else '#9333EA')
    box = 'pcard' if th == 'purple' else ('dcard' if th == 'navy' else 'card')
    S.append(slide(k+1, N, th, f'''{gap(50)}<div class="big" style="font-size:260px;color:{numc}">0{k+1}</div><div class="sp"></div>
<div class="h" style="font-size:86px;line-height:1.08">{pb}</div>{gap(50)}
<div class="{box}" style="padding:38px 38px;margin-bottom:90px;display:flex;gap:28px;align-items:center">
<div class="bub b-grn" style="{'background:rgba(255,255,255,.18);color:#fff' if dark else ''}">{ic('Check')}</div>
<div><div class="eb" style="font-size:18px;{'color:#fff;opacity:.8' if dark else ''}">Com a Worqera</div><div style="font-size:34px;font-weight:600;line-height:1.35;margin-top:8px">{sol}</div></div></div>'''))
chk = ''.join(f'<div style="display:flex;gap:22px;align-items:center;padding:27px 0;border-bottom:1px solid rgba(255,255,255,.2)"><span style="width:44px;height:44px;border-radius:10px;border:3px solid #fff;flex:none"></span><span style="font-size:31px;font-weight:500;line-height:1.3">{p}</span></div>' for p, _, _, _ in sinais)
S.append(slide(6, N, 'purple', f'''{gap(50)}<div class="h">Reconheceu 2 ou mais? Está na hora.</div>{gap(24)}{chk}<div class="sp"></div>
<div><span class="btn">Comente “QUERO” {ic("ArrowRight")}</span></div>{gap(26)}<div class="small">ou chame no direct · link na bio</div>{gap(16)}''', arrow=False))
posts['5 - 5 sinais'] = (N, S)

# ======================================================== 5 · UM DIA NA LOJA
N = 7; S = []
def hour(t): return f'<div class="big mono" style="font-size:120px;letter-spacing:-.05em">{t}</div>'
S.append(slide(0, N, 'navy', f'''<div class="sp"></div>{eb('08h → 18h')}{gap(24)}
<div class="h xl">Um dia inteiro sem ninguém perguntar <span class="hl">“cadê o pedido?”</span></div>{gap(26)}
<div class="p">Arraste e veja como fica a sua loja com a Worqera.</div>{gap(60)}'''))
S.append(slide(1, N, 'light', f'''{gap(40)}<div style="color:#7C3AED">{hour('08:10')}</div>{gap(16)}
<div class="h">O pedido entra. A etiqueta sai.</div>{gap(22)}<div class="p">Cliente, fotos e prazo numa tela só. O QR vai junto com o item.</div>
<div class="sp"></div><div style="display:flex;justify-content:center;padding-bottom:110px;zoom:1.3">{label(700)}</div>'''))
S.append(slide(2, N, 'white', f'''{gap(40)}<div style="color:#7C3AED">{hour('10:30')}</div>{gap(16)}
<div class="h">Cada setor puxa o que é dele.</div>{gap(22)}<div class="p">O atraso aparece antes do cliente reclamar.</div>{gap(40)}{Z(kanban())}'''))
S.append(slide(3, N, 'purple', f'''{gap(40)}{hour('14:20')}{gap(16)}
<div class="h">Ficou pronto. O cliente já sabe.</div>{gap(22)}<div class="p">O aviso sai na hora e ele confere tudo pelo link.</div>
<div class="sp"></div>{Z(notif('Seu pedido #0048 ficou pronto! Pode retirar quando quiser. ✅', w=720), 1.3)}{gap(22)}
<div class="pcard" style="padding:28px 32px;font-size:34px;font-weight:600;align-self:flex-end">“Oba! Passo aí às 18h” · Marina</div>{gap(80)}'''))
S.append(slide(4, N, 'light', f'''{gap(40)}<div style="color:#7C3AED">{hour('16:00')}</div>{gap(16)}
<div class="h">O orçamento vira dinheiro.</div>{gap(22)}<div class="p">Quem não fechou ganha dia pra ligar e mensagem pronta.</div>{gap(40)}{Z(crm_list(), 1.2)}'''))
S.append(slide(5, N, 'photo dim', f'''{gap(40)}<div style="color:#C99BFF">{hour('18:00')}</div>{gap(16)}
<div class="h">O dono fecha o dia sem planilha.</div>{gap(40)}<div class="rule"></div>{gap(36)}
{money_rows([('R$ 3.480', 'no caixa hoje', '#fff'), ('R$ 1.260', 'a receber, em 9 pedidos', '#C99BFF')], size=150)}
<div class="sp"></div><div style="font-size:19px;opacity:.55;padding-bottom:10px">valores ilustrativos</div>''', bg='balcao-noite.jpg'))
S.append(cta(6, N, 'photo', 'Menos telefone. <span class="hl">Mais pedido entregue.</span>', 'Teste grátis por 7 dias. Implantação completa em até 12x.', bg='lavanderia.jpg'))
posts['6 - Um dia na loja'] = (N, S)

# ======================================================== OUSADO · DEMITA O CADERNO
N = 6; S = []
S.append(slide(0, N, 'purple', f"""<div class="sp"></div><div class="eb">Comunicado oficial</div>{gap(30)}
<div class="big" style="font-size:168px;line-height:.92;letter-spacing:-.06em">DEMITA O<br>CADERNO.</div>{gap(40)}
<div class="p" style="font-size:34px;max-width:860px">Ele perdeu pedido, esqueceu cliente e nunca soube quanto entrou. <b>Já passou da hora.</b></div>{gap(60)}"""))
letter = """<div style="background:#FFFDF7;border-radius:6px;padding:66px 60px 70px;color:#1E293B;box-shadow:0 40px 80px -30px rgba(15,23,42,.35);position:relative;transform:rotate(-1.2deg)">
<div class="mono" style="font-size:22px;color:#64748B">São Paulo, segunda-feira.</div>
<div style="font-size:56px;font-weight:800;margin-top:30px;letter-spacing:-.02em">Prezado Caderno,</div>
<div style="font-size:34px;line-height:1.55;margin-top:26px">Comunicamos o seu <b>desligamento imediato</b> da loja.<br><br>Agradecemos os anos de serviço, mas não dá mais: pedido se perde, cliente liga o dia todo e orçamento fica sem retorno.<br><br>Sua vaga já foi preenchida.</div>
<div style="font-size:32px;margin-top:40px;font-style:italic">Atenciosamente, a gerência.</div>
<div style="position:absolute;right:40px;top:50px;transform:rotate(12deg);border:7px solid #DC2626;color:#DC2626;border-radius:14px;padding:10px 26px;font-weight:900;font-size:76px;letter-spacing:.06em;opacity:.9">DEMITIDO</div></div>"""
S.append(slide(1, N, 'light', f"""{gap(50)}{eb('Carta de demissão')}<div class="sp"></div>{letter}<div class="sp"></div>{gap(60)}"""))
motivos = ['Perdeu o pedido da Marina. Duas vezes.', 'Nunca avisou um cliente que o pedido ficou pronto.', 'Deixou R$ 2.000 em orçamentos sem retorno.', 'Não sabe dizer quanto entrou no mês.', 'Levou um banho de café e sumiu com a semana inteira.']
mot = ''.join(f'<div class="card" style="display:flex;align-items:center;gap:26px;padding:33px 32px;margin-bottom:20px"><div class="bub b-red" style="width:70px;height:70px">{ic("X",34)}</div><div style="font-size:31px;font-weight:500;line-height:1.3">{m}</div></div>' for m in motivos)
S.append(slide(2, N, 'white', f"""{gap(50)}{eb('Motivos da demissão')}{gap(22)}<div class="h">Não foi por falta de aviso.</div>{gap(40)}{mot}
<div style="font-size:19px;color:#94A3B8;margin-top:6px">casos ilustrativos (mas você conhece alguém assim)</div>"""))
skills = ['Kanban por setor', 'Etiqueta com QR', 'Aviso ao cliente', 'CRM de orçamentos', 'Financeiro', 'IA no dia a dia']
sk = ''.join(f'<span style="display:inline-flex;align-items:center;gap:10px;background:rgba(201,155,255,.14);border:1px solid rgba(201,155,255,.35);color:#E9D5FF;border-radius:999px;padding:15px 24px;font-size:27px;font-weight:600;margin:0 12px 14px 0">{ic("Check",22)}{t}</span>' for t in skills)
S.append(slide(3, N, 'navy', f"""{gap(50)}{eb('Substituto contratado')}{gap(22)}
<div style="display:flex;align-items:center;gap:26px"><img src="assets/worqera-logo.png" style="width:120px;height:120px;border-radius:28px"><div><div class="h" style="font-size:76px">Worqera</div><div class="p" style="font-size:26px">Sistema de gestão de pedidos · disponível 24h</div></div></div>{gap(44)}
<div class="small" style="opacity:.9">Experiência</div>{gap(18)}
{money_rows([('R$ 1 mi+', 'em pedidos organizados', '#C99BFF'), ('1.000+', 'pedidos lançados, nenhum perdido de vista', '#fff')], size=124)}{gap(40)}
<div class="small" style="opacity:.9">Habilidades</div>{gap(18)}<div>{sk}</div>"""))
S.append(slide(4, N, 'photo', f"""<div class="sp"></div>{eb('Período de experiência')}{gap(24)}
<div class="h xl">O caderno teve anos. <span class="hl">A Worqera precisa de 7 dias.</span></div>{gap(26)}
<div class="p" style="max-width:860px">Teste grátis com pedido real, sem cartão. Se não fizer diferença, nada muda.</div>{gap(40)}""", bg='photo-notebook.png'))
S.append(cta(5, N, 'purple', 'Bora oficializar a demissão?', 'A gente cuida da transição: importa o histórico, configura seus setores e treina a equipe. Implantação em até 12x.', keyword='DEMITIDO'))
posts['2 - Demita o caderno'] = (N, S)

os.makedirs(os.path.join(HERE, 'html'), exist_ok=True)
for name, (n, S) in posts.items():
    open(os.path.join(HERE, 'html', name.replace(' ', '_') + '.html'), 'w').write(doc(n, S))
print({k: v[0] for k, v in posts.items()})
