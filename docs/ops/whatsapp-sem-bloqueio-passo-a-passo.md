# WhatsApp sem bloqueio — passo a passo

**Problema:** as lojas usam o WhatsApp comum (ou apps de disparo) e mandam muita mensagem parecida, inclusive a cada mudança de setor. Para o WhatsApp, isso parece spam: muitos envios, pouca resposta, gente que não tem o número salvo → denúncia → bloqueio.

**Solução em 3 fases.** A fase 1 resolve a maior parte já nesta semana. A 2 e a 3 levam ao automático.

---

## Fase 1 — Hoje, sem depender da Meta (cada loja, ~30 min)

1. **Trocar para o WhatsApp Business** (app gratuito, mesmo número).
   - No celular da loja: backup das conversas → instalar o *WhatsApp Business* → entrar com o mesmo número → restaurar.
   - Preencher o **perfil comercial**: nome da loja, foto/logo, endereço, horário, categoria, site ou Instagram.
   - Ligar a **mensagem de saudação** e a de **ausência** (fora do horário).
   - *Por quê:* número comercial com perfil completo é tratado como empresa, não como pessoa disparando mensagem.
2. **Parar de usar app de disparo / extensão no WhatsApp Web.** É o que mais derruba número.
3. **Na Worqera: Comunicação → WhatsApp → Proteção do número.**
   - **Pedido pronto:** ligado (seguro).
   - **Pedido criado:** ligado só se o cliente não deixa e-mail (moderado).
   - **Cada mudança de setor:** desligado (alto volume). Já vem desligado depois da atualização.
4. **Comunicação → E-mail:** ligado. O andamento vai por e-mail e pelo QR da etiqueta, sem gastar WhatsApp.
5. **No balcão, sempre:**
   - Pedir para o cliente **salvar o contato da loja** (ou mandar um "oi" pelo QR). Quem tem o número salvo não denuncia.
   - Avisar: "a gente te manda mensagem quando ficar pronto".
6. **Ritmo:** não mandar a mesma mensagem para dezenas de pessoas em sequência. Prateleira e cobrança: no máximo 2 lembretes por cliente, com dias de intervalo.

Resultado: de 3 ou 4 mensagens por pedido cai para 1 (o pronto), para clientes que conhecem a loja.

## Fase 2 — WhatsApp oficial na Worqera (você, uma vez)

Passo a passo completo em `docs/ops/ia-e-whatsapp-setup.md`, seção 2. Em ordem, para andar rápido:

1. **Meta Business** da Worqera (business.facebook.com) → **verificação da empresa** (CNPJ, comprovante, site). É o passo mais demorado, então comece hoje.
2. **developers.facebook.com** → criar app **Business** → adicionar o produto **WhatsApp**.
3. Com o **número de teste** que a Meta dá, já dá para validar o envio enquanto a verificação anda.
4. **Tech Provider** + **Embedded Signup** (Configuration ID) + **webhook** (`https://api.worqera.com/api/v1/webhooks/whatsapp`).
5. No servidor (`api/.env`): `META_APP_ID`, `META_APP_SECRET`, `META_WA_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `WHATSAPP_TOKEN_KEY` → `sudo make prod-up`.
6. **App Review** com vídeo: Comunicação → WhatsApp → conectar → aviso de pedido pronto chegando.

## Fase 3 — Cada loja no automático (~15 min por loja)

1. Loja no **Business** (ou preço de fundador).
2. Logado na loja: **Comunicação → WhatsApp → Usar o WhatsApp Business do celular**. O número continua no celular (coexistência).
3. Loja te adiciona como admin no portfólio Meta dela → você coloca **seu cartão** em Pagamentos do WhatsApp → **Oficinas → Meu cartão já está na WABA**.
4. Marcar **"A loja pede autorização ao cliente no balcão"** e **"Avisar sozinho quando o pedido ficar pronto"**.
5. Esperar a Meta aprovar os 3 modelos de mensagem.
6. **Primeira semana devagar:** número novo começa com 250 conversas iniciadas por dia, e a Meta aumenta conforme a qualidade fica verde.

## O que o sistema já faz para proteger

- Sugere WhatsApp só nos momentos escolhidos em **Proteção do número** (padrão: criado e pronto).
- Oficial: só envia com autorização do cliente, só modelos aprovados, no máximo 2 retomadas por orçamento, PARAR/SAIR bloqueia na hora, teto mensal por loja, pausa se a Meta pausar.
- Guia para a loja ler: **Comunicação → Sem bloqueio**.

## Se um número já foi bloqueado

1. No app, tocar em **Solicitar revisão** e explicar que é uma loja avisando os próprios clientes.
2. Enquanto isso, não usar outro número para "furar": a reputação piora.
3. Ao voltar, seguir a fase 1 desde o primeiro dia (Business, perfil completo, poucas mensagens, só para clientes).
