# E-mail da loja: enviar como a loja e responder dentro da Worqera

**Planejado em:** 2026-11-14 · **Status:** proposta

## Problema

- Todo e-mail sai de `worqera@gmail.com` (Gmail SMTP, `api/src/v1/services/mailer.js`) com nome "{Loja} via Worqera".
- O mailer v1 **não define `Reply-To`**. Quando o cliente responde, a resposta cai na caixa da Worqera. A loja não vê e ninguém responde.
- Gmail SMTP: limite baixo de envio por dia, o From é sempre a conta Gmail e não há SPF/DKIM da marca. Não aguenta virar SaaS.

## Quem envia o quê

| Tipo (`log.kind`) | Para quem | Remetente |
|---|---|---|
| `created`, `ready`, laudo/PDF, `feedback`, `refused`, `won`, `crm`, `reply`, `receivables` | Cliente da loja | **A loja** (nome dela; o domínio dela quando houver) |
| `verify_email`, `password_reset`, `invite`, `billing_*`, `daily`, `weekly*`, `late_alerts` | Dono ou equipe da loja | **Worqera** (já é `platform: true` ou deveria ser) |

"E-mail confirmado" (código de 6 dígitos) é da conta do dono e continua saindo como Worqera. Os e-mails do pedido saem como a loja.

## Fase 0 — Respostas chegam na loja (meio dia) ⭐ resolve hoje

1. `Shop.branding.replyToEmail` (padrão: e-mail do dono). Campo em Empresa → E-mail: "Respostas dos clientes vão para".
2. `mailer.deliver`: quando não for `platform`, `replyTo = shop.branding.replyToEmail`.
3. Teste em `orderEmail.test.js`: e-mail de pedido leva `replyTo`; e-mail de plataforma não leva.

Resultado: o cliente clica em Responder e o e-mail vai para a loja. Isso não depende de DNS nem de provedor novo.

## Fase 1 — Sair do Gmail: provedor transacional com domínio (1 dia + DNS)

- Provedor com **envio, recebimento e API de domínios**: **AWS SES** (mais barato, o `aws-sdk` já está no código; recebimento só em algumas regiões) ou **Postmark** (entrega muito boa, inbound simples, plano pago mensal). A decisão é sua.
- `worqera.com` com SPF, DKIM e DMARC. Remetente `"{Loja}" <loja-{slug}@mail.worqera.com>` (sai o "via Worqera"; o rodapé continua).
- Webhooks de entrega, bounce e spam → status no `PlatformMailLog` e no pedido ("e-mail entregue", "endereço inválido").
- Anexo PDF: SES `sendRawEmail` ou Postmark aceitam anexo, então o "SES não tem anexo" deixa de valer.

## Fase 2 — Caixa de e-mails dentro da plataforma (3 a 4 dias)

**Como a resposta volta:**
- Cada e-mail de cliente sai com `Reply-To: r+{token}@in.worqera.com`. O token aponta para a loja, o cliente e o pedido.
- O provedor recebe e chama `POST /webhooks/email/inbound` (assinado). A API acha o token (ou o `In-Reply-To` com o `Message-ID` guardado) e grava a mensagem.
- Uma **cópia é encaminhada** para o `replyToEmail` da loja, para nada se perder se ninguém abrir a Worqera.

**API**
- Modelo `EmailMessage`: `shopId`, `clientId`, `orderId?`, `direction` (in/out), `from`, `to`, `subject`, `text`, `html` (sanitizado), `attachments[]` (storage de fotos), `messageId`, `inReplyTo`, `readAt`, `threadId`.
- Os envios de cliente também gravam `EmailMessage(out)` com o `messageId`, para a conversa ficar completa.
- `GET /emails/threads` · `GET /emails/threads/:id` · `POST /emails/threads/:id/reply` (envia com `In-Reply-To`/`References` e entra na mesma conversa no e-mail do cliente) · `POST /emails/threads/:id/read`.
- Sino (`alertsService.getOwnerInbox`): "Nova resposta de {cliente} sobre o pedido 0412".

**Web / app**
- Menu Operação → **E-mails** (lista: cliente, pedido, prévia, não lida).
- Aba **E-mails** no detalhe do pedido e na ficha do cliente.
- Responder com texto pronto (e IA no Business, reaproveitando o `reply-suggest`).

**Segurança:** HTML sanitizado; limite de tamanho; anexos só de tipos comuns; filtro de spam do provedor; token não adivinhável.

## Fase 3 — Domínio da própria loja (2 a 3 dias, Pro e Business)

- Em Empresa → E-mail: "Enviar como `contato@sualoja.com.br`".
- A API pede o domínio ao provedor e mostra os registros DNS (DKIM/CNAME, SPF, return-path) com um botão "Verificar".
- Verificado → `From: "{Loja}" <contato@sualoja.com.br>`; o `Reply-To` continua `r+{token}@in.worqera.com`, então a caixa da Fase 2 segue funcionando.
- Não verificado ou caiu → volta sozinho para `loja-{slug}@mail.worqera.com`.
- **Não recomendado:** conectar o Gmail/Outlook da loja por OAuth. O Google trata o envio por Gmail como escopo restrito (verificação e auditoria de segurança). Fica para depois, se houver pedido.

## Fase 4 — Polimento

- Modelos editáveis por tipo (pedido criado, pronto, laudo) e liga/desliga por tipo.
- "Aberto" e "clicado" no pedido.
- Juntar com o WhatsApp na tela **Conversas** (Onda 3 de `2026-10-25-proximas-ondas.md`).

## Por plano (sugestão)

| | Basic | Pro | Business |
|---|---|---|---|
| Resposta vai para o e-mail da loja (Fase 0) | ✅ | ✅ | ✅ |
| Caixa de e-mails na Worqera (Fase 2) | — | ✅ | ✅ |
| Domínio próprio (Fase 3) | — | ✅ | ✅ |
| Resposta com IA | — | — | ✅ |

## Ordem e prazo

Fase 0 (meio dia) → Fase 1 (1 dia + DNS) → Fase 2 (3–4 dias) → Fase 3 (2–3 dias). No total, de 1,5 a 2 semanas. Cada fase entra em produção sozinha.

## Decisões abertas

1. Provedor: SES ou Postmark.
2. Subdomínios: `mail.worqera.com` (envio) e `in.worqera.com` (recebimento).
3. Divisão por plano acima.
