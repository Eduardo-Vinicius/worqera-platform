# Worqera Web — Inventário de features

**Atualizado:** 2026-09-14  
Complementa [current-state.md](./current-state.md). Inventário canônico cross-stack: [`../../api/specs/feature-inventory.md`](../../api/specs/feature-inventory.md).

## Páginas × capacidades

| Rota | Capacidades | Gaps |
|------|-------------|------|
| `/` | Login e-mail/senha | Sem signup; cookie secure em HTTP local |
| `/dashboard` | KPIs, recentes, quick links, logout, link TV cliente | Logout incompleto; emails flag off; sem link `/tv` nem `/dashboard/setores` |
| `/dashboard/setores` | Cards por setor + lista pedidos; poll 30s | Orfã no nav |
| `/status` | Kanban DnD, filtros, PDF, modal, mover setor, prioridade, atrasados | Colunas=status; setores client hardcoded |
| `/pedidos/novo` | Cliente, serviços, fluxo, garantia, acessórios, fotos, sinal, draft local | Catálogo serviços fixo; link “voltar” pra `/pedidos` 404 |
| `/pedidos` | — | **404** |
| `/clientes` | Lista, busca, edit modal, máscara PII | |
| `/clientes/novo` | Cadastro + ViaCEP | |
| `/clientes/[id]` | Detalhe read-only | |
| `/consultas` | Busca clientes/pedidos, filtros, edit, PDF | Badges status genéricos fracos |
| `/funcionarios` | Create/edit/desativar, filtro setor | Setores hardcoded |
| `/admin/financeiro` | Receita/sinal/restante/despesas, períodos | |
| `/admin/metrics` | Overview ops/SLA/produtividade | |
| `/tv` | Contagem por setor, flash/beep | Sem nav |
| `/tv-dashboard` | Filas pending/progress/ready/overdue | |
| `/emails` | Audit logs | Middleware bloqueia |

## Kanban UI (carro-chefe) — comportamento atual

- Fontes: `columns/filtered` + `pedidos/kanban/status` + `columns` (targets)
- DnD → dialog funcionário + observação
- Ações: avançar, mover select, PDF, detalhe (`CardDetalhesPedido`)
- Filtros: funcionário, texto, prioridade, hoje/atrasados/24h/alta, compact, colunas colapsáveis, “meu setor”
- Componentes: `MoverSetorButton`, `SetorProgress`, cores em `lib/setores.ts`

## Alvo UI (sem gap com back)

| Feature | Rota / área | Fase |
|---------|-------------|------|
| Board = setores do shop | `/kanban` (ou `/status` evoluído) | W2 |
| CRUD setores | `/settings/setores` | W2 |
| Conta setor (board filtrado) | mesmo board | W4 |
| Signup + trial banner | `/signup`, shell | W1 |
| Billing / bloqueio | `/billing` | W3 |
| Lista pedidos | `/pedidos` | QW / W5 |
| Toaster global | `layout` | QW |
| Nav TV + setores dash | shell | QW |
| Catálogo serviços por shop | `/settings/servicos` + novo pedido | TOP |
| Consulta pública por código | `/p/[codigo]` | TOP |
| Comando rápido kanban (já parcial) | header status | TOP polish |
