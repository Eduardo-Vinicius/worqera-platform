# Design: Onda Worqera — Loop + Home + Multi-vertical

**Data:** 2026-09-18  
**Status:** aprovado para execução (escopo A + melhorias de produto enquanto owner fora)

## Promessa

Worqera deixa de parecer “app de tênis” e vira **sistema de fila operacional por empresa**: pedido → etiqueta/QR → consulta → WhatsApp → retirada. Cada loja configura a própria linguagem do item.

## Entregas desta onda (ordem)

### E1 — Loop do Cliente (escopo A)
- Zap `created` na etiqueta pós-create
- “Avisar cliente” persistente em pedido `ready` (kanban + consulta)
- Drawer/kanban usam templates da Empresa
- Checklist ensina o loop (etiqueta, consulta, Zap)

### E2 — Home / Dashboard profissional
- Hierarquia clara: urgência → ações → fila → setores
- Menos “painel genérico”; mais “o que fazer agora”
- Shortcuts com copy neutra

### E3 — Tour / onboarding fluido
- Checklist = tour do Loop (não só setup técnico)
- Copy profissional, passos curtos

### E4 — Fluidez cadastro / consulta
- Labels neutros (`item` configurável)
- Validação/copy sem “tênis” hardcoded no core UI
- Consulta pública alinhada ao noun da loja

### E5 — Base multi-vertical
- Campo `Shop.vertical` + `branding.itemLabel` / `itemLabelPlural`
- Presets de copy (calçados, lavanderia, assistência, geral…)
- Defaults de signup: **geral** (setores genéricos); seed CdT continua footwear
- Documentar verticais candidatas (não implementar todas agora)

### Fora desta onda
- Meta Cloud API, billing CTA profundo, app nativo (próximo planejamento), NF-e

## Modelo de dados (mínimo)

```
Shop.vertical: 'general' | 'footwear' | 'laundry' | 'repair' | 'custom'
Shop.branding.itemLabel: string        // ex: "peça", "tênis", "roupa"
Shop.branding.itemLabelPlural: string  // ex: "peças", "tênis", "roupas"
```

UI lê via helper `useItemNoun()` / `getItemNoun(shop)`.

## Critérios de sucesso

1. Criar pedido → etiqueta oferece “Avisar no Zap” com template `created`
2. Pedido no terminal → botão “Avisar pronto” sem depender do toast
3. Nenhuma string “tênis” obrigatória no fluxo core se vertical ≠ footwear
4. Dashboard responde em &lt;2s e mostra próximas ações úteis
5. Spec + plan + roadmaps atualizados
