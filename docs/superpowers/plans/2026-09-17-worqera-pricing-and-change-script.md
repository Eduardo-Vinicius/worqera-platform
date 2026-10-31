# Worqera — guia de preços e venda

**Leia antes de fechar preço com qualquer loja.**
Atualizado: **31/10/2026**. Desenho completo em `docs/superpowers/specs/2026-10-31-precos-e-site-design.md`.

---

## 1) Tabela oficial

| Plano | Mensal | Anual (2 meses grátis) | Frase de valor |
|-------|--------|------------------------|----------------|
| **Basic** | **R$ 147** | R$ 1.470 | "Um orçamento recuperado no mês já paga o plano." |
| **Pro** (recomendado) | **R$ 297** | R$ 2.970 | "O caixa, a prateleira e o estoque na sua mão." |
| **Business** | **R$ 597** | R$ 5.970 | "O WhatsApp avisa sozinho e a IA escreve com você." |
| **Implantação** (avulsa) | **R$ 497** uma vez | — | Setores, carga do histórico do sistema antigo e treinamento |

- 7 dias grátis em **todos** os planos, inclusive o Business (o WhatsApp oficial só liga depois de assinar).
- Preço por empresa, não por pessoa.
- Pagamento pelo **Asaas**: a loja escolhe Pix, boleto ou cartão na fatura. Em teste, a 1ª cobrança vence no último dia do teste.
- Atrasou: a loja continua usando por **5 dias** depois do vencimento; depois bloqueia até pagar.
- **Fundador:** quem já era Business antes da tabela nova mantém R$ 499 até a data combinada (`founder.until`).

### O que cada plano libera

| | Basic | Pro | Business |
|---|---|---|---|
| Kanban, TVs, consulta, QR, etiqueta | ✓ | ✓ | ✓ |
| CRM de orçamentos e clientes, WhatsApp com texto pronto | ✓ | ✓ | ✓ |
| Pedidos por mês | até 150 | sem limite | sem limite |
| Financeiro, métricas, TV financeiro, estoque, marca | — | ✓ | ✓ |
| IA por mês | 50 usos | 300 usos | 1.500 usos + leitura semanal |
| WhatsApp oficial automático (1.000 avisos + 100 retomadas) | — | — | ✓ |
| Suporte | normal | normal | prioritário |

No teste, a IA tem 30 usos. A Worqera pode liberar uso extra no mês pelo painel da plataforma.

---

## 2) Meta: R$ 10 mil por mês

| Mix | Ticket médio | Lojas |
|-----|--------------|-------|
| 25% Basic · 55% Pro · 20% Business | R$ 320 | **~32** |
| Só Pro | R$ 297 | 34 |

Implantação e anual entram como caixa, não como MRR. **MRR = Basic×147 + Pro×297 + Business×597 (fundador: 499)**, com o anual dividido por 12.

---

## 3) Qual plano oferecer

| Sinal | Ofereça |
|-------|---------|
| Signup frio / trial | **Pro** |
| "Só preciso organizar a fila" | Basic |
| Dono quer ver caixa, prateleira, estoque | Pro |
| Quer que o cliente seja avisado sozinho / usa muito WhatsApp | **Business** |
| Vem de outro sistema, quer carga do histórico | Plano + **implantação R$ 497** |
| 2ª loja do mesmo dono | Mesmo plano × N |

Dúvida → **Pro**. Quer a Worqera do lado → **implantação**, não desconto.

---

## 4) Scripts curtos

**Pitch:** "Basic R$ 147 organiza a fila. Pro R$ 297 mostra o caixa e o estoque. Business R$ 597 avisa o cliente sozinho pelo WhatsApp e a IA escreve com você. 7 dias grátis em qualquer um."

**Trial acabando:** "Seu teste acaba em 3 dias. Assina pelo Plano, no próprio sistema: Pix, boleto ou cartão. No anual são 2 meses grátis."

**"Tá caro":** "No anual sai 2 meses grátis. E um orçamento recuperado por mês já paga o Basic."

**Vem de outro sistema:** "A implantação é R$ 497 uma vez: a gente monta os setores, traz o seu histórico e treina a equipe. Você não começa do zero."

---

## 5) Checklist semanal

- [ ] Testes que vencem em 7 dias: mensagem enviada?
- [ ] Faturas atrasadas no Asaas (o painel mostra; a loja tem 5 dias)
- [ ] MRR e distância até R$ 10 mil ≈ (10.000 − MRR) / 320
- [ ] Implantações vendidas no mês

---

## 6) Histórico

| Data | Decisão |
|------|--------|
| 17/09/2026 | Early 147 / Pro 247 / Business 397 |
| 22/09/2026 | Basic 147 / Pro 297 / Business 499 |
| Out/2026 | Basic 97 / Pro 197 / Business 697 (fundador 499) |
| **31/10/2026** | **Basic 147 / Pro 297 / Business 597** · anual 10× · implantação 497 · IA em todos os planos · Asaas no lugar do AbacatePay |

Quando mudar preço, atualize esta tabela, `web/lib/plans.ts`, o `PRODUCTS` da API, a landing e o app no mesmo dia.
