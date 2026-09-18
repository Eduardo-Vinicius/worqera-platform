const Order = require('../models/Order');
const Sector = require('../models/Sector');
const Employee = require('../models/Employee');

const FINAL_STATUSES = new Set(['delivered', 'cancelled']);
const DEFAULT_FUNC_LIMIT = 10;
const MAX_ATRASOS_ITEMS = 50;

const STATUS_LABELS = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

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

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isSameLocalDay(date, ref = new Date()) {
  if (!date) return false;
  return startOfLocalDay(date).getTime() === startOfLocalDay(ref).getTime();
}

function resolvePeriodo(filters = {}) {
  const now = new Date();
  let start = null;
  let end = null;
  const periodoRaw = String(filters.periodo || filters.period || '').trim().toLowerCase();

  if (filters.dataInicio || filters.dataFim || filters.startDate || filters.endDate) {
    start = parseData(filters.dataInicio || filters.startDate) || new Date(0);
    end = parseData(filters.dataFim || filters.endDate) || now;
    const endRaw = String(filters.dataFim || filters.endDate || '');
    if (endRaw && !endRaw.includes('T')) {
      end.setHours(23, 59, 59, 999);
    }
  } else if (periodoRaw === 'today' || periodoRaw === 'hoje' || periodoRaw === '1d') {
    start = startOfLocalDay(now);
    end = endOfLocalDay(now);
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
      filters.dataInicio || filters.dataFim || filters.startDate || filters.endDate
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

function orderReceived(order) {
  const total = orderTotal(order);
  if (String(order.status) === 'delivered') return total;
  if (String(order.status) === 'cancelled') return Math.min(total, orderDeposit(order));
  const restante = Math.max(0, orderRemaining(order));
  let recebido = Math.max(0, total - restante);
  if (recebido <= 0) recebido = Math.min(total, orderDeposit(order));
  return recebido;
}

function flattenOrderServices(order) {
  const fromItems = [];
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      if (Array.isArray(item?.services)) {
        for (const s of item.services) fromItems.push(s);
      }
    }
  }
  if (fromItems.length) return fromItems;
  if (Array.isArray(order.services) && order.services.length) return order.services;
  if (Array.isArray(order.servicos) && order.servicos.length) return order.servicos;
  return [];
}

function statusLabel(status) {
  const key = String(status || '');
  return STATUS_LABELS[key] || key || 'Sem status';
}

function buildFinanceiroResumo(orders) {
  let receitaPrevista = 0;
  let receitaRecebida = 0;
  let receitaPendente = 0;
  let despesas = 0;
  let pedidosFinalizados = 0;

  orders.forEach((order) => {
    const totalPedido = orderTotal(order);
    const recebido = orderReceived(order);
    if (String(order.status) === 'delivered') pedidosFinalizados += 1;
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
    totalOrders: totalPedidos,
    completedOrders: pedidosFinalizados,
    openOrders: totalPedidos - pedidosFinalizados,
    expectedRevenue: receitaPrevista,
    receivedRevenue: receitaRecebida,
    pendingRevenue: receitaPendente,
    expenses: despesas,
    expectedProfit: lucroPrevisto,
    realizedProfit: lucroRealizado,
    expectedMargin: margemPrevista,
    averageTicket: ticketMedio,
  };
}

function buildReceitaPorStatus(orders) {
  const map = new Map();
  orders.forEach((order) => {
    const status = statusLabel(order.status);
    const atual = map.get(status) || {
      status,
      orders: 0,
      expectedRevenue: 0,
      receivedRevenue: 0,
    };
    const total = orderTotal(order);
    const recebido = orderReceived(order);
    atual.orders += 1;
    atual.expectedRevenue += total;
    atual.receivedRevenue += recebido;
    map.set(status, atual);
  });
  return Array.from(map.values()).sort((a, b) => b.expectedRevenue - a.expectedRevenue);
}

function buildEvolucaoDiaria(orders) {
  const map = new Map();
  orders.forEach((order) => {
    const created = parseData(order.createdAt);
    if (!created) return;
    const day = created.toISOString().split('T')[0];
    const atual = map.get(day) || { date: day, orders: 0, expectedRevenue: 0, receivedRevenue: 0 };
    const total = orderTotal(order);
    const recebido = orderReceived(order);
    atual.orders += 1;
    atual.expectedRevenue += total;
    atual.receivedRevenue += recebido;
    map.set(day, atual);
  });
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function buildTopServicos(orders, limit = 10) {
  const map = new Map();
  orders.forEach((order) => {
    const services = flattenOrderServices(order);
    if (!services.length) {
      const nome = 'Sem serviço';
      const atual = map.get(nome) || { service: nome, orders: 0, revenue: 0 };
      atual.orders += 1;
      atual.revenue += orderTotal(order);
      map.set(nome, atual);
      return;
    }
    services.forEach((s) => {
      const nome = String(s.name || s.nome || 'Serviço').trim() || 'Serviço';
      const atual = map.get(nome) || { service: nome, orders: 0, revenue: 0 };
      atual.orders += 1;
      atual.revenue += toNumber(s.price, s.preco);
      map.set(nome, atual);
    });
  });
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

/** Snapshot operacional do dia (independente do filtro de período). */
function buildCaixaHoje(orders) {
  const now = new Date();
  let deliveredToday = 0;
  let deliveredCount = 0;
  let depositsToday = 0;
  let depositsCount = 0;
  let readyToCollect = 0;
  let readyCount = 0;
  let openPipeline = 0;
  let openCount = 0;

  orders.forEach((order) => {
    const status = String(order.status || '');
    const total = orderTotal(order);
    const deposit = orderDeposit(order);
    const remaining = Math.max(0, orderRemaining(order));
    const created = parseData(order.createdAt);
    const deliveredAt = parseData(order.deliveredAt);

    if (
      status === 'delivered' &&
      (isSameLocalDay(deliveredAt, now) || (!deliveredAt && isSameLocalDay(created, now)))
    ) {
      deliveredToday += total;
      deliveredCount += 1;
    }

    if (isSameLocalDay(created, now) && deposit > 0) {
      depositsToday += deposit;
      depositsCount += 1;
    }

    if (status === 'ready') {
      readyToCollect += remaining > 0 ? remaining : total;
      readyCount += 1;
    }

    if (!isFinalStatus(status)) {
      openPipeline += remaining;
      openCount += 1;
    }
  });

  return {
    date: startOfLocalDay(now).toISOString().split('T')[0],
    deliveredToday,
    deliveredCount,
    depositsToday,
    depositsCount,
    readyToCollect,
    readyCount,
    openPipeline,
    openCount,
    cashInToday: deliveredToday + depositsToday,
  };
}

function periodInfo(periodo) {
  return {
    start: periodo.start.toISOString().split('T')[0],
    end: periodo.end.toISOString().split('T')[0],
    label: periodo.label,
  };
}

async function getDepartmentDistribution(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const [orders, sectors] = await Promise.all([
    loadOrders(shopId, { openOnly: true }),
    Sector.find({ shopId }).lean(),
  ]);
  const sectorMap = new Map(sectors.map((s) => [String(s._id), s.name]));
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const agregados = new Map();

  filtrados.forEach((order) => {
    const sectorId = order.currentSectorId ? String(order.currentSectorId) : 'no-sector';
    const atual = agregados.get(sectorId) || {
      sectorId,
      sectorName: sectorMap.get(sectorId) || 'No sector',
      total: 0,
    };
    atual.total += 1;
    agregados.set(sectorId, atual);
  });

  return Array.from(agregados.values());
}

async function getEmployeeDistribution(shopId, limit = DEFAULT_FUNC_LIMIT, filters = {}) {
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
    const name = empId ? empMap.get(empId) || 'Unknown' : 'Unassigned';
    const atual = agregados.get(name) || { employeeName: name, total: 0 };
    atual.total += 1;
    agregados.set(name, atual);
  });

  return Array.from(agregados.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, safeLimit);
}

async function getDelays(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const now = Date.now();
  const orders = await loadOrders(shopId, { openOnly: true });
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));
  const atrasados = filtrados
    .map((order) => ({ order, dueAt: parseData(order.dueAt) }))
    .filter((item) => item.dueAt && item.dueAt.getTime() < now)
    .map((item) => ({ order: item.order, delayMs: now - item.dueAt.getTime() }))
    .sort((a, b) => b.delayMs - a.delayMs);

  const totalDelayed = atrasados.length;
  const averageDelayMs =
    totalDelayed === 0
      ? 0
      : Math.round(atrasados.reduce((acc, item) => acc + item.delayMs, 0) / totalDelayed);

  return {
    totalDelayed,
    averageDelayMs,
    averageDelayHours: Number((averageDelayMs / (1000 * 60 * 60)).toFixed(2)),
    items: atrasados.slice(0, MAX_ATRASOS_ITEMS).map(({ order }) => ({
      id: String(order._id),
      code: order.code,
      status: order.status,
      assigneeEmployeeId: order.assigneeEmployeeId || null,
      dueAt: order.dueAt || null,
      daysLate: Math.floor((now - parseData(order.dueAt).getTime()) / (1000 * 60 * 60 * 24)),
    })),
  };
}

async function getSummary(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const now = Date.now();
  const orders = await loadOrders(shopId);
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));

  let total = 0;
  let completed = 0;
  let delayed = 0;
  let onTime = 0;

  filtrados.forEach((order) => {
    total += 1;
    if (isFinalStatus(order.status)) {
      completed += 1;
      return;
    }
    const dueAt = parseData(order.dueAt);
    if (!dueAt) return;
    if (dueAt.getTime() < now) delayed += 1;
    else onTime += 1;
  });

  const open = total - completed;
  return {
    total,
    open,
    completed,
    delayed,
    onTime,
    delayRate: open > 0 ? Number(((delayed / open) * 100).toFixed(2)) : 0,
    period: periodInfo(periodo),
  };
}

async function getFinance(shopId, filters = {}) {
  const periodo = resolvePeriodo(filters);
  const orders = await loadOrders(shopId);
  const filtrados = orders.filter((o) => isInsidePeriod(parseData(o.createdAt), periodo));

  return {
    period: periodInfo(periodo),
    summary: buildFinanceiroResumo(filtrados),
    revenueByStatus: buildReceitaPorStatus(filtrados),
    topServices: buildTopServicos(filtrados, Number(filters.servicesLimit || filters.limitServicos) || 10),
    dailyEvolution: buildEvolucaoDiaria(filtrados),
    today: buildCaixaHoje(orders),
  };
}

async function getEmployeePerformance(shopId, limit = DEFAULT_FUNC_LIMIT, filters = {}) {
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
      names.add(empMap.get(String(order.assigneeEmployeeId)) || 'Unknown');
    }
    (order.sectorHistory || []).forEach((h) => {
      if (h.employeeName) names.add(h.employeeName);
    });
    if (!names.size) names.add('Unassigned');
    names.forEach((name) => {
      const atual = produtividade.get(name) || {
        employeeName: name,
        ordersParticipated: 0,
        ordersCompleted: 0,
      };
      atual.ordersParticipated += 1;
      if (isFinalStatus(order.status)) atual.ordersCompleted += 1;
      produtividade.set(name, atual);
    });
  });

  const top = Array.from(produtividade.values())
    .filter((i) => i.employeeName !== 'Unassigned')
    .sort((a, b) => b.ordersParticipated - a.ordersParticipated);

  return {
    period: periodInfo(periodo),
    topByOrders: top.slice(0, safeLimit),
    topBySpeed: [],
  };
}

async function getOverview(shopId, options = {}) {
  const [summary, delays, finance, employees] = await Promise.all([
    getSummary(shopId, options),
    getDelays(shopId, options),
    getFinance(shopId, options),
    getEmployeePerformance(shopId, options.limit, options),
  ]);
  return { summary, delays, finance, employees };
}

module.exports = {
  getDepartmentDistribution,
  getEmployeeDistribution,
  getDelays,
  getSummary,
  getFinance,
  getEmployeePerformance,
  getOverview,
  isOpen,
};
