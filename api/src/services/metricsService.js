const pedidoService = require('./pedidoService');
const setorService = require('./setorService');
const { isFinalStatus } = require('../utils/orderStatus');

const CACHE_TTL_MS = Number(process.env.METRICS_CACHE_MS || 30000);
const MAX_ATRASOS_ITEMS = 50;
const DEFAULT_FUNC_LIMIT = 10;

const cache = Object.create(null);

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  const isFresh = Date.now() - entry.ts < CACHE_TTL_MS;
  return isFresh ? entry.value : null;
}

function setCache(key, value) {
  cache[key] = { ts: Date.now(), value };
}

function isAberto(pedido) {
  return !isFinalStatus(pedido.status);
}

function parseData(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeName(value) {
  const cleaned = String(value || '').trim();
  return cleaned || 'Sem responsavel';
}

function getCreatedDate(pedido) {
  return parseData(pedido.createdAt || pedido.dataCriacao || pedido.updatedAt);
}

function resolvePeriodo(filters = {}) {
  const now = new Date();
  let start = null;
  let end = null;
  const periodoRaw = String(filters.periodo || '').trim().toLowerCase();

  if (filters.dataInicio || filters.dataFim) {
    start = parseData(filters.dataInicio) || new Date(0);
    end = parseData(filters.dataFim) || now;
  } else {
    const periodMap = {
      '7d': 7,
      '15d': 15,
      '30d': 30,
      '90d': 90,
      '180d': 180,
      '1y': 365
    };

    const dias = periodMap[periodoRaw] || 30;
    start = new Date(now.getTime() - (dias * 24 * 60 * 60 * 1000));
    end = now;
  }

  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }

  return {
    start,
    end,
    label: filters.dataInicio || filters.dataFim
      ? `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
      : (periodoRaw || '30d')
  };
}

function isInsidePeriod(date, range) {
  if (!date || !range?.start || !range?.end) return false;
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function extractPedidoDespesas(pedido) {
  const directValue = toNumber(
    pedido.despesaTotal,
    pedido.despesasTotal,
    pedido.custoTotal,
    pedido.custos
  );
  if (directValue > 0) return directValue;

  if (Array.isArray(pedido.despesas)) {
    return pedido.despesas.reduce((acc, item) => {
      return acc + toNumber(item?.valor, item?.preco, item?.custo);
    }, 0);
  }

  if (pedido.despesas && typeof pedido.despesas === 'object') {
    return toNumber(pedido.despesas.total, pedido.despesas.valor);
  }

  return 0;
}

function buildFinanceiroResumo(pedidos) {
  let receitaPrevista = 0;
  let receitaRecebida = 0;
  let receitaPendente = 0;
  let despesas = 0;
  let pedidosFinalizados = 0;

  pedidos.forEach((pedido) => {
    const totalPedido = toNumber(pedido.precoTotal, pedido.preco);
    const restante = Math.max(0, toNumber(pedido.valorRestante));
    const sinal = Math.max(0, toNumber(pedido.valorSinal));
    const estimativaRecebidaPorSaldo = Math.max(0, totalPedido - restante);

    let recebido = estimativaRecebidaPorSaldo;
    if (recebido <= 0) {
      recebido = Math.min(totalPedido, sinal);
    }

    if (isFinalStatus(pedido.status)) {
      recebido = totalPedido;
      pedidosFinalizados += 1;
    }

    const pendente = Math.max(0, totalPedido - recebido);

    receitaPrevista += totalPedido;
    receitaRecebida += recebido;
    receitaPendente += pendente;
    despesas += extractPedidoDespesas(pedido);
  });

  const totalPedidos = pedidos.length;
  const ticketMedio = totalPedidos > 0 ? receitaPrevista / totalPedidos : 0;
  const lucroPrevisto = receitaPrevista - despesas;
  const lucroRealizado = receitaRecebida - despesas;
  const margemPrevista = receitaPrevista > 0 ? (lucroPrevisto / receitaPrevista) * 100 : 0;

  return {
    totalPedidos,
    pedidosFinalizados,
    pedidosEmAberto: totalPedidos - pedidosFinalizados,
    receitaPrevista,
    receitaRecebida,
    receitaPendente,
    despesas,
    lucroPrevisto,
    lucroRealizado,
    margemPrevista,
    ticketMedio
  };
}

function buildReceitaPorStatus(pedidos) {
  const map = new Map();

  pedidos.forEach((pedido) => {
    const status = String(pedido.status || 'Sem status');
    const atual = map.get(status) || {
      status,
      pedidos: 0,
      receitaPrevista: 0,
      receitaRecebida: 0
    };

    const total = toNumber(pedido.precoTotal, pedido.preco);
    const restante = Math.max(0, toNumber(pedido.valorRestante));
    const recebido = isFinalStatus(status)
      ? total
      : Math.max(0, total - restante);

    atual.pedidos += 1;
    atual.receitaPrevista += total;
    atual.receitaRecebida += recebido;
    map.set(status, atual);
  });

  return Array.from(map.values()).sort((a, b) => b.receitaPrevista - a.receitaPrevista);
}

function buildEvolucaoDiaria(pedidos) {
  const map = new Map();

  pedidos.forEach((pedido) => {
    const createdDate = getCreatedDate(pedido);
    if (!createdDate) return;

    const day = createdDate.toISOString().split('T')[0];
    const atual = map.get(day) || {
      data: day,
      pedidos: 0,
      receitaPrevista: 0,
      receitaRecebida: 0
    };

    const total = toNumber(pedido.precoTotal, pedido.preco);
    const restante = Math.max(0, toNumber(pedido.valorRestante));
    const recebido = isFinalStatus(pedido.status)
      ? total
      : Math.max(0, total - restante);

    atual.pedidos += 1;
    atual.receitaPrevista += total;
    atual.receitaRecebida += recebido;
    map.set(day, atual);
  });

  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

function buildTopServicos(pedidos, limit = 10) {
  const map = new Map();

  pedidos.forEach((pedido) => {
    const servicos = Array.isArray(pedido.servicos) ? pedido.servicos : [];

    if (servicos.length === 0) {
      const nomeLegado = String(pedido.tipoServico || 'Servico geral').trim() || 'Servico geral';
      const atual = map.get(nomeLegado) || { servico: nomeLegado, pedidos: 0, receita: 0 };
      atual.pedidos += 1;
      atual.receita += toNumber(pedido.precoTotal, pedido.preco);
      map.set(nomeLegado, atual);
      return;
    }

    servicos.forEach((servico) => {
      const nome = String(servico?.nome || 'Servico sem nome').trim() || 'Servico sem nome';
      const atual = map.get(nome) || { servico: nome, pedidos: 0, receita: 0 };
      atual.pedidos += 1;
      atual.receita += toNumber(servico?.preco);
      map.set(nome, atual);
    });
  });

  return Array.from(map.values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, limit);
}

function buildFuncionariosMetrics(pedidos) {
  const produtividadeMap = new Map();
  const tempoMap = new Map();

  pedidos.forEach((pedido) => {
    const envolvidos = new Set();
    envolvidos.add(normalizeName(pedido.funcionarioAtual));

    const historico = Array.isArray(pedido.setoresHistorico) ? pedido.setoresHistorico : [];

    historico.forEach((entrada) => {
      envolvidos.add(normalizeName(entrada.funcionarioEntrada || entrada.usuarioEntradaNome || entrada.usuarioEntrada));
      if (entrada.funcionarioSaida || entrada.usuarioSaidaNome || entrada.usuarioSaida) {
        envolvidos.add(normalizeName(entrada.funcionarioSaida || entrada.usuarioSaidaNome || entrada.usuarioSaida));
      }

      const entradaDate = parseData(entrada.entradaEm);
      const saidaDate = parseData(entrada.saidaEm);
      if (!entradaDate || !saidaDate) return;

      const duracaoMs = Math.max(0, saidaDate.getTime() - entradaDate.getTime());
      const funcionarioTempo = normalizeName(entrada.funcionarioEntrada || entrada.usuarioEntradaNome || entrada.usuarioEntrada);

      const atualTempo = tempoMap.get(funcionarioTempo) || {
        funcionarioNome: funcionarioTempo,
        etapasConcluidas: 0,
        tempoTotalMs: 0,
        pedidosUnicos: new Set()
      };

      atualTempo.etapasConcluidas += 1;
      atualTempo.tempoTotalMs += duracaoMs;
      atualTempo.pedidosUnicos.add(pedido.id);
      tempoMap.set(funcionarioTempo, atualTempo);
    });

    envolvidos.forEach((nome) => {
      const atual = produtividadeMap.get(nome) || {
        funcionarioNome: nome,
        pedidosComParticipacao: 0,
        pedidosFinalizados: 0
      };

      atual.pedidosComParticipacao += 1;
      if (isFinalStatus(pedido.status)) {
        atual.pedidosFinalizados += 1;
      }

      produtividadeMap.set(nome, atual);
    });
  });

  const topProdutivos = Array.from(produtividadeMap.values())
    .filter((item) => item.funcionarioNome !== 'Sem responsavel')
    .sort((a, b) => b.pedidosComParticipacao - a.pedidosComParticipacao);

  const topRapidos = Array.from(tempoMap.values())
    .filter((item) => item.funcionarioNome !== 'Sem responsavel' && item.etapasConcluidas > 0)
    .map((item) => ({
      funcionarioNome: item.funcionarioNome,
      etapasConcluidas: item.etapasConcluidas,
      pedidosComTempo: item.pedidosUnicos.size,
      tempoTotalMs: item.tempoTotalMs,
      tempoMedioMs: Math.round(item.tempoTotalMs / item.etapasConcluidas),
      tempoMedioHoras: Number((item.tempoTotalMs / item.etapasConcluidas / (1000 * 60 * 60)).toFixed(2))
    }))
    .sort((a, b) => a.tempoMedioMs - b.tempoMedioMs);

  return {
    topProdutivos,
    topRapidos
  };
}

async function loadPedidosAbertos() {
  const pedidos = await pedidoService.listPedidos();
  return pedidos.filter(isAberto);
}

exports.getDistribuicaoDepartamentos = async (filters = {}) => {
  const periodo = resolvePeriodo(filters);
  const cacheKey = `departamentos-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos();
  const pedidosFiltrados = pedidosAbertos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));
  const agregados = new Map();

  pedidosFiltrados.forEach(pedido => {
    const setorId = pedido.setorAtual || 'sem-setor';
    const setor = setorService.getSetor(setorId);
    const setorNome = setor?.nome || pedido.departamento || 'Sem setor';
    const atual = agregados.get(setorId) || { setorId, setorNome, total: 0 };
    atual.total += 1;
    agregados.set(setorId, atual);
  });

  const resultado = Array.from(agregados.values());
  setCache(cacheKey, resultado);
  return resultado;
};

exports.getDistribuicaoFuncionarios = async (limit = DEFAULT_FUNC_LIMIT, filters = {}) => {
  const parsedLimit = Number(limit) || DEFAULT_FUNC_LIMIT;
  const safeLimit = parsedLimit > 0 ? parsedLimit : DEFAULT_FUNC_LIMIT;
  const periodo = resolvePeriodo(filters);
  const cacheKey = `funcionarios-${safeLimit}-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pedidosAbertos = await loadPedidosAbertos();
  const pedidosFiltrados = pedidosAbertos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));
  const agregados = new Map();

  pedidosFiltrados.forEach(pedido => {
    const funcionario = (pedido.funcionarioAtual || '').trim() || 'Sem responsável';
    const atual = agregados.get(funcionario) || { funcionarioNome: funcionario, total: 0 };
    atual.total += 1;
    agregados.set(funcionario, atual);
  });

  const resultado = Array.from(agregados.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, safeLimit);

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getAtrasos = async (filters = {}) => {
  const periodo = resolvePeriodo(filters);
  const cacheKey = `atrasos-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const now = Date.now();
  const pedidosAbertos = await loadPedidosAbertos();
  const pedidosFiltrados = pedidosAbertos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));

  const atrasados = pedidosFiltrados
    .map(pedido => ({ pedido, dataPrevista: parseData(pedido.dataPrevistaEntrega) }))
    .filter(item => item.dataPrevista && item.dataPrevista.getTime() < now)
    .map(item => {
      const atrasoMs = now - item.dataPrevista.getTime();
      return { pedido: item.pedido, atrasoMs };
    })
    .sort((a, b) => b.atrasoMs - a.atrasoMs);

  const totalAtrasados = atrasados.length;
  const atrasoMedioMs = totalAtrasados === 0
    ? 0
    : Math.round(atrasados.reduce((acc, item) => acc + item.atrasoMs, 0) / totalAtrasados);

  const itens = atrasados.slice(0, MAX_ATRASOS_ITEMS).map(({ pedido }) => ({
    id: pedido.id,
    codigo: pedido.codigo,
    status: pedido.status,
    funcionarioAtual: pedido.funcionarioAtual || null,
    dataPrevistaEntrega: pedido.dataPrevistaEntrega || null,
    diasAtraso: Math.floor((now - parseData(pedido.dataPrevistaEntrega).getTime()) / (1000 * 60 * 60 * 24))
  }));

  const resultado = {
    totalAtrasados,
    atrasoMedioMs,
    atrasoMedioHoras: Number((atrasoMedioMs / (1000 * 60 * 60)).toFixed(2)),
    itens
  };

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getResumo = async (filters = {}) => {
  const periodo = resolvePeriodo(filters);
  const cacheKey = `resumo-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const now = Date.now();
  const pedidos = await pedidoService.listPedidos();
  const pedidosFiltrados = pedidos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));

  let total = 0;
  let finalizados = 0;
  let atrasados = 0;
  let noPrazo = 0;

  pedidosFiltrados.forEach(pedido => {
    total += 1;
    if (isFinalStatus(pedido.status)) {
      finalizados += 1;
      return;
    }

    const dataPrevista = parseData(pedido.dataPrevistaEntrega);
    if (!dataPrevista) return;

    if (dataPrevista.getTime() < now) {
      atrasados += 1;
    } else {
      noPrazo += 1;
    }
  });

  const abertos = total - finalizados;
  const taxaAtraso = abertos > 0 ? Number(((atrasados / abertos) * 100).toFixed(2)) : 0;

  const resultado = {
    total,
    abertos,
    finalizados,
    atrasados,
    noPrazo,
    taxaAtraso,
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label
    }
  };

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getFinanceiro = async (filters = {}) => {
  const periodo = resolvePeriodo(filters);
  const cacheKey = `financeiro-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pedidos = await pedidoService.listPedidos();
  const pedidosFiltrados = pedidos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));

  const resumo = buildFinanceiroResumo(pedidosFiltrados);
  const receitaPorStatus = buildReceitaPorStatus(pedidosFiltrados);
  const evolucaoDiaria = buildEvolucaoDiaria(pedidosFiltrados);
  const topServicos = buildTopServicos(pedidosFiltrados, Number(filters.limitServicos) || 10);

  const resultado = {
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label
    },
    resumo,
    receitaPorStatus,
    topServicos,
    evolucaoDiaria
  };

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getDesempenhoFuncionarios = async (limit = DEFAULT_FUNC_LIMIT, filters = {}) => {
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_FUNC_LIMIT);
  const periodo = resolvePeriodo(filters);
  const cacheKey = `desempenho-funcionarios-${safeLimit}-${periodo.label}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const pedidos = await pedidoService.listPedidos();
  const pedidosFiltrados = pedidos.filter((pedido) => isInsidePeriod(getCreatedDate(pedido), periodo));
  const metrics = buildFuncionariosMetrics(pedidosFiltrados);

  const resultado = {
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label
    },
    topFuncionariosPorPedidos: metrics.topProdutivos.slice(0, safeLimit),
    topFuncionariosMaisRapidos: metrics.topRapidos.slice(0, safeLimit)
  };

  setCache(cacheKey, resultado);
  return resultado;
};

exports.getOverview = async (options = {}) => {
  const { limit } = options;
  const [resumo, atrasos, financeiro, funcionarios] = await Promise.all([
    exports.getResumo(options),
    exports.getAtrasos(options),
    exports.getFinanceiro(options),
    exports.getDesempenhoFuncionarios(limit, options)
  ]);

  return {
    resumo,
    atrasos,
    financeiro,
    funcionarios
  };
};
