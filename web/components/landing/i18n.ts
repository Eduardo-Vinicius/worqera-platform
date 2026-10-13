export type Locale = "pt" | "en"

const pt = {
  nav: {
    product: "Produto",
    trades: "Ramos",
    pricing: "Preço",
    faq: "FAQ",
  },
  hero: {
    brand: "Worqera",
    kicker: "Pedidos, produtos, estoque e vendas",
    headline: "A operação inteira, do pedido à venda.",
    sub: "Worqera acompanha o que o cliente trouxe, o que a empresa vende e o que está no estoque. O pedido entra, passa de etapa, sai pronto e o cliente recebe o e-mail. O caixa conta junto.",
    cta: "Testar grátis por 7 dias",
    secondary: "Já tenho conta",
    note: "Sem cartão · Setup em minutos · Cancele quando quiser",
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
    title: "Pedido, produto, estoque e venda.",
    subtitle: "O mesmo sistema para quem conserta, fabrica ou vende. O item muda. O controle fica.",
    pillars: [
      {
        k: "01",
        title: "Pedidos",
        desc: "O que o cliente trouxe entra com código, prazo e setor. A fila mostra onde está agora.",
      },
      {
        k: "02",
        title: "Produtos",
        desc: "Cadastro, variação e preço do que a empresa vende ou fabrica. O nome do item é o da sua área.",
      },
      {
        k: "03",
        title: "Estoque",
        desc: "A venda reserva o saldo. A entrega baixa. O que está na prateleira e o que está em produção ficam visíveis.",
      },
      {
        k: "04",
        title: "Vendas",
        desc: "O item da loja vira pedido, anda no kanban e entra no financeiro. O cliente recebe o e-mail quando fica pronto.",
      },
    ],
  },
  proof: {
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
      { trade: "Calçados", item: "Calçado" },
      { trade: "Lavanderia", item: "Roupa" },
      { trade: "Assistência", item: "Aparelho" },
      { trade: "Automotivo", item: "Veículo" },
      { trade: "Atelier", item: "Peça sob medida" },
      { trade: "Gráfica", item: "Impresso" },
      { trade: "Marcenaria", item: "Móvel" },
      { trade: "Ótica", item: "Óculos" },
      { trade: "Pet", item: "Acessório" },
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
    title: "Parceiros",
    subtitle: "Empresas que operam na Worqera no dia a dia.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
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
          "Kanban por setores",
          "Cliente consulta sozinho",
          "TV da oficina",
          "Pedidos limitados",
          "Sem caixa, sem métricas, sem estoque",
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
          "Pedidos ilimitados",
          "Financeiro e métricas",
          "TV financeiro",
          "Marca da empresa",
          "Produtos, estoque e vendas",
        ],
        cta: "Testar 7 dias",
        popular: true,
      },
      {
        name: "Business",
        seal: "Com a Worqera",
        price: "R$ 499",
        priceNote: "/mês",
        description: "A gente lê o movimento com você.",
        features: [
          "Análises com IA",
          "Acompanhamento semanal",
          "Integração",
          "Treinamento da equipe",
          "Tudo do Pro",
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
        q: "E WhatsApp automático?",
        a: "Vem via API oficial depois. Hoje o foco é e-mail, etiqueta e consulta pública.",
      },
    ],
  },
  footer: {
    tagline: "Pedidos, produtos, estoque, vendas e o aviso para o cliente",
    rights: "Todos os direitos reservados.",
  },
}

const en: typeof pt = {
  nav: {
    product: "Product",
    trades: "Trades",
    pricing: "Pricing",
    faq: "FAQ",
  },
  hero: {
    brand: "Worqera",
    kicker: "Orders, products, stock and sales",
    headline: "The whole operation, from order to sale.",
    sub: "Worqera tracks what the customer brought, what the company sells and what is on the shelf. The order comes in, moves through each stage, leaves ready and the customer gets the email. The books count it too.",
    cta: "Try free for 7 days",
    secondary: "I have an account",
    note: "No card · Setup in minutes · Cancel anytime",
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
    title: "Orders, products, stock and sales.",
    subtitle: "The same system for repair, making and selling. The item changes. The control stays.",
    pillars: [
      {
        k: "01",
        title: "Orders",
        desc: "What the customer brought in gets a code, a due date and a sector. The queue shows where it is now.",
      },
      {
        k: "02",
        title: "Products",
        desc: "Catalog, variant and price for what the company sells or makes. The item name is the one from your trade.",
      },
      {
        k: "03",
        title: "Stock",
        desc: "A sale reserves the balance. Delivery takes it out. The shelf and the work in progress stay visible.",
      },
      {
        k: "04",
        title: "Sales",
        desc: "A shop item becomes an order, moves on the kanban and lands in finance. The customer gets the email when it is ready.",
      },
    ],
  },
  proof: {
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
      { trade: "Footwear", item: "Shoe" },
      { trade: "Laundry", item: "Garment" },
      { trade: "Repair", item: "Device" },
      { trade: "Automotive", item: "Vehicle" },
      { trade: "Atelier", item: "Made to measure" },
      { trade: "Print", item: "Print job" },
      { trade: "Woodwork", item: "Furniture" },
      { trade: "Optical", item: "Glasses" },
      { trade: "Pet", item: "Accessory" },
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
    title: "Partners",
    subtitle: "Companies running on Worqera, day to day.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
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
          "Sector kanban",
          "Customer tracks alone",
          "Shop TV",
          "Limited orders",
          "No cash desk, no metrics, no stock",
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
          "Unlimited orders",
          "Finance and metrics",
          "Finance TV",
          "Company brand",
          "Products, stock and sales",
        ],
        cta: "Try 7 days",
        popular: true,
      },
      {
        name: "Business",
        seal: "With Worqera",
        price: "R$ 499",
        priceNote: "/month",
        description: "We read the movement with you.",
        features: [
          "AI analyses",
          "Weekly accompaniment",
          "Integration",
          "Team training",
          "Everything in Pro",
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
        q: "What about automatic WhatsApp?",
        a: "Coming later via official API. Today we focus on email, labels and public lookup.",
      },
    ],
  },
  footer: {
    tagline: "Orders, products, stock, sales and the customer notice",
    rights: "All rights reserved.",
  },
}

export const translations = { pt, en }

export function getTranslation(locale: Locale) {
  return translations[locale] || translations.pt
}
