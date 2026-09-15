# Deploy Worqera em PRD (padrão Procedy / Oracle)

Espelha `procedy-platform`: volumes em `/volumes/…`, Mongo sem publish, API/web na `sharednet`, nginx → `:80`.

## 1) Host (uma vez)

```bash
sudo mkdir -p /volumes/worqera/mongodb /volumes/worqera/api/storage
sudo chown -R 999:999 /volumes/worqera/mongodb
docker network ls   # confirme sharednet (ou o nome do proxy)
```

## 2) API

```bash
cd api
cp .env.prod.example .env.prod
chmod 600 .env.prod

# Gerar secrets:
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # REFRESH_SECRET

# Editar PUBLIC_API_URL, PUBLIC_WEB_URL, e-mail, PLATFORM_ADMIN_EMAILS,
# WORQERA_DOCKER_NETWORK=sharednet

make prod-up          # ou na raiz: make api-prod-up
```

Nginx: `upstream` → `server worqera-api:80;`

## 3) Web

```bash
cd web
cp .env.prod.example .env.prod
chmod 600 .env.prod
# NEXT_PUBLIC_API_URL=https://api.seudominio.com  (sem /api/v1)
# WORQERA_DOCKER_NETWORK=sharednet

make prod-up          # ou na raiz: make web-prod-up
```

Nginx: `upstream` → `server worqera-web:80;`

## Notas

- `NEXT_PUBLIC_*` entram no **build** da imagem — mudar URL = rebuild.
- Dev local continua com `api/docker-compose.yml` (Mongo `:27017`) + `make api-dev` / `make web-dev`.
- AbacatePay fica `Enabled=false` até ligar cobrança.
