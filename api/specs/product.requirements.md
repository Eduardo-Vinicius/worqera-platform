# Worqera — Requisitos de produto (API + produto)

**Atualizado:** 2026-09-14

## Visão

Worqera = SaaS de gestão de pedidos com **kanban por setores** como carro-chefe, para oficinas de reforma/pintura/conserto de tênis. Casa do Tênis = primeiro shop (`legacyBrand`), não a marca do produto.

## RF — Identidade e loja

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-AUTH-01 | Signup cria shop + owner + subscription trial 7d | TARGET |
| RF-AUTH-02 | Login e-mail/senha; hash (nunca plaintext) | LIVE→fix |
| RF-AUTH-03 | Access JWT curto; refresh HttpOnly no web | TARGET (legado: refresh body) |
| RF-AUTH-04 | Memberships user↔shop + role | TARGET |
| RF-AUTH-05 | Isolamento por `shopId` em todo dado operacional | TARGET |
| RF-AUTH-06 | Rotas ops exigem subscription `trialing\|active` | TARGET |
| RF-AUTH-07 | Logout invalida refresh; client limpa token storage | LIVE parcial |

## RF — Kanban / setores (carro-chefe)

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-KAN-01 | Colunas do board = setores **ativos** do shop (ordem configurável) | TARGET (hoje = status strings) |
| RF-KAN-02 | CRUD setores por shop (nome, cor, ordem, ativo, terminal) | TARGET |
| RF-KAN-03 | Owner/admin vê **todas** as colunas e move para **qualquer** setor ativo | LIVE parcial (admin columns; move always-allow) |
| RF-KAN-04 | Pedido: `currentSectorId` + `sectorHistory[]` (quem, quando, obs, funcionário) | LIVE (`setoresHistorico`) |
| RF-KAN-05 | Membership `sector` + `sectorIds`: vê só esses setores; move só conforme regra | TARGET (roles seed cosméticos) |
| RF-KAN-06 | Regra default de move (sector): sair do próprio → próximo na ordem **ou** destino permitido por config do shop | TARGET |
| RF-KAN-07 | Seed CdT com fluxo legado de setores | LIVE hardcoded → seed |
| RF-KAN-08 | Card mostra: código, cliente, modelo, prioridade, prazo, foto thumb, setor, assignee | LIVE rico |
| RF-KAN-09 | Filtros board: texto, prioridade, atrasados, hoje, funcionário | LIVE front |
| RF-KAN-10 | DnD + dialog de confirmação (assignee / observação) configurável por shop | LIVE |
| RF-KAN-11 | Avançar rápido (próximo setor) e busca por código/CPF no header | LIVE front |
| RF-KAN-12 | Unificar modelo: **abandonar dual status×setor** no alvo; `status` de negócio vira derivado (`open/in_progress/ready/delivered`) + setor | TARGET |
| RF-KAN-13 | SLA visual: card atrasado destacado; contagem atrasados no board | LIVE parcial + metrics |
| RF-KAN-14 | Ao criar pedido, `setoresFluxo` / setor inicial = regras do shop (não só heurística de nome de serviço) | LIVE heurística → melhorar |

## RF — Pedidos e clientes (já existem — preservar)

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-ORD-01 | CRUD clientes (nome, cpf, telefone, email, endereço, obs) | LIVE |
| RF-ORD-02 | ViaCEP / autofill endereço no create (front) | LIVE |
| RF-ORD-03 | CRUD pedidos: modelo, serviços[], preços, sinal/restante, garantia, acessórios, prioridade, prazo | LIVE |
| RF-ORD-04 | Código curto legível por shop (`DDMMYY-SEQ` ou equivalente) | LIVE |
| RF-ORD-05 | Upload fotos (prefixo por shop); ZIP download | LIVE |
| RF-ORD-06 | Gerar/listar PDF do pedido | LIVE |
| RF-ORD-07 | Consulta/busca com filtros + paginação | LIVE |
| RF-ORD-08 | Persistência de `clientPhone` no create (hoje gap) | FIX |
| RF-ORD-09 | Lista de pedidos na UI (`/pedidos`) — hoje 404 | FIX / QW |
| RF-ORD-10 | Draft local no novo pedido | LIVE front |

## RF — Chão / TV / funcionários

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-OPS-01 | Funcionários por setor (cadastro chão, ≠ login) | LIVE |
| RF-OPS-02 | TV produção por setor (poll, flash/beep) | LIVE |
| RF-OPS-03 | TV experiência cliente (filas pending/progress/ready/overdue) | LIVE |
| RF-OPS-04 | Dashboard KPIs + recentes | LIVE |
| RF-OPS-05 | Métricas: departamentos, desempenho, atrasos, overview | LIVE |
| RF-OPS-06 | Financeiro: receita, sinal, restante, despesas, períodos | LIVE |
| RF-OPS-07 | Métricas/financeiro só admin/owner na **API** | FIX (hoje só front) |

## RF — Comunicação

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-COM-01 | E-mail ao criar / mudar status ou setor (branding do **shop**) | LIVE CdT hardcoded |
| RF-COM-02 | SMS opcional em status terminal (`SMS_ENABLED`) | LIVE parcial |
| RF-COM-03 | WhatsApp: templates + envio manual; auto opcional por shop | PARTIAL (broken require) |
| RF-COM-04 | Audit log de e-mails + UI admin | HIDDEN |
| RF-COM-05 | Sem double-send no create | FIX |

## RF — Billing

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-BILL-01 | Trial 7d no signup | TARGET |
| RF-BILL-02 | Checkout/assinatura AbacatePay | TARGET |
| RF-BILL-03 | Webhook secret+HMAC+idempotência | TARGET |
| RF-BILL-04 | Sem assinatura válida: bloqueio ops (só auth+billing) | TARGET |
| RF-BILL-05 | Plano v1 `WORQERA_PRO` | TARGET |

## Features tops (agregar — além do núcleo)

Prioridade de produto depois do kanban sólido + trial:

| ID | Feature | Por que agrega | Fase sugerida |
|----|---------|----------------|---------------|
| TOP-01 | **Catálogo de serviços por shop** | Hoje hardcoded no front; cada oficina tem lista/preço próprios | A4 / W5 |
| TOP-02 | **Consulta pública por código** (`/p/{codigo}`) | Cliente acompanha status sem login; marketing orgânico | A4 / W-TOP |
| TOP-03 | **Etiqueta / ticket imprimível** (código + QR) | Chão físico da oficina; menos erro | A4 |
| TOP-04 | **Regras de fluxo por serviço** (quais setores o serviço atravessa) | Substitui heurística de nome; kanban previsível | A2+ |
| TOP-05 | **Alertas de atraso** (badge + digest diário e-mail pro owner) | CdT vive de prazo; reduz “sumiu o pedido” | A4 |
| TOP-06 | **WhatsApp auto no move de setor** (opt-in shop) | Já desejado nos docs; hoje quebrado/manual | A4 após fix |
| TOP-07 | **Templates de pedido / “pedido rápido”** | Repetir combo serviços+fluxo comum | W-TOP |
| TOP-08 | **Garantia com data fim + filtro** | Campo já existe; falta lifecycle UI | QW→TOP |
| TOP-09 | **Comando rápido kanban** (já parcial) + atalhos teclado | Power users no chão | W2 polish |
| TOP-10 | **Modo TV configurável** (quais setores / layout) | 2 TVs já existem; tornar setting | W-TOP |

## Quick-wins (alto ROI, baixo escopo)

| ID | Win | Onde | Esforço |
|----|-----|------|---------|
| QW-01 | Montar `<Toaster />` (sonner) no layout | web | XS |
| QW-02 | Criar `/pedidos` (lista) ou remover links 404 | web | S |
| QW-03 | Logout limpa `localStorage.token` + cookie | web | XS |
| QW-04 | Cookie `secure` só em HTTPS / env | web | XS |
| QW-05 | Links nav: `/tv`, `/dashboard/setores` | web | XS |
| QW-06 | Fix `require` WhatsApp no `pedidoController` | api | XS |
| QW-07 | Hash de senha (bcrypt) + migração seed | api | S |
| QW-08 | Gate admin nas rotas `/metrics/*` | api | S |
| QW-09 | Align upload limit 5 vs 8 | api+web | XS |
| QW-10 | Persistir `clientPhone` no create | api | XS |
| QW-11 | Evitar e-mail duplicado no create | api | S |
| QW-12 | Refresh JWT preservar `role` | api | XS |
| QW-13 | Remover senha Gmail/JWT do `template.yaml` commitado | api | S |
| QW-14 | Habilitar audit e-mails **ou** deletar página morta | api+web | S |

## Não-requisitos (v1)

White-label total, app mobile, multi-região, seats complexos, marketplace consumidor.
