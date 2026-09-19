# Carga incremental CdT (14/09 → hoje)

Usa `report001 (2).pdf` (14–17/09) + `report001 (3).pdf` (17/09 → hoje), mescla por código (PDF mais novo ganha), **pula** pedidos que já existem no Mongo (`code` + `shopId`).

**Garantia anti-duplicata:** sem `--force-update`, só grava códigos que **ainda não** estão no banco. Re-rodar é seguro (segunda vez → `willInsert: 0`).

## Pré-requisitos

1. PDFs na **raiz** do monorepo:
   - `report001 (2).pdf`
   - `report001 (3).pdf`
2. Shop `casa-do-tenis` seedado
3. `MONGODB_URI` apontando para o Mongo certo (local ou PRD)
4. Node 20+ · Python 3 · `pip3 install pypdf`

## Local (Mac)

```bash
cd /caminho/worqera-platform

# 1) Dry-run — NÃO grava
make cdt-inc-dry
# Confira: willInsert, alreadyInMongo, sampleNew

# 2) Gravar no Mongo do api/.env
make cdt-inc
```

Equivalente:

```bash
node api/scripts/import-cdt-report001-incremental.js
node api/scripts/import-cdt-report001-incremental.js --apply
```

Esperado no dry-run (PDFs 2+3, since 14/09): ~**69** códigos únicos, `willUpdate: 0` se não usar `--force-update`.

---

## Servidor (PRD) — direto no Mongo Docker

Mongo de PRD **não** publica porta no host (`worqera-mongodb` só na rede `worqera-internal`).  
Rode um container one-shot na mesma rede, com o repo montado.

### 1) No Mac — subir PDFs + código

```bash
# no Mac
cd /caminho/worqera-platform
git push   # se o servidor puxa do git; senão scp o monorepo

scp "report001 (2).pdf" "report001 (3).pdf" user@prd:/opt/worqera-platform/
# (ajuste o path do deploy no servidor)
```

No servidor:

```bash
ssh user@prd
cd /opt/worqera-platform   # pasta do monorepo no host
git pull                   # se aplicável — precisa do script incremental
```

Confirme:

```bash
ls -la "report001 (2).pdf" "report001 (3).pdf"
ls api/scripts/import-cdt-report001-incremental.js
docker ps --format '{{.Names}}' | grep -E 'worqera-(api|mongodb)'
```

### 2) Dry-run no Mongo de PRD (não grava)

```bash
cd /opt/worqera-platform

docker run --rm -it \
  --network worqera-internal \
  -v "$PWD":/work \
  -w /work/api \
  -e MONGODB_URI='mongodb://worqera-mongodb:27017/worqera?replicaSet=rs0' \
  -e SHOP_SLUG=casa-do-tenis \
  node:22-bookworm \
  bash -lc '
    apt-get update -qq && apt-get install -y -qq python3 python3-pip >/dev/null &&
    pip3 install -q pypdf &&
    npm ci --omit=dev &&
    node scripts/import-cdt-report001-incremental.js
  '
```

Leia o JSON de saída:

| Campo | Significado |
|-------|-------------|
| `mode` | deve ser `DRY-RUN` |
| `mergedUnique` | códigos únicos nos PDFs (~69) |
| `alreadyInMongo` | já existiam (histórico / carga anterior) → **pulados** |
| `willInsert` | **só estes** entrarão no apply |
| `sampleNew` | amostra dos novos |

Se `willInsert` for 0 → nada a fazer (já está carregado).

### 3) Apply (grava só os novos)

Mesmo comando + `--apply`:

```bash
docker run --rm -it \
  --network worqera-internal \
  -v "$PWD":/work \
  -w /work/api \
  -e MONGODB_URI='mongodb://worqera-mongodb:27017/worqera?replicaSet=rs0' \
  -e SHOP_SLUG=casa-do-tenis \
  node:22-bookworm \
  bash -lc '
    apt-get update -qq && apt-get install -y -qq python3 python3-pip >/dev/null &&
    pip3 install -q pypdf &&
    npm ci --omit=dev &&
    node scripts/import-cdt-report001-incremental.js --apply
  '
```

Saída esperada: `ordersWritten` = `willInsert` do dry-run. Status = `delivered` (kanban **não** lota).

### 4) Conferir

- UI: `/consultas/pedidos?tab=finalizados` → ex. `4083-26` (PDF 3)
- Público: `/p/casa-do-tenis/4083-26`
- Kanban: sem lote de entregues
- Re-rodar dry-run → `willInsert: 0`, `alreadyInMongo` ≈ 69

### 5) Limpeza (opcional)

```bash
rm -f /opt/worqera-platform/"report001 (2).pdf" /opt/worqera-platform/"report001 (3).pdf"
```

---

## Opções úteis

```bash
# Só o PDF 3 (17→hoje)
node api/scripts/import-cdt-report001-incremental.js \
  --pdf "report001 (3).pdf" --since 2026-09-17

# Sobrescrever códigos que já existem (NÃO use na 1ª carga)
node api/scripts/import-cdt-report001-incremental.js --apply --force-update
```

## O que NÃO faz

- Não reimporta jul→13/09 (use carga histórica / `make cdt-import`).
- Não coloca no kanban (`status: delivered`).
- Para reabrir abertos: `import-cdt-open-snapshot.js`.

## Alternativa sem PDF no servidor

Mesmo padrão da carga histórica: extrair no Mac → JSON → mongosh. Ver [`cdt-mongo-carga-ssh.md`](cdt-mongo-carga-ssh.md).
