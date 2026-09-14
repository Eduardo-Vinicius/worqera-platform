# Worqera — monorepo

Front (Next.js) em `web/` · API (Node.js / Express / AWS Lambda) em `api/`. Um Git só neste repositório.

## Como rodar (dev)

Em dois terminais:

```bash
# 1) API (Mongo + host Node — legado + /api/v1)
make api-dev
# opcional: make api-seed   # Casa do Tênis + admin@worqera.local / admin123

# 2) Front
make web-dev
# ou: cd web && npm install && npm run dev
```

- Front: http://localhost:3000  
- API: http://localhost:3001 (`/health`, `/api/v1/...`, rotas legado)  
- Signup SaaS: `/signup` · Kanban setores: `/kanban` · Setores: `/settings/setores` · Billing: `/billing`  
- Consulta pública: `/p/{codigo}`  

### Env

| App | Arquivo | Como |
|-----|---------|------|
| API | `api/.env` | Copiar de `api/.env.example` |
| Front | `web/.env.local` | Copiar de `web/.env.example` |

**Não** commitamos `.env` / `.env.local`. Em máquina nova: criar na mão a partir dos `.example`.

## Estrutura

```
worqera-platform/
├── api/     # shoe-repair-api (Express + Lambda + DynamoDB/S3)
├── web/     # shoe-repair-website (Next.js)
└── README.md
```

## Documentação

| Onde | Uso |
|------|-----|
| [AGENTS.md](AGENTS.md) | Regras para IA / agentes |
| [docs/superpowers/specs/2026-09-14-worqera-platform-design.md](docs/superpowers/specs/2026-09-14-worqera-platform-design.md) | Design master (SaaS, kanban, billing) |
| [api/specs/](api/specs/) | API — current-state, roadmap, endpoints, modeling |
| [web/specs/](web/specs/) | Front — current-state, roadmap, integration |
| [api/README.md](api/README.md) | API legado — quick start |
| [api/docs/](api/docs/) | Docs históricas do legado |
| [web/README.md](web/README.md) | Front — setup e env |
