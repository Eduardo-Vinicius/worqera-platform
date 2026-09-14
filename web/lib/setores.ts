export const SETORES = {
  ATENDIMENTO_INICIAL: 'atendimento-inicial',
  SAPATARIA: 'sapataria',
  COSTURA: 'costura',
  LAVAGEM: 'lavagem',
  ACABAMENTO: 'acabamento',
  PINTURA: 'pintura',
  ATENDIMENTO_FINAL: 'atendimento-final',
} as const;

export const SETORES_CORES: Record<string, string> = {
  [SETORES.ATENDIMENTO_INICIAL]: '#2196F3',
  [SETORES.SAPATARIA]: '#FF9800',
  [SETORES.COSTURA]: '#9C27B0',
  [SETORES.LAVAGEM]: '#00BCD4',
  [SETORES.ACABAMENTO]: '#4CAF50',
  [SETORES.PINTURA]: '#F44336',
  [SETORES.ATENDIMENTO_FINAL]: '#4CAF50',
};

export const SETORES_NOMES: Record<string, string> = {
  [SETORES.ATENDIMENTO_INICIAL]: 'Atendimento',
  [SETORES.SAPATARIA]: 'Sapataria',
  [SETORES.COSTURA]: 'Costura',
  [SETORES.LAVAGEM]: 'Lavagem',
  [SETORES.ACABAMENTO]: 'Acabamento',
  [SETORES.PINTURA]: 'Pintura',
  [SETORES.ATENDIMENTO_FINAL]: 'Finalizado',
};

export type Setor = {
  id: string;
  nome: string;
  ordem: number;
  obrigatorio: boolean;
  cor: string;
  icone: string;
  descricao: string;
  ativo: boolean;
};

export const SETORES_PADRAO: Setor[] = [
  {
    id: 'atendimento-inicial',
    nome: 'Atendimento',
    ordem: 1,
    obrigatorio: true,
    cor: '#2196F3',
    icone: 'person',
    descricao: 'Recepção e cadastro do pedido',
    ativo: true,
  },
  {
    id: 'sapataria',
    nome: 'Sapataria',
    ordem: 2,
    obrigatorio: false,
    cor: '#FF9800',
    icone: 'build',
    descricao: 'Reparos estruturais e consertos',
    ativo: true,
  },
  {
    id: 'costura',
    nome: 'Costura',
    ordem: 3,
    obrigatorio: false,
    cor: '#9C27B0',
    icone: 'cut',
    descricao: 'Costuras e ajustes de tecido',
    ativo: true,
  },
  {
    id: 'lavagem',
    nome: 'Lavagem',
    ordem: 4,
    obrigatorio: false,
    cor: '#00BCD4',
    icone: 'water_drop',
    descricao: 'Limpeza profunda e higienização',
    ativo: true,
  },
  {
    id: 'acabamento',
    nome: 'Acabamento',
    ordem: 5,
    obrigatorio: false,
    cor: '#4CAF50',
    icone: 'auto_fix_high',
    descricao: 'Acabamentos finais e detalhes',
    ativo: true,
  },
  {
    id: 'pintura',
    nome: 'Pintura',
    ordem: 6,
    obrigatorio: false,
    cor: '#F44336',
    icone: 'brush',
    descricao: 'Pintura e customização',
    ativo: true,
  },
  {
    id: 'atendimento-final',
    nome: 'Atendimento (email)',
    ordem: 7,
    obrigatorio: true,
    cor: '#4CAF50',
    icone: 'check_circle',
    descricao: 'Finalização e entrega ao cliente (dispara notificação por e-mail)',
    ativo: true,
  },
];

export const MAX_FOTOS = 8;
