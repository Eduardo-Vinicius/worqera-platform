# IA e WhatsApp oficial — como ligar

Atualizado em 24/10/2026.

O código já está pronto. As duas coisas ficam **desligadas** até as chaves entrarem no `.env` da API:

- **IA:** sem chave, as lojas recebem os textos prontos (sem selo "IA").
- **WhatsApp oficial:** sem os dados da Meta, a tela Empresa mostra "Em breve" e o botão WhatsApp continua abrindo o aplicativo da loja (wa.me).

Os dois são **só do Business**. O admin Worqera visitando uma loja vê tudo, para testar.

---

## 1. IA (hoje, uns 15 minutos)

1. Entre em [platform.openai.com](https://platform.openai.com) com a conta da Axisbyte/Worqera.
2. **Settings → Billing**: cartão e crédito pré-pago de US$ 10. Ligue a recarga automática com valor baixo.
3. **Settings → Limits**: teto mensal de US$ 20 e alertas em 50% e 80%.
4. **Projects**: crie `worqera-prod`.
5. Dentro do projeto, **API keys → Create secret key**:
   - Nome `api-oracle`.
   - Permissão restrita a chat completions.
   - Copie na hora (`sk-...`). Ela não aparece de novo.
6. No servidor, em `~/service/worqera-platform/api/.env`:

```bash
OPENAI_API_KEY=sk-...
WORQERA_AI_MODEL=gpt-6-luna
WORQERA_AI_MODEL_DEEP=gpt-5.6-terra
```

7. Suba a API: `cd ~/service/worqera-platform/api && sudo make prod-up`.
8. Teste numa loja **Business** (ou entrando como admin Worqera numa loja):
   - **Início:** o Resumo do dia aparece com o selo **IA**.
   - **Orçamentos:** abra um, clique em **Sugerir texto**. Aparecem 3 textos com selo **IA**.
   - **Avaliações:** **Sugerir resposta** numa nota.
   - **Pedido:** em "O que o cliente lê", o ícone de brilho escreve o texto do laudo.
   - **Financeiro:** a Leitura da semana aparece no topo.
9. Custo do mês: **Visão geral** (admin Worqera) → **IA no mês**, por loja.

Se o selo não aparecer: chave errada, sem crédito, limite do mês atingido ou o modelo não existe na conta. A API troca sozinha para `gpt-4o-mini` quando o modelo configurado é recusado. As falhas aparecem em "IA no mês" como falhas.

Variáveis:

| Variável | Para quê | Padrão |
|----------|----------|--------|
| `OPENAI_API_KEY` | Liga a IA | vazio = desligada |
| `WORQERA_AI_MODEL` | Textos curtos (orçamento, resumo, laudo, avaliação) | `gpt-6-luna` |
| `WORQERA_AI_MODEL_DEEP` | Leitura da semana | `gpt-5.6-terra` |
| `WORQERA_AI_MONTHLY_CAP` | Usos de IA incluídos no Business por mês | `1000` |

### Limite de IA por empresa

- O Business inclui **1.000 usos de IA por mês**. Cada texto que a IA escreve conta 1 uso (orçamento, resumo do dia, leitura da semana, texto do cliente, resposta de avaliação). Falha não conta.
- A loja vê o uso em **Plano** ("IA do mês: 340 de 1.000 usos").
- Com 80% usados, aparece "Restam X usos de IA este mês · Pedir mais".
- Quando acaba, a IA para e aparece: "Limite de IA do mês atingido. Até 1º de novembro, os textos saem prontos, sem IA. Precisa de mais? Fale com a Worqera" (abre o seu WhatsApp). Nada quebra: os textos prontos continuam.
- Renova sozinho no dia 1º (horário de São Paulo).
- Para liberar mais: **Oficinas → abrir a loja → +500 usos de IA este mês** (vale só no mês). Para mudar o limite fixo de uma loja: `PATCH /platform/shops/:id/ai` com `{ "monthlyCap": 3000 }`.
- Uso por loja: **Visão geral → IA no mês** (usos/limite, custo, quem bateu o limite).
- Custo de 1.000 usos no modelo rápido: cerca de R$ 1,15. O limite é para deixar a regra clara, não por custo.

---

## 2. WhatsApp oficial (cadastro na Meta: 3 a 4 semanas)

Modelo escolhido: a **Worqera é Tech Provider**. O **cartão do Eduardo** fica na conta WhatsApp (WABA) de cada loja. A Worqera repassa: o Business inclui **1.000 avisos e 100 retomadas por mês**, e o excedente é cobrado no mês seguinte (R$ 0,08 por aviso, R$ 0,50 por retomada).

### 2.1 Uma vez, na Meta (você)

1. **Meta Business** ([business.facebook.com](https://business.facebook.com)): portfólio da Axisbyte/Worqera, com **verificação da empresa** (CNPJ, documento, site `worqera.com`).
2. **Meta for Developers** ([developers.facebook.com](https://developers.facebook.com)) → **Criar app** do tipo **Business**, ligado ao portfólio.
3. Adicione o produto **WhatsApp**.
4. Cadastre-se como **Tech Provider** (WhatsApp → Get started as a Tech Provider) e conclua o onboarding.
5. **Embedded Signup → Configurations → Create**:
   - Ative o login para **WhatsApp Embedded Signup**, versão **v4**.
   - Ative a **coexistência com o WhatsApp Business app** (o lojista continua usando o celular).
   - Copie o **Configuration ID**.
6. **App settings → Basic**: copie o **App ID** e o **App Secret**. Coloque `worqera.com` e `www.worqera.com` em **App domains**.
7. **Facebook Login for Business → Settings**: em **Allowed domains for the JavaScript SDK**, coloque `https://worqera.com` e `https://www.worqera.com`.
8. **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://api.worqera.com/api/v1/webhooks/whatsapp`
   - Verify token: a frase que você colocar em `META_WEBHOOK_VERIFY_TOKEN`.
   - Assine os campos **messages** e **account_update**.
9. **App Review**: peça as permissões `whatsapp_business_messaging` e `whatsapp_business_management`. Mostre no vídeo a tela Empresa → WhatsApp, a conexão e um aviso de pedido pronto.
10. Deixe o app em modo **Live**.

### 2.2 No servidor

Em `~/service/worqera-platform/api/.env`:

```bash
META_APP_ID=...
META_APP_SECRET=...
META_WA_CONFIG_ID=...
META_WEBHOOK_VERIFY_TOKEN=uma-frase-longa-que-voce-inventa
META_GRAPH_VERSION=v23.0
WHATSAPP_TOKEN_KEY=outra-frase-longa-para-criptografar-os-tokens
```

Depois: `cd ~/service/worqera-platform/api && sudo make prod-up`.

`WHATSAPP_TOKEN_KEY` criptografa o acesso de cada loja no banco. **Não troque depois** que as lojas conectarem. Se trocar, cada loja precisa reconectar.

Confira na Meta qual é a versão atual da Graph API e ajuste `META_GRAPH_VERSION` se a v23.0 estiver perto de sair.

### 2.3 Cada loja (implantação do Business, junto com a loja)

1. A loja precisa estar no **Business**. No admin Worqera: Oficinas → aplicar Business. Se ela já era cliente, use **Preço de fundador (R$ 499 / 12 meses)**.
2. Logado na loja: **Empresa → WhatsApp oficial → Usar o WhatsApp Business do celular** (ou **Conectar outro número**).
3. No popup da Meta, a loja entra com o Facebook dela e escolhe o número. **Moeda: BRL** (não dá para trocar depois).
4. A loja te adiciona como **admin** no portfólio Meta dela (Configurações do negócio → Pessoas).
5. Você entra em **Pagamentos do WhatsApp** daquela conta e coloca o **seu cartão**.
6. No admin Worqera: **Oficinas → abrir a loja → Meu cartão já está na WABA**.
7. Na loja: marque **A loja pede autorização ao cliente no balcão** (obrigatório) e, se quiser, **Avisar sozinho quando o pedido ficar pronto**.
8. Espere a Meta aprovar os 3 modelos (minutos a algumas horas):
   - `pedido_recebido` (utilidade)
   - `pedido_pronto` (utilidade)
   - `orcamento_retomar` (marketing)

Pronto: Orçamentos ganha **Retomar pelo WhatsApp oficial** e o pedido pronto avisa sozinho.

### 2.4 O que protege o caixa (já no código)

- Envio só com Business, cartão confirmado e autorização da loja.
- Teto de **2x o pacote** por mês. No admin: **Dobrar teto do mês** libera mais.
- Excedente em aberto há **mais de 10 dias** pausa o envio. No admin: **Excedente pago** libera.
- No máximo **2 retomadas por orçamento**.
- Cliente que responde **PARAR/SAIR** não recebe mais.
- Se a loja tirar o seu acesso na Meta, o webhook pausa o envio.
- **Visão geral → WhatsApp oficial no mês**: custo estimado na Meta por loja, excedente e o que está em aberto.

Preços em `api/src/v1/lib/whatsappPricing.js`. Para mudar sem código, use as variáveis `WA_RATE_*`, `WA_PACK_*`, `WA_OVERAGE_*`.

---

## 3. O que ainda falta

| Item | Por quê | Esforço |
|------|---------|---------|
| Cobrança automática do excedente no AbacatePay | Hoje a cobrança usa um produto de valor fixo. O excedente aparece no painel e você cobra por PIX; depois de pago, clica **Excedente pago**. | 1 dia, depende do AbacatePay aceitar cobrança avulsa com valor variável |
| Conferência com o custo real da Meta (`pricing_analytics`) | Hoje o custo é estimado pela tabela. Conferir com o que a Meta cobrou exige WABA real. | 1 dia, depois da primeira loja conectada |
| Status dos modelos | A conexão grava o status de cada modelo na criação. Falta reler quando a Meta aprova ou recusa. | Meio dia |
| Fila que sobrevive a reinício | As tentativas de reenvio ficam na memória da API (3 tentativas). Se a API reiniciar no meio, a mensagem fica "na fila" e não sai. | 1 dia (fila no Mongo ou Redis) |
| Responder o cliente pelo Worqera | A resposta do cliente aparece no histórico do orçamento, mas ainda se responde pelo celular. | Fase 3 |
| Robô "já ficou pronto?" e transcrição de áudio | Fase 3 do plano. | — |
| Preço de fundador para as lojas atuais | Precisa ser marcado à mão, loja por loja, em Oficinas (o código não sabe quem era cliente antes). | Você, 1 clique por loja |
| Vídeo do App Review | A Meta pede um vídeo do fluxo para liberar as permissões. | Você |
