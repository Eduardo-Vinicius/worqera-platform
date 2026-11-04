# Coolify + MCP para acompanhar os serviços — análise e plano

Objetivo: ver no Cursor (via MCP) o estado dos serviços — o que está de pé, logs, deploys, uso de CPU/memória/disco — e, mais tarde, operar com confirmação.

## Como as peças se encaixam

- **Coolify** é um painel de deploy (PaaS) que roda em Docker: `coolify`, `coolify-db` (Postgres), `coolify-redis`, `coolify-realtime` e, por servidor, `coolify-proxy` (Traefik) e `coolify-sentinel` (status e métricas).
- **MCP do Coolify** não é instalado no servidor de produção. Ele conversa com a **API do Coolify**:
  - **embutido** no próprio Coolify (`https://<coolify>/mcp`, ligar em Settings → Advanced; acesso limitado pelo token), ou
  - **`@masonator/coolify-mcp`** rodando no seu Mac pelo `npx` (46 ferramentas, `doctor`, pede confirmação antes de ações destrutivas).
- O MCP só enxerga bem o que o **Coolify gerencia**. Containers subidos à mão com `docker compose` aparecem como "Unmanaged" no painel e ficam fora da maior parte das ferramentas (deploy, diagnóstico, env, logs por recurso).

Ou seja: instalar o Coolify **não** basta para acompanhar o Worqera. É preciso trazer o stack (API, Mongo, Redis, web) para dentro dele.

## O servidor de hoje (Oracle, 168.75.68.246)

Pelo `procedy-platform/ops/server/README.md` (auditoria de 30/10/2026) e pelos composes do Worqera:

| Item | Situação | Impacto no Coolify |
|---|---|---|
| Compartilhado | procedy, worqera, dmk, parally, guidelanguage, zanzitec | Qualquer restart do Docker derruba **todos** os sites |
| Proxy | nginx em container (`dmk-nginx`) + certbot em 80/443, rede `sharednet` | O proxy do Coolify (Traefik) também quer 80/443 → conflito |
| Portas abertas | 22, 80, 443 (Security List da Oracle) | Painel do Coolify usa 8000/6001/6002 → túnel SSH ou domínio |
| Disco | 75% usado (antes da limpeza) | Coolify pede 20 GB livres e 30 GB no total |
| SSH | só chave, root permitido | Coolify exige acesso **root** por chave ao servidor que ele gerencia |
| Reboot | containers do dmk com `restart: no` | Se o Docker reiniciar, alguns sites não voltam sozinhos |

O que o Coolify faz num servidor (doc oficial e `install.sh` atual):

- **Instalador (no servidor onde o painel roda):** edita `/etc/docker/daemon.json` (logs 10 MB × 3, rede `10.0.0.0/8`). Com containers rodando, ele **não** reinicia o Docker, a menos que `DOCKER_POOL_FORCE_OVERRIDE=true`. Também cria `/data/coolify`, gera uma chave e a adiciona ao `authorized_keys` do root, e publica as portas 8000, 6001 e 6002.
- **Ligar um servidor remoto (validação):** testa o SSH, instala ou verifica Docker e Compose, **pode reiniciar o Docker** e **sobe o proxy do Coolify**. A doc recomenda servidor novo: "Existing containers may be temporarily unavailable".

**Conclusão:** instalar o Coolify **no servidor de produção compartilhado** é o caminho de maior risco. Há conflito em 80/443 com o nginx de todos os projetos, restart do Docker derruba seis projetos e o disco está apertado. E sem migrar o stack, o MCP quase não teria o que mostrar.

## Recomendação

Coolify numa **VM separada e pequena** (painel e MCP), sem mexer em produção agora. Depois, migrar **só o Worqera** para o Coolify numa janela combinada, mantendo o nginx atual como proxy (Coolify com proxy "Custom (None)").

### Fase 0 — Levantamento no servidor (só leitura, zero risco)

```bash
uname -m; lsb_release -ds; nproc; free -h; df -h /
docker version --format '{{.Server.Version}}'; docker compose version
sudo cat /etc/docker/daemon.json 2>/dev/null || echo "sem daemon.json"
sudo ss -tulpn | grep -E ':(80|443|8000|6001|6002)\b'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker network ls
sudo grep -n "PermitRootLogin" /etc/ssh/sshd_config /etc/ssh/sshd_config.d/* 2>/dev/null
```

Isso responde: arquitetura (ARM ou x86), memória livre, versão do Docker (≥ 24), quem ocupa 80/443 e se o root pode entrar por chave.

### Fase 1 — VM do Coolify (painel + MCP)

1. **Criar a VM na Oracle:** Ubuntu 24.04. Ampere A1 serve (Coolify roda em arm64), 2 OCPU / 4–12 GB / 50 GB. Na Security List, abrir 22, 80 e 443, e 8000 **só para o seu IP** até o domínio funcionar.
2. **DNS:** registro `A` de `coolify.worqera.com` apontando para a VM nova.
3. **Instalar:**

   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o coolify-install.sh
   less coolify-install.sh                 # conferir antes
   sudo bash coolify-install.sh
   ```

4. Criar o admin em `http://IP:8000`. Em Settings, definir a URL `https://coolify.worqera.com`. Depois prender 8000, 6001 e 6002 em `127.0.0.1` (`/data/coolify/source/docker-compose.custom.yml`, conforme a doc) e tirar a 8000 da Security List.
5. **Backup do próprio Coolify:** banco Postgres e `/data/coolify/source/.env` (sem ele não se recupera o painel).

### Fase 2 — MCP no Cursor (no seu Mac)

1. **Token:** Coolify → Keys & Tokens → API tokens. Começar com permissão **read** (ver status, logs e deploys). Write e deploy só depois.
2. **Guardar o token fora do repositório:** variável `COOLIFY_TOKEN` no `~/.zshrc`. Nunca no chat nem em arquivo versionado.
3. **Ligar o MCP**, escolhendo uma das opções:

   **Embutido** (nada para instalar; ligar em Settings → Advanced → MCP). Em `~/.cursor/mcp.json`:

   ```json
   {
     "mcpServers": {
       "coolify": {
         "url": "https://coolify.worqera.com/mcp",
         "headers": { "Authorization": "Bearer ${env:COOLIFY_TOKEN}" }
       }
     }
   }
   ```

   **`@masonator/coolify-mcp`** (mais ferramentas, diagnóstico e confirmação antes de ações destrutivas):

   ```json
   {
     "mcpServers": {
       "coolify": {
         "command": "npx",
         "args": ["-y", "@masonator/coolify-mcp"],
         "env": { "COOLIFY_BASE_URL": "https://coolify.worqera.com", "COOLIFY_ACCESS_TOKEN": "${env:COOLIFY_TOKEN}" }
       }
     }
   }
   ```

   Conferir com `COOLIFY_BASE_URL=… COOLIFY_ACCESS_TOKEN=$COOLIFY_TOKEN npx @masonator/coolify-mcp doctor`.

   No macOS, o Cursor aberto pelo Dock pode não herdar variáveis do `~/.zshrc`, e aí o `${env:COOLIFY_TOKEN}` chega vazio. Se o MCP não conectar, feche o Cursor e abra pelo terminal (`cursor .`) ou veja os "MCP Logs".

### Fase 3 — Ensaio antes de tocar produção

Ligar ao Coolify uma **VM descartável** que imite produção: Docker já instalado, um nginx próprio em 80/443 e um container qualquer. Com o proxy do servidor em **Custom (None)**, observar:
- se a validação reinicia o Docker;
- se tenta subir o Traefik;
- o que muda no `daemon.json`.

Só seguir se nada disso derrubar o container de teste.

### Fase 4 — Migrar só o Worqera (janela combinada, ~30 min)

1. Backup do Mongo (`api/scripts/mongo-backup.sh`) e de `/volumes/worqera`.
2. Ligar o servidor de produção ao Coolify, com proxy **Custom (None)** e Sentinel ligado.
3. No Coolify, criar o projeto "Worqera" → **Docker Compose Empty** com o conteúdo de `api/docker-compose.prod.yml`, mantendo:
   - os mesmos `container_name`;
   - a rede externa `sharednet`;
   - os volumes `/volumes/worqera/...`;
   - as variáveis do `.env.prod`.
   Repetir com `web/docker-compose.prod.yml`. O nginx continua apontando para `worqera-api:80` e `worqera-web:80`, sem mudar nada nele.
4. Parar os containers antigos (`make prod-down` em `api/` e `web/`) e fazer o deploy pelo Coolify. Conferir `GET /health/ready`, o site e o login.
5. **Volta atrás:** parar no Coolify e `make prod-up` de novo nas pastas antigas. Os dados ficam nos mesmos volumes.

Depois disso, o MCP mostra o Worqera inteiro: status, logs, deploys e métricas do Sentinel. Os outros projetos continuam como estão.

## Pontos de atenção

- **Root por chave:** o Coolify precisa disso no servidor gerenciado. Se o `harden-server.sh` do Procedy desligar o login de root, configure o Coolify com usuário não-root (doc "Non-root User") antes da Fase 4.
- **Disco:** rodar o `cleanup-disk.sh` do Procedy antes da Fase 4. O Sentinel com métricas também ocupa disco.
- **Deploy muda de lugar:** depois da migração, o Worqera passa a subir pelo Coolify (Git ou compose). O `make prod-up` vira só o plano de volta.
- **Custo de memória:** o Coolify em si fica na VM nova. Em produção só entra o `coolify-sentinel` (leve).

## Alternativa se a meta for só acompanhar

Se o que importa é "está de pé? quanto de CPU/memória/disco? qual container caiu?", existem caminhos sem migrar nada:
- um healthcheck com alerta por e-mail para o Worqera, no padrão do `procedy-healthcheck.sh` que já roda no servidor;
- um monitor leve (Uptime Kuma, Beszel) só lendo o Docker.

Ficam mais simples que o Coolify, mas não têm MCP de deploy.
