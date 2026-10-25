# Worqera — Release notes · 24 e 25 de outubro de 2026

Duas entregas grandes. A primeira já está no commit `3774afe` (CRM, IA e WhatsApp). A segunda está só na máquina, sem commit (65 arquivos).

| Pacote | Onde está | Precisa publicar |
|--------|-----------|------------------|
| **A. CRM de orçamentos, IA, WhatsApp e planos** | commit `3774afe` (25/10, 11:25) | API + site + app (confirme se já subiu) |
| **B. Novidades, kanban, prateleira, Google, e-mail, site, produtos e venda no pedido** | local, sem commit | API + site + app |

Não há migração de banco. Os campos novos nascem com valor padrão. Não há cron novo.

---

## Pacote A — já no commit `3774afe`

### Orçamentos (CRM)
- Item novo no menu, depois de Pedidos (dono, admin e atendimento; setor não vê).
- No kanban e no pedido: **Ações → Cliente não fechou**, com motivo (preço, vai pensar, prazo, foi em outro lugar, não precisa, outro) e dia de ligar. O pedido sai da fila e o estoque reservado volta.
- **Ligar hoje**: lista por prioridade (valor, atraso, quantos contatos).
- **Quadro**: Novo → Em contato → Retorno → Recuperado → Perdido, arrastando.
- **Todos**: lista completa.
- Ficha: WhatsApp com 3 textos prontos, ligar, adiar, anotar, histórico. **Fechou** devolve o pedido ao setor onde estava. Sem pedido, abre o Novo pedido com o cliente preenchido.
- Orçamento do balcão: **Orçamentos → Novo**.
- A ficha do cliente mostra os orçamentos dele.

**Testar:** kanban → abrir pedido → Ações → Cliente não fechou → motivo Preço, dia Hoje → abrir Orçamentos → Ligar hoje → WhatsApp → Fechou → conferir o pedido de volta no kanban.

### IA (só Business)
- Resumo do dia (Visão geral), textos de orçamento, "O que o cliente lê" (laudo e consulta), sugestão de resposta em Avaliações e leitura da semana (Financeiro e resumo semanal).
- Limite: **1.000 usos por mês** por loja. Aviso com 80%. Ao acabar, os textos prontos continuam e aparece "Fale com a Worqera". Renova no dia 1º.
- Admin Worqera: **Oficinas → +500 usos de IA este mês**; Visão geral mostra uso e custo por loja.
- Pro e Basic usam os textos prontos, sem IA.

**Testar:** numa loja Business, abrir Visão geral (selo IA no resumo) e Orçamentos → ficha → textos com selo IA. Plano mostra "IA do mês: X de 1.000".

### WhatsApp
- Todos os planos: link wa.me com texto pronto (pedido, pronto, orçamento).
- **WhatsApp oficial (Business): construído e desligado.** Sem as chaves da Meta, a tela Empresa mostra "Em breve". Inclui conexão (Embedded Signup), aviso automático de pronto, retomada de orçamento, PARAR/SAIR, pacote e teto.

### Planos
- Business **R$ 697**; preço de fundador **R$ 499 por 12 meses** (marcar à mão em Oficinas).

---

## Pacote B — local, ainda sem commit

### 1. Novidades no centro da tela, com tour
- Admin Worqera → **Notícias**: escolher "Quadro no centro" ou "Faixa no topo", montar até 6 passos (cada um pode levar a uma tela).
- **Três modelos prontos:** "Produtos e venda no pedido", "Novidades da semana" e "Orçamentos e IA".
- Aparece **uma vez por navegador / aparelho**. Conta de setor não vê.
- Até 5 minutos para aparecer em quem já está com o sistema aberto.

**Testar:** Notícias → Produtos e venda no pedido → Publicar → abrir uma loja em janela anônima → quadro no centro → Fazer o tour → os botões levam às telas.

### 2. Detalhe do pedido no kanban, em seções
- Cabeçalho: código, cliente, setor, status, prazo (vermelho se atrasado) e quantidade de itens.
- Ordem: Valor → Itens e serviços → **Ações** (inclui Ver etiqueta e Cliente não fechou) → Fila → Fotos e QR (QR recolhido) → Cliente e prazo → Observação → Histórico. Excluir fica discreto no fim.

**Testar:** kanban → abrir qualquer pedido → conferir as seções e que nada sumiu.

### 3. Na prateleira (só o dono)
- Card na Visão geral (site e app): prontos que o cliente não buscou, parados há 3+ dias, **total a receber na retirada** e botão **Lembrar** (WhatsApp com o saldo). O segundo lembrete usa outro texto. Mostra quantas vezes foi lembrado.

**Testar:** como dono, com um pedido em Pronto → Visão geral → card Na prateleira → Lembrar → abre o WhatsApp → o card mostra "lembrado hoje".

### 4. Avaliação no Google
- **Empresa → Link de avaliação no Google** (aceita só https).
- Na página do pedido, quem dá **nota 4 ou 5** vê "Avaliar no Google". Nota 3 ou menos não vê.

**Testar:** colar o link em Empresa → abrir o link público de um pedido pronto → dar nota 5 → aparece o botão.

### 5. Confirmação de e-mail no cadastro
- Cadastro novo recebe **código de 6 números** + link (48 h). Login fica bloqueado até confirmar; ao confirmar, entra direto no onboarding.
- 5 tentativas por código; reenviar a cada 60 s. Se o código venceu, o login manda outro sozinho.
- **Contas antigas não são afetadas.** Funcionários e convites também não.
- App: tela nova de código.

**Testar:** cadastrar empresa nova com um e-mail real → tentar entrar antes de confirmar (vai para a tela do código) → digitar o código → cai no onboarding.

> **Atenção:** depende do envio de e-mail em produção. Se o SMTP falhar, quem se cadastrar fica sem entrar. Faça um cadastro de teste logo após publicar.

### 6. Site institucional
- Posicionamento: **"O orquestrador da fila de pedidos"**.
- Página nova **`/recursos`** (todos os recursos, tabela Basic/Pro/Business, bloco "Chegando").
- 8 páginas `/recursos/...`: kanban, orcamentos, whatsapp, cliente, financeiro, ia, equipe, produtos (pt e en).
- Home: pilares clicáveis, seção "Novo na Worqera" (CRM, Produtos, WhatsApp, IA), planos e FAQ atualizados. Menu ganhou "Recursos"; rodapé em colunas. Páginas de ramo ganharam a faixa de recursos.
- "Chegando": WhatsApp oficial (em ativação com a Meta) e app nas lojas.

**Testar:** abrir `/`, `/recursos`, `/recursos/orcamentos`, `/recursos/produtos`, trocar PT/EN e tema escuro, abrir no celular.

### 7. Produtos e estoque para todas as lojas
- **Configuração → Produtos** (dono e admin), no site e no app. Antes só o admin Worqera via.
- Cadastro com variação, preço, saldo, mínimo e relatório.

### 8. Pedido completo: item do cliente + produto da loja (checkout)
- O bloco **Item** continua igual, só para o que o cliente trouxe.
- Bloco novo **Produtos da loja** (aparece só se a loja tiver produto): buscar e tocar, − e +, preço editável, total, saldo disponível. O + para no saldo.
- O produto da prateleira **nasce pronto no setor final** do kanban. "Passa pela produção" faz seguir os setores.
- **Só produto no pedido:** "Cliente já levou — entregar agora" (ligado por padrão). Sem prazo, nasce entregue, baixa o estoque, entra no caixa do dia, sem e-mail.
- Estoque: reserva ao salvar, baixa na entrega, volta ao cancelar ou ao "Cliente não fechou". Bloqueia acima do disponível.

**Testar:**
1. Produtos → cadastrar "Cadarço" R$ 15, saldo 10.
2. Novo pedido → só Produtos da loja → Cadarço → + (2) → criar → nasce entregue; em Produtos, saldo 8.
3. Novo pedido → tênis com Limpeza + Cadarço → criar → no kanban, o tênis no primeiro setor e o cadarço em Pronto; saldo reservado.
4. Entregar o pedido → saldo baixa.

---

## Como publicar (pacote B)

1. Commit do pacote B (e confirmar se o `3774afe` já foi publicado).
2. **API:** no servidor, `cd ~/service/worqera-platform/api && sudo make prod-up`.
3. **Site:** `cd web && make prod-up`.
4. **App:** nova versão (iOS e Android).
5. Logo depois: cadastro de teste (e-mail), uma venda de balcão, abrir `/recursos`.
6. Publicar as notícias: **Notícias → "Produtos e venda no pedido"** (ou "Novidades da semana") → Publicar.

## Configuração pendente no servidor

| O quê | Para quê | Status |
|-------|----------|--------|
| `OPENAI_API_KEY` (+ `WORQERA_AI_MODEL=gpt-6-luna`) em `api/.env` | Ligar a IA do Business | Você tem a chave; falta colocar e subir a API |
| SMTP funcionando em produção | Código de confirmação, laudo, lembretes | Conferir com um cadastro de teste |
| `PUBLIC_WEB_URL` correto | Links do e-mail, da prateleira e do WhatsApp | Conferir |
| `META_APP_ID`, `META_APP_SECRET`, `META_WA_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `META_GRAPH_VERSION`, `WHATSAPP_TOKEN_KEY` | WhatsApp oficial | Só depois da aprovação da Meta |

## O que ainda falta (fora do código desta entrega)

**Com você**
- Meta: verificação da empresa, Tech Provider, App Review (com vídeo). Passo a passo em `docs/ops/ia-e-whatsapp-setup.md`.
- App: acesso ao Xcode Team para publicar no iPhone; publicação no Google Play.
- Marcar preço de fundador nas lojas que já eram clientes (Oficinas, 1 clique por loja).
- Site: prints ou vídeo reais, depoimentos reais (os atuais são de exemplo), números atualizados, imagem de compartilhamento por página, revisão do inglês.

**Decisão sua**
- Trava por plano: hoje só o Basic tem limite (100 pedidos/mês). Produtos e Financeiro, que o site diz serem do Pro, funcionam no Basic também.

**Código (próximas entregas)**
- WhatsApp oficial: cobrança automática do excedente, conferência com o custo real da Meta, status dos modelos, fila que sobrevive a reinício, responder o cliente pelo Worqera.
- Clientes sumidos (90+ dias) entrando no Orçamentos como Retorno.
- Sentry (erros do site e da API).

## Verificado nesta entrega
- API: 29 testes; testes em banco descartável de verificação de e-mail (13), prateleira e Google (11), produtos para lojas (13) e checkout/venda de balcão (15).
- Site: typecheck. App: `flutter analyze` sem avisos.
- Não verificado: telas logadas no navegador e no celular (abrir antes de anunciar).
