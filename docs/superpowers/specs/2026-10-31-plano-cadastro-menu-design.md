# Plano, cadastro, desconto do pedido e menu — ajustes de acabamento

Data: 31/10/2026 · Depois do primeiro pagamento no Sandbox do Asaas.

## Decisões (aprovadas)

| Tema | Decisão |
| --- | --- |
| E-mail de assinatura | Sai com a marca da **Worqera** (não da loja) e com cara de recibo |
| Tela de Plano | Mensal = um preço; anual mostrado como **valor por mês com −17%** e o total do ano; **Últimos pagamentos** vindos do Asaas |
| Cadastro | Duas opções: **Testar 7 dias grátis** (padrão) ou **Assinar agora** (cria a conta e leva direto ao pagamento). Dentro do app, faixa clara "Teste do Pro: X dias · Assinar" |
| Desconto do pedido | Campo com chave **% / R$**, começando em %. O pedido continua guardando o desconto em R$ (`pricing.discount`) |
| Menu lateral | Operação · Clientes · Gestão · Configurações, com **Catálogo**, **Equipe** e **Relatórios** agrupando páginas em abas |

## 1. E-mail da Worqera para o dono

- `mailer.sendMail({ ..., platform: true })`: remetente "Worqera" (`WORQERA_Email__FromName` ou "Worqera"), assunto sem o prefixo `[loja]`, layout da Worqera (cabeçalho com a marca, cartão branco, botão, rodapé com link do suporte). Os e-mails da loja para o cliente continuam como estão.
- Novo `services/platformEmails.js` com `subscriptionActiveEmail({ shopName, ownerName, planName, cycle, amountBrl, paidUntil, method, billingUrl })` → `{ subject, html, text }`. Assunto: "Assinatura Worqera Pro ativa". Corpo: saudação, "O pagamento foi confirmado", tabela (Plano, Valor, Ciclo, Forma de pagamento, Válido até), botão "Ver meu plano" (`PUBLIC_WEB_URL/billing`) e "Dúvidas? Responda este e-mail ou fale no WhatsApp".
- `billingService.notifyBillingActivated(shopId, sub, payment)` usa o modelo; recebe o pagamento do webhook (valor e forma).

## 2. Tela de Plano

- Anual: cada cartão mostra o equivalente mensal (`anual / 12`, com centavos quando houver) e a etiqueta **−17%**, com "R$ 2.970 por ano" embaixo. O botão diz "Assinar Pro anual · R$ 2.970/ano".
- **Últimos pagamentos**: `GET /billing/payments` (dono/admin) → até 12 cobranças da assinatura no Asaas (`GET /subscriptions/{id}/payments`), mapeadas para `{ id, dueDate, paidAt, value, status, method, invoiceUrl, receiptUrl }`. Status em português: Pago, Confirmado, Em aberto, Vencido, Estornado. Sem assinatura no Asaas: lista vazia com "Os pagamentos aparecem aqui depois da primeira cobrança".
- App: mesma lista e mesma exibição do anual.

## 3. Cadastro e entrada no app

- `/signup`: depois dos planos, a escolha "Como quer começar?" com duas opções: **Testar 7 dias grátis** (sem cartão) e **Assinar agora** (Pix, boleto ou cartão; 7 dias continuam valendo, a cobrança vence no fim deles). O botão muda de texto conforme a escolha.
- "Assinar agora" guarda a intenção (`wq-checkout-intent` = plano + ciclo) e, depois de criar a conta (e verificar o e-mail, se pedido), o app abre **/billing** com o plano já escolhido e um aviso "Falta só o pagamento".
- `TrialBanner`: textos novos ("Teste do Pro · 6 dias restantes", "Escolha a forma de pagamento para continuar depois do teste") e o botão **"Assinar"** no lugar de "Ir para Billing". Com assinatura já criada no Asaas e ainda em teste: "Assinatura feita · a primeira cobrança vence em DD/MM" (sem cara de alerta).

## 4. Desconto do pedido

- `OrderForm`: o rótulo "Desconto" ganha a chave `%`/`R$` (padrão `%`). Em %, o campo aceita 0–100 e converte para R$ sobre o subtotal (`clampDiscount`). O resumo mostra "Desconto 10% (− R$ 15,00)". Ao abrir um pedido salvo, o modo é % e o valor é calculado a partir do R$ guardado.
- App (`order_form_screen.dart`): a mesma chave ao lado do campo.

## 5. Menu lateral (site e app)

| Seção | Itens |
| --- | --- |
| Operação | Visão geral · Kanban · Pedidos · Orçamentos · Consultas |
| Clientes | Clientes e CRM · Avaliações · WhatsApp e e-mail |
| Gestão | Financeiro · **Relatórios** (Métricas · Desempenho da equipe) · Telas da loja |
| Configurações | Empresa · **Catálogo** (Produtos e estoque · Serviços · Setores · Marcas · Acessórios) · **Equipe** (Acessos · Funcionários) · Plano |

- `NavItem` ganha `matches?: string[]` (o item fica ativo em qualquer uma das rotas) e `NAV_TABS` define as abas de cada grupo. Novo componente `SectionTabs` no topo de cada página do grupo, filtrando por papel como o menu. As rotas não mudam, então links antigos continuam funcionando.
- "Atendimento" passa a se chamar **Desempenho da equipe** (título da página e aba).
- App: as mesmas quatro seções; Catálogo, Equipe e Relatórios abrem uma tela que lista as páginas do grupo.

## Fora deste trabalho
- Landing nova (plano 2 do spec de preços).
- Outros e-mails da Worqera (lembrete de teste, resumo semanal) passam a usar o mesmo layout depois; neste trabalho só o de assinatura ativa.
