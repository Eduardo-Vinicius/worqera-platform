// Modelo de pedido para shoe repair
module.exports = {
  id: String,
  codigo: String, // Código sequencial legível ultra-curto (ex: 160126-001 = DDMMYY-SEQ)
  clienteId: String,
  clientName: String, // Nome do cliente
  clientPhone: String, // Telefone do cliente para WhatsApp (com código país, ex: 5511999999999)
  modeloTenis: String,
  servicos: [{ // Nova estrutura de serviços
    id: String,
    nome: String,
    preco: Number,
    descricao: String
  }],
  fotos: [String], // URLs do S3
  precoTotal: Number, // Preço total dos serviços
  valorSinal: Number, // Valor do sinal pago
  valorRestante: Number, // Valor restante a ser pago
  dataPrevistaEntrega: String, // ISO date
  dataEntregaReal: String, // ISO date - quando o pedido foi entregue
  departamento: String, // Departamento responsável
  observacoes: String, // Observações gerais
  garantia: { // Informações da garantia
    ativa: Boolean,
    preco: Number,
    duracao: String,
    data: String
  },
  acessorios: [String], // Lista de acessórios
  prioridade: Number, // 1 = Alta (I), 2 = Média (II), 3 = Baixa (III), padrão = 2
  status: String, // Enum
  dataCriacao: String, // ISO date
  createdAt: String, // ISO date
  updatedAt: String, // ISO date
  updatedBy: String, // Email/ID do usuário que fez última atualização
  pdfUrl: String, // URL do PDF gerado no S3
  statusHistory: [{ // Histórico de mudanças de status
    status: String,
    date: String,
    time: String,
    userId: String,
    userName: String
  }],
  // Campos do criador do pedido
  createdBy: { // Informações de quem criou o pedido
    userId: String,
    userName: String,
    userEmail: String,
    userRole: String
  },
  // Campos do sistema de setores
  setoresFluxo: [String], // Array de IDs de setores que o pedido vai passar (ex: ['atendimento-inicial', 'lavagem', 'acabamento', 'atendimento-final'])
  setorAtual: String, // ID do setor atual onde o pedido está
  setoresHistorico: [{ // Histórico de passagem pelos setores
    setorId: String,
    setorNome: String,
    entradaEm: String, // ISO date - quando entrou no setor
    saidaEm: String, // ISO date - quando saiu do setor (null se ainda está)
    usuarioEntrada: String, // Email do usuário que moveu para este setor
    usuarioEntradaNome: String, // Nome do usuário
    funcionarioEntrada: String, // Nome do funcionário que moveu (informado manualmente)
    usuarioSaida: String, // Email do usuário que moveu para o próximo setor
    usuarioSaidaNome: String, // Nome do usuário
    funcionarioSaida: String, // Nome do funcionário que moveu para o próximo setor
    observacoes: String
  }],
  // Campos antigos mantidos para compatibilidade
  tipoServico: String, // Enum (deprecated)
  descricaoServicos: String, // (deprecated)
  preco: Number // (deprecated)
};
