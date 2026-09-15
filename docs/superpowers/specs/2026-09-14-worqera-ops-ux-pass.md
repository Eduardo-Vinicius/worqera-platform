# Worqera Ops UX Pass — Design Spec (2026-09-14)

## Em uma frase

Enxugar o shell, rebrandar cadastro/consulta/kanban com identidade Worqera, redesenhar TVs para leitura a distância, e permitir **vários tênis num único pedido** (`Order.items[]`) com **um card no kanban**.

## Relação com specs anteriores

- Plataforma: [2026-09-14-worqera-platform-design.md](./2026-09-14-worqera-platform-design.md)
- UI redesign (shell/tokens/API EN): [2026-09-14-worqera-ui-redesign.md](./2026-09-14-worqera-ui-redesign.md) — **este ciclo não reabre** paleta, fontes nem AppShell base; só afina navegação, telas e modelo de pedido.

## Decisões fechadas

| Tema | Decisão |
|------|--------|
| Multi-item | Modelo **A**: um pedido com `items[]` (cada tênis = item) |
| Kanban | **Um card por pedido**; badge `N pares` quando `items.length > 1` |
| Sidebar | Slim **A**: Principal + Empresa + Admin; **sem TVs** na nav |
| TVs | Atalhos no **dashboard**; rotas `/tv` e `/tv-dashboard` fora do AppShell |
| Entrega | Ondas **1**: shell/nav → rebrand + TVs → multi-item API+UI |
| Copy UI | pt-BR |
| API | Inglês (paths + JSON); flat fields legados mantidos para pedidos antigos |
| Marca | Worqera; Casa do Tênis só seed/`legacyBrand` |

## Fora de escopo

- WhatsApp auto / e-mail v1  
- Conta `role: sector` completa  
- AbacatePay produção real  
- Dark mode  
- Vários códigos / batch de pedidos (modelos B/C)  
- DnD entre colunas horizontais (kanban continua híbrido por setor ativo)

---

## 1. Shell enxuto + dashboard + consulta

### Sidebar (`web/components/shell/nav.ts`)

**Principal**

- Visão geral → `/dashboard`
- Kanban → `/kanban`
- Pedidos → `/pedidos`
- Clientes → `/clientes`
- Consultas → `/consultas`

**Empresa** (grupo; pode colapsar)

- Setores → `/settings/setores`
- Funcionários → `/funcionarios`
- Billing → `/billing`
- Dados → `/settings/empresa`

**Admin** (role-gated)

- Financeiro → `/admin/financeiro`
- Métricas → `/admin/metrics`

**Remover da sidebar:** TV Cliente, TV Chão (links `/tv`, `/tv-dashboard`).

Densidade: manter sidebar ~246px e tokens `--wq-*` existentes; menos seções = menos ruído.

### Dashboard — atalhos rápidos

Faixa **abaixo** dos KPIs (não substitui fila quente / setores):

| Atalho | Destino |
|--------|---------|
| TV Cliente | `/tv` (nova aba preferível) |
| TV Chão | `/tv-dashboard` (nova aba) |
| Novo pedido | `/pedidos/novo` |
| Novo cliente | fluxo/rota de cliente existente |

Uma linha, ícones Lucide + label; sem cards inchados.

### Consultas (`/consultas`)

- Uma busca dominante: código / nome / telefone / CPF  
- Tabs **Clientes | Pedidos**  
- Lista densa: código em JetBrains Mono, cliente, badge `N pares` quando aplicável, status  
- Sem “dashboard-lite” ao redor; filtros avançados só se já existirem e forem necessários após a busca

---

## 2. Multi-item — API + form + kanban

### Modelo de dados

Novo subdocumento por item (tênis):

```
items[]: {
  shoeModel: string
  services: [{ id, name, price }]
  photos: [{ key, url, isCover }]
  notes?: string
}
```

**Pedido (nível order):** cliente, garantia (`warranty`), pricing agregado, setor atual, status, prioridade, dueAt, assignee, notes gerais, `code` único.

**Compatibilidade legada**

- Pedidos antigos / single-item: manter campos flat `shoeModel`, `services`, `photos` no schema.  
- Leitura canônica: se `items` vazio e flat preenchido → tratar como 1 item virtual.  
- Escrita nova: preencher `items[]` e **espelhar** item[0] nos flat fields (serializers/adapters e PDF/etiqueta não quebram).  
- `pricing.total` = soma dos serviços de todos os itens (+ regras de garantia no nível do pedido, como hoje).

### Fotos

- Preferência: upload por item, ex. `POST /orders/:id/items/:itemIndex/photos` (multipart field `photos`).  
- Rota antiga de fotos do pedido → aplica em **item 0** (e espelha flat `photos`).

### Form — novo pedido (`/pedidos/novo`)

1. Cliente uma vez no topo  
2. Blocos **Tênis 1…N** (faixa lilac fina à esquerda; não card pesado)  
   - modelo, serviços, fotos, notes opcional  
3. Controle textual/outline **“+ Outro tênis”** (não pill dourada)  
4. Remover tênis (se N > 1)  
5. CTA principal teal (criar); secundários ghost/ink  

Validação: pelo menos 1 item com modelo ou serviços; cliente obrigatório como hoje.

### Kanban

- Continua híbrido (chips de pipeline + lista do setor ativo)  
- **Um card por pedido**  
- Badge `N pares` se `items.length > 1` (ou equivalente legado = 1)  
- DnD nos chips: elevação leve no drag; chip-alvo com ring teal  
- Prev/next e filtros atuais preservados  

### Serializers / front

- API response EN: `items`, `shoeModel`, `photos`, `code`, …  
- `web/lib/adapters.ts`: mapear `items` → UI; se só flat, sintetizar `items: [one]`  
- Listagens (`/pedidos`, consultas, TV): mostrar modelo do 1º item + `+N` ou badge pares

---

## 3. TVs (tela cheia, leitura a distância)

Rotas **fora** de `web/app/(app)/` — sem AppShell. Auto-refresh **15–20s**. Contraste alto; tipografia grande; sem botões de ação.

### TV Cliente — `/tv` (sala de espera)

- Fundo ink; wordmark da oficina (`legacyBrand`/shop name) ou Worqera discreto  
- Carrossel ou blocos grandes: **código mono 48–96px** + status em linguagem humana (“Em pintura”, “Pronto pra retirar”)  
- Só estados relevantes ao cliente (em andamento / pronto); **sem** financeiro  
- Relógio + “Atualizado há Xs”  
- Poucos itens por viewport (3–5 m de leitura)  
- Respeitar `prefers-reduced-motion` (sem strobe)

### TV Chão — `/tv-dashboard` (oficina)

- Grid por **setor**: nome + contagem grande  
- Por coluna: códigos + tempo no setor; atrasados em âmbar com pulso suave  
- Flash curto quando entra pedido novo no setor  
- Modo opcional “só fila quente” (atrasados + prioridade) via query, ex. `?hot=1`  
- Somente leitura  

### Auth / kiosk

- Sessão já autenticada (login uma vez, TV aberta); `?shop=` só se já existir padrão no código — não inventar auth paralela neste ciclo.

---

## 4. Rebrand visual (Worqera, não clone Procedy)

Tokens inalterados (ink / lilac / teal / paper). Ritmo e tipografia:

| Tela | Direção |
|------|---------|
| Novo pedido | Título Fraunces; blocos tênis com faixa lilac; CTA teal; dropzone limpa |
| Consulta | Hero mínimo (busca); código mono grande; chips de status só quando importam |
| Kanban | Chip ativo lilac sólido; idle paper/ink; card: código mono + cliente + badge pares; feedback DnD teal |

Menos borda/sombra; hierarquia por tipo e espaço. Zero hardcode “Casa do Tênis” no core.

---

## Ondas de entrega

### Onda A — Shell + dashboard + consulta

1. Atualizar `NAV_SECTIONS` (slim; TVs fora)  
2. Faixa de atalhos no dashboard  
3. Consulta enxuta (busca + tabs + lista)

### Onda B — Rebrand + TVs + polish kanban

1. Visual cadastro / consulta / kanban (Fraunces, faixa lilac, chips, DnD ring)  
2. Redesign `/tv` e `/tv-dashboard` conforme §3  
3. DnD polish nos chips (sem mudar modelo de dados ainda — badge `N pares` stub só se `items` já existir; senão omitir)

### Onda C — Multi-item API + form

1. Schema `items[]` + create/update + serializers + espelho flat  
2. Upload fotos por item (+ fallback item 0)  
3. Form “+ Outro tênis”; adapters; badge no kanban/listas  
4. Atualizar `api/specs/backend.endpoints.md`, `modeling.md`, roadmaps, current-state

---

## Critérios de sucesso

1. Sidebar sem TVs; TVs abrem pelo dashboard em tela cheia  
2. Consulta: uma busca clara, resultado denso, sem chrome de dashboard  
3. TV Cliente legível a ~3 m; TV Chão mostra fila por setor sem ações  
4. Criar pedido com 2+ tênis → um `code`, `items.length >= 2`, um card no kanban com badge  
5. Pedidos legados (só flat) continuam listando, movendo e consultando  
6. Cadastro/consulta/kanban reconhecíveis como Worqera (lilac/teal/Fraunces), não ouro Procedy  

## Referências de implementação

- Nav: `web/components/shell/nav.ts`  
- Shell: `web/components/shell/*`, `web/app/(app)/layout.tsx`  
- Order: `api/src/v1/models/Order.js`  
- Kanban: `web/app/(app)/kanban/page.tsx`  
- TVs: `web/app/tv/page.tsx`, `web/app/tv-dashboard/page.tsx`  
- Adapters: `web/lib/adapters.ts`
