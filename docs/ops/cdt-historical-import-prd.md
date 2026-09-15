# Carga histórica Casa do Tênis — produção

Guia para repetir no ambiente **PRD** o que já rodamos em local.

## O que entra

| Item | Valor |
|------|--------|
| Fonte | `report001.pdf` (Pedidos por Cliente, 14/07–14/09/2026, **1072** linhas) |
| Shop | slug `casa-do-tenis` |
| Status import | `delivered` (não aparece no kanban) |
| Códigos | legacy `NNNN-26` preservados; novos pedidos Worqera continuam `0001…` |
| Clientes | só nome (sem telefone/email/endereço) |
| Duplicatas no PDF | ~56 códigos repetidos → fica a **última** ocorrência |

`report001 (1).pdf` (por Período, 1042) **não** é a fonte padrão.

## Pré-requisitos PRD

1. API + Mongo de produção acessíveis (URI em `api/.env` ou `MONGODB_URI` / `WORQERA_Mongo__Uri`).
2. Shop `casa-do-tenis` já seedado (setores + owner). Se não: `npm run seed` **no ambiente certo** (cuidado).
3. Máquina com Node 20+, Python 3 + `pypdf` (`pip3 install pypdf`).
4. Cópia de `report001.pdf` no root do monorepo (ou path via `--pdf`).

## Passo a passo PRD

### 1) Extrair PDF → JSONL

```bash
cd /path/to/worqera-platform
pip3 install pypdf
python3 api/scripts/extract-cdt-report001.py \
  --pdf report001.pdf \
  --out-dir api/scripts/data
```

Conferir `api/scripts/data/cdt-report001-qa.json`:

- `rowsOk: true` (1072)
- `servicesOk: true` (~443639.99)

### 2) Dry-run no Mongo de PRD

```bash
cd api
export MONGODB_URI='mongodb+srv://…/worqera'   # URI de PRD
# opcional: export SHOP_SLUG=casa-do-tenis
node scripts/import-cdt-report001.js
```

Esperado: ~1012 orders únicos, ~999 clients, `mode: DRY-RUN`.

### 3) Apply

```bash
node scripts/import-cdt-report001.js --apply
```

Idempotente: pode re-rodar; faz upsert por `{ shopId, code }`.

### 4) Conferir

- Kanban CdT: **não** deve lotar (delivered excluído).
- UI: `/consultas/pedidos?tab=finalizados` → buscar `3191-26`.
- Público: `/p/casa-do-tenis/3191-26`.
- Próximo pedido novo na loja: código `0001` (counter não usa os `NNNN-26`).

### 5) Reativar pedidos ainda na loja (quando tiver a lista)

CSV (`api/scripts/data/cdt-open-snapshot.example.csv`):

```csv
code,sectorSlug,status
3985-26,pintura,in_progress
4003-26,lavagem,open
```

Slugs CdT: `atendimento`, `sapataria`, `costura`, `lavagem`, `acabamento`, `pintura`, `atendimento-final`.

```bash
node scripts/import-cdt-open-snapshot.js /path/to/abertos.csv        # dry-run
node scripts/import-cdt-open-snapshot.js /path/to/abertos.csv --apply
```

Ver também: carga **sem PDF no servidor** → [`docs/ops/cdt-mongo-carga-ssh.md`](cdt-mongo-carga-ssh.md) (payload JSON + mongosh via SSH).


Se `clientName` vier com `R$0,00…`, re-extrair e re-aplicar (idempotente + limpa clients sujos):

```bash
python3 api/scripts/extract-cdt-report001.py
cd api && node scripts/import-cdt-report001.js --apply
```

O parser agora pega só o nome **antes** do código (não os valores da linha anterior).


```js
// mongo shell / Compass — só no shop CdT
db.orders.deleteMany({ shopId: ObjectId('…'), notes: /import report001/ })
db.clients.deleteMany({ shopId: ObjectId('…'), phone: null, email: null, /* cuidado: só se não houver clientes reais novos */ })
```

Preferível filtrar por `notes` nos orders. Clientes mínimos sem telefone podem colidir com cadastros novos de mesmo nome — revisar antes de apagar clients.

## Deploy de código (web/api)

Além do script de dados, o deploy de PRD precisa incluir:

- Consultas pedidos: tabs Ativos / Finalizados / Todos + paginação + busca sem AND excessivo
- Consultas clientes: `GET /clients?q=` + cursor
- Index `{ shopId, status, createdAt }`

Reiniciar API após deploy (processo sem nodemon).

## Makefile (local)

```bash
make api-seed
python3 api/scripts/extract-cdt-report001.py
node api/scripts/import-cdt-report001.js --apply
```
