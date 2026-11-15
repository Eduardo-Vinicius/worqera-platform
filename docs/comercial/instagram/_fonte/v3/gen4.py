"""v4: capas e fechamentos com visuais de sistema (notebook, celular, gráficos, notificações)."""
import os
import gen3
from gen3 import ic, gap, eb, slide, doc, posts, W, H, Z, notif, tracking, qr_svg, money_rows

gen3.CSS += r"""
.abs{position:absolute!important}
.duo:before{background:linear-gradient(180deg,rgba(124,58,237,.62) 0%,rgba(88,28,135,.78) 50%,rgba(46,6,82,.95) 100%)!important}
.lap{position:relative}
.lap .bz{background:#0B1020;border-radius:26px 26px 0 0;padding:16px 16px 0;box-shadow:0 0 0 2px #2A2F45}
.lap .sc{background:#F8FAFC;border-radius:12px 12px 0 0;overflow:hidden;color:#0F172A}
.lap .base{height:30px;margin:0 -60px;background:linear-gradient(180deg,#CBD5E1,#94A3B8);border-radius:0 0 26px 26px;position:relative}
.lap .base:after{content:"";position:absolute;left:50%;top:0;transform:translateX(-50%);width:160px;height:10px;background:#64748B;border-radius:0 0 10px 10px}
.mphone{width:360px;border-radius:52px;background:#0B1020;padding:12px;box-shadow:0 0 0 2px #2A2F45,0 50px 90px -30px rgba(0,0,0,.8)}
.mphone .sc{border-radius:42px;overflow:hidden;height:740px;position:relative}
.chip{display:inline-flex;align-items:center;gap:12px;font-weight:800;font-size:28px;padding:16px 24px;border-radius:999px;box-shadow:0 20px 40px -16px rgba(0,0,0,.5)}
.chip .ic{width:30px;height:30px}
.bubble{background:#fff;color:#0F172A;border-radius:22px 22px 22px 6px;padding:16px 22px;font-size:25px;box-shadow:0 14px 30px -14px rgba(0,0,0,.45)}
"""

def area_chart(pts, w, h, color='#8B5CF6', fill_op=.35, stroke=5, dots=True, gid='g1'):
    xs = [i * w / (len(pts) - 1) for i in range(len(pts))]
    mx, mn = max(pts), min(pts)
    ys = [h - 12 - (p - mn) / (mx - mn or 1) * (h - 40) for p in pts]
    line = ' L '.join(f'{x:.1f},{y:.1f}' for x, y in zip(xs, ys))
    d = ''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="#fff" stroke="{color}" stroke-width="4"/>' for x, y in list(zip(xs, ys))[-1:]) if dots else ''
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="display:block;overflow:visible"><defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{color}" stop-opacity="{fill_op}"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></linearGradient></defs>'
            f'<path d="M {line} L {w},{h} L 0,{h} Z" fill="url(#{gid})"/><path d="M {line}" fill="none" stroke="{color}" stroke-width="{stroke}" stroke-linejoin="round" stroke-linecap="round"/>{d}</svg>')

UP = [12, 18, 16, 26, 31, 29, 42, 48, 55, 61, 74, 88]
DOWN = [88, 84, 86, 76, 71, 74, 62, 58, 51, 47, 38, 30]

def kpi(t, v, s, sc='#16A34A'):
    return (f'<div style="flex:1;background:#fff;border:1px solid #E2E8F0;border-radius:14px;padding:14px 16px"><div style="font-size:14px;color:#64748B;font-weight:600">{t}</div>'
            f'<div style="font-size:30px;font-weight:800;letter-spacing:-.03em;margin-top:4px">{v}</div><div style="font-size:13px;font-weight:700;color:{sc};margin-top:2px">{s}</div></div>')

def dash_screen(w=868):
    nav = ''.join(f'<div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:{"#7C3AED" if i == 0 else "#64748B"};background:{"#F3E8FF" if i == 0 else "transparent"};padding:8px 10px;border-radius:8px;margin-bottom:3px">{ic(n, 15)}{t}</div>'
                  for i, (n, t) in enumerate([('LayoutDashboard', 'Visão geral'), ('KanbanSquare', 'Kanban'), ('Inbox', 'Pedidos'), ('Users', 'Clientes'), ('Target', 'Orçamentos'), ('Wallet', 'Financeiro'), ('Sparkles', 'IA')]))
    cw = w - 170 - 40
    return f'''<div style="display:flex;height:{int(w*.56)}px">
<div style="width:170px;background:#fff;border-right:1px solid #E2E8F0;padding:16px 10px"><div style="display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;margin:0 6px 16px"><img src="assets/worqera-logo.png" style="width:24px;height:24px;border-radius:6px">Worqera</div>{nav}</div>
<div style="flex:1;padding:16px 20px">
<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:20px">Visão geral</b><span style="font-size:12px;font-weight:700;background:#F3E8FF;color:#7C3AED;border-radius:999px;padding:5px 10px">Este ano</span></div>
<div style="display:flex;gap:10px;margin-top:12px">{kpi('Faturado','R$ 1 mi+','▲ subindo todo mês')}{kpi('Pedidos','1.000+','▲ 700+ por mês')}{kpi('No prazo','94%','▲ +6 pts','#16A34A')}</div>
<div style="background:#fff;border:1px solid #E2E8F0;border-radius:14px;margin-top:12px;padding:14px 16px"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">Pedidos por mês</b><span style="font-size:12px;color:#16A34A;font-weight:700">▲ crescendo</span></div>
<div style="margin-top:10px">{area_chart(UP, cw - 34, 170, gid='lapc')}</div></div>
</div></div>'''

def laptop(w=900):
    return f'<div class="lap" style="width:{w}px"><div class="bz"><div class="sc">{dash_screen(w-32)}</div></div><div class="base"></div></div>'

def lock_phone(notifs, time='14:20'):
    items = ''.join(f'''<div style="background:rgba(255,255,255,.92);border-radius:20px;padding:12px 14px;display:flex;gap:10px;margin-bottom:9px;color:#0F172A">
<div style="width:36px;height:36px;border-radius:10px;background:{c};display:flex;align-items:center;justify-content:center;color:#fff;flex:none">{ic(i,20)}</div>
<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between"><b style="font-size:14px">{t}</b><span style="font-size:12px;color:#64748B">{w}</span></div><div style="font-size:14px;line-height:1.3;margin-top:2px">{m}</div></div></div>''' for i, c, t, m, w in notifs)
    return f'''<div class="mphone"><div class="sc" style="background:radial-gradient(120% 70% at 20% 10%,#8B5CF6,#3B0764 55%,#0B0716)">
<div style="text-align:center;color:#fff;padding-top:46px"><div style="font-size:16px;font-weight:600;opacity:.85">sexta-feira, 14 de novembro</div><div style="font-size:92px;font-weight:700;letter-spacing:-.04em;line-height:1">{time}</div></div>
<div style="position:absolute;left:12px;right:12px;bottom:40px">{items}</div></div></div>'''

WA = ('MessageCircle', '#22C55E')
def n_wa(m, w='agora', t='Sua empresa'): return (WA[0], WA[1], t, m, w)
def n_wq(m, w='agora', t='Worqera'): return ('Sparkles', '#7C3AED', t, m, w)

def chart_card(pts, color, title, value, delta, dcolor, w=936, h=250, gid='cc', bg='#fff', fg='#0F172A', sub='#64748B'):
    return f'''<div style="width:{w}px;background:{bg};border-radius:24px;padding:28px 30px;color:{fg};box-shadow:0 40px 80px -30px rgba(0,0,0,.6)">
<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font-size:20px;font-weight:600;color:{sub}">{title}</div><div style="font-size:54px;font-weight:800;letter-spacing:-.04em;margin-top:4px">{value}</div></div>
<span style="font-size:24px;font-weight:800;color:{dcolor};background:{dcolor}1A;border-radius:999px;padding:10px 18px">{delta}</span></div>
<div style="margin-top:20px">{area_chart(pts, w - 60, h, color, gid=gid)}</div></div>'''

def chip(icon, text, bg, fg='#fff'):
    return f'<span class="chip" style="background:{bg};color:{fg}">{ic(icon)}{text}</span>'

def A(x, y, html, extra=''):
    return f'<div class="abs" style="left:{x}px;top:{y}px;{extra}">{html}</div>'

def btn_block(head, sub, keyword='QUERO'):
    return f'''{eb('Comece agora')}{gap(22)}<div class="h xl">{head}</div>{gap(24)}<div class="p" style="max-width:880px">{sub}</div>{gap(36)}
<div><span class="btn">Comente “{keyword}” {ic("ArrowRight")}</span></div>{gap(24)}<div class="small">ou chame no direct · link na bio</div>'''

ILL = '<div class="abs" style="right:72px;bottom:28px;font-size:17px;opacity:.5">imagens ilustrativas</div>'

# ------------------------------------------------------------ 1 · PRINCIPAL
n, S = posts['1 - Principal - Servicos']
S[0] = slide(0, n, 'navy', f'''{gap(40)}{eb('Números reais da Worqera')}{gap(20)}
<div class="big" style="font-size:156px;color:#C99BFF;letter-spacing:-.06em">R$ 1 milhão+</div>{gap(14)}
<div class="h" style="font-size:58px">em pedidos criados direto na Worqera.</div>
{A(150, 640, laptop(930))}
{A(36, 700, lock_phone([n_wa('Seu pedido #0048 ficou pronto! ✅'), n_wq('12 prontos, 3 orçamentos para ligar.', '08:00')]), 'zoom:.78')}
{A(640, 560, chip('TrendingUp', '+1.000 pedidos', '#16A34A'), 'z-index:5')}{ILL}''')
S[8] = slide(8, n, 'purple', f'''{gap(30)}{btn_block('Sua loja nesse nível? <span class="hl">Bora.</span>', 'Teste grátis por 7 dias, sem cartão. Implantação completa em até 12x.')}
{A(140, 900, laptop(860))}{A(60, 1010, notif('Pedido #0091 entrou · etiqueta impressa ✅', w=420), 'z-index:5')}''', arrow=False)

# ------------------------------------------------------------ 2 · DEMITA
n, S = posts['2 - Demita o caderno']
S[0] = S[0].replace('class="s purple"', 'class="s photo duo"').replace(f'style="left:0px"', 'style="left:0px;background-image:url(assets/photo-notebook.png)"', 1)
cm = ''.join(f'<div class="bubble" style="margin-bottom:14px;{"margin-left:" + str(ml) + "px"}"><b>{u}</b> &nbsp;{t}</div>' for u, t, ml in
             [('@sapataria.central', 'DEMITIDO 🔥', 0), ('@lavanderia.bolha', 'DEMITIDO, já era caderno 😂', 120), ('@tec.cell', 'DEMITIDO!!', 40), ('@atelie.linha', 'DEMITIDO, quero ver', 180)])
S[5] = slide(5, n, 'purple', f'''{gap(40)}<div style="zoom:1.1">{cm}</div><div class="sp"></div>
{btn_block('Bora oficializar a demissão?', 'A gente cuida da transição: importa o histórico, configura seus setores e treina a equipe. Implantação em até 12x.', 'DEMITIDO')}{gap(10)}''', arrow=False)

# ------------------------------------------------------------ 3 · CRM + IA
n, S = posts['3 - CRM e IA']
def crm_float(name, v, d, top_c='#F59E0B'):
    return (f'<div style="width:560px;background:#fff;color:#0F172A;border-radius:20px;padding:22px 26px;display:flex;align-items:center;gap:18px;box-shadow:0 30px 60px -24px rgba(0,0,0,.55)">'
            f'<span style="width:54px;height:54px;border-radius:50%;background:#F3E8FF;color:#7C3AED;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px">{name[0]}</span>'
            f'<div style="flex:1"><b style="font-size:25px">{name}</b><div style="font-size:19px;color:#64748B">Orçamento sem retorno</div></div>'
            f'<div style="text-align:right"><div class="mono" style="font-size:28px;font-weight:700">{v}</div><div style="font-size:17px;font-weight:700;color:{top_c}">parado há {d}</div></div></div>')
S[0] = slide(0, n, 'purple', f'''{gap(30)}{eb('CRM + Inteligência artificial')}{gap(20)}
<div class="h xl">Quanto dinheiro está parado nos seus orçamentos?</div>
{A(72, 650, crm_float('Rafael', 'R$ 640', '21 dias', '#DC2626'), 'transform:rotate(-3deg)')}
{A(300, 800, crm_float('Marina', 'R$ 380', '12 dias'), 'transform:rotate(2deg)')}
{A(110, 950, crm_float('Paulo', 'R$ 220', '8 dias'), 'transform:rotate(-1deg)')}
{A(560, 600, chip('AlertTriangle', 'R$ 1.240 parados', '#DC2626'), 'z-index:5')}
{A(72, 1110, chip('Sparkles', 'IA: ligue primeiro para o Rafael', '#fff', '#6D28D9'), 'z-index:5')}{ILL}''')
S[6] = slide(6, n, 'navy', f'''{gap(30)}{btn_block('Menos achismo. <span class="hl">Mais decisão.</span>', 'CRM e IA no mesmo sistema que roda a sua fila. Um orçamento recuperado no mês já paga o plano.')}
{A(140, 900, laptop(860))}''', arrow=False)

# ------------------------------------------------------------ 4 · NÚMEROS
n, S = posts['4 - Numeros reais']
S[0] = slide(0, n, 'navy', f'''{gap(30)}{eb('Números reais')}{gap(18)}
<div class="big" style="font-size:230px;color:#C99BFF;letter-spacing:-.065em">R$ 1 mi+</div>{gap(10)}
<div class="h" style="font-size:56px">em pedidos criados direto na Worqera. <span class="hl">E subindo.</span></div>
{A(72, 700, chart_card(UP, '#8B5CF6', 'Pedidos na plataforma', '1.000+', '▲ todo mês', '#16A34A', w=936, h=260, gid='n1'))}
{A(560, 650, chip('TrendingUp', '700+ por mês', '#16A34A'), 'z-index:5')}{ILL}''')
S[5] = slide(5, n, 'purple', f'''{gap(30)}{btn_block('A próxima loja pode ser a sua.', 'Sapataria, lavanderia, assistência, ateliê. Teste grátis por 7 dias com pedido real.')}
{A(560, 760, tracking(), 'zoom:.95')}{A(72, 900, notif('Seu pedido #0048 ficou pronto! ✅', w=500), 'z-index:5')}''', arrow=False)

# ------------------------------------------------------------ 5 · 5 SINAIS
n, S = posts['5 - 5 sinais']
msgs = ''.join(f'<div class="bubble" style="margin-bottom:12px;{"margin-left:" + str(ml) + "px"};font-size:24px">{t} <span style="font-size:17px;color:#94A3B8">{h}</span></div>' for t, h, ml in
               [('Já ficou pronto?', '09:14', 0), ('E aí, ficou pronto??', '11:32', 60), ('Alguém pode me responder?', '15:47', 20)])
S[0] = slide(0, n, 'flat', f'''{gap(30)}{eb('Checklist · salve este post')}{gap(20)}
<div class="h xl"><span style="color:#FB7185">5 sinais</span> de que sua loja está perdendo dinheiro</div>
{A(72, 700, chart_card(DOWN, '#EF4444', 'Faturamento do mês', 'R$ 18.420', '▼ 23%', '#DC2626', w=560, h=200, gid='d1', bg='#111827', fg='#fff', sub='#94A3B8'))}
{A(660, 600, msgs, 'zoom:.9;z-index:5')}
{A(72, 1100, chip('AlertTriangle', '12 pedidos atrasados', '#DC2626'), 'z-index:5')}
{A(560, 1100, chip('Archive', '5 parados na prateleira', '#F59E0B', '#111827'), 'z-index:5')}{ILL}''')

# ------------------------------------------------------------ 6 · UM DIA NA LOJA
n, S = posts['6 - Um dia na loja']
S[0] = slide(0, n, 'navy', f'''{gap(30)}{eb('08h → 18h')}{gap(20)}
<div class="h xl">Um dia inteiro sem ninguém perguntar <span class="hl">“cadê o pedido?”</span></div>
{A(560, 560, lock_phone([n_wq('Pedido #0048 entrou · etiqueta impressa', '08:10'), n_wq('Limpeza puxou 6 pedidos da fila', '10:30'), n_wa('Seu pedido #0048 ficou pronto! ✅', '14:20'), n_wq('Orçamento do Rafael voltou: R$ 640', '16:00'), n_wq('Caixa do dia fechado: R$ 3.480', '18:00')], '18:00'), 'zoom:1.0')}
<div class="sp"></div><div class="p" style="max-width:440px;margin-bottom:90px">Arraste e veja como fica a sua loja com a Worqera.</div>{ILL}''')
S[5] = slide(5, n, 'navy', f'''{gap(40)}<div style="color:#C99BFF" class="big mono">{''}<span style="font-size:120px;letter-spacing:-.05em">18:00</span></div>{gap(16)}
<div class="h">O dono fecha o dia sem planilha.</div>{gap(40)}
{chart_card([22, 30, 27, 41, 38, 52, 49, 63, 70, 66, 81, 92], '#22C55E', 'Caixa do dia', 'R$ 3.480', '▲ 18%', '#16A34A', w=936, h=230, gid='c6')}{gap(24)}
<div style="display:flex;gap:16px">{''.join(f'<div class="dcard" style="flex:1;padding:26px 28px"><div style="font-size:21px;opacity:.75">{t}</div><div class="big" style="font-size:52px;margin-top:8px;color:{c}">{v}</div></div>' for t, v, c in [('A receber', 'R$ 1.260', '#C99BFF'), ('Pedidos entregues', '14', '#fff')])}</div>
<div class="sp"></div><div style="font-size:19px;opacity:.55;padding-bottom:10px">valores ilustrativos</div>''')
S[6] = slide(6, n, 'purple', f'''{gap(30)}{btn_block('Menos telefone. <span class="hl">Mais pedido entregue.</span>', 'Teste grátis por 7 dias. Implantação completa em até 12x.')}
{A(560, 760, lock_phone([n_wa('Seu pedido #0048 ficou pronto! ✅'), n_wa('Obrigado pela visita! Avalie em 1 toque ⭐', 'agora')], '14:20'), 'zoom:.85')}
{A(72, 940, chip('PhoneCall', 'Zero “já ficou pronto?”', '#fff', '#6D28D9'), 'z-index:5')}''', arrow=False)

for name, (n, S) in posts.items():
    open(os.path.join(gen3.HERE, 'html', name.replace(' ', '_') + '.html'), 'w').write(doc(n, S))
print('v4 ok')
