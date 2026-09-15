# Worqera Kanban + Consultas UX — Implementation Plan

> **For agentic workers:** Execute without commits unless user asks.

**Goal:** Professional multi-column kanban with dnd-kit; split consultas routes; rename TV Chão → TV Oficina.

**Architecture:** Rewrite kanban page layout (md+ columns); consultas becomes hub + two focused pages extracting logic from current monolith; copy/nav renames only for TVs.

**Tech Stack:** Next.js, `@dnd-kit/core` + `@dnd-kit/sortable` (or droppable columns), existing move API.

## Tasks

### 1. Install dnd-kit
- `npm i @dnd-kit/core @dnd-kit/utilities` in `web/`

### 2. Kanban board rewrite
- Desktop: horizontal columns; DragOverlay; drop → `requestMove`
- Mobile: sector chips + one column
- Preserve detail drawer, off-path modal, shortcuts, late filter

### 3. Consultas split
- `/consultas` hub with 2 CTAs
- `/consultas/clientes` — client search only
- `/consultas/pedidos` — order search only
- Redirect old tab query params if needed

### 4. TV rename
- UI copy: TV Chão → TV Oficina (`dashboard`, `nav` if any, `tv-dashboard` title, specs)

### 5. Docs
- roadmap / current-state / change-log / feature-inventory
