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
    kicker: "O sistema da operação",
    headline: "A fila anda. A equipe e o cliente são avisados.",
    sub: "Worqera segura o pedido do recebimento ao pronto, avisa quem precisa agir e guarda o histórico de cada cliente. A fila é o agora. O relacionamento com o cliente cresce em cima disso.",
    cta: "Testar grátis por 7 dias",
    secondary: "Já tenho conta",
    note: "Sem cartão · Setup em minutos · Cancele quando quiser",
  },
  system: {
    eyebrow: "Mais do que uma fila",
    title: "Três peças. Um sistema só.",
    subtitle: "Quem só controla a fila perde o aviso e o cliente. A Worqera junta os três.",
    pillars: [
      {
        k: "01",
        title: "Fila",
        desc: "Cada setor é uma coluna. O pedido não some entre o balcão e a produção.",
      },
      {
        k: "02",
        title: "Avisos",
        desc: "Pronto, consulta pública, e-mail e o sino da oficina. Quem precisa saber, sabe na hora.",
      },
      {
        k: "03",
        title: "Clientes",
        desc: "Nome, pedido e histórico ficam na empresa. É a base para o relacionamento — o CRM vem depois, em cima disso.",
      },
    ],
  },
  proof: {
    items: [
      { value: "1.000+", label: "pedidos operados na Worqera" },
      { value: "R$ 200 mil+", label: "gerados para os clientes" },
      { value: "Vários ramos", label: "lavanderia, assistência, calçados, auto e atelier" },
    ],
  },
  loop: {
    title: "O item muda. O fluxo não.",
    subtitle: "Um loop para qualquer empresa com etapas e cliente perguntando status.",
    steps: [
      {
        n: "01",
        title: "Recebe",
        desc: "Pedido entra com código curto, serviços e prazo. Etiqueta e QR prontos.",
      },
      {
        n: "02",
        title: "Anda na fila",
        desc: "Cada setor é uma coluna. A equipe move; a empresa vê a operação inteira.",
      },
      {
        n: "03",
        title: "Cliente consulta",
        desc: "Link ou QR abre o status público. Menos ligação. Mais confiança.",
      },
    ],
  },
  trades: {
    title: "Gestão de pedidos para vários ramos.",
    line: "Um kanban para a fila de lavanderia, assistência técnica, calçados, automotivo, atelier e encomenda. O item muda. O controle é o mesmo.",
    hint: "Setores e o nome do item se configuram na empresa. Não existe um app diferente por vertical.",
    items: [
      { trade: "Calçados", item: "Calçado" },
      { trade: "Lavanderia", item: "Roupa" },
      { trade: "Assistência", item: "Aparelho" },
      { trade: "Automotivo", item: "Veículo" },
      { trade: "Atelier", item: "Peça sob medida" },
      { trade: "Encomenda", item: "Pedido sob medida" },
    ],
  },
  practice: {
    title: "Na prática",
    subtitle: "Kanban na operação. Consulta no bolso do cliente.",
    boardLabel: "Kanban · setores",
    lookupLabel: "Consulta pública",
    lookupCode: "0042",
    lookupStatus: "Em andamento",
    lookupHint: "O cliente abre o QR e vê onde está o pedido.",
  },
  clients: {
    title: "Parceiros",
    subtitle: "Empresas que operam na Worqera no dia a dia.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
  },
  pricing: {
    title: "Preço claro. Uma empresa, um plano.",
    subtitle: "Basic = fila. Pro = fila + caixa. Business = Worqera lado a lado. 7 dias grátis.",
    guarantee: "Cancele quando quiser",
    trust: "Pagamento AbacatePay · dados da sua empresa",
    custom: "Business: onboarding, carga de dados e acompanhamento — fale com a Worqera.",
    plans: [
      {
        name: "Basic",
        price: "R$ 147",
        priceNote: "/mês",
        description: "Operação — a fila sob controle",
        features: [
          "Kanban por setores",
          "Pedidos, clientes e equipe ilimitados",
          "Consulta pública + etiqueta",
          "TVs do cliente e da operação",
          "Sem Financeiro do dono",
          "Sem Métricas / TV Financeiro",
        ],
        cta: "Começar trial",
        popular: false,
      },
      {
        name: "Pro",
        price: "R$ 297",
        priceNote: "/mês",
        description: "Fila + caixa — o plano recomendado",
        features: [
          "Tudo do Basic",
          "Financeiro do dono",
          "Métricas + TV Financeiro",
          "Digest semanal por e-mail",
          "Marca da empresa",
          "Suporte prioritário",
        ],
        cta: "Começar trial",
        popular: true,
      },
      {
        name: "Business",
        price: "R$ 499",
        priceNote: "/mês",
        description: "A Worqera implementa e acompanha com você",
        features: [
          "Tudo do Pro",
          "Onboarding assistido",
          "Carga e enriquecimento de dados",
          "1 follow-up por mês",
          "Prioridade de suporte",
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
        a: "Sim. Calçado, roupa, aparelho, veículo, peça sob medida e encomenda usam o mesmo loop: pedido, setores e consulta.",
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
    tagline: "Sistema de gestão de pedidos, kanban e status para o cliente",
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
    kicker: "The operating system",
    headline: "The queue moves. The team and the customer get told.",
    sub: "Worqera holds the order from intake to ready, alerts whoever needs to act, and keeps each customer’s history. The queue is now. The relationship grows on top of it.",
    cta: "Try free for 7 days",
    secondary: "I have an account",
    note: "No card · Setup in minutes · Cancel anytime",
  },
  system: {
    eyebrow: "More than a queue",
    title: "Three pieces. One system.",
    subtitle: "A queue alone drops the alert and the customer. Worqera keeps all three.",
    pillars: [
      {
        k: "01",
        title: "Queue",
        desc: "Each sector is a column. The order does not vanish between the counter and production.",
      },
      {
        k: "02",
        title: "Alerts",
        desc: "Ready, public lookup, email and the shop bell. The people who need to know, know now.",
      },
      {
        k: "03",
        title: "Customers",
        desc: "Name, order and history stay with the company. That is the base of the relationship — CRM comes later, on top of it.",
      },
    ],
  },
  proof: {
    items: [
      { value: "1,000+", label: "orders run on Worqera" },
      { value: "R$ 200k+", label: "generated for clients" },
      { value: "Many trades", label: "laundry, repair, footwear, auto and atelier" },
    ],
  },
  loop: {
    title: "The item changes. The flow doesn’t.",
    subtitle: "One loop for any company with stages and customers asking for status.",
    steps: [
      {
        n: "01",
        title: "Intake",
        desc: "Order gets a short code, services and due date. Label and QR ready.",
      },
      {
        n: "02",
        title: "Moves in the queue",
        desc: "Each sector is a column. The team moves; the company sees the whole operation.",
      },
      {
        n: "03",
        title: "Customer checks",
        desc: "Link or QR opens public status. Fewer calls. More trust.",
      },
    ],
  },
  trades: {
    title: "Order management for many trades.",
    line: "One kanban for laundry, repair shops, footwear, automotive, atelier and made-to-order. The item changes. The control stays.",
    hint: "Sectors and the item name are set on the company. There is no separate app per vertical.",
    items: [
      { trade: "Footwear", item: "Shoe" },
      { trade: "Laundry", item: "Garment" },
      { trade: "Repair", item: "Device" },
      { trade: "Automotive", item: "Vehicle" },
      { trade: "Atelier", item: "Made to measure" },
      { trade: "Made to order", item: "Custom order" },
    ],
  },
  practice: {
    title: "In practice",
    subtitle: "Kanban in the operation. Lookup in the customer’s pocket.",
    boardLabel: "Kanban · sectors",
    lookupLabel: "Public lookup",
    lookupCode: "0042",
    lookupStatus: "In progress",
    lookupHint: "The customer opens the QR and sees where the order is.",
  },
  clients: {
    title: "Partners",
    subtitle: "Companies running on Worqera, day to day.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
  },
  pricing: {
    title: "Clear pricing. One company, one plan.",
    subtitle: "Basic = ops. Pro = ops + cash. Business = Worqera beside you. 7 days free.",
    guarantee: "Cancel anytime",
    trust: "AbacatePay billing · your company’s data",
    custom: "Business: onboarding, data load and monthly follow-up — talk to Worqera.",
    plans: [
      {
        name: "Basic",
        price: "R$ 147",
        priceNote: "/month",
        description: "Operations — queue under control",
        features: [
          "Sector kanban",
          "Unlimited orders, clients & team",
          "Public tracking + labels",
          "Customer and operations TVs",
          "No owner finance",
          "No metrics / finance TV",
        ],
        cta: "Start trial",
        popular: false,
      },
      {
        name: "Pro",
        price: "R$ 297",
        priceNote: "/month",
        description: "Queue + cash — the recommended plan",
        features: [
          "Everything in Basic",
          "Owner finance",
          "Metrics + finance TV",
          "Weekly email digest",
          "Company brand",
          "Priority support",
        ],
        cta: "Start trial",
        popular: true,
      },
      {
        name: "Business",
        price: "R$ 499",
        priceNote: "/month",
        description: "Worqera implements and stays with you",
        features: [
          "Everything in Pro",
          "Assisted onboarding",
          "Data load & enrichment",
          "1 follow-up per month",
          "Priority support",
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
        a: "Yes. Shoes, garments, devices, vehicles, made-to-measure pieces and custom orders use the same loop: order, sectors and lookup.",
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
    tagline: "Order management, kanban and customer status",
    rights: "All rights reserved.",
  },
}

export const translations = { pt, en }

export function getTranslation(locale: Locale) {
  return translations[locale] || translations.pt
}
