# Shoe repair website (Next.js)

Frontend do monorepo Worqera. Consome a API em `../api` via `NEXT_PUBLIC_API_URL`.

## Setup

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

App em http://localhost:3000

## Env

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL da API | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido no app | `Worqera` |
| `NEXT_PUBLIC_MAX_PHOTOS` | Limite de fotos no pedido | `8` |

Não commitar `.env.local`.

## Scripts

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run start    # servir build
npm run lint     # ESLint
```

## Docs

- [docs/](docs/) — docs específicas do front
- API: [../api/README.md](../api/README.md) e [../api/docs/](../api/docs/)
