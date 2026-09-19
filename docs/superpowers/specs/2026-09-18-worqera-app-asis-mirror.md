# Worqera App — AS-IS mirror (web → nativo)

**Data:** 2026-09-18  
**Status:** espelho completo do produto LIVE hoje · base para planejar o app do zero  
**API canônica:** `/api/v1` (mesma do web — obrigatório)  
**Relacionados:** [brief](./2026-09-18-worqera-app-nativo-brief.md) · [Status Pack / escala](./2026-09-18-worqera-escala-status-pack.md) · [verticais](./2026-09-18-worqera-verticais-candidatas.md)

> Objetivo deste doc: **tudo que existe no web deve ter contraparte nomeada no app** (mesmo contrato API). Não inventar features só-mobile antes do espelho.

---

## 0. Princípios do espelho

| Princípio | Detalhe |
|-----------|---------|
| Mesma API | Zero endpoints “só app”; usar `/api/v1` |
| Roles iguais | `owner` · `admin` · `atendimento` · `sector` · platform |
| Status Pack | Loop cliente = diferencial também no app |
| TV fica web | `/tv` e `/tv-dashboard` continuam fullscreen browser/TV |
| Landing fica web | Marketing `/` não precisa no app |
| Offline depois | v1 online; queue de moves = v1.1 |

### Stack sugerida (decisão na implementação)

Expo (React Native) + mesma tipagem de payloads do `web/lib/apiV1.ts`. Push: FCM/APNs via OneSignal ou Expo Notifications.

---

## 1. Mapa de telas app × web × API

### 1.1 Auth & sessão

| # | Capacidade web | Rota web | Tela app | API | Prioridade app |
|---|----------------|----------|----------|-----|----------------|
| A1 | Landing | `/` | — (fora) | — | — |
| A2 | Signup + trial 7d + `?ref=` | `/signup` | **Signup** | `POST /auth/signup` | P0 |
| A3 | Login | `/login` | **Login** | `POST /auth/login` | P0 |
| A4 | Logout | sidebar | **Sair** | `POST /auth/logout` + clear tokens | P0 |
| A5 | Me / bootstrap | shell | Splash → **Home por role** | `GET /auth/me` | P0 |
| A6 | Refresh token | silent | interceptor 401 | `POST /auth/refresh` | P0 |
| A7 | Forgot password | `/forgot-password` | **Esqueci senha** | `POST /auth/forgot-password` | P1 |
| A8 | Reset password | `/reset-password` | deep link / WebView ou tela | `POST /auth/reset-password` | P1 |
| A9 | Aceitar convite | `/invite/[token]` | deep link **Convite** | `GET/POST /invites/:token` | P0 |
| A10 | Trial / lock | `TrialBanner` + `/billing` | banner + **Billing** | `GET /billing/subscription` | P0 |

**Home por role (igual web):** `sector` → Kanban; demais → Dashboard.

---

### 1.2 Onboarding

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| O1 | Wizard 3 passos `/onboarding` | **Onboarding** (setores → serviço → pedido demo) | `GET /sectors`, `POST /services`, `POST /shops/current/seed-catalog`, `POST /orders/demo`, `PATCH /shops/current` | P0 |
| O2 | SetupChecklist (Status Pack tour) | **Tour Status Pack** (checklist nativo) | shop + sectors + WA flags | P1 |

---

### 1.3 Shell / navegação

| # | Web | App | Notas |
|---|-----|-----|-------|
| N1 | AppSidebar Principal | Tab bar: Home · Kanban · Pedidos · Clientes · Mais | `sector`: só Kanban + Consultas |
| N2 | Empresa (settings) | Stack **Empresa** no Mais | owner/admin |
| N3 | Admin financeiro/métricas | Stack **Admin** | owner |
| N4 | Oficinas platform | Stack **Platform** | email allowlist |
| N5 | ⌘K QuickOrderJump | Search bar / FAB “código” | `GET /orders?q=` |
| N6 | FeedbackBell inbox | Badge + **Inbox** | `GET /alerts/inbox` |
| N7 | DelayAlertsBanner | Banner Home | `GET /alerts/delays` |
| N8 | SystemOkBadge | (opcional) status API | `GET /health/ready` |
| N9 | Theme toggle | Settings aparência | local |

---

### 1.4 Dashboard (Visão geral)

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| D1 | KPIs + fila recente + carga setores | **Home** | `GET /dashboard` | P0 |
| D2 | Next-actions chips | mesma Home | derivado | P1 |
| D3 | Atalhos TV | links “Abrir no browser” | — | P2 |
| D4 | Digest semanal owner | botão | `POST /alerts/weekly-digest` | P1 |
| D5 | ReferralCard | card indicação | shop `partnerCode` | P1 |
| D6 | `/dashboard/setores` (órfã) | **não espelhar** — fundir em Home | — | — |

---

### 1.5 Kanban (carro-chefe)

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| K1 | Board colunas / mobile chips | **Kanban** lista por setor + swipe/chips | `GET /kanban` | P0 |
| K2 | Drag / avançar / voltar | botões Avançar · Mover para… | `POST /kanban/orders/:id/move` | P0 |
| K3 | Off-path + nota obrigatória | modal nota | move + `note` | P0 |
| K4 | Filtro atrasados | toggle | client filter / dueAt | P1 |
| K5 | Busca código | search | local + API | P0 |
| K6 | Drawer detalhe | **Pedido detalhe** | `GET /orders/:id` | P0 |
| K7 | Copiar link público | share sheet | client | P0 |
| K8 | WhatsApp (templates Empresa) | abrir wa.me / share | `whatsappSuggest` + shop | P0 |
| K9 | Avisar pronto (sticky) | botão sticky | template `ready` | P0 |
| K10 | Marcar entregue | botão | `PATCH /orders/:id` status delivered | P0 |
| K11 | Comentários | thread | `POST /orders/:id/comments` | P1 |
| K12 | Histórico setores | timeline | order.sectorHistory | P1 |
| K13 | Imprimir etiqueta | abrir WebView ou share PDF/QR | etiqueta web ou gera QR in-app | P0 |
| K14 | Role sector (só suas colunas) | mesmo filtro API | `GET /kanban` filtered | P0 |
| K15 | Atalhos teclado | — (não aplicável) | — | — |

---

### 1.6 Pedidos

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| P1 | Lista `/pedidos` | **Pedidos** tabs ativos/finalizados | `GET /orders` | P0 |
| P2 | Filtro garantia | filtro | query | P2 |
| P3 | Export CSV owner | share file | `GET /orders/export.csv` | P2 |
| P4 | Pedido demo | botão onboarding | `POST /orders/demo` | P1 |
| P5 | Novo pedido multi-item | **Novo pedido** + câmera | `POST /orders`, fotos | P0 |
| P6 | Clientes recentes / data +3d | mesmos chips | clients list | P1 |
| P7 | Etiqueta + QR + WA created | **Etiqueta** / share QR | order + shop WA | P0 |
| P8 | PDF / ZIP fotos | download/share | `POST …/pdf`, zip | P1 |
| P9 | Reabrir | ação detalhe | `POST /orders/:id/reopen` | P1 |

**Gate:** `sector` não cria pedido (igual web).

---

### 1.7 Clientes

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| C1 | Lista + busca + PII mask | **Clientes** | `GET /clients` | P0 |
| C2 | Novo + ViaCEP | **Novo cliente** | `POST /clients` | P0 |
| C3 | Detalhe read-only | **Ficha** | `GET /clients/:id` | P1 |
| C4 | Edit modal | edit sheet | `PATCH /clients/:id` | P1 |

---

### 1.8 Consultas

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| Q1 | Hub | tab/entrada **Consultas** | — | P1 |
| Q2 | Consulta clientes | busca + pedidos do cliente | clients + orders | P1 |
| Q3 | Consulta pedidos | busca + detalhe (WA, entregue, reopen) | orders | P0 |
| Q4 | Scanner código | **Scan** (câmera) → detalhe / público | local + `GET /orders` | P0 (app win) |

---

### 1.9 Funcionários (chão ≠ login)

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| F1 | CRUD `/funcionarios` | **Funcionários** | `/employees` | P2 |
| Gate | owner/admin | idem | `requireRole('owner','admin')` | |

---

### 1.10 Settings / Empresa

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| S1 | Setores CRUD + Final + e-mail toggle | **Setores** | `/sectors` | P0 |
| S2 | Serviços CRUD + path hint | **Serviços** | `/services` | P1 |
| S3 | Equipe + invites + reset pwd | **Equipe** | members/invites | P0 |
| S4 | Empresa branding + vertical + itemLabel | **Empresa** | `PATCH /shops/current`, logo | P0 |
| S5 | WhatsApp templates (Status Pack) | mesma Empresa | notifications.whatsapp | P0 |
| S6 | E-mail master toggle | Empresa | notifications.email | P1 |
| S7 | TVs settings | link “abrir TV no browser” + prefs | `tvSettings` | P2 |
| S8 | Billing | **Billing** / WebView checkout | `/billing/*` | P0 |

---

### 1.11 Admin / métricas / financeiro

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| M1 | Financeiro caixa do dia | **Financeiro** | `GET /metrics/finance` | P1 |
| M2 | Métricas overview | **Métricas** | `/metrics/overview` etc. | P2 |
| M3 | Platform shops | **Oficinas** | `/platform/shops` | P2 |

---

### 1.12 Loop público (cliente final)

| # | Web | App loja | App cliente? | API |
|---|-----|----------|--------------|-----|
| L1 | `/p/{slug}/{code}` | abrir in-app browser / preview | **fase 2** app cliente leve ou PWA | `GET /public/...` |
| L2 | Feedback CSAT | — | na página pública | `POST …/feedback` |
| L3 | WA loja | — | link | phone shop |

App da **loja** não substitui a página pública; pode **pré-visualizar** e **compartilhar**.

---

### 1.13 Alertas / digest / indicação

| # | Web | App | API | Prioridade |
|---|-----|-----|-----|------------|
| X1 | Inbox bell | **Inbox** | `GET /alerts/inbox` | P0 |
| X2 | Delays | banner | `GET /alerts/delays` | P1 |
| X3 | Digest delays | ação | `POST /alerts/delays/digest` | P2 |
| X4 | Weekly digest | botão | `POST /alerts/weekly-digest` | P1 |
| X5 | Referral | card | partnerCode | P1 |

---

### 1.14 Push nativo (só app — extensão do AS-IS)

Não existe no web; espelha **eventos que o web já tem**:

| Evento já existente | Push sugerido | Quem |
|---------------------|---------------|------|
| Move para setor do member | “Novo na sua fila” | role sector |
| Order → ready | “Pronto p/ avisar cliente” | owner/admin/atendimento |
| Trial D-2 / D-0 | “Trial acaba” | owner |
| Inbox feedback | “Nova avaliação” | owner/admin |

Registro device: endpoint novo mínimo `POST /devices` (única adição API aceitável para app).

---

## 2. Fora do espelho (não portar)

- Landing marketing completa  
- TV Cliente / TV Oficina como screens nativas (abrir URL)  
- `/emails` removido  
- WhatsApp Cloud auto (ainda não LIVE)  
- Dual Dynamo legado  

---

## 3. Fases de construção do app

| Fase | Escopo | Critério de pronto |
|------|--------|--------------------|
| **App-0** | Login, me, refresh, logout, invite | Entra na conta |
| **App-1** | Kanban + move + detalhe + WA + entregue | Chão usa no dia |
| **App-2** | Novo pedido + câmera + etiqueta/QR share | Balcão no app |
| **App-3** | Consultas + scan + clientes | Substitui busca web |
| **App-4** | Setores/Equipe/Empresa/Billing | Owner configura no celular |
| **App-5** | Dashboard + financeiro + inbox + push | Paridade ops |
| **App-6** | Onboarding + Status Pack tour + referral | Ativação |

---

## 4. Matriz de roles (app)

| Tela | owner | admin | atendimento | sector |
|------|-------|-------|-------------|--------|
| Home | ✓ | ✓ | ✓ | — → Kanban |
| Kanban | ✓ | ✓ | ✓ | ✓ (filtrado) |
| Pedidos / Novo | ✓ | ✓ | ✓ | — |
| Clientes | ✓ | ✓ | ✓ | — |
| Consultas | ✓ | ✓ | ✓ | ✓ |
| Setores/Serviços/Equipe/Empresa/Billing | ✓ | ✓ | — | — |
| Funcionários | ✓ | ✓ | — | — |
| Financeiro/Métricas | ✓ | — | — | — |
| Inbox | ✓ | ✓ | — | — |

---

## 5. Checklist de paridade (quando implementar)

Para cada linha da §1: `[ ]` API wired · `[ ]` UI · `[ ]` role gate · `[ ]` empty/error states.

Manter este arquivo atualizado quando o web ganhar feature nova — **web first, app mirror after**.

---

## 6. Próximo passo de implementação

1. Repo `apps/mobile` (Expo) ou pasta `mobile/` no monorepo  
2. Cliente HTTP clonando contratos de `web/lib/apiV1.ts`  
3. App-0 → App-1 (maior ROI chão)  
4. Push + `POST /devices` só após App-1 estável  
