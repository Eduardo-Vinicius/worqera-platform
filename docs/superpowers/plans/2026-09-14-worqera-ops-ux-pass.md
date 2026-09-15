# Worqera Ops UX Pass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Slim shell + dashboard TV shortcuts, lean consultas, Worqera rebrand on cadastro/consulta/kanban, real TV screens, and multi-sneaker orders via `Order.items[]` with one kanban card.

**Architecture:** Three waves (A → B → C). A/B are mostly `web/`; C changes `api/` Order schema + serializers first, then form/adapters. Flat `shoeModel`/`services`/`photos` stay mirrored from `items[0]` for legacy. TVs stay outside `(app)`.

**Tech Stack:** Next.js (App Router), Express `/api/v1`, Mongo/Mongoose, Tailwind `--wq-*` tokens, Lucide, sonner.

## Global Constraints

- Spec: [2026-09-14-worqera-ops-ux-pass.md](../specs/2026-09-14-worqera-ops-ux-pass.md)
- UI copy pt-BR; API paths + JSON English
- Brand: Worqera only in core; Casa do Tênis = seed/`legacyBrand`
- Preserve kanban hybrid UX (pipeline chips + active sector + prev/next)
- **Do not commit unless the user explicitly asks**
- After each wave: update `web/specs/roadmap.md` + `current-state.md` (and api equivalents on wave C)
- URL roles (locked): **TV Cliente = `/tv`**, **TV Chão = `/tv-dashboard`** — today content is inverted; wave B must swap/repurpose content to match labels

## File map

| Area | Files |
|------|--------|
| Nav | `web/components/shell/nav.ts`, `AppSidebar.tsx` (if section collapse needed) |
| Dashboard | `web/app/(app)/dashboard/page.tsx` |
| Consultas | `web/app/(app)/consultas/page.tsx` |
| Novo pedido | `web/app/(app)/pedidos/novo/page.tsx` |
| Kanban | `web/app/(app)/kanban/page.tsx` |
| TV Cliente | `web/app/tv/page.tsx` |
| TV Chão | `web/app/tv-dashboard/page.tsx` |
| Adapters / API client | `web/lib/adapters.ts`, `web/lib/apiService.ts`, `web/lib/apiV1.ts` |
| Order model | `api/src/v1/models/Order.js` |
| Order service | `api/src/v1/services/orderService.js` |
| Serializers | `api/src/v1/serializers.js` |
| Routes / controller | `api/src/v1/routes/orderRoutes.js`, `orderController.js` |
| Kanban card API | `api/src/v1/services/kanbanService.js` |
| Specs | `api/specs/backend.endpoints.md`, `api/specs/modeling.md`, roadmaps, current-state |

---

# Onda A — Shell + dashboard + consulta

### Task A1: Slim nav (TVs out; Consultas in Principal; Funcionários in Empresa)

**Files:**
- Modify: `web/components/shell/nav.ts`

**Interfaces:**
- Produces: `NAV_SECTIONS` with Principal (5) + Empresa (4) + Admin (2); no TV entries

- [ ] **Step 1: Replace `NAV_SECTIONS`**

```ts
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
      { href: "/kanban", label: "Kanban", icon: KanbanSquare },
      { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/consultas", label: "Consultas", icon: Search },
    ],
  },
  {
    title: "Empresa",
    items: [
      { href: "/settings/setores", label: "Setores", icon: Layers },
      { href: "/funcionarios", label: "Funcionários", icon: UserCog },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/settings/empresa", label: "Dados", icon: Building2 },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
      { href: "/admin/metrics", label: "Métricas", icon: BarChart3, adminOnly: true },
    ],
  },
]
```

Remove unused `Tv` / `Monitor` imports.

- [ ] **Step 2: Smoke**

Open any `(app)` page. Sidebar must show Principal → Empresa → Admin; no “TV Cliente” / “TV Chão”. `/tv` and `/tv-dashboard` still load if typed/bookmarked.

- [ ] **Step 3: Docs touch**

In `web/specs/roadmap.md`, add under Fases or Quick-wins:

`- [x] Ops UX A1 — nav slim (Consultas em Principal; TVs fora da sidebar)`

---

### Task A2: Dashboard shortcuts row

**Files:**
- Modify: `web/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: existing `getDashboardService` payload
- Produces: shortcut strip under KPI grid

- [ ] **Step 1: Import icons**

Add: `Tv`, `Monitor`, `UserPlus` from `lucide-react` (keep `Plus`).

- [ ] **Step 2: Insert shortcuts after KPI grid, before fila quente**

```tsx
const shortcuts = [
  { href: "/tv", label: "TV Cliente", icon: Tv, external: true },
  { href: "/tv-dashboard", label: "TV Chão", icon: Monitor, external: true },
  { href: "/pedidos/novo", label: "Novo pedido", icon: Plus, external: false },
  { href: "/clientes", label: "Novo cliente", icon: UserPlus, external: false },
]

// JSX — one row, no heavy cards:
<nav
  aria-label="Atalhos rápidos"
  className="flex flex-wrap gap-2 border-b border-[var(--wq-border)] pb-4"
>
  {shortcuts.map((s) => (
    <Link
      key={s.href}
      href={s.href}
      target={s.external ? "_blank" : undefined}
      rel={s.external ? "noopener noreferrer" : undefined}
      className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm text-[var(--wq-text)] hover:bg-white"
    >
      <s.icon className="h-4 w-4 text-[var(--wq-brand)]" />
      {s.label}
    </Link>
  ))}
</nav>
```

Place this **below** the 4 KPI tiles and **above** the hot-queue / by-sector grid.

- [ ] **Step 3: Smoke**

Click TV links → new tab, full-bleed (no sidebar). Novo pedido / clientes stay in-app.

---

### Task A3: Lean consultas first fold

**Files:**
- Modify: `web/app/(app)/consultas/page.tsx`

**Goal:** First viewport = AppHeader + one search + tabs Clientes|Pedidos + dense results. Push secondary filters/dialogs below or behind “Filtros” disclosure if the page is overcrowded today.

- [ ] **Step 1: Header**

Ensure `AppHeader` title `"Consultas"`, subtitle `"Busca por código, nome, telefone ou CPF"`. Remove competing Card titles that repeat the same job above the fold.

- [ ] **Step 2: Search dominance**

Single primary `Input` (large, full width on mobile) + Search icon; keep existing search handlers. Tabs: `Clientes` | `Pedidos` only on the first fold.

- [ ] **Step 3: Dense result rows**

For pedidos rows, prefer:

- code: `font-mono text-lg tracking-tight`
- client name muted
- status chip only for ready / overdue / delivered tones (`--wq-action` / `--wq-warn` / success)
- leave room for later `N pares` badge (wave C); no stub text if count is 1

- [ ] **Step 4: Smoke**

Search by code and by client name; tabs switch; detail/PDF flows that already work must still work.

- [ ] **Step 5: Mark A done in `web/specs/roadmap.md`**

```
- [x] Ops UX Onda A — shell slim + atalhos TV + consulta enxuta
```

---

# Onda B — Rebrand + TVs + kanban DnD polish

### Task B1: Rebrand kanban chips + DnD feedback

**Files:**
- Modify: `web/app/(app)/kanban/page.tsx`

- [ ] **Step 1: Active chip = solid lilac**

Active sector chip classes:

```
bg-[var(--wq-brand)] text-white
```

Idle:

```
bg-[var(--wq-paper)] text-[var(--wq-text)] border border-[var(--wq-border)]
```

- [ ] **Step 2: Drag feedback**

While `draggingId` set:

- card: `opacity-80 ring-2 ring-[var(--wq-brand)]/40`
- chip under `onDragOver`: add `ring-2 ring-[var(--wq-action)]`

Clear ring styles on `onDragLeave` / drop / `onDragEnd`.

- [ ] **Step 3: Card typography**

Order code: `font-mono`. Client: sans. Do **not** add `N pares` until wave C (unless `items` already present from API — then show only if `length > 1`).

- [ ] **Step 4: Smoke**

Drag card onto another chip → sector moves; visual ring visible during drag.

---

### Task B2: Rebrand novo pedido chrome (single-item still)

**Files:**
- Modify: `web/app/(app)/pedidos/novo/page.tsx`

**Note:** Do not implement multi-item state yet. Only visual rhythm so wave C slots into the same layout.

- [ ] **Step 1: Page header**

```tsx
<AppHeader
  title="Novo pedido"
  subtitle="Cliente, tênis e serviços em um fluxo"
/>
```

Title already via AppHeader; ensure page H1/CardTitle does not fight Fraunces — use `font-[family-name:var(--font-fraunces)]` or existing display token if wired in `layout.tsx` / `globals.css`.

- [ ] **Step 2: Client block + sneaker block**

Wrap the sneaker/services/photos section in:

```tsx
<section className="border-l-[3px] border-[var(--wq-brand)] pl-4">
  <h2 className="text-sm font-semibold text-[var(--wq-text)]">Tênis 1</h2>
  {/* existing fields */}
</section>
```

CTA primary buttons: `bg-[var(--wq-action)]`. Avoid gold/Procedy leftovers.

- [ ] **Step 3: Smoke**

Create one order end-to-end (existing single-item payload). Upload photos still works.

---

### Task B3: TV Cliente at `/tv` (waiting room)

**Files:**
- Rewrite: `web/app/tv/page.tsx`

**Current bug vs spec:** `/tv` today is sector floor stats. Replace with **client waiting** UX. Move floor logic to Task B4.

**Data:** Prefer open/in_progress/ready orders via `getOrdersService()` (or existing public-safe list if already used). Filter to statuses meaningful to clients; map sector/status to human PT labels.

- [ ] **Step 1: Full-bleed shell**

```tsx
<div className="min-h-screen bg-[var(--wq-ink)] text-white p-8 md:p-12">
  <header className="flex items-end justify-between gap-6 mb-10">
    <div>
      <p className="text-sm text-white/50">Worqera</p>
      <h1 className="font-[family-name:var(--font-fraunces)] text-4xl md:text-5xl">
        Acompanhe seu pedido
      </h1>
    </div>
    <div className="text-right font-mono text-2xl md:text-3xl tabular-nums">
      {clock}
      <p className="text-sm text-white/50 font-sans">Atualizado há {secondsAgo}s</p>
    </div>
  </header>
  {/* carousel / pages of large tiles */}
</div>
```

- [ ] **Step 2: Large tiles**

Each tile: `code` at `text-5xl md:text-7xl font-mono`, status line `text-2xl md:text-3xl` (e.g. “Em pintura”, “Pronto pra retirar”). ~4–6 tiles per page; auto-advance carousel every ~8s if more.

Refresh interval: **15–20s** (not 30s).

- [ ] **Step 3: Motion**

Use CSS opacity/translate. If `prefers-reduced-motion: reduce`, disable carousel auto-advance and flash animations.

- [ ] **Step 4: Smoke**

Open `/tv` logged-in; codes readable; no AppShell chrome; no pricing.

---

### Task B4: TV Chão at `/tv-dashboard` (floor by sector)

**Files:**
- Rewrite: `web/app/tv-dashboard/page.tsx`

Reuse the **sector statistics** fetch currently in old `/tv` (`getSetoresEstatisticasService`).

- [ ] **Step 1: Sector columns**

Grid of sectors: name + large count; list codes + time-in-sector. Overdue: `text-[var(--wq-warn)]` + soft pulse (`animate-pulse` only if motion OK).

- [ ] **Step 2: New-order flash**

Keep previous-totals ref pattern from current `/tv`; flash column ~1.2s. Optional quiet beep may stay; must not fire under reduced motion.

- [ ] **Step 3: Hot mode**

```ts
const hot = searchParams.get("hot") === "1"
// when hot: only overdue + high priority rows (priority >= threshold used elsewhere, or overdue only if priority missing)
```

Use `useSearchParams` from `next/navigation`.

- [ ] **Step 4: Smoke**

`/tv-dashboard` shows sectors; `?hot=1` filters; refresh 15–20s; no action buttons.

- [ ] **Step 5: Roadmap**

```
- [x] Ops UX Onda B — rebrand + TVs Cliente/Chão + kanban DnD polish
```

---

# Onda C — Multi-item API + form + badges

### Task C1: Schema `items[]` + normalize helpers

**Files:**
- Modify: `api/src/v1/models/Order.js`
- Create: `api/src/v1/services/orderItems.js` (pure helpers — easy to reason about without full HTTP)

**Interfaces:**
- Produces:
  - `normalizeItemsFromPayload(data) → { items, shoeModel, services, photos }`
  - `effectiveItems(order) → items[]` (synthesize from flat if empty)
  - `sumServices(items) → number`

- [ ] **Step 1: Add `orderItemSchema` and `items` field**

In `Order.js`, after `photoSchema`:

```js
const orderItemSchema = new mongoose.Schema(
  {
    shoeModel: { type: String, default: '' },
    services: { type: [serviceItemSchema], default: [] },
    photos: { type: [photoSchema], default: [] },
    notes: { type: String, default: null },
  },
  { _id: true }
);

// inside orderSchema:
items: { type: [orderItemSchema], default: [] },
```

Keep existing flat `shoeModel`, `services`, `photos`.

- [ ] **Step 2: Implement helpers in `orderItems.js`**

```js
function mapService(s) {
  return {
    id: s.id || null,
    name: s.name || s.nome || '',
    price: Number(s.price != null ? s.price : s.preco) || 0,
  };
}

function normalizeItemsFromPayload(data) {
  const rawItems = Array.isArray(data.items) ? data.items : null;
  if (rawItems && rawItems.length) {
    const items = rawItems.map((it) => ({
      shoeModel: it.shoeModel || it.modeloTenis || '',
      services: (it.services || it.servicos || []).map(mapService),
      photos: it.photos || it.fotos || [],
      notes: it.notes || it.observacoes || null,
    }));
    const first = items[0];
    return {
      items,
      shoeModel: first.shoeModel,
      services: first.services,
      photos: first.photos,
    };
  }
  const services = (data.services || data.servicos || []).map(mapService);
  const shoeModel = data.shoeModel || data.modeloTenis || '';
  const photos = data.photos || data.fotos || [];
  const items =
    shoeModel || services.length || photos.length
      ? [{ shoeModel, services, photos, notes: null }]
      : [];
  return { items, shoeModel, services, photos };
}

function effectiveItems(order) {
  if (Array.isArray(order.items) && order.items.length) return order.items;
  return [
    {
      shoeModel: order.shoeModel || '',
      services: order.services || [],
      photos: order.photos || [],
      notes: null,
    },
  ];
}

function sumServices(items) {
  return (items || []).reduce(
    (acc, it) =>
      acc +
      (it.services || []).reduce((s, x) => s + (Number(x.price) || 0), 0),
    0
  );
}

module.exports = { normalizeItemsFromPayload, effectiveItems, sumServices, mapService };
```

- [ ] **Step 3: Manual node smoke (optional)**

```bash
node -e "const h=require('./api/src/v1/services/orderItems'); console.log(h.normalizeItemsFromPayload({items:[{shoeModel:'A',services:[{name:'X',price:10}]},{shoeModel:'B',services:[{name:'Y',price:20}]}]}))"
```

Expect `items.length === 2`, `shoeModel === 'A'`, sum path via `sumServices` = 30.

---

### Task C2: create/update + serialize items; legacy mirror

**Files:**
- Modify: `api/src/v1/services/orderService.js`
- Modify: `api/src/v1/serializers.js`
- Modify: `api/src/v1/services/kanbanService.js` (cover photo from item[0] if needed)

**Interfaces:**
- `createOrder` accepts `items[]` or flat
- `serializeOrder` always returns `items` (effective) + flat mirrors + `itemCount`

- [ ] **Step 1: Wire createOrder**

At start of create body build:

```js
const { normalizeItemsFromPayload, sumServices } = require('./orderItems');
const normalized = normalizeItemsFromPayload(data);
const services = normalized.services;
const computedTotal = sumServices(normalized.items);
// ... deposit logic unchanged ...
// Order.create({ ..., items: normalized.items, shoeModel: normalized.shoeModel, services, photos: normalized.photos, pricing: { total, ... } })
```

- [ ] **Step 2: Wire updateOrder / patch**

If `data.items` provided, re-normalize and set flat mirrors + recompute `pricing.total` when pricing not explicitly sent.

- [ ] **Step 3: serializeOrder**

```js
const { effectiveItems } = require('./services/orderItems'); // adjust path if serializers stay at v1 root — prefer require from serializers' relative path `./services/orderItems` only if moved; from `serializers.js` use `./services/orderItems` — WAIT: serializers is at `api/src/v1/serializers.js`, so `require('./services/orderItems')`.

function serializeOrderItem(it) {
  return {
    id: it._id ? String(it._id) : undefined,
    shoeModel: it.shoeModel || '',
    services: (it.services || []).map((s) => ({
      id: s.id || null,
      name: s.name || '',
      price: Number(s.price) || 0,
    })),
    photos: (it.photos || [])
      .map((p) => (typeof p === 'string' ? p : p?.url))
      .filter(Boolean),
    notes: it.notes || null,
  };
}

// in serializeOrder return:
items: effectiveItems(order).map(serializeOrderItem),
itemCount: effectiveItems(order).length,
// keep existing shoeModel / services / photos from order flat (already mirrored)
```

- [ ] **Step 4: HTTP smoke**

```bash
# after login token + shop:
curl -s -X POST "$API/api/v1/orders" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"clientName":"Teste","items":[{"shoeModel":"Nike A","services":[{"name":"Limpeza","price":50}]},{"shoeModel":"Adidas B","services":[{"name":"Cola","price":40}]}]}'
```

Expect response `items.length === 2`, `shoeModel` = first, `pricing.total` = 90, single `code`.

Legacy:

```bash
curl ... -d '{"clientName":"Legado","shoeModel":"Só um","services":[{"name":"X","price":10}]}'
```

Expect `items` length 1 in serialize.

---

### Task C3: Photos per item + fallback item 0

**Files:**
- Modify: `api/src/v1/routes/orderRoutes.js`
- Modify: `api/src/v1/controllers/orderController.js`
- Modify: `api/src/v1/services/orderService.js` (`uploadPhotos` / new `uploadItemPhotos`)

- [ ] **Step 1: Route**

```js
router.post(
  '/:id/items/:itemIndex/photos',
  ...guard,
  orderController.uploadPhotosMiddleware,
  orderController.uploadItemPhotos
);
```

Keep `POST /:id/photos` → item 0 + flat `photos`.

- [ ] **Step 2: Service**

```js
async function uploadItemPhotos(shopId, orderId, itemIndex, files) {
  const order = await Order.findOne({ _id: orderId, shopId });
  if (!order) { const e = new Error('Order not found'); e.status = 404; throw e; }
  // ensure items array exists (hydrate from flat if empty)
  if (!order.items?.length) {
    order.items = [{ shoeModel: order.shoeModel, services: order.services, photos: order.photos, notes: null }];
  }
  const idx = Number(itemIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= order.items.length) {
    const e = new Error('Invalid item index'); e.status = 400; throw e;
  }
  // reuse storage write like uploadPhotos; append to order.items[idx].photos
  // if idx === 0, also set order.photos = order.items[0].photos
  await order.save();
  return order.toObject();
}
```

`uploadPhotos` (existing): call `uploadItemPhotos(..., 0, files)` or duplicate write then sync flat.

- [ ] **Step 3: Controller export `uploadItemPhotos`** returning serialized order photos for that item.

- [ ] **Step 4: Document in `api/specs/backend.endpoints.md`**

Add:

```
POST /orders/:id/items/:itemIndex/photos  multipart field photos
POST /orders/:id/photos                   → item 0 (legacy)
```

Response order includes `items[].photos`.

---

### Task C4: Front adapters + API client

**Files:**
- Modify: `web/lib/adapters.ts`
- Modify: `web/lib/apiService.ts`
- Modify: `web/lib/apiV1.ts` (if create/upload helpers live there)

- [ ] **Step 1: adaptOrder**

```ts
const items = Array.isArray(raw.items) && raw.items.length
  ? raw.items
  : [{ shoeModel: raw.shoeModel || raw.modeloTenis || "", services: raw.services || raw.servicos || [], photos: photos, notes: null }]

return {
  ...existing fields,
  items,
  itemCount: raw.itemCount ?? items.length,
  // flat mirrors from items[0] for old UI
  shoeModel: items[0]?.shoeModel || shoeModel,
  modeloTenis: items[0]?.shoeModel || shoeModel,
}
```

- [ ] **Step 2: createPedidoService**

Accept optional `items` array. Body:

```ts
items?: Array<{ shoeModel: string; services: Array<{ id?: string; name: string; price: number }>; notes?: string }>
```

If `items` provided, send `{ clientId, clientName, ..., items, warranty, pricing }` and omit redundant flat or still send flat mirrors of `[0]` for safety.

- [ ] **Step 3: upload helper**

```ts
export async function uploadPedidoItemFotosService(pedidoId: string, itemIndex: number, files: File[]) {
  const fd = new FormData()
  files.forEach((f) => fd.append("photos", f))
  return fetch(`${API_BASE_URL}/orders/${pedidoId}/items/${itemIndex}/photos`, {
    method: "POST",
    headers: getAuthHeadersMultipart(), // auth only, no Content-Type
    body: fd,
  })
}
```

Keep `uploadPedidoFotosService` → `/photos` (item 0).

---

### Task C5: Multi-tênis form UI

**Files:**
- Modify: `web/app/(app)/pedidos/novo/page.tsx`

- [ ] **Step 1: State**

```ts
type OrderItemDraft = {
  sneaker: string
  selectedServices: SelectedService[]
  photos: File[]
  notes: string
}

const [items, setItems] = useState<OrderItemDraft[]>([
  { sneaker: "", selectedServices: [], photos: [], notes: "" },
])
```

Migrate existing single sneaker/services/photos state into `items[0]` (or replace).

- [ ] **Step 2: Render**

Map `items` → sections “Tênis {n}” with lilac left border (from B2). Button:

```tsx
<button type="button" className="text-sm text-[var(--wq-brand)] underline-offset-2 hover:underline" onClick={() => setItems([...items, emptyDraft])}>
  + Outro tênis
</button>
```

Remove item control when `items.length > 1`.

- [ ] **Step 3: Submit**

```ts
await createPedidoService({
  clientId: ...,
  items: items.map((it) => ({
    shoeModel: it.sneaker,
    services: it.selectedServices.map(...),
    notes: it.notes || undefined,
  })),
  // warranty / deposit / dueAt at order level as today
})
// then for each item index with files: uploadPedidoItemFotosService(id, index, files)
```

- [ ] **Step 4: Smoke**

Create order with 2 tênis + photos on both; detail/list shows both; pricing = sum.

---

### Task C6: Kanban + listas badge `N pares`

**Files:**
- Modify: `web/app/(app)/kanban/page.tsx`
- Modify: `web/app/(app)/pedidos/page.tsx` (and consultas row if applicable)

- [ ] **Step 1: Badge helper**

```ts
function pairCount(o: any) {
  return Number(o.itemCount || o.items?.length || 1)
}
// JSX when pairCount(o) > 1:
<Badge variant="secondary" className="font-mono text-xs">{pairCount(o)} pares</Badge>
```

- [ ] **Step 2: Smoke**

Multi-item order = one card, badge visible; drag still one move for whole order.

---

### Task C7: Specs + roadmaps closeout

**Files:**
- Modify: `api/specs/backend.endpoints.md`
- Modify: `api/specs/modeling.md` (Order.items)
- Modify: `api/specs/roadmap.md`, `api/specs/current-state.md`
- Modify: `web/specs/roadmap.md`, `web/specs/current-state.md`, `web/specs/frontend.integration.md` (items create/upload)

- [ ] **Step 1: modeling** — document `items[]` + flat mirror rule  
- [ ] **Step 2: endpoints** — create body `items`, photo routes  
- [ ] **Step 3: roadmaps** — mark Ops UX Onda C done; note multi-item shipped  
- [ ] **Step 4: current-state** — one paragraph each api/web  

---

## Verification checklist (full pass)

1. Sidebar: no TVs; Consultas in Principal; Funcionários in Empresa  
2. Dashboard shortcuts open TVs in new tab without shell  
3. `/tv` = waiting room large type; `/tv-dashboard` = sector floor (+ `?hot=1`)  
4. Kanban DnD ring teal; one card per order  
5. Two sneakers → one code, `items.length === 2`, badge `2 pares`  
6. Legacy single flat order still lists/moves/consults  
7. No “Casa do Tênis” hardcoding introduced  

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-09-14-worqera-ops-ux-pass.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — same session, batch with checkpoints  

Which approach?
