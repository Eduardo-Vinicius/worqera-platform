# Worqera — guia de precificação e conversão

**Leia este arquivo antes de fechar preço com qualquer oficina.**  
Atualizado: **2026-09-22** · Preços oficiais abaixo.

---

## 1) Tabela oficial (memorizar)

| Plano | Preço | Papel | O que inclui |
|-------|-------|--------|----------------|
| **Basic** | **R$ 147/mês** | Operação | Kanban, pedidos, clientes, consulta, etiqueta, TV Cliente/Oficina. **Sem** Financeiro, **sem** Métricas, **sem** TV Financeiro |
| **Pro** | **R$ 297/mês** | Âncora (LP “Recomendado”) | Tudo do Basic + Financeiro do dono + Métricas + TV Financeiro + digest + branding |
| **Business** | **R$ 499/mês** | Você lado a lado | Tudo do Pro + onboarding + carga/enriquecimento + 1 follow-up/mês + prioridade |

### Anuais (quando pedirem desconto)

| Plano | Preço | Equiv. |
|-------|-------|--------|
| **Pro anual** | **R$ 2.970/ano** | ~R$ 248/mês (~2 meses off) |
| **Business anual** | **R$ 4.990/ano** | ~R$ 416/mês (~2 meses off) |
| **Carga avulsa** | **R$ 197** | Fora do Business · 1 lote PDF/CSV → Mongo |
| **Setup avulso** | **R$ 297** | 1h: setores, equipe, TV, 1º fluxo (quem fica no Pro) |

**Frase:** Basic = fila · Pro = fila + caixa · Business = Worqera implementa e acompanha.

**Early (legado):** lojas pioneiras já fechadas a R$ 147 com Pro completo — **honrar** o acordo; **não vender** Early novo. Depois do período combinado, sobem pra Pro (ou Basic se não usam financeiro).

### Gate de produto (TARGET)
| Feature | Basic | Pro | Business |
|---------|-------|-----|----------|
| Kanban / pedidos / consulta / etiqueta | ✓ | ✓ | ✓ |
| TV Cliente + Oficina | ✓ | ✓ | ✓ |
| Financeiro + Métricas + TV Financeiro | — | ✓ | ✓ |
| Branding / digest | — | ✓ | ✓ |
| Carga + follow-up + prioridade humana | — | — | ✓ (serviço) |

Enforcement no app (ocultar `/admin/financeiro`, métricas, TV $ no Basic) = **próximo passo técnico** — até lá, venda pela tabela e liberação manual no `/admin/shops`.

---

## 2) Por que esses números

| Âncora | Uso |
|--------|-----|
| Basic 147 | Entra barato **sem** desvalorizar o Pro — falta o caixa do dono |
| Pro 297 no centro | Recomendado na LP; compara com Basic e Business e parece óbvio |
| Business 499 | Serviço seu (carga + call) — **não** é plano de volume |
| Sem R$ 99 | Evita ímã de suporte barato |
| Sem preço por usuário | “Equipe ilimitada” no Basic e Pro |

Se achar caro: **anual**, setup no 1º mês, ou Basic (se só precisa da fila). **Não** inventar R$ 97.

---

## 3) Meta R$ 10.000 / mês

| Mix | Lojas ≈ |
|-----|---------|
| Só Pro 297 | **34** |
| 25×Pro + 5×Business | ~R$ 9,9k |
| 20×Pro + 8×Basic + 3×Business | ~R$ 8,7k → completar com Pro |

**Volume no Pro.** Poucos Business (cap mental: quanto você aguenta de carga/mês).

---

## 3b) Qual plano oferecer

| Sinal | Ofereça | Preço |
|-------|---------|-------|
| Signup frio / trial | **Pro** | **297** |
| “Só preciso da fila / equipe” | Basic | **147** |
| Quer dono ver caixa / TV $ | Pro | **297** |
| Troca Infor / carga / “fica comigo” | **Business** | **499** |
| 2ª loja do mesmo dono | Mesmo plano × N | nunca 1 preço pra 2 |

**Regra:** olho brilhou / quer você → **499**. Só operação → **147**. Dúvida → **297**.

### O que dizer no Business (499)
1. Onboarding assistido (setores, serviços, marca, 1º fluxo)  
2. Carga inicial + **1 refresh/mês** (PDF/CSV)  
3. 1 follow-up/mês + WhatsApp prioritário (1 dia útil — **não** “24/7”)  

Fora do Business: carga = **R$ 197** avulsa.

**Não faça:** Business pra quem “usa o que tá lá”; carga semanal grátis; Basic com serviço de Business.

---

## 4) Como cobrar

### Agora (manual / PIX)
1. Combinar plano no WhatsApp  
2. PIX: `Worqera {Basic|Pro|Business} — {loja} — {mês/ano}`  
3. Liberar em `/admin/shops` (`planCode` + active)  
4. Recibo por e-mail  

### Meta (AbacatePay)
1. Trial 7d → `/billing` → checkout **Pro 297** (produto principal)  
2. Basic / Business: produto paralelo ou ativação manual até ter SKUs  

---

## 5) Scripts curtos

**Pitch LP**  
“Basic R$ 147 = fila. Pro R$ 297 = fila + caixa (recomendado). Business R$ 499 = a gente implementa e acompanha. 7 dias grátis.”

**Trial acabando**  
“Seu trial acaba em 3 dias. Pro R$ 297 (financeiro + métricas) ou Basic R$ 147 (só operação). Prefere PIX ou cartão?”

**“Tá caro”**  
“Pro é R$ 297. Se só precisa da fila, Basic R$ 147. Baixar mais desvaloriza o suporte — posso fazer o setup com você no Business.”

**“Quero o básico”**  
“É o Basic: kanban, consulta, TVs. Financeiro e métricas ficam no Pro.”

**Legado Early**  
“Vocês entraram no Early pioneiro — mantemos o valor combinado até {data}. Depois: Pro 297 ou Basic 147 conforme usam financeiro.”

---

## 6) Checklist semanal

- [ ] Trials que vencem em 7 dias — mensagem enviada?  
- [ ] MRR = (basic×147) + (pro×297) + (business×499) + (legado early×147)  
- [ ] Distância até R$ 10k ≈ (10000 − MRR) / 297  
- [ ] Quantos Business ativos vs capacidade de carga  

---

## 7) LP e produto

- LP: **Basic 147 · Pro 297 (recomendado) · Business 499**  
- Billing copy alinhada ao Pro 297  
- Gate Basic no app = backlog (planCode)  
- Early: só legado, fora da LP  

---

## 8) Histórico de decisão

| Data | Decisão |
|------|--------|
| 2026-09-17 | Early 147 / Pro 247 / Business 397 · sem Basic |
| 2026-09-19 | Business 399 · Premium 499 (serviço) · carga avulsa 197 |
| **2026-09-22** | **Basic 147 / Pro 297 / Business 499** · Early só legado · Premium fundido no Business · sem R$ 99 |

Quando mudar preço, atualize **esta seção** e a LP no mesmo dia.
