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
const SEGMENTS = ['birthdays', 'inactive', 'recurring', 'new', 'vip', 'owing', 'due', 'returned', 'never', 'all'];
/** "Voltaram": a repeat order within this many days. */
const RETURNED_DAYS = 30;
const OWED = ['ready', 'delivered'];

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
        ready: { $sum: { $cond: [{ $eq: ['$status', 'ready'] }, 1, 0] } },
        // What the client still owes on work that is ready or already handed over.
        owed: {
          $sum: {
            $cond: [
              { $and: [{ $in: ['$status', OWED] }, { $gt: [{ $ifNull: ['$pricing.remaining', 0] }, 0.009] }] },
              { $ifNull: ['$pricing.remaining', 0] },
              0,
            ],
          },
        },
        firstAt: { $min: '$createdAt' },
        lastAt: { $max: '$createdAt' },
        dates: { $push: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$$REMOVE', '$createdAt'] } },
      },
    },
  ]);
  return new Map(
    rows.map((r) => {
      const dates = (r.dates || []).map((d) => new Date(d).getTime()).sort((a, b) => b - a);
      // Visit before the latest one: how long the client took to come back.
      const prevAt = dates.length >= 2 ? new Date(dates[1]) : null;
      const lastBuyAt = dates.length ? new Date(dates[0]) : null;
      delete r.dates;
      return [String(r._id), { ...r, prevAt, lastBuyAt }];
    })
  );
}

/** Came back recently: a repeat order in the last RETURNED_DAYS days. */
function returnedInfo(stats, now, inactiveDays) {
  if (!stats?.prevAt || !stats.lastBuyAt) return null;
  if ((now - stats.lastBuyAt) / DAY > RETURNED_DAYS) return null;
  const after = Math.round((stats.lastBuyAt - stats.prevAt) / DAY);
  return { returnedAt: stats.lastBuyAt, returnedAfterDays: after, reactivated: after >= inactiveDays };
}

function segmentOf(stats, now, inactiveDays) {
  if (!stats || !stats.orders) return 'never';
  const since = (now - new Date(stats.lastAt)) / DAY;
  if (!stats.open && since >= inactiveDays) return 'inactive';
  if (stats.orders >= 2) return 'recurring';
  if ((now - new Date(stats.firstAt)) / DAY <= 30) return 'new';
  return 'once';
}

/** Average days between orders (2+ orders), or null. */
function avgGap(stats) {
  if (!stats || stats.orders < 2) return null;
  return Math.round((new Date(stats.lastAt) - new Date(stats.firstAt)) / DAY / (stats.orders - 1));
}

/**
 * "Hora de voltar": a returning client past their own usual gap (×1.3, at least 14 days),
 * with nothing open and not yet counted as gone quiet.
 */
function isDue(stats, now, inactiveDays) {
  const gap = avgGap(stats);
  if (gap == null || stats.open) return false;
  const since = (now - new Date(stats.lastAt)) / DAY;
  return since >= Math.max(14, gap * 1.3) && since < inactiveDays;
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

function owedText(name, shop, owed, ready, withValue = true) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  const value = withValue ? ` de R$ ${money(owed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
  return ready
    ? `${hi} Aqui é da ${shop}. Seu pedido está pronto para retirada! Fica um saldo${value}, pode acertar na retirada ou por Pix.`
    : `${hi} Aqui é da ${shop}. Ficou um saldo${value} do seu último pedido. Consegue acertar por Pix quando puder? Qualquer dúvida, estamos aqui.`;
}

function dueText(name, shop, days) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Já faz ${days} dias desde a sua última visita, normalmente é por agora que você volta. Quer que a gente separe um horário para você?`;
}

function welcomeText(name, shop) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Obrigado por escolher a gente! Ficou tudo certo com o serviço? Quando precisar de novo, é só chamar.`;
}

function returnedText(name, shop) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Que bom ter você de volta! Obrigado pela confiança de novo. Qualquer coisa no seu pedido, é só chamar.`;
}

function thanksText(name, shop) {
  const hi = firstName(name) ? `Oi, ${firstName(name)}!` : 'Oi!';
  return `${hi} Aqui é da ${shop}. Obrigado por sempre confiar na gente! Clientes como você fazem a diferença. Qualquer coisa, estamos à disposição.`;
}

function rowFor(client, stats, { now, shop, segment, showMoney, moneyInText = showMoney }) {
  const orders = stats?.orders || 0;
  const daysSince = stats?.lastAt ? Math.floor((now - new Date(stats.lastAt)) / DAY) : null;
  const birthday = client.birthDay && client.birthMonth ? { day: client.birthDay, month: client.birthMonth, year: client.birthYear || null } : null;
  const inDays = birthday ? daysToBirthday(birthday.day, birthday.month, now) : null;
  // Age they turn on the next birthday.
  const age = birthday?.year ? spToday(now).year - birthday.year + (inDays != null && inDays > 0 && new Date(Date.UTC(spToday(now).year, birthday.month - 1, birthday.day)) < new Date(Date.UTC(spToday(now).year, spToday(now).month - 1, spToday(now).day)) ? 1 : 0) : null;
  const owed = money(stats?.owed);
  const text =
    segment === 'birthdays'
      ? birthdayText(client.name, shop)
      : segment === 'owing'
        ? owedText(client.name, shop, owed, stats?.ready > 0, moneyInText)
        : segment === 'due'
          ? dueText(client.name, shop, daysSince || 0)
          : segment === 'inactive'
            ? comebackText(client.name, shop, daysSince || 90)
            : segment === 'new'
              ? welcomeText(client.name, shop)
              : segment === 'returned'
                ? returnedText(client.name, shop)
              : segment === 'recurring' || segment === 'vip'
                ? thanksText(client.name, shop)
                : null;
  const waUrl = text && client.phone && !client.whatsappOptOut ? buildWaMeUrl(client.phone, text) : null;
  return {
    id: String(client._id),
    name: client.name || '',
    phone: client.phone || '',
    orders,
    ...(showMoney ? { spent: money(stats?.spent), ticket: orders ? money((stats?.spent || 0) / orders) : 0, owed } : {}),
    avgGapDays: avgGap(stats),
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

function monthKey(date) {
  // São Paulo month (UTC-3) so late-evening orders land in the right month.
  const local = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Who comes back. Per month: new clients (first order), clients who returned,
 * those who came back after going quiet, and the money from each group.
 * Plus the second-visit rate (the hardest step) and the usual time to come back.
 */
async function crmRetention(shopId, opts = {}) {
  const orders = await Order.find({ shopId, deletedAt: null, clientId: { $ne: null }, status: { $ne: 'cancelled' } })
    .select('clientId createdAt pricing.total')
    .sort({ createdAt: 1 })
    .lean();
  return retentionFrom(orders, opts);
}

/** Pure part of crmRetention: `orders` sorted by createdAt, cancelled already out. */
function retentionFrom(orders, { months = 6, inactiveDays = 90, showMoney = true, now = new Date() } = {}) {
  const span = Math.min(12, Math.max(3, Number(months) || 6));
  const keys = [];
  const cursor = new Date(Date.UTC(new Date(now.getTime() - 3 * 60 * 60 * 1000).getUTCFullYear(), new Date(now.getTime() - 3 * 60 * 60 * 1000).getUTCMonth(), 15));
  for (let i = span - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - i, 15));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  const rows = new Map(keys.map((k) => [k, { month: k, newClients: new Set(), returning: new Set(), reactivated: new Set(), newValue: 0, returningValue: 0 }]));
  const last = new Map();
  const visits = new Map();
  const gapsToSecond = [];
  const firstAt = new Map();
  const returned30Set = new Set();
  const reactivated90 = new Set();
  let reactivatedValue = 0;
  for (const o of orders) {
    const id = String(o.clientId);
    const at = new Date(o.createdAt).getTime();
    const value = Number(o.pricing?.total) || 0;
    const prev = last.get(id);
    const n = (visits.get(id) || 0) + 1;
    visits.set(id, n);
    if (!firstAt.has(id)) firstAt.set(id, at);
    const row = rows.get(monthKey(o.createdAt));
    if (prev == null) {
      if (row) {
        row.newClients.add(id);
        row.newValue += value;
      }
    } else {
      const gap = (at - prev) / DAY;
      if (n === 2) gapsToSecond.push(gap);
      if (row) {
        row.returning.add(id);
        row.returningValue += value;
        if (gap >= inactiveDays) row.reactivated.add(id);
      }
      if ((now - at) / DAY <= RETURNED_DAYS && gap >= 1) returned30Set.add(id);
      if ((now - at) / DAY <= 90 && gap >= inactiveDays) {
        reactivated90.add(id);
        reactivatedValue += value;
      }
    }
    last.set(id, at);
  }
  const returned30 = returned30Set.size;
  // Second visit: only clients whose first order is old enough to have had the chance (60+ days).
  let eligible = 0;
  let came = 0;
  for (const [id, first] of firstAt) {
    if ((now - first) / DAY < 60) continue;
    eligible += 1;
    if ((visits.get(id) || 0) >= 2) came += 1;
  }
  const monthsOut = keys.map((k) => {
    const r = rows.get(k);
    const active = new Set([...r.newClients, ...r.returning]).size;
    return {
      month: k,
      newClients: r.newClients.size,
      returning: r.returning.size,
      reactivated: r.reactivated.size,
      returnRate: active ? Math.round((r.returning.size / active) * 100) : 0,
      ...(showMoney ? { newValue: money(r.newValue), returningValue: money(r.returningValue) } : {}),
    };
  });
  const totalNew = monthsOut.reduce((a, m) => a + (m.newValue || 0), 0);
  const totalRet = monthsOut.reduce((a, m) => a + (m.returningValue || 0), 0);
  return {
    months: monthsOut,
    inactiveDays,
    secondVisit: { rate: eligible ? Math.round((came / eligible) * 100) : null, eligible, came, medianDays: median(gapsToSecond) },
    returned30,
    reactivated90: { clients: reactivated90.size, ...(showMoney ? { value: money(reactivatedValue) } : {}) },
    ...(showMoney && totalNew + totalRet > 0 ? { returningShare: Math.round((totalRet / (totalNew + totalRet)) * 100) } : {}),
  };
}

/** Overview numbers for the CRM home. */
async function crmSummary(shopId, { inactiveDays = 90, showMoney = true, now = new Date() } = {}) {
  const [clients, stats] = await Promise.all([
    Client.find({ shopId }).select('birthDay birthMonth createdAt source').lean(),
    clientStats(shopId),
  ]);
  const counts = { clients: clients.length, active90: 0, recurring: 0, new30: 0, inactive: 0, never: 0, once: 0, vip: 0, owing: 0, due: 0 };
  let owed = 0;
  let inactiveSpent = 0;
  const bySource = new Map();
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
    if (seg === 'inactive') inactiveSpent += s?.spent || 0;
    if (s?.owed > 0.009) {
      counts.owing += 1;
      owed += s.owed;
    }
    if (s && isDue(s, now, inactiveDays)) counts.due += 1;
    const source = String(c.source || '').trim();
    if (source) {
      const row = bySource.get(source) || { source, clients: 0, spent: 0 };
      row.clients += 1;
      row.spent += s?.spent || 0;
      bySource.set(source, row);
    }
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
  // Share of revenue from the top 20% of buyers (spends is sorted high → low).
  const topCount = Math.max(1, Math.ceil(buyers * 0.2));
  const topShare = spent > 0 && buyers >= 5 ? Math.round((spends.slice(0, topCount).reduce((a, b) => a + b, 0) / spent) * 100) : null;
  const withSource = [...bySource.values()].reduce((a, r) => a + r.clients, 0);
  return {
    inactiveDays,
    counts,
    buckets,
    birthdays: { today: birthdaysToday, week: birthdaysWeek, registered: withBirthday },
    rates: {
      repeat: buyers ? Math.round(((buckets.two_three + buckets.four_plus) / buyers) * 100) : 0,
      active: counts.clients ? Math.round((counts.active90 / counts.clients) * 100) : 0,
      birthdayCoverage: counts.clients ? Math.round((withBirthday / counts.clients) * 100) : 0,
      sourceCoverage: counts.clients ? Math.round((withSource / counts.clients) * 100) : 0,
    },
    sources: [...bySource.values()]
      .sort((a, b) => b.clients - a.clients)
      .slice(0, 6)
      .map((r) => ({ source: r.source, clients: r.clients, ...(showMoney ? { spent: money(r.spent) } : {}) })),
    ...(showMoney
      ? {
          money: {
            spent: money(spent),
            avgTicket: orders ? money(spent / orders) : 0,
            perClient: buyers ? money(spent / buyers) : 0,
            owed: money(owed),
            inactiveSpent: money(inactiveSpent),
            topShare,
          },
        }
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
    else if (seg === 'owing') keep = s && s.owed > 0.009;
    else if (seg === 'due') keep = s && isDue(s, now, inactiveDays);
    else if (seg === 'returned') keep = Boolean(returnedInfo(s, now, inactiveDays));
    else keep = own === seg;
    if (keep) {
      const back = returnedInfo(s, now, inactiveDays);
      rows.push({ ...rowFor(c, s, { now, shop, segment: seg, showMoney: true, moneyInText: showMoney }), segment: own, ...(back || {}) });
    }
  }
  if (seg === 'birthdays') rows.sort((a, b) => a.birthdayIn - b.birthdayIn || a.name.localeCompare(b.name));
  else if (seg === 'owing') rows.sort((a, b) => (b.owed || 0) - (a.owed || 0));
  else if (seg === 'due') rows.sort((a, b) => (b.spent || 0) - (a.spent || 0) || (b.daysSince || 0) - (a.daysSince || 0));
  else if (seg === 'inactive') rows.sort((a, b) => (b.spent || 0) - (a.spent || 0) || (b.daysSince || 0) - (a.daysSince || 0));
  else if (seg === 'recurring' || seg === 'vip') rows.sort((a, b) => b.orders - a.orders || (b.spent || 0) - (a.spent || 0));
  else if (seg === 'new') rows.sort((a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0));
  else if (seg === 'returned') rows.sort((a, b) => Number(b.reactivated) - Number(a.reactivated) || new Date(b.returnedAt || 0) - new Date(a.returnedAt || 0));
  else rows.sort((a, b) => new Date(b.lastOrderAt || 0) - new Date(a.lastOrderAt || 0) || a.name.localeCompare(b.name));
  if (seg === 'vip') rows = rows.slice(0, Math.max(10, Math.ceil(rows.length * 0.2)));
  const total = rows.length;
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const size = Math.min(500, Math.max(1, Number(limit) || 200));
  rows = rows.slice(start, start + size);
  if (!showMoney) rows = rows.map(({ spent, ticket, owed, ...rest }) => rest); // eslint-disable-line no-unused-vars
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
    .select('code status pricing createdAt deliveredAt items.shoeModel items.brand items.services.name items.services.id services.name shoeModel feedback.score quoteRefusal.refusedAt recovered.at')
    .lean();
  const Quote = require('../models/Quote');
  const [all, shop, quotes] = await Promise.all([
    clientStats(shopId),
    shopLabel(shopId),
    Quote.find({ shopId, clientId: client._id }).select('stage value').lean(),
  ]);
  const s = all.get(String(client._id));
  const segment = segmentOf(s, now, 90);

  // Journey: days since the previous (non-cancelled) visit, oldest → newest.
  const gapById = new Map();
  let prevAt = null;
  let longestGap = null;
  for (const o of [...orders].reverse()) {
    if (o.status === 'cancelled') continue;
    const at = new Date(o.createdAt).getTime();
    if (prevAt != null) {
      const gap = Math.round((at - prevAt) / DAY);
      gapById.set(String(o._id), gap);
      longestGap = longestGap == null ? gap : Math.max(longestGap, gap);
    }
    prevAt = at;
  }
  const serviceCount = new Map();
  const scores = [];
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const names = (o.items || []).flatMap((it) => (it.services || []).filter((x) => String(x.id || '') !== 'import').map((x) => x.name));
    const list = names.length ? names : (o.services || []).map((x) => x.name);
    for (const name of list.map((n) => String(n || '').trim()).filter(Boolean)) serviceCount.set(name, (serviceCount.get(name) || 0) + 1);
    if (o.feedback?.score) scores.push(o.feedback.score);
  }
  const quoteStats = { open: 0, won: 0, lost: 0 };
  for (const q of quotes) {
    if (q.stage === 'won') quoteStats.won += 1;
    else if (q.stage === 'lost') quoteStats.lost += 1;
    else quoteStats.open += 1;
  }
  const back = returnedInfo(s, now, 90);
  return {
    stats: {
      ...rowFor(client, s, { now, shop, segment, showMoney }),
      segment,
      firstOrderAt: s?.firstAt || null,
      avgGapDays:
        s && s.orders >= 2 ? Math.round((new Date(s.lastAt) - new Date(s.firstAt)) / DAY / (s.orders - 1)) : null,
      returns: Math.max(0, (s?.orders || 0) - 1),
      longestGapDays: longestGap,
      favoriteServices: [...serviceCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({ name, count })),
      avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
      reviews: scores.length,
      quotes: quoteStats,
      recoveredOrders: orders.filter((o) => o.recovered?.at).length,
      ...(back || {}),
    },
    orders: orders.map((o) => ({
      gapDays: gapById.has(String(o._id)) ? gapById.get(String(o._id)) : null,
      recovered: Boolean(o.recovered?.at),
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
  if (c.owing && summary.money?.owed) moves.push({ id: 'owing', title: `Cobrar R$ ${Math.round(summary.money.owed).toLocaleString('pt-BR')} de ${c.owing} cliente${c.owing === 1 ? '' : 's'}`, segment: 'owing' });
  if (c.due) moves.push({ id: 'due', title: `Lembrar ${c.due} cliente${c.due === 1 ? ' que já devia' : 's que já deviam'} ter voltado`, segment: 'due' });
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

module.exports = { crmSummary, crmList, crmInsight, crmRetention, retentionFrom, clientOverview, returnedInfo, birthdaysToday, daysToBirthday, segmentOf, isDue, avgGap, SEGMENTS };
