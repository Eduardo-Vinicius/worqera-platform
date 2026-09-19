# Avaliações + setor no link público

**Data:** 2026-09-19  
**Status:** implementado (v1)

## Problema

1. Oficinas não tinham tela dedicada às notas 1–5 dos clientes.
2. Mostrar o setor real no `/p` (ex.: Lavagem há 10 dias) prejudica a percepção do cliente.

## Decisões

- **Público:** se `Sector.showOnPublic !== false` → nome do setor; senão → **“Em andamento”** (sem vazar nome). Pronto/Entregue continuam pelo `status`.
- **Default:** `showOnPublic: true` (legado = visível); oficina desmarca no que não quer expor.
- **Avaliações v1:** lista + média + distribuição + tags. Plano de ação = próxima onda.

## Modelo / API

- `Sector.showOnPublic` (Boolean, default true)
- `PATCH /sectors/:id` aceita `showOnPublic`
- `GET /public/.../orders/:code` mascara setor
- Move: e-mail e WhatsApp usam “Em andamento” se destino oculto
- `GET /alerts/feedback?period=30d|90d|all&page=&limit=` → summary + items

## Web

- Setores: toggle **Cliente vê**
- Nav: **Avaliações** (`/avaliacoes`)
- FeedbackBell: link “Ver todas as avaliações”

## Fora de escopo

- Plano de ação (texto + status) e destaque no dashboard
- Rotacionar QR por setor (link/token permanece; só o conteúdo muda)
