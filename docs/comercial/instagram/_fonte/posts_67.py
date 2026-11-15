from lib import *
from mocks2 import cta_final, ig_comment
# ============================================================ POST 6 · UM DIA NA LOJA
N = 7
TRACK_Y = 1190
times = [(1, '08:10', 'Entrada'), (2, '10:30', 'Produção'), (3, '14:20', 'Pronto'), (4, '16:00', 'Orçamento'), (5, '18:00', 'Fechamento')]
track = f'<div style="position:absolute;left:560px;width:{6*W-560+300}px;top:{TRACK_Y}px;height:3px;background:linear-gradient(90deg,rgba(192,132,252,0),rgba(192,132,252,.85) 6%,rgba(129,140,248,.85) 94%,rgba(129,140,248,0));z-index:3"></div>'
for i, t, nm in times:
    x = i*W + 72
    track += f'''<div style="position:absolute;left:{x}px;top:{TRACK_Y-15}px;width:32px;height:32px;border-radius:50%;background:#0B0916;border:3px solid #C084FC;box-shadow:0 0 24px 4px rgba(192,132,252,.6);z-index:4"></div>
<div class="mono" style="position:absolute;left:{x+50}px;top:{TRACK_Y-58}px;font-size:30px;font-weight:700;z-index:4">{t}<span style="font-family:Inter;font-weight:500;font-size:22px;color:#A9A6BF;margin-left:14px">{nm}</span></div>'''
sun = f'<div style="position:absolute;left:{W*0+780}px;top:{TRACK_Y-120}px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle,#FDE68A,#F59E0B 50%,transparent 70%);opacity:.5;filter:blur(6px);z-index:2"></div>'
L = ''.join([glow(400, 200, 1200, 'rgba(124,58,237,.5)'), glow(800, 1150, 700, 'rgba(245,158,11,.3)'), glow(1700, 500, 1100, 'rgba(147,51,234,.35)'),
             glow(2800, 300, 1100, 'rgba(99,102,241,.35)'), glow(3900, 400, 1100, 'rgba(34,197,94,.18)'), glow(4900, 400, 1100, 'rgba(147,51,234,.35)'),
             glow(6000, 300, 1100, 'rgba(99,102,241,.4)'), glow(6800, 900, 1100, 'rgba(168,85,247,.45)')]) + track
S = []
S.append(slide(0, N, f'''<div class="sp"></div>{tag('08:00 → 18:00')}{gap(36)}
<div class="h l"><span class="w">Um dia na loja.</span><br><span class="a">Sem ninguém<br>perguntar</span><br><span class="w">“cadê o pedido?”</span></div>{gap(36)}
<div class="lead">Arraste e acompanhe o dia →</div><div class="sp"></div><div style="height:160px"></div>'''))
S.append(slide(1, N, f'''{gap(50)}{tag('08:10 · Entrada')}{gap(28)}
<div class="h m"><span class="w">O pedido entra.</span><br><span class="a">A etiqueta sai.</span></div>{gap(22)}
<div class="lead" style="max-width:860px">Cliente, itens, fotos e prazo numa tela só. O QR vai junto com o par.</div>
<div style="position:absolute;left:60px;top:500px;transform:rotate(-4deg)">{label(560)}</div>
{callout(560, 860, 'Fotos de como entrou', 'Camera')}
{callout(380, 950, 'Prazo definido na entrada', 'Calendar')}'''))
S.append(slide(2, N, f'''{gap(50)}{tag('10:30 · Produção')}{gap(28)}
<div class="h m"><span class="w">Cada setor</span><br><span class="a">puxa o que é dele.</span></div>{gap(22)}
<div class="lead" style="max-width:860px">Ninguém precisa perguntar. A fila mostra o que fazer agora.</div>
<div style="position:absolute;left:0;top:470px">{kanban_window(1100, 560)}</div>'''))
S.append(slide(3, N, f'''{gap(50)}{tag('14:20 · Pronto')}{gap(28)}
<div class="h m"><span class="w">Ficou pronto.</span><br><span class="a">Ela já sabe.</span></div>{gap(22)}
<div class="lead" style="max-width:480px">O aviso sai no WhatsApp e a cliente confere tudo pelo link.</div>
<div style="position:absolute;right:20px;top:250px;transform:scale(.92);transform-origin:top right">{wa_lock([("Sua empresa","Oi, Marina! Recebemos seu pedido #0048, previsão sex, 14/11.","08:10"),("Sua empresa","Seu pedido #0048 ficou pronto! Pode retirar quando quiser. ✅","agora")])}</div>
<div class="gl" style="position:absolute;left:0;top:560px;width:440px;padding:24px 26px;background:rgba(14,12,26,.8)"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:20px;color:#A9A6BF">Marina respondeu</span><span class="mono" style="font-size:16px;color:#86EFAC">14:22</span></div><div style="font-size:30px;font-weight:700;margin-top:8px">“Oba! Passo aí às 18h”</div></div>'''))
S.append(slide(4, N, f'''{gap(50)}{tag('16:00 · Orçamento')}{gap(28)}
<div class="h m"><span class="w">O orçamento</span><br><span class="a">vira dinheiro.</span></div>{gap(22)}
<div class="lead" style="max-width:880px">Quem não fechou ganha dia pra ligar e mensagem pronta. <b>Um recuperado no mês já paga o plano.</b></div>
<div style="position:absolute;left:20px;top:340px;zoom:1.42;transform:rotate(-2deg)">{crm_card(600)}</div>'''))
S.append(slide(5, N, f'''{gap(50)}{tag('18:00 · Fechamento')}{gap(28)}
<div class="h m"><span class="w">O dono fecha o dia</span><br><span class="a">sem planilha.</span></div>{gap(22)}
<div class="lead" style="max-width:880px">Caixa, a receber, quem deve e o que fazer amanhã.</div>
{ILL}<div style="position:absolute;left:0;top:425px;zoom:.92">{dash_window(1020, 690)}</div>'''))
S.append(slide(6, N, cta_final('<span class="w">Menos telefone.</span><br><span class="a">Mais pedido entregue.</span>', [
    'Etiqueta com QR e cliente acompanhando sozinho',
    'Kanban por setor e aviso automático no pronto',
    'Orçamentos que voltam e caixa fechado na hora',
    'Implantação completa em até 12x'], note='Quer um dia assim na sua loja? A gente te chama no direct.'), last=True))
posts['post-6-um-dia-na-loja'] = doc(N, L, ''.join(S))

# ============================================================ POST 7 · 5 SINAIS
N = 7
sinais = [
 ('Ninguém sabe dizer, agora, quantos pedidos estão atrasados.', 'Atrasados, vence hoje e vence amanhã no topo do kanban.', 'AlertTriangle', 'chips'),
 ('O telefone toca o dia todo com “já ficou pronto?”', 'O cliente acompanha pelo QR e recebe o aviso no pronto.', 'PhoneCall', 'wa'),
 ('Tem pedido pronto esquecido na prateleira.', 'Prateleira com “parado há 3+ dias” e botão de avisar.', 'Archive', 'shelf'),
 ('Orçamento recusado nunca mais é retomado.', 'CRM com dia de retorno e mensagem pronta no WhatsApp.', 'RefreshCw', 'crm'),
 ('O caixa só fecha na planilha de domingo.', 'Caixa do dia, a receber e quem deve, na hora.', 'FileSpreadsheet', 'cash'),
]
def mini(kind):
    if kind == 'chips':
        return '<div style="display:flex;gap:12px">' + ''.join(f'<div style="flex:1;background:#fff;border-radius:16px;padding:18px;color:#0F172A"><div style="font-size:16px;font-weight:600;color:{c}">{t}</div><div class="k" style="font-size:52px;margin-top:4px;color:{c2}">{v}</div></div>' for t,v,c,c2 in [("Atrasados","2","#B91C1C","#B91C1C"),("Vencem hoje","5","#92400E","#0F172A"),("Amanhã","8","#475569","#0F172A")]) + '</div>'
    if kind == 'wa':
        return f'<div class="notif" style="background:#fff"><div class="wa">{ic("MessageCircle")}</div><div><div style="display:flex;justify-content:space-between"><b style="font-size:17px">Sua empresa</b><span style="font-size:14px;color:#64748B">agora</span></div><div style="font-size:18px;margin-top:4px">Seu pedido #0048 ficou pronto! Pode retirar quando quiser. ✅</div></div></div>'
    if kind == 'shelf':
        return '<div style="background:#fff;border-radius:18px;padding:16px;color:#0F172A">' + ''.join(f'<div style="display:flex;align-items:center;gap:14px;padding:10px 6px;{"border-bottom:1px solid #F1F5F9" if k<2 else ""}"><span class="mono" style="font-weight:700;font-size:20px;color:#7C3AED">#{c}</span><span style="flex:1;font-size:18px;font-weight:600">{n}</span><span class="due {cl}" style="font-size:14px">há {d} dias</span><span style="font-size:14px;font-weight:700;color:#fff;background:#16A34A;border-radius:8px;padding:6px 10px">Avisar</span></div>' for k,(c,n,d,cl) in enumerate([("0377","Gustavo","9","r"),("0381","Paula","5","y"),("0390","Helena","3","y")])) + '</div>'
    if kind == 'crm':
        return '<div style="display:flex;gap:10px">' + ''.join(f'<div style="flex:1;background:{"#fff" if s!="Recuperado" else "#DCFCE7"};border-radius:14px;padding:14px;color:#0F172A;{"box-shadow:0 0 0 3px #A78BFA" if s=="Retorno" else ""}"><div style="font-size:13px;font-weight:700;letter-spacing:.06em;color:#64748B">{s.upper()}</div><div class="k" style="font-size:30px;margin-top:6px">{v}</div></div>' for s,v in [("Contato","6"),("Retorno","3"),("Recuperado","R$ 720")]) + '</div>'
    return '<div style="display:flex;gap:12px">' + ''.join(f'<div style="flex:1;background:#fff;border-radius:16px;padding:18px;color:#0F172A"><div style="font-size:16px;font-weight:600;color:#64748B">{t}</div><div class="k" style="font-size:36px;margin-top:6px;color:{c}">{v}</div></div>' for t,v,c in [("Caixa do dia","R$ 3.480","#0F172A"),("A receber","R$ 1.260","#0F172A"),("Quem deve","4","#B91C1C")]) + '</div>'

L = ''.join([glow(500, 300, 1300, 'rgba(225,29,72,.35)'), glow(800, 900, 900, 'rgba(124,58,237,.45)')] +
            [glow(W*k + 540, 260 if k % 2 else 1000, 1100, 'rgba(147,51,234,.38)') for k in range(1, 7)] +
            [glow(W*k + 900, 200, 600, 'rgba(244,63,94,.22)') for k in range(1, 6)])
S = []
S.append(slide(0, N, f'''<div class="sp"></div><div class="tag" style="color:#FDA4AF;background:rgba(244,63,94,.12);border-color:rgba(251,113,133,.35)"><i style="background:#FB7185;box-shadow:0 0 12px 3px rgba(251,113,133,.8)"></i>Checklist · salve este post</div>{gap(36)}
<div class="k" style="font-size:300px;line-height:.8;letter-spacing:-.08em;background:linear-gradient(180deg,#fff,rgba(255,255,255,.15));-webkit-background-clip:text;color:transparent">5</div>{gap(20)}
<div class="h"><span class="w">sinais de que sua loja</span><br><span class="a">está perdendo dinheiro.</span></div>{gap(34)}
<div class="lead">Quantos você reconhece? Conta no final.</div><div class="sp"></div><div style="height:110px"></div>'''))
for k, (prob, sol, icon, kind) in enumerate(sinais):
    S.append(slide(k+1, N, f'''{gap(40)}
<div style="display:flex;align-items:center;gap:20px"><div class="k" style="font-size:150px;line-height:.85;-webkit-text-stroke:2px rgba(251,113,133,.85);color:transparent">0{k+1}</div>
<div class="ib" style="background:linear-gradient(180deg,rgba(244,63,94,.3),rgba(225,29,72,.1));border-color:rgba(251,113,133,.4);color:#FECDD3;box-shadow:0 10px 30px -8px rgba(244,63,94,.6)">{ic(icon)}</div></div>{gap(40)}
<div class="h" style="font-size:{98 if len(prob) < 48 else 86}px"><span class="w">{prob}</span></div>
<div class="sp"></div>
<div class="gl" style="padding:30px 32px 32px;margin-bottom:110px;background:linear-gradient(180deg,rgba(139,92,246,.16),rgba(14,12,26,.75));border-color:rgba(167,139,250,.35)">
<div style="display:flex;align-items:center;gap:12px;font-family:'JetBrains Mono';font-size:18px;font-weight:700;letter-spacing:.14em;color:#C4B5FD">{ic("Check",22,"#86EFAC")}COM A WORQERA</div>
<div style="font-size:36px;font-weight:600;line-height:1.32;margin:16px 0 26px;letter-spacing:-.02em">{sol}</div><div style="zoom:1.35">{mini(kind)}</div></div>'''))
chk = ''.join(f'<div style="display:flex;align-items:center;gap:24px;padding:22px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span style="width:42px;height:42px;border-radius:12px;border:2px solid rgba(196,181,253,.6);flex:none"></span><span style="font-size:28px;font-weight:600;line-height:1.3">{p}</span></div>' for p,_,_,_ in sinais)
S.append(slide(6, N, f'''{gap(30)}<div class="h" style="font-size:88px"><span class="w">Reconheceu 2 ou mais?</span><br><span class="a">Está na hora.</span></div>{gap(30)}
<div>{chk}</div><div class="sp"></div>
{ig_comment('QUERO')}{gap(14)}
<div style="font-size:22px;color:#A9A6BF;text-align:center;line-height:1.4">A gente te chama no direct. Ou teste 7 dias grátis pelo link na bio.</div><div style="height:100px"></div>''', last=True))
posts['post-7-5-sinais'] = doc(N, L, ''.join(S))

