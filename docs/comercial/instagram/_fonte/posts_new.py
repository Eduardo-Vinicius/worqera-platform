from lib import *
from mocks2 import *

def H2(a, b, ca='w', cb='a', size='m'):
    return f'<div class="h {size}"><span class="{ca}">{a}</span><br><span class="{cb}">{b}</span></div>'

def lead(t, mw=880):
    return f'<div class="lead" style="max-width:{mw}px">{t}</div>'

def ab(x, y, inner, extra=''):
    return f'<div style="position:absolute;left:{x}px;top:{y}px;{extra}">{inner}</div>'

def notif(title, msg, when='agora', w=420):
    return (f'<div class="notif" style="width:{w}px;background:rgba(255,255,255,.94)"><div class="wa">{ic("MessageCircle")}</div><div style="flex:1;min-width:0">'
            f'<div style="display:flex;justify-content:space-between"><b style="font-size:16px">{title}</b><span style="font-size:13px;color:#64748B">{when}</span></div>'
            f'<div style="font-size:15.5px;line-height:1.35;margin-top:3px;color:#1E293B">{msg}</div></div></div>')

def ai_chip(t, w=460):
    return (f'<div style="width:{w}px;border-radius:22px;padding:2px;background:linear-gradient(135deg,#F0ABFC,#8B5CF6,#22D3EE);box-shadow:0 30px 60px -20px rgba(0,0,0,.8),0 0 60px -10px rgba(217,70,239,.6)">'
            f'<div style="border-radius:20px;background:#120F20;padding:16px 18px;display:flex;gap:12px;align-items:center"><span style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#E879F9,#7C3AED);display:flex;align-items:center;justify-content:center;flex:none">{ic("Sparkles",22)}</span>'
            f'<div><div class="mono" style="font-size:12px;letter-spacing:.12em;color:#F0ABFC;font-weight:700">RESUMO DO DIA · IA</div><div style="font-size:17px;font-weight:600;margin-top:3px;line-height:1.35">{t}</div></div></div></div>')

def cta_block(main, sub, btn):
    return f'''<div class="sp"></div>
<div style="display:flex;justify-content:center;margin-bottom:40px"><img src="assets/worqera-logo.png" style="width:140px;height:140px;border-radius:36px;box-shadow:0 0 0 1px rgba(255,255,255,.15),0 30px 100px -10px rgba(168,85,247,.9)"></div>
<div class="h" style="text-align:center">{main}</div>{gap(30)}
<div class="lead" style="text-align:center">{sub}</div>{gap(52)}
<div style="display:flex;flex-direction:column;align-items:center;gap:18px"><span class="cta">{btn} {ic("ArrowRight")}</span></div>
<div class="sp"></div><div style="height:80px"></div>'''

def partners(compact=False):
    s = 80 if compact else 96
    return ''.join(f'<div class="logo-c" style="flex:1"><img src="assets/{img}" style="width:{s}px;height:{s}px"><div><div style="font-size:{26 if compact else 30}px;font-weight:800;letter-spacing:-.02em">{n}</div><div style="font-size:19px;color:#A9A6BF;margin-top:2px">{d}</div></div></div>'
                   for img, n, d in [('p24-3.png', 'Casa do Tênis', 'Av. Paulista · SP'), ('p24-4.png', 'Sapataria Paulista', 'São Paulo')])

# ============================================================ POST 4 · PRINCIPAL
N = 13
L = ''.join([glow(540, 160, 1400, 'rgba(124,58,237,.6)'), glow(1600, 900, 1200, 'rgba(16,185,129,.28)'), glow(2700, 300, 1200, 'rgba(147,51,234,.4)'),
             glow(3800, 400, 1200, 'rgba(139,92,246,.42)'), glow(4900, 300, 1200, 'rgba(59,130,246,.38)'), glow(6000, 400, 1200, 'rgba(6,182,212,.35)'),
             glow(7100, 400, 1200, 'rgba(16,185,129,.32)'), glow(8200, 300, 1200, 'rgba(59,130,246,.38)'), glow(9300, 300, 1200, 'rgba(16,185,129,.34)'),
             glow(10400, 300, 1200, 'rgba(245,158,11,.3)'), glow(11500, 300, 1300, 'rgba(217,70,239,.45)'), glow(12600, 400, 1200, 'rgba(139,92,246,.42)'),
             glow(13500, 500, 1300, 'rgba(168,85,247,.55)')])
S = []
# 1 · capa
S.append(slide(0, N, f'''{gap(40)}<div class="badge">{ic("TrendingUp",24,"#6EE7B7")}<b>R$ 1 milhão+</b> em pedidos na plataforma</div>{gap(30)}
<div class="h l"><span class="w">Pare de perder</span><br><span class="w">pedido, cliente</span><br><span class="a">e dinheiro.</span></div>
{ab(250, 690, kanban_window(1100, 560), 'transform:perspective(2000px) rotateY(-18deg) rotateX(8deg);transform-origin:left top;opacity:.95')}
{ab(-30, 740, label(400), 'transform:rotate(-8deg);z-index:7')}
{ab(390, 470, ai_chip('12 prontos, 3 orçamentos para ligar e R$ 3.480 no caixa.', 430), 'z-index:8;transform:rotate(2deg);zoom:1.25')}
{ab(410, 1000, notif('Sua empresa', 'Seu pedido #0048 ficou pronto! ✅', 'agora', 400), 'z-index:8;transform:rotate(-2deg)')}
<div style="position:absolute;left:-72px;right:-72px;bottom:-64px;height:220px;background:linear-gradient(180deg,rgba(7,6,14,0),#07060E 80%);z-index:9"></div>'''))
# 2 · prova
S.append(slide(1, N, f'''{gap(40)}{tagc('Prova real, não promessa', 'g')}{gap(30)}
<div class="mega ag" style="font-size:250px">R$ 1 mi+</div>{gap(22)}
<div class="h s"><span class="w">em pedidos criados direto<br>na Worqera.</span></div>{gap(56)}
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
{''.join(f'<div class="gl" style="padding:34px 26px;background:rgba(14,12,26,.7)"><div class="k w" style="font-size:58px;line-height:1">{v}</div><div style="font-size:21px;color:#A9A6BF;margin-top:10px;line-height:1.3">{t}</div></div>' for v, t in [('1.000+', 'pedidos criados na plataforma'), ('7.000+', 'pedidos do histórico importado'), ('6.000+', 'clientes na base')])}
</div>{gap(16)}
<div style="display:flex;gap:14px">{partners(True)}</div>'''))
# 3 · bento
S.append(slide(2, N, f'''{gap(30)}{tagc('Tudo numa plataforma')}{gap(24)}
{H2('Tudo que sua loja precisa.', 'Num sistema só.', size='s')}{gap(34)}{bento()}'''))
# 4 · setores
S.append(slide(3, N, f'''{gap(30)}{tagc('01 · Setores')}{gap(24)}
{H2('Cada um sabe', 'o que fazer agora.')}{gap(20)}
{lead('Setores do seu jeito, com login próprio e só a fila de cada um. <b>Acabou o “isso é com quem?”.</b>')}{gap(36)}
{sector_lanes()}{gap(20)}
<div style="display:flex;gap:12px;flex-wrap:wrap"><span class="pill">{ic("ShieldCheck")}Login por setor</span><span class="pill">{ic("MessageCircle")}Fora do fluxo pede comentário</span></div>'''))
# 5 · kanban
S.append(slide(4, N, f'''{gap(30)}{tagc('02 · Kanban', 'b')}{gap(24)}
{H2('Nenhum pedido', 'fica pra trás.', cb='ab')}{gap(20)}
{lead('Atrasados, vence hoje e vence amanhã sempre no topo. <b>Você vê o problema antes do cliente.</b>')}
{ab(0, 380, kanban_window(1100, 600), 'zoom:1.3')}
{ab(540, 850, tv_mock(400, 230), 'transform:rotate(3deg);z-index:7')}
<div style="position:absolute;left:-72px;right:-72px;bottom:-64px;height:160px;background:linear-gradient(180deg,rgba(7,6,14,0),#07060E 85%);z-index:6"></div>'''))
# 6 · QR
beam = '<div style="position:absolute;left:-20px;right:-20px;top:46%;height:4px;background:#22D3EE;box-shadow:0 0 30px 8px rgba(34,211,238,.7);border-radius:2px"></div>'
corners = ''.join(f'<span style="position:absolute;{p};width:60px;height:60px;border-color:#22D3EE;border-style:solid;border-width:{b}"></span>' for p, b in
                  [('left:-26px;top:-26px', '6px 0 0 6px'), ('right:-26px;top:-26px', '6px 6px 0 0'), ('left:-26px;bottom:-26px', '0 0 6px 6px'), ('right:-26px;bottom:-26px', '0 6px 6px 0')])
S.append(slide(5, N, f'''{gap(30)}{tagc('03 · QR Code', 'c')}{gap(24)}
{H2('Escaneou.', 'Abriu. Moveu.', cb='ac')}{gap(20)}
{lead('Cada pedido sai com etiqueta e QR. A equipe escaneia e move de setor em 1 toque. <b>Zero papel, zero pedido sumido.</b>', 520)}
{ab(40, 520, '<div style="position:relative;width:380px;height:380px;background:#fff;border-radius:28px;padding:26px;box-shadow:0 0 120px -10px rgba(34,211,238,.6)">' + qr_svg(11) + beam + corners + '</div>', 'transform:rotate(-5deg)')}
{ab(560, 250, app_order(), 'transform:rotate(4deg) scale(.95)')}'''))
# 7 · acompanhar
S.append(slide(6, N, f'''{gap(30)}{tagc('04 · Acompanhamento', 'g')}{gap(24)}
{H2('O telefone', 'para de tocar.', cb='ag')}{gap(20)}
{lead('O cliente vê cada etapa pelo QR, recebe o aviso no pronto e avalia em 1 toque. <b>Sem baixar app.</b>', 480)}
{ab(560, 330, tracking_phone(), 'zoom:.94')}
{ab(0, 760, notif('Sua empresa', 'Seu pedido #0048 ficou pronto! Pode retirar quando quiser. ✅', 'agora', 470), 'transform:rotate(-3deg);z-index:7')}
{ab(20, 950, '<span class="pill">' + ic("ShieldCheck") + 'Mais confiança, menos ligação</span>')}'''))
# 8 · dashboard
S.append(slide(7, N, f'''{gap(30)}{tagc('05 · Dashboard', 'b')}{gap(24)}
{H2('Sua loja inteira', 'em 5 segundos.', cb='ab')}{gap(20)}
{lead('Atrasos, prazos, fila por setor e quem mais produziu. <b>Decida com número, não no achismo.</b>')}{ILL}
{ab(0, 410, overview_window(936, 700))}'''))
# 9 · financeiro
S.append(slide(8, N, f'''{gap(30)}{tagc('06 · Financeiro', 'g')}{gap(24)}
{H2('Saiba quanto entra', 'e quem te deve.', cb='ag')}{gap(20)}
{lead('Caixa do dia, a receber e os serviços que mais vendem. <b>Chega de descobrir no fim do mês.</b>')}{ILL}
{ab(0, 410, dash_window(936, 690))}'''))
# 10 · CRM
S.append(slide(9, N, f'''{gap(30)}{tagc('07 · CRM', 'a')}{gap(24)}
{H2('Orçamento perdido', 'vira venda.', cb='aa')}{gap(20)}
{lead('Cada orçamento tem etapa, dia de retorno e mensagem pronta. <b>Um recuperado no mês já paga o plano.</b>')}{ILL}
{ab(0, 430, crm_pipeline(760, 470), 'zoom:1.23')}'''))
# 11 · IA
S.append(slide(10, N, f'''{gap(30)}{tagc('08 · Análise com IA', 'f')}{gap(24)}
{H2('A IA te diz', 'o que fazer hoje.', cb='af')}{gap(20)}
{lead('Toda manhã, o resumo do dia. Toda semana, onde você ganhou e onde perdeu. <b>Com a sugestão pronta.</b>')}{ILL}
{ab(0, 420, ai_panel('Análise da semana', 'seg 10/11 → dom 16/11', [
    ('Package', '#A78BFA', '38 pedidos entregues, R$ 9.840 no total, ticket de R$ 259.'),
    ('Clock', '#34D399', '94% saiu no prazo; 2 pedidos estão atrasados agora.'),
    ('Layers', '#FCD34D', 'Setor mais cheio: Costura (11).'),
    ('Target', '#FB7185', 'Motivo que mais fez perder orçamento: Preço (3).'),
    ('RefreshCw', '#22D3EE', '2 orçamentos recuperados: R$ 480.')], 936, 'reforçar a Costura na terça e ligar hoje para os 3 orçamentos em retorno.'))}
'''))
# 12 · implantação
steps = [('Settings', 'Configuração', 'Setores, serviços, equipe e a sua marca.'), ('DatabaseBackup', 'Histórico', 'Clientes e pedidos do sistema antigo, importados.'),
         ('ClipboardCheck', '1 semana de homologação', 'Operamos com pedidos reais junto com você.'), ('GraduationCap', 'Treinamento', 'Balcão, produção e gestão, cada um no seu papel.')]
st = ''.join(f'''<div style="display:flex;gap:28px"><div style="display:flex;flex-direction:column;align-items:center">{icb(i, 'v', 72, 34, 36)}{'' if k == 3 else '<div style="width:2px;flex:1;background:linear-gradient(180deg,rgba(192,132,252,.7),rgba(192,132,252,.1));margin:8px 0"></div>'}</div>
<div style="padding-bottom:40px"><div class="mono" style="font-size:18px;color:#A78BFA;font-weight:700">ETAPA {k+1}</div><div style="font-size:40px;font-weight:800;letter-spacing:-.03em;margin-top:4px">{t}</div><div style="font-size:26px;color:#A9A6BF;margin-top:6px">{d}</div></div></div>''' for k, (i, t, d) in enumerate(steps))
S.append(slide(11, N, f'''{gap(30)}{tagc('Implantação completa')}{gap(24)}
{H2('A gente implanta.', 'Você só opera.')}<div class="sp"></div>{st}
<div class="gl" style="display:flex;gap:16px;padding:24px 28px;align-items:center;border-color:rgba(74,222,128,.3);background:linear-gradient(90deg,rgba(74,222,128,.1),rgba(255,255,255,.02))">{ic("Headphones",34,"#86EFAC")}<span style="font-size:28px;font-weight:600">30 dias de suporte direto no WhatsApp</span></div><div style="height:120px"></div>'''))
# 13 · CTA
S.append(slide(12, N, cta_final('<span class="w">Sua loja nesse nível?</span><br><span class="a">Bora conversar.</span>', [
    'Sistema completo: pedidos, setores, QR, CRM e IA',
    'App da equipe e acompanhamento do cliente',
    'Implantação completa em até 12x',
    'Um orçamento recuperado no mês já paga o plano']), last=True))
posts['post-4-servicos-principal'] = doc(N, L, ''.join(S))

# ============================================================ POST 5 · NÚMEROS
N = 6
pts = [(0, 1190), (300, 1150), (600, 1165), (900, 1060), (1200, 1030), (1500, 930), (1800, 950), (2160, 760)]
path = 'M ' + ' L '.join(f'{x},{y}' for x, y in pts)
chart = f'''<svg style="position:absolute;left:0;top:0;z-index:3" width="{2*W}" height="{H}" viewBox="0 0 {2*W} {H}">
<defs><linearGradient id="lg" x1="0" x2="1"><stop offset="0" stop-color="#059669" stop-opacity=".2"/><stop offset=".5" stop-color="#34D399"/><stop offset="1" stop-color="#D1FAE5"/></linearGradient>
<linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10B981" stop-opacity=".3"/><stop offset="1" stop-color="#10B981" stop-opacity="0"/></linearGradient>
<filter id="gf"><feGaussianBlur stdDeviation="8"/></filter></defs>
<path d="{path} L 2160,1350 L 0,1350 Z" fill="url(#fl)"/><path d="{path}" stroke="url(#lg)" stroke-width="14" fill="none" filter="url(#gf)" opacity=".7"/>
<path d="{path}" stroke="url(#lg)" stroke-width="5" fill="none" stroke-linejoin="round"/></svg>'''
L = ''.join([glow(500, 250, 1400, 'rgba(16,185,129,.38)'), glow(900, 100, 900, 'rgba(124,58,237,.45)'), glow(1700, 700, 1200, 'rgba(16,185,129,.28)'),
             glow(2700, 300, 1200, 'rgba(124,58,237,.42)'), glow(3800, 400, 1200, 'rgba(99,102,241,.38)'), glow(4900, 300, 1200, 'rgba(147,51,234,.4)'),
             glow(5900, 500, 1300, 'rgba(168,85,247,.55)')]) + chart
S = []
S.append(slide(0, N, f'''{gap(70)}{tagc('Números reais', 'g')}{gap(34)}
<div class="mega ag" style="font-size:330px">R$ 1</div><div class="mega ag" style="font-size:232px;padding-bottom:20px">milhão+</div>{gap(30)}
<div class="h s"><span class="w">em pedidos criados direto<br>na Worqera.</span></div>{gap(20)}
<div class="lead">E isso sem contar o histórico importado.</div>'''))
codes = ''.join(f'<span class="mono" style="font-size:24px;font-weight:600;padding:9px 14px;border-radius:10px;background:rgba(255,255,255,{.03 + (k % 7) * .012});border:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,{.25 + (k % 5) * .12})">#{1000 - k * 7:04d}</span>' for k in range(40))
S.append(slide(1, N, f'''{gap(40)}{tagc('Pedidos', 'v')}{gap(28)}
<div class="mega a" style="font-size:260px">1.000+</div>{gap(16)}
<div class="h s"><span class="w">pedidos criados na plataforma.</span></div>{gap(40)}
<div style="display:flex;flex-wrap:wrap;gap:10px;-webkit-mask-image:linear-gradient(180deg,#000 30%,transparent)">{codes}</div>'''))
S.append(slide(2, N, f'''{gap(40)}{tagc('Base', 'c')}{gap(28)}
{H2('Troque de sistema', 'sem perder nada.', cb='ac')}{gap(60)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="gl" style="padding:44px 34px;background:rgba(14,12,26,.72)">{icb('DatabaseBackup', 'c')}<div class="k ac" style="font-size:100px;margin-top:40px;line-height:1">7.000+</div><div style="font-size:24px;color:#A9A6BF;margin-top:12px">pedidos importados do sistema antigo</div></div>
<div class="gl" style="padding:44px 34px;background:rgba(14,12,26,.72)">{icb('Users', 'v')}<div class="k a" style="font-size:100px;margin-top:40px;line-height:1">6.000+</div><div style="font-size:24px;color:#A9A6BF;margin-top:12px">clientes com histórico completo</div></div>
<div class="gl" style="grid-column:span 2;padding:40px 34px;background:rgba(14,12,26,.72);display:flex;align-items:center;gap:26px">{icb('TrendingUp', 'g')}<div><div class="k ag" style="font-size:64px;line-height:1">700+ <span style="font-family:Inter;font-size:28px;font-weight:600;color:#A9A6BF;-webkit-text-fill-color:#A9A6BF">pedidos por mês</span></div></div></div>
</div>{gap(30)}{lead('A implantação traz seus clientes e pedidos antigos. <b>Você começa no dia 1 com tudo lá.</b>')}'''))
def quote(img, q, who, role):
    return f'''<div class="gl" style="padding:40px 42px;margin-bottom:22px;background:rgba(14,12,26,.75)">
<div class="star" style="display:flex;gap:6px;color:#FBBF24">{ic("Star",30)*5}</div>
<div style="font-size:38px;font-weight:700;line-height:1.25;letter-spacing:-.025em;margin-top:18px">“{q}”</div>
<div style="display:flex;align-items:center;gap:16px;margin-top:24px"><img src="assets/{img}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;background:#fff">
<div><div style="font-size:23px;font-weight:700">{who}</div><div style="font-size:19px;color:#A9A6BF">{role}</div></div></div></div>'''
S.append(slide(3, N, f'''{gap(40)}{tagc('Parceiros', 'a')}{gap(28)}
{H2('Donos de loja', 'falando por nós.', cb='aa')}{gap(40)}
{quote('p24-3.png', 'O que revolucionou não foi a tela — foi o setor. Cada um vê a própria fila.', 'Junior Ribeiro', 'Sócio · Casa do Tênis')}
{quote('p24-4.png', 'Hoje tem código, setor e prazo. A equipe produz mais porque não perde tempo procurando.', 'Thiago Landes', 'Sócio · Sapataria Paulista')}'''))
segs = [('Store', 'Sapatarias'), ('Sparkles', 'Lavanderias'), ('Wrench', 'Assistências técnicas'), ('Layers', 'Ateliês'), ('Settings', 'Oficinas'), ('Package', 'Lojas de serviço')]
S.append(slide(4, N, f'''<div class="sp"></div>{tagc('De onde veio')}{gap(32)}
<div class="h"><span class="w">Nasceu no balcão.</span><br><span class="a">Cresceu com</span><br><span class="a">quem opera.</span></div>{gap(36)}
{lead('Cada recurso existe porque alguém precisou dele <b>numa segunda-feira cheia</b>. Hoje roda em operações de verdade.')}{gap(40)}
<div style="display:flex;gap:12px;flex-wrap:wrap">{''.join('<span class="pill">' + ic(i) + t + '</span>' for i, t in segs)}</div><div class="sp"></div><div style="height:90px"></div>'''))
S.append(slide(5, N, cta_final('<span class="w">A próxima loja</span><br><span class="ag">pode ser a sua.</span>', [
    'Teste grátis por 7 dias, sem cartão',
    'Seu histórico de clientes e pedidos importado',
    'Implantação com a gente do lado, do dia 1 ao 30',
    'Preço por empresa, sem custo por pessoa']), last=True))
posts['post-5-numeros-reais'] = doc(N, L, ''.join(S))

# ============================================================ POST 8 · CRM + IA
N = 7
L = ''.join([glow(540, 300, 1400, 'rgba(217,70,239,.45)'), glow(800, 1000, 900, 'rgba(34,211,238,.25)'), glow(1600, 300, 1200, 'rgba(217,70,239,.38)'),
             glow(2700, 400, 1200, 'rgba(139,92,246,.42)'), glow(3800, 300, 1200, 'rgba(16,185,129,.3)'), glow(4900, 300, 1200, 'rgba(245,158,11,.3)'),
             glow(6000, 300, 1200, 'rgba(245,158,11,.3)'), glow(7000, 500, 1300, 'rgba(168,85,247,.55)')])
S = []
S.append(slide(0, N, f'''{gap(60)}{tagc('CRM + Inteligência artificial', 'f')}{gap(34)}
<div class="h l"><span class="w">Seu sistema</span><br><span class="w">não só guarda.</span><br><span class="af">Ele pensa.</span></div>{gap(30)}
{lead('Resumo do dia, análise da semana, cobrança e clientes que voltam. <b>Tudo escrito pra você.</b>', 820)}
{ab(0, 560, ai_chip('Hoje: 12 prontos e 3 orçamentos para ligar. 2 pedidos vencem amanhã na Costura.', 620), 'transform:rotate(-3deg);zoom:1.5')}
{ab(300, 860, notif('Sua empresa', 'Oi, Rafael! Faz uns 3 meses que você não aparece, sentimos sua falta!', 'agora', 470), 'transform:rotate(2deg);zoom:1.15')}'''))
S.append(slide(1, N, f'''{gap(30)}{tagc('IA · Toda manhã', 'f')}{gap(24)}
{H2('Chegou na loja,', 'já sabe o que fazer.', cb='af')}{gap(20)}
{lead('O dono vê dinheiro e prioridades. Cada setor vê <b>só o que é dele</b>.')}{ILL}
{ab(0, 400, ai_panel('Resumo do dia', 'sexta, 14/11 · 08:00', [
    ('CheckCircle2', '#34D399', '12 pedidos prontos para avisar e retirar.'),
    ('AlertTriangle', '#FB7185', '2 atrasados na Limpeza: #0412 e #0419.'),
    ('PhoneCall', '#FCD34D', '3 orçamentos em retorno para ligar hoje.'),
    ('Wallet', '#A78BFA', 'R$ 1.260 a receber em 9 pedidos.')], 936, 'comece pelos 2 atrasados da Limpeza e avise os 12 prontos antes do almoço.'))}
'''))
S.append(slide(2, N, f'''{gap(30)}{tagc('IA · Toda semana', 'v')}{gap(24)}
{H2('Descubra onde', 'você perde dinheiro.')}{gap(20)}
{lead('Faturamento, prazo, setor gargalo e por que você perdeu orçamento. <b>Com a sugestão do que fazer.</b>')}{ILL}
{ab(0, 400, ai_panel('Análise da semana', 'seg 10/11 → dom 16/11', [
    ('Package', '#A78BFA', '38 pedidos entregues, R$ 9.840, ticket de R$ 259.'),
    ('Clock', '#34D399', '94% saiu no prazo; 2 atrasados agora.'),
    ('Layers', '#FCD34D', 'Setor mais cheio: Costura (11).'),
    ('Target', '#FB7185', 'Mais perdeu orçamento por: Preço (3).'),
    ('RefreshCw', '#22D3EE', '2 orçamentos recuperados: R$ 480.')], 936, 'reforçar a Costura na terça e oferecer parcelamento nos orçamentos de restauração.'))}
'''))
rows_cob = ''.join(f'<div style="display:flex;justify-content:space-between;padding:16px 0;border-top:1px solid rgba(255,255,255,.08);font-size:25px"><span>{n}</span><b class="mono" style="color:{c}">{v}</b></div>' for n, v, c in [('Helena · pronto há 2 dias', 'R$ 80', '#FCD34D'), ('Rafael · entregue há 12 dias', 'R$ 240', '#FB7185'), ('Paula · em produção', 'R$ 150', '#A9A6BF')])
cob = f'''<div style="width:936px">
<div class="gl" style="padding:32px 34px;background:rgba(14,12,26,.8)"><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div class="mono" style="font-size:17px;letter-spacing:.12em;color:#6EE7B7;font-weight:700">A RECEBER</div><div class="k ag" style="font-size:84px;margin-top:8px;line-height:1">R$ 1.260</div></div><div style="font-size:23px;color:#A9A6BF;text-align:right;padding-bottom:6px">9 pedidos<br>4 clientes com saldo</div></div>
<div style="margin-top:20px">{rows_cob}</div></div>
<div style="display:flex;gap:16px;margin-top:18px;align-items:stretch">
<div style="zoom:1.2">{notif('Sua empresa', 'Oi, Helena! Seu pedido está pronto para retirada! Fica um saldo de R$ 80,00, pode acertar na retirada ou por Pix.', 'agora', 400)}</div>
<div style="flex:1;border-radius:20px;padding:22px 24px;background:linear-gradient(90deg,rgba(217,70,239,.16),rgba(124,58,237,.12));border:1px solid rgba(240,171,252,.3);font-size:24px;line-height:1.4"><span style="color:#F5D0FE;font-weight:700">IA:</span> priorize o Rafael. Entregue há 12 dias, maior saldo da semana.</div></div></div>'''
S.append(slide(3, N, f'''{gap(30)}{tagc('IA · Cobrança', 'g')}{gap(24)}
{H2('Receba o que', 'te devem.', cb='ag')}{gap(20)}
{lead('Quem deve, quanto e desde quando. A mensagem de cobrança <b>sai pronta e educada</b>, no WhatsApp.')}{ILL}
{ab(0, 430, cob)}'''))
S.append(slide(4, N, f'''{gap(30)}{tagc('CRM · Clientes', 'a')}{gap(24)}
{H2('Cliente sumido', 'vira venda de novo.', cb='aa')}{gap(20)}
{lead('Novos, recorrentes, inativos há 90 dias, aniversariantes e quem tem saldo. <b>Cada um com a mensagem certa.</b>')}{ILL}
{ab(0, 400, crm_clients(760, 500), 'zoom:1.23')}'''))
S.append(slide(5, N, f'''{gap(30)}{tagc('CRM · Orçamentos', 'a')}{gap(24)}
{H2('Orçamento recusado', 'não é venda perdida.', cb='aa')}{gap(20)}
{lead('Dia certo pra ligar, mensagem pronta e o motivo de cada perda. <b>Um recuperado já paga o plano.</b>')}{ILL}
{ab(0, 430, crm_pipeline(760, 470), 'zoom:1.23')}'''))
S.append(slide(6, N, cta_final('<span class="w">Menos achismo.</span><br><span class="af">Mais decisão.</span>', [
    'Resumo do dia e análise da semana com IA',
    'Cobrança com mensagem pronta',
    'CRM de clientes e de orçamentos',
    'Um orçamento recuperado no mês já paga o plano'], note='Quer ver a IA lendo a sua operação? A gente te chama no direct.'), last=True))
posts['post-8-crm-ia'] = doc(N, L, ''.join(S))
