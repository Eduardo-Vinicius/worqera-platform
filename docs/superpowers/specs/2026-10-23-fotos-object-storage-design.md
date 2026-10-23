# Fotos: sair do disco da Oracle para object storage

Data: 2026-10-23  
Onde está: `docs/superpowers/specs/2026-10-23-fotos-object-storage-design.md`  
Relacionado: [estoque e produtos](2026-10-01-worqera-estoque-produtos-design.md), `api/src/v1/services/storageService.js`

---

## Em uma frase

As fotos **já não ficam em memória**. Na Oracle elas vão para o **disco da VM**. O próximo passo é **object storage** (Oracle, Amazon S3 ou Cloudflare R2) com a **mesma pasta por oficina**. Foto de produto (catálogo) ainda não existe; entra numa pasta irmã da de pedidos.

---

## Como está hoje

1. O browser manda a foto no HTTP.
2. O multer segura o arquivo **só nesse request** (RAM).
3. O `storageService.putBuffer` grava:
   - disco, se `S3_BUCKET_NAME` estiver vazio
   - object storage, se o bucket estiver preenchido
4. O Mongo guarda só `{ key, url, isCover }`.

Na produção Oracle (`api/docker-compose.prod.yml`):

- container: `/app/storage`
- host: **`/volumes/worqera/api/storage`**
- `.env.prod.example` **não tem** `S3_BUCKET_NAME`

Restart do container não apaga (o volume fica na VM). Disco cheio, VM sem backup e restore sem o volume, sim.

---

## Pastas (por oficina; pedido ≠ produto)

Um bucket ou o disco. A **key** é o caminho. Tudo começa em `shops/{id da oficina}/`.

```
shops/
  {oficina}/
    branding/logo.png
    orders/{pedido}/
      fotos/item-0/foto-1.jpg      ← foto do par (já existe)
      pdfs/laudo-0048-....pdf
    products/{produto}/
      fotos/capa.jpg               ← catálogo (novo)
```

- Cada oficina tem o próprio prefixo. Kryon não mistura com Sapataria.
- Pedido **Da loja**: se o funcionário anexar foto no par, continua em `orders/...`. A capa do produto copia no snapshot do item, não no arquivo do pedido.
- No disco isso é pasta. No object storage é o mesmo texto como Key. Ligar o bucket **não muda** a árvore.

---

## Qual loja usar

O código já fala o **protocolo S3**. Muda endpoint e chave, não a tela.

| Opção | Quando | Orçamento neste volume |
| --- | --- | --- |
| Disco da VM (hoje) | Volume ainda cabe | O bloco que você já paga. Em 3 anos a 2000/mês ≈ **200 GB na máquina** |
| **Oracle Object Storage (SP), API S3** | API continua na Oracle | **R$ 15–25/mês** típico. Uma fatura. Upload não vai para a AWS |
| Amazon S3 São Paulo | Você já tem (ou quer) conta AWS | **R$ 20–70/mês** sem crédito de saída; **R$ 8–47** só de disco |
| Cloudflare R2 | Muita gente abrindo foto (consulta, TV) | **~R$ 17/mês** no 3º ano a 2000/mês; **saída zero** |

Não entram neste corte: Mongo/GridFS, base64, só RAM, Glacier, CloudFront, ImageKit.

**Recomendação:** object storage sim. **Oracle Object Storage** se a casa continua na Oracle. Amazon S3 só se a conta AWS já existir. R2 se a consulta pública disparar tráfego.

Para ligar: `S3_BUCKET_NAME` + `S3_ENDPOINT` (OCI ou R2) + chaves. Sem endpoint = AWS S3 clássico.

---

## Previsão de custo (Amazon S3 São Paulo)

Contas fechadas:

- 2 itens por pedido, 4 fotos por item = **8 fotos/pedido**
- Foto comprimida no app: **350 KB** (1600 px, JPEG 0,72)
- Preços out/2026: guardar US$ 0,0405/GB-mês; PUT US$ 0,007/mil; saída US$ 0,15/GB
- Câmbio: US$ 1 = R$ 5,70
- Foto **não apaga**. Tráfego do mês = o que a fila e o cliente **abrem agora**

Entra por mês: **+2,8 GB a cada 1000 pedidos** (2000 pedidos = +5,6 GB).

### Disco acumulado (aluguel daquele mês)

| Ritmo | 1 ano | 2 anos | 3 anos |
| --- | --- | --- | --- |
| 1000 pedidos/mês | 34 GB · **R$ 8** | 67 GB · **R$ 16** | 101 GB · **R$ 23** |
| 2000 pedidos/mês | 67 GB · **R$ 16** | 134 GB · **R$ 31** | 202 GB · **R$ 47** |

### Fatura do mês no S3 (guardar + subir + abrir foto)

Uso normal, **sem** o crédito de 100 GB da AWS:

| Ritmo | 12º mês | 36º mês |
| --- | --- | --- |
| 1000/mês | **~R$ 18** | **~R$ 33** |
| 2000/mês | **~R$ 38** | **~R$ 69** |

Com o crédito de 100 GB (conta só com Worqera): some o aluguel da tabela de cima. Uso pesado em 2000/mês no 3º ano: teto **~R$ 100**.

**Para orçar S3:** reserva **R$ 50/mês** em 1000–2000 pedidos. Cobre 3 anos em 2000 no uso normal. Se passar de ~4000/mês ou outro serviço AWS comer o crédito: **R$ 80–100**.

Na Oracle Object Storage o mesmo volume fica mais perto de **R$ 15–25/mês** (guardar mais barato, saída ~US$ 0,0085/GB).

---

## Foto de produto (o que falta no código)

Hoje o `Product` **não tem foto**. A spec de estoque pede **uma capa do produto**, não por variação.

1. Prefixo: `shops/{shopId}/products/{productId}/fotos/`
2. Schema: `photos: [{ key, url, isCover }]` — UI mostra uma capa
3. API (só admin Worqera):
   - `POST /products/:id/photos`
   - `DELETE /products/:id/photos/:index`
4. Mesmo `putBuffer` / `deleteObject` do pedido e do logo. Apagar produto apaga a pasta.
5. Tela: campo de foto ao lado de nome, preço e quantidade. Reusar `compressImage` do pedido.
6. Pedido **Da loja**: thumb da capa; se o item não tiver foto, copia a capa no snapshot.

URL assinada (bucket privado), igual às fotos do pedido. Sem bucket aberto.

---

## Fora deste corte

- Foto por variação
- CDN
- Migração automática das fotos de pedido que já estão no disco (depois: `s3 sync` do `/volumes/worqera/api/storage`)
- Abrir o upload de catálogo para o dono da oficina

---

## Deploy

Sem `S3_BUCKET_NAME` (e sem endpoint), foto de produto cai no **mesmo disco da VM** que o pedido. Para object storage: bucket + região/endpoint + credencial no `.env.prod` da API, depois `sudo make prod-up` da API.
