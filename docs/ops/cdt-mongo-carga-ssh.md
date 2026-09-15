# Carga CdT em PRD via SSH (sem PDF no servidor)

Objetivo: **não subir** `report001.pdf` nem o extrator Python no servidor (menos risco de vazar lista da loja).  
Você gera o payload **no seu Mac**, manda só um JSON pequeno (~140 KB) + o script mongosh, e aplica no Mongo de PRD.

Arquivos (no repo):

| Arquivo | Vai pro servidor? | Conteúdo |
|---------|-------------------|----------|
| [`api/scripts/build-cdt-prd-payload.js`](../../api/scripts/build-cdt-prd-payload.js) | Não | Gera o JSON localmente |
| `api/scripts/data/cdt-prd-payload.json` | **Sim (scp)** | ~1012 pedidos (gitignored) |
| [`api/scripts/apply-cdt-prd-payload.mongosh.js`](../../api/scripts/apply-cdt-prd-payload.mongosh.js) | **Sim (scp)** | Script mongosh (sem PII fixo) |
| PDF / extract `.py` | **Não** | Só no seu laptop |

---

## 0) Pré-requisitos no servidor

1. API deployada + Mongo de PRD ok  
2. **Seed** CdT já rodou (`casa-do-tenis` + setores + owner com seu e-mail)  
3. `mongosh` instalado no host (ou container com acesso ao Mongo)

```bash
# exemplo
mongosh "$MONGODB_URI" --eval 'db.runCommand({ ping: 1 })'
```

---

## 1) No seu Mac (uma vez) — montar o payload

Com o monorepo e o `report001.pdf` na raiz:

```bash
cd /caminho/worqera-platform
pip3 install pypdf
python3 api/scripts/extract-cdt-report001.py
node api/scripts/build-cdt-prd-payload.js
```

Saída esperada:

```text
orderCount: 1012
sizeMb: ~0.14
→ api/scripts/data/cdt-prd-payload.json
```

Esse JSON **não** vai pro git (`.gitignore`). Guarde só local / scp.

---

## 2) Copiar só o necessário pro servidor

```bash
# no Mac
ssh user@prd 'mkdir -p /tmp/cdt && chmod 700 /tmp/cdt'

scp api/scripts/data/cdt-prd-payload.json \
    api/scripts/apply-cdt-prd-payload.mongosh.js \
    user@prd:/tmp/cdt/
```

**Não** copie o PDF.

---

## 3) No servidor — dry-run

```bash
ssh user@prd
cd /tmp/cdt
export MONGODB_URI='mongodb://…'   # ou mongodb+srv://… da PRD
export PAYLOAD_PATH=/tmp/cdt/cdt-prd-payload.json

mongosh "$MONGODB_URI" --file apply-cdt-prd-payload.mongosh.js
```

Deve imprimir `mode: DRY-RUN`, `ordersInPayload: 1012`, shop/setores ok.  
**Nada gravado** ainda.

---

## 4) Apply (grava)

```bash
cd /tmp/cdt
export MONGODB_URI='…'
export PAYLOAD_PATH=/tmp/cdt/cdt-prd-payload.json
export APPLY=1

mongosh "$MONGODB_URI" --file apply-cdt-prd-payload.mongosh.js
```

Idempotente: re-rodar faz upsert por `{ shopId, code }`.  
Counter fica pronto para próximos pedidos = `0001` (não usa `NNNN-26`).

---

## 5) Conferir

```bash
mongosh "$MONGODB_URI" --eval '
const s = db.shops.findOne({ slug: "casa-do-tenis" });
printjson({
  delivered: db.orders.countDocuments({ shopId: s._id, status: "delivered" }),
  openish: db.orders.countDocuments({ shopId: s._id, status: { $nin: ["delivered","cancelled"] } }),
  sample: db.orders.findOne({ shopId: s._id, code: "3191-26" }, { code:1, clientName:1, status:1, "pricing.total":1 })
});
'
```

Na UI: `/consultas/pedidos?tab=finalizados` ou `/pedidos` → Finalizados → `3191-26`.

---

## 6) Limpar rastros no servidor

```bash
shred -u /tmp/cdt/cdt-prd-payload.json 2>/dev/null || rm -f /tmp/cdt/cdt-prd-payload.json
rm -f /tmp/cdt/apply-cdt-prd-payload.mongosh.js
rmdir /tmp/cdt 2>/dev/null || true
```

No Mac, pode apagar o JSON depois do apply se não quiser guardar cópia.

---

## O que o script faz

1. Achá `shops` por `slug: casa-do-tenis`  
2. Setores ativos + setor terminal  
3. User `owner`/`admin` do membership  
4. Upsert **clients** (só nome)  
5. Upsert **orders** `status: delivered` (fora do kanban)  
6. `ordercounters` seq=0 se não existir  

---

## Alternativa se não tiver mongosh

Com a API já no servidor (Node + `api/`):

```bash
# no Mac: scp só o payload para o host
scp api/scripts/data/cdt-prd-payload.json user@prd:/tmp/cdt/

# no servidor, se tiver o repo da API:
cd /var/www/worqera/api   # ajuste o path
# (ainda precisa do import-cdt-report001.js + JSONL — prefira mongosh acima)
```

O caminho **recomendado** é o mongosh + payload: zero PDF, zero Python, um JSON de 140 KB.

---

## Conta de acesso (lembrete)

Seed com o **seu** e-mail:

```bash
SEED_ADMIN_EMAIL=voce@worqera.com
SEED_ADMIN_PASSWORD='…'
PLATFORM_ADMIN_EMAILS=voce@worqera.com
```

Financeiro/Métricas = `owner`/`admin` da loja.  
Oficinas = só `PLATFORM_ADMIN_EMAILS`.  
Equipe CdT convida como `atendimento` / `sector` — não vê o crítico.
