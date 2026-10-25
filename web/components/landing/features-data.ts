export const FEATURE_SLUGS = [
  "kanban",
  "orcamentos",
  "whatsapp",
  "cliente",
  "financeiro",
  "ia",
  "equipe",
  "produtos",
] as const

export type FeatureSlug = (typeof FEATURE_SLUGS)[number]

export type MockTone = "brand" | "ok" | "warn" | "muted"

export type FeatureCopy = {
  slug: FeatureSlug
  name: string
  short: string
  plan: string
  kicker: string
  headline: string
  lead: string
  painsTitle: string
  pains: string[]
  stepsTitle: string
  steps: Array<{ n: string; title: string; desc: string }>
  capsTitle: string
  caps: Array<{ title: string; desc: string }>
  mock: { title: string; rows: Array<{ a: string; b: string; c: string; tone?: MockTone }> }
  soon?: string
  faq: Array<{ q: string; a: string }>
}

const pages: Record<FeatureSlug, { pt: FeatureCopy; en: FeatureCopy }> = {
  kanban: {
    pt: {
      slug: "kanban",
      name: "Kanban por setores",
      short: "A fila da empresa em colunas. Cada setor puxa o que é dele.",
      plan: "Todos os planos",
      kicker: "Operação",
      headline: "Cada pedido no setor certo. Cada setor na própria fila.",
      lead: "Os setores são os da sua casa. O pedido entra com código, prazo e o caminho planejado. A equipe move. O dono vê a operação inteira, ao vivo.",
      painsTitle: "O que acontece sem fila",
      pains: [
        "O pedido mora na cabeça de quem está na bancada. Saiu de folga, ninguém acha.",
        "O grupo da equipe virou fila, e nada se encontra nele depois das dez da manhã.",
        "O atraso só aparece quando o cliente reclama no balcão.",
      ],
      stepsTitle: "Como a fila anda",
      steps: [
        { n: "01", title: "Entra", desc: "Código curto, prazo, fotos por item e etiqueta com QR. Em menos de um minuto no balcão." },
        { n: "02", title: "Ganha o caminho", desc: "O serviço escolhido define os setores. O pedido já nasce sabendo por onde vai passar." },
        { n: "03", title: "Anda", desc: "Arrasta ou toca em Avançar. Cada item do pedido pode estar num setor diferente." },
        { n: "04", title: "Sai", desc: "No Pronto, o cliente é avisado. Na entrega, o pedido fecha e entra no caixa." },
      ],
      capsTitle: "O que vem junto",
      caps: [
        { title: "Setores do seu jeito", desc: "Nome, cor e ordem da sua operação. Kit pronto por ramo para começar em minutos." },
        { title: "Vários itens por pedido", desc: "Três pares, três etiquetas. Cada item anda sozinho e o pedido acompanha." },
        { title: "Atraso à vista", desc: "Prazo vencido em vermelho, alerta no painel e resumo semanal para o dono." },
        { title: "Busca rápida", desc: "Acha pelo código, pelo nome ou pelo telefone do cliente, de qualquer tela." },
        { title: "Laudo em PDF", desc: "Fotos, serviços e valor. Sai por e-mail para o cliente assim que o pedido entra." },
        { title: "Lixeira e retrabalho", desc: "Excluiu sem querer, recupera. Voltou para ajuste, reabre com a marca de reaberto." },
      ],
      mock: {
        title: "Kanban · hoje",
        rows: [
          { a: "#0412 · Ana · Nike Air", b: "Limpeza", c: "vence hoje", tone: "warn" },
          { a: "#0409 · Bruno · 2 pares", b: "Restauração", c: "2 dias" },
          { a: "#0405 · Carla · Vans", b: "Pronto", c: "avisada", tone: "ok" },
          { a: "#0401 · Diego · Adidas", b: "Recebido", c: "novo", tone: "brand" },
        ],
      },
      faq: [
        { q: "Dá para mudar os setores depois?", a: "Sim. Renomeia, muda a ordem e a cor quando quiser. Os pedidos que já estão na fila continuam no lugar." },
        { q: "Funciona no celular da bancada?", a: "Sim. O kanban foi feito para o celular também, com o botão de avançar em um toque." },
        { q: "Quem vê o quê?", a: "Dono e admin veem tudo. A conta de setor vê só a própria fila e encaminha para o próximo." },
      ],
    },
    en: {
      slug: "kanban",
      name: "Sector kanban",
      short: "The company queue in columns. Each sector pulls its own work.",
      plan: "All plans",
      kicker: "Operations",
      headline: "Every order in the right sector. Every sector on its own queue.",
      lead: "The sectors are your shop’s. The order comes in with a code, a due date and a planned path. The team moves it. The owner sees the whole operation, live.",
      painsTitle: "What happens without a queue",
      pains: [
        "The order lives in the head of whoever is at the bench. Day off, nobody finds it.",
        "The team group chat became the queue, and nothing can be found in it by 10 a.m.",
        "Delay only shows up when the customer complains at the counter.",
      ],
      stepsTitle: "How the queue moves",
      steps: [
        { n: "01", title: "In", desc: "Short code, due date, photos per item and a QR label. Under a minute at the counter." },
        { n: "02", title: "Gets a path", desc: "The chosen service sets the sectors. The order is born knowing where it will go." },
        { n: "03", title: "Moves", desc: "Drag it or tap Forward. Each item on the order can sit in a different sector." },
        { n: "04", title: "Out", desc: "At Ready, the customer is told. On delivery, the order closes and hits the till." },
      ],
      capsTitle: "What comes with it",
      caps: [
        { title: "Sectors your way", desc: "Name, color and order of your floor. A starter kit per trade to begin in minutes." },
        { title: "Many items per order", desc: "Three pairs, three labels. Each item moves alone and the order follows." },
        { title: "Delay in sight", desc: "Overdue in red, an alert on the dashboard and a weekly summary for the owner." },
        { title: "Quick search", desc: "Find by code, customer name or phone, from any screen." },
        { title: "PDF report", desc: "Photos, services and price. Emailed to the customer as soon as the order comes in." },
        { title: "Trash and rework", desc: "Deleted by mistake, restore it. Came back for a fix, reopen it with a reopened badge." },
      ],
      mock: {
        title: "Kanban · today",
        rows: [
          { a: "#0412 · Ana · Nike Air", b: "Cleaning", c: "due today", tone: "warn" },
          { a: "#0409 · Bruno · 2 pairs", b: "Restoration", c: "2 days" },
          { a: "#0405 · Carla · Vans", b: "Ready", c: "notified", tone: "ok" },
          { a: "#0401 · Diego · Adidas", b: "Received", c: "new", tone: "brand" },
        ],
      },
      faq: [
        { q: "Can I change the sectors later?", a: "Yes. Rename, reorder and recolor whenever you want. Orders already on the queue stay put." },
        { q: "Does it work on the bench phone?", a: "Yes. The kanban is built for phones too, with a one-tap forward button." },
        { q: "Who sees what?", a: "Owner and admin see everything. A sector account sees only its own queue and forwards to the next." },
      ],
    },
  },
  orcamentos: {
    pt: {
      slug: "orcamentos",
      name: "CRM de orçamentos",
      short: "O cliente que não fechou vira retorno, com dia para ligar e mensagem pronta.",
      plan: "Todos os planos · IA no Business",
      kicker: "Vendas",
      headline: "O orçamento que não fechou ainda é venda.",
      lead: "Quando o cliente diz “vou pensar”, a Worqera guarda o motivo, marca o dia de retornar e coloca na lista de quem ligar hoje. Fechou? O pedido volta para a fila sozinho.",
      painsTitle: "Onde o dinheiro fica na mesa",
      pains: [
        "O orçamento recusado some no caderno ou no meio do WhatsApp.",
        "Ninguém lembra de ligar de volta, e o cliente fecha com a concorrência.",
        "O dono não sabe quanto dinheiro saiu pela porta sem fechar.",
      ],
      stepsTitle: "Do “vou pensar” ao “fechou”",
      steps: [
        { n: "01", title: "Cliente não fechou", desc: "No detalhe do pedido, um toque: motivo e dia de retorno. O estoque reservado é liberado." },
        { n: "02", title: "Ligar hoje", desc: "A lista do dia por prioridade: valor, dias de atraso e quantas vezes a loja já falou." },
        { n: "03", title: "Mensagem pronta", desc: "Texto para o WhatsApp de acordo com o motivo. No Business, a IA escreve para cada cliente." },
        { n: "04", title: "Fechou", desc: "O pedido volta para o setor onde estava, com tudo que já tinha. Sem digitar de novo." },
      ],
      capsTitle: "Um CRM do tamanho do balcão",
      caps: [
        { title: "Motivos de verdade", desc: "Preço, vai pensar, prazo, foi em outro lugar, não precisa mais. Dá para ver o que mais pesa." },
        { title: "Funil em quadro", desc: "Novo, Em contato, Retorno, Recuperado e Perdido. Arrasta como no kanban." },
        { title: "Orçamento do balcão", desc: "O cliente que só perguntou o preço também entra, mesmo sem pedido aberto." },
        { title: "Histórico no cliente", desc: "Cada contato fica registrado. Na ficha do cliente aparecem todos os orçamentos." },
        { title: "Quanto voltou", desc: "Valor em aberto, recuperado no mês e quantos estão para ligar hoje." },
        { title: "Para a equipe certa", desc: "Dono, admin e atendimento usam. A conta de setor não vê orçamentos nem valores." },
      ],
      mock: {
        title: "Ligar hoje",
        rows: [
          { a: "Marina · R$ 380", b: "Preço", c: "atrasado 2 dias", tone: "warn" },
          { a: "Paulo · R$ 220", b: "Vai pensar", c: "hoje", tone: "brand" },
          { a: "Júlia · R$ 150", b: "Prazo", c: "2º contato" },
          { a: "Rafael · R$ 640", b: "Recuperado", c: "fechou", tone: "ok" },
        ],
      },
      faq: [
        { q: "Onde fica o botão?", a: "No detalhe do pedido, na seção Ações: “Cliente não fechou”. Para quem só perguntou o preço, em Orçamentos → Novo." },
        { q: "Preciso do Business?", a: "Não. O CRM, a lista Ligar hoje, o quadro e os textos prontos vêm em todos os planos. O Business acrescenta a IA escrevendo a mensagem certa para cada cliente." },
        { q: "E se o cliente voltar meses depois?", a: "Abre o orçamento e toca em Fechou. O pedido volta para a fila com os serviços, fotos e valores de antes." },
      ],
    },
    en: {
      slug: "orcamentos",
      name: "Quote CRM",
      short: "The customer who did not close becomes a follow-up, with a day to call and a ready message.",
      plan: "All plans · AI on Business",
      kicker: "Sales",
      headline: "A quote that did not close is still a sale.",
      lead: "When the customer says “let me think”, Worqera keeps the reason, sets the day to follow up and puts it on today’s call list. Closed? The order goes back on the queue by itself.",
      painsTitle: "Where money is left on the table",
      pains: [
        "The refused quote vanishes in a notebook or in the middle of WhatsApp.",
        "Nobody remembers to call back, and the customer closes with a competitor.",
        "The owner does not know how much money walked out the door.",
      ],
      stepsTitle: "From “let me think” to “closed”",
      steps: [
        { n: "01", title: "Customer did not close", desc: "On the order detail, one tap: reason and follow-up day. Reserved stock is released." },
        { n: "02", title: "Call today", desc: "Today’s list by priority: value, days overdue and how many times the shop already reached out." },
        { n: "03", title: "Ready message", desc: "WhatsApp text matching the reason. On Business, AI writes it for each customer." },
        { n: "04", title: "Closed", desc: "The order goes back to the sector it was in, with everything it had. No retyping." },
      ],
      capsTitle: "A CRM the size of the counter",
      caps: [
        { title: "Real reasons", desc: "Price, thinking, deadline, went elsewhere, no longer needed. See what weighs the most." },
        { title: "Funnel board", desc: "New, In contact, Follow-up, Recovered and Lost. Drag it like the kanban." },
        { title: "Counter quotes", desc: "The customer who only asked the price gets in too, even without an open order." },
        { title: "History on the customer", desc: "Every contact is logged. The customer record shows all their quotes." },
        { title: "What came back", desc: "Open value, recovered this month and how many to call today." },
        { title: "For the right team", desc: "Owner, admin and front desk use it. Sector accounts never see quotes or prices." },
      ],
      mock: {
        title: "Call today",
        rows: [
          { a: "Marina · R$ 380", b: "Price", c: "2 days late", tone: "warn" },
          { a: "Paulo · R$ 220", b: "Thinking", c: "today", tone: "brand" },
          { a: "Júlia · R$ 150", b: "Deadline", c: "2nd contact" },
          { a: "Rafael · R$ 640", b: "Recovered", c: "closed", tone: "ok" },
        ],
      },
      faq: [
        { q: "Where is the button?", a: "On the order detail, under Actions: “Customer did not close”. For walk-ins who only asked the price, Quotes → New." },
        { q: "Do I need Business?", a: "No. The CRM, the Call today list, the board and the ready texts come with every plan. Business adds AI writing the right message for each customer." },
        { q: "What if the customer comes back months later?", a: "Open the quote and tap Closed. The order returns to the queue with the same services, photos and prices." },
      ],
    },
  },
  whatsapp: {
    pt: {
      slug: "whatsapp",
      name: "WhatsApp",
      short: "Aviso de pronto, lembrete de retirada e retorno de orçamento, com o texto pronto.",
      plan: "Todos os planos · Oficial no Business",
      kicker: "Relacionamento",
      headline: "A mensagem certa, na hora certa, sem digitar tudo de novo.",
      lead: "Em todos os planos, a Worqera monta a mensagem e abre o WhatsApp da loja com o cliente e o texto prontos. No Business, o WhatsApp oficial envia sozinho, pelo número da sua empresa.",
      painsTitle: "O WhatsApp que cansa a equipe",
      pains: [
        "A equipe digita a mesma mensagem dez vezes por dia.",
        "Cliente avisado no grupo errado, ou nem avisado.",
        "Pedido pronto há uma semana e ninguém lembrou o cliente de buscar.",
      ],
      stepsTitle: "Como funciona",
      steps: [
        { n: "01", title: "Modelos da loja", desc: "Pedido criado, mudou de etapa, pronto e link de consulta. Com nome do cliente, código e link." },
        { n: "02", title: "Um toque", desc: "No kanban, no pedido ou no orçamento: abre o WhatsApp com tudo preenchido." },
        { n: "03", title: "Lembrete de retirada", desc: "Pedido parado na prateleira? O dono lembra o cliente com o saldo a pagar." },
        { n: "04", title: "Oficial no Business", desc: "Pronto avisado sozinho e retomada de orçamento pelo número da sua empresa." },
      ],
      capsTitle: "No oficial, além do texto pronto",
      caps: [
        { title: "Número da empresa", desc: "O oficial usa o seu WhatsApp. O app do celular continua funcionando junto." },
        { title: "Resposta no orçamento", desc: "Quando o cliente responde, a conversa entra no histórico do orçamento." },
        { title: "O cliente pode sair", desc: "Respondeu PARAR ou SAIR, a loja não envia mais para ele." },
        { title: "Pacote incluso", desc: "1.000 avisos e 100 mensagens de retomada por mês no Business." },
        { title: "Sem exagero", desc: "No máximo dois retornos por orçamento. Ninguém vira spam." },
        { title: "Custo claro", desc: "Passou do pacote, paga só o que usou, com teto no mês." },
      ],
      mock: {
        title: "WhatsApp · pedido #0412",
        rows: [
          { a: "Criado", b: "Olá, Ana! Seu pedido 0412 foi registrado.", c: "enviado" },
          { a: "Pronto", b: "Ana, seu Nike está pronto para retirada.", c: "entregue", tone: "ok" },
          { a: "Lembrete", b: "Passando para lembrar: segue esperando por você.", c: "2º", tone: "brand" },
          { a: "Cliente", b: "PARAR", c: "não envia mais", tone: "warn" },
        ],
      },
      soon: "O envio automático pelo WhatsApp oficial está em ativação com a Meta. Os modelos e o link pronto já funcionam hoje, em todos os planos.",
      faq: [
        { q: "Preciso trocar de número?", a: "Não. No oficial, o número da empresa continua no app do celular e também envia pela Worqera." },
        { q: "Quanto custa?", a: "No Basic e no Pro, o link pronto não tem custo. No Business, o pacote está incluso; o que passar é cobrado por mensagem, com teto mensal." },
        { q: "Dá para desligar?", a: "Sim. Os avisos ligam e desligam em Empresa, e cada modelo pode ser editado." },
      ],
    },
    en: {
      slug: "whatsapp",
      name: "WhatsApp",
      short: "Ready notices, pickup reminders and quote follow-ups, with the text ready.",
      plan: "All plans · Official on Business",
      kicker: "Customer relations",
      headline: "The right message, at the right time, without retyping it.",
      lead: "On every plan, Worqera builds the message and opens the shop’s WhatsApp with the customer and the text ready. On Business, the official WhatsApp sends by itself, from your company number.",
      painsTitle: "The WhatsApp that wears the team out",
      pains: [
        "The team types the same message ten times a day.",
        "The customer was told in the wrong chat, or not at all.",
        "The order has been ready for a week and nobody reminded the customer.",
      ],
      stepsTitle: "How it works",
      steps: [
        { n: "01", title: "Shop templates", desc: "Order created, stage changed, ready and tracking link. With the customer name, code and link." },
        { n: "02", title: "One tap", desc: "From the kanban, the order or the quote: WhatsApp opens with everything filled in." },
        { n: "03", title: "Pickup reminder", desc: "Order sitting on the shelf? The owner reminds the customer with the balance due." },
        { n: "04", title: "Official on Business", desc: "Ready notices and quote follow-ups sent by themselves, from your number." },
      ],
      capsTitle: "On official, beyond the ready text",
      caps: [
        { title: "Your company number", desc: "Official uses your WhatsApp. The phone app keeps working alongside." },
        { title: "Replies on the quote", desc: "When the customer answers, the conversation lands on the quote history." },
        { title: "The customer can opt out", desc: "Replied STOP, the shop does not message them again." },
        { title: "Pack included", desc: "1,000 notices and 100 follow-up messages a month on Business." },
        { title: "No overdoing it", desc: "At most two follow-ups per quote. Nobody becomes spam." },
        { title: "Clear cost", desc: "Past the pack, you pay only what you used, with a monthly cap." },
      ],
      mock: {
        title: "WhatsApp · order #0412",
        rows: [
          { a: "Created", b: "Hi Ana! Your order 0412 is registered.", c: "sent" },
          { a: "Ready", b: "Ana, your Nike is ready for pickup.", c: "delivered", tone: "ok" },
          { a: "Reminder", b: "Just a reminder: it is still waiting for you.", c: "2nd", tone: "brand" },
          { a: "Customer", b: "STOP", c: "no more messages", tone: "warn" },
        ],
      },
      soon: "Automatic sending through official WhatsApp is being activated with Meta. Templates and the ready link already work today, on every plan.",
      faq: [
        { q: "Do I need a new number?", a: "No. On official, the company number stays on the phone app and also sends through Worqera." },
        { q: "How much does it cost?", a: "On Basic and Pro, the ready link is free. On Business, the pack is included; anything beyond is billed per message, with a monthly cap." },
        { q: "Can I turn it off?", a: "Yes. Notices switch on and off under Company, and each template can be edited." },
      ],
    },
  },
  cliente: {
    pt: {
      slug: "cliente",
      name: "Consulta e avaliações",
      short: "QR na etiqueta, status sem ligação e avaliação depois do pronto.",
      plan: "Todos os planos",
      kicker: "Experiência do cliente",
      headline: "O cliente acompanha sozinho. E conta como foi.",
      lead: "Cada pedido tem um link e um QR. O cliente vê a etapa, a previsão e o que vai ser feito, com a marca da sua empresa. No pronto, avalia em dez segundos.",
      painsTitle: "O que o cliente sente hoje",
      pains: [
        "Liga o dia todo para saber se ficou pronto.",
        "Não entende o que foi feito no conserto, e acha caro.",
        "Quem gostou não avalia no Google. Quem não gostou some sem falar.",
      ],
      stepsTitle: "Do balcão à avaliação",
      steps: [
        { n: "01", title: "Etiqueta", desc: "Código grande e QR. Cada item do pedido pode ter a sua." },
        { n: "02", title: "Consulta", desc: "Página com a etapa, a previsão e “o que vamos fazer”. Sem app e sem cadastro." },
        { n: "03", title: "E-mail", desc: "Na entrada, com o PDF do laudo. Na mudança de etapa e no pronto, um aviso curto." },
        { n: "04", title: "Avaliação", desc: "Nota de 1 a 5 e o que pesou. Quem dá 4 ou 5 recebe o convite para avaliar no Google." },
      ],
      capsTitle: "Cuidados que fazem diferença",
      caps: [
        { title: "Sua marca", desc: "Logo e cores da empresa na consulta, no e-mail, no PDF e na etiqueta." },
        { title: "Setor interno discreto", desc: "Um setor pode aparecer para o cliente só como “Em andamento”." },
        { title: "Link seguro", desc: "O endereço não mostra o nome da empresa nem o código do pedido." },
        { title: "Avaliações no painel", desc: "Notas, comentários, filtro por nota e exportação em CSV." },
        { title: "Google de graça", desc: "Quem gostou vai direto para o perfil da empresa no Google." },
        { title: "TV da sala de espera", desc: "Códigos grandes e quem já está pronto, em carrossel." },
      ],
      mock: {
        title: "Consulta · #0412",
        rows: [
          { a: "Etapa", b: "Restauração", c: "agora", tone: "brand" },
          { a: "Previsão", b: "sexta, 31 de outubro", c: "" },
          { a: "O que vamos fazer", b: "Limpeza completa e pintura da entressola", c: "" },
          { a: "Avaliação", b: "5 · Perfeito", c: "Google", tone: "ok" },
        ],
      },
      faq: [
        { q: "O cliente precisa baixar algo?", a: "Não. Abre no navegador pelo QR da etiqueta ou pelo link do e-mail e do WhatsApp." },
        { q: "Avaliação ruim aparece para quem?", a: "Só para a empresa, no painel de avaliações. No Business, a IA sugere uma resposta." },
        { q: "Como pego o link do Google?", a: "No Perfil da Empresa no Google, toque em “Pedir avaliações”, copie o link e cole em Empresa." },
      ],
    },
    en: {
      slug: "cliente",
      name: "Tracking and reviews",
      short: "QR on the label, status without a call and a review after it is ready.",
      plan: "All plans",
      kicker: "Customer experience",
      headline: "The customer tracks it alone. And tells you how it went.",
      lead: "Every order has a link and a QR. The customer sees the stage, the due date and what will be done, with your brand. When it is ready, they rate it in ten seconds.",
      painsTitle: "What the customer feels today",
      pains: [
        "Calls all day to ask if it is ready.",
        "Does not understand what was done, and thinks it is expensive.",
        "Happy customers never review on Google. Unhappy ones disappear.",
      ],
      stepsTitle: "From the counter to the review",
      steps: [
        { n: "01", title: "Label", desc: "Big code and QR. Each item on the order can have its own." },
        { n: "02", title: "Tracking", desc: "A page with the stage, the due date and “what we will do”. No app, no sign-up." },
        { n: "03", title: "Email", desc: "On intake, with the PDF report. On stage changes and when ready, a short notice." },
        { n: "04", title: "Review", desc: "A 1–5 score and what mattered. A 4 or 5 gets an invite to review on Google." },
      ],
      capsTitle: "Details that matter",
      caps: [
        { title: "Your brand", desc: "Company logo and colors on tracking, email, PDF and label." },
        { title: "Quiet internal sectors", desc: "A sector can show to the customer as just “In progress”." },
        { title: "Safe link", desc: "The address shows neither the company name nor the order code." },
        { title: "Reviews on the dashboard", desc: "Scores, comments, filter by score and CSV export." },
        { title: "Free Google reviews", desc: "Happy customers go straight to your Google business profile." },
        { title: "Waiting-room TV", desc: "Big codes and who is ready, on a carousel." },
      ],
      mock: {
        title: "Tracking · #0412",
        rows: [
          { a: "Stage", b: "Restoration", c: "now", tone: "brand" },
          { a: "Due", b: "Friday, October 31", c: "" },
          { a: "What we will do", b: "Deep clean and midsole repaint", c: "" },
          { a: "Review", b: "5 · Perfect", c: "Google", tone: "ok" },
        ],
      },
      faq: [
        { q: "Does the customer need to download anything?", a: "No. It opens in the browser from the label QR or the link in the email and WhatsApp." },
        { q: "Who sees a bad review?", a: "Only the company, on the reviews dashboard. On Business, AI suggests a reply." },
        { q: "Where do I get the Google link?", a: "In your Google Business Profile, tap “Ask for reviews”, copy the link and paste it under Company." },
      ],
    },
  },
  financeiro: {
    pt: {
      slug: "financeiro",
      name: "Financeiro e análise",
      short: "Caixa do dia, a receber, prateleira e métricas que o dono entende.",
      plan: "Pro e Business",
      kicker: "Gestão",
      headline: "O dinheiro anda junto com a fila.",
      lead: "Cada pedido traz valor, sinal e saldo. A Worqera fecha o caixa do dia, mostra o que está para receber e quanto dinheiro está parado na prateleira esperando o cliente.",
      painsTitle: "O que a planilha não mostra",
      pains: [
        "O caixa fecha no caderno, e no fim do mês nunca bate.",
        "Pedido pronto e não retirado é dinheiro esquecido no balcão.",
        "O relatório do mês não diz o que fazer amanhã de manhã.",
      ],
      stepsTitle: "Do pedido ao fechamento",
      steps: [
        { n: "01", title: "Valor no pedido", desc: "Serviços, garantia, desconto, sinal e saldo. Calculado na hora." },
        { n: "02", title: "Caixa do dia", desc: "O que entregou, os sinais recebidos e o que está pronto para receber." },
        { n: "03", title: "Prateleira", desc: "Só o dono vê: prontos parados há 3 dias ou mais, quanto falta receber e o botão de lembrar." },
        { n: "04", title: "A semana", desc: "Resumo por e-mail com pedidos, faturamento, atrasos e avaliações. No Business, com a leitura da IA." },
      ],
      capsTitle: "Para decidir, não só para conferir",
      caps: [
        { title: "Métricas", desc: "Faturamento, ticket, pedidos e serviços por período, em uma tela." },
        { title: "TV financeiro", desc: "Líquido, bruto, meses e a meta do ano na parede do escritório." },
        { title: "Exportação", desc: "Pedidos entregues e avaliações em CSV para o contador." },
        { title: "Valor só para quem pode", desc: "Financeiro e métricas para dono e admin. Setor não vê dinheiro." },
        { title: "Orçamentos em aberto", desc: "Quanto está em negociação e quanto voltou no mês." },
        { title: "Alertas", desc: "Atraso e pedido parado aparecem antes de virar reclamação." },
      ],
      mock: {
        title: "Caixa · hoje",
        rows: [
          { a: "Entregue hoje", b: "R$ 1.860", c: "9 pedidos", tone: "ok" },
          { a: "Sinais", b: "R$ 420", c: "6 pedidos" },
          { a: "Na prateleira", b: "R$ 730", c: "4 parados", tone: "warn" },
          { a: "Em aberto", b: "R$ 5.210", c: "31 pedidos", tone: "brand" },
        ],
      },
      faq: [
        { q: "O Basic tem financeiro?", a: "Não. O Basic é a fila. Caixa, métricas e TV financeiro vêm no Pro. A prateleira aparece para o dono em todos os planos." },
        { q: "O funcionário vê o faturamento?", a: "Não. O atendimento vê o valor do pedido para cobrar no balcão. Financeiro e métricas ficam com dono e admin." },
        { q: "Substitui o sistema fiscal?", a: "Não emite nota. É o controle da operação: o que entrou, o que saiu e o que falta receber." },
      ],
    },
    en: {
      slug: "financeiro",
      name: "Finance and insight",
      short: "Today’s till, receivables, the shelf and metrics the owner understands.",
      plan: "Pro and Business",
      kicker: "Management",
      headline: "Money moves with the queue.",
      lead: "Every order carries price, deposit and balance. Worqera closes the day’s till, shows what is receivable and how much money sits on the shelf waiting for the customer.",
      painsTitle: "What the spreadsheet does not show",
      pains: [
        "The till closes in a notebook, and the month never adds up.",
        "A ready order nobody picked up is money forgotten at the counter.",
        "The monthly report does not say what to do tomorrow morning.",
      ],
      stepsTitle: "From order to closing",
      steps: [
        { n: "01", title: "Price on the order", desc: "Services, warranty, discount, deposit and balance. Calculated on the spot." },
        { n: "02", title: "Today’s till", desc: "What was delivered, deposits received and what is ready to collect." },
        { n: "03", title: "Shelf", desc: "Owner only: orders ready for 3+ days, what is still due and a remind button." },
        { n: "04", title: "The week", desc: "Email summary with orders, revenue, delays and reviews. On Business, with the AI read." },
      ],
      capsTitle: "To decide, not just to check",
      caps: [
        { title: "Metrics", desc: "Revenue, ticket, orders and services by period, on one screen." },
        { title: "Finance TV", desc: "Net, gross, months and the yearly goal on the office wall." },
        { title: "Export", desc: "Delivered orders and reviews in CSV for the accountant." },
        { title: "Prices for the right people", desc: "Finance and metrics for owner and admin. Sectors never see money." },
        { title: "Open quotes", desc: "What is being negotiated and what came back this month." },
        { title: "Alerts", desc: "Delays and stuck orders show up before they become complaints." },
      ],
      mock: {
        title: "Till · today",
        rows: [
          { a: "Delivered today", b: "R$ 1,860", c: "9 orders", tone: "ok" },
          { a: "Deposits", b: "R$ 420", c: "6 orders" },
          { a: "On the shelf", b: "R$ 730", c: "4 waiting", tone: "warn" },
          { a: "Open", b: "R$ 5,210", c: "31 orders", tone: "brand" },
        ],
      },
      faq: [
        { q: "Does Basic include finance?", a: "No. Basic is the queue. Till, metrics and the finance TV come with Pro. The shelf shows for the owner on every plan." },
        { q: "Do employees see revenue?", a: "No. Front desk sees the order price to charge at the counter. Finance and metrics stay with owner and admin." },
        { q: "Does it replace tax software?", a: "It does not issue invoices. It controls the operation: what came in, what left and what is still due." },
      ],
    },
  },
  ia: {
    pt: {
      slug: "ia",
      name: "IA na operação",
      short: "Escreve a mensagem certa, resume o dia e lê a semana. Você decide.",
      plan: "Business",
      kicker: "Inteligência",
      headline: "A IA que trabalha no balcão, não no slide.",
      lead: "A IA da Worqera usa os dados da sua fila para escrever e resumir. Nada sai sozinho: ela sugere, a equipe revisa e envia.",
      painsTitle: "O tempo que vai embora",
      pains: [
        "O dono abre o sistema e não sabe por onde começar o dia.",
        "Escrever para quem não fechou dá trabalho, e sai tudo igual.",
        "Avaliação ruim fica sem resposta porque ninguém sabe o que dizer.",
      ],
      stepsTitle: "Onde a IA entra",
      steps: [
        { n: "01", title: "Resumo do dia", desc: "Ao abrir, uma frase com o que importa: prontos para avisar, quem ligar e o que atrasou." },
        { n: "02", title: "Orçamentos", desc: "Mensagens para cada cliente, de acordo com o motivo, o valor e o histórico de contato." },
        { n: "03", title: "Laudo para o cliente", desc: "O pedido técnico vira texto simples: “o que vamos fazer”, no PDF e na consulta." },
        { n: "04", title: "Leitura da semana", desc: "O que melhorou, o que travou e uma sugestão prática, no resumo semanal." },
      ],
      capsTitle: "IA com regra clara",
      caps: [
        { title: "Resposta para avaliações", desc: "Uma resposta educada para cada nota, pronta para ajustar." },
        { title: "Sempre editável", desc: "Todo texto da IA pode ser mudado antes de sair." },
        { title: "Limite à vista", desc: "1.000 usos por mês. O sistema avisa quando estiver perto do fim." },
        { title: "Não para a operação", desc: "Acabou o limite, os textos prontos da Worqera continuam saindo." },
        { title: "Mais quando precisar", desc: "Precisa de mais no mês? A Worqera libera um pacote extra." },
        { title: "Só os seus dados", desc: "A IA lê apenas a sua empresa, na hora em que você pede." },
      ],
      mock: {
        title: "Resumo do dia · IA",
        rows: [
          { a: "Prontos para avisar", b: "4", c: "hoje", tone: "ok" },
          { a: "Ligar hoje", b: "3", c: "R$ 1.240", tone: "brand" },
          { a: "Atrasados", b: "2", c: "Restauração", tone: "warn" },
          { a: "Sugestão", b: "Ligue primeiro para a Marina", c: "IA", tone: "brand" },
        ],
      },
      faq: [
        { q: "Qual IA vocês usam?", a: "Um modelo de linguagem da OpenAI, chamado pela Worqera. Você não precisa de conta nem de chave." },
        { q: "O que conta como uso?", a: "Cada texto que a IA escreve. Se a IA falhar, não conta." },
        { q: "O Pro tem IA?", a: "Não. O Pro usa os textos prontos da Worqera, que já cobrem o dia a dia. A IA é do Business." },
      ],
    },
    en: {
      slug: "ia",
      name: "AI in operations",
      short: "Writes the right message, sums up the day and reads the week. You decide.",
      plan: "Business",
      kicker: "Intelligence",
      headline: "AI that works at the counter, not on a slide.",
      lead: "Worqera’s AI uses your queue data to write and summarize. Nothing goes out on its own: it suggests, the team reviews and sends.",
      painsTitle: "Where the time goes",
      pains: [
        "The owner opens the system and does not know where to start the day.",
        "Writing to customers who did not close is work, and it all sounds the same.",
        "Bad reviews go unanswered because nobody knows what to say.",
      ],
      stepsTitle: "Where AI comes in",
      steps: [
        { n: "01", title: "Daily brief", desc: "On open, one sentence with what matters: ready to notify, who to call and what is late." },
        { n: "02", title: "Quotes", desc: "Messages for each customer, matching the reason, the value and the contact history." },
        { n: "03", title: "Customer report", desc: "The technical order becomes plain text: “what we will do”, in the PDF and tracking." },
        { n: "04", title: "Weekly read", desc: "What improved, what got stuck and one practical suggestion, in the weekly summary." },
      ],
      capsTitle: "AI with clear rules",
      caps: [
        { title: "Review replies", desc: "A polite reply for each score, ready to tweak." },
        { title: "Always editable", desc: "Every AI text can be changed before it goes out." },
        { title: "Visible limit", desc: "1,000 uses a month. The system warns when you are close." },
        { title: "Never stops the shop", desc: "Past the limit, Worqera’s ready texts keep coming." },
        { title: "More when you need it", desc: "Need more this month? Worqera adds an extra pack." },
        { title: "Only your data", desc: "AI reads only your company, at the moment you ask." },
      ],
      mock: {
        title: "Daily brief · AI",
        rows: [
          { a: "Ready to notify", b: "4", c: "today", tone: "ok" },
          { a: "Call today", b: "3", c: "R$ 1,240", tone: "brand" },
          { a: "Late", b: "2", c: "Restoration", tone: "warn" },
          { a: "Suggestion", b: "Call Marina first", c: "AI", tone: "brand" },
        ],
      },
      faq: [
        { q: "Which AI do you use?", a: "An OpenAI language model, called by Worqera. You need no account and no key." },
        { q: "What counts as a use?", a: "Each text the AI writes. If the AI fails, it does not count." },
        { q: "Does Pro have AI?", a: "No. Pro uses Worqera’s ready texts, which cover the day-to-day. AI is on Business." },
      ],
    },
  },
  equipe: {
    pt: {
      slug: "equipe",
      name: "Equipe, TVs e controle",
      short: "Conta por setor, papéis, TVs na parede e uma conta segura.",
      plan: "Todos os planos",
      kicker: "Equipe",
      headline: "Cada um vê o que precisa. O dono vê tudo.",
      lead: "Um preço por empresa, sem cobrar por pessoa. O dono convida a equipe, define quem é admin, atendimento ou setor, e cada um entra com o próprio acesso.",
      painsTitle: "O que costuma dar errado",
      pains: [
        "Uma senha só, colada no monitor, para a casa inteira.",
        "Funcionário vê faturamento que não devia.",
        "O pedido mudou de lugar e ninguém sabe quem mexeu.",
      ],
      stepsTitle: "Como a equipe entra",
      steps: [
        { n: "01", title: "Convite", desc: "Por link. A pessoa cria a própria senha e já cai na fila certa." },
        { n: "02", title: "Papel", desc: "Dono, admin, atendimento ou setor. Cada papel vê só o que é dele." },
        { n: "03", title: "Conta de setor", desc: "Vê a própria fila e encaminha para o próximo setor. Sem valores, sem cadastro." },
        { n: "04", title: "Histórico", desc: "Cada movimento guarda quem moveu, quando e de onde para onde." },
      ],
      capsTitle: "O chão da oficina, organizado",
      caps: [
        { title: "TV da oficina", desc: "A fila por setor na parede, com o que está atrasado em destaque." },
        { title: "TV da sala de espera", desc: "Os códigos de quem está pronto, grandes, em carrossel." },
        { title: "Conta segura", desc: "Confirmação de e-mail no cadastro. Trocou a senha, os outros acessos caem." },
        { title: "Navegador e celular", desc: "A mesma conta no computador do balcão e no celular da bancada." },
        { title: "Começa em minutos", desc: "Kit por ramo cria setores e serviços. Depois é só ajustar." },
        { title: "Novidades na tela", desc: "Quando sai algo novo, a equipe vê um tour rápido do que mudou." },
      ],
      mock: {
        title: "Equipe",
        rows: [
          { a: "Junior", b: "Dono", c: "tudo", tone: "brand" },
          { a: "Carla", b: "Atendimento", c: "balcão e pedidos" },
          { a: "Limpeza", b: "Setor", c: "só a própria fila", tone: "muted" },
          { a: "Restauração", b: "Setor", c: "só a própria fila", tone: "muted" },
        ],
      },
      faq: [
        { q: "Cobra por usuário?", a: "Não. O preço é por empresa. A equipe cresce e o plano continua o mesmo." },
        { q: "Dá para tirar o acesso de alguém?", a: "Sim. O dono desativa a pessoa e o acesso para." },
        { q: "Preciso de TV especial?", a: "Não. Qualquer TV com navegador ou um computador ligado nela." },
      ],
    },
    en: {
      slug: "equipe",
      name: "Team, TVs and control",
      short: "Sector accounts, roles, wall TVs and a secure account.",
      plan: "All plans",
      kicker: "Team",
      headline: "Everyone sees what they need. The owner sees everything.",
      lead: "One price per company, no per-seat billing. The owner invites the team, sets who is admin, front desk or sector, and each person signs in with their own access.",
      painsTitle: "What usually goes wrong",
      pains: [
        "One password, taped to the monitor, for the whole shop.",
        "Employees see revenue they should not.",
        "The order moved and nobody knows who touched it.",
      ],
      stepsTitle: "How the team gets in",
      steps: [
        { n: "01", title: "Invite", desc: "By link. The person sets their own password and lands on the right queue." },
        { n: "02", title: "Role", desc: "Owner, admin, front desk or sector. Each role sees only its part." },
        { n: "03", title: "Sector account", desc: "Sees its own queue and forwards to the next sector. No prices, no setup." },
        { n: "04", title: "History", desc: "Every move records who, when and from where to where." },
      ],
      capsTitle: "The shop floor, organized",
      caps: [
        { title: "Shop TV", desc: "The queue by sector on the wall, with late jobs highlighted." },
        { title: "Waiting-room TV", desc: "Big codes of who is ready, on a carousel." },
        { title: "Secure account", desc: "Email confirmation at sign-up. Change the password, other sessions drop." },
        { title: "Browser and phone", desc: "The same account on the counter computer and the bench phone." },
        { title: "Starts in minutes", desc: "A trade kit creates sectors and services. Then you adjust." },
        { title: "What’s new, on screen", desc: "When something ships, the team sees a quick tour of what changed." },
      ],
      mock: {
        title: "Team",
        rows: [
          { a: "Junior", b: "Owner", c: "everything", tone: "brand" },
          { a: "Carla", b: "Front desk", c: "counter and orders" },
          { a: "Cleaning", b: "Sector", c: "own queue only", tone: "muted" },
          { a: "Restoration", b: "Sector", c: "own queue only", tone: "muted" },
        ],
      },
      faq: [
        { q: "Do you charge per user?", a: "No. Pricing is per company. The team grows and the plan stays the same." },
        { q: "Can I remove someone’s access?", a: "Yes. The owner deactivates the person and access stops." },
        { q: "Do I need a special TV?", a: "No. Any TV with a browser, or a computer plugged into it." },
      ],
    },
  },
  produtos: {
    pt: {
      slug: "produtos",
      name: "Produtos e estoque",
      short: "Cadastre o que a loja vende e venda no mesmo pedido do serviço. O estoque se mexe sozinho.",
      plan: "Pro e Business",
      kicker: "Vendas e estoque",
      headline: "O que a loja vende entra no mesmo pedido.",
      lead: "Palmilha, cadarço, produto de limpeza, peça de reposição. A loja cadastra o produto com variação, preço e saldo. No pedido, junto do item do cliente, entra em Produtos da loja: reserva ao salvar, baixa na entrega e volta se cancelar. Venda de balcão sai entregue na hora.",
      painsTitle: "O estoque no olho",
      pains: [
        "O produto acaba bem quando o cliente pede.",
        "O que foi vendido no balcão não aparece em lugar nenhum.",
        "Ninguém sabe o que entrou, o que saiu e por quê.",
      ],
      stepsTitle: "Como funciona",
      steps: [
        { n: "01", title: "Cadastra", desc: "Em Produtos: nome, preço, saldo e, se tiver, as variações." },
        { n: "02", title: "Vende no pedido", desc: "Em Produtos da loja, busque e toque. Quantidade com + e −, preço do cadastro. O item do cliente segue igual." },
        { n: "03", title: "Já nasce pronto", desc: "O produto da prateleira entra direto no setor final do kanban. Nada de passar pela produção." },
        { n: "04", title: "Balcão ou retirada", desc: "Cliente já levou? Sai entregue e baixa na hora. Vai buscar depois? Fica reservado até a entrega." },
      ],
      capsTitle: "Sem misturar as coisas",
      caps: [
        { title: "Variações", desc: "Tamanho, cor ou modelo, cada um com o próprio saldo e preço." },
        { title: "Estoque mínimo", desc: "Cada produto tem o seu mínimo. O painel mostra o que está abaixo." },
        { title: "Não vende o que não tem", desc: "O pedido avisa quando a quantidade passa do disponível." },
        { title: "Do cliente é do cliente", desc: "O que o cliente trouxe continua como sempre. Só os produtos da loja mexem no estoque." },
        { title: "Serviço e produto juntos", desc: "Limpeza do tênis e palmilha nova no mesmo pedido, no mesmo total." },
        { title: "Histórico completo", desc: "Entrada, ajuste, reserva e saída, com motivo e pedido." },
      ],
      mock: {
        title: "Estoque",
        rows: [
          { a: "Palmilha esportiva · M", b: "18", c: "2 reservados" },
          { a: "Cadarço redondo · preto", b: "42", c: "" },
          { a: "Limpador 200 ml", b: "3", c: "mínimo 5", tone: "warn" },
          { a: "Kit restauração", b: "9", c: "", tone: "ok" },
        ],
      },
      faq: [
        { q: "Preciso usar estoque?", a: "Não. Sem produto cadastrado, o pedido fica igual ao de sempre e o bloco Produtos da loja nem aparece." },
        { q: "E se o produto precisa ser feito?", a: "Na linha do produto, marque Passa pela produção. Aí ele segue os setores como qualquer item." },
        { q: "Quem pode cadastrar?", a: "O dono e o admin, em Configuração → Produtos. O atendimento vende no pedido; a conta de setor não vê." },
        { q: "Tenho muitos produtos. Vocês ajudam?", a: "Sim. No Business, a Worqera importa o catálogo com você na implantação." },
      ],
    },
    en: {
      slug: "produtos",
      name: "Products and stock",
      short: "Register what the shop sells and sell it on the same service order. Stock moves by itself.",
      plan: "Pro and Business",
      kicker: "Sales and stock",
      headline: "What the shop sells goes on the same order.",
      lead: "Insoles, laces, cleaning products, spare parts. The shop registers each product with variants, price and balance. On the order, next to the customer item, it goes under Shop products: reserved on save, out on delivery, back if cancelled. Counter sales close delivered on the spot.",
      painsTitle: "Stock by eye",
      pains: [
        "The product runs out right when the customer asks.",
        "What was sold at the counter shows up nowhere.",
        "Nobody knows what came in, what left and why.",
      ],
      stepsTitle: "How it works",
      steps: [
        { n: "01", title: "Register", desc: "Under Products: name, price, balance and, if any, variants." },
        { n: "02", title: "Sell on the order", desc: "Under Shop products, search and tap. Quantity with + and −, price from the catalog. The customer item stays the same." },
        { n: "03", title: "Born ready", desc: "A shelf product lands straight in the final kanban sector. No production steps." },
        { n: "04", title: "Counter or pickup", desc: "Customer took it? It closes delivered and stock drops. Picking up later? It stays reserved until delivery." },
      ],
      capsTitle: "Nothing gets mixed up",
      caps: [
        { title: "Variants", desc: "Size, color or model, each with its own balance and price." },
        { title: "Minimum stock", desc: "Each product has a minimum. The dashboard shows what is below it." },
        { title: "No selling what you lack", desc: "The order warns when quantity goes past what is available." },
        { title: "Customer items stay theirs", desc: "What the customer brought works as always. Only shop products touch stock." },
        { title: "Service and product together", desc: "Sneaker cleaning and a new insole on the same order, same total." },
        { title: "Full history", desc: "In, adjustment, reservation and out, with reason and order." },
      ],
      mock: {
        title: "Stock",
        rows: [
          { a: "Sport insole · M", b: "18", c: "2 reserved" },
          { a: "Round lace · black", b: "42", c: "" },
          { a: "Cleaner 200 ml", b: "3", c: "minimum 5", tone: "warn" },
          { a: "Restoration kit", b: "9", c: "", tone: "ok" },
        ],
      },
      faq: [
        { q: "Do I have to use stock?", a: "No. With no products registered, the order stays the same and the Shop products block does not even show." },
        { q: "What if the product has to be made?", a: "On the product line, tick Goes through production. Then it follows the sectors like any item." },
        { q: "Who can register products?", a: "Owner and admin, under Settings → Products. Front desk sells on the order; sector accounts never see it." },
        { q: "I have many products. Can you help?", a: "Yes. On Business, Worqera imports the catalog with you during onboarding." },
      ],
    },
  },
}

export function isFeatureSlug(value: string): value is FeatureSlug {
  return (FEATURE_SLUGS as readonly string[]).includes(value)
}

export function getFeature(slug: FeatureSlug, locale: "pt" | "en" = "pt"): FeatureCopy {
  return pages[slug][locale]
}

export const FEATURE_GROUPS: Array<{ id: string; pt: string; en: string; slugs: FeatureSlug[] }> = [
  { id: "operacao", pt: "Operação", en: "Operations", slugs: ["kanban", "equipe"] },
  { id: "cliente", pt: "Cliente e vendas", en: "Customers and sales", slugs: ["cliente", "orcamentos", "whatsapp"] },
  { id: "gestao", pt: "Gestão e inteligência", en: "Management and intelligence", slugs: ["financeiro", "ia", "produtos"] },
]

type Mark = "yes" | "no" | string

export const PLAN_ROWS: Array<{ pt: string; en: string; href?: FeatureSlug; basic: Mark; pro: Mark; business: Mark }> = [
  { pt: "Kanban por setores", en: "Sector kanban", href: "kanban", basic: "yes", pro: "yes", business: "yes" },
  { pt: "Pedidos por mês", en: "Orders per month", basic: "100", pro: "Sem limite|No limit", business: "Sem limite|No limit" },
  { pt: "Etiqueta, QR e consulta do cliente", en: "Label, QR and customer tracking", href: "cliente", basic: "yes", pro: "yes", business: "yes" },
  { pt: "Avaliações com convite ao Google", en: "Reviews with a Google invite", href: "cliente", basic: "yes", pro: "yes", business: "yes" },
  { pt: "CRM de orçamentos (Ligar hoje e funil)", en: "Quote CRM (Call today and funnel)", href: "orcamentos", basic: "yes", pro: "yes", business: "yes" },
  { pt: "WhatsApp com texto pronto", en: "WhatsApp with ready text", href: "whatsapp", basic: "yes", pro: "yes", business: "yes" },
  { pt: "Contas por setor e TVs", en: "Sector accounts and TVs", href: "equipe", basic: "yes", pro: "yes", business: "yes" },
  { pt: "Financeiro, métricas e TV financeiro", en: "Finance, metrics and finance TV", href: "financeiro", basic: "no", pro: "yes", business: "yes" },
  { pt: "Marca da empresa", en: "Company brand", basic: "no", pro: "yes", business: "yes" },
  { pt: "Produtos, estoque e venda no pedido", en: "Products, stock and sales on the order", href: "produtos", basic: "no", pro: "yes", business: "yes" },
  { pt: "IA (1.000 usos por mês)", en: "AI (1,000 uses a month)", href: "ia", basic: "no", pro: "no", business: "yes" },
  { pt: "WhatsApp oficial com pacote", en: "Official WhatsApp with a pack", href: "whatsapp", basic: "no", pro: "no", business: "Em ativação|Activating" },
  { pt: "Implantação e treinamento", en: "Onboarding and training", basic: "no", pro: "no", business: "yes" },
]

export const COMING: Array<{ pt: { title: string; desc: string }; en: { title: string; desc: string } }> = [
  {
    pt: { title: "WhatsApp oficial automático", desc: "Pronto, já construído. Em ativação com a Meta para enviar pelo número da empresa." },
    en: { title: "Automatic official WhatsApp", desc: "Built. Being activated with Meta to send from the company number." },
  },
  {
    pt: { title: "App para iPhone e Android", desc: "Kanban, pedidos, orçamentos e prateleira no app. Em publicação nas lojas." },
    en: { title: "iPhone and Android app", desc: "Kanban, orders, quotes and the shelf in an app. Being published to the stores." },
  },
]
