# Worqera — QW pack para escalar (pós-preço)

**Data:** 2026-09-17  
**Contexto:** 3 lojas · Early 147 / Pro 247 · produto vivo  
**Regra:** cada QW cabe em **≤1 sessão** e mexe em conversão, retenção ou indicação.

---

## Norte de escala (próximos 30 dias)

| Alavanca | Meta |
|----------|------|
| Converter trials | 3/3 Early pagando |
| Preencher Early | 10/10 vagas |
| Indicação | ≥2 lojas novas via cliente atual |
| Ops | zero “sumiu o sistema” / backup ok |
| Prova social | 1 case + 2 depoimentos na LP |

---

## QW-S1 · Fechar dinheiro (esta semana)

| ID | Quick-win | Por quê escala |
|----|-----------|----------------|
| **S1.1** | Deploy LP com preços 147/247/397 | Lead vê valor sem WhatsApp |
| **S1.2** | PIX + registro (planilha: loja, plano, renovação) | MRR mensurável |
| **S1.3** | Msg D-3 / D-1 nos 3 trials (templates do guia de preço) | Conversão sem feature |
| **S1.4** | Pedir depoimento em troca de 1× setup ou 1 mês Early | LP vende sozinha |

---

## QW-S2 · Fazer o produto “indicar sozinho”

| ID | Quick-win | Esforço |
|----|-----------|---------|
| **S2.1** | Bloco na LP: “3 oficinas já no ar” + quote CdT | S |
| **S2.2** | Página `/r/[code]` ou `?ref=` já existe — link curto pro owner (“Indique e ganhe 1 mês”) | M |
| **S2.3** | PDF 1 página “Worqera em 60s” pra mandar no Zap | S |
| **S2.4** | QR da consulta pública colado na etiqueta (já tem base — polish impressão) | S–M |

Efeito: cada loja vira **canal**, não só cliente.

---

## QW-S3 · Onboarding que não depende de você

| ID | Quick-win | Esforço |
|----|-----------|---------|
| **S3.1** | Vídeo Loom 3 min (setores → pedido → kanban → TV) link no e-mail pós-signup | S |
| **S3.2** | Checklist no dashboard: ☐ setores ☐ 1º pedido ☐ convidar 1 pessoa ☐ TV | M |
| **S3.3** | Convite equipe 1-click com copy clara (“Setor = só sua fila”) | S (já quase) |
| **S3.4** | Empty states com “Pedido de exemplo” (já feito) — garantir no PRD | S |

Sem isso, cada loja nova = 1h sua. Com isso, escala horizontal.

---

## QW-S4 · Retenção (não churnar os 3)

| ID | Quick-win | Esforço |
|----|-----------|---------|
| **S4.1** | Cron digest semanal ligado | S |
| **S4.2** | Cron trial reminders ligado | S |
| **S4.3** | Check-in WhatsApp dia 7 e dia 21 (humano, 2 frases) | S |
| **S4.4** | Backup Mongo cron + 1 restore testado | S |
| **S4.5** | UptimeRobot `/health/ready` | S |

Churn em early mata escala. Retenção > ads.

---

## QW-S5 · Você como plataforma (10–40 lojas)

| ID | Quick-win | Esforço |
|----|-----------|---------|
| **S5.1** | `/admin/shops`: trial restante + status + “último pedido” | M |
| **S5.2** | Filtro “trial acabando em 7d” | S |
| **S5.3** | Nota interna por shop (objeção / plano / PIX) | S |
| **S5.4** | Contador Early “restam X/10” na LP | S |

Sem painel, 40 lojas = caos.

---

## QW-S6 · Aquisição barata (sem ads ainda)

| ID | Quick-win | Canal |
|----|-----------|-------|
| **S6.1** | Lista 20 sapatarias/limpeza no raio + Zap com case | Outbound |
| **S6.2** | Post/carrossel: antes planilha × depois kanban (print TV) | Orgânico |
| **S6.3** | Parceria: 1 fornecedor de insumos indica Worqera | Parceria |
| **S6.4** | “Semana da oficina”: 5 demos de 20 min | Calendário |

Meta: **2 demos/semana** até encher Early.

---

## O que NÃO é QW de escala (adiar)

- Meta Cloud WhatsApp  
- App nativo  
- NF-e / estoque  
- 2º idioma profundo  
- Rewrite / microserviços  
- Baixar preço pra “vender mais” (mata a meta de 10k)

---

## Ordem sugerida (2 semanas)

```
Semana A: S1 (dinheiro) + S4 (crons/uptime) + S1.1 deploy preços
Semana B: S3 (Loom + checklist) + S2 (case LP + indicação) + S6.1 (20 leads Zap)
```

Depois: S5 platform admin → encher Early → Pro 247 só.

---

## Feito no código (2026-09-17)

- [x] LP: preços 147/247/397 + badge Early “restam X/10” (`NEXT_PUBLIC_EARLY_SEATS_TAKEN`)
- [x] LP: case “3 oficinas no ar”
- [x] Dashboard: checklist setup + card indicação (copiar `?ref=`)
- [x] `/admin/shops`: trial dias, filtro ≤7d, pedidos abertos/total, último pedido
- [x] Empresa/Billing: copy indicação + preços

Atualize `NEXT_PUBLIC_EARLY_SEATS_TAKEN` a cada Early fechado (default 3).


---

## Referências

- Preço + conversão: [2026-09-17-worqera-pricing-and-change-script.md](./2026-09-17-worqera-pricing-and-change-script.md)  
- 3 clientes: [2026-09-17-worqera-3-clients-next.md](./2026-09-17-worqera-3-clients-next.md)
