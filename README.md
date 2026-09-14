# Worqera — monorepo

Front (Next.js) em `web/` · API (Node.js / Express / AWS Lambda) em `api/`. Um Git só neste repositório.

## Como rodar (dev)

```bash
make api-dev      # Mongo + API :3001 (só /api/v1 — sem Dynamo)
make api-seed     # opcional: Casa do Tênis
make web-dev      # Next :3000
```

- Front: http://localhost:3000  
- API: http://localhost:3001/api/v1  
- Signup: `/signup` · Kanban: `/kanban` · Setores: `/settings/setores` · Billing: `/billing`  
- Consulta pública: `/p/{codigo}`  

`S3_BUCKET_NAME` vazio = fotos/PDF em `api/uploads/`.

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
