// Modelo de setor para controle de fluxo de pedidos
module.exports = {
  id: String,
  nome: String,
  ordem: Number,        // Ordem no fluxo (1, 2, 3...)
  obrigatorio: Boolean, // Se é obrigatório no fluxo
  cor: String,          // Cor para UI (ex: #4CAF50)
  icone: String,        // Ícone para UI (ex: 'person', 'build', 'wash')
  descricao: String,    // Descrição do que acontece neste setor
  ativo: Boolean        // Se o setor está ativo
};

// Setores padrão do sistema
const SETORES_PADRAO = [
  {
    id: 'atendimento-inicial',
    nome: 'Atendimento',
    ordem: 1,
    obrigatorio: true,
    cor: '#2196F3',
    icone: 'person',
    descricao: 'Recepção e cadastro do pedido',
    ativo: true
  },
  {
    id: 'sapataria',
    nome: 'Sapataria',
    ordem: 2,
    obrigatorio: false,
    cor: '#FF9800',
    icone: 'build',
    descricao: 'Reparos estruturais e consertos',
    ativo: true
  },
  {
    id: 'costura',
    nome: 'Costura',
    ordem: 3,
    obrigatorio: false,
    cor: '#9C27B0',
    icone: 'cut',
    descricao: 'Costuras e ajustes de tecido',
    ativo: true
  },
  {
    id: 'lavagem',
    nome: 'Lavagem',
    ordem: 4,
    obrigatorio: false,
    cor: '#00BCD4',
    icone: 'water_drop',
    descricao: 'Limpeza profunda e higienização',
    ativo: true
  },
  {
    id: 'acabamento',
    nome: 'Acabamento',
    ordem: 5,
    obrigatorio: false,
    cor: '#4CAF50',
    icone: 'auto_fix_high',
    descricao: 'Acabamentos finais e detalhes',
    ativo: true
  },
  {
    id: 'pintura',
    nome: 'Pintura',
    ordem: 6,
    obrigatorio: false,
    cor: '#F44336',
    icone: 'brush',
    descricao: 'Pintura e customização',
    ativo: true
  },
  {
    id: 'atendimento-final',
    nome: 'Atendimento (email)',
    ordem: 7,
    obrigatorio: true,
    cor: '#4CAF50',
    icone: 'check_circle',
    descricao: 'Finalização e entrega ao cliente (dispara notificação por e-mail)',
    ativo: true
  }
];

module.exports.SETORES_PADRAO = SETORES_PADRAO;
