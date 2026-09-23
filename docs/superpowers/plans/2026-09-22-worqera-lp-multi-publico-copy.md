# Worqera LP + copy multi-público — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a web (landing, meta, signup hints) refletir o posicionamento multi-público: fila de serviço + planos Basic/Pro/Business + ramos quentes — sem parecer app só de tênis.

**Architecture:** Copy-first. Fonte de verdade da mensagem: `docs/superpowers/specs/2026-09-22-worqera-publicos-posicionamento-design.md`. Alterações concentradas em `web/components/landing/i18n.ts`, seções da LP que leem `t.*`, metadata Next, e um preset de vertical “geral” já existente. Sem novos micro-apps por vertical.

**Tech Stack:** Next.js (App Router), TypeScript, landing i18n PT/EN, existing `Shop.vertical` presets.

## Global Constraints

- Planos públicos: Basic **R$ 147** · Pro **R$ 297** (recomendado) · Business **R$ 499**
- Proibido copy “chão” / “chão de loja” / “TV chão” na UI
- Não inventar vertical imobiliária ou artesanato hobby na LP
- Ramos quentes na LP: calçados, automotivo, lavanderia, assistência, atelier (+ morno opcional: pet, ótica)
- Frase âncora: kanban da operação + status no bolso do cliente
- Preservar design visual atual da LP (só copy / conteúdo / metadata)

## File map

| File | Responsibility |
|------|----------------|
| `docs/superpowers/specs/2026-09-22-worqera-publicos-posicionamento-design.md` | Spec (já criado) |
| `web/components/landing/i18n.ts` | Todas as strings PT/EN da LP |
| `web/components/landing/hero-section.tsx` | Mock kanban labels se ainda genéricos |
| `web/components/landing/trades-section.tsx` | Só se precisar de layout para mais itens |
| `web/app/page.tsx` | Metadata home |
| `web/app/layout.tsx` | Metadata root |
| `web/app/manifest.ts` | PWA description |
| `web/app/signup/page.tsx` | Bullets / subcopy alinhados à promessa |
| `docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md` | Link + lista alinhada ao spec novo |
| `web/specs/change-log.md` + `web/specs/current-state.md` | Registro da onda |

---

### Task 1: Alinhar i18n PT/EN (hero, loop, trades, FAQ, pricing)

**Files:**
- Modify: `web/components/landing/i18n.ts`
- Reference: `docs/superpowers/specs/2026-09-22-worqera-publicos-posicionamento-design.md` §5

**Interfaces:**
- Consumes: `getTranslation(locale)` / `useLanguage().t` (inalterados)
- Produces: strings atualizadas; shape de `t` **sem breaking** (mesmas keys)

- [ ] **Step 1: Conferir keys atuais de pricing/trades/hero**

Run: `rg -n "hero:|trades:|pricing:|faq:" web/components/landing/i18n.ts | head -40`  
Expected: blocos pt e en existem.

- [ ] **Step 2: Atualizar PT — hero + loop + trades + practice + clients + footer**

Aplicar (ou equivalente já parcial — completar gaps):

```ts
hero: {
  brand: "Worqera",
  headline: "A fila do seu negócio, sob controle.",
  sub: "Kanban por setores e consulta pública por código. Calçados, automotivo, lavanderia, atelier — o mesmo loop.",
  cta: "Testar grátis 7 dias",
  secondary: "Já tenho conta",
  note: "Sem cartão · Setup em minutos · Cancele quando quiser",
},
loop: {
  title: "O item muda. O fluxo não.",
  subtitle: "Um loop operacional para qualquer negócio com etapas e cliente perguntando status.",
  // steps: manter 01/02/03; step 02 desc sem “chão”
},
trades: {
  title: "Feito para quem tem fila",
  line: "Se o seu negócio tem etapas e cliente perguntando status, encaixa.",
  hint: "Configure setores e o nome do item na Empresa — sem micro-app por vertical.",
  items: [
    "Calçados",
    "Automotivo",
    "Lavanderia",
    "Assistência",
    "Atelier",
    "Pet",
    "Ótica",
  ],
},
```

Pricing já deve estar Basic 147 / Pro 297 / Business 499 — se não, corrigir nesta task.

FAQ PT — garantir resposta multi-ramo:

```ts
{
  q: "Serve só para tênis?",
  a: "Não. Calçados é onde começamos. O core é fila + consulta — automotivo, lavanderia, assistência, atelier e outros ramos usam o mesmo loop.",
},
```

- [ ] **Step 3: Espelhar EN com a mesma intenção**

```ts
hero: {
  headline: "Your business queue, under control.",
  sub: "Sector kanban and public tracking by code. Footwear, automotive, laundry, atelier — the same loop.",
  // ...
},
trades: {
  title: "Built for anyone with a queue",
  items: ["Footwear", "Automotive", "Laundry", "Repair", "Atelier", "Pet", "Optical"],
},
```

- [ ] **Step 4: Typecheck web**

Run: `cd web && npx tsc --noEmit --pretty false 2>&1 | head -30`  
Expected: exit 0 (sem erros em landing).

- [ ] **Step 5: Commit**

```bash
git add web/components/landing/i18n.ts
git commit -m "$(cat <<'EOF'
docs(lp): align PT/EN copy with multi-audience positioning

EOF
)"
```

---

### Task 2: Metadata + manifest + signup bullets

**Files:**
- Modify: `web/app/page.tsx`
- Modify: `web/app/layout.tsx`
- Modify: `web/app/manifest.ts`
- Modify: `web/app/signup/page.tsx`

- [ ] **Step 1: Metadata home**

Em `web/app/page.tsx`:

```ts
export const metadata = {
  title: "Worqera — A fila do seu negócio, sob controle",
  description:
    "Kanban por setores e consulta pública por código. Calçados, automotivo, lavanderia, atelier — o mesmo loop. Teste grátis 7 dias.",
}
```

- [ ] **Step 2: Root layout + manifest**

`layout.tsx` description: operação para negócios com fila (não “só oficinas de tênis”).  
`manifest.ts` description: `"Kanban por setores e gestão de pedidos para negócios com fila"`.

- [ ] **Step 3: Signup — lista de benefícios alinhada**

Em `web/app/signup/page.tsx`, trocar bullets genéricos/tênis por algo nesta linha:

```ts
const BENEFITS = [
  "Kanban por setores (você configura)",
  "Consulta pública por código / QR",
  "TVs Cliente e Oficina",
  "Financeiro do dono no plano Pro",
  "Serve calçados, lavanderia, assistência, auto…",
]
```

(Ajustar se a lista atual tiver outro nome de constante — manter o padrão do arquivo.)

- [ ] **Step 4: Smoke visual**

Run: abrir `http://127.0.0.1:3000/` (com `make dev`) — conferir hero, #ramos, #pricing, FAQ.  
Expected: sem “chão”; planos 147/297/499; ramos incluem Automotivo.

- [ ] **Step 5: Commit**

```bash
git add web/app/page.tsx web/app/layout.tsx web/app/manifest.ts web/app/signup/page.tsx
git commit -m "$(cat <<'EOF'
feat(web): multi-audience metadata and signup copy

EOF
)"
```

---

### Task 3: Docs — verticais + change-log + current-state

**Files:**
- Modify: `docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md`
- Modify: `web/specs/change-log.md`
- Modify: `web/specs/current-state.md`

- [ ] **Step 1: Atualizar verticais candidatas**

No topo, linkar o spec novo. Em “Candidatas”, alinhar ordem quente:

1. Lavanderia  
2. Assistência  
3. Automotivo leve  
4. Atelier  
5. Pet / ótica (mornos)  

Marcar imobiliário / hobby como **fora**.

- [ ] **Step 2: change-log + current-state**

Entrada curta: posicionamento multi-público na LP; planos Basic/Pro/Business; sem copy “chão”.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-18-worqera-verticais-candidatas.md web/specs/change-log.md web/specs/current-state.md
git commit -m "$(cat <<'EOF'
docs: sync verticals and web state with multi-audience positioning

EOF
)"
```

---

### Task 4 (opcional / follow-up): Presets de signup por vertical

**Files:**
- Modify: shop signup / onboarding presets onde `Shop.vertical` é escolhido (grep `vertical` em `web/app/signup` e `api` seed)

Só se o signup já tiver seletor de vertical — senão **pular** e deixar no backlog.

- [ ] **Step 1:** `rg -n "vertical" web/app/signup web/components/shell api/src/v1 -g '*.ts' -g '*.tsx' -g '*.js' | head -40`
- [ ] **Step 2:** Se existir UI de vertical, incluir labels Automotivo / Lavanderia alinhados ao spec; senão marcar task cancelada no plan.

---

## Self-review

| Spec § | Task |
|--------|------|
| Promessa + frases LP | Task 1 |
| Planos 147/297/499 na web | Task 1 (pricing i18n) + smoke Task 2 |
| Ramos quentes | Task 1 trades |
| Meta / signup | Task 2 |
| Docs públicos | Task 3 |
| Sem micro-app / sem imobiliário | Global constraints |

Sem placeholders TBD nas tasks 1–3.
