# WhatsApp oficial do zero — Worqera "mãe", lojas "filhas"

Para quem nunca fez. Siga em ordem; cada etapa diz onde clicar e o que copiar.

## O modelo (é o que a Worqera já implementa)

```
Worqera (você) ─ portfólio empresarial verificado + 1 app de WhatsApp (Tech Provider)
   ├─ Casa do Tênis ─ conta de WhatsApp dela (WABA) + número dela ─ conectada ao app Worqera
   ├─ Sapataria Paulista ─ WABA dela + número dela ─ conectada ao app Worqera
   └─ … cada nova loja conecta com 1 clique em Comunicação → WhatsApp
```

- **Você** tem um único app, que manda mensagens **em nome** de cada loja.
- **Cada loja** tem a própria conta e o próprio número. A reputação é separada: se uma loja exagerar, só o número dela sofre, não o das outras nem o da Worqera.
- A loja **não precisa saber nada de Meta**: ela toca em "Conectar", entra com o Facebook dela, escolhe o número e pronto. Esse popup se chama Embedded Signup.
- **Cobrança:** o seu cartão em cada conta de loja (como combinado), repassado no plano Business.

> Dá para colocar os números de todas as lojas dentro da conta da Worqera? Tecnicamente dá, mas **não recomendo**. A Meta exige que o nome exibido combine com a empresa dona da conta, a reputação vira uma só (uma loja derruba todas) e a loja não é dona do próprio número. O modelo mãe → filhas acima é o padrão da Meta para plataformas.

## O que você precisa ter antes

| Item | Por quê | Observação |
|------|---------|------------|
| **CNPJ** | A Meta verifica a empresa com documento | Pode ser o da **Axisbyte**. Sem CNPJ? Um **MEI** aberto pelo gov.br sai na hora e serve: use o **CCMEI** (Certificado da Condição de MEI) como documento e a razão social exatamente como está nele. Confira com um contador a atividade (CNAE) permitida e o teto de faturamento do MEI. |
| **Razão social e endereço** iguais ao cartão CNPJ | A verificação compara com o documento | Use exatamente como está no cartão CNPJ |
| **Site no ar** (`worqera.com`) | A Meta olha o site | Ajuda muito ter, no rodapé, a **razão social e o CNPJ**. Me passe os dados que eu coloco no site |
| **E-mail no domínio** (ex.: `contato@worqera.com`) | Um dos jeitos de confirmar a empresa | Ou telefone fixo/celular da empresa |
| **Documento extra** | Às vezes a Meta pede | Contrato social, conta de luz/telefone ou extrato no nome da empresa |
| **Seu Facebook pessoal** | É quem administra o portfólio | Ative a verificação em duas etapas |
| **Página de privacidade** | O app precisa de uma | Já existe: `worqera.com/privacidade` |

## Etapa 1 — Portfólio empresarial (15 min)

1. Entre em **business.facebook.com** → **Criar conta**.
2. Nome: **Worqera** (ou a razão social). Seu nome e o e-mail da empresa.
3. **Configurações → Informações da empresa:** razão social **igual ao CNPJ**, endereço, telefone e site `https://worqera.com`.

## Etapa 2 — Verificação da empresa (o que mais demora)

1. **Configurações → Central de segurança → Verificação da empresa → Iniciar.**
2. País **Brasil**. Informe razão social, CNPJ, endereço e telefone.
3. Envie o **cartão CNPJ**; se pedir, o contrato social ou uma conta no nome da empresa.
4. Escolha como confirmar: **e-mail do domínio** (o mais rápido), SMS ou ligação.
5. Aguarde a análise. Costuma levar de alguns dias a algumas semanas. Enquanto isso, siga para a etapa 3.

**Dica:** se recusarem, quase sempre é nome diferente do documento ou site sem a razão social. Ajuste e reenvie.

## Etapa 3 — Criar o app (20 min, já dá para testar)

1. Entre em **developers.facebook.com** → **Meus apps → Criar app** → tipo **Empresa (Business)** → ligue ao portfólio **Worqera**.
2. No painel do app: **Adicionar produto → WhatsApp → Configurar**.
3. A Meta cria sozinha uma **conta de teste** e um **número de teste**. Em **API Setup**:
   - adicione o seu celular como destinatário (até 5 números);
   - toque em **Enviar mensagem**: chega no seu WhatsApp. Pronto, a parte técnica funciona.
4. **Configurações do app → Básico:**
   - URL da política de privacidade: `https://worqera.com/privacidade`
   - Domínios do app: `worqera.com`
   - Ícone, categoria (Negócios) e e-mail de contato.
   - Copie o **ID do app** e a **Chave secreta** (vão para o servidor).

## Etapa 4 — Virar Tech Provider (depois da verificação)

1. No app: **WhatsApp → Começar como Tech Provider** (ou "Become a Tech Provider").
2. Aceite os termos e confirme o portfólio verificado.
3. Isso libera o app a conectar contas de **outras empresas** (as suas lojas).

## Etapa 5 — Botão "Conectar" das lojas (Embedded Signup, 10 min)

1. No app: **Facebook Login for Business → Configurações → Criar configuração**.
2. Tipo: **WhatsApp Embedded Signup**. Permissões: `whatsapp_business_management` e `whatsapp_business_messaging`.
3. Salve e copie o **ID da configuração**.
4. Em **Domínios permitidos para o SDK de JavaScript**: `https://worqera.com` e `https://www.worqera.com`.

## Etapa 6 — Webhook (5 min)

É por onde a Meta avisa a Worqera de entregas, respostas e PARAR.

1. **WhatsApp → Configuração → Webhook → Editar.**
2. URL de retorno: `https://api.worqera.com/api/v1/webhooks/whatsapp`
3. Token de verificação: invente uma frase longa (é o `META_WEBHOOK_VERIFY_TOKEN`).
4. Assine os campos **messages**, **account_update** e **message_template_status_update**.

> O webhook só confirma depois que as variáveis da etapa 7 estiverem no servidor. Se falhar, faça a etapa 7 e volte aqui.

## Etapa 7 — Servidor (eu posso fazer com você)

No servidor, em `~/service/worqera-platform/api/.env`:

```
META_APP_ID=           # etapa 3
META_APP_SECRET=       # etapa 3
META_WA_CONFIG_ID=     # etapa 5
META_WEBHOOK_VERIFY_TOKEN=   # etapa 6 (a frase que você inventou)
META_GRAPH_VERSION=v23.0
WHATSAPP_TOKEN_KEY=    # outra frase longa; nunca troque depois
```

Depois: `cd ~/service/worqera-platform/api && sudo make prod-up`. Em **Comunicação → WhatsApp**, o "Em breve" vira o botão de conectar.

## Etapa 8 — Revisão da Meta (App Review)

Para conectar lojas de verdade, o app precisa de **acesso avançado** às duas permissões.

1. No app: **Revisão do app → Permissões e recursos** → peça acesso avançado a `whatsapp_business_management` e `whatsapp_business_messaging`.
2. Grave um **vídeo de 1 a 2 minutos**, com tela do computador e celular:
   - entrar na Worqera como loja → **Comunicação → WhatsApp → Conectar**;
   - o popup da Meta abre, escolher o número e concluir;
   - mover um pedido para **Pronto** → a mensagem chega no celular do cliente.
3. Explique em uma frase: "A Worqera é um sistema de pedidos para lojas de serviço. A loja conecta o próprio WhatsApp para avisar o cliente quando o pedido fica pronto."
4. Aprovado → mude o app para **Ao vivo (Live)**.

## Etapa 9 — Cada loja (15 min, junto com ela)

1. Loja no **Business** (ou preço de fundador em Oficinas).
2. Logado na loja: **Comunicação → WhatsApp → Usar o WhatsApp Business do celular** (o número continua no app, em coexistência).
3. A loja te coloca como **admin** no portfólio dela → você põe **seu cartão** em Pagamentos do WhatsApp → **Oficinas → Meu cartão já está na WABA**.
4. Marcar **autorização do cliente no balcão** e **avisar sozinho quando ficar pronto**.
5. Esperar a aprovação dos 3 modelos de mensagem (minutos a horas).
6. Primeira semana devagar (limite inicial de conversas por dia).

## E um WhatsApp da própria Worqera?

Dá para ter, no **seu** portfólio, um número da Worqera (suporte, avisos de trial e cobrança para as lojas). É a mesma conta, só que com o seu número. Hoje o sistema ainda não manda mensagens da Worqera para as lojas. Quando quiser, é uma entrega curta em cima do que já existe.

## Ordem para andar rápido

| Dia | O quê |
|-----|-------|
| Hoje | Etapas 1 e 2 (enviar a verificação), 3 (testar com o número de teste) |
| Enquanto a Meta analisa | Etapas 5 e 6, etapa 7 no servidor, gravar o vídeo com o número de teste |
| Verificação aprovada | Etapa 4 (Tech Provider) e etapa 8 (App Review) |
| App aprovado | Etapa 9 com a primeira loja piloto (sugestão: Casa do Tênis) |
