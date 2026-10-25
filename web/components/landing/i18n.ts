export type Locale = "pt" | "en"

const pt = {
  nav: {
    product: "Produto",
    features: "Recursos",
    clients: "Quem usa",
    trades: "Ramos",
    pricing: "Preço",
    faq: "FAQ",
  },
  hero: {
    brand: "Worqera",
    kicker: "Fila de pedidos · CRM de orçamentos · Estoque · WhatsApp · Financeiro · IA",
    headline: "O orquestrador da fila de pedidos.",
    sub: "O pedido entra com código e anda por setor. O cliente acompanha e é avisado. Quem não fechou vira retorno com dia para ligar. O dono vê o caixa, a prateleira e a semana. No Business, a IA escreve e resume com você.",
    cta: "Testar grátis por 7 dias",
    secondary: "Já tenho conta",
    note: "Sem cartão · Setup em minutos · Cancele quando quiser",
    social: "Já na operação de sapataria, assistência e outros ramos com fila.",
  },
  film: {
    live: "Operação ao vivo",
    code: "#0048",
    item: "Palmilha esportiva",
    origin: "Venda da loja · 1 un",
    cols: ["Recebido", "Produção", "Pronto", "Entregue"],
    beats: [
      "O pedido entrou na fila.",
      "Passou para a produção.",
      "Ficou pronto para sair.",
      "O e-mail do laudo foi enviado.",
      "Saiu entregue e o estoque baixou.",
    ],
    email: "E-mail enviado",
    stockItem: "Palmilha",
    stockBefore: "18",
    stockAfter: "17",
  },
  day: {
    title: "Um dia, sem telefonema.",
    subtitle: "O pedido entra de manhã, anda na fila e o cliente já sabe quando buscar.",
    scenes: [
      {
        time: "08:12",
        title: "O pedido entra",
        line: "Ana deixa o par. O código nasce na fila, com prazo.",
        gain: "Ninguém anota no papel.",
      },
      {
        time: "10:40",
        title: "A produção puxa",
        line: "O cartão sai de Recebido e entra em Produção.",
        gain: "A equipe vê a própria etapa.",
      },
      {
        time: "14:05",
        title: "A venda entra junto",
        line: "A palmilha sai da prateleira e o estoque fica reservado.",
        gain: "Serviço e produto no mesmo pedido.",
      },
      {
        time: "16:20",
        title: "O cliente é avisado",
        line: "O e-mail diz que está pronto. A consulta mostra o mesmo.",
        gain: "Menos ligação perguntando.",
      },
      {
        time: "18:02",
        title: "Saiu entregue",
        line: "O estoque baixa e o dia fecha com o que foi feito.",
        gain: "O dono vê o movimento.",
      },
    ],
  },
  system: {
    eyebrow: "Mais do que uma fila",
    title: "Tudo o que a operação precisa, num sistema só.",
    subtitle: "Fila, cliente, vendas, dinheiro e inteligência. Cada parte tem uma página com o detalhe.",
    all: "Ver todos os recursos",
    pillars: [
      { k: "01", href: "/recursos/kanban", tag: "Todos os planos", title: "Kanban por setores", desc: "O pedido entra com código, prazo e caminho. Cada setor puxa o que é dele. O dono vê tudo ao vivo." },
      { k: "02", href: "/recursos/cliente", tag: "Todos os planos", title: "Consulta e avaliações", desc: "QR na etiqueta, status sem ligação, laudo por e-mail e avaliação com convite ao Google." },
      { k: "03", href: "/recursos/orcamentos", tag: "Novo · CRM", title: "CRM de orçamentos", desc: "Quem não fechou vira retorno: motivo, dia de ligar, lista Ligar hoje e funil em quadro." },
      { k: "04", href: "/recursos/whatsapp", tag: "Novo", title: "WhatsApp", desc: "Pronto, lembrete de retirada e retorno de orçamento com o texto pronto. Oficial no Business." },
      { k: "05", href: "/recursos/financeiro", tag: "Pro e Business", title: "Financeiro e análise", desc: "Caixa do dia, a receber, pedidos parados na prateleira, métricas e o resumo da semana." },
      { k: "06", href: "/recursos/ia", tag: "Novo · Business", title: "IA na operação", desc: "Resumo do dia, mensagem para cada orçamento, laudo para o cliente e leitura da semana." },
      { k: "07", href: "/recursos/equipe", tag: "Todos os planos", title: "Equipe e TVs", desc: "Conta por setor, papéis, TV da oficina e da sala de espera. Preço por empresa, não por pessoa." },
      { k: "08", href: "/recursos/produtos", tag: "Novo · Pro e Business", title: "Produtos e estoque", desc: "A loja cadastra o que vende e vende no mesmo pedido. Reserva ao salvar, baixa na entrega." },
    ],
  },
  proof: {
    title: "Números de quem já opera, não de pitch.",
    items: [
      { value: "1.000+", label: "pedidos operados na Worqera" },
      { value: "R$ 200 mil+", label: "gerados para os clientes" },
      { value: "Vários ramos", label: "serviço, fábrica, loja, assistência e encomenda" },
    ],
  },
  loop: {
    title: "Entra, anda, avisa e sai.",
    subtitle: "Um fluxo para a oficina, a loja, a fábrica e o atelier. O cliente acompanha sem ligar.",
    steps: [
      {
        n: "01",
        title: "Recebe",
        desc: "Pedido do cliente ou venda da loja. Código curto, prazo e etiqueta.",
      },
      {
        n: "02",
        title: "Anda",
        desc: "Cada etapa é uma coluna. A equipe move. A empresa vê a operação inteira.",
      },
      {
        n: "03",
        title: "Avisa",
        desc: "No pronto, o e-mail sai e a consulta pública mostra o status.",
      },
      {
        n: "04",
        title: "Entrega",
        desc: "O pedido sai da fila. Se veio do estoque, o saldo baixa na hora.",
      },
    ],
  },
  trades: {
    title: "Feito para várias áreas, não para um tipo de loja.",
    line: "Serviço, venda de balcão, fábrica e encomenda usam a mesma operação: pedido, produto, estoque e aviso.",
    hint: "O nome do item e os setores se configuram na empresa. Não existe um sistema diferente por ramo.",
    items: [
      { slug: "sapataria", trade: "Calçados", item: "Calçado", use: "O par entra, passa pelos setores e o cliente consulta o código." },
      { slug: "lavanderia", trade: "Lavanderia", item: "Roupa", use: "A peça ganha prazo. O cliente para de ligar perguntando se ficou pronta." },
      { slug: "assistencia", trade: "Assistência", item: "Aparelho", use: "Ordem de serviço com etapa, previsão e retirada." },
      { slug: "automotivo", trade: "Automotivo", item: "Veículo", use: "Estética, funilaria leve e detailing na mesma fila." },
      { slug: "atelier", trade: "Atelier", item: "Peça sob medida", use: "Reforma e encomenda andam como pedido, não como conversa." },
      { slug: "grafica", trade: "Gráfica", item: "Impresso", use: "Arte entra, produção puxa, o cliente vê quando pode buscar." },
      { slug: "marcenaria", trade: "Marcenaria", item: "Móvel", use: "Encomenda com etapas reais, não prazo no ar." },
      { slug: "otica", trade: "Ótica", item: "Óculos", use: "Conserto e ajuste com código e aviso no pronto." },
      { slug: "pet", trade: "Pet", item: "Acessório", use: "Serviço com horário de saída e consulta sem mensagem." },
    ],
  },
  practice: {
    title: "Três telas. A mesma operação.",
    subtitle: "O produto na prateleira, a venda no pedido e o aviso no e-mail do cliente.",
    productLabel: "Produto",
    productName: "Palmilha esportiva",
    productMeta: "Variação M · R$ 80",
    productStock: "18 disponíveis · 2 reservados",
    saleLabel: "Venda",
    saleCode: "0048",
    saleMeta: "1 un · da loja · em produção",
    salePrice: "R$ 80",
    mailLabel: "E-mail",
    mailSubject: "Seu pedido está pronto",
    mailBody: "O 0048 saiu da produção. A consulta já mostra Pronto.",
    mailTo: "ana@cliente.com",
  },
  clients: {
    title: "Quem já opera na Worqera",
    subtitle: "Quem tem fila de verdade. As frases são o jeito da casa — curto, sem enrolação.",
    items: [
      {
        name: "Casa do Tênis",
        trade: "Calçados",
        line: "Restauração na Av. Paulista. O par entra, o setor puxa, o cliente consulta o código.",
      },
      {
        name: "Sapataria Paulista",
        trade: "Calçados",
        line: "Conserto e sola no kanban, do balcão até a entrega.",
      },
      {
        name: "Axisbyte",
        trade: "Operação",
        line: "Constrói a Worqera e opera nela. Cliente, não marca por trás.",
      },
    ],
    stories: [
      {
        quote:
          "A gente cuida de tênis todo dia. O que revolucionou não foi a tela — foi o setor. Cada um vê a própria fila. A produção anda mais. E quando o cliente pergunta, a gente acha o par na hora.",
        name: "Junior Ribeiro",
        role: "Sócio",
        company: "Casa do Tênis",
        place: "Av. Paulista, São Paulo",
        href: "https://acasadotenis.com.br",
      },
      {
        quote:
          "Na sapataria o pedido vivia na cabeça de quem estava na bancada. Hoje tem código, setor e prazo. A equipe produz mais porque não perde tempo procurando. O cliente consulta sozinho.",
        name: "Thiago Landes",
        role: "Sócio",
        company: "Sapataria Paulista",
        place: "São Paulo",
        href: "",
      },
      {
        quote:
          "A Axisbyte faz a Worqera e usa a Worqera. Pedido, setor, aviso ao cliente. Se a fila da gente não aguentar o dia, a oficina também não aguenta. É o teste de verdade.",
        name: "Eduardo",
        role: "Fundador",
        company: "Axisbyte",
        place: "São Paulo",
        href: "",
      },
    ],
  },
  why: {
    title: "O escritório já tem sistema. A fila ainda está no caderno.",
    subtitle: "Sai o papel, o grupo e a ligação. Fica o pedido, o setor e o aviso ao cliente.",
    replacesTitle: "Sai da frente",
    replaces: [
      { from: "Caderno da recepção", to: "Pedido com código e prazo" },
      { from: "Grupo de WhatsApp da equipe", to: "Kanban por setor" },
      { from: "Planilha do dono", to: "Financeiro e métricas no Pro" },
      { from: "Ligação “já ficou pronto?”", to: "Consulta pública e e-mail" },
      { from: "Orçamento perdido no WhatsApp", to: "CRM com dia para ligar" },
      { from: "Pedido esquecido na prateleira", to: "Lembrete com o saldo a receber" },
    ],
    reasonsTitle: "Por isso empresas de vários ramos escolhem",
    reasons: [
      {
        title: "Um preço por empresa",
        desc: "Não cobra por pessoa. A equipe entra, o plano continua o mesmo.",
      },
      {
        title: "O cliente consulta sozinho",
        desc: "Link e QR na etiqueta. Status e previsão, sem a loja atender o telefone.",
      },
      {
        title: "Setores do jeito da operação",
        desc: "Recebido, produção, pronto — ou os nomes da sua área. A fila é sua.",
      },
      {
        title: "7 dias, sem cartão",
        desc: "Sobe a empresa, testa com pedido real, cancela se não for a hora.",
      },
    ],
    cta: "Testar grátis por 7 dias",
  },
  pricing: {
    title: "Preço claro. Uma empresa, um plano.",
    subtitle: "Basic para entrar. Pro para operar. Business para a Worqera ler a operação com você.",
    guarantee: "Cancele quando quiser",
    trust: "Pagamento AbacatePay · dados da sua empresa",
    custom: "O trial de 7 dias vale para Basic e Pro. Business fecha em conversa.",
    plans: [
      {
        name: "Basic",
        seal: "Começar",
        price: "R$ 97",
        priceNote: "/mês",
        description: "A fila no ar esta semana.",
        features: [
          "Kanban por setores e TV da oficina",
          "Cliente consulta sozinho e avalia",
          "CRM de orçamentos",
          "WhatsApp com texto pronto",
          "Até 100 pedidos por mês",
          "Sem caixa, métricas ou estoque",
        ],
        cta: "Testar 7 dias",
        popular: false,
      },
      {
        name: "Pro",
        seal: "Recomendado",
        price: "R$ 197",
        priceNote: "/mês",
        description: "A oficina inteira, sem teto.",
        features: [
          "Tudo do Basic, sem limite de pedidos",
          "Financeiro, métricas e TV financeiro",
          "Marca da empresa",
          "Produtos, estoque e venda no pedido",
          "Resumo semanal por e-mail",
        ],
        cta: "Testar 7 dias",
        popular: true,
      },
      {
        name: "Business",
        seal: "Com a Worqera",
        price: "R$ 697",
        priceNote: "/mês",
        description: "A Worqera vende e lê a operação com você.",
        features: [
          "Tudo do Pro",
          "IA: resumo do dia, orçamentos, laudo e avaliações (1.000 usos/mês)",
          "Leitura semanal da operação pela IA",
          "WhatsApp oficial com pacote (em ativação)",
          "Implantação e treinamento",
        ],
        cta: "Falar com a Worqera",
        popular: false,
      },
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Atende mais de um ramo?",
        a: "Sim. Serviço, loja, fábrica e encomenda usam o mesmo fluxo. O nome do item é o da sua área: calçado, roupa, aparelho, móvel, impresso, óculos.",
      },
      {
        q: "Dá para vender produto e controlar estoque?",
        a: "Sim. O que o cliente trouxe segue a fila. O que a empresa vende entra no mesmo pedido, reserva o saldo e baixa na entrega. O financeiro conta essa venda.",
      },
      {
        q: "Preciso de cartão no trial?",
        a: "Não. Crie a conta, configure a empresa e use 7 dias. Só cobra se assinar.",
      },
      {
        q: "Como o cliente acompanha?",
        a: "Pelo link ou QR da etiqueta: consulta pública com status e previsão.",
      },
      {
        q: "Dá para ter conta por setor?",
        a: "Sim. Quem administra vê tudo; contas de setor veem só a própria fila e encaminham o pedido.",
      },
      {
        q: "O que é o CRM de orçamentos?",
        a: "Quando o cliente não fecha, a equipe marca o motivo e o dia de retorno. A Worqera monta a lista Ligar hoje, sugere a mensagem e, se o cliente fechar, devolve o pedido para a fila. Vem em todos os planos.",
      },
      {
        q: "Tem WhatsApp automático?",
        a: "Em todos os planos, o WhatsApp abre com o cliente e o texto prontos. No Business, o WhatsApp oficial envia sozinho pelo número da empresa; está em ativação com a Meta.",
      },
      {
        q: "A IA tem limite?",
        a: "Tem. O Business inclui 1.000 usos de IA por mês — cada texto que a IA escreve conta um. Quando acaba, os textos continuam saindo prontos, sem IA, até o mês virar. Precisa de mais? A Worqera libera um pacote extra.",
      },
      {
        q: "É só para sapataria?",
        a: "Não. Nasceu em calçados e já atende quem tem fila: lavanderia, assistência, atelier, auto leve, gráfica. O item muda. O fluxo não.",
      },
      {
        q: "Substitui o WhatsApp da oficina?",
        a: "Substitui o grupo como fila e a ligação de status. A equipe ainda pode falar com o cliente; o pedido, o setor e o “está pronto” ficam no sistema.",
      },
    ],
  },
  footer: {
    tagline: "O orquestrador da fila de pedidos: setores, cliente avisado, orçamentos, WhatsApp, financeiro e IA",
    rights: "Todos os direitos reservados.",
  },
}

const en: typeof pt = {
  nav: {
    product: "Product",
    features: "Features",
    clients: "Who uses it",
    trades: "Trades",
    pricing: "Pricing",
    faq: "FAQ",
  },
  hero: {
    brand: "Worqera",
    kicker: "Order queue · Quote CRM · Stock · WhatsApp · Finance · AI",
    headline: "The orchestrator of your order queue.",
    sub: "The order comes in with a code and moves by sector. The customer tracks it and gets notified. Whoever did not close becomes a follow-up with a day to call. The owner sees the till, the shelf and the week. On Business, AI writes and summarizes with you.",
    cta: "Try free for 7 days",
    secondary: "I have an account",
    note: "No card · Setup in minutes · Cancel anytime",
    social: "Already running in cobbler shops, repair benches and other queued trades.",
  },
  film: {
    live: "Live operation",
    code: "#0048",
    item: "Sport insole",
    origin: "Shop sale · 1 unit",
    cols: ["Received", "Production", "Ready", "Delivered"],
    beats: [
      "The order entered the queue.",
      "It moved into production.",
      "It is ready to leave.",
      "The report email was sent.",
      "It left delivered and stock went down.",
    ],
    email: "Email sent",
    stockItem: "Insole",
    stockBefore: "18",
    stockAfter: "17",
  },
  day: {
    title: "A day, without the phone ringing.",
    subtitle: "The order arrives in the morning, moves on the queue and the customer already knows when to pick it up.",
    scenes: [
      {
        time: "08:12",
        title: "The order arrives",
        line: "Ana drops the pair off. The code is born on the queue, with a due date.",
        gain: "Nobody writes it on paper.",
      },
      {
        time: "10:40",
        title: "Production pulls it",
        line: "The card leaves Received and enters Production.",
        gain: "The team sees its own step.",
      },
      {
        time: "14:05",
        title: "The sale joins in",
        line: "The insole leaves the shelf and stock stays reserved.",
        gain: "Service and product on the same order.",
      },
      {
        time: "16:20",
        title: "The customer is told",
        line: "The email says it is ready. The public page says the same.",
        gain: "Fewer calls asking.",
      },
      {
        time: "18:02",
        title: "It left delivered",
        line: "Stock drops and the day closes on what was done.",
        gain: "The owner sees the movement.",
      },
    ],
  },
  system: {
    eyebrow: "More than a queue",
    title: "Everything the operation needs, in one system.",
    subtitle: "Queue, customer, sales, money and intelligence. Each part has its own page with the details.",
    all: "See all features",
    pillars: [
      { k: "01", href: "/recursos/kanban", tag: "All plans", title: "Sector kanban", desc: "The order comes in with a code, due date and path. Each sector pulls its own. The owner sees it all live." },
      { k: "02", href: "/recursos/cliente", tag: "All plans", title: "Tracking and reviews", desc: "QR on the label, status without a call, emailed report and reviews with a Google invite." },
      { k: "03", href: "/recursos/orcamentos", tag: "New · CRM", title: "Quote CRM", desc: "Whoever did not close becomes a follow-up: reason, day to call, Call today list and a funnel board." },
      { k: "04", href: "/recursos/whatsapp", tag: "New", title: "WhatsApp", desc: "Ready notices, pickup reminders and quote follow-ups with ready text. Official on Business." },
      { k: "05", href: "/recursos/financeiro", tag: "Pro and Business", title: "Finance and insight", desc: "Today’s till, receivables, orders waiting on the shelf, metrics and the weekly summary." },
      { k: "06", href: "/recursos/ia", tag: "New · Business", title: "AI in operations", desc: "Daily brief, a message for each quote, a plain report for the customer and a weekly read." },
      { k: "07", href: "/recursos/equipe", tag: "All plans", title: "Team and TVs", desc: "Sector accounts, roles, shop TV and waiting-room TV. Priced per company, not per person." },
      { k: "08", href: "/recursos/produtos", tag: "New · Pro and Business", title: "Products and stock", desc: "The shop registers what it sells and sells it on the same order. Reserved on save, out on delivery." },
    ],
  },
  proof: {
    title: "Numbers from shops already live, not from a pitch.",
    items: [
      { value: "1,000+", label: "orders run on Worqera" },
      { value: "R$ 200k+", label: "generated for clients" },
      { value: "Many trades", label: "service, making, retail, repair and made to order" },
    ],
  },
  loop: {
    title: "In, through, notify, out.",
    subtitle: "One flow for the shop, the store, the workshop and the atelier. The customer follows without calling.",
    steps: [
      {
        n: "01",
        title: "In",
        desc: "A customer order or a shop sale. Short code, due date and label.",
      },
      {
        n: "02",
        title: "Through",
        desc: "Each stage is a column. The team moves it. The company sees the whole operation.",
      },
      {
        n: "03",
        title: "Notify",
        desc: "When it is ready, the email goes out and the public page shows the status.",
      },
      {
        n: "04",
        title: "Out",
        desc: "The order leaves the queue. If it came from stock, the balance drops then.",
      },
    ],
  },
  trades: {
    title: "Built for many trades, not one kind of shop.",
    line: "Service, counter sales, making and custom work share the same operation: order, product, stock and notice.",
    hint: "The item name and the sectors are set on the company. There is no separate system per trade.",
    items: [
      { slug: "sapataria", trade: "Footwear", item: "Shoe", use: "The pair comes in, moves through sectors and the customer checks the code." },
      { slug: "lavanderia", trade: "Laundry", item: "Garment", use: "The piece gets a due date. The customer stops calling to ask if it is ready." },
      { slug: "assistencia", trade: "Repair", item: "Device", use: "A work order with stage, due date and pickup." },
      { slug: "automotivo", trade: "Automotive", item: "Vehicle", use: "Detailing, light bodywork and the same queue." },
      { slug: "atelier", trade: "Atelier", item: "Made to measure", use: "Alterations and custom work move as orders, not as chats." },
      { slug: "grafica", trade: "Print", item: "Print job", use: "Art comes in, production pulls it, the customer sees when to collect." },
      { slug: "marcenaria", trade: "Woodwork", item: "Furniture", use: "Made-to-order with real stages, not a guess." },
      { slug: "otica", trade: "Optical", item: "Glasses", use: "Repair and fitting with a code and a ready notice." },
      { slug: "pet", trade: "Pet", item: "Accessory", use: "A service with a pickup time and no status texts." },
    ],
  },
  practice: {
    title: "Three screens. One operation.",
    subtitle: "The product on the shelf, the sale on the order and the notice in the customer’s email.",
    productLabel: "Product",
    productName: "Sport insole",
    productMeta: "Size M · R$ 80",
    productStock: "18 available · 2 reserved",
    saleLabel: "Sale",
    saleCode: "0048",
    saleMeta: "1 unit · from the shop · in production",
    salePrice: "R$ 80",
    mailLabel: "Email",
    mailSubject: "Your order is ready",
    mailBody: "0048 left production. The public page already says Ready.",
    mailTo: "ana@cliente.com",
  },
  clients: {
    title: "Who already runs on Worqera",
    subtitle: "People with a real queue. Short, straight, the way the shop talks.",
    items: [
      {
        name: "Casa do Tênis",
        trade: "Footwear",
        line: "Restoration on Av. Paulista. The pair comes in, the sector pulls it, the customer checks the code.",
      },
      {
        name: "Sapataria Paulista",
        trade: "Footwear",
        line: "Repairs and soles on the kanban, from the counter to handover.",
      },
      {
        name: "Axisbyte",
        trade: "Operations",
        line: "Builds Worqera and runs on it. A customer, not the brand behind it.",
      },
    ],
    stories: [
      {
        quote:
          "We take care of sneakers every day. What changed wasn’t the screen — it was the sector. Each one sees its own queue. Production moves faster. And when the customer asks, we find the pair right away.",
        name: "Junior Ribeiro",
        role: "Partner",
        company: "Casa do Tênis",
        place: "Av. Paulista, São Paulo",
        href: "https://acasadotenis.com.br",
      },
      {
        quote:
          "In the cobbler shop the order lived in whoever was at the bench. Now it has a code, a sector and a due date. The team produces more because nobody hunts for the job. The customer checks it alone.",
        name: "Thiago Landes",
        role: "Partner",
        company: "Sapataria Paulista",
        place: "São Paulo",
        href: "",
      },
      {
        quote:
          "Axisbyte builds Worqera and runs Worqera. Order, sector, customer notice. If our own queue can’t take the day, a shop’s queue won’t either. That’s the real test.",
        name: "Eduardo",
        role: "Founder",
        company: "Axisbyte",
        place: "São Paulo",
        href: "",
      },
    ],
  },
  why: {
    title: "The office already has software. The queue is still a notebook.",
    subtitle: "Drop the paper, the group chat and the phone. Keep the order, the sector and the customer notice.",
    replacesTitle: "What leaves",
    replaces: [
      { from: "Front-desk notebook", to: "Order with a code and a due date" },
      { from: "Team WhatsApp group", to: "Kanban by sector" },
      { from: "Owner spreadsheet", to: "Finance and metrics on Pro" },
      { from: "“Is it ready yet?” calls", to: "Public tracking and email" },
      { from: "Quotes lost in WhatsApp", to: "A CRM with a day to call" },
      { from: "Orders forgotten on the shelf", to: "A reminder with the balance due" },
    ],
    reasonsTitle: "Why companies in many trades pick it",
    reasons: [
      {
        title: "One price per company",
        desc: "No per-seat billing. The team joins, the plan stays the same.",
      },
      {
        title: "The customer tracks alone",
        desc: "Link and QR on the label. Status and due date, without the shop answering the phone.",
      },
      {
        title: "Sectors that match the floor",
        desc: "Received, production, ready — or the names your trade uses. The queue is yours.",
      },
      {
        title: "7 days, no card",
        desc: "Stand the company up, try a real order, cancel if it is not the moment.",
      },
    ],
    cta: "Try free for 7 days",
  },
  pricing: {
    title: "Clear pricing. One company, one plan.",
    subtitle: "Basic to start. Pro to run. Business so Worqera reads the operation with you.",
    guarantee: "Cancel anytime",
    trust: "AbacatePay billing · your company’s data",
    custom: "The 7-day trial is for Basic and Pro. Business closes in a conversation.",
    plans: [
      {
        name: "Basic",
        seal: "Start",
        price: "R$ 97",
        priceNote: "/month",
        description: "The queue live this week.",
        features: [
          "Sector kanban and shop TV",
          "Customer tracks and reviews alone",
          "Quote CRM",
          "WhatsApp with ready text",
          "Up to 100 orders a month",
          "No till, metrics or stock",
        ],
        cta: "Try 7 days",
        popular: false,
      },
      {
        name: "Pro",
        seal: "Recommended",
        price: "R$ 197",
        priceNote: "/month",
        description: "The whole shop, no cap.",
        features: [
          "Everything in Basic, no order cap",
          "Finance, metrics and finance TV",
          "Company brand",
          "Products, stock and sales on the order",
          "Weekly email summary",
        ],
        cta: "Try 7 days",
        popular: true,
      },
      {
        name: "Business",
        seal: "With Worqera",
        price: "R$ 697",
        priceNote: "/month",
        description: "Worqera sells and reads the operation with you.",
        features: [
          "Everything in Pro",
          "AI: daily brief, quotes, reports and reviews (1,000 uses/month)",
          "Weekly AI read of the operation",
          "Official WhatsApp with a pack (activating)",
          "Onboarding and training",
        ],
        cta: "Talk to Worqera",
        popular: false,
      },
    ],
  },
  faq: {
    title: "FAQ",
    items: [
      {
        q: "Does it cover more than one trade?",
        a: "Yes. Service, retail, making and custom work share the same flow. The item name is yours: shoe, garment, device, furniture, print job, glasses.",
      },
      {
        q: "Can I sell products and track stock?",
        a: "Yes. What the customer brought stays on the queue. What the company sells joins the same order, reserves stock and drops it on delivery. Finance counts that sale.",
      },
      {
        q: "Do I need a card for the trial?",
        a: "No. Create the account, set up the company, use 7 days. You only pay if you subscribe.",
      },
      {
        q: "How does the customer track?",
        a: "Via the label link or QR: public status and due date.",
      },
      {
        q: "Can I have sector accounts?",
        a: "Yes. Admins see everything; sector accounts see their own queue and forward orders.",
      },
      {
        q: "What is the quote CRM?",
        a: "When a customer does not close, the team logs the reason and a follow-up day. Worqera builds the Call today list, suggests the message and, if the customer closes, puts the order back on the queue. It comes with every plan.",
      },
      {
        q: "Is there automatic WhatsApp?",
        a: "On every plan, WhatsApp opens with the customer and the text ready. On Business, official WhatsApp sends by itself from the company number; it is being activated with Meta.",
      },
      {
        q: "Is AI limited?",
        a: "Yes. Business includes 1,000 AI uses a month — each text the AI writes counts as one. When they run out, texts keep coming ready-made, without AI, until the month turns. Need more? Worqera adds an extra pack.",
      },
      {
        q: "Is it only for cobbler shops?",
        a: "No. It started in footwear and already fits any queued trade: laundry, repair, atelier, light auto, print. The item changes. The flow does not.",
      },
      {
        q: "Does it replace the shop WhatsApp?",
        a: "It replaces the group as a queue and the status call. The team can still talk to the customer; the order, the sector and “it’s ready” live in the system.",
      },
    ],
  },
  footer: {
    tagline: "The orchestrator of your order queue: sectors, notified customers, quotes, WhatsApp, finance and AI",
    rights: "All rights reserved.",
  },
}

export const translations = { pt, en }

export function getTranslation(locale: Locale) {
  return translations[locale] || translations.pt
}
