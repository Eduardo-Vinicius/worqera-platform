# Roteiro de carga Infor+ → Worqera

Pastas locais (PDF **não** vão pro git / servidor):

| Pasta | Loja | Slug |
|-------|------|------|
| `cargas/casatenis/` | Casa do Tênis | `casa-do-tenis` |
| `cargas/sapataria-paulista/` | Sapataria Paulista | `sapataria-paulista` (após renomear; ver seção abaixo) |

## O “segredo”

Só muda **uma** coisa entre lojas:

```bash
export SHOP_SLUG='casa-do-tenis'   # ou sapataria-paulistaa
```

O parser, o payload e o mongosh são os mesmos.  
Se esquecer o `SHOP_SLUG`, o default é **`casa-do-tenis`** — risco de misturar dados.

Checklist anti-erro:

1. Confirme o slug no PRD (`/admin/shops` ou mongosh) **antes** de APPLY  
2. No dry-run, leia `shop:` na saída — tem que ser o slug certo  
3. Pedidos entram como `delivered` → **não** lotam o kanban  
4. Código legado (`3191-26`) é único **por loja** (`shopId` + `code`)  
5. Re-rodar APPLY é idempotente (só insere o que ainda não existe)

---

## Agora: só Casa do Tênis

PDFs em `cargas/casatenis/`:

- `report001.pdf` — bloco principal (histórico)
- `report001 2.pdf` — complemento / dias seguintes
- `report001 19-22.pdf` — **diff 19→22/09** (lote p3; pós-carga 19/09)

CdT **já teve** carga ~14/07–14/09 (~1012) + incrementais. O lote **p3** atualiza só o restante do PDF 19–22 (idempotente: pula códigos já no Mongo).

### A) Pré-requisitos

- Shop `casa-do-tenis` existe no PRD (seed / signup)
- Setores ativos
- SSH PRD + key (mesmo do deploy)

### B) No Mac — extrair + payload

```bash
cd /Users/eduardo/Documents/Repo/worqera-platform
pip3 install pypdf

export SHOP_SLUG='casa-do-tenis'

# --- Histórico (p1+p2), se ainda precisar ---
# python3 api/scripts/extract-cdt-report001.py \
#   --pdf "cargas/casatenis/report001.pdf" \
#   --out-dir api/scripts/data --out-prefix cdt-casatenis-p1 --skip-full-qa
# python3 api/scripts/extract-cdt-report001.py \
#   --pdf "cargas/casatenis/report001 2.pdf" \
#   --out-dir api/scripts/data --out-prefix cdt-casatenis-p2 --skip-full-qa
# cat api/scripts/data/cdt-casatenis-p1-orders.jsonl \
#     api/scripts/data/cdt-casatenis-p2-orders.jsonl \
#   > api/scripts/data/cdt-report001-inc-orders.jsonl

# --- Diff 19–22/09 (lote p3) ---
python3 api/scripts/extract-cdt-report001.py \
  --pdf "cargas/casatenis/report001 19-22.pdf" \
  --out-dir api/scripts/data \
  --out-prefix cdt-casatenis-p3 \
  --since 2026-09-19 \
  --until 2026-09-22 \
  --skip-full-qa

cp api/scripts/data/cdt-casatenis-p3-orders.jsonl \
   api/scripts/data/cdt-report001-inc-orders.jsonl

SHOP_SLUG=casa-do-tenis node api/scripts/build-cdt-inc-payload.js
# → api/scripts/data/cdt-inc-payload.json
```

Confira no JSON: `"shopSlug": "casa-do-tenis"`.  
QA: `api/scripts/data/cdt-casatenis-p3-qa.json` (`uniqueCodes`, `dateMin`/`dateMax`).

### C) Enviar ao servidor (só JSON + script)

```bash
export KEY=~/Downloads/ssh-key.key   # ajuste se a key estiver noutro path
export HOST=ubuntu@168.75.68.246

ssh -i "$KEY" "$HOST" 'mkdir -p /tmp/cdt && chmod 700 /tmp/cdt'

scp -i "$KEY" \
  api/scripts/data/cdt-inc-payload.json \
  api/scripts/apply-cdt-inc-payload.mongosh.js \
  "$HOST:/tmp/cdt/"
```

**Não** envie os PDFs.

### D) Dry-run (não grava)

```bash
ssh -i "$KEY" "$HOST"

sudo docker cp /tmp/cdt/cdt-inc-payload.json worqera-mongodb:/tmp/cdt-inc-payload.json
sudo docker cp /tmp/cdt/apply-cdt-inc-payload.mongosh.js worqera-mongodb:/tmp/apply-cdt-inc-payload.mongosh.js

sudo docker exec \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG=casa-do-tenis \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

Leia:

| Campo | Esperado |
|-------|----------|
| `shop` | `casa-do-tenis` |
| `willInsert` | só códigos **novos** |
| `alreadyInMongo` | o que já estava da carga antiga |
| `sampleNew` | nomes/códigos batem com o PDF |

Se `shop` ≠ `casa-do-tenis` → **pare**.  
Lote p3 (2026-09-22): dry-run → `willInsert: 44`, `alreadyInMongo: 0` → APPLY `ordersWritten: 44`.

### E) Apply

```bash
sudo docker exec \
  -e APPLY=1 \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG=casa-do-tenis \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

### F) Conferir

- Login CdT → `/consultas/pedidos?tab=finalizados` (ex. `4090-26`, `4113-26`)
- Público: `/p/casa-do-tenis/{codigo}`
- Kanban **não** deve lotar

```js
const s = db.shops.findOne({ slug: "casa-do-tenis" })
printjson({
  delivered: db.orders.countDocuments({ shopId: s._id, status: "delivered" }),
  clients: db.clients.countDocuments({ shopId: s._id }),
})
```

### G) Limpar `/tmp`

```bash
rm -rf /tmp/cdt
sudo docker exec worqera-mongodb rm -f /tmp/cdt-inc-payload.json /tmp/apply-cdt-inc-payload.mongosh.js
```

---

## Depois: Sapataria Paulista

### Loja errada vs certa (slug final)

**Slug final desejado:** `sapataria-paulista`

Situação típica:

| Slug atual | Ação |
|------------|------|
| `sapataria-paulista` | loja errada (e-mail errado) → **apagar** |
| `sapataria-paulistaa` | loja certa → **renomear** para `sapataria-paulista` |

#### 1) Conferir as duas

```bash
sudo docker exec -it worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0'
```

```js
db.shops.find(
  { slug: { $in: ["sapataria-paulista", "sapataria-paulistaa"] } },
  { name: 1, slug: 1, status: 1, createdAt: 1 }
).toArray()

const bad = db.shops.findOne({ slug: "sapataria-paulista" })
const good = db.shops.findOne({ slug: "sapataria-paulistaa" })
printjson({
  bad: bad && {
    id: bad._id,
    name: bad.name,
    orders: db.orders.countDocuments({ shopId: bad._id }),
    clients: db.clients.countDocuments({ shopId: bad._id }),
    members: db.memberships.countDocuments({ shopId: bad._id }),
  },
  good: good && {
    id: good._id,
    name: good.name,
    orders: db.orders.countDocuments({ shopId: good._id }),
    clients: db.clients.countDocuments({ shopId: good._id }),
    members: db.memberships.countDocuments({ shopId: good._id }),
  },
})
```

#### 2) Apagar a errada (`sapataria-paulista`)

Só se for a loja vazia/errada (veja `orders`/`clients` acima):

```js
const bad = db.shops.findOne({ slug: "sapataria-paulista" })
if (!bad) throw "slug sapataria-paulista não existe"

db.orders.deleteMany({ shopId: bad._id })
db.clients.deleteMany({ shopId: bad._id })
db.memberships.deleteMany({ shopId: bad._id })
db.sectors.deleteMany({ shopId: bad._id })
db.subscriptions.deleteMany({ shopId: bad._id })
// catálogo (nome da collection no Mongo costuma ser lowercase plural)
try { db.servicecatalogs.deleteMany({ shopId: bad._id }) } catch (e) {}
try { db.servicecatalogues.deleteMany({ shopId: bad._id }) } catch (e) {}
db.shops.deleteOne({ _id: bad._id })
print("apagou sapataria-paulista (errada)")
```

#### 3) Renomear a certa → `sapataria-paulista`

```js
// unique no slug: a errada já tem que ter sumido
const r = db.shops.updateOne(
  { slug: "sapataria-paulistaa" },
  { $set: { slug: "sapataria-paulista" } }
)
printjson(r)
db.shops.findOne({ slug: "sapataria-paulista" }, { name: 1, slug: 1 })
```

Se der erro de **duplicate key**, a errada ainda existe — volte ao passo 2.

#### 4) Carga depois do rename

```bash
export SHOP_SLUG='sapataria-paulista'
# … extract / payload / dry-run / APPLY com esse slug
```

Público fica `/p/sapataria-paulista/{codigo}`.  
Quem tinha bookmark do slug antigo (`…aa`) precisa usar o novo.
---

## Ordem sugerida hoje

1. **CdT** — dry-run → APPLY (este doc, seção “Agora”)  
2. Conferir CdT no app  
3. Limpar / renomear loja Paulista  
4. **Só então** carga Paulista com `SHOP_SLUG=sapataria-paulista`
