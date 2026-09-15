# Worqera UI Redesign — Design Spec (2026-09-14)

## Em uma frase

Redesenhar o web Worqera com **densidade e shell do Console Procedy**, **paleta própria** (ink + teal + lilás), kanban **híbrido sem scroll horizontal**, e contrato API **100% inglês** (paths + JSON).

## Decisões fechadas

| Tema | Decisão |
|------|--------|
| Referência UX | `procedy-platform/web/template` — Console da Loja (densidade), não clone de marca |
| Identidade | Layout Procedy + **paleta Worqera** (não ink/ouro Procedy) |
| Paleta | Ink `#0F172A`, action teal `#0D9488`, brand lilás `#7C6CF0`, paper `#F4F5F7` |
| Tipografia | Display serif (Fraunces/Newsreader) + Plus Jakarta Sans + JetBrains Mono |
| Abordagem | Design system + shell first; ondas C |
| Kanban | Híbrido: mini-pipeline topo + board do setor ativo (scroll só vertical) |
| Copy UI | pt-BR |
| API | Paths + keys JSON em **inglês**; UI traduz |
| Escopo API neste redesign | Remover leftovers PT (`/setores`, `/funcionarios`, …); serializers legacy PT → EN |

## Fora de escopo (neste ciclo)

- AbacatePay produção real  
- Conta `role: sector` UI completa  
- WhatsApp auto / e-mail v1  
- TVs (só cabem no shell; visual TV depois)  
- Dark mode  

## Tokens

| Token | Hex | Uso |
|-------|-----|-----|
| `--wq-ink` | `#0F172A` | Sidebar, painéis escuros |
| `--wq-ink-2` | `#1E293B` | Hover / cards ink |
| `--wq-brand` | `#7C6CF0` | Logo, nav ativa |
| `--wq-brand-soft` | `rgba(124,108,240,0.16)` | Fundo item ativo |
| `--wq-action` | `#0D9488` | CTAs operacionais |
| `--wq-paper` | `#F4F5F7` | Fundo páginas auth |
| `--wq-surface` | `#FFFFFF` | Cards |
| `--wq-text` | `#0F172A` | Texto forte |
| `--wq-text-muted` | `#64748B` | Secundário |
| `--wq-border` | `#E2E8F0` | Bordas |
| success / warn / danger | `#059669` / `#D97706` / `#DC2626` | Só estados |

Densidade: sidebar 246px; page pad ~32×28; card radius 16–18; input radius 10; Lucide stroke ~1.7.

## Ondas de entrega

### Onda 0 — API inglês (junto com o redesign)

Rotas PT restantes → EN:

| Antes | Depois |
|-------|--------|
| `GET /dashboard/setores` | `GET /dashboard/sectors` |
| `GET /metrics/departamentos` | `GET /metrics/departments` |
| `GET /metrics/funcionarios` | `GET /metrics/employees` |
| `GET /metrics/funcionarios/desempenho` | `GET /metrics/employees/performance` |
| `GET /metrics/atrasos` | `GET /metrics/delays` |
| `GET /metrics/resumo` | `GET /metrics/summary` |
| `GET /metrics/financeiro` | `GET /metrics/finance` |

Payload: serializers passam a expor keys EN (`name`, `code`, `photos`, `sectors`, …). Remover aliases PT no response canônico; aceitar PT só em **input** de migração se necessário, depois dropar. Multipart field `fotos` → `photos`. Front `apiService` / `apiV1` atualizado na mesma onda.

Atualizar `api/specs/backend.endpoints.md` + `web/specs/frontend.integration.md`.

### Onda 1 — Tokens + Login + AppShell

- CSS vars em `web/app/globals.css`; fontes no `layout.tsx`
- Login/signup split-screen (ink | form)
- `AppShell`: sidebar seccionada + header sticky + main max ~1320
- Layout autenticado compartilhado; remover headers duplicados por página (gradual)
- Nav: Principal / Operação / Empresa / Admin (role-gated)

### Onda 2 — Dashboard + Empresa

- Dashboard: 4 KPIs + fila quente + resumo por setor + atividade (sem grid “ações rápidas” como menu)
- Empresa: Setores, Billing, Dados (`/settings/empresa`) no visual shell

### Onda 3 — Kanban híbrido

- Pipeline chips (contagens) + lista do setor ativo
- Move: DnD no chip ou prev/next
- Toggle overview (drawer contagens) — sem board horizontal largo
- Preservar filtros / detalhe / PDF / assignee

### Onda 4 — Fluxo de pedido

- Clientes, `/pedidos/novo` wizard curto, `/pedidos` tabela, detalhe drawer, consultas + pública alinhados aos tokens

## Arquitetura UI

```
web/app/(auth)/          login, signup — sem shell
web/app/(app)/layout.tsx AppShell
  components/shell/      Sidebar, Header, UserMenu
  components/ui/         shadcn/radix existentes, retemados
lib/theme / globals.css  tokens --wq-*
```

Rotas públicas (`/p/[codigo]`, TVs) fora do AppShell ou shell mínimo.

## Critérios de sucesso

1. Login parece produto (não card genérico no centro)  
2. Qualquer tela auth tem a mesma sidebar; zero “voltar ao dashboard” improvisado  
3. Kanban: nenhum scroll horizontal obrigatório no fluxo principal  
4. Zero path/response key PT no contrato `/api/v1` documentado  
5. Densidade: KPIs + ações visíveis acima da dobra no dashboard  

## Referências

- Template: `/Users/eduardo/Documents/Repo/procedy-platform/web/template/README.md`
- Plataforma: [2026-09-14-worqera-platform-design.md](./2026-09-14-worqera-platform-design.md)
- Endpoints: [api/specs/backend.endpoints.md](../../../api/specs/backend.endpoints.md)
