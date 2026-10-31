/**
 * CRM: the client base read from the orders. Who is new, who comes back, who
 * went quiet, whose birthday it is — each with a ready-made WhatsApp message.
 * Numbers are computed here; AI (Business) only writes the reading of the base.
 */
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { buildWaMeUrl } = require('./whatsappSuggest');

const DAY = 24 * 60 * 60 * 1000;
const OPEN = ['open', 'in_progress', 'ready'];
const SEGMENTS = ['birthdays', 'inactive', 'recurring', 'new', 'vip', 'never', 'all'];

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function shopLabel(shopId) {
  const shop = await Shop.findById(shopId).select('name branding').lean();
  return shop?.branding?.displayName || shop?.name || 'a loja';
}

/** São Paulo calendar day/month for "today" (servers run in UTC). */
function spToday(now = new Date()) {
  const local = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return { day: local.getUTCDate(), month: local.getUTCMonth() + 1, year: local.getUTCFullYear(), local };
}

/** Days until the next birthday (0 = today). */
function daysToBirthday(day, month, now = new Date()) {
  const t = spToday(now);
  const today = Date.UTC(t.year, t.month - 1, t.day);
  let next = Date.UTC(t.year, month - 1, day);
  if (next < today) next = Date.UTC(t.year + 1, month - 1, day);
  return Math.round((next - today) / DAY);
}

/** Per-client numbers from the orders, one aggregation for the whole base. */
async function clientStats(shopId) {
  const rows = await Order.aggregate([
    { $match: { shopId: new mongoose.Types.ObjectId(String(shopId)), deletedAt: null, clientId: { $ne: null } } },
    {
      $group: {
        _id: '$clientId',
        orders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, 1] } },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, { $ifNull: ['$pricing.total', 0] }] } },
        open: { $sum: { $cond: [{ $in: ['$status', OPEN] }, 1, 0] } },
        firstAt: { $min: '$createdAt' },
        lastAt: { $max: '$createdAt' },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
}

function segmentOf(stats, now, inactiveDays) {
  if (!stats || !stats.orders) return 'never';
  const since = (now - new Date(stats.lastAt)) / DAY;
  if (!stats.open && since >= inactiveDays) return 'inactive';
  if (stats.orders >= 2) return 'recurring';
  if ((now - new Date(stats.firstAt)) / DAY <= 30) return 'new';
  return 'once';
}

function birthdayText(name, shop) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Passando para desejar um feliz aniversário! Que seu dia seja ótimo. Quando quiser dar um trato nos seus itens, estamos por aqui.`;
}

function comebackText(name, shop, days) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  const when = days >= 60 ? `faz uns ${Math.round(days / 30)} meses` : 'faz um tempinho';
  return `${hi} Aqui é da ${shop}. ${when[0].toUpperCase()}${when.slice(1)} que você não aparece, sentimos sua falta! Precisando de algo, é só chamar que a gente te atende rapidinho.`;
}

function thanksText(name, shop) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Obrigado por sempre confiar na gente! Clientes como você fazem a diferença. Qualquer coisa, estamos à disposição.`;
}

function rowFor(client, stats, { now, shop, segment, showMoney }) {
  const orders = stats?.orders || 0;
  const daysSince = stats?.lastAt ? Math.floor((now - new Date(stats.lastAt)) / DAY) : null;
  const birthday = client.birthDay && client.birthMonth ? { day: client.birthDay, month: client.birthMonth, year: client.birthYear || null } : null;
  const inDays = birthday ? daysToBirthday(birthday.day, birthday.month, now) : null;
  // Age they turn on the next birthday.
  const age = birthday?.year ? spToday(now).year - birthday.year + (inDays != null && inDays > 0 && new Date(Date.UTC(spToday(now).year, birthday.month - 1, birthday.day)) < new Date(Date.UTC(spToday(now).year, spToday(now).month - 1, spToday(now).day)) ? 1 : 0) : null;
  const text =
    segment === 'birthdays'
      ? birthdayText(client.name, shop)
      : segment === 'inactive'
        ? comebackText(client.name, shop, daysSince || 90)
        : segment === 'recurring' || segment === 'vip'
          ? thanksText(client.name, shop)
          : null;
  const waUrl = text && client.phone && !client.whatsappOptOut ? buildWaMeUrl(client.phone, text) : null;
  return {
    id: String(client._id),
    name: client.name || '',
    phone: client.phone || '',
    orders,
    ...(showMoney ? { spent: money(stats?.spent), ticket: orders ? money((stats?.spent || 0) / orders) : 0 } : {}),
    lastOrderAt: stats?.lastAt || null,
    daysSince,
    openOrders: stats?.open || 0,
    birthday,
    birthdayIn: inDays,
    age,
    tags: client.tags || [],
    whatsapp: waUrl ? { text, url: waUrl } : null,
  };
}

/** Overview numbers for the CRM home. */
async function crmSummary(shopId, { inactiveDays = 90, showMoney = true, now = new Date() } = {}) {
  const [clients, stats] = await Promise.all([
    Client.find({ shopId }).select('birthDay birthMonth createdAt').lean(),
    clientStats(shopId),
  ]);
  const counts = { clients: clients.length, active90: 0, recurring: 0, new30: 0, inactive: 0, never: 0, once: 0, vip: 0 };
  const buckets = { one: 0, two_three: 0, four_plus: 0 };
  let spent = 0;
  let orders = 0;
  let birthdaysToday = 0;
  let birthdaysWeek = 0;
  const spends = [];
  for (const c of clients) {
    const s = stats.get(String(c._id));
    const seg = segmentOf(s, now, inactiveDays);
    if (seg === 'never') counts.never += 1;
    if (seg === 'inactive') counts.inactive += 1;
    if (seg === 'recurring') counts.recurring += 1;
    if (seg === 'new') counts.new30 += 1;
    if (seg === 'once') counts.once += 1;
    if (s?.orders) {
      orders += s.orders;
      spent += s.spent || 0;
      spends.push(s.spent || 0);
      if ((now - new Date(s.lastAt)) / DAY <= 90) counts.active90 += 1;
      if (s.orders === 1) buckets.one += 1;
      else if (s.orders <= 3) buckets.two_three += 1;
      else buckets.four_plus += 1;
    }
    if (c.birthDay && c.birthMonth) {
      const d = daysToBirthday(c.birthDay, c.birthMonth, now);
      if (d === 0) birthdaysToday += 1;
      if (d <= 7) birthdaysWeek += 1;
    }
  }
  // VIP: top 10% by spend (at least 2 orders), so it adapts to each shop's size.
  spends.sort((a, b) => b - a);
  const vipCut = spends.length >= 10 ? spends[Math.floor(spends.length * 0.1) - 1] : Infinity;
  for (const c of clients) {
    const s = stats.get(String(c._id));
    if (s && s.orders >= 2 && (s.spent || 0) >= vipCut) counts.vip += 1;
  }
  const buyers = spends.length;
  const withBirthday = clients.filter((c) => c.birthDay && c.birthMonth).length;
  return {
    inactiveDays,
    counts,
    buckets,
    birthdays: { today: birthdaysToday, week: birthdaysWeek, registered: withBirthday },
    rates: {
      repeat: buyers ? Math.round(((buckets.two_three + buckets.four_plus) / buyers) * 100) : 0,
      active: counts.clients ? Math.round((counts.active90 / counts.clients) * 100) : 0,
      birthdayCoverage: counts.clients ? Math.round((withBirthday / counts.clients) * 100) : 0,
    },
    ...(showMoney
      ? { money: { spent: money(spent), avgTicket: orders ? money(spent / orders) : 0, perClient: buyers ? money(spent / buyers) : 0 } }
      : {}),
  };
}

/** A segment list with the message to send. */
async function crmList(shopId, { segment = 'all', days, range = 'week', q, showMoney = true, limit = 200, offset = 0, now = new Date() } = {}) {
  const seg = SEGMENTS.includes(segment) ? segment : 'all';
  const inactiveDays = [30, 60, 90, 180, 365].includes(Number(days)) ? Number(days) : 90;
  const filter = { shopId };
  if (seg === 'birthdays') filter.birthMonth = { $ne: null };
  if (q) filter.name = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [clients, stats, shop] = await Promise.all([
    Client.find(filter).select('name phone birthDay birthMonth birthYear tags whatsappOptOut createdAt').lean(),
    clientStats(shopId),
    shopLabel(shopId),
  ]);
  const horizon = range === 'today' ? 0 : range === 'month' ? 31 : 7;
  let rows = [];
  for (const c of clients) {
    const s = stats.get(String(c._id));
    const own = segmentOf(s, now, inactiveDays);
    let keep = false;
    if (seg === 'all') keep = true;
    else if (seg === 'birthdays') keep = c.birthDay && c.birthMonth && daysToBirthday(c.birthDay, c.birthMonth, now) <= horizon;
    else if (seg === 'vip') keep = s && s.orders >= 2;
    else keep = own === seg;
    if (keep) rows.push({ ...rowFor(c, s, { now, shop, segment: seg, showMoney: true }), segment: own });
  }
  if (seg === 'birthdays') rows.sort((a, b) => a.birthdayIn - b.birthdayIn || a.name.localeCompare(b.name));
  else if (seg === 'inactive') rows.sort((a, b) => (b.spent || 0) - (a.spent || 0) || (b.daysSince || 0) - (a.daysSince || 0));
  else if (seg === 'recurring' || seg === 'vip') rows.sort((a, b) => b.orders - a.orders || (b.spent || 0) - (a.spent || 0));
  else if (seg === 'new') rows.sort((a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0));
  else rows.sort((a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0) || a.name.localeCompare(b.name));
  if (seg === 'vip') rows = rows.slice(0, Math.max(10, Math.ceil(rows.length * 0.2)));
  const total = rows.length;
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const size = Math.min(500, Math.max(1, Number(limit) || 200));
  rows = rows.slice(start, start + size);
  if (!showMoney) rows = rows.map(({ spent, ticket, ...rest }) => rest); // eslint-disable-line no-unused-vars
  return {
    segment: seg,
    inactiveDays,
    range: seg === 'birthdays' ? range : undefined,
    total,
    offset: start,
    hasMore: start + rows.length < total,
    items: rows,
  };
}

/** One client: numbers plus the order history (the "timeline"). */
async function clientOverview(shopId, clientId, { showMoney = true, now = new Date() } = {}) {
  const client = await Client.findOne({ _id: clientId, shopId }).lean();
  if (!client) {
    const err = new Error('Client not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const orders = await Order.find({ shopId, clientId: client._id, deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('code status pricing createdAt deliveredAt items.shoeModel items.brand shoeModel feedback.score quoteRefusal.refusedAt')
    .lean();
  const all = await clientStats(shopId);
  const s = all.get(String(client._id));
  const segment = segmentOf(s, now, 90);
  const shop = await shopLabel(shopId);
  return {
    stats: {
      ...rowFor(client, s, { now, shop, segment, showMoney }),
      segment,
      firstOrderAt: s?.firstAt || null,
      avgGapDays:
        s && s.orders >= 2 ? Math.round((new Date(s.lastAt) - new Date(s.firstAt)) / DAY / (s.orders - 1)) : null,
    },
    orders: orders.map((o) => ({
      id: String(o._id),
      code: o.code,
      status: o.quoteRefusal?.refusedAt ? 'refused' : o.status,
      what:
        (o.items || [])
          .map((it) => [it.brand, it.shoeModel].filter(Boolean).join(' '))
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') || o.shoeModel || '',
      ...(showMoney ? { total: money(o.pricing?.total) } : {}),
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt || null,
      score: o.feedback?.score || null,
    })),
  };
}

/**
 * Reading of the base: one headline and up to 3 moves. Numbers come from crmSummary;
 * AI (Business) only writes the words, cached for the day. Fixed text without AI.
 */
async function crmInsight(shopId, { aiAllowed = false, refresh = false, showMoney = true, now = new Date() } = {}) {
  const AiBrief = require('../models/AiBrief');
  const { saoPauloDayKey } = require('../lib/planCap');
  const summary = await crmSummary(shopId, { showMoney, now });
  const c = summary.counts;
  const moves = [];
  if (summary.birthdays.today) moves.push({ id: 'birthdays', title: `Parabenizar ${summary.birthdays.today} aniversariante${summary.birthdays.today === 1 ? '' : 's'} de hoje`, segment: 'birthdays' });
  if (c.inactive) moves.push({ id: 'inactive', title: `Chamar de volta ${c.inactive} cliente${c.inactive === 1 ? '' : 's'} sumido${c.inactive === 1 ? '' : 's'}`, segment: 'inactive' });
  if (c.new30) moves.push({ id: 'new', title: `Garantir a segunda visita de ${c.new30} cliente${c.new30 === 1 ? '' : 's'} novo${c.new30 === 1 ? '' : 's'}`, segment: 'new' });
  if (c.recurring) moves.push({ id: 'recurring', title: `Agradecer ${Math.min(c.recurring, c.vip || c.recurring)} cliente${c.recurring === 1 ? '' : 's'} fiéis`, segment: 'vip' });
  if (summary.rates.birthdayCoverage < 30 && c.clients >= 10) moves.push({ id: 'birthday-data', title: 'Pedir o aniversário no próximo atendimento', segment: 'all' });
  const fallback = c.clients
    ? `${c.clients} clientes: ${summary.rates.repeat}% voltaram mais de uma vez e ${c.inactive} estão sumidos há ${summary.inactiveDays}+ dias.`
    : 'Ainda sem clientes cadastrados. Cada pedido novo já entra na base.';
  const base = { summary, moves: moves.slice(0, 3) };
  if (!aiAllowed || c.clients < 5) return { ...base, headline: fallback, tip: '', ai: false };

  const day = `${saoPauloDayKey(now)}:crm`;
  const cached = await AiBrief.findOne({ shopId, kind: 'crm', day }).lean();
  if (cached?.ai && !refresh) return { ...base, headline: cached.text, tip: cached.bullets?.[0] || '', ai: true };

  const { chatJson } = require('./aiService');
  const parsed = await chatJson({
    shopId,
    feature: 'crm_insight',
    maxTokens: 500,
    system:
      'Você é consultor de relacionamento de uma loja de serviços. Português do Brasil, prático, sem emoji. Use só os números recebidos. ' +
      '"headline": 1 frase (até 160 caracteres) com a leitura mais importante da base. "tip": 1 frase com uma ação concreta para esta semana. ' +
      'Responda JSON: {"headline":"...","tip":"..."}',
    user: [
      `Clientes: ${c.clients}`,
      `Ativos (pedido nos últimos 90 dias): ${c.active90}`,
      `Recorrentes (2+ pedidos): ${c.recurring}`,
      `Novos (primeiro pedido em 30 dias): ${c.new30}`,
      `Sumidos (sem pedido há ${summary.inactiveDays}+ dias): ${c.inactive}`,
      `Cadastrados sem pedido: ${c.never}`,
      `Voltaram mais de uma vez: ${summary.rates.repeat}%`,
      `Aniversariantes hoje: ${summary.birthdays.today}, na semana: ${summary.birthdays.week}`,
      `Aniversário cadastrado: ${summary.rates.birthdayCoverage}% da base`,
      summary.money ? `Ticket médio: R$ ${summary.money.avgTicket}, gasto médio por cliente: R$ ${summary.money.perClient}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });
  const headline = String(parsed?.headline || '').trim().slice(0, 220);
  const tip = String(parsed?.tip || '').trim().slice(0, 220);
  if (!headline) return { ...base, headline: fallback, tip: '', ai: false };
  await AiBrief.updateOne({ shopId, kind: 'crm', day }, { $set: { text: headline, bullets: tip ? [tip] : [], ai: true, numbers: c } }, { upsert: true });
  return { ...base, headline, tip, ai: true };
}

/** Birthdays today, for the daily brief. */
async function birthdaysToday(shopId, now = new Date()) {
  const t = spToday(now);
  return Client.countDocuments({ shopId, birthDay: t.day, birthMonth: t.month });
}

module.exports = { crmSummary, crmList, crmInsight, clientOverview, birthdaysToday, daysToBirthday, segmentOf, SEGMENTS };
