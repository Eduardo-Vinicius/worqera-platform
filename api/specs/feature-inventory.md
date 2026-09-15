# Worqera — Inventário de features (legado → alvo)

**Atualizado:** 2026-09-14  
Fonte original: código live em `api/` + `web/` (pré-refatoração Mongo). **Pós cutover + Ops UX:** `/pedidos` lista LIVE; TV Cliente = `/tv`; TV Chão = `/tv-dashboard`; `Order.items[]`. Tabela abaixo ainda mistura gaps legado — use [current-state.md](./current-state.md) para o runtime.

Este arquivo fecha o **gap** entre o que já existe e o que os roadmaps pedem. Use junto com [current-state.md](./current-state.md) e [product.requirements.md](./product.requirements.md).

## Legenda

| Tag | Significado |
|-----|-------------|
| **LIVE** | Existe e é usado em produção/CdT |
| **PARTIAL** | Existe mas incompleto / cosmético / quebrado |
| **HIDDEN** | Código existe, UI ou mount desligado |
| **TARGET** | Só no alvo SaaS (ainda não no runtime) |

---

## Mapa domínio × status

| Domínio | Back | Front | Notas |
|---------|------|-------|-------|
| Login | LIVE | LIVE | Senha plaintext; sem signup/trial |
| Clientes CRUD | LIVE | LIVE | ViaCEP no create; máscara PII na lista |
| Pedidos CRUD | LIVE | LIVE | Códigos loja `0001…`; etiqueta pós-create |
| Kanban status | LIVE | LIVE | Carro-chefe UI; dual status+setor |
| Mover setor | LIVE | LIVE | Livre; off-path exige `note` |
| plannedSectorIds | LIVE | LIVE | Path no create + chips no detalhe |
| Setores configuráveis | — | — | Hardcoded; **TARGET** A2 |
| Conta por setor | PARTIAL | PARTIAL | Roles seed; filtro cosmético; **TARGET** A3 |
| Funcionários (chão) | LIVE | LIVE | ≠ login user |
| Upload fotos | LIVE | LIVE | Limite multer 5 vs UI 8 |
| PDF | LIVE | LIVE | Brand “SHOE REPAIR” |
| ZIP fotos | LIVE | LIVE | CardDetalhes |
| Dashboard KPIs | LIVE | LIVE | |
| Métricas / financeiro | LIVE | LIVE | Gate admin só no front |
| TV Cliente `/tv` | LIVE | LIVE | Sala de espera; fora da sidebar; atalho dashboard |
| TV Oficina `/tv-dashboard` | LIVE | LIVE | Fila por setor; `?hot=1` (ex-TV Chão) |
| E-mail status | LIVE | HIDDEN | Brand CdT; audit UI escondida |
| SMS final | PARTIAL | — | `SMS_ENABLED` |
| WhatsApp | PARTIAL | — | Endpoints manuais; **require quebrado** |
| Consulta/busca | LIVE | LIVE | Paginação `nextToken` |
| Signup / Shop / Trial | TARGET | TARGET | |
| AbacatePay | TARGET | TARGET | |
| Multi-tenant `shopId` | TARGET | TARGET | |

---

## Kanban hoje (detalhe — carro-chefe)

### Como funciona (legado)

1. **Colunas** = strings de **status** (`orderStatus.js`), não setores puros.  
2. **Cards** = `GET /pedidos/kanban/status` (fotos assinadas, sort prioridade).  
3. **Colunas filtradas** = `GET /status/columns/filtered` por role JWT.  
4. **Move:**  
   - mesmo “departamento” → `PATCH /pedidos/:id/status`  
   - troca setor → `POST /pedidos/:id/mover-setor`  
5. Front: DnD HTML5, dialog (funcionário obrigatório, observação), avançar, filtros (hoje/atrasados/alta), compact mode, “somente meu setor”.  
6. `setoresFluxo` no create vem de **heurística por nome de serviço**.

### Problemas de produto

- Dual model status×setor = drift e mapeamento frágil (`montagem` no front, etc.).
- RBAC de move **sempre true** no back.
- Setores não são CRUD por loja.
- Conta de chão não isola de verdade.

### Alvo (kanban tops)

Ver RF-KAN-* em [product.requirements.md](./product.requirements.md): coluna = setor do shop; admin full; sector role filtrado; SLA visual; fila rápida; atalhos.

---

## Rotas HTTP legado (resumo)

Auth: `POST /auth/register|login|refresh-token`  
Clientes: `GET/POST /clientes`, `GET/PUT/DELETE /clientes/:id`  
Pedidos: CRUD + `kanban/status`, `consulta`, `status`, `mover-setor`, `proximo-setor`, PDF, fotos zip, WA manuais  
Status: `GET /status/columns`, `/columns/filtered`  
Setores: `GET /setores` (só lista hardcoded)  
Upload: `POST /upload/fotos`  
Dashboard: `GET /dashboard`  
Funcionários: CRUD soft-delete  
Metrics: departamentos, funcionarios, desempenho, atrasos, resumo, financeiro, overview  
Emails: rotas existem, **não montadas** no `handler.js`

Inventário linha a linha: ver agent analysis / manter este arquivo como índice.

---

## Front — páginas

| Rota | LIVE? | Gap |
|------|-------|-----|
| `/` login | yes | cookie `secure` quebra HTTP local |
| `/dashboard` | yes | logout não limpa localStorage |
| `/dashboard/setores` | yes | sem link no nav |
| `/status` kanban | yes | dual model |
| `/pedidos/novo` | yes | catálogo serviços hardcoded |
| `/pedidos` | **404** | links quebrados |
| `/clientes/**` | yes | |
| `/consultas` | yes | |
| `/funcionarios` | yes | |
| `/admin/*` | yes | |
| `/tv`, `/tv-dashboard` | yes | `/tv` orfã |
| `/emails` | hidden | middleware + flag |
| `/signup`, `/billing`, settings setores | no | TARGET |

UX: sonner **sem** `<Toaster />` → toasts provavelmente invisíveis.

---

## Quick-wins (legado ou bootstrap — alto ROI)

Ver [roadmap.md](./roadmap.md) § Quick-wins e backlog `QW-*`.

---

## Features tops (agregar valor)

Ver [product.requirements.md](./product.requirements.md) § Features tops e roadmap § Tops.
