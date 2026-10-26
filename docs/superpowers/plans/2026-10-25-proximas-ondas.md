# Worqera — Próximas ondas (planejado em 25/10/2026)

Ideias que você mandou e ainda não estão no código, em ordem de valor por esforço. Cada onda é independente e não mexe no que já roda.

---

## Onda 1 — Conversa dentro do pedido (2 a 3 dias)

**O que é:** o "chat entre cards". Cada pedido ganha uma conversa interna da equipe, com @menção.

- Hoje o pedido já tem **Anotações** (comentários com autor e hora). A onda transforma isso em conversa:
  - `@Carla` notifica a pessoa (sino do topo + push no app).
  - Foto e áudio curto na mensagem (o storage de fotos já existe).
  - Contador de não lidas no card do kanban.
- **API:** `Order.comments[]` ganha `mentions[]`, `attachments[]`, `readBy[]`. Rota nova `POST /orders/:id/comments/:cid/read`. Sino lê menções em `alertsService.getOwnerInbox`.
- **Risco:** baixo. Não muda o fluxo do kanban.

## Onda 2 — Chat da equipe (3 a 4 dias)

**O que é:** "chat entre equipes". Um canal por setor e um geral da loja.

- Canal "Geral" + um por setor (Limpeza, Restauração…). Conta de setor vê o próprio canal e o Geral.
- Mencionar um pedido (`#0412`) vira link para o card.
- Tempo real por polling curto (10 s) no começo. Socket só se o volume pedir.
- **API:** modelos `Channel` e `Message`. **Web:** aba "Equipe" no topo (ícone de balão) com painel lateral. **App:** aba no Mais.
- **Risco:** médio (é uma tela nova). Depende da onda 1 para reaproveitar menção e anexo.

## Onda 3 — Caixa de entrada: e-mail e WhatsApp juntos (1 a 2 semanas, depende da Meta)

**O que é:** "integrar com e-mail e WhatsApp". Conversar com o cliente sem sair da Worqera.

- **WhatsApp:** com o WhatsApp oficial ligado (já construído), as respostas do cliente já chegam no webhook. Falta:
  - Tela **Conversas**: lista por cliente, pedido e orçamento ligados, responder dentro da janela de 24 h.
  - Fora da janela: só modelo aprovado (já temos 3).
- **E-mail:**
  - Envio já existe (laudo, avisos).
  - Receber: endereço por loja (`loja@in.worqera.com`) com encaminhamento → webhook (SES Inbound ou Mailgun Routes) → mensagem entra na conversa do cliente.
- Hoje o "Avisar" do pedido já entrega a mensagem pronta (WhatsApp, e-mail ou copiar). A onda 3 tira o passo de abrir outro app.
- **Risco:** médio/alto. Depende da aprovação da Meta e de um provedor de e-mail de entrada.

## Onda 4 — Agenda e "contact center" (1 semana)

**O que é:** calendário de retiradas, provas, visitas e retornos, mais a fila de contatos do dia.

- **Agenda:**
  - Prazo dos pedidos, retornos de orçamento (`followUpAt`) e compromissos livres (prova no atelier, visita técnica) num calendário semana/mês.
  - Arrastar muda a data.
- **Contact center:** a lista **Ligar hoje** vira a fila única do dia — orçamentos, prontos não retirados (prateleira) e entregues sem pagar —, com resultado de cada contato (atendeu, não atendeu, remarcar).
- "Projetos": encomendas longas (marcenaria, atelier) com etapas e datas. Usa o pedido com vários itens e prazo por item.
- **Risco:** médio. Reaproveita pedidos, orçamentos e prateleira.

---

## IA — onde mais plugar sem gastar muito

Regra que já vale: o servidor calcula os números e a IA só escreve as palavras. Cada uso conta no limite de 1.000/mês do Business. O modelo rápido custa cerca de **R$ 0,001 a R$ 0,003 por texto**.

| Onde | O que a IA faz | Custo por loja/mês (estimado) | Esforço |
|------|----------------|-------------------------------|---------|
| **Avisar cliente** (já tem texto pronto) | Reescreve a mensagem no tom da loja, com o contexto do pedido | ~R$ 0,30 (100 avisos) | 0,5 dia |
| **Cobrança** de entregues sem pagar | Texto educado de cobrança, escalonado (1º, 2º lembrete) | ~R$ 0,10 | 0,5 dia |
| **Resumo do cliente** na ficha | "Cliente desde 2024, 7 pedidos, gosta de restauração, paga na retirada" | ~R$ 0,20 | 1 dia |
| **Leitura do financeiro** | Onde o dinheiro está parado e o que cobrar primeiro (semanal) | ~R$ 0,05 | 1 dia |
| **Preço sugerido** no pedido | Média do que a loja cobrou em serviços parecidos (sem IA, só estatística; IA explica) | ~R$ 0,10 | 1 dia |
| **Foto → serviço** (fase 3) | Ler a foto do item e sugerir os serviços | R$ 2 a R$ 5 (modelo com visão) | 3 dias |
| **Transcrição de áudio** (WhatsApp) | Áudio do cliente vira texto na conversa | ~R$ 1 (60 min) | 1 dia, depois da onda 3 |

Recomendação: **Cobrança** e **Avisar com IA** primeiro (rápidos, aparecem todo dia). Depois, **Resumo do cliente**. Foto e áudio ficam para quando a onda 3 estiver no ar.

## Pitaco sobre a Visão geral

O resumo agora começa pelo **dinheiro em jogo hoje** e lista **4 prioridades com botão**. Próximos toques que fariam brilhar mais:

1. **Comparar com ontem/semana passada:** "R$ 930 em jogo, R$ 210 a mais que segunda".
2. **Marcar feito:** riscar a prioridade quando a ação acontecer (ligou, avisou, cobrou) e mostrar "3 de 4 feitas".
3. **Meta do dia:** valor a receber hoje vs. recebido até agora (usa o caixa do dia que já existe).
