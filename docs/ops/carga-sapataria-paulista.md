# Carga manual — Sapataria Paulista

PDF local (não sobe pro git nem pro servidor):

`sapataria-paulista/report001 (8).pdf`

Relatório **Serviços por Cliente** (18/09/2026–03/10/2026).  
**Não** use `extract-cdt-report001.py`. Esse script é o da Casa do Tênis e devolve 0 linhas neste PDF.

Slug obrigatório: `sapataria-paulista`.  
Se esquecer, o default do payload é `casa-do-tenis`.

Números deste arquivo (já extraído uma vez neste repo):

| Campo | Valor |
|-------|--------|
| Linhas de serviço | 189 |
| Pedidos (código único) | 128 |
| Período | 2026-09-18 → 2026-10-03 |
| Pedidos com total R$ 0 | 15 (devolução / consignação — entram mesmo assim) |

Cada código vira **um** pedido `delivered`, pago (`remaining` 0). Várias linhas do mesmo código viram itens do mesmo pedido. Não entra no kanban.

O PDF cola as colunas. Nome e texto do serviço saem cortados ou grudados (ex.: `Bia Rio Louisvuitton Tozini`, serviço `BolsaChanelLambskinlight gr`). Dá para corrigir depois na ficha.

Amostra para conferir depois do APPLY:

- `2140-26` — 25/09/2026 — Bia Rio Louisvuitton Tozini — R$ 7.000
- `2195-26` — 30/09/2026 — Roberto Sena — várias peças, total R$ 5.840

---

## 0) Slug no PRD

No servidor:

```bash
export KEY=~/Downloads/ssh-key.key
export HOST=ubuntu@168.75.68.246
ssh -i "$KEY" "$HOST"
```

```bash
sudo docker exec -it worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0'
```

```js
db.shops.find(
  { slug: { $in: ["sapataria-paulista", "sapataria-paulistaa"] } },
  { name: 1, slug: 1, status: 1 }
).toArray()

const bad = db.shops.findOne({ slug: "sapataria-paulista" })
const good = db.shops.findOne({ slug: "sapataria-paulistaa" })
printjson({
  bad: bad && {
    id: bad._id, name: bad.name,
    orders: db.orders.countDocuments({ shopId: bad._id }),
    clients: db.clients.countDocuments({ shopId: bad._id }),
    members: db.memberships.countDocuments({ shopId: bad._id }),
    sectors: db.sectors.countDocuments({ shopId: bad._id, active: true }),
  },
  good: good && {
    id: good._id, name: good.name,
    orders: db.orders.countDocuments({ shopId: good._id }),
    clients: db.clients.countDocuments({ shopId: good._id }),
    members: db.memberships.countDocuments({ shopId: good._id }),
    sectors: db.sectors.countDocuments({ shopId: good._id, active: true }),
  },
})
```

- Se a loja certa já for `sapataria-paulista` e tiver dono + setor ativo, pule para o passo 1.
- Se a certa for `sapataria-paulistaa` e a `sapataria-paulista` estiver vazia (0 pedidos), apague a vazia e renomeie. Comandos no fim de `docs/ops/carga-roteiro-casas.md`.
- Se `sapataria-paulista` já tiver pedidos reais, **pare**. Não apague.

A loja do APPLY precisa de pelo menos 1 setor ativo e 1 membership `owner` ou `admin`.

---

## 1) No Mac — extrair e montar o payload

```bash
cd /Users/eduardo/Documents/Repo/worqera-platform
pip3 install pypdf

python3 api/scripts/extract-sp-servicos.py \
  --pdf "sapataria-paulista/report001 (8).pdf"

cp api/scripts/data/sp-report001-orders.jsonl \
   api/scripts/data/cdt-report001-inc-orders.jsonl

SHOP_SLUG=sapataria-paulista node api/scripts/build-cdt-inc-payload.js
```

Saída esperada do extrator: `uniqueCodes` 128, `dateMin` 2026-09-18, `dateMax` 2026-10-03.

Abra `api/scripts/data/cdt-inc-payload.json` e confira `"shopSlug": "sapataria-paulista"` e `"orderCount": 128`.

JSONL e payload ficam de fora do git (têm nome de cliente).

---

## 2) Enviar só o JSON e o script novo

O script no servidor tem que ser o deste repo (`apply-cdt-inc-payload.mongosh.js` com suporte a `lines`). Cópia antiga grava tudo como “Serviço (importação)”.

```bash
export KEY=~/Downloads/ssh-key.key
export HOST=ubuntu@168.75.68.246

ssh -i "$KEY" "$HOST" 'mkdir -p /tmp/cdt && chmod 700 /tmp/cdt'

scp -i "$KEY" \
  api/scripts/data/cdt-inc-payload.json \
  api/scripts/apply-cdt-inc-payload.mongosh.js \
  "$HOST:/tmp/cdt/"
```

Não envie o PDF.

---

## 3) Dry-run (não grava)

```bash
ssh -i "$KEY" "$HOST"

sudo docker cp /tmp/cdt/cdt-inc-payload.json worqera-mongodb:/tmp/cdt-inc-payload.json
sudo docker cp /tmp/cdt/apply-cdt-inc-payload.mongosh.js worqera-mongodb:/tmp/apply-cdt-inc-payload.mongosh.js

sudo docker exec \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG=sapataria-paulista \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

| Campo | Tem que estar assim |
|-------|---------------------|
| `mode` | `DRY-RUN` |
| `shop` | `sapataria-paulista` |
| `ordersInPayload` | 128 |
| `willInsert` | 128 se a loja ainda não tem esses códigos |
| `sampleNew` | códigos do PDF (`2140-26`, nomes de cliente) |

Se `shop` não for `sapataria-paulista`, pare. Não rode o APPLY.

---

## 4) APPLY

Só depois do dry-run certo:

```bash
sudo docker exec \
  -e APPLY=1 \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG=sapataria-paulista \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

Esperado: `ordersWritten` 128 (ou menos, se alguns códigos já existiam — esses são pulados).  
Rodar de novo não duplica.

---

## 5) Conferir

Login da Sapataria Paulista:

- Consultas → finalizados: `2140-26` e `2195-26`
- Público: `/p/sapataria-paulista/2140-26`
- Kanban não deve encher com esse lote

```js
const s = db.shops.findOne({ slug: "sapataria-paulista" })
printjson({
  delivered: db.orders.countDocuments({ shopId: s._id, status: "delivered" }),
  sample: db.orders.findOne(
    { shopId: s._id, code: "2140-26" },
    { code: 1, clientName: 1, status: 1, "pricing.total": 1, "pricing.remaining": 1 }
  ),
})
```

`pricing.remaining` do `2140-26` tem que ser 0. `pricing.total` 7000.

---

## 6) Limpar o servidor

```bash
rm -rf /tmp/cdt
sudo docker exec worqera-mongodb rm -f /tmp/cdt-inc-payload.json /tmp/apply-cdt-inc-payload.mongosh.js
```
