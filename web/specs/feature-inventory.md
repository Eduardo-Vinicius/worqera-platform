# Worqera Web — Inventário de features

**Atualizado:** 2026-09-15  
Complementa [current-state.md](./current-state.md). Inventário canônico cross-stack: [`../../api/specs/feature-inventory.md`](../../api/specs/feature-inventory.md).

## Páginas × capacidades

| Rota | Capacidades | Gaps |
|------|-------------|------|
| `/` | Landing marketing → signup/login | |
| `/login` | Login e-mail/senha | |
| `/signup` | Trial 7 dias | |
| `/dashboard` | KPIs, recentes, atalhos TV Cliente/Chão (nova aba, sem shell), novo pedido/cliente | Emails flag off |
| `/dashboard/setores` | Cards por setor + lista pedidos; poll 30s | Orfã no nav |
| `/status` | Redirect `/kanban` | |
| `/pedidos/novo` | Multi-tênis (`items[]`), sticky CTA, pós-create → etiqueta | Catálogo ainda com fallback local |
| `/pedidos/[id]/etiqueta` | Código grande + QR `/p/{code}`; modo pares `{code}-n` | |
| `/pedidos` | Lista + badge `N pares` + filtro garantia | |
| `/settings/servicos` | CRUD catálogo `/services` | |
| `/clientes` | Lista, busca, edit modal, máscara PII | |
| `/clientes/novo` | Cadastro + ViaCEP | |
| `/clientes/[id]` | Detalhe read-only | |
| `/consultas` | Hub: Clientes \| Pedidos | |
| `/consultas/clientes` | Busca clientes + pedidos do selecionado | |
| `/consultas/pedidos` | Busca pedidos, detalhe, PDF, etiqueta | |
| `/funcionarios` | Create/edit/desativar, filtro setor (API) | |
| `/admin/financeiro` | Receita/sinal/restante/despesas, períodos | |
| `/admin/metrics` | Overview ops/SLA/produtividade | |
| `/tv` | **TV Cliente** — sala de espera, códigos grandes, carousel | Fora da sidebar; atalho no dashboard |
| `/tv-dashboard` | **TV Oficina** — fila por setor, flash; `?hot=1` | Fora da sidebar |
| `/emails` | — | REMOVIDO (QW-14) |

## Kanban UI (carro-chefe) — comportamento atual

- Desktop: colunas horizontais + `@dnd-kit` drag entre setores
- Mobile: 1 coluna + chips de setor
- Fora do fluxo → modal com comentário obrigatório
- Drawer detalhe + atalhos j/k · 1–9 · Enter · n
- Badge `N pares` quando `itemCount > 1`

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
| Atalhos TV (fora do shell) | dashboard → `/tv`, `/tv-dashboard` | Ops UX |
| Catálogo serviços por shop | `/settings/servicos` + novo pedido | TOP |
| Consulta pública por código | `/p/[codigo]` | TOP |
| Comando rápido kanban (já parcial) | header status | TOP polish |
