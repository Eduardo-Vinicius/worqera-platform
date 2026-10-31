const mongoose = require('mongoose');
const Quote = require('../models/Quote');
const Order = require('../models/Order');
const Client = require('../models/Client');
const Sector = require('../models/Sector');
const Shop = require('../models/Shop');
const User = require('../models/User');
const {
  OPEN_STAGES,
  REASON_LABEL,
  RECOVERY_HOW,
  RECOVERY_HOW_LABEL,
  normalizeStage,
  normalizeReason,
  followUpState,
  quotePriority,
  isDueToday,
} = require('../lib/quotePriority');
const { suggestQuoteMessages } = require('./quoteMessages');
const { buildWaMeUrl, toWhatsAppE164Digits } = require('./whatsappSuggest');

const DAY = 24 * 60 * 60 * 1000;

function fail(status, message, code = 'VALIDATION_ERROR') {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function isId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function money(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function parseDate(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function actorName(userId) {
  if (!userId) return '';
  const user = await User.findById(userId).select('name email').lean();
  return user?.name || user?.email || '';
}

function serializeQuote(q, { now = new Date(), withActivity = true } = {}) {
  if (!q) return null;
  const reason = normalizeReason(q.reason);
  const activity = (q.activity || [])
    .slice()
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .map((a) => ({
      id: String(a._id || ''),
      kind: a.kind,
      text: a.text || '',
      stage: a.stage || null,
      byName: a.byName || '',
      at: a.at,
    }));
  return {
    id: String(q._id),
    clientId: q.clientId ? String(q.clientId) : null,
    orderId: q.orderId ? String(q.orderId) : null,
    orderCode: q.orderCode || '',
    source: q.source || 'counter',
    name: q.name || '',
    phone: q.phone || '',
    phoneDigits: toWhatsAppE164Digits(q.phone),
    email: q.email || '',
    what: q.what || '',
    value: Number(q.value) || 0,
    stage: normalizeStage(q.stage),
    reason,
    reasonLabel: reason ? REASON_LABEL[reason] : '',
    reasonNote: q.reasonNote || '',
    followUpAt: q.followUpAt || null,
    followUp: followUpState(q.followUpAt, now),
    notes: q.notes || '',
    contactCount: Number(q.contactCount) || 0,
    lastContactAt: q.lastContactAt || null,
    wonAt: q.wonAt || null,
    lostAt: q.lostAt || null,
    wonOrderId: q.wonOrderId ? String(q.wonOrderId) : null,
    recovery: q.recovery?.at
      ? {
          how: q.recovery.how || null,
          howLabel: q.recovery.how ? RECOVERY_HOW_LABEL[q.recovery.how] || '' : '',
          realReason: q.recovery.realReason || null,
          realReasonLabel: q.recovery.realReason ? REASON_LABEL[q.recovery.realReason] || '' : '',
          note: q.recovery.note || '',
          people: q.recovery.people || [],
          contacts: Number(q.recovery.contacts) || 0,
          value: Number(q.recovery.value) || 0,
          at: q.recovery.at,
          byName: q.recovery.byName || '',
        }
      : null,
    priority: quotePriority(q, now),
    activity: withActivity ? activity : activity.slice(0, 1),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

function summarize(rows, now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY);
  const summary = {
    openCount: 0,
    openValue: 0,
    todayCount: 0,
    overdueCount: 0,
    wonCount30d: 0,
    wonValue30d: 0,
    lostCount30d: 0,
    recoveryRate: 0,
    byStage: { new: 0, contact: 0, followup: 0, lost: 0, won: 0 },
  };
  for (const q of rows) {
    const stage = normalizeStage(q.stage);
    summary.byStage[stage] += 1;
    if (OPEN_STAGES.includes(stage)) {
      summary.openCount += 1;
      summary.openValue += Number(q.value) || 0;
      if (isDueToday(q, now)) summary.todayCount += 1;
      if (followUpState(q.followUpAt, now).state === 'overdue') summary.overdueCount += 1;
    }
    if (stage === 'won' && q.wonAt && new Date(q.wonAt) >= since) {
      summary.wonCount30d += 1;
      summary.wonValue30d += Number(q.value) || 0;
    }
    if (stage === 'lost' && q.lostAt && new Date(q.lostAt) >= since) summary.lostCount30d += 1;
  }
  const closed = summary.wonCount30d + summary.lostCount30d;
  summary.recoveryRate = closed ? Math.round((summary.wonCount30d / closed) * 100) : 0;
  summary.openValue = Math.round(summary.openValue * 100) / 100;
  summary.wonValue30d = Math.round(summary.wonValue30d * 100) / 100;
  return summary;
}

function matchesSearch(q, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  const digits = term.replace(/\D/g, '');
  if (String(q.name || '').toLowerCase().includes(t)) return true;
  if (String(q.what || '').toLowerCase().includes(t)) return true;
  if (String(q.orderCode || '').toLowerCase().startsWith(t)) return true;
  if (digits.length >= 3 && String(q.phone || '').replace(/\D/g, '').includes(digits)) return true;
  return false;
}

/**
 * view=today → open quotes due today or overdue (plus new without date), best first.
 * view=board → open quotes + closed in the last 60 days.
 * view=all → everything, newest first.
 */
async function listQuotes(shopId, query = {}) {
  const now = new Date();
  const view = ['today', 'board', 'all'].includes(String(query.view)) ? String(query.view) : 'today';
  const filter = { shopId };
  if (query.clientId && isId(query.clientId)) filter.clientId = query.clientId;
  if (query.orderId && isId(query.orderId)) filter.orderId = query.orderId;

  // The list only needs the latest contacts; the full history loads with the quote itself.
  const rows = await Quote.find(filter).slice('activity', -5).sort({ createdAt: -1 }).limit(2000).lean();
  const summary = summarize(rows, now);
  const term = String(query.q || '').trim();

  let list = rows.filter((q) => matchesSearch(q, term));
  if (view === 'today' && !term) {
    list = list.filter((q) => isDueToday(q, now));
  } else if (view === 'board') {
    const since = new Date(now.getTime() - 60 * DAY);
    list = list.filter((q) => {
      const stage = normalizeStage(q.stage);
      if (OPEN_STAGES.includes(stage)) return true;
      const closedAt = stage === 'won' ? q.wonAt : q.lostAt;
      return closedAt && new Date(closedAt) >= since;
    });
  }
  if (query.stage) {
    const stage = normalizeStage(query.stage, '');
    if (stage) list = list.filter((q) => normalizeStage(q.stage) === stage);
  }

  let quotes = list.map((q) => serializeQuote(q, { now, withActivity: false }));
  if (view === 'today') {
    quotes = quotes.sort((a, b) => b.priority.score - a.priority.score);
  }
  const limit = Math.min(Math.max(Number(query.limit) || 300, 1), 500);
  return { view, quotes: quotes.slice(0, limit), summary };
}

async function loadQuote(shopId, id) {
  if (!isId(id)) throw fail(404, 'Orçamento não encontrado', 'NOT_FOUND');
  const quote = await Quote.findOne({ _id: id, shopId });
  if (!quote) throw fail(404, 'Orçamento não encontrado', 'NOT_FOUND');
  return quote;
}

async function getQuote(shopId, id) {
  const quote = await loadQuote(shopId, id);
  return serializeQuote(quote.toObject());
}

async function findClientForPhone(shopId, phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return null;
  const tail = digits.slice(-8);
  const candidates = await Client.find({ shopId, phone: { $ne: null } })
    .select('name phone email')
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();
  return candidates.find((c) => String(c.phone || '').replace(/\D/g, '').endsWith(tail)) || null;
}

async function createQuote(shopId, userId, body = {}) {
  let client = null;
  if (body.clientId && isId(body.clientId)) {
    client = await Client.findOne({ _id: body.clientId, shopId }).lean();
  }
  const name = String(body.name || client?.name || '').trim();
  if (!name) throw fail(400, 'Informe o nome do cliente');
  const phone = String(body.phone || client?.phone || '').trim();
  if (!client && phone) client = await findClientForPhone(shopId, phone);

  const followUpAt = parseDate(body.followUpAt);
  const reason = normalizeReason(body.reason);
  const byName = await actorName(userId);
  const stage = normalizeStage(body.stage, followUpAt ? 'followup' : 'new');

  const quote = await Quote.create({
    shopId,
    clientId: client?._id || null,
    source: 'counter',
    name,
    phone,
    email: String(body.email || client?.email || '').trim(),
    what: String(body.what || '').trim(),
    value: money(body.value),
    stage: OPEN_STAGES.includes(stage) ? stage : 'new',
    reason,
    reasonNote: String(body.reasonNote || '').trim(),
    followUpAt,
    notes: String(body.notes || '').trim(),
    createdByUserId: userId || null,
    activity: [
      {
        kind: 'created',
        text: reason ? `Não fechou: ${REASON_LABEL[reason]}` : 'Orçamento registrado',
        stage,
        byUserId: userId || null,
        byName,
      },
    ],
  });
  return serializeQuote(quote.toObject());
}

function applyStage(quote, stage, now = new Date()) {
  const prev = normalizeStage(quote.stage);
  if (prev === stage) return false;
  quote.stage = stage;
  if (stage === 'won') quote.wonAt = now;
  if (stage === 'lost') quote.lostAt = now;
  if (OPEN_STAGES.includes(stage)) {
    quote.wonAt = null;
    quote.lostAt = null;
  }
  return true;
}

const STAGE_LABEL = {
  new: 'Novo',
  contact: 'Em contato',
  followup: 'Retorno',
  lost: 'Perdido',
  won: 'Recuperado',
};

async function patchQuote(shopId, id, userId, body = {}) {
  const quote = await loadQuote(shopId, id);
  const byName = await actorName(userId);
  const now = new Date();

  for (const key of ['name', 'phone', 'email', 'what', 'notes', 'reasonNote']) {
    if (body[key] != null) quote[key] = String(body[key]).trim();
  }
  if (body.value != null) quote.value = money(body.value);
  if (body.reason !== undefined) quote.reason = normalizeReason(body.reason);
  if (body.followUpAt !== undefined) {
    quote.followUpAt = parseDate(body.followUpAt);
    if (quote.followUpAt && normalizeStage(quote.stage) === 'new') applyStage(quote, 'followup', now);
  }

  if (body.stage != null) {
    const stage = normalizeStage(body.stage, '');
    if (!stage) throw fail(400, 'Etapa inválida');
    if (stage === 'won' && normalizeStage(quote.stage) !== 'won') {
      return winQuote(shopId, id, userId, body.recovery || {});
    }
    if (applyStage(quote, stage, now)) {
      quote.activity.push({
        kind: stage === 'lost' ? 'lost' : stage === 'won' ? 'won' : 'stage',
        text: STAGE_LABEL[stage],
        stage,
        byUserId: userId || null,
        byName,
        at: now,
      });
    }
  }

  await quote.save();
  return { quote: serializeQuote(quote.toObject(), { now }) };
}

const CONTACT_LABEL = {
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  note: 'Anotação',
};

async function addActivity(shopId, id, userId, body = {}) {
  const quote = await loadQuote(shopId, id);
  const kind = ['call', 'whatsapp', 'note'].includes(String(body.kind)) ? String(body.kind) : 'note';
  const text = String(body.text || '').trim();
  if (kind === 'note' && !text) throw fail(400, 'Escreva a anotação');
  const now = new Date();
  const byName = await actorName(userId);

  if (kind !== 'note') {
    quote.contactCount = (Number(quote.contactCount) || 0) + 1;
    quote.lastContactAt = now;
    if (normalizeStage(quote.stage) === 'new') applyStage(quote, 'contact', now);
  }
  if (body.followUpAt !== undefined) {
    quote.followUpAt = parseDate(body.followUpAt);
    if (quote.followUpAt && OPEN_STAGES.includes(normalizeStage(quote.stage))) {
      applyStage(quote, 'followup', now);
    }
  }
  quote.activity.push({
    kind,
    text: text || CONTACT_LABEL[kind],
    stage: quote.stage,
    byUserId: userId || null,
    byName,
    at: now,
  });
  await quote.save();
  return serializeQuote(quote.toObject(), { now });
}

async function suggestMessages(shopId, id, { aiAllowed = false } = {}) {
  const quote = await loadQuote(shopId, id);
  const shop = await Shop.findById(shopId).select('name branding').lean();
  const shopName = shop?.branding?.displayName || shop?.name || '';
  const result = await suggestQuoteMessages(
    {
      shopId,
      shopName,
      name: quote.name,
      what: quote.what,
      value: quote.value,
      reason: normalizeReason(quote.reason),
      reasonNote: quote.reasonNote,
      contactCount: quote.contactCount,
    },
    { aiAllowed }
  );
  return {
    ai: result.ai,
    options: result.options.map((o) => ({ ...o, waUrl: buildWaMeUrl(quote.phone, o.text) || null })),
  };
}

async function reopenRefusedOrder(shopId, order, userId, byName, recovery = {}) {
  const { hydrateItemsIfEmpty } = require('./orderItems');
  const { ensureItemSectors, buildSectorsById, allItemsInTerminal, computeRollupSectorId } =
    require('./itemSectors');
  const sectors = await Sector.find({ shopId, active: true }).sort({ order: 1 }).lean();
  const sectorsById = buildSectorsById(sectors);
  const startSector = sectors.find((s) => !s.isTerminal) || sectors[0] || null;

  hydrateItemsIfEmpty(order);
  ensureItemSectors(order);
  const now = new Date();
  for (const it of order.items || []) {
    if (!it.currentSectorId || !sectorsById.get(String(it.currentSectorId))) {
      if (startSector) it.currentSectorId = startSector._id;
    }
  }
  const rollup = computeRollupSectorId(order.items || [], sectorsById);
  if (rollup) order.currentSectorId = rollup;
  const atStart = startSector && String(order.currentSectorId) === String(startSector._id);
  order.status = allItemsInTerminal(order.items || [], sectorsById)
    ? 'ready'
    : atStart
      ? 'open'
      : 'in_progress';
  order.quoteRefusal.refusedAt = null;
  order.quoteRefusal.reason = null;
  order.updatedByUserId = userId || null;
  order.sectorHistory = order.sectorHistory || [];
  order.sectorHistory.push({
    sectorId: order.currentSectorId || null,
    fromSectorId: order.currentSectorId || null,
    enteredAt: now,
    leftAt: null,
    movedByUserId: userId || null,
    movedByName: byName || 'Orçamentos',
    note: 'Cliente voltou — orçamento recuperado',
    action: 'reopen',
  });
  order.recovered = { quoteId: recovery.quoteId || null, at: now, how: recovery.how || null, byName: byName || '' };
  order.markModified('items');
  const { reserveOrder } = require('./productService');
  await reserveOrder(shopId, order, userId);
  order.markModified('items');
  await order.save();
  return order;
}

/**
 * Who acted on the lead: everyone who logged a contact, a note or the win, plus
 * the helpers picked in the dialog. Names, so history survives renames.
 */
function recoveryPeople(quote, helperNames, byName) {
  const set = new Set();
  for (const a of quote.activity || []) {
    if (['call', 'whatsapp', 'note', 'reply'].includes(a.kind) && a.byName) set.add(a.byName.trim());
  }
  for (const n of helperNames) if (n) set.add(String(n).trim());
  if (byName) set.add(byName.trim());
  return [...set].filter(Boolean).slice(0, 20);
}

async function winQuote(shopId, id, userId, body = {}) {
  const quote = await loadQuote(shopId, id);
  const byName = await actorName(userId);
  const now = new Date();
  let order = null;

  const how = RECOVERY_HOW.includes(String(body.how)) ? String(body.how) : null;
  const realReason = normalizeReason(body.realReason) || normalizeReason(quote.reason) || null;
  const helperIds = (Array.isArray(body.helperEmployeeIds) ? body.helperEmployeeIds : [])
    .map(String)
    .filter(isId)
    .slice(0, 10);
  const helpers = helperIds.length
    ? await require('../models/Employee').find({ _id: { $in: helperIds }, shopId }).select('name').lean()
    : [];

  if (quote.orderId) {
    order = await Order.findOne({ _id: quote.orderId, shopId, deletedAt: null });
    if (order && order.status === 'cancelled') {
      order = await reopenRefusedOrder(shopId, order, userId, byName, { quoteId: quote._id, how });
    }
  }

  applyStage(quote, 'won', now);
  quote.wonOrderId = order?._id || quote.wonOrderId || null;
  quote.followUpAt = null;
  quote.recovery = {
    how,
    realReason,
    note: String(body.note || '').trim().slice(0, 500),
    helperEmployeeIds: helpers.map((h) => h._id),
    people: recoveryPeople(quote, helpers.map((h) => h.name), byName),
    contacts: Number(quote.contactCount) || 0,
    value: Number(order?.pricing?.total) || Number(quote.value) || 0,
    at: now,
    byName,
  };
  const howText = how ? ` · ${RECOVERY_HOW_LABEL[how]}` : '';
  quote.activity.push({
    kind: 'won',
    text: (order ? `Recuperado — pedido #${order.code} voltou para a fila` : 'Recuperado') + howText,
    stage: 'won',
    byUserId: userId || null,
    byName,
    at: now,
  });
  await quote.save();

  const { serializeOrder } = require('../serializers');
  return {
    quote: serializeQuote(quote.toObject(), { now }),
    order: order ? serializeOrder(order.toObject ? order.toObject() : order) : null,
    prefill: order
      ? null
      : {
          clientId: quote.clientId ? String(quote.clientId) : null,
          name: quote.name,
          phone: quote.phone,
          email: quote.email,
          what: quote.what,
          value: Number(quote.value) || 0,
        },
  };
}

async function deleteQuote(shopId, id) {
  const quote = await loadQuote(shopId, id);
  if (quote.orderId) {
    await Order.updateOne(
      { _id: quote.orderId, shopId, 'quoteRefusal.quoteId': quote._id },
      { $set: { 'quoteRefusal.quoteId': null } }
    );
  }
  await quote.deleteOne();
  return { ok: true };
}

function describeOrder(order) {
  const items = Array.isArray(order.items) && order.items.length ? order.items : [order];
  const parts = items
    .map((it) => {
      const piece = [it.brand, it.shoeModel].map((s) => String(s || '').trim()).filter(Boolean).join(' ');
      const services = (it.services || []).map((s) => s.name).filter(Boolean).join(', ');
      return [piece, services].filter(Boolean).join(' — ');
    })
    .filter(Boolean);
  return parts.join(' · ').slice(0, 240);
}

/** Customer refused the quote on an existing order: cancel it and open the funnel card. */
async function refuseOrderQuote(shopId, orderId, userId, body = {}) {
  if (!isId(orderId)) throw fail(404, 'Pedido não encontrado', 'NOT_FOUND');
  const order = await Order.findOne({ _id: orderId, shopId, deletedAt: null });
  if (!order) throw fail(404, 'Pedido não encontrado', 'NOT_FOUND');
  if (order.status === 'delivered') throw fail(400, 'Pedido entregue não volta para orçamento');

  const reason = normalizeReason(body.reason) || 'other';
  const followUpAt = parseDate(body.followUpAt);
  const reasonNote = String(body.reasonNote || '').trim();
  const byName = await actorName(userId);
  const now = new Date();

  let client = null;
  if (order.clientId) client = await Client.findOne({ _id: order.clientId, shopId }).lean();

  let quote = order.quoteRefusal?.quoteId
    ? await Quote.findOne({ _id: order.quoteRefusal.quoteId, shopId })
    : null;
  if (!quote) quote = await Quote.findOne({ shopId, orderId: order._id });

  const stage = followUpAt ? 'followup' : 'new';
  const activity = {
    kind: 'refused',
    text: `Recusou o pedido #${order.code}: ${REASON_LABEL[reason]}${reasonNote ? ` — ${reasonNote}` : ''}`,
    stage,
    byUserId: userId || null,
    byName,
    at: now,
  };

  if (quote) {
    quote.reason = reason;
    quote.reasonNote = reasonNote;
    quote.followUpAt = followUpAt;
    quote.value = money(order.pricing?.total) || quote.value;
    applyStage(quote, stage, now);
    quote.activity.push(activity);
    await quote.save();
  } else {
    quote = await Quote.create({
      shopId,
      clientId: order.clientId || null,
      orderId: order._id,
      orderCode: order.code,
      source: 'order',
      name: order.clientName || client?.name || 'Cliente',
      phone: client?.phone || order.clientPhone || '',
      email: client?.email || order.clientEmail || '',
      what: describeOrder(order),
      value: money(order.pricing?.total),
      stage,
      reason,
      reasonNote,
      followUpAt,
      createdByUserId: userId || null,
      activity: [activity],
    });
  }

  if (order.status !== 'cancelled') {
    const { releaseOrder } = require('./productService');
    await releaseOrder(shopId, order, userId);
    order.markModified('items');
  }
  order.status = 'cancelled';
  order.quoteRefusal = { quoteId: quote._id, refusedAt: now, reason };
  order.updatedByUserId = userId || null;
  order.comments = order.comments || [];
  order.comments.push({
    text: `Orçamento recusado: ${REASON_LABEL[reason]}${reasonNote ? ` — ${reasonNote}` : ''}`,
    authorUserId: userId || null,
    authorName: byName,
    createdAt: now,
  });
  await order.save();

  const { serializeOrder } = require('../serializers');
  return { order: serializeOrder(order.toObject()), quote: serializeQuote(quote.toObject(), { now }) };
}

/**
 * Recuperados: what the problem was, how it was turned around and who did it.
 * `showsTotals: false` (front desk) keeps each order's value but drops sums.
 */
async function recoveredReport(shopId, { days = 30, showsTotals = true, now = new Date() } = {}) {
  const span = [30, 90, 365].includes(Number(days)) ? Number(days) : 30;
  const since = new Date(now.getTime() - span * DAY);
  const [won, lost] = await Promise.all([
    Quote.find({ shopId, stage: 'won', wonAt: { $gte: since } }).sort({ wonAt: -1 }).lean(),
    Quote.countDocuments({ shopId, stage: 'lost', lostAt: { $gte: since } }),
  ]);
  const round = (n) => Math.round(n * 100) / 100;
  const valueOf = (q) => Number(q.recovery?.value) || Number(q.value) || 0;
  const peopleOf = (q) => {
    if (q.recovery?.people?.length) return q.recovery.people;
    const last = (q.activity || []).filter((a) => a.kind === 'won').pop();
    return last?.byName ? [last.byName] : [];
  };

  const reasons = new Map();
  const hows = new Map();
  const people = new Map();
  let value = 0;
  let contacts = 0;
  let peopleSum = 0;
  for (const q of won) {
    const v = valueOf(q);
    value += v;
    contacts += Number(q.recovery?.contacts ?? q.contactCount) || 0;
    const who = peopleOf(q);
    peopleSum += who.length;

    const reason = q.recovery?.realReason || normalizeReason(q.reason) || 'none';
    const how = q.recovery?.how || 'unknown';
    const r = reasons.get(reason) || { reason, count: 0, hows: new Map() };
    r.count += 1;
    r.hows.set(how, (r.hows.get(how) || 0) + 1);
    reasons.set(reason, r);

    const h = hows.get(how) || { how, count: 0, value: 0 };
    h.count += 1;
    h.value += v;
    hows.set(how, h);

    for (const name of who) {
      const p = people.get(name) || { name, count: 0, value: 0 };
      p.count += 1;
      p.value += v;
      people.set(name, p);
    }
  }

  const howLabel = (how) => RECOVERY_HOW_LABEL[how] || 'Sem registro';
  const money = (n) => (showsTotals ? round(n) : 0);
  const count = won.length;
  return {
    days: span,
    showsTotals,
    summary: {
      count,
      value: money(value),
      rate: count + lost ? Math.round((count / (count + lost)) * 100) : 0,
      avgContacts: count ? Math.round((contacts / count) * 10) / 10 : 0,
      avgPeople: count ? Math.round((peopleSum / count) * 10) / 10 : 0,
      lost,
    },
    byReason: [...reasons.values()]
      .sort((a, b) => b.count - a.count)
      .map((r) => {
        const list = [...r.hows.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([how, n]) => ({ how, label: howLabel(how), count: n }));
        return {
          reason: r.reason,
          label: REASON_LABEL[r.reason] || 'Sem motivo',
          count: r.count,
          topHow: list[0]?.how || '',
          topHowLabel: list[0]?.label || '',
          hows: list,
        };
      }),
    byHow: [...hows.values()]
      .sort((a, b) => b.count - a.count)
      .map((h) => ({ how: h.how, label: howLabel(h.how), count: h.count, value: money(h.value) })),
    byPerson: [...people.values()]
      .sort((a, b) => b.count - a.count || b.value - a.value)
      .slice(0, 15)
      .map((p) => ({ name: p.name, count: p.count, value: money(p.value) })),
    items: won.slice(0, 100).map((q) => ({
      id: String(q._id),
      name: q.name || '',
      orderCode: q.orderCode || '',
      wonOrderId: q.wonOrderId ? String(q.wonOrderId) : null,
      value: round(valueOf(q)),
      reasonLabel: REASON_LABEL[q.recovery?.realReason || normalizeReason(q.reason)] || '',
      howLabel: q.recovery?.how ? howLabel(q.recovery.how) : '',
      note: q.recovery?.note || '',
      people: peopleOf(q),
      contacts: Number(q.recovery?.contacts ?? q.contactCount) || 0,
      byName: q.recovery?.byName || '',
      at: q.wonAt,
    })),
  };
}

module.exports = {
  recoveredReport,
  listQuotes,
  getQuote,
  createQuote,
  patchQuote,
  addActivity,
  suggestMessages,
  winQuote,
  deleteQuote,
  refuseOrderQuote,
  serializeQuote,
  summarize,
};
