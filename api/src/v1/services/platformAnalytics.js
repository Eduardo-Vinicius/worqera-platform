/**
 * Product analytics for the Worqera team: shop activation funnel, weekly cohorts,
 * engagement, order and quote funnels, shop health, accounts and the 360° view.
 */
const mongoose = require('mongoose');
const { range, dayKey, delta, memo } = require('../lib/periods');

const H = 60 * 60 * 1000;
const DAY = 24 * H;
const DEMO_CLIENT = 'Cliente demonstração';
const LIVE = { deletedAt: null, clientName: { $ne: DEMO_CLIENT } };

function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const STEPS = [
  ['created', 'Cadastro'],
  ['onboarded', 'Configurou a loja'],
  ['firstOrder', '1º pedido'],
  ['firstDelivered', '1º pedido entregue'],
  ['paid', 'Assinatura paga'],
];

/** Pure: per-shop timestamps → steps with count, % of the previous step and median hours from it. */
function funnelFrom(rows) {
  return STEPS.map(([key, label], i) => {
    const reached = rows.filter((r) => (key === 'paid' ? r.paid && r.firstOrder : r[key]));
    const prevKey = i ? STEPS[i - 1][0] : null;
    const prevCount = i ? rows.filter((r) => (prevKey === 'paid' ? r.paid : r[prevKey])).length : reached.length;
    const hours =
      i && key !== 'paid'
        ? reached.filter((r) => r[prevKey]).map((r) => Math.round(((r[key] - r[prevKey]) / H) * 10) / 10)
        : [];
    return {
      key,
      label,
      count: reached.length,
      pctOfPrev: prevCount ? Math.round((reached.length / prevCount) * 100) : 0,
      pctOfTotal: rows.length ? Math.round((reached.length / rows.length) * 100) : 0,
      medianHours: i && key !== 'paid' ? median(hours) : null,
    };
  });
}

function weekStart(date) {
  // Monday of the São Paulo week, as YYYY-MM-DD
  const local = new Date(new Date(date).getTime() - 3 * H);
  const dow = (local.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow)).toISOString().slice(0, 10);
}

/** Pure: cohort = signup week; cell N = % of the cohort active in week N. */
function cohortTable({ users, activity, now = new Date(), weeks = 8 }) {
  const thisWeek = weekStart(now);
  const activeWeeks = new Map();
  for (const row of activity) {
    const set = activeWeeks.get(String(row.userId)) || new Set();
    set.add(weekStart(new Date(`${row.day}T15:00:00.000Z`)));
    activeWeeks.set(String(row.userId), set);
  }
  const byWeek = new Map();
  for (const u of users) {
    const w = weekStart(u.createdAt);
    const list = byWeek.get(w) || [];
    list.push(String(u.id));
    byWeek.set(w, list);
  }
  const addWeeks = (w, n) => new Date(Date.parse(`${w}T12:00:00.000Z`) + n * 7 * DAY).toISOString().slice(0, 10);
  const rows = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const week = addWeeks(thisWeek, -i);
    const members = byWeek.get(week) || [];
    const cells = [];
    for (let k = 0; k <= i; k += 1) {
      const target = addWeeks(week, k);
      const active = members.filter((id) => activeWeeks.get(id)?.has(target)).length;
      cells.push(members.length ? Math.round((active / members.length) * 100) : 0);
    }
    rows.push({ week, size: members.length, cells });
  }
  return { weeks, rows };
}

function valueBand(total) {
  const v = Number(total) || 0;
  if (v <= 0) return 'Sem valor';
  if (v <= 100) return 'Até R$ 100';
  if (v <= 300) return 'R$ 100–300';
  if (v <= 1000) return 'R$ 300–1.000';
  return 'Acima de R$ 1.000';
}

async function activationFunnel({ days }) {
  return memo(`an:funnel:${days}`, 60000, async () => {
    const Shop = require('../models/Shop');
    const Order = require('../models/Order');
    const Subscription = require('../models/Subscription');
    const p = range(days);
    const shops = await Shop.find({ createdAt: { $gte: p.from, $lt: p.to } }).select('createdAt onboarding.completedAt').lean();
    const ids = shops.map((s) => s._id);
    const [firsts, subs] = await Promise.all([
      Order.aggregate([
        { $match: { shopId: { $in: ids }, ...LIVE } },
        {
          $group: {
            _id: '$shopId',
            firstOrder: { $min: '$createdAt' },
            firstDelivered: { $min: { $cond: [{ $eq: ['$status', 'delivered'] }, '$deliveredAt', null] } },
          },
        },
      ]),
      Subscription.find({ shopId: { $in: ids }, status: 'active', provider: { $nin: ['Dev'] } }).select('shopId').lean(),
    ]);
    const byShop = new Map(firsts.map((f) => [String(f._id), f]));
    const paid = new Set(subs.map((s) => String(s.shopId)));
    const rows = shops.map((s) => {
      const f = byShop.get(String(s._id));
      return {
        created: new Date(s.createdAt).getTime(),
        onboarded: s.onboarding?.completedAt ? new Date(s.onboarding.completedAt).getTime() : null,
        firstOrder: f?.firstOrder ? new Date(f.firstOrder).getTime() : null,
        firstDelivered: f?.firstDelivered ? new Date(f.firstDelivered).getTime() : null,
        paid: paid.has(String(s._id)),
      };
    });
    return { days, shops: rows.length, steps: funnelFrom(rows) };
  });
}

async function cohorts({ weeks = 8 } = {}) {
  return memo(`an:cohorts:${weeks}`, 60000, async () => {
    const User = require('../models/User');
    const ActiveAccount = require('../models/ActiveAccount');
    const since = new Date(Date.now() - weeks * 7 * DAY);
    const [users, activity, oldest] = await Promise.all([
      User.find({ createdAt: { $gte: since } }).select('_id createdAt').lean(),
      ActiveAccount.aggregate([
        { $match: { dayDate: { $gte: since } } },
        { $group: { _id: { userId: '$userId', day: '$day' } } },
      ]),
      ActiveAccount.findOne().sort({ dayDate: 1 }).select('day').lean(),
    ]);
    const table = cohortTable({
      users: users.map((u) => ({ id: String(u._id), createdAt: u.createdAt })),
      activity: activity.map((r) => r._id),
      weeks,
    });
    const historyDays = oldest ? Math.round((Date.now() - Date.parse(`${oldest.day}T12:00:00.000Z`)) / DAY) : 0;
    return { ...table, historyDays, lowHistory: historyDays < weeks * 7 };
  });
}

async function engagement({ days }) {
  return memo(`an:engagement:${days}`, 60000, async () => {
    const ActiveAccount = require('../models/ActiveAccount');
    const p = range(days);
    const w = range(7);
    const m = range(30);
    const [perDay, wau, mau, firstSeen, byClient] = await Promise.all([
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days } } },
        { $group: { _id: { day: '$day', userId: '$userId' } } },
        { $group: { _id: '$_id.day', users: { $sum: 1 } } },
      ]),
      ActiveAccount.distinct('userId', { day: { $in: w.days } }),
      ActiveAccount.distinct('userId', { day: { $in: m.days } }),
      ActiveAccount.aggregate([
        { $group: { _id: '$userId', first: { $min: '$day' }, inPeriod: { $max: { $cond: [{ $in: ['$day', p.days] }, 1, 0] } } } },
        { $match: { inPeriod: 1 } },
        { $group: { _id: { $cond: [{ $gte: ['$first', p.days[0]] }, 'new', 'returning'] }, users: { $sum: 1 } } },
      ]),
      ActiveAccount.aggregate([
        { $match: { day: { $in: p.days } } },
        { $group: { _id: { client: '$client', userId: '$userId' } } },
        { $group: { _id: '$_id.client', users: { $sum: 1 } } },
      ]),
    ]);
    const dau = perDay.length ? Math.round((perDay.reduce((acc, d) => acc + d.users, 0) / p.days.length) * 10) / 10 : 0;
    const split = Object.fromEntries(firstSeen.map((r) => [r._id, r.users]));
    return {
      days,
      dau,
      wau: wau.length,
      mau: mau.length,
      stickiness: mau.length ? Math.round((dau / mau.length) * 100) : 0,
      newUsers: split.new || 0,
      returningUsers: split.returning || 0,
      byClient: byClient.map((r) => ({ client: r._id, users: r.users })).sort((x, y) => y.users - x.users),
      series: p.days.map((day) => ({ day, value: perDay.find((d) => d._id === day)?.users || 0 })),
    };
  });
}

async function transactions({ days }) {
  return memo(`an:tx:${days}`, 60000, async () => {
    const Order = require('../models/Order');
    const Quote = require('../models/Quote');
    const p = range(days);
    const inPeriod = { createdAt: { $gte: p.from, $lt: p.to } };
    const [statusRows, deliverTimes, bands, services, quoteRows, quoteContact] = await Promise.all([
      Order.aggregate([
        { $match: { ...LIVE, ...inPeriod } },
        {
          $group: {
            _id: null,
            created: { $sum: 1 },
            moving: { $sum: { $cond: [{ $in: ['$status', ['in_progress', 'ready', 'delivered']] }, 1, 0] } },
            ready: { $sum: { $cond: [{ $in: ['$status', ['ready', 'delivered']] }, 1, 0] } },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            paid: { $sum: { $cond: [{ $and: [{ $gt: ['$pricing.total', 0] }, { $lte: ['$pricing.remaining', 0.009] }] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...LIVE, status: 'delivered', deliveredAt: { $gte: p.from, $lt: p.to } } },
        { $project: { hours: { $divide: [{ $subtract: ['$deliveredAt', '$createdAt'] }, H] } } },
        { $sort: { hours: 1 } },
        { $limit: 5000 },
      ]),
      Order.aggregate([{ $match: { ...LIVE, ...inPeriod } }, { $project: { total: { $ifNull: ['$pricing.total', 0] } } }, { $limit: 20000 }]),
      Order.aggregate([
        { $match: { ...LIVE, ...inPeriod } },
        { $unwind: '$items' },
        { $unwind: '$items.services' },
        { $group: { _id: '$items.services.name', count: { $sum: 1 } } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Quote.aggregate([
        { $match: inPeriod },
        {
          $group: {
            _id: null,
            created: { $sum: 1 },
            contacted: { $sum: { $cond: [{ $gt: ['$contactCount', 0] }, 1, 0] } },
            won: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] } },
            value: { $sum: { $ifNull: ['$value', 0] } },
            wonValue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, { $ifNull: ['$value', 0] }, 0] } },
          },
        },
      ]),
      Quote.aggregate([
        { $match: { ...inPeriod, 'activity.0': { $exists: true } } },
        { $project: { createdAt: 1, first: { $min: '$activity.at' } } },
        { $project: { hours: { $divide: [{ $subtract: ['$first', '$createdAt'] }, H] } } },
        { $limit: 5000 },
      ]),
    ]);
    const s = statusRows[0] || { created: 0, moving: 0, ready: 0, delivered: 0, paid: 0, cancelled: 0 };
    const step = (key, label, count, prev) => ({ key, label, count, pctOfPrev: prev ? Math.round((count / prev) * 100) : 0 });
    const bandCount = {};
    for (const b of bands) bandCount[valueBand(b.total)] = (bandCount[valueBand(b.total)] || 0) + 1;
    const q = quoteRows[0] || { created: 0, contacted: 0, won: 0, lost: 0, value: 0, wonValue: 0 };
    return {
      days,
      orders: {
        steps: [
          step('created', 'Criados', s.created, s.created),
          step('moving', 'Em produção ou além', s.moving, s.created),
          step('ready', 'Prontos', s.ready, s.moving),
          step('delivered', 'Entregues', s.delivered, s.ready),
          step('paid', 'Pagos', s.paid, s.delivered),
        ],
        cancelled: s.cancelled,
        medianHoursToDeliver: median(deliverTimes.map((d) => d.hours)) != null ? Math.round(median(deliverTimes.map((d) => d.hours))) : null,
        valueBands: ['Sem valor', 'Até R$ 100', 'R$ 100–300', 'R$ 300–1.000', 'Acima de R$ 1.000'].map((label) => ({ label, count: bandCount[label] || 0 })),
        topServices: services.map((x) => ({ name: x._id, count: x.count })),
      },
      quotes: {
        steps: [
          step('created', 'Orçamentos', q.created, q.created),
          step('contacted', 'Com contato', q.contacted, q.created),
          step('won', 'Recuperados', q.won, q.contacted),
        ],
        lost: q.lost,
        value: Math.round(q.value),
        wonValue: Math.round(q.wonValue),
        medianHoursToFirstContact: median(quoteContact.map((x) => x.hours)) != null ? Math.round(median(quoteContact.map((x) => x.hours)) * 10) / 10 : null,
      },
    };
  });
}

async function shopsHealth({ days }) {
  return memo(`an:shops:${days}`, 60000, async () => {
    const Shop = require('../models/Shop');
    const Order = require('../models/Order');
    const Subscription = require('../models/Subscription');
    const Membership = require('../models/Membership');
    const ActiveAccount = require('../models/ActiveAccount');
    const billing = require('./billingService');
    const p = range(days);
    const [shops, subs, members, lastSeen, cur, prev, recent] = await Promise.all([
      Shop.find({}).select('name branding.displayName status createdAt onboarding.completedAt vertical').lean(),
      Subscription.find({}).select('shopId planCode status cycle founder trialEndsAt').lean(),
      Membership.aggregate([{ $match: { active: true } }, { $group: { _id: '$shopId', members: { $sum: 1 } } }]),
      ActiveAccount.aggregate([{ $match: { shopId: { $ne: null } } }, { $group: { _id: '$shopId', last: { $max: '$lastSeenAt' } } }]),
      Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: p.from, $lt: p.to } } }, { $group: { _id: '$shopId', n: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: p.prevFrom, $lt: p.prevTo } } }, { $group: { _id: '$shopId', n: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { ...LIVE, createdAt: { $gte: new Date(Date.now() - 30 * DAY) } } }, { $group: { _id: '$shopId', n: { $sum: 1 } } }]),
    ]);
    const map = (rows, field) => new Map(rows.map((r) => [String(r._id || r.shopId), field ? r[field] : r]));
    const subBy = new Map(subs.map((sub) => [String(sub.shopId), sub]));
    const memBy = map(members, 'members');
    const seenBy = map(lastSeen, 'last');
    const curBy = map(cur, 'n');
    const prevBy = map(prev, 'n');
    const recentBy = map(recent, 'n');
    const now = Date.now();
    const rows = shops.map((s) => {
      const id = String(s._id);
      const sub = subBy.get(id);
      const ordersNow = curBy.get(id) || 0;
      const ordersBefore = prevBy.get(id) || 0;
      const last = seenBy.get(id) || null;
      const idleDays = last ? Math.floor((now - new Date(last).getTime()) / DAY) : null;
      const paying = sub && ['active', 'past_due'].includes(sub.status);
      const mrr = paying
        ? Math.round(
            (sub.cycle === 'yearly'
              ? (billing.priceCents(sub.planCode, 'yearly') || 0) / 12
              : billing.effectivePrice(sub).priceCents || 0) / 100
          )
        : 0;
      const drop = ordersBefore >= 10 && ordersNow < ordersBefore * 0.5;
      const idle = idleDays == null ? now - new Date(s.createdAt).getTime() > 30 * DAY : idleDays >= 30;
      return {
        id,
        name: s.branding?.displayName || s.name,
        status: s.status,
        plan: sub?.planCode || null,
        subscription: sub?.status || null,
        mrr,
        members: memBy.get(id) || 0,
        lastActivity: last,
        idleDays,
        orders: ordersNow,
        ordersPrev: ordersBefore,
        change: delta(ordersNow, ordersBefore).pct,
        atRisk: s.status === 'active' && (idle || drop),
        riskReason: idle ? 'Sem atividade há 30 dias' : drop ? 'Pedidos caíram mais de 50%' : null,
        createdAt: s.createdAt,
        stage: paying && (recentBy.get(id) || 0) > 0 ? 'using' : paying ? 'paid' : s.onboarding?.completedAt ? 'configured' : 'created',
      };
    });
    const pipeline = ['created', 'configured', 'paid', 'using'].map((stage) => ({
      stage,
      label: { created: 'Cadastrada', configured: 'Configurada', paid: 'Pagante', using: 'Pagante e usando' }[stage],
      count: rows.filter((r) => r.stage === stage).length,
    }));
    return { days, pipeline, atRisk: rows.filter((r) => r.atRisk).length, shops: rows.sort((x, y) => y.orders - x.orders) };
  });
}

/** Account segments for the list, with counts. */
async function segmentIds(segment) {
  const ActiveAccount = require('../models/ActiveAccount');
  const Membership = require('../models/Membership');
  const Order = require('../models/Order');
  const Subscription = require('../models/Subscription');
  const last30 = range(30).days;
  if (segment === 'active') return { in: await ActiveAccount.distinct('userId', { day: { $in: last30 } }) };
  if (segment === 'inactive') return { nin: await ActiveAccount.distinct('userId', { day: { $in: last30 } }) };
  if (segment === 'owners') return { in: (await Membership.distinct('userId', { role: 'owner', active: true })).map(String) };
  if (segment === 'no_activation') {
    const withOrders = await Order.distinct('shopId', LIVE);
    return { in: (await Membership.distinct('userId', { role: 'owner', active: true, shopId: { $nin: withOrders } })).map(String) };
  }
  if (segment && segment.startsWith('plan:')) {
    const shops = await Subscription.distinct('shopId', { planCode: segment.slice(5), status: { $in: ['active', 'past_due', 'trialing'] } });
    return { in: (await Membership.distinct('userId', { shopId: { $in: shops }, active: true })).map(String) };
  }
  return null;
}

function idFilter(ids) {
  if (!ids) return {};
  const toIds = (list) => list.filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(String(id)));
  if (ids.in) return { _id: { $in: toIds(ids.in) } };
  return { _id: { $nin: toIds(ids.nin) } };
}

async function listAccounts({ segment = 'all', q = '', page = 1 }) {
  const User = require('../models/User');
  const Membership = require('../models/Membership');
  const Shop = require('../models/Shop');
  const ActiveAccount = require('../models/ActiveAccount');
  const segments = ['all', 'active', 'inactive', 'owners', 'no_activation', 'plan:WORQERA_BASIC', 'plan:WORQERA_PRO', 'plan:WORQERA_BUSINESS'];
  const counts = await memo('an:segments', 60000, async () => {
    const out = {};
    for (const s of segments) out[s] = await User.countDocuments(idFilter(await segmentIds(s)));
    return out;
  });
  const filter = idFilter(await segmentIds(segment));
  const term = String(q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ email: rx }, { name: rx }];
  }
  const size = 50;
  const skip = (Math.max(1, Number(page) || 1) - 1) * size;
  const [users, total] = await Promise.all([
    User.find(filter).select('name email createdAt emailVerifiedAt').sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    User.countDocuments(filter),
  ]);
  const ids = users.map((u) => u._id);
  const [memberships, seen] = await Promise.all([
    Membership.find({ userId: { $in: ids }, active: true }).select('userId shopId role').lean(),
    ActiveAccount.aggregate([{ $match: { userId: { $in: ids.map(String) } } }, { $group: { _id: '$userId', last: { $max: '$lastSeenAt' } } }]),
  ]);
  const shops = await Shop.find({ _id: { $in: memberships.map((m) => m.shopId) } }).select('name branding.displayName').lean();
  const shopName = new Map(shops.map((s) => [String(s._id), s.branding?.displayName || s.name]));
  const seenBy = new Map(seen.map((s) => [s._id, s.last]));
  return {
    segment,
    counts,
    total,
    page: Math.max(1, Number(page) || 1),
    accounts: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      verified: Boolean(u.emailVerifiedAt),
      lastActivity: seenBy.get(String(u._id)) || null,
      shops: memberships
        .filter((m) => String(m.userId) === String(u._id))
        .map((m) => ({ id: String(m.shopId), name: shopName.get(String(m.shopId)) || 'Loja', role: m.role })),
    })),
  };
}

async function account360(id) {
  const User = require('../models/User');
  const Membership = require('../models/Membership');
  const Shop = require('../models/Shop');
  const Subscription = require('../models/Subscription');
  const Order = require('../models/Order');
  const ActiveAccount = require('../models/ActiveAccount');
  const SecurityEvent = require('../models/SecurityEvent');
  if (!mongoose.isValidObjectId(id)) {
    const err = new Error('Conta não encontrada');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const user = await User.findById(id).select('name email createdAt emailVerifiedAt tokenVersion lastLocation.at').lean();
  if (!user) {
    const err = new Error('Conta não encontrada');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  const since30 = new Date(Date.now() - 30 * DAY);
  const memberships = await Membership.find({ userId: user._id }).select('shopId role active createdAt').lean();
  const shopIds = memberships.map((m) => m.shopId);
  const [shops, subs, activity, events, ordersCreated, logins30, activeDays30] = await Promise.all([
    Shop.find({ _id: { $in: shopIds } }).select('name branding.displayName status createdAt vertical').lean(),
    Subscription.find({ shopId: { $in: shopIds } }).select('shopId planCode status cycle trialEndsAt currentPeriodEnd').lean(),
    ActiveAccount.aggregate([
      { $match: { userId: String(user._id) } },
      { $group: { _id: { client: '$client', appVersion: '$appVersion' }, last: { $max: '$lastSeenAt' }, days: { $sum: 1 } } },
      { $sort: { last: -1 } },
    ]),
    SecurityEvent.find({ userId: user._id }).sort({ at: -1 }).limit(50).lean(),
    Order.countDocuments({ ...LIVE, createdByUserId: user._id, createdAt: { $gte: since30 } }),
    SecurityEvent.countDocuments({ userId: user._id, kind: { $in: ['login', 'login_new_device'] }, at: { $gte: since30 } }),
    ActiveAccount.distinct('day', { userId: String(user._id), dayDate: { $gte: since30 } }),
  ]);
  const subBy = new Map(subs.map((s) => [String(s.shopId), s]));
  return {
    account: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      verified: Boolean(user.emailVerifiedAt),
      sessionsRevoked: user.tokenVersion || 0,
    },
    shops: memberships.map((m) => {
      const shop = shops.find((s) => String(s._id) === String(m.shopId));
      const sub = subBy.get(String(m.shopId));
      return {
        id: String(m.shopId),
        name: shop?.branding?.displayName || shop?.name || 'Loja',
        role: m.role,
        active: m.active,
        status: shop?.status || null,
        plan: sub?.planCode || null,
        subscription: sub?.status || null,
        cycle: sub?.cycle || null,
        trialEndsAt: sub?.trialEndsAt || null,
        paidUntil: sub?.currentPeriodEnd || null,
      };
    }),
    activity: activity.map((a) => ({ client: a._id.client, appVersion: a._id.appVersion, lastSeen: a.last, days: a.days })),
    lastActivity: activity[0]?.last || null,
    counters: { ordersCreated30: ordersCreated, logins30, activeDays30: activeDays30.length },
    security: events.map((e) => ({ at: e.at, kind: e.kind, device: e.device, ip: e.ip, client: e.client })),
  };
}

module.exports = {
  median,
  funnelFrom,
  cohortTable,
  valueBand,
  weekStart,
  activationFunnel,
  cohorts,
  engagement,
  transactions,
  shopsHealth,
  listAccounts,
  account360,
  dayKey,
};
