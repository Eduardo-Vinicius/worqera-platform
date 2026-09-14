# Worqera — monorepo

Front (Next.js) em `web/` · API (Node.js / Express / AWS Lambda) em `api/`. Um Git só neste repositório.

## Como rodar (dev)

Em dois terminais:

```bash
# 1) API
cd api
npm install
cp .env.example .env   # preencher AWS, JWT, etc.
# subir o servidor local conforme o fluxo do projeto (ver api/README.md)

# 2) Front
cd web
npm install
cp .env.example .env.local   # se ainda não existir
npm run dev
```

- Front: http://localhost:3000  
- API (padrão do front): `NEXT_PUBLIC_API_URL` → http://localhost:3001  

### Env

| App | Arquivo | Como |
|-----|---------|------|
| API | `api/.env` | Copiar de `api/.env.example` (ou `api/.env.template`) e preencher |
| Front | `web/.env.local` | Copiar de `web/.env.example`. Inclui `NEXT_PUBLIC_API_URL` |

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
