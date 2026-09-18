# Worqera — próximos planos (3 clientes em 2 dias)

**Data:** 2026-09-17  
**Contexto:** produto lançado; CdT + 2 lojas novas; código à frente do deploy em vários QWs.

Com tração precoce, a ordem certa é: **estabilidade → ouvir → converter → diferenciar**.

---

## Norte (próximas 2 semanas)

| Prioridade | Objetivo | Por quê |
|------------|----------|---------|
| P0 | Deploy + ops vivos | Código novo não vale se PRD está atrás |
| P0 | Cada loja “respirando” no dia a dia | Churn em trial mata momentum |
| P1 | Caminho claro trial → pago | 3 clientes ≠ 3 MRR ainda |
| P1 | Você como suporte sem virar plantão 24h | Escala humana |
| P2 | 1 diferencial que eles peçam (não inventar) | Feature pela dor real |

---

## Semana 1 — Operar o negócio (não o backlog)

### 1) Colocar o código no ar
- Push + rebuild **api** + **web** em PRD
- Smoke por loja: login owner, kanban, 1 pedido, consulta pública, TVs
- Confirmar `api.worqera.com` + cert

### 2) Ops mínimo (paz mental com 3 tenants)
- Cron: `mongo-backup.sh` (semanal) + trial reminders (diário) + weekly digest (segunda)
- UptimeRobot em `/health/ready`
- Canal único de suporte (WhatsApp Worqera) — não 3 chats espalhados

### 3) Ritual com os 3 clientes (30–40 min cada)
Perguntas fixas:
1. O que usam todo dia? (kanban / pedidos / TV / consulta)
2. Onde travou na 1ª semana?
3. O que faria você **pagar** sem pensar?
4. O que quase te fez abandonar?

Anota em 1 tabela. **A feature #1 da Semana 2 sai daqui**, não da cabeça.

### 4) Platform admin útil de verdade
Em `/admin/shops` (você):
- trial ends / dias restantes
- último login (se possível) ou “último pedido criado”
- botão +7d trial (já existe) — use com critério

---

## Semana 2 — Converter + fechar a dor #1

### Conversão
- E-mail / WhatsApp D-3 e D-1 do trial (humano + automático)
- Billing: AbacatePay ligado **ou** processo manual claríssimo (“PIX / boleto via Worqera”)
- Oferta early: 1 mês com desconto / setup grátis em troca de depoimento

### Produto (escolher **um** com base nas entrevistas)

Hipóteses mais comuns em oficina (validar com os 3):

| Se eles pedirem… | Construa… | Evite… |
|------------------|-----------|--------|
| “Cliente pergunta status” | Consulta pública + QR na etiqueta polish | Meta Cloud API cedo |
| “Imprimir na recepção” | Etiqueta A4 1-click estável | PDF genérico |
| “Celular na oficina” | Kanban mobile ainda mais duro | App nativo |
| “Avisar no Zap sozinho” | wa.me no move (já tem) + treino | Meta API sem volume |
| “Fechar o mês” | CSV + digest (já tem) + 1 tela financeira simples | ERP completo |

**Regra:** uma entrega grande por semana. Três clientes não pedem 10 coisas — pedem 1 bem feita.

---

## Mês 1 — SaaS de verdade (10–20 lojas)

1. **Onboarding guiado** — 15 min com você ou vídeo 3 min (setores → 1º pedido → TV)
2. **Convites de equipe** — owner convida setor/atendimento sem você no meio
3. **Branding por loja** na consulta/TV (logo + nome) — percepção “meu sistema”
4. **Backup + restore documentado** — 1 página ops
5. **Case CdT** na LP (“X pedidos / dia”) — prova social real
6. **Preço publicado** ou “a partir de” — menos fricção no signup

Ainda **não** priorizar: multi-idioma profundo, app store, inventário de estoque, NF-e, CRM genérico.

---

## O que *não* fazer agora

- Feature nova sem falar com as 3 lojas
- Meta Cloud WhatsApp antes de 10+ lojas pedindo “automático de verdade”
- Refator grande / rewrite
- Abrir 10 canais de aquisição — foque retenção dos 3 + indicação

---

## Métricas que importam (olhar toda sexta)

| Métrica | Alvo semana |
|---------|-------------|
| Lojas com ≥1 pedido/dia útil | 3/3 |
| Owners que abriram kanban 4+ dias | ≥2 |
| Trials → assinatura | 1 conversão já é vitória |
| Tickets “não consigo X” repetidos | → vira feature da semana |
| Uptime API | >99% |

---

## Sequência sugerida de sprints

| Sprint | Foco |
|--------|------|
| **A** (agora) | Deploy PRD + crons + 3 calls de descoberta |
| **B** | Dor #1 dos clientes + billing conversion |
| **C** | Platform admin “trial/último uso” + case LP |
| **D** | Onboarding self-serve + convites equipe polish |
| **E** | Só então: WhatsApp Cloud / PWA offline / etc. |

---

## Mensagem de produto

Você não está mais “lançando um SaaS”.  
Você está **operando um SaaS com clientes reais**.

O próximo plano vencedor é: **estável, ouvido, pago** — depois “wow”.
