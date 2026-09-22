# E-mail Worqera — caminho Gmail → domínio

Resposta curta: **sim, dá pra seguir o caminho usando `@gmail` no começo**.  
Gmail fica na **fase 0/1 (teste)**. Produção boa de entregabilidade = **domínio + SPF/DKIM/DMARC + SES** (ou outro transacional).

Hoje o app já manda assim (`api/src/v1/services/mailer.js`):

- SMTP Gmail se `WORQERA_Email__Enabled` + user/pass
- anexos (PDF do pedido) **exigem SMTP** (SES `sendEmail` sem anexo)
- sem credencial → só log `[mailer:dev]`

Remetente atual de lab: `worqera@gmail.com`.

---

## O que o Gmail consegue / não consegue

| | Com `@gmail.com` | Com domínio (`noreply@worqera.com`) + SES |
|--|--|--|
| Testar create/ready/PDF | ✅ | ✅ |
| Marca no From | fraca (`… via Worqera <…@gmail.com>`) | forte |
| SPF/DKIM/DMARC da marca | ❌ (é do Google) | ✅ |
| Volume / SaaS | limite baixo, risco spam | pensado pra isso |
| Responder cliente | usa a caixa Gmail | caixa `contato@domínio` (opcional) |

**Comprar só “e-mail no domínio” na GoDaddy** ≠ resolver spam. Ajuda a ter caixa humana; o app ainda precisa autenticar o domínio no envio.

---

## Fase 0 — agora (Gmail, ok)

Manter no `api/.env` / `.env.prod`:

```bash
WORQERA_Email__Enabled=true
WORQERA_Email__FromName=Worqera
WORQERA_Email__FromAddress=worqera@gmail.com
WORQERA_Email__Smtp__Host=smtp.gmail.com
WORQERA_Email__Smtp__Port=587
WORQERA_Email__Smtp__Username=worqera@gmail.com
WORQERA_Email__Smtp__Password=xxxx   # App Password (2FA)
```

Checklist:

1. Conta Google com 2FA → [App passwords](https://myaccount.google.com/apppasswords)
2. Empresa → notificações de e-mail **ligadas**
3. Pedido com `clientEmail` preenchido
4. Na tela `/pedidos/[id]/sucesso` → status / **Reenviar e-mail**
5. Log da API: `[mailer] smtp ok` ou `smtp failed`

Limites honestos: bom pra validar fluxo; não conte com inbox perfeita nem volume alto.

---

## Fase 1 — domínio no DNS (ainda pode mandar pelo Gmail)

Na GoDaddy, no domínio (ex. `worqera.com`):

1. Apontar web/API (A/CNAME) — fora do escopo deste doc (`docs/ops/deploy-prd.md`)
2. **Ainda não** mude o From do app se o SES não estiver pronto
3. Opcional: criar caixa `contato@worqera.com` (Workspace ~US$ 6–12/mês **ou** e-mail GoDaddy) só pra **receber** respostas humanas

Nesta fase o app **continua** com Gmail. Domínio = casa pronta; Gmail = motor temporário.

---

## Fase 2 — caminho certo (domínio + SES)

Objetivo: From `Worqera <noreply@worqera.com>` com DNS autenticado.

### 2.1 AWS SES

1. Conta AWS → SES (região, ex. `us-east-1`)
2. Verify domain `worqera.com` (não só o e-mail)
3. SES mostra registros **DKIM** (CNAME) → colar na GoDaddy
4. SPF: TXT no apex incluindo `include:amazonses.com` (não apague includes que já existirem)
5. DMARC (comece suave):

```txt
Name: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:voce@gmail.com; adkim=s; aspf=s
```

6. Pedir saída de sandbox SES (produção) quando for enviar pra clientes reais
7. IAM user/role com `ses:SendEmail` / `ses:SendRawEmail` (anexos = raw)

### 2.2 Env produção

```bash
WORQERA_Email__Enabled=true
WORQERA_Email__FromName=Worqera
WORQERA_Email__FromAddress=noreply@worqera.com
WORQERA_Email__PreferSes=true
SES_FROM_EMAIL=noreply@worqera.com
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

**Anexos (PDF no create):** o mailer atual prioriza SMTP quando há anexo. Opções:

- A) Manter SMTP autenticado no domínio (Google Workspace SMTP / SES SMTP endpoint), ou  
- B) Evoluir o mailer pra `SendRawEmail` (SES com anexo) — backlog curto se SES puro for o alvo

Até (B), caminho pragmático: SES/domínio no From + SMTP do provedor do domínio **ou** SES SMTP:

```bash
WORQERA_Email__Smtp__Host=email-smtp.us-east-1.amazonaws.com
WORQERA_Email__Smtp__Port=587
WORQERA_Email__Smtp__Username=<SMTP user SES>
WORQERA_Email__Smtp__Password=<SMTP pass SES>
WORQERA_Email__FromAddress=noreply@worqera.com
```

(Credenciais SMTP do SES ≠ Access Key da API; gera no console SES.)

### 2.3 Teste

1. `node api/scripts/send-test-email.js seu@email.com` (se existir) ou criar pedido + Reenviar
2. Conferir headers no Gmail: “assinado por worqera.com” / SPF+DKIM pass
3. [mail-tester.com](https://www.mail-tester.com) — mira ≥ 8/10

Custo SES: ~**US$ 0,10 / 1.000 e-mails**. No começo é quase de graça.

---

## Fase 3 — higiene (depois que estabilizar)

- Separar `noreply@` (só envia) de `contato@` (humano)
- Subir DMARC de `p=none` → `quarantine` → `reject` com calma
- Não misturar marketing em massa no mesmo domínio do transacional no dia 1
- Monitorar bounce / complaint no SES

---

## Decisão prática pra você agora

| Momento | O que fazer |
|---------|-------------|
| Esta semana | Continuar **Gmail** + App Password; validar fluxo no app |
| Domínio comprado | Só apontar DNS do site; **não precisa** comprar e-mail caro ainda |
| Antes de clientes reais em volume | Fase 2 (SES + `noreply@domínio`) |
| Querer ler respostas com marca | 1 caixa Workspace/GoDaddy em `contato@` (opcional) |

**Resumo:** Gmail serve no caminho como **etapa**, não como destino. Comprar e-mail no domínio **ajuda a marca e a receber**, mas **o que tira do lixo** é autenticação DNS + provedor transacional (SES), não o Gmail.
