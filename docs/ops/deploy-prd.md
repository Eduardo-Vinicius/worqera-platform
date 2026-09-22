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

`.env.prod` **não é obrigatório** (igual experiência Procedy no dia a dia).  
Defaults: rede `sharednet` + `NEXT_PUBLIC_API_URL=https://api.worqera.com`.

```bash
cd web
# se a API pública for outro domínio:
NEXT_PUBLIC_API_URL=https://api.seudominio.com make prod-up

# ou só:
make prod-up
```

Opcional: `cp .env.prod.example .env.prod` só se quiser fixar URL/admins no arquivo.

Nginx: `upstream` → `server worqera-web:80;`

## Notas

- `NEXT_PUBLIC_*` entram no **build** da imagem — mudar URL = rebuild.
- Dev local: `api/docker-compose.yml` (Mongo `:27017`) + `make api-dev` / `make web-dev`.
- AbacatePay fica `Enabled=false` até ligar cobrança.
- Health: `GET /health` (live) · `GET /health/ready` (Mongo ping) — use ready no UptimeRobot.
- Backup semanal: `api/scripts/mongo-backup.sh` (cron no host).
- Trial D-2/D-0: `node api/scripts/send-trial-reminders.js` (cron diário).
- Digest semanal (owners): `node api/scripts/send-weekly-digests.js` (cron segundas) ou botão no dashboard.
- E-mail: lab com Gmail → domínio + SES — ver `docs/ops/email-gmail-to-domain.md`.
