# Worqera — guia de precificação e conversão

**Leia este arquivo antes de fechar preço com qualquer oficina.**  
Atualizado: 2026-09-17 · Preços oficiais abaixo.

---

## 1) Tabela oficial (memorizar)

| Plano | Preço | Quem recebe | Mensagem |
|-------|-------|-------------|----------|
| **Early** | **R$ 147/mês** | Só as **10 primeiras** oficinas · preço **travado 12 meses** | “Você entrou cedo; trava esse valor por 1 ano.” |
| **Pro** | **R$ 247/mês** | Padrão público (LP “Recomendado”) · self-serve | “Uma oficina, equipe ilimitada, sem cobrança por usuário.” |
| **Business** | **R$ 399/mês** | Quer setup + prioridade, sem pacote de carga | “Prioridade + setup assistido.” |
| **Business Premium** | **R$ 499/mês** | Olho brilhou / troca de Infor+ / quer você junto | “Customização + acompanhamento + carga atualizada.” |
| **Pro anual** | **R$ 2.470/ano** (~R$ 206/mês) | Quem pede desconto no Pro | “2 meses de desconto.” |
| **Premium anual** | **R$ 4.990/ano** (~R$ 416/mês) | Premium com desconto | “~2 meses off; trava valor.” |
| **Setup avulso** | **R$ 297** uma vez | Só se comprar Pro sem Business | “1h: setores, equipe, TV, 1º fluxo.” |

**Não existe Basic barato.** Early ≠ plano pior — é Pro com desconto de pioneiro.  
**Premium 499** = produto + serviço (carga + follow-up). Não misturar com Early.

### Suas 3 lojas atuais
| Cliente | Cobrar | Observação |
|---------|--------|------------|
| Casa do Tênis | Early **R$ 147** (ou 1–2 meses grátis **só** se case/depoimento + data de início da cobrança) | Âncora de prova social |
| Loja 2 | Early **R$ 147** no fim do trial | Mesmo pacote |
| Loja 3 | Early **R$ 147** no fim do trial | Mesmo pacote |

Regra: **mesmo Early para os três**. Não inventar preço por amizade.

---

## 2) Por que esses números valorizam o produto

| Âncora | Uso na conversa |
|--------|-----------------|
| Valor operacional | “Se sobra 5h/semana, a R$ 30/h isso é ~R$ 600. O Pro é R$ 247.” |
| Pro no centro | Cliente compara Early (147) e Business (397) → **Pro parece óbvio** |
| Sem Basic | Ninguém “economiza” comprando um plano manco |
| Early escasso | “Só 10 vagas” — urgência real, não desconto eterno |
| Sem preço por usuário | Oficina pequena tem medo de headcount; diga **equipe ilimitada** |

Se o cliente achar caro: não baixe para R$ 97. Ofereça **anual**, **Early (se ainda houver vaga)** ou **setup grátis no 1º mês**.

---

## 3) Meta R$ 10.000 / mês (guia rápido)

| Preço médio | Lojas pagantes ≈ |
|-------------|------------------|
| R$ 147 | **68** |
| R$ 206 (anual) | **49** |
| R$ 247 (Pro) | **41** |
| R$ 297 mix | **34** |
| 30×Pro + 10×Premium | **40** → ~R$ 12,4k |

**Caminho realista:** 3–5 Premium (499) + resto Pro 247. Poucos Premium pagam bem o suporte; volume fica no Pro.

---

## 3b) Qual plano oferecer (próximas vendas)

| Sinal do cliente | Ofereça | Preço |
|------------------|---------|-------|
| Signup frio / trial LP | Pro | **247** |
| Pediu desconto / early adopter | Early (se ≤10) | **147** |
| Quer “alguém me configura” | Business | **399** |
| “Vai revolucionar” / troca Infor+ / 2 unidades / quer carga | **Premium** | **499** |
| 2ª loja do mesmo dono | Mesmo plano da 1ª | **×N lojas** (nunca 1 preço pra 2) |

**Regra de ouro:** se o olho brilhou → **499**, não 147.

### O que entra no Premium (R$ 499) — diga na proposta
1. **Customização** — setores, serviços, marca, Status Pack (consulta + WA)  
2. **Acompanhamento** — 1 call/mês + WhatsApp prioritário (resposta em 1 dia útil)  
3. **Carga atualizada** — import histórico na entrada + **1 refresh/mês** (PDF/CSV → Mongo)  

Fora do Premium: carga extra = **R$ 197** avulsa.

---

## 3c) Entrega (playbook pós-venda)

**D0 — Fechou**
1. PIX / cartão · registrar: loja | plano | valor | início | renovação  
2. Criar shop (ou liberar trial → active)  
3. Agendar setup 60–90 min  

**D1 — Setup (na call)**
1. Vertical / setores / serviços (kit ou custom)  
2. Marca + link `/p/{slug}/`  
3. 1 pedido real + etiqueta + “Avisar WA”  
4. Se Premium: receber PDF/CSV e **agendar carga** (não prometer na hora se for grande)

**D2–D7 — Carga (Premium)**
1. Extrair no Mac → payload → `/tmp` + mongosh (como CdT)  
2. Confirmar na UI Finalizados + 1 código amostra com o cliente  
3. Treinar 1 pessoa da loja no kanban + consulta  

**Mensal (Premium)**
- 1 call curta ou async: “o que travou?”  
- 1 janela de carga (eles mandam PDF até dia X)  
- Se não mandaram arquivo: call mesmo assim (não “devolver” o mês)

**Não faça:** suporte infinito no WhatsApp sem plano Premium; carga semanal grátis; Early com serviço de Premium.

---

## 4) Como cobrar (operacional)

### Agora (AbacatePay ainda off ou instável)
1. Combinar plano e valor no WhatsApp  
2. PIX mensal (nota: “Worqera Pro / Early — {loja} — {mês/ano}”)  
3. Você libera no `/admin/shops` (active / +dias)  
4. Mandar recibo simples por e-mail  

### Meta (AbacatePay on)
1. Trial 7d → `/billing` → checkout Pro R$ 247  
2. Early: cupom / produto paralelo / ativação manual até ter cupom  
3. Webhook → `active`  
4. Falha → banner billing (já existe base)

**Um caminho só por cliente.** Não misturar “às vezes PIX às vezes cartão sem registro”.

---

## 5) Roteiro de conversão (siga na ordem)

### Momento A — Signup / trial (dia 0)
- Não falar preço demais; falar **7 dias grátis** + “Pro R$ 247 depois”  
- Onboarding: setores → 1 pedido → kanban → TV se tiver tela  
- Meta: **1 pedido real no dia 1**

### Momento B — Dia 2–3 (check-in)
WhatsApp:
> “Oi {nome}! Como está o kanban? Quer que eu revise setores com você 15 min? Assim o trial rende.”

Objetivo: uso real, não só conta criada.

### Momento C — D-3 do trial
> “Seu trial acaba em 3 dias. Plano Early (se ainda tiver vaga): R$ 147/mês travado 1 ano. Pro padrão: R$ 247. Prefere PIX ou cartão?”

Se hesitar: oferecer **setup grátis** ou **anual**.

### Momento D — D-1
> “Amanhã o acesso de operação pausa sem assinatura. Posso ativar Early/Pro hoje pra não interromper a oficina.”

### Momento E — Fechou
1. Registrar: loja | plano | valor | data início | forma pagamento | renovação  
2. Pedir: 2 frases de depoimento **ou** foto da TV/kanban (com permissão)  
3. Agendar renovação +7/+30 no calendário  

### Momento F — Não fechou
- Estender **no máximo +7 dias uma vez** (platform admin)  
- Anotar objeção (preço / hábito / outro sistema)  
- Não ficar em trial eterno  

---

## 6) Objeções e respostas

| Objeção | Resposta |
|---------|----------|
| “Tá caro” | “O Pro é R$ 247. Early R$ 147 se ainda houver vaga. Baixar mais desvaloriza o suporte — posso fazer o setup com você esta semana.” |
| “Quero só o básico” | “Não temos Basic: o Early já é o Pro completo com desconto de pioneiro.” |
| “Vou pensar” | “Combinado. Trial até {data}. Te chamo D-3. Se quiser, marco 15 min pra fechar o fluxo agora.” |
| “Posso pagar menos porque indico” | “Indicação: 1 mês grátis **depois** que a outra loja assinar. Seu plano continua Early/Pro.” |
| “CdT não paga?” | Se for case: “X meses grátis em troca de depoimento + renovação em {data} no Early.” Documente. |
| “Por usuário?” | “Não. Uma oficina = um Pro. Equipe ilimitada.” |

---

## 7) O que NÃO fazer na conversão

- Não inventar preço na hora (R$ 80, R$ 120…)  
- Não criar “Basic” sob pressão  
- Não dar trial infinito  
- Não prometer Meta Cloud / NF-e / app pra fechar  
- Não cobrar por pedido no começo (confunde)  

---

## 8) Frases prontas (copiar)

**Pitch 20s**  
“Worqera é o kanban da sua oficina: setores, pedido com código, TV e consulta pro cliente. Pro R$ 247/mês, equipe ilimitada. Early R$ 147 pras 10 primeiras. 7 dias grátis.”

**Fechamento**  
“Fechamos Early a R$ 147 com renovação em {data}? Te mando o PIX e libero hoje.”

**Indicação**  
“Mandou uma oficina que assinou? Você ganha 1 mês. Ela entra no preço da tabela (Early se ainda tiver, senão Pro).”

---

## 9) Checklist semanal de receita

- [ ] Quantas das 3 Early já pagaram?  
- [ ] Quantas vagas Early restam (meta: 10)?  
- [ ] Trials que vencem em 7 dias — mensagem enviada?  
- [ ] MRR atual = (early×147) + (pro×247) + (biz×399) + (premium×499)  
- [ ] Distância até R$ 10k = (10000 − MRR) / 247 ≈ lojas Pro faltando (ou /499 se mirar Premium)  

---

## 10) LP e produto

- LP mostra: Early **147** · Pro **247** (recomendado) · Business **399** · Premium sob conversa (**499**)  
- Billing interno: alinhar copy ao Pro; Early/Premium podem ser manuais no início  
- Reajuste futuro: após 10 Early, **só Pro 247** na LP; Premium continua sob proposta  

---

## 11) Histórico de decisão

| Data | Decisão |
|------|--------|
| 2026-09-17 | Descartado R$ 97 como preço público (barato demais) |
| 2026-09-17 | Early **147** / Pro **247** / Business **397** / anual **2470** |
| 2026-09-17 | Sem Basic; Pro no centro; Early escasso |
| 2026-09-19 | Business **399** · **Premium 499** (custom + acompanhamento + carga) · carga extra R$ 197 |

Quando mudar preço, atualize **esta seção** e a LP no mesmo dia.
