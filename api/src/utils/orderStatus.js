const ORDER_STATUS = Object.freeze({
  ATENDIMENTO_RECEBIDO: 'Atendimento - Recebido',
  ATENDIMENTO_ORCADO: 'Atendimento - Orçado',
  ATENDIMENTO_APROVADO: 'Atendimento - Aprovado',
  LAVAGEM_A_FAZER: 'Lavagem - A Fazer',
  LAVAGEM_EM_ANDAMENTO: 'Lavagem - Em Andamento',
  LAVAGEM_CONCLUIDO: 'Lavagem - Concluído',
  PINTURA_A_FAZER: 'Pintura - A Fazer',
  PINTURA_EM_ANDAMENTO: 'Pintura - Em Andamento',
  PINTURA_CONCLUIDO: 'Pintura - Concluído',
  ACABAMENTO_A_FAZER: 'Acabamento - A Fazer',
  ACABAMENTO_EM_ANDAMENTO: 'Acabamento - Em Andamento',
  ACABAMENTO_CONCLUIDO: 'Acabamento - Concluído',
  COSTURA_A_FAZER: 'Costura - A Fazer',
  COSTURA_EM_ANDAMENTO: 'Costura - Em Andamento',
  COSTURA_CONCLUIDO: 'Costura - Concluído',
  SAPATARIA_A_FAZER: 'Sapataria - A Fazer',
  SAPATARIA_EM_ANDAMENTO: 'Sapataria - Em Andamento',
  SAPATARIA_CONCLUIDO: 'Sapataria - Concluído',
  ATENDIMENTO_FINALIZADO: 'Atendimento - Finalizado',
  ATENDIMENTO_ENTREGUE: 'Atendimento - Entregue'
});

const ROLE_STATUS_KEYS = Object.freeze({
  admin: Object.values(ORDER_STATUS),
  lavagem: [
    ORDER_STATUS.LAVAGEM_A_FAZER,
    ORDER_STATUS.LAVAGEM_EM_ANDAMENTO,
    ORDER_STATUS.LAVAGEM_CONCLUIDO
  ],
  pintura: [
    ORDER_STATUS.PINTURA_A_FAZER,
    ORDER_STATUS.PINTURA_EM_ANDAMENTO,
    ORDER_STATUS.PINTURA_CONCLUIDO
  ],
  acabamento: [
    ORDER_STATUS.ACABAMENTO_A_FAZER,
    ORDER_STATUS.ACABAMENTO_EM_ANDAMENTO,
    ORDER_STATUS.ACABAMENTO_CONCLUIDO
  ],
  costura: [
    ORDER_STATUS.COSTURA_A_FAZER,
    ORDER_STATUS.COSTURA_EM_ANDAMENTO,
    ORDER_STATUS.COSTURA_CONCLUIDO
  ],
  sapataria: [
    ORDER_STATUS.SAPATARIA_A_FAZER,
    ORDER_STATUS.SAPATARIA_EM_ANDAMENTO,
    ORDER_STATUS.SAPATARIA_CONCLUIDO
  ],
  atendimento: [
    ORDER_STATUS.ATENDIMENTO_RECEBIDO,
    ORDER_STATUS.ATENDIMENTO_ORCADO,
    ORDER_STATUS.ATENDIMENTO_APROVADO,
    ORDER_STATUS.ATENDIMENTO_FINALIZADO,
    ORDER_STATUS.ATENDIMENTO_ENTREGUE
  ]
});

const FINAL_STATUS_CANONICOS = new Set([
  ORDER_STATUS.ATENDIMENTO_FINALIZADO,
  ORDER_STATUS.ATENDIMENTO_ENTREGUE
]);

function slugifyStatus(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

const STATUS_ALIAS = new Map();

function addAlias(alias, canonical) {
  STATUS_ALIAS.set(slugifyStatus(alias), canonical);
}

Object.values(ORDER_STATUS).forEach((status) => {
  addAlias(status, status);
});

addAlias('criado', ORDER_STATUS.ATENDIMENTO_RECEBIDO);
addAlias('created', ORDER_STATUS.ATENDIMENTO_RECEBIDO);
addAlias('iniciado', ORDER_STATUS.ATENDIMENTO_RECEBIDO);
addAlias('atendimento - aguardando aprovação', ORDER_STATUS.ATENDIMENTO_ORCADO);
addAlias('atendimento - aguardando aprovacao', ORDER_STATUS.ATENDIMENTO_ORCADO);
addAlias('finalizado', ORDER_STATUS.ATENDIMENTO_FINALIZADO);
addAlias('concluido', ORDER_STATUS.ATENDIMENTO_FINALIZADO);
addAlias('pronto para retirada', ORDER_STATUS.ATENDIMENTO_FINALIZADO);
addAlias('aguardando retirada', ORDER_STATUS.ATENDIMENTO_FINALIZADO);
addAlias('entregue', ORDER_STATUS.ATENDIMENTO_ENTREGUE);

function normalizeStatus(status, options = {}) {
  const { strict = false, fallback = ORDER_STATUS.ATENDIMENTO_RECEBIDO } = options;

  if (status === null || status === undefined || status === '') {
    return fallback;
  }

  const original = String(status).trim();
  if (!original) {
    return fallback;
  }

  const canonical = STATUS_ALIAS.get(slugifyStatus(original));
  if (canonical) {
    return canonical;
  }

  if (strict) {
    throw new Error(`Status inválido: ${original}`);
  }

  return original;
}

function isFinalStatus(status) {
  const normalized = normalizeStatus(status, { strict: false, fallback: '' });

  if (FINAL_STATUS_CANONICOS.has(normalized)) {
    return true;
  }

  const slug = slugifyStatus(status);
  return (
    slug.includes('finalizado') ||
    slug.includes('concluido') ||
    slug.includes('pronto para retirada') ||
    slug.includes('aguardando retirada')
  );
}

function getStatusColumnsByRole(role) {
  const statusList = ROLE_STATUS_KEYS[role];
  if (!statusList) return null;

  return statusList.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});
}

function getAllStatusColumns() {
  return ROLE_STATUS_KEYS.admin.reduce((acc, status) => {
    acc[status] = [];
    return acc;
  }, {});
}

function getStatusBySetor(setor) {
  if (!setor || !setor.nome) {
    return ORDER_STATUS.ATENDIMENTO_RECEBIDO;
  }

  if (setor.id === 'atendimento-final') {
    return ORDER_STATUS.ATENDIMENTO_FINALIZADO;
  }

  return normalizeStatus(`${setor.nome} - Em Andamento`, {
    strict: false,
    fallback: `${setor.nome} - Em Andamento`
  });
}

function isKnownStatus(status) {
  const slug = slugifyStatus(status);
  return STATUS_ALIAS.has(slug);
}

module.exports = {
  ORDER_STATUS,
  ROLE_STATUS_KEYS,
  normalizeStatus,
  isFinalStatus,
  getStatusColumnsByRole,
  getAllStatusColumns,
  getStatusBySetor,
  isKnownStatus,
  slugifyStatus
};
