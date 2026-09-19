# Plano: carga Infor+ → Worqera (por loja)

Objetivo: exportar PDF do Infor+ (igual `report001*.pdf`), gerar payload no Mac e gravar **só na loja certa** no Mongo de PRD — sem misturar Casa do Tênis com a loja do irmão.

---

## 0) O que vai parar onde (tabelas)

Tudo é **multi-tenant** por `shopId`. A carga **nunca** mistura lojas.

| Coleção Mongo | O que entra |
|---------------|-------------|
| `shops` | Já deve existir (signup / Oficinas). **Não** cria loja nova na carga. |
| `clients` | Clientes só-nome, filtrados por `shopId` da loja alvo |
| `orders` | Pedidos `delivered` com código legado `NNNN-26`, `shopId` da loja alvo |
| `ordercounters` | Garante counter da loja (não mexe nos códigos legados) |

**Chave da loja = `slug`** (ex. `casa-do-tenis`, `oficina-do-joao`).  
Descobrir no PRD:

```bash
# Oficinas no app (você logado worqera@gmail.com) → /admin/shops
# ou mongosh:
sudo docker exec -it worqera-mongodb mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' --eval '
db.shops.find({}, { name:1, slug:1, status:1 }).toArray()
'
```

Anote o **slug** da loja do irmão **antes** de gerar o payload.

---

## 1) Pré-requisitos na loja alvo

1. Conta criada (signup + e-mail confirmado, se verificação estiver ligada)
2. Assinatura **ativa** (você: Oficinas → Ativar Premium)
3. Setores da loja ok (signup já cria padrão; pode customizar depois)
4. Você sabe o **slug** (ex. `loja-irmao`)

Sem loja / slug errado → a carga **não roda** (erro “Shop not found”) ou cai na loja errada se você errar o slug.

---

## 2) No Infor+ — exportar PDF

Mesmo relatório que a CdT usa (Pedidos por Cliente / report001):

1. No Infor+, abra o relatório de **pedidos por cliente** (período desejado)
2. Exporte / imprima em **PDF**
3. Traga o arquivo pro Mac (Downloads ou raiz do repo)
4. Renomeie de forma clara, ex.:
   - `infor-irmao-historico.pdf` (carga cheia)
   - `infor-irmao-2026-09-17-19.pdf` (incremental)

**Não** commitar PDF no git. Só `scp` / uso local.

---

## 3) No Mac — extrair + montar payload **da loja certa**

```bash
cd /Users/eduardo/Documents/Repo/worqera-platform
pip3 install pypdf

# Defina A LOJA (obrigatório)
export SHOP_SLUG='slug-da-loja-do-irmao'   # ← troque

# Extrai o PDF (ajuste path e datas)
python3 api/scripts/extract-cdt-report001.py \
  --pdf "/caminho/pro/infor-irmao.pdf" \
  --out-dir api/scripts/data \
  --out-prefix cdt-report001-inc-p1 \
  --since 2026-01-01 \
  --until 2026-09-19 \
  --skip-full-qa

# Se o extract gerou *-orders.jsonl com outro prefix, copie/mescle para o nome padrão:
cp api/scripts/data/cdt-report001-inc-p1-orders.jsonl \
   api/scripts/data/cdt-report001-inc-orders.jsonl

# Payload com shopSlug embutido
SHOP_SLUG="$SHOP_SLUG" node api/scripts/build-cdt-inc-payload.js
```

Confira no JSON de saída: `"shopSlug": "slug-da-loja-do-irmao"`.

Arquivo: `api/scripts/data/cdt-inc-payload.json` (gitignored).

---

## 4) Enviar pro servidor (`/tmp`)

```bash
export KEY=~/Downloads/ssh-key.key
export HOST=ubuntu@168.75.68.246
export SHOP_SLUG='slug-da-loja-do-irmao'

ssh -i "$KEY" "$HOST" 'mkdir -p /tmp/cdt && chmod 700 /tmp/cdt'

scp -i "$KEY" \
  api/scripts/data/cdt-inc-payload.json \
  api/scripts/apply-cdt-inc-payload.mongosh.js \
  "$HOST:/tmp/cdt/"
```

---

## 5) Dry-run (não grava) — confira a loja no JSON

```bash
ssh -i "$KEY" "$HOST"

sudo docker cp /tmp/cdt/cdt-inc-payload.json worqera-mongodb:/tmp/cdt-inc-payload.json
sudo docker cp /tmp/cdt/apply-cdt-inc-payload.mongosh.js worqera-mongodb:/tmp/apply-cdt-inc-payload.mongosh.js

# SHOP_SLUG no env Ganha do payload; passe explícito por segurança
sudo docker exec \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG='slug-da-loja-do-irmao' \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

Leia a saída:

| Campo | Ok se… |
|-------|--------|
| `shop` | = slug do irmão (**não** `casa-do-tenis`) |
| `willInsert` | quantidade nova |
| `alreadyInMongo` | já existiam nessa loja |
| `sampleNew` | nomes/códigos batem com o PDF |

Se `shop` estiver errado → **não** rode APPLY. Ajuste `SHOP_SLUG` e payload.

---

## 6) Apply (grava só novos **nessa** loja)

```bash
sudo docker exec \
  -e APPLY=1 \
  -e PAYLOAD_PATH=/tmp/cdt-inc-payload.json \
  -e SHOP_SLUG='slug-da-loja-do-irmao' \
  worqera-mongodb \
  mongosh 'mongodb://127.0.0.1:27017/worqera?replicaSet=rs0' \
  --file /tmp/apply-cdt-inc-payload.mongosh.js
```

Anti-duplicata: mesmo código **só naquela** `shopId`. CdT não é afetada.

---

## 7) Conferir

- Login da loja do irmão → `/consultas/pedidos?tab=finalizados`
- Público: `/p/{slug}/{codigo}`
- Kanban **não** lota (`status: delivered`)

```js
// mongosh — troque o slug
const s = db.shops.findOne({ slug: "slug-da-loja-do-irmao" })
printjson({
  shop: s.name,
  delivered: db.orders.countDocuments({ shopId: s._id, status: "delivered" }),
  clients: db.clients.countDocuments({ shopId: s._id }),
})
```

---

## 8) Limpar

```bash
rm -rf /tmp/cdt
sudo docker exec worqera-mongodb rm -f /tmp/cdt-inc-payload.json /tmp/apply-cdt-inc-payload.mongosh.js
```

No Mac: pode apagar o PDF e o `cdt-inc-payload.json`.

---

## Checklist rápido (irmão / próxima loja)

1. [ ] Loja existe + Premium ativo  
2. [ ] Anotei o **slug** em Oficinas  
3. [ ] Exportei PDF Infor+  
4. [ ] `SHOP_SLUG=…` no build do payload  
5. [ ] Dry-run: `shop` = slug certo  
6. [ ] Apply  
7. [ ] Conferi Finalizados + 1 código  
8. [ ] Apaguei `/tmp/cdt` e PDF  

---

## Erros comuns

| Erro | Causa |
|------|--------|
| `Shop 'x' não encontrado` | Slug errado ou loja não criada |
| Dados na CdT | Esqueceu `SHOP_SLUG` (default era casa-do-tenis) |
| `willInsert: 0` | Códigos já existem **nessa** loja |
| Nomes sujos `R$…` | Re-extrair com parser atualizado |

---

## Relação com a CdT

| Loja | Doc / comando |
|------|----------------|
| Casa do Tênis | [`cdt-incremental-carga.md`](cdt-incremental-carga.md) · slug `casa-do-tenis` |
| Qualquer outra (irmão, etc.) | **Este plano** · `SHOP_SLUG` explícito |

Mesmos scripts; só muda **PDF + slug**.
