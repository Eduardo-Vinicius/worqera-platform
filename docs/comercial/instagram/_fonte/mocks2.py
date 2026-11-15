"""Mockups e estilos extras da v3 (setores, rastreio, visão geral, CRM, IA, bento)."""
import lib
from lib import ic, thumbs, TH, qr_svg, phone, gap

lib.CSS += r"""
body:after{content:"";position:absolute;inset:0;z-index:50;pointer-events:none;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.ag{background:linear-gradient(92deg,#D1FAE5,#6EE7B7 40%,#34D399);-webkit-background-clip:text;color:transparent}
.ac{background:linear-gradient(92deg,#CFFAFE,#67E8F9 40%,#22D3EE);-webkit-background-clip:text;color:transparent}
.aa{background:linear-gradient(92deg,#FEF3C7,#FCD34D 40%,#F59E0B);-webkit-background-clip:text;color:transparent}
.af{background:linear-gradient(92deg,#FAE8FF,#F0ABFC 35%,#C084FC 70%,#818CF8);-webkit-background-clip:text;color:transparent}
.ab{background:linear-gradient(92deg,#DBEAFE,#93C5FD 40%,#60A5FA);-webkit-background-clip:text;color:transparent}
.ar{background:linear-gradient(92deg,#FFE4E6,#FDA4AF 40%,#FB7185);-webkit-background-clip:text;color:transparent}
.mega{font-weight:900;letter-spacing:-.075em;line-height:.84;white-space:nowrap}
.bt{border-radius:26px;padding:24px 24px 22px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.1);position:relative;overflow:hidden;display:flex;flex-direction:column}
.bt h5{font-size:26px;font-weight:800;letter-spacing:-.025em;margin-top:12px}
.bt p{font-size:18px;color:#A9A6BF;margin-top:4px;line-height:1.35}
.bi{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center}
.bi .ic{width:26px;height:26px}
.ring{border-radius:50%}
.badge{display:inline-flex;align-items:center;gap:12px;font-size:22px;font-weight:700;padding:12px 20px 12px 14px;border-radius:999px;background:rgba(16,185,129,.12);border:1px solid rgba(52,211,153,.4);color:#A7F3D0;align-self:flex-start}
.badge b{font-family:'JetBrains Mono';color:#fff}
.logo-c{display:flex;align-items:center;gap:22px;padding:26px 30px;border-radius:26px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12)}
.logo-c img{width:96px;height:96px;border-radius:50%;background:#fff;object-fit:cover}
"""

ACC = {  # cor principal, rgba do brilho, gradiente do ícone
    'v': ('#C4B5FD', 'rgba(139,92,246,', '#A78BFA'),
    'g': ('#6EE7B7', 'rgba(16,185,129,', '#34D399'),
    'c': ('#67E8F9', 'rgba(6,182,212,', '#22D3EE'),
    'a': ('#FCD34D', 'rgba(245,158,11,', '#F59E0B'),
    'f': ('#F0ABFC', 'rgba(217,70,239,', '#E879F9'),
    'b': ('#93C5FD', 'rgba(59,130,246,', '#60A5FA'),
    'r': ('#FDA4AF', 'rgba(244,63,94,', '#FB7185'),
}

def tagc(text, k='v'):
    c, g, d = ACC[k]
    return (f'<div class="tag" style="color:{c};background:{g}.12);border-color:{g}.38)">'
            f'<i style="background:{d};box-shadow:0 0 12px 3px {g}.85)"></i>{text}</div>')

def icb(name, k='v', size=64, isz=32, radius=18):
    c, g, d = ACC[k]
    return (f'<div style="width:{size}px;height:{size}px;border-radius:{radius}px;display:flex;align-items:center;justify-content:center;flex:none;'
            f'background:linear-gradient(180deg,{g}.32),{g}.1));border:1px solid {g}.42);color:{c};box-shadow:0 10px 30px -8px {g}.7)">{ic(name, isz)}</div>')

def win(url, inner, w, h=None, pad='22px 24px', bg='#FAFAFD'):
    hh = f'height:{h}px;' if h else ''
    return (f'<div class="win" style="width:{w}px;{hh}"><div class="wbar"><i></i><i></i><i></i>'
            f'<div class="url">{ic("ShieldCheck", 13)}{url}</div></div><div style="padding:{pad};background:{bg};height:calc(100% - 44px)">{inner}</div></div>')

def card(inner, pad='16px 18px', extra=''):
    return f'<div style="background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:{pad};{extra}">{inner}</div>'

def chip(t, cls=''):
    return f'<span class="chp {cls}">{t}</span>'

# ------------------------------------------------------------ setores
SECT = [('Recebido', '#94A3B8', 9, 'Balcão', 'BA'), ('Limpeza', '#22D3EE', 14, 'Ana', 'AN'), ('Costura', '#F59E0B', 11, 'Carlos', 'CA'),
        ('Pintura', '#E879F9', 6, 'Duda', 'DU'), ('Pronto', '#34D399', 12, 'Balcão', 'BA'), ('Entregue', '#A78BFA', 0, '', '')]

def sector_lanes():
    rows = ''
    for k, (n, col, cnt, who, ini) in enumerate(SECT[:5]):
        w = int(cnt / 14 * 100)
        lock = (f'<span style="display:flex;align-items:center;gap:8px;font-size:17px;color:#A9A6BF">'
                f'<span style="width:34px;height:34px;border-radius:50%;background:{col};color:#0B0916;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center">{ini}</span>{who}</span>')
        rows += (f'<div class="gl" style="border-radius:22px;padding:26px 26px;margin-bottom:12px;display:flex;align-items:center;gap:20px;background:rgba(14,12,26,.7)">'
                 f'<span style="width:14px;height:14px;border-radius:50%;background:{col};box-shadow:0 0 16px 3px {col}"></span>'
                 f'<span style="font-size:28px;font-weight:800;letter-spacing:-.02em;width:170px">{n}</span>'
                 f'<div style="flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,.07)"><div style="width:{w}%;height:100%;border-radius:6px;background:{col}"></div></div>'
                 f'<span class="k" style="font-size:30px;width:56px;text-align:right">{cnt}</span>{lock}</div>')
        if k < 4:
            rows += f'<div style="margin:-8px 0 -8px 30px;height:8px;width:2px;background:{col};opacity:.5"></div>'
    return rows

# ------------------------------------------------------------ rastreio público
def tracking_phone():
    steps = [('Recebido', 'qua 12/11 · 08:10', 'done'), ('Limpeza', 'qua 12/11 · 10:30', 'done'), ('Restauração', 'qui 13/11 · 16:05', 'done'),
             ('Pronto para retirada', 'sex 14/11 · 14:20', 'now'), ('Entregue', '', 'next')]
    tl = ''
    for k, (t, d, st) in enumerate(steps):
        if st == 'done':
            dot = f'<span style="width:26px;height:26px;border-radius:50%;background:#7C3AED;color:#fff;display:flex;align-items:center;justify-content:center">{ic("Check", 15)}</span>'
        elif st == 'now':
            dot = '<span style="width:26px;height:26px;border-radius:50%;background:#16A34A;box-shadow:0 0 0 6px rgba(22,163,74,.2)"></span>'
        else:
            dot = '<span style="width:26px;height:26px;border-radius:50%;border:2px solid #CBD5E1;background:#fff"></span>'
        line = '' if k == 4 else f'<span style="width:2px;flex:1;min-height:20px;background:{"#7C3AED" if st=="done" else "#E2E8F0"};margin:3px 0"></span>'
        col = '#0F172A' if st != 'next' else '#94A3B8'
        tl += (f'<div style="display:flex;gap:14px"><div style="display:flex;flex-direction:column;align-items:center">{dot}{line}</div>'
               f'<div style="padding-bottom:12px"><div style="font-size:16px;font-weight:700;color:{col}">{t}</div><div style="font-size:12.5px;color:#64748B">{d}</div></div></div>')
    content = f'''<div style="margin:0 14px;height:30px;border-radius:10px;background:#EEEDF4;font-size:12.5px;color:#475569;display:flex;align-items:center;justify-content:center;gap:6px">{ic("ShieldCheck",13)}worqera.com/p/sua-empresa/0048</div>
<div style="padding:14px 18px">
<div style="display:flex;align-items:center;gap:10px"><span style="width:36px;height:36px;border-radius:10px;background:#0F172A;color:#fff;display:flex;align-items:center;justify-content:center">{ic("Store",20)}</span><b style="font-size:16px">Sua empresa</b></div>
<div style="margin-top:14px;font-size:13px;color:#64748B;font-weight:600">Pedido</div>
<div style="display:flex;justify-content:space-between;align-items:center"><span class="mono" style="font-size:34px;font-weight:700;letter-spacing:-.04em">#0048</span><span style="background:#DCFCE7;color:#166534;font-weight:700;font-size:13px;border-radius:999px;padding:6px 10px">Pronto</span></div>
<div style="font-size:14px;color:#475569">Tênis branco · Limpeza e restauração</div>
<div style="display:flex;gap:8px;margin:12px 0 14px"><span style="flex:1;height:70px;border-radius:12px;background:{TH[0]}"></span><span style="flex:1;height:70px;border-radius:12px;background:{TH[3]}"></span><span style="flex:1;height:70px;border-radius:12px;background:{TH[6]}"></span></div>
{tl}
<div style="background:#fff;border:1px solid #ECEAF3;border-radius:16px;padding:12px 14px;margin-top:2px"><div style="font-size:14px;font-weight:700">Como foi o atendimento?</div><div class="star" style="display:flex;gap:4px;color:#F59E0B;margin-top:6px">{ic("Star",24)*5}</div></div>
</div>'''
    return phone(content)

# ------------------------------------------------------------ visão geral (dashboard)
def overview_window(w=960, h=760):
    tiles = [('Atrasados', '2', '#B91C1C', '#FEF2F2', '#FECACA'), ('Vencem hoje', '5', '#92400E', '#FFFBEB', '#FDE68A'),
             ('Vencem amanhã', '8', '#0F172A', '#fff', '#ECEAF3'), ('Prontos', '12', '#166534', '#F0FDF4', '#BBF7D0'), ('Na loja', '47', '#6D28D9', '#F5F3FF', '#DDD6FE')]
    t = ''.join(f'<div style="flex:1;background:{bg};border:1px solid {bd};border-radius:16px;padding:14px 14px"><div style="font-size:12.5px;font-weight:600;color:{c}">{n}</div><div class="k" style="font-size:38px;color:{c};margin-top:2px">{v}</div></div>'
                for n, v, c, bg, bd in tiles)
    sec = ''.join(f'<div style="display:flex;align-items:center;gap:10px;margin-bottom:11px"><span style="width:9px;height:9px;border-radius:50%;background:{col}"></span><span style="font-size:13.5px;width:76px">{n}</span>'
                  f'<div style="flex:1;height:9px;border-radius:5px;background:#F1F5F9"><div style="width:{int(cnt/14*100)}%;height:100%;border-radius:5px;background:{col}"></div></div><b class="mono" style="font-size:13px;width:22px;text-align:right">{cnt}</b></div>'
                  for n, col, cnt, _, _ in SECT[:5])
    pct = 94
    ring = (f'<div style="position:relative;width:150px;height:150px;margin:6px auto 0"><svg viewBox="0 0 36 36" style="width:100%;height:100%;transform:rotate(-90deg)">'
            f'<circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" stroke-width="3.6"/>'
            f'<circle cx="18" cy="18" r="15.9" fill="none" stroke="#7C3AED" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="{pct} 100"/></svg>'
            f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span class="k" style="font-size:34px">{pct}%</span><span style="font-size:12px;color:#64748B">no prazo</span></div></div>')
    team = ''.join(f'<div style="display:flex;align-items:center;gap:10px;padding:7px 0;{"border-bottom:1px solid #F1F5F9" if i<2 else ""}"><span class="mono" style="font-size:12px;color:#94A3B8;width:14px">{i+1}</span><span style="width:26px;height:26px;border-radius:50%;background:{c};color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center">{ini}</span><span style="flex:1;font-size:13.5px;font-weight:600">{n}</span><b class="mono" style="font-size:13px">{v}</b></div>'
                   for i, (n, ini, c, v) in enumerate([('Ana', 'AN', '#0891B2', 31), ('Carlos', 'CA', '#D97706', 24), ('Duda', 'DU', '#C026D3', 19)]))
    inner = f'''<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">Visão geral</div><div style="display:flex;gap:6px">{chip("Hoje","v")}{chip("Semana")}{chip("Mês")}</div></div>
<div style="display:flex;gap:10px;margin-top:16px">{t}</div>
<div style="display:flex;gap:12px;margin-top:12px">
{card('<div style="font-size:14px;font-weight:700;margin-bottom:14px">Fila por setor</div>' + sec, extra='flex:1.35')}
{card('<div style="font-size:14px;font-weight:700">Prazo · 30 dias</div>' + ring, extra='flex:1')}
</div>
<div style="display:flex;gap:12px;margin-top:12px">
{card('<div style="font-size:14px;font-weight:700;margin-bottom:6px">Quem mais produziu · semana</div>' + team, extra='flex:1.35')}
{card('<div style="font-size:14px;font-weight:700">Entregues · semana</div><div class="k" style="font-size:30px;margin-top:8px">38</div><div style="font-size:12px;color:#64748B;font-weight:600;margin-top:2px">ticket médio R$ 259</div>', extra='flex:1')}
</div>'''
    return win('app.worqera.com/dashboard', inner, w, h)

# ------------------------------------------------------------ CRM orçamentos
def crm_pipeline(w=960, h=640):
    cols = [('Novo', '#64748B', [('Paula', 'R$ 180', 'Pintura'), ('Igor', 'R$ 95', 'Costura')]),
            ('Contato', '#2563EB', [('Rafael', 'R$ 240', 'Restauração'), ('Lívia', 'R$ 130', 'Limpeza')]),
            ('Retorno', '#D97706', [('Bruno', 'R$ 320', 'Restauração', 'Ligar hoje'), ('Sara', 'R$ 150', 'Pintura', 'Amanhã')]),
            ('Recuperado', '#16A34A', [('Marcos', 'R$ 410', 'Restauração'), ('Júlia', 'R$ 310', 'Pintura')])]
    out = ''
    for name, col, cards in cols:
        cs = ''
        for c in cards:
            due = f'<span class="due {"y" if c[3]=="Ligar hoje" else ""}" style="font-size:11px">{c[3]}</span>' if len(c) > 3 else ''
            cs += (f'<div class="kc" style="{"border-color:#BBF7D0;background:#F7FEF9" if name=="Recuperado" else ""}"><div class="t1"><span style="font-size:14px;font-weight:700">{c[0]}</span><span class="mono" style="font-size:13px;font-weight:700;color:{col}">{c[1]}</span></div>'
                   f'<div class="sv" style="margin-top:3px">{c[2]}</div>{"<div style=margin-top:8px>" + due + "</div>" if due else ""}</div>')
        tot = {'Novo': 'R$ 275', 'Contato': 'R$ 370', 'Retorno': 'R$ 470', 'Recuperado': 'R$ 720'}[name]
        out += (f'<div class="col"><div class="ch"><span style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:{col}"></span>{name}</span></div>'
                f'<div class="mono" style="font-size:15px;font-weight:700;color:{col};margin:-4px 2px 10px">{tot}</div>{cs}</div>')
    inner = f'''<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">Orçamentos</div><div style="display:flex;gap:6px">{chip("Recuperado no mês <b>R$ 720</b>","v")}</div></div>
<div class="cols">{out}</div>
<div style="margin-top:10px;display:flex;gap:10px">{card('<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#64748B">MOTIVO QUE MAIS PERDEU</div><div style="font-size:17px;font-weight:700;margin-top:4px">Preço · 3 orçamentos</div>', '12px 16px', 'flex:1')}
{card('<div style="font-size:12px;font-weight:700;letter-spacing:.08em;color:#64748B">RECUPERADOS NA SEMANA</div><div style="font-size:17px;font-weight:700;margin-top:4px;color:#16A34A">2 orçamentos · R$ 480</div>', '12px 16px', 'flex:1')}</div>'''
    return win('app.worqera.com/orcamentos', inner, w, h, pad='18px 20px', bg='#fff')

# ------------------------------------------------------------ CRM clientes
def crm_clients(w=960, h=620):
    segs = [('Todos', '312', ''), ('Novos', '18', ''), ('Recorrentes', '142', 'v'), ('Inativos 90d', '37', 'y'), ('Com saldo', '4', 'r'), ('Aniversário', '2', '')]
    sg = ''.join(f'<span class="chp {c}" style="font-size:13px;padding:8px 12px">{n} <b>{v}</b></span>' for n, v, c in segs)
    rows = [('Marina Lopes', 'Recorrente · 6 pedidos', 'a cada 41 dias', 'R$ 1.140', '#7C3AED'), ('Rafael Souza', 'Inativo · 97 dias', 'último: ago', 'R$ 620', '#D97706'),
            ('Helena Prado', 'Com saldo · R$ 80', 'pronto há 2 dias', 'R$ 410', '#DC2626'), ('Gustavo Lima', 'Novo · 1º pedido', 'há 9 dias', 'R$ 160', '#0891B2')]
    r = ''.join(f'<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;{"background:#F5F3FF;border:1px solid #DDD6FE" if i==1 else "border:1px solid transparent"}">'
                f'<span style="width:34px;height:34px;border-radius:50%;background:{c};color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">{n[0]}{n.split()[1][0]}</span>'
                f'<div style="flex:1"><div style="font-size:15px;font-weight:700">{n}</div><div style="font-size:12.5px;color:#64748B">{s} · {f}</div></div><b class="mono" style="font-size:14px">{v}</b></div>'
                for i, (n, s, f, v, c) in enumerate(rows))
    msg = ('<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:14px;padding:14px 16px;font-size:14.5px;line-height:1.45;color:#14532D">'
           f'<div style="font-size:11.5px;font-weight:700;letter-spacing:.08em;color:#16A34A;margin-bottom:6px;display:flex;align-items:center;gap:6px">{ic("Sparkles",13)}MENSAGEM PRONTA · VOLTA</div>'
           'Oi, Rafael! Aqui é da Sua empresa. Faz uns 3 meses que você não aparece, sentimos sua falta! Precisando de algo, é só chamar.</div>'
           '<div style="margin-top:10px;background:linear-gradient(180deg,#34D399,#16A34A);color:#fff;border-radius:12px;padding:12px;text-align:center;font-weight:700;font-size:15px">Enviar no WhatsApp</div>')
    inner = f'''<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:22px;font-weight:800;letter-spacing:-.02em">Clientes · CRM</div>{chip("Retenção 6 meses <b>58%</b>","v")}</div>
<div style="display:flex;gap:6px;margin:14px 0;flex-wrap:wrap">{sg}</div>
<div style="display:flex;gap:14px"><div style="flex:1.1">{r}</div><div style="flex:1">{msg}</div></div>'''
    return win('app.worqera.com/clientes', inner, w, h, pad='18px 20px', bg='#fff')

# ------------------------------------------------------------ IA
def ai_panel(title, sub, bullets, w=900, foot=None):
    bl = ''.join(f'<div style="display:flex;gap:16px;align-items:flex-start;padding:18px 0;{"border-top:1px solid rgba(255,255,255,.08)" if i else ""}">'
                 f'<span style="width:40px;height:40px;border-radius:12px;background:{c}22;color:{c};display:flex;align-items:center;justify-content:center;flex:none">{ic(icn,22)}</span>'
                 f'<span style="font-size:27px;line-height:1.38;color:#E4E1F2;padding-top:2px">{t}</span></div>' for i, (icn, c, t) in enumerate(bullets))
    ft = (f'<div style="margin-top:14px;padding:16px 18px;border-radius:16px;background:linear-gradient(90deg,rgba(217,70,239,.16),rgba(124,58,237,.12));border:1px solid rgba(240,171,252,.3);font-size:25px;line-height:1.4">'
          f'<b style="color:#F5D0FE">Sugestão:</b> {foot}</div>') if foot else ''
    return f'''<div style="width:{w}px;border-radius:30px;padding:2px;background:linear-gradient(135deg,#F0ABFC,#8B5CF6 40%,#22D3EE);box-shadow:0 0 120px -20px rgba(217,70,239,.6),0 60px 120px -30px rgba(0,0,0,.9)">
<div style="border-radius:28px;background:#110E1E;padding:34px 36px">
<div style="display:flex;align-items:center;gap:14px"><span style="width:50px;height:50px;border-radius:15px;background:linear-gradient(135deg,#E879F9,#7C3AED);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px rgba(217,70,239,.6)">{ic("Sparkles",28)}</span>
<div><div style="font-size:32px;font-weight:800;letter-spacing:-.02em">{title}</div><div class="mono" style="font-size:17px;color:#A9A6BF;margin-top:2px">{sub}</div></div></div>
<div style="margin-top:16px">{bl}</div>{ft}</div></div>'''

# ------------------------------------------------------------ bento (todos os recursos)
def bento():
    def tile(k, icon, title, desc, vis='', span=''):
        c, g, d = ACC[k]
        return (f'<div class="bt" style="{span}"><div style="position:absolute;right:-60px;top:-60px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,{g}.35),transparent 70%)"></div>'
                f'<div class="bi" style="background:{g}.18);color:{c};border:1px solid {g}.4)">{ic(icon)}</div><h5>{title}</h5><p>{desc}</p>{vis}</div>')
    dots = ''.join(f'<span style="width:12px;height:12px;border-radius:50%;background:{col};box-shadow:0 0 10px {col}"></span>' for _, col, *_ in SECT)
    v_set = f'<div style="display:flex;gap:9px;margin-top:auto;padding-top:14px">{dots}</div>'
    v_kan = ('<div style="display:flex;gap:6px;margin-top:auto;padding-top:14px">' + ''.join(
        f'<div style="flex:1;border-radius:8px;background:rgba(255,255,255,.06);padding:6px">{"".join("<div style=height:12px;border-radius:4px;background:rgba(255,255,255,.22);margin-bottom:5px></div>" for _ in range(n))}</div>' for n in (3, 2, 2, 1)) + '</div>')
    v_qr = f'<div style="width:86px;height:86px;background:#fff;border-radius:12px;padding:8px;margin-top:auto">{qr_svg(3, 21)}</div>'
    v_fin = ('<div style="display:flex;gap:5px;align-items:flex-end;height:60px;margin-top:auto;padding-top:10px">' +
             ''.join(f'<div style="flex:1;height:{v}%;border-radius:4px 4px 2px 2px;background:linear-gradient(180deg,#6EE7B7,#059669)"></div>' for v in (40, 55, 48, 72, 64, 88, 100)) + '</div>')
    v_ai = ('<div style="margin-top:auto;padding-top:12px;font-size:16px;line-height:1.4;color:#F5D0FE;background:rgba(217,70,239,.1);border:1px solid rgba(240,171,252,.25);border-radius:12px;padding:10px 12px">'
            '“Hoje: 12 prontos e 3 orçamentos para ligar.”</div>')
    v_trk = ('<div style="display:flex;align-items:center;gap:0;margin-top:auto;padding-top:10px">' + ''.join(
        f'<span style="width:18px;height:18px;border-radius:50%;background:{c};flex:none"></span>' + ('' if i == 3 else f'<span style="flex:1;height:3px;background:{c}"></span>')
        for i, c in enumerate(['#34D399', '#34D399', '#34D399', 'rgba(255,255,255,.2)'])) + '</div>')
    v_dash = ('<div style="display:flex;gap:6px;margin-top:auto;padding-top:10px">' + ''.join(
        f'<div style="flex:1;border-radius:8px;background:{b};padding:5px 7px"><div class="k" style="font-size:20px;color:{c}">{v}</div></div>'
        for v, c, b in [('2', '#FCA5A5', 'rgba(239,68,68,.15)'), ('5', '#FCD34D', 'rgba(245,158,11,.15)'), ('12', '#6EE7B7', 'rgba(16,185,129,.15)')]) + '</div>')
    v_crm = ('<div style="margin-top:auto;padding-top:10px">' + ''.join(
        f'<div style="height:9px;width:{w}%;border-radius:5px;background:{c};margin-top:5px"></div>' for w, c in [(100, '#FCD34D'), (72, '#F59E0B'), (48, '#D97706'), (30, '#34D399')]) + '</div>')
    return f'''<div style="display:grid;grid-template-columns:1fr 1fr 1fr;grid-auto-rows:200px;gap:14px">
{tile('v','Layers','Setores','Do seu jeito, com conta por setor.', v_set)}
{tile('b','KanbanSquare','Kanban','A fila de cada setor, ao vivo.', v_kan)}
{tile('c','QrCode','QR Code','Etiqueta que abre o pedido.', v_qr, 'grid-row:span 2')}
{tile('g','Eye','Acompanhar','O cliente vê o status sozinho.', v_trk)}
{tile('b','LayoutDashboard','Dashboard','Atrasos, prazos e produção.', v_dash)}
{tile('g','Wallet','Financeiro','Caixa, a receber e quem deve.', v_fin)}
{tile('a','Target','CRM','Orçamentos e clientes que voltam.', v_crm)}
{tile('f','Sparkles','Análise com IA','Resumo do dia e da semana.', v_ai, 'grid-column:span 3;grid-row:span 1')}
</div>'''

# ------------------------------------------------------------ CTA final (sem telefone)
def ig_comment(keyword='QUERO', w=936):
    return (f'<div style="width:{w}px;border-radius:28px;padding:2px;background:linear-gradient(120deg,#F0ABFC,#A855F7 35%,#6366F1 70%,#22D3EE);box-shadow:0 0 120px -20px rgba(168,85,247,.75)">'
            f'<div style="border-radius:26px;background:#100D1C;padding:26px 30px;display:flex;align-items:center;gap:22px">'
            f'<span style="width:64px;height:64px;border-radius:50%;padding:3px;background:linear-gradient(45deg,#F59E0B,#EC4899,#8B5CF6);flex:none"><span style="display:block;width:100%;height:100%;border-radius:50%;background:#2A2540;border:3px solid #100D1C"></span></span>'
            f'<div style="flex:1"><div style="font-size:21px;color:#A9A6BF"><b style="color:#fff">você</b> · agora</div>'
            f'<div style="font-size:52px;font-weight:900;letter-spacing:-.04em;margin-top:2px">Comente <span class="af">{keyword}</span></div></div>'
            f'<svg width="44" height="44" viewBox="0 0 24 24" fill="#FB7185"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.8 4.2 7.3C19.5 16.4 12 21 12 21z"/></svg></div></div>')

def cta_final(main, items, keyword='QUERO', note='A gente te chama no direct e mostra a Worqera rodando com a sua operação.'):
    it = ''.join(f'<div style="display:flex;align-items:center;gap:20px;padding:21px 0;{"border-top:1px solid rgba(255,255,255,.08)" if i else ""}">'
                 f'<span style="width:38px;height:38px;border-radius:50%;background:rgba(52,211,153,.16);border:1px solid rgba(52,211,153,.45);color:#6EE7B7;display:flex;align-items:center;justify-content:center;flex:none">{ic("Check", 22)}</span>'
                 f'<span style="font-size:30px;font-weight:600;letter-spacing:-.015em">{t}</span></div>' for i, t in enumerate(items))
    acts = ''.join(f'<div class="gl" style="flex:1;display:flex;align-items:center;gap:14px;padding:22px 24px;border-radius:22px;background:rgba(14,12,26,.75)">'
                   f'<span style="width:48px;height:48px;border-radius:14px;background:rgba(167,139,250,.18);color:#D8B4FE;display:flex;align-items:center;justify-content:center;flex:none">{ic(i, 26)}</span>'
                   f'<div><div style="font-size:24px;font-weight:800;letter-spacing:-.02em">{t}</div><div style="font-size:18px;color:#A9A6BF;margin-top:2px">{d}</div></div></div>'
                   for i, t, d in [('Send', 'Chame no direct', 'resposta no mesmo dia'), ('ArrowUpRight', 'Link na bio', 'teste grátis 7 dias')])
    return f'''{gap(20)}<div class="tag" style="color:#6EE7B7;background:rgba(16,185,129,.12);border-color:rgba(52,211,153,.38)"><i style="background:#34D399;box-shadow:0 0 12px 3px rgba(52,211,153,.85)"></i>Próximo passo</div>{gap(26)}
<div class="h" style="font-size:100px">{main}</div>{gap(44)}
<div class="gl" style="padding:14px 32px;background:rgba(14,12,26,.72)">{it}</div>
<div class="sp"></div>
{ig_comment(keyword)}{gap(14)}
<div style="font-size:22px;color:#A9A6BF;text-align:center;line-height:1.4">{note}</div>{gap(18)}
<div style="display:flex;gap:14px">{acts}</div><div style="height:96px"></div>'''
