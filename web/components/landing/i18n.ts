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
    kicker: "Para quem tem fila de pedidos: oficina, loja, assistência, produção",
    headline: "Pedido organizado, cliente avisado e orçamento que volta.",
    sub: "Cada setor vê a própria fila, o cliente acompanha sozinho e quem não fechou vira retorno com dia para ligar. O dono vê o caixa e a prateleira.",
    cta: "Testar 7 dias grátis",
    secondary: "Ver preços",
    note: "Sem cartão · Pronto em minutos · Cancele quando quiser",
    social: "Trazemos seu histórico: você não começa do zero.",
    tradesLabel: "Feito para",
  },
  numbers: {
    label: "A Worqera hoje",
    items: [
      { value: "700+", label: "pedidos por mês passam pela Worqera" },
      { value: "R$ 450 mil+", label: "em pedidos por mês" },
      { value: "7.000+", label: "pedidos e 6.000+ clientes na base" },
    ],
  },
  points: {
    eyebrow: "O que muda na sua operação",
    title: "Três coisas que a Worqera resolve no primeiro dia.",
    all: "Ver todos os recursos",
    items: [
      {
        href: "/recursos/kanban",
        title: "Fila por setor",
        desc: "O pedido entra com código e prazo. Cada setor puxa o que é dele, e você vê o atraso antes do cliente reclamar.",
        proof: "Kanban, TV da oficina e contas por setor",
      },
      {
        href: "/recursos/cliente",
        title: "Cliente avisado sozinho",
        desc: "QR na etiqueta, consulta do status, e-mail no pronto e WhatsApp com o texto certo. Menos ligação perguntando.",
        proof: "Consulta, avaliações e WhatsApp",
      },
      {
        href: "/recursos/orcamentos",
        title: "Dinheiro que volta",
        desc: "Quem não fechou vira retorno com dia para ligar. A cobrança mostra quem deve, e a prateleira mostra o que ninguém buscou.",
        proof: "CRM de orçamentos, cobrança e financeiro",
      },
    ],
  },
  cta: {
    title: "Sua fila no ar ainda hoje.",
    sub: "Crie a conta, escolha o ramo e lance o primeiro pedido. Se quiser, a gente monta tudo com você.",
    primary: "Testar 7 dias grátis",
    secondary: "Falar com a Worqera",
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
  pricing: {
    title: "Preço claro. Uma empresa, um plano.",
    subtitle: "Basic para organizar. Pro para ver o dinheiro. Business para vender e avisar sozinho.",
    guarantee: "Cancele quando quiser",
    trust: "Pagamento pelo Asaas: Pix, boleto ou cartão",
    custom: "7 dias grátis em qualquer plano. Anual com 2 meses grátis. Implantação com a Worqera: R$ 497 uma vez.",
    plans: [
      {
        name: "Basic",
        seal: "Começar",
        price: "R$ 147",
        priceNote: "/mês",
        description: "Um orçamento recuperado no mês já paga o plano.",
        features: [
          "Kanban por setores, TVs e consulta do cliente",
          "CRM de orçamentos e WhatsApp com texto pronto",
          "IA no resumo do dia (50 usos)",
          "Até 150 pedidos por mês",
        ],
        cta: "Testar 7 dias",
        popular: false,
      },
      {
        name: "Pro",
        seal: "Recomendado",
        price: "R$ 297",
        priceNote: "/mês",
        description: "O caixa, a prateleira e o estoque na sua mão.",
        features: [
          "Tudo do Basic, sem limite de pedidos",
          "Financeiro, métricas e TV financeiro",
          "Produtos, estoque e marca da empresa",
          "IA em orçamentos, clientes e cobrança (300 usos)",
        ],
        cta: "Testar 7 dias",
        popular: true,
      },
      {
        name: "Business",
        seal: "Automático",
        price: "R$ 597",
        priceNote: "/mês",
        description: "O WhatsApp avisa sozinho e a IA escreve com você.",
        features: [
          "Tudo do Pro",
          "WhatsApp oficial automático (1.000 avisos e 100 retomadas)",
          "IA com 1.500 usos e leitura semanal",
          "Suporte prioritário",
        ],
        cta: "Testar 7 dias",
        popular: false,
      },
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Atende o meu ramo?",
        a: "Atende quem tem fila de pedidos: sapataria, lavanderia, assistência técnica, oficina e estética automotiva, gráfica, marcenaria, atelier e produção sob encomenda. O nome do item e os setores são os da sua área.",
      },
      {
        q: "Preciso de cartão para testar?",
        a: "Não. São 7 dias grátis em qualquer plano. Se preferir, já assina no cadastro: a primeira cobrança só vence no fim do teste.",
      },
      {
        q: "Como pago?",
        a: "Pelo Asaas, com Pix, boleto ou cartão. No anual você paga 10 meses e leva 12 (17% de desconto). Cancele quando quiser.",
      },
      {
        q: "Vocês trazem meu histórico do sistema antigo?",
        a: "Trazemos. Na implantação (R$ 497, uma vez) a gente importa clientes e pedidos, monta os setores e treina a equipe. Já trouxemos mais de 7.000 pedidos de um sistema antigo.",
      },
      {
        q: "Como o cliente acompanha o pedido?",
        a: "Pelo link ou pelo QR da etiqueta: ele vê o status e a previsão sem ligar. No pronto, recebe e-mail e pode avaliar o atendimento.",
      },
      {
        q: "Tem WhatsApp automático?",
        a: "Em todos os planos o WhatsApp abre com o cliente e o texto prontos. No Business, o WhatsApp oficial avisa sozinho pelo número da empresa.",
      },
      {
        q: "A IA tem limite?",
        a: "Vem em todos os planos: 50 usos no Basic, 300 no Pro e 1.500 no Business. Quando acaba, os textos continuam saindo prontos, sem IA, até o mês virar.",
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
    kicker: "For businesses with an order queue: workshops, stores, repair, production",
    headline: "Orders organized, customers notified, quotes that come back.",
    sub: "Each sector sees its own queue, customers track on their own and lost quotes become a follow-up with a date. The owner sees the till and the shelf.",
    cta: "Try 7 days free",
    secondary: "See pricing",
    note: "No card · Ready in minutes · Cancel anytime",
    social: "We bring your history: you don't start from scratch.",
    tradesLabel: "Made for",
  },
  numbers: {
    label: "Worqera today",
    items: [
      { value: "700+", label: "orders a month run on Worqera" },
      { value: "R$ 450k+", label: "in orders a month" },
      { value: "7,000+", label: "orders and 6,000+ customers on file" },
    ],
  },
  points: {
    eyebrow: "What changes in your operation",
    title: "Three things Worqera solves on day one.",
    all: "See all features",
    items: [
      {
        href: "/recursos/kanban",
        title: "A queue per sector",
        desc: "Orders come in with a code and a due date. Each sector pulls its own work, and you see delays before the customer complains.",
        proof: "Kanban, shop TV and sector accounts",
      },
      {
        href: "/recursos/cliente",
        title: "Customers notified on their own",
        desc: "QR on the label, status tracking, an e-mail when it's ready and WhatsApp with the right text. Fewer calls asking.",
        proof: "Tracking, reviews and WhatsApp",
      },
      {
        href: "/recursos/orcamentos",
        title: "Money that comes back",
        desc: "Lost quotes become a follow-up with a date. Collections show who owes, and the shelf shows what nobody picked up.",
        proof: "Quote CRM, collections and finance",
      },
    ],
  },
  cta: {
    title: "Your queue live today.",
    sub: "Create the account, pick your trade and add the first order. If you want, we set it all up with you.",
    primary: "Try 7 days free",
    secondary: "Talk to Worqera",
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
  pricing: {
    title: "Clear pricing. One company, one plan.",
    subtitle: "Basic to get organized. Pro to see the money. Business to sell and notify on its own.",
    guarantee: "Cancel anytime",
    trust: "Billing by Asaas: Pix, boleto or card",
    custom: "7 days free on any plan. Yearly with 2 months free. Setup with Worqera: R$ 497 once.",
    plans: [
      {
        name: "Basic",
        seal: "Start",
        price: "R$ 147",
        priceNote: "/month",
        description: "One recovered quote a month already pays for it.",
        features: [
          "Sector kanban, TVs and customer tracking",
          "Quote CRM and WhatsApp with ready text",
          "AI daily brief (50 uses)",
          "Up to 150 orders a month",
        ],
        cta: "Try 7 days",
        popular: false,
      },
      {
        name: "Pro",
        seal: "Recommended",
        price: "R$ 297",
        priceNote: "/month",
        description: "The till, the shelf and the stock in your hand.",
        features: [
          "Everything in Basic, no order cap",
          "Finance, metrics and finance TV",
          "Products, stock and company brand",
          "AI on quotes, customers and collections (300 uses)",
        ],
        cta: "Try 7 days",
        popular: true,
      },
      {
        name: "Business",
        seal: "Automatic",
        price: "R$ 597",
        priceNote: "/month",
        description: "WhatsApp notifies on its own and AI writes with you.",
        features: [
          "Everything in Pro",
          "Automatic official WhatsApp (1,000 notices and 100 follow-ups)",
          "AI with 1,500 uses and a weekly read",
          "Priority support",
        ],
        cta: "Try 7 days",
        popular: false,
      },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      {
        q: "Does it fit my trade?",
        a: "It fits any business with an order queue: shoe repair, laundry, tech repair, auto care, print shops, carpentry, ateliers and made-to-order production. Item names and sectors are yours.",
      },
      {
        q: "Do I need a card to try it?",
        a: "No. 7 days free on any plan. If you prefer, subscribe at signup: the first charge is only due at the end of the trial.",
      },
      {
        q: "How do I pay?",
        a: "Through Asaas, with Pix, boleto or card. Yearly you pay 10 months and get 12 (17% off). Cancel anytime.",
      },
      {
        q: "Do you bring my history from the old system?",
        a: "Yes. With setup (R$ 497, once) we import customers and orders, build your sectors and train the team. We have already brought over 7,000 orders from an old system.",
      },
      {
        q: "How does the customer track the order?",
        a: "Through the link or the QR on the label: status and due date without calling. When it's ready, they get an e-mail and can rate the service.",
      },
      {
        q: "Is there automatic WhatsApp?",
        a: "On every plan WhatsApp opens with the customer and the text ready. On Business, official WhatsApp notifies on its own from the company number.",
      },
      {
        q: "Is AI limited?",
        a: "It comes with every plan: 50 uses on Basic, 300 on Pro and 1,500 on Business. When they run out, texts keep coming ready-made, without AI, until the month turns.",
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
