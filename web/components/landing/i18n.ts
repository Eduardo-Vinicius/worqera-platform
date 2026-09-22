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
    headline: "A fila da sua oficina, sob controle.",
    sub: "Kanban por setores e consulta pública por código. Do tênis à lavanderia — o mesmo loop.",
    cta: "Testar grátis por 7 dias",
    secondary: "Já tenho conta",
    note: "Sem cartão · Setup em minutos · Cancele quando quiser",
  },
  loop: {
    title: "O item muda. O fluxo não.",
    subtitle: "Um loop operacional para qualquer negócio com etapas e cliente perguntando status.",
    steps: [
      {
        n: "01",
        title: "Recebe",
        desc: "Pedido entra com código curto, serviços e prazo. Etiqueta e QR prontos.",
      },
      {
        n: "02",
        title: "Anda na fila",
        desc: "Cada setor é uma coluna. A equipe move; o dono vê a oficina inteira.",
      },
      {
        n: "03",
        title: "Cliente consulta",
        desc: "Link ou QR abre o status público. Menos ligação. Mais confiança.",
      },
    ],
  },
  trades: {
    title: "Feito para quem tem fila",
    line: "Se o seu negócio tem etapas e cliente perguntando status, encaixa.",
    hint: "Configure setores e o nome do item na Empresa — sem micro-app por vertical.",
    items: [
      "Calçados",
      "Lavanderia",
      "Assistência",
      "Atelier",
      "Reparo",
      "Custom",
    ],
  },
  practice: {
    title: "Na prática",
    subtitle: "Kanban no chão. Consulta no bolso do cliente.",
    boardLabel: "Kanban · setores",
    lookupLabel: "Consulta pública",
    lookupCode: "0042",
    lookupStatus: "Em andamento",
    lookupHint: "Seu cliente abre o QR e vê onde está o pedido.",
  },
  clients: {
    title: "Quem já opera",
    subtitle: "Oficinas reais no dia a dia — não demo genérica.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
  },
  pricing: {
    title: "Preço claro. Uma oficina, um plano.",
    subtitle: "Sem cobrança por usuário. Equipe ilimitada. 7 dias grátis.",
    guarantee: "Cancele quando quiser",
    trust: "Pagamento AbacatePay · dados da sua loja",
    custom: "Business ou implantação assistida? Fale com a Worqera.",
    plans: [
      {
        name: "Early",
        price: "R$ 147",
        priceNote: "/mês · 12 meses",
        description: "Só para as 10 primeiras oficinas — preço travado por 1 ano",
        features: [
          "Tudo do Pro incluso",
          "Kanban por setores",
          "Equipe e pedidos ilimitados",
          "Consulta pública + etiqueta",
          "TVs Cliente e Oficina",
          "Digest semanal por e-mail",
          "Suporte WhatsApp Worqera",
        ],
        cta: "Garantir Early",
        popular: false,
      },
      {
        name: "Pro",
        price: "R$ 247",
        priceNote: "/mês",
        description: "O plano padrão — valor justo pelo que a oficina ganha de volta",
        features: [
          "Kanban avançado por setores",
          "Usuários e pedidos ilimitados",
          "Clientes, consultas e métricas",
          "Alertas de atraso + digest",
          "Financeiro do dono",
          "TVs + branding da oficina",
          "Suporte prioritário",
        ],
        cta: "Começar trial",
        popular: true,
      },
      {
        name: "Business",
        price: "Sob consulta",
        priceNote: "",
        description: "Multi-unidade ou onboarding dedicado",
        features: [
          "Tudo do Pro",
          "Onboarding assistido",
          "Prioridade de suporte",
          "Conversa direta com a Worqera",
        ],
        cta: "Falar com vendas",
        popular: false,
      },
    ],
  },
  faq: {
    title: "Perguntas frequentes",
    items: [
      {
        q: "Serve só para tênis?",
        a: "Não. Calçados é onde começamos. O core é fila + consulta — lavanderia, assistência, atelier e outros ramos usam o mesmo loop.",
      },
      {
        q: "Preciso de cartão no trial?",
        a: "Não. Crie a conta, configure a oficina e use 7 dias. Só cobra se assinar.",
      },
      {
        q: "Como o cliente acompanha?",
        a: "Pelo link ou QR da etiqueta: consulta pública com status e previsão.",
      },
      {
        q: "Dá para ter conta por setor?",
        a: "Sim. O dono vê tudo; contas de setor veem só a própria fila e encaminham o pedido.",
      },
      {
        q: "E WhatsApp automático?",
        a: "Vem via API oficial depois. Hoje o foco é e-mail, etiqueta e consulta pública.",
      },
    ],
  },
  footer: {
    tagline: "Fila operacional para oficinas de serviço",
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
    headline: "Your workshop queue, under control.",
    sub: "Sector kanban and public tracking by code. From sneakers to laundry — same loop.",
    cta: "Try free for 7 days",
    secondary: "I have an account",
    note: "No card · Setup in minutes · Cancel anytime",
  },
  loop: {
    title: "The item changes. The flow doesn’t.",
    subtitle: "One ops loop for any business with stages and customers asking for status.",
    steps: [
      {
        n: "01",
        title: "Intake",
        desc: "Order gets a short code, services and due date. Label and QR ready.",
      },
      {
        n: "02",
        title: "Moves in the queue",
        desc: "Each sector is a column. The team moves; the owner sees the whole floor.",
      },
      {
        n: "03",
        title: "Customer checks",
        desc: "Link or QR opens public status. Fewer calls. More trust.",
      },
    ],
  },
  trades: {
    title: "Built for anyone with a queue",
    line: "If your business has stages and customers asking for status, it fits.",
    hint: "Configure sectors and the item name in Company settings — no micro-app per vertical.",
    items: [
      "Footwear",
      "Laundry",
      "Repair shop",
      "Atelier",
      "Service desk",
      "Custom",
    ],
  },
  practice: {
    title: "In practice",
    subtitle: "Kanban on the floor. Lookup in the customer’s pocket.",
    boardLabel: "Kanban · sectors",
    lookupLabel: "Public lookup",
    lookupCode: "0042",
    lookupStatus: "In progress",
    lookupHint: "Your customer opens the QR and sees where the order is.",
  },
  clients: {
    title: "Already running",
    subtitle: "Real workshops, day to day — not a generic demo.",
    names: ["Casa do Tênis", "Sapataria Paulista", "Axisbyte"],
  },
  pricing: {
    title: "Clear pricing. One shop, one plan.",
    subtitle: "No per-seat fees. Unlimited team. 7 days free.",
    guarantee: "Cancel anytime",
    trust: "AbacatePay billing · your shop’s data",
    custom: "Business or assisted onboarding? Talk to Worqera.",
    plans: [
      {
        name: "Early",
        price: "R$ 147",
        priceNote: "/mo · 12 months",
        description: "First 10 workshops only — locked price for 1 year",
        features: [
          "Everything in Pro",
          "Sector kanban",
          "Unlimited team & orders",
          "Public tracking + labels",
          "Client & floor TVs",
          "Weekly email digest",
          "Worqera WhatsApp support",
        ],
        cta: "Get Early",
        popular: false,
      },
      {
        name: "Pro",
        price: "R$ 247",
        priceNote: "/month",
        description: "The standard plan — fair price for what you get back",
        features: [
          "Advanced sector kanban",
          "Unlimited users & orders",
          "Clients, lookups & metrics",
          "Delay alerts + digest",
          "Owner finance view",
          "TVs + shop branding",
          "Priority support",
        ],
        cta: "Start trial",
        popular: true,
      },
      {
        name: "Business",
        price: "Custom",
        priceNote: "",
        description: "Multi-unit or dedicated onboarding",
        features: [
          "Everything in Pro",
          "Assisted onboarding",
          "Priority support",
          "Direct line with Worqera",
        ],
        cta: "Talk to sales",
        popular: false,
      },
    ],
  },
  faq: {
    title: "FAQ",
    items: [
      {
        q: "Is it only for sneakers?",
        a: "No. Footwear is where we started. The core is queue + lookup — laundry, repair, atelier and others use the same loop.",
      },
      {
        q: "Do I need a card for the trial?",
        a: "No. Create the account, set up the shop, use 7 days. You only pay if you subscribe.",
      },
      {
        q: "How does the customer track?",
        a: "Via the label link or QR: public status and due date.",
      },
      {
        q: "Can I have sector accounts?",
        a: "Yes. Owners see everything; sector accounts see their own queue and forward orders.",
      },
      {
        q: "What about automatic WhatsApp?",
        a: "Coming later via official API. Today we focus on email, labels and public lookup.",
      },
    ],
  },
  footer: {
    tagline: "Operational queue for service workshops",
    rights: "All rights reserved.",
  },
}

export const translations = { pt, en }

export function getTranslation(locale: Locale) {
  return translations[locale] || translations.pt
}
