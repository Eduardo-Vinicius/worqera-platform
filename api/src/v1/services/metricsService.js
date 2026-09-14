const Order = require('../models/Order');
const Sector = require('../models/Sector');
const Employee = require('../models/Employee');

const FINAL_STATUSES = new Set(['delivered', 'cancelled']);
const DEFAULT_FUNC_LIMIT = 10;
const MAX_ATRASOS_ITEMS = 50;

function isFinalStatus(status) {
  return FINAL_STATUSES.has(String(status || ''));
}

function isOpen(order) {
  return !isFinalStatus(order.status);
}

function toNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseData(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolvePeriodo(filters = {}) {
  const now = new Date();
  let start = null;
  let end = null;
  const periodoRaw = String(filters.periodo || '').trim().toLowerCase();

  if (filters.dataInicio || filters.dataFim) {
    start = parseData(filters.dataInicio) || new Date(0);
    end = parseData(filters.dataFim) || now;
    if (filters.dataFim && !String(filters.dataFim).includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else {
    const periodMap = { '7d': 7, '15d': 15, '30d': 30, '90d': 90, '180d': 180, '1y': 365 };
    const dias = periodMap[periodoRaw] || 30;
    start = new Date(now.getTime() - dias * 24 * 60 * 60 * 1000);
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
    label:
      filters.dataInicio || filters.dataFim
        ? `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`
        : periodoRaw || '30d',
  };
}

function isInsidePeriod(date, range) {
  if (!date || !range?.start || !range?.end) return false;
  const time = date.getTime();
  return time >= range.start.getTime() && time <= range.end.getTime();
}

async function loadOrders(shopId, { openOnly = false } = {}) {
  const filter = { shopId };
  if (openOnly) filter.status = { $nin: ['delivered', 'cancelled'] };
  return Order.find(filter).lean();
}

function orderTotal(order) {
  return toNumber(order.pricing?.total, order.precoTotal);
}

function orderDeposit(order) {
  return toNumber(order.pricing?.deposit);
}

function orderRemaining(order) {
  return toNumber(order.pricing?.remaining, Math.max(0, orderTotal(order) - orderDeposit(order)));
}

function orderExpenses(order) {
  return toNumber(order.pricing?.expenses);
}

function buildFinanceiroResumo(orders) {
  let receitaPrevista = 0;
  let receitaRecebida = 0;
  let receitaPendente = 0;
  let despesas = 0;
  let pedidosFinalizados = 0;

  orders.forEach((order) => {
    const totalPedido = orderTotal(order);
    const restante = Math.max(0, orderRemaining(order));
    let recebido = Math.max(0, totalPedido - restante);
    if (recebido <= 0) recebido = Math.min(totalPedido, orderDeposit(order));
    if (isFinalStatus(order.status)) {
      recebido = totalPedido;
      pedidosFinalizados += 1;
    }
    const pendente = Math.max(0, totalPedido - recebido);
    receitaPrevista += totalPedido;
    receitaRecebida += recebido;
    receitaPendente += pendente;
    despesas += orderExpenses(order);
  });

  const totalPedidos = orders.length;
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
    ticketMedio,
  };
}

function buildReceitaPorStatus(orders) {
  const map = new Map();
  orders.forEach((order) => {
    const status = String(order.status || 'Sem status');
    const atual = map.get(status) || {
      status,
      pedidos: 0,
      receitaPrevista: 0,
      receitaRecebida: 0,
    };
    const total = orderTotal(order);
    const restante = Math.max(0, orderRemaining(order));
    const recebido = isFinalStatus(status) ? total : Math.max(0, total - restante);
    atual.pedidos += 1;
    atual.receitaPrevista += total;
    atual.receitaRecebida += recebido;
    map.set(status, atual);
  });
  return Array.from(map.values()).sort((a, b) => b.receitaPrevista - a.receitaPrevista);
}

function buildEvolucaoDiaria(orders) {
  const map = new Map();
  orders.forEach((order) => {
    const created = parseData(order.createdAt);
    if (!created) return;
    const day = created.toISOString().split('T')[0];
    const atual = map.get(day) || { data: day, pedidos: 0, receitaPrevista: 0, receitaRecebida: 0 };
    const total = orderTotal(order);
    const restante = Math.max(0, orderRemaining(order));
    const recebido = isFinalStatus(order.status) ? total : Math.max(0, total - restante);
    atual.pedidos += 1;
    atual.receitaPrevista += total;
    atual.receitaRecebida += recebido;
    map.set(day, atual);
  });
  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

function buildTopServicos(orders, limit = 10) {
  const map = new Map();
  orders.forEach((order) => {
    const services = Array.isArray(order.services) ? order.services : [];
    if (!services.length) {
      const nome = 'Servico geral';
      const atual = map.get(nome) || { servico: nome, pedidos: 0, receita: 0 };
      atual.pedidos += 1;
      atual.receita += orderTotal(order);
      map.set(nome, atual);
      return;
    }
    services.forEach((s) => {
      const nome = String(s.name || 'Servico sem nome').trim() || 'Servico sem nome';
      const atual = map.get(nome) || { servico: nome, pedidos: 0, receita: 0 };
      atual.pedidos += 1;
      atual.receita += toNumber(s.price);
      map.set(nome, atual);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => b.receita - a.receita)
    .slice(0, limit);
}

async function getDistribuicaoDepartamentos(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const [orders, sectors] = await Promise.all([
    loadOrders(shopId, { openOnly: true }),
    Sector.find({ shopId }).lean(),
  ]);
  const sectorMap = new Map(sectors.map((s) => [String(s._id), s.name]));
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const agregados = new Map();

  filtrados.forEach((order) => {
    const setorId = order.currentSectorId ? String(order.currentSectorId) : 'sem-setor';
    const atual = agregados.get(setorId) || {
      setorId,
      setorNome: sectorMap.get(setorId) || 'Sem setor',
      total: 0,
    };
    atual.total += 1;
    agregados.set(setorId, atual);
  });

  return Array.from(agregados.values());
}

async function getDistribuicaoFuncionarios(shopId, limit = DEFAULT_FUNC_LIMIT, filters = {}) {
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_FUNC_LIMIT);
  const periodo = resolvePeriodo(filters);
  const [orders, employees] = await Promise.all([
    loadOrders(shopId, { openOnly: true }),
    Employee.find({ shopId }).lean(),
  ]);
  const empMap = new Map(employees.map((e) => [String(e._id), e.name]));
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const agregados = new Map();

  filtrados.forEach((order) => {
    const empId = order.assigneeEmployeeId ? String(order.assigneeEmployeeId) : null;
    const nome = empId ? empMap.get(empId) || 'Desconhecido' : 'Sem responsavel';
    const atual = agregados.get(nome) || { funcionarioNome: nome, total: 0 };
    atual.total += 1;
    agregados.set(nome, atual);
  });

  return Array.from(agregados.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, safeLimit);
}

async function getAtrasos(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const now = Date.now();
  const orders = await loadOrders(shopId, { openOnly: true });
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const atrasados = filtrados
    .map((order) => ({ order, dataPrevista: parseData(order.dueAt) }))
    .filter((item) => item.dataPrevista && item.dataPrevista.getTime() < now)
    .map((item) => ({ order: item.order, atrasoMs: now - item.dataPrevista.getTime() }))
    .sort((a, b) => b.atrasoMs - a.atrasoMs);

  const totalAtrasados = atrasados.length;
  const atrasoMedioMs =
    totalAtrasados === 0
      ? 0
      : Math.round(atrasados.reduce((acc, item) => acc + item.atrasoMs, 0) / totalAtrasados);

  return {
    totalAtrasados,
    atrasoMedioMs,
    atrasoMedioHoras: Number((atrasoMedioMs / (1000 * 60 * 60)).toFixed(2)),
    itens: atrasados.slice(0, MAX_ATRASOS_ITEMS).map(({ order }) => ({
      id: String(order._id),
      codigo: order.code,
      status: order.status,
      funcionarioAtual: order.assigneeEmployeeId || null,
      dataPrevistaEntrega: order.dueAt || null,
      diasAtraso: Math.floor((now - parseData(order.dueAt).getTime()) / (1000 * 60 * 60 * 24)),
    })),
  };
}

async function getResumo(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const now = Date.now();
  const orders = await loadOrders(shopId);
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));

  let total = 0;
  let finalizados = 0;
  let atrasados = 0;
  let noPrazo = 0;

  filtrados.forEach((order) => {
    total += 1;
    if (isFinalStatus(order.status)) {
      finalizados += 1;
      return;
    }
    const dataPrevista = parseData(order.dueAt);
    if (!dataPrevista) return;
    if (dataPrevista.getTime() < now) atrasados += 1;
    else noPrazo += 1;
  });

  const abertos = total - finalizados;
  return {
    total,
    abertos,
    finalizados,
    atrasados,
    noPrazo,
    taxaAtraso: abertos > 0 ? Number(((atrasados / abertos) * 100).toFixed(2)) : 0,
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label,
    },
  };
}

async function getFinanceiro(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const orders = await loadOrders(shopId);
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));

  return {
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label,
    },
    resumo: buildFinanceiroResumo(filtrados),
    receitaPorStatus: buildReceitaPorStatus(filtrados),
    topServicos: buildTopServicos(filtrados, Number(filters.limitServicos) || 10),
    evolucaoDiaria: buildEvolucaoDiaria(filtrados),
  };
}

async function getDesempenhoFuncionarios(shopId, limit = DEFAULT_FUNC_LIMIT, filters = {}) {
  const safeLimit = Math.max(1, Number(limit) || DEFAULT_FUNC_LIMIT);
  const periodo = resolvePeriodo(filters);
  const [orders, employees] = await Promise.all([
    loadOrders(shopId),
    Employee.find({ shopId }).lean(),
  ]);
  const empMap = new Map(employees.map((e) => [String(e._id), e.name]));
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const produtividade = new Map();

  filtrados.forEach((order) => {
    const names = new Set();
    if (order.assigneeEmployeeId) {
      names.add(empMap.get(String(order.assigneeEmployeeId)) || 'Desconhecido');
    }
    (order.sectorHistory || []).forEach((h) => {
      if (h.employeeName) names.add(h.employeeName);
    });
    if (!names.size) names.add('Sem responsavel');
    names.forEach((nome) => {
      const atual = produtividade.get(nome) || {
        funcionarioNome: nome,
        pedidosComParticipacao: 0,
        pedidosFinalizados: 0,
      };
      atual.pedidosComParticipacao += 1;
      if (isFinalStatus(order.status)) atual.pedidosFinalizados += 1;
      produtividade.set(nome, atual);
    });
  });

  const top = Array.from(produtividade.values())
    .filter((i) => i.funcionarioNome !== 'Sem responsavel')
    .sort((a, b) => b.pedidosComParticipacao - a.pedidosComParticipacao);

  return {
    periodo: {
      inicio: periodo.start.toISOString().split('T')[0],
      fim: periodo.end.toISOString().split('T')[0],
      referencia: periodo.label,
    },
    topFuncionariosPorPedidos: top.slice(0, safeLimit),
    topFuncionariosMaisRapidos: [],
  };
}

async function getOverview(shopId, options = {}) {
  const [resumo, atrasos, financeiro, funcionarios] = await Promise.all([
    getResumo(shopId, options),
    getAtrasos(shopId, options),
    getFinanceiro(shopId, options),
    getDesempenhoFuncionarios(shopId, options.limit, options),
  ]);
  return { resumo, atrasos, financeiro, funcionarios };
}

module.exports = {
  getDistribuicaoDepartamentos,
  getDistribuicaoFuncionarios,
  getAtrasos,
  getResumo,
  getFinanceiro,
  getDesempenhoFuncionarios,
  getOverview,
  isOpen,
};
