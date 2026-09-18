export type Locale = "pt" | "en"

export const translations = {
  pt: {
    // Header
    nav: {
      product: "Produto",
      useCases: "Casos de Uso",
      features: "Funcionalidades",
      howItWorks: "Como Funciona",
      pricing: "Preços",
      faq: "FAQ",
    },
    cta: {
      whatsapp: "Falar no WhatsApp",
      seeHowItWorks: "Ver como funciona",
      replyInMinutes: "Resposta em minutos.",
    },
    // Hero
    hero: {
      headline: "Gestão de pedidos para oficinas de serviço",
      subheadline:
        "Kanban por setores, rastreio para o cliente e equipe alinhada — sem planilha e sem perder pedido.",
      trustedBy: "Quem já usa a Worqera",
    },
    // Problem
    problem: {
      title: "Quando o pedido se perde no meio do caminho",
      subtitle: "Reconhece algum desses problemas?",
      items: [
        {
          title: "Pedidos perdidos no chat",
          description: "Informações espalhadas em conversas de WhatsApp, anotações e planilhas.",
        },
        {
          title: "Sem visibilidade",
          description: '"Onde está meu pedido?" — você não sabe responder com certeza.',
        },
        {
          title: 'Constantes "qual o status?"',
          description: "Clientes ligando e mandando mensagens o tempo todo perguntando sobre o pedido.",
        },
        {
          title: "Prazos estourados",
          description: "Sem alertas de SLA, você só descobre o atraso quando o cliente reclama.",
        },
        {
          title: "Passagem de bastão confusa",
          description: "Departamentos não sabem o que já foi feito ou o que falta fazer.",
        },
        {
          title: "Histórico inexistente",
          description: "Precisa saber o que foi feito para um cliente? Boa sorte encontrando.",
        },
      ],
      costTitle: "Quanto isso custa para seu negócio?",
      costs: [
        {
          title: "Perda de receita",
          description: "Pedidos perdidos = dinheiro perdido",
        },
        {
          title: "10+ horas/semana",
          description: "Desperdiçadas em retrabalho",
        },
        {
          title: "Clientes insatisfeitos",
          description: "Reclamações e perda de clientes",
        },
        {
          title: "Baixa produtividade",
          description: "Equipe perdida e desmotivada",
        },
      ],
    },
    // Solution
    solution: {
      title: "Visibilidade completa, do início ao fim",
      subtitle: "Acompanhe cada pedido em tempo real, saiba exatamente em que etapa está, quem é o responsável e quando estará pronto. Simplicidade que transforma sua operação.",
      features: [
        "Visão kanban por departamento",
        "Histórico completo de cada pedido",
        "Notificações automáticas para clientes",
        "Alertas de prazo e SLA",
      ],
    },
    // ROI
    roi: {
      badge: "Resultados Comprovados",
      title: "O impacto real na sua operação",
      subtitle: "Empresas que implementaram Worqera relatam melhorias significativas em produtividade e satisfação do cliente.",
      metrics: [
        {
          value: "85",
          unit: "%",
          title: "Aumento em produtividade",
          description: "Menos tempo procurando pedidos, mais tempo produzindo.",
        },
        {
          value: "5h",
          unit: "/semana",
          title: "Economia de tempo",
          description: "Pare de responder 'Onde está meu pedido?' toda hora.",
        },
        {
          value: "95",
          unit: "%",
          title: "Redução em pedidos perdidos",
          description: "Nada mais se perde entre conversas e planilhas.",
        },
        {
          value: "4.8",
          unit: "⭐",
          title: "Satisfação dos clientes",
          description: "Clientes atualizados automaticamente ficam mais felizes.",
        },
      ],
      bottomText: "Resultados baseados em dados reais de clientes usando Worqera.",
    },
    // Clients
    clients: {
      badge: "3 oficinas no ar · e crescendo",
      title: "Quem já usa a Worqera",
      subtitle: "Oficinas reais no dia a dia — kanban, TV e consulta pro cliente.",
      companies: [
        {
          name: "A Casa do Tênis",
          industry: "Reparos de Calçados",
        },
        {
          name: "Sapataria Paulista",
          industry: "Reparos de Calçados",
        },
        {
          name: "Axisbyte",
          industry: "Cliente Worqera",
        },
        {
          name: "Sua oficina?",
          industry: "Próxima Early",
        },
      ],
      testimonials: [
        {
          quote: "Antes era um caos. Agora sei exatamente onde está cada pedido e meus clientes param de me ligar a cada 5 minutos. A Worqera mudou completamente como trabalhamos.",
          author: "Junior Ribeiro",
          position: "Proprietário",
          company: "A Casa do Tênis",
        },
        {
          quote: "Implementamos em menos de uma semana e já sentimos a diferença. Menos pedidos perdidos, clientes mais satisfeitos, e equipe muito mais produtiva.",
          author: "Thiago",
          position: "Gestor",
          company: "Sapataria Paulista",
        },
      ],
    },
    // Features
    features: {
      title: "Funcionalidades que transformam sua operação",
      subtitle: "Tudo que você precisa para gerenciar pedidos de forma profissional.",
      items: [
        {
          title: "Kanban por etapas",
          description: "Visualize todos os pedidos organizados por status e departamento.",
        },
        {
          title: "Drag & drop",
          description: "Mova pedidos entre etapas com um simples arrastar e soltar.",
        },
        {
          title: "Busca inteligente",
          description: "Encontre qualquer pedido por número, CPF, nome ou descrição.",
        },
        {
          title: "Alertas de SLA",
          description: "Receba avisos antes que os prazos estourem.",
        },
        {
          title: "Notificações automáticas",
          description: "Clientes recebem atualizações por WhatsApp e e-mail automaticamente.",
        },
        {
          title: "Histórico completo",
          description: "Acesse todo o histórico de pedidos e interações de cada cliente.",
        },
        {
          title: "Permissões e papéis",
          description: "Defina quem pode ver e fazer o quê no sistema.",
        },
        {
          title: "Dashboards e métricas",
          description: "Acompanhe performance, tempos médios e gargalos em tempo real.",
        },
      ],
    },
    // Notifications
    notifications: {
      badge: "Comunicação Automática",
      title: "Clientes sempre informados, sem você fazer nada",
      subtitle: "Notificações automáticas por WhatsApp e e-mail a cada mudança de status. Seu cliente fica tranquilo, você economiza tempo.",
      whatsapp: {
        title: "WhatsApp Automático",
        subtitle: "Mensagem instantânea",
        example: "Olá João! Seu tênis Nike Air está pronto para retirada! 🎉\n\nPedido: #12345\nEndereço: Rua ABC, 123\nHorário: Seg-Sex 9h-18h\n\nAguardamos você! ✅",
      },
      email: {
        title: "E-mail Profissional",
        subtitle: "Comunicação formal e completa",
        subject: "Assunto: Atualização do seu pedido #12345",
        example: "Olá João,\n\nTemos uma atualização sobre seu pedido! Seu tênis Nike Air Max foi concluído e está pronto para retirada.\n\nConfira os detalhes no email completo abaixo.",
      },
      emailTemplate: {
        title: "Seu pedido foi atualizado! 🎉",
        greeting: "Olá João Silva,",
        statusTitle: "Status: Pronto para Retirada",
        statusDescription: "Seu serviço foi concluído com sucesso e está aguardando sua retirada.",
        orderNumber: "Número do Pedido:",
        item: "Item:",
        itemExample: "Tênis Nike Air Max - Troca de sola",
        estimatedDate: "Data prevista de retirada:",
        footer: "Você pode retirar seu pedido no endereço: Rua ABC, 123 - Centro. Horário de funcionamento: Segunda a Sexta, 9h às 18h.",
        disclaimer: "Este é um e-mail automático da Worqera. Você está recebendo porque tem um pedido em andamento.",
      },
      features: [
        {
          title: "Totalmente Personalizável",
          description: "Defina o texto de cada mensagem conforme sua marca e tom de voz.",
        },
        {
          title: "Disparo Inteligente",
          description: "Configure quais etapas enviam notificação e quais não enviam.",
        },
        {
          title: "Histórico Completo",
          description: "Veja todas as notificações enviadas para cada cliente.",
        },
      ],
    },
    // Use Cases
    useCases: {
      title: "Para qualquer negócio de serviços",
      subtitle: "Se você recebe itens de clientes e precisa processá-los, Worqera é para você.",
      items: [
        { title: "Reparos de tênis", icon: "👟" },
        { title: "Alfaiatarias", icon: "🪡" },
        { title: "Conserto de malas", icon: "🧳" },
        { title: "Eletrônicos", icon: "📱" },
        { title: "Estofados", icon: "🛋️" },
        { title: "Oficinas e auto", icon: "🔧" },
        { title: "Gráficas", icon: "🖨️" },
        { title: "Lavanderias premium", icon: "👔" },
      ],
    },
    // How it works
    howItWorks: {
      title: "Simples como 1, 2, 3",
      subtitle: "Cadastre, consulte e acompanhe cada pedido sem esforço.",
      steps: [
        {
          number: "1",
          title: "Cadastre o pedido",
          description: "Registre o item com dados do cliente, serviço, prazo e observações em segundos.",
        },
        {
          number: "2",
          title: "Consulte o status",
          description: "Busque por nome, telefone ou número e veja imediatamente em que etapa o pedido está.",
        },
        {
          number: "3",
          title: "Atualize e notifique",
          description: "Avance as etapas e o cliente recebe atualização automática por WhatsApp e e-mail.",
        },
      ],
    },
    // Demo
    demo: {
      title: "Veja a Worqera em ação",
      subtitle: "Interface limpa e intuitiva para você e sua equipe.",
    },
    // Video Demo
    videoDemo: {
      badge: "Demo ao Vivo",
      title: "Veja a Worqera em ação",
      subtitle: "Assista uma demonstração rápida de 20 segundos e entenda como transformamos a gestão de pedidos.",
      stats: [
        { value: "20 seg", label: "Demonstração rápida" },
        { value: "100%", label: "Sem enrolação" },
        { value: "0", label: "Instalação necessária" },
      ],
    },
    // Guarantee
    guarantee: {
      title: "Garantia Incondicional de 30 Dias",
      subtitle: "Teste a Worqera sem riscos. Se não transformar sua operação, devolvemos 100% do seu investimento. Sem perguntas, sem burocracia.",
      benefits: [
        {
          title: "Teste Completo",
          description: "30 dias para testar todas as funcionalidades com sua equipe",
        },
        {
          title: "Reembolso Total",
          description: "100% do valor de volta se não ficar satisfeito",
        },
        {
          title: "Suporte Dedicado",
          description: "Nossa equipe te acompanha durante todo o período",
        },
      ],
      cta: "Começar Teste Sem Risco",
      noRisk: "Garantia de 30 dias • Sem burocracia",
      whatsappMessage: "Olá! Quero conhecer a Worqera e começar meu teste de 30 dias sem risco.",
      trustIndicators: [
        "Sem contrato de fidelidade",
        "Cancele quando quiser",
        "Seus dados são seus",
      ],
    },
    // Security
    security: {
      badge: "Segurança e Conformidade",
      title: "Seus dados protegidos com máxima segurança",
      subtitle: "Conformidade total com LGPD, infraestrutura de classe mundial e proteção de dados de ponta a ponta.",
      features: [
        {
          icon: "shield",
          title: "LGPD Compliant",
          description: "100% em conformidade com a Lei Geral de Proteção de Dados",
        },
        {
          icon: "lock",
          title: "Criptografia SSL/TLS",
          description: "Todos os dados transmitidos com criptografia de nível bancário",
        },
        {
          icon: "database",
          title: "Backup Automático",
          description: "Seus dados copiados automaticamente a cada 6 horas",
        },
        {
          icon: "cloud",
          title: "Cloud Confiável",
          description: "Hospedado em infraestrutura AWS com 99.9% uptime",
        },
        {
          icon: "key",
          title: "Controle de Acesso",
          description: "Permissões granulares e autenticação de dois fatores",
        },
        {
          icon: "server",
          title: "Servidores no Brasil",
          description: "Dados armazenados em território nacional conforme LGPD",
        },
        {
          icon: "fileCheck",
          title: "Auditoria Completa",
          description: "Logs detalhados de todas as ações no sistema",
        },
        {
          icon: "shield",
          title: "Isolamento de Dados",
          description: "Cada empresa em ambiente completamente isolado",
        },
      ],
      compliance: [
        {
          title: "Conformidade LGPD",
          description: "Tratamos seus dados com total responsabilidade e transparência",
          items: [
            "Termo de consentimento claro e objetivo",
            "Direito de portabilidade dos dados",
            "Exclusão de dados sob demanda",
            "Relatório de tratamento de dados disponível",
          ],
        },
        {
          title: "Certificações e Práticas",
          description: "Seguimos os mais altos padrões da indústria",
          items: [
            "Infraestrutura AWS (ISO 27001)",
            "Backups diários automáticos",
            "Monitoramento 24/7",
            "Plano de recuperação de desastres",
          ],
        },
      ],
      techTitle: "Especificações Técnicas",
      techSpecs: [
        { label: "Uptime", value: "99.9% garantido" },
        { label: "Backup", value: "A cada 6 horas" },
        { label: "Retenção", value: "30 dias de snapshot" },
        { label: "Criptografia", value: "AES-256" },
        { label: "Região", value: "São Paulo, Brasil" },
        { label: "CDN", value: "CloudFront global" },
      ],
    },
    // Pricing
    pricing: {
      title: "Preço claro. Uma oficina, um plano.",
      subtitle: "Sem cobrança por usuário. Equipe ilimitada. 7 dias grátis para testar de verdade.",
      setup: "Implantação",
      monthly: "/mês",
      plans: [
        {
          name: "Early",
          price: "R$ 147",
          priceNote: "/mês · 12 meses",
          setup: "",
          description: "Só para as 10 primeiras oficinas — preço travado por 1 ano",
          features: [
            "Tudo do Pro incluso",
            "Kanban por setores",
            "Equipe e pedidos ilimitados",
            "TVs Cliente e Oficina",
            "Consulta pública + etiqueta",
            "Digest semanal e WhatsApp (wa.me)",
            "Suporte WhatsApp Worqera",
            "Vagas limitadas (early)",
          ],
          cta: "Garantir Early",
          popular: false,
        },
        {
          name: "Pro",
          price: "R$ 247",
          priceNote: "/mês",
          setup: "",
          description: "O plano padrão — valor justo pelo que a oficina ganha de volta",
          features: [
            "Kanban avançado por setores",
            "Usuários e pedidos ilimitados",
            "Clientes, consultas e métricas",
            "WhatsApp no fluxo (wa.me)",
            "Alertas de atraso + digest",
            "Financeiro do dono",
            "TVs + branding da oficina",
            "Suporte prioritário",
            "7 dias grátis no signup",
          ],
          cta: "Assinar Pro",
          popular: true,
        },
        {
          name: "Business",
          price: "R$ 397",
          priceNote: "/mês",
          setup: "",
          description: "Alto volume, 2ª unidade ou operação que precisa de mais mão",
          features: [
            "Tudo do Pro",
            "Prioridade máxima no suporte",
            "Onboarding assistido (1h)",
            "Condições para 2ª loja",
            "Roadmap: multi-unidade",
            "Ideal para rede / franquia leve",
          ],
          cta: "Falar com a Worqera",
          popular: false,
        },
      ],
      custom: "Anual Pro: R$ 2.470/ano (~R$ 206/mês). Setup assistido opcional: R$ 297.",
      guarantee: "7 dias grátis. Cancele quando quiser. Sem surpresa no cartão no trial.",
      roi: "Clientes recuperam o plano em poucas horas/semana a menos no WhatsApp.",
    },
    // FAQ
    faq: {
      title: "Perguntas frequentes",
      subtitle: "Ainda tem dúvidas? Fale conosco no WhatsApp.",
      items: [
        {
          question: "A Worqera serve para qualquer tipo de serviço?",
          answer:
            "Sim! Se você recebe itens ou pedidos de clientes e precisa processá-los em etapas, a Worqera se adapta ao seu fluxo. Personalize as etapas conforme sua operação.",
        },
        {
          question: "Como funciona a automação de WhatsApp?",
          answer:
            "A cada mudança de status, o cliente pode receber uma mensagem automática via WhatsApp informando o progresso do pedido. Você define quais etapas disparam notificações.",
        },
        {
          question: "Posso ter fluxos diferentes por departamento?",
          answer: "Sim! Você pode criar etapas específicas para cada área da sua operação e mover pedidos entre elas.",
        },
        {
          question: "Consigo personalizar as etapas do kanban?",
          answer: "Totalmente. Adicione, remova ou renomeie etapas para refletir exatamente como seu negócio funciona.",
        },
        {
          question: "Existe histórico de clientes e pedidos?",
          answer:
            "Sim! Você pode ver todo o histórico de um cliente, incluindo todos os pedidos anteriores, interações e observações.",
        },
        {
          question: "Posso exportar os dados?",
          answer: "Sim, você pode exportar relatórios e dados de pedidos em CSV ou PDF para análises externas.",
        },
      ],
    },
    // Final CTA
    finalCta: {
      headline: "Pronto para testar na sua oficina?",
      subheadline: "Crie a conta, veja o kanban e sinta a diferença em minutos — com oficinas que já usam no dia a dia.",
      cta: "Testar grátis",
      reassurance: "7 dias grátis · Sem cartão · Cancele quando quiser",
    },
    // Footer
    footer: {
      description: "Sistema de gestão de pedidos para negócios de serviços.",
      rights: "Todos os direitos reservados.",
    },
  },
  en: {
    // Header
    nav: {
      product: "Product",
      useCases: "Use Cases",
      features: "Features",
      howItWorks: "How It Works",
      pricing: "Pricing",
      faq: "FAQ",
    },
    cta: {
      whatsapp: "Talk on WhatsApp",
      seeHowItWorks: "See how it works",
      replyInMinutes: "Reply in minutes.",
    },
    // Hero
    hero: {
      headline: "Complete control of your orders in real time",
      subheadline:
        "Professional system that organizes your operation, eliminates lost orders and keeps your customers always informed. Save 5 hours per week and increase your business efficiency.",
      trustedBy: "Companies that trust Worqera",
    },
    // Problem
    problem: {
      title: "The chaos of uncontrolled orders",
      subtitle: "Do you recognize any of these problems?",
      items: [
        {
          title: "Orders lost in chat",
          description: "Information scattered across WhatsApp conversations, notes, and spreadsheets.",
        },
        {
          title: "No visibility",
          description: '"Where is my order?" — you can\'t answer with certainty.',
        },
        {
          title: 'Constant "what\'s the status?"',
          description: "Customers calling and messaging all the time asking about their order.",
        },
        {
          title: "Missed deadlines",
          description: "Without SLA alerts, you only discover delays when customers complain.",
        },
        {
          title: "Confusing handoffs",
          description: "Departments don't know what's been done or what's left to do.",
        },
        {
          title: "No history",
          description: "Need to know what was done for a customer? Good luck finding it.",
        },
      ],
      costTitle: "How much does this cost your business?",
      costs: [
        {
          title: "Revenue loss",
          description: "Lost orders = lost money",
        },
        {
          title: "10+ hours/week",
          description: "Wasted on rework",
        },
        {
          title: "Unhappy customers",
          description: "Complaints and customer loss",
        },
        {
          title: "Low productivity",
          description: "Lost and unmotivated team",
        },
      ],
    },
    // Solution
    solution: {
      title: "Complete visibility, from start to finish",
      subtitle: "Track every order in real time, know exactly what stage it's in, who's responsible and when it will be ready. Simplicity that transforms your operation.",
      features: [
        "Kanban view by department",
        "Complete history per order",
        "Automatic customer notifications",
        "Deadline and SLA alerts",
      ],
    },
    // ROI
    roi: {
      badge: "Proven Results",
      title: "Real impact on your operation",
      subtitle: "Companies that implemented Worqera report significant improvements in productivity and customer satisfaction.",
      metrics: [
        {
          value: "85",
          unit: "%",
          title: "Productivity increase",
          description: "Less time searching for orders, more time producing.",
        },
        {
          value: "5h",
          unit: "/week",
          title: "Time saved",
          description: "Stop answering 'Where is my order?' all the time.",
        },
        {
          value: "95",
          unit: "%",
          title: "Reduction in lost orders",
          description: "Nothing gets lost between chats and spreadsheets anymore.",
        },
        {
          value: "4.8",
          unit: "⭐",
          title: "Customer satisfaction",
          description: "Automatically updated customers are happier customers.",
        },
      ],
      bottomText: "Results based on real data from customers using Worqera.",
    },
    // Clients
    clients: {
      badge: "3 shops live · growing",
      title: "Who already uses Worqera",
      subtitle: "Real workshops every day — kanban, TV, and public order tracking.",
      companies: [
        {
          name: "A Casa do Tênis",
          industry: "Shoe Repair",
        },
        {
          name: "Sapataria Paulista",
          industry: "Shoe Repair",
        },
        {
          name: "Axisbyte",
          industry: "Worqera customer",
        },
        {
          name: "Your shop?",
          industry: "Next Early seat",
        },
      ],
      testimonials: [
        {
          quote: "It was chaos before. Now I know exactly where each order is and my customers stop calling me every 5 minutes. Worqera completely changed how we work.",
          author: "Junior Ribeiro",
          position: "Owner",
          company: "A Casa do Tênis",
        },
        {
          quote: "We implemented it in less than a week and already felt the difference. Fewer lost orders, happier customers, and a much more productive team.",
          author: "Thiago",
          position: "Manager",
          company: "Sapataria Paulista",
        },
      ],
    },
    // Features
    features: {
      title: "Features that transform your operation",
      subtitle: "Everything you need to manage orders professionally.",
      items: [
        {
          title: "Stage-based Kanban",
          description: "View all orders organized by status and department.",
        },
        {
          title: "Drag & drop",
          description: "Move orders between stages with a simple drag and drop.",
        },
        {
          title: "Smart search",
          description: "Find any order by number, ID, name, or description.",
        },
        {
          title: "SLA alerts",
          description: "Get warnings before deadlines expire.",
        },
        {
          title: "Automatic notifications",
          description: "Customers receive updates via WhatsApp and email automatically.",
        },
        {
          title: "Complete history",
          description: "Access the full history of orders and interactions for each customer.",
        },
        {
          title: "Roles and permissions",
          description: "Define who can see and do what in the system.",
        },
        {
          title: "Dashboards and metrics",
          description: "Track performance, average times, and bottlenecks in real time.",
        },
      ],
    },
    // Notifications
    notifications: {
      badge: "Automatic Communication",
      title: "Customers always informed, without you doing anything",
      subtitle: "Automatic notifications via WhatsApp and email with every status change. Your customer stays calm, you save time.",
      whatsapp: {
        title: "Automatic WhatsApp",
        subtitle: "Instant message",
        example: "Hi John! Your Nike Air sneakers are ready for pickup! 🎉\n\nOrder: #12345\nAddress: 123 Main St\nHours: Mon-Fri 9am-6pm\n\nWe're waiting for you! ✅",
      },
      email: {
        title: "Professional Email",
        subtitle: "Formal and complete communication",
        subject: "Subject: Update on your order #12345",
        example: "Hi John,\n\nWe have an update about your order! Your Nike Air Max have been completed and are ready for pickup.\n\nCheck the full details in the email below.",
      },
      emailTemplate: {
        title: "Your order has been updated! 🎉",
        greeting: "Hi John Smith,",
        statusTitle: "Status: Ready for Pickup",
        statusDescription: "Your service has been completed successfully and is awaiting your pickup.",
        orderNumber: "Order Number:",
        item: "Item:",
        itemExample: "Nike Air Max - Sole replacement",
        estimatedDate: "Expected pickup date:",
        footer: "You can pick up your order at: 123 Main St - Downtown. Business hours: Monday to Friday, 9am to 6pm.",
        disclaimer: "This is an automatic email from Worqera. You are receiving this because you have an order in progress.",
      },
      features: [
        {
          title: "Fully Customizable",
          description: "Define the text for each message according to your brand and tone of voice.",
        },
        {
          title: "Smart Triggering",
          description: "Configure which stages send notifications and which don't.",
        },
        {
          title: "Complete History",
          description: "See all notifications sent to each customer.",
        },
      ],
    },
    // Use Cases
    useCases: {
      title: "For any service business",
      subtitle: "If you receive items from customers and need to process them, Worqera is for you.",
      items: [
        { title: "Sneaker repair", icon: "👟" },
        { title: "Tailoring", icon: "🪡" },
        { title: "Luggage repair", icon: "🧳" },
        { title: "Electronics", icon: "📱" },
        { title: "Upholstery", icon: "🛋️" },
        { title: "Workshops & auto", icon: "🔧" },
        { title: "Print shops", icon: "🖨️" },
        { title: "Premium laundries", icon: "👔" },
      ],
    },
    // How it works
    howItWorks: {
      title: "Simple as 1, 2, 3",
      subtitle: "Register, check, and track every order with ease.",
      steps: [
        {
          number: "1",
          title: "Register the order",
          description: "Capture the item with customer data, service details, due date, and notes in seconds.",
        },
        {
          number: "2",
          title: "Check the status",
          description: "Search by name, phone, or order number and instantly see the current stage.",
        },
        {
          number: "3",
          title: "Update and notify",
          description: "Move stages forward and customers get automatic WhatsApp and email updates.",
        },
      ],
    },
    // Demo
    demo: {
      title: "See Worqera in action",
      subtitle: "Clean and intuitive interface for you and your team.",
    },
    // Video Demo
    videoDemo: {
      badge: "Live Demo",
      title: "See Worqera in action",
      subtitle: "Watch a quick 20-second demonstration and understand how we transform order management.",
      stats: [
        { value: "20 sec", label: "Quick demonstration" },
        { value: "100%", label: "No fluff" },
        { value: "0", label: "Installation required" },
      ],
    },
    // Guarantee
    guarantee: {
      title: "Unconditional 30-Day Guarantee",
      subtitle: "Test Worqera risk-free. If it doesn't transform your operation, we'll refund 100% of your investment. No questions, no hassle.",
      benefits: [
        {
          title: "Complete Test",
          description: "30 days to test all features with your team",
        },
        {
          title: "Full Refund",
          description: "100% money back if you're not satisfied",
        },
        {
          title: "Dedicated Support",
          description: "Our team accompanies you throughout the period",
        },
      ],
      cta: "Start Risk-Free Trial",
      noRisk: "30-day guarantee • No hassle",
      whatsappMessage: "Hi! I want to learn about Worqera and start my 30-day risk-free trial.",
      trustIndicators: [
        "No commitment contract",
        "Cancel anytime",
        "Your data is yours",
      ],
    },
    // Security
    security: {
      badge: "Security & Compliance",
      title: "Your data protected with maximum security",
      subtitle: "Full GDPR compliance, world-class infrastructure, and end-to-end data protection.",
      features: [
        {
          icon: "shield",
          title: "GDPR Compliant",
          description: "100% compliant with General Data Protection Regulation",
        },
        {
          icon: "lock",
          title: "SSL/TLS Encryption",
          description: "All data transmitted with bank-level encryption",
        },
        {
          icon: "database",
          title: "Automatic Backup",
          description: "Your data automatically copied every 6 hours",
        },
        {
          icon: "cloud",
          title: "Reliable Cloud",
          description: "Hosted on AWS infrastructure with 99.9% uptime",
        },
        {
          icon: "key",
          title: "Access Control",
          description: "Granular permissions and two-factor authentication",
        },
        {
          icon: "server",
          title: "Servers in Brazil",
          description: "Data stored in national territory per LGPD",
        },
        {
          icon: "fileCheck",
          title: "Complete Audit",
          description: "Detailed logs of all system actions",
        },
        {
          icon: "shield",
          title: "Data Isolation",
          description: "Each company in completely isolated environment",
        },
      ],
      compliance: [
        {
          title: "LGPD Compliance",
          description: "We treat your data with total responsibility and transparency",
          items: [
            "Clear and objective consent terms",
            "Right to data portability",
            "Data deletion on demand",
            "Data processing report available",
          ],
        },
        {
          title: "Certifications & Practices",
          description: "We follow the highest industry standards",
          items: [
            "AWS Infrastructure (ISO 27001)",
            "Daily automatic backups",
            "24/7 monitoring",
            "Disaster recovery plan",
          ],
        },
      ],
      techTitle: "Technical Specifications",
      techSpecs: [
        { label: "Uptime", value: "99.9% guaranteed" },
        { label: "Backup", value: "Every 6 hours" },
        { label: "Retention", value: "30-day snapshot" },
        { label: "Encryption", value: "AES-256" },
        { label: "Region", value: "São Paulo, Brazil" },
        { label: "CDN", value: "Global CloudFront" },
      ],
    },
    // Pricing
    pricing: {
      title: "Clear pricing. One shop, one plan.",
      subtitle: "No per-seat fees. Unlimited team. 7 days free to try for real.",
      setup: "Setup",
      monthly: "/month",
      plans: [
        {
          name: "Early",
          price: "R$ 147",
          priceNote: "/mo · 12 months",
          setup: "",
          description: "First 10 workshops only — locked price for 1 year",
          features: [
            "Everything in Pro",
            "Sector kanban",
            "Unlimited team & orders",
            "Client & floor TVs",
            "Public tracking + labels",
            "Weekly digest & WhatsApp (wa.me)",
            "Worqera WhatsApp support",
            "Limited early seats",
          ],
          cta: "Get Early",
          popular: false,
        },
        {
          name: "Pro",
          price: "R$ 247",
          priceNote: "/month",
          setup: "",
          description: "The standard plan — fair price for what the workshop gets back",
          features: [
            "Advanced sector kanban",
            "Unlimited users & orders",
            "Clients, lookups & metrics",
            "WhatsApp in the flow (wa.me)",
            "Delay alerts + digest",
            "Owner finance view",
            "TVs + shop branding",
            "Priority support",
            "7-day free trial on signup",
          ],
          cta: "Start Pro",
          popular: true,
        },
        {
          name: "Business",
          price: "R$ 397",
          priceNote: "/month",
          setup: "",
          description: "High volume, 2nd unit, or ops that need extra hands",
          features: [
            "Everything in Pro",
            "Top-priority support",
            "Assisted onboarding (1h)",
            "2nd-shop terms",
            "Roadmap: multi-location",
            "Fit for light networks",
          ],
          cta: "Talk to Worqera",
          popular: false,
        },
      ],
      custom: "Pro annual: R$ 2,470/year (~R$ 206/mo). Optional assisted setup: R$ 297.",
      guarantee: "7 days free. Cancel anytime. No card surprise during trial.",
      roi: "Shops recover the plan in a few hours/week saved on WhatsApp.",
    },
    // FAQ
    faq: {
      title: "Frequently asked questions",
      subtitle: "Still have questions? Talk to us on WhatsApp.",
      items: [
        {
          question: "Does Worqera work for any type of service?",
          answer:
            "Yes! If you receive items or orders from customers and need to process them in stages, Worqera adapts to your workflow. Customize stages according to your operation.",
        },
        {
          question: "How does WhatsApp automation work?",
          answer:
            "With each status change, the customer can receive an automatic WhatsApp message informing them of the order progress. You define which stages trigger notifications.",
        },
        {
          question: "Can I have different flows per department?",
          answer: "Yes! You can create specific stages for each area of your operation and move orders between them.",
        },
        {
          question: "Can I customize the kanban stages?",
          answer: "Absolutely. Add, remove, or rename stages to reflect exactly how your business works.",
        },
        {
          question: "Is there customer and order history?",
          answer:
            "Yes! You can view the full history of a customer, including all previous orders, interactions, and notes.",
        },
        {
          question: "Can I export data?",
          answer: "Yes, you can export reports and order data in CSV or PDF for external analysis.",
        },
      ],
    },
    // Final CTA
    finalCta: {
      headline: "Ready to try it in your workshop?",
      subheadline: "Create an account, open the kanban, and feel the difference in minutes — with workshops already using it daily.",
      cta: "Try free",
      reassurance: "7 days free · No card · Cancel anytime",
    },
    // Footer
    footer: {
      description: "Order management system for service businesses.",
      rights: "All rights reserved.",
    },
  },
} as const

export function getTranslation(locale: Locale) {
  return translations[locale]
}
