# Worqera API — Change log

## 2026-10-04

- **Marca:** catálogo da loja em `/brands`. O item do pedido guarda `brand` separado do modelo. Atendimento pode criar pelo combo.

- **Preço por papel:** admin e dono veem o pendente de cada coluna do kanban e o detalhe do valor. Atendimento vê o total do pedido em texto discreto, sem a soma da coluna. Setor não recebe preço na ficha nem no kanban, e um patch de setor não altera o valor.

## 2026-10-03

- **Desconto:** `pricing.subtotal` e `pricing.discount` (reais). O total do pedido é o subtotal menos o desconto; o sinal e o restante usam esse total. O laudo mostra subtotal, desconto e o que falta pagar.
- **Kanban:** cada card leva a parte do valor líquido do par. A soma das colunas não conta o mesmo pedido duas vezes.
- **Detalhe do par:** se o item ficou só com atendimento + final, ou a foto ficou na cópia do pedido, reabrir o pedido devolve o caminho e as fotos daquele par.
- **Fotos do pedido:** salvar o pedido não apaga mais a foto que existia só na cópia geral. Reabrir o pedido também recupera o arquivo do par (pasta `item-N`) se a ficha tinha ficado vazia.

## 2026-10-02

- **TV Oficina e carga por setor:** a contagem segue o kanban (um número por item na coluna), não o pedido inteiro. Pedido com vários pares em Acabamento soma cada par.

## 2026-10-01

- **Laudo:** capa da loja (logo, nome, telefone, endereço e cor escolhida), previsão de entrega em destaque, status em português, descrição e fotos por par, QR do pedido e de cada par. Rodapé só com “Emitido via Worqera”.
- **Laudo:** foto do par entra no PDF pela `key` ou pelo path da URL (jpeg/png/webp); pedido de um par ainda usa `order.photos` se o item não tiver foto.
- **Kanban:** em cada coluna, prioridade alta no topo e o restante do mais novo para o mais antigo.
- **Catálogo e setores:** `DELETE /services/:id` e `DELETE /sectors/:id` apagam o documento. Setor em uso (pedido aberto, em andamento ou pronto) responde 409.
- **Pedido:** atualizar modelo/serviços no par único não recria o item (a foto anexada permanece).

## 2026-09-24

- **Editar pedido (merge-safe):** `PATCH/POST/DELETE /orders/:id/items/:itemIndex` preserva `currentSectorId`/`sectorHistory`/fotos; `items[]` no PATCH do pedido rejeitado; entregue bloqueia mudança estrutural.
- **Fotos por item:** upload grava em `items[i].photos` (máx. **10**/item); `order.photos` = união; `DELETE .../items/:i/photos/:j`; compressão no client (1600px / JPEG 0.72).
- **Laudo:** só fotos do par (`items[i].photos`); sem fallback que misturava `order.photos` no par 0; até 10 embeds.
- **Kanban:** badge **Sem foto**; drawer “Ver pedido inteiro” vs só o par.
- **Lixeira:** `DELETE /orders/:id/purge` (owner/admin) apaga de vez só se já estiver na lixeira.
- **Partida por par:** cada item envia `flowOptionIds`; create grava `items[].plannedSectorIds`.
- **Subitens no kanban:** 1 card por item; move por item; ready agregado.
- **Admin shops:** planos Basic / Pro / Business.

## 2026-09-22

- **Subitens no kanban:** cada `items[]` tem `currentSectorId` / `plannedSectorIds` / `sectorHistory`; board explode 1 card por item; `POST /kanban/orders/:orderId/items/:itemId/move`; pedido `ready` só com todos no terminal; e-mail de pronto agregado; consulta `/p` aceita `?item=` + lista de itens.
- **Admin shops:** planos Basic / Pro / Business (ativação/troca/revogação).
- **Lixeira:** soft-delete + restore; purge em 2026-09-24.
- **Partida por par / fotos:** ver 2026-09-24.

## 2026-09-19

- **Auth:** login sem bloquear por e-mail não verificado — alerta dismissível no shell + toast no login.
- **Pedidos:** soft-delete (`deletedAt`) + `POST /orders/:id/restore`; listas/kanban/público/CSV ignoram lixeira; `?deleted=1` lista trash.
- **E-mail pedido:** create aguarda notify e devolve `emailNotify`; logs `[orderNotify]`/`[mailer]`; `POST /orders/:id/resend-email`; tela `/sucesso` mostra status + reenviar.
- **Serializer:** `clientEmail` exposto no pedido (pós-criar / status de e-mail).
- **Fotos:** URLs assinadas (`accessibleUrl` / S3 signed ou `?exp=&sig=`); `/files` aceita sig sem Bearer — corrige `<img>` quebrado em PRD. Garantir `PUBLIC_API_URL` na API.
- **Laudo PDF:** redesign profissional por par (serviços, fotos, cliente não-nulo); gera no create; filename `laudo-{code}.pdf`.
- **Avaliações:** `GET /alerts/feedback?score=` + `GET /alerts/feedback/export.csv`.
- **Avaliações:** `GET /alerts/feedback` (lista paginada + média, distribuição 1–5, top tags); período `30d`/`90d`/`all`.
- **Setor público:** `Sector.showOnPublic` (default true); `/p` e e-mail/Zap de move mascaram nome → “Em andamento” quando off.
- **Consulta pública:** link exige slug + código + token secreto (`/p/{slug}/{code}?t=…`); create gera `publicToken`; get/notify/WA fazem backfill; QR/etiqueta/Zap/e-mail usam o mesmo formato.
- **Auth:** verificação de e-mail no signup (`verify-email` / `resend-verification`); login exige confirmação se houver token pendente.
- **Platform admin:** JWT `platformAdmin`; login sem shop membership liberado; patch shop aceita `planCode` + ativa Premium manual.
- **E-mail pedido:** create envia PDF em anexo + link público; ready reforça CTA de avaliação no `/p`.
- Mailer: suporte a `attachments` (SMTP).

## 2026-09-18 (noite+)

- **Starter Kits:** `POST /shops/current/apply-starter-kit` — setores + serviços + vertical/itemLabel.
- **Ops:** doc cron trial reminders.

## 2026-09-18 (noite)

- **QW:** `employees` com `requireRole('owner','admin')`.
- **Docs:** AS-IS app mirror + Status Pack / escala.

## 2026-09-18

- **Loop:** `whatsappSuggest` no `POST /orders` (template `created`); `buildOrderWhatsAppSuggest` compartilhado com move.
- **Kanban card:** `clientPhone` no serialize do board.
- **Multi-vertical:** `Shop.vertical` + `branding.itemLabel`/`itemLabelPlural`; signup default `general` com setores Recebido → Pronto.

## 2026-09-17

- **Financeiro:** `GET /metrics/finance` com `today` (caixa do dia), top serviços via `items[].services`, labels PT de status.
- **Reopen/feedback/inbox:** `Order.reopenedAt`; reopen limpa `feedback`; planned path sempre termina em setor `isTerminal`; `GET /alerts/inbox` (feedback recente + ready + reopened counts).
- **Cliente notify:** `Sector.notifyEmailOnEnter`; `orderNotify` (created/moved/ready); `Shop.notifications.email.enabled`; `POST /public/.../feedback`; reopen ready+delivered (`action: reopen`); `Order.feedback`.
- **Branding:** `branding.accentColor`; `POST /shops/current/logo` (multipart ≤2MB); `GET /public/files/*` só `shops/*/branding/`; public order retorna logo/cores/phone; mailer usa `primaryColor`; `Shop.adminNote` + patch platform.
- **Wow:** digest semanal owner (`POST /alerts/weekly-digest` + `scripts/send-weekly-digests.js`); WhatsApp suggest no move do kanban (`whatsappSuggest` wa.me).
- **Observabilidade:** `GET /health` + `GET /health/ready` (Mongo ping); request log JSON + correlation id.
- **Ops:** `scripts/mongo-backup.sh` (retenção 7d); `scripts/send-trial-reminders.js` (D-2 / D-0).
- **Orders:** `POST /orders/demo`; `GET /orders/export.csv` (owner).
- **ACL:** metrics continua owner-only.

## 2026-09-15

- **ACL:** rotas `/metrics` (v1 + legado) restritas a role `owner` (admin de loja não vê financeiro/métricas).
- **Carga CdT:** scripts `extract-cdt-report001.py`, `import-cdt-report001.js`, `import-cdt-open-snapshot.js`; histórico `delivered` com códigos `NNNN-26`; guia PRD em `docs/ops/cdt-historical-import-prd.md`.
- **Consultas API:** `listClients` com `q` + cursor/limit; `listOrders` status CSV + code prefix; index `{shopId,status,createdAt}`.

## 2026-09-14

- **Kanban UX:** comentários em lista (`POST /orders/:id/comments`); move no plano vs fora do plano separados; card inteiro arrastável.
- **Product + Fase 3:** Shop branding (logo/phone/address), tvSettings, WhatsApp wa.me prefs, partnerCode; mailer Gmail-first + subject `[Empresa]`; AbacatePay soft-off (`WORQERA_AbacatePay__Enabled=false`); `.env.prod.example`; seed-catalog endpoint.
- **Onboarding→TOP-05:** shop.onboarding; invites; member reset-password; TOP-04 sectorPathHint no create order; alerts delays+digest; mailer SES/Gmail/console; billing receipt e-mail.
- **P0:** AbacatePay `subscriptions/create` quando ApiKey+ProductId; webhook exige secret+HMAC em produção; `forgot/reset-password`; refresh cookie; public order exige shop slug se ambíguo; `node --test` isolamento/HMAC.
- **Blind forward:** `GET /kanban` + `forwardTargets`; sector move para qualquer destino ativo; `sectorHistory` com `fromSectorId`, `movedByName/Email`, `action`.
- **SaaS Fases 1–2:** rate limit signup/login; `PLATFORM_ADMIN_EMAILS` + `/platform/shops`; members role/`sectorIds`; webhook HMAC + fail-closed; `me.platformAdmin`; kanban sector ACL.
- **Near-QW 2:** `listOrders` aceita `clientId`; web auto-refresh em 401.
- **QW pack:** `ensureWarranty` no create (+3 meses se ativa sem data); serialize `warranty`/`garantia`; QW-13/14 fechados.
- **Kanban labels:** `nextOrderCode` shop-wide (`0001`, pad 4); `Order.plannedSectorIds`; move off-path exige `note`.
- **Ops UX Onda C:** `Order.items[]`, fotos por item, `itemCount`. Billing stub.
