/**
 * Manual work for the Worqera team, oldest first, each item with how long it has been waiting.
 * SLA badge: green < 24 h, yellow < 48 h, red ≥ 48 h.
 */
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function slaOf(since, now = new Date()) {
  const hours = Math.max(0, Math.floor((now - new Date(since)) / HOUR));
  return { hours, sla: hours < 24 ? 'ok' : hours < 48 ? 'warn' : 'late' };
}

function summarize(items, now = new Date()) {
  if (!items.length) return { count: 0, oldestHours: 0, sla: 'ok' };
  const oldest = items.reduce((a, b) => (new Date(a.since) < new Date(b.since) ? a : b));
  return { count: items.length, ...(() => { const s = slaOf(oldest.since, now); return { oldestHours: s.hours, sla: s.sla }; })() };
}

async function shopNames(ids) {
  const Shop = require('../models/Shop');
  const rows = await Shop.find({ _id: { $in: [...new Set(ids.map(String))] } }).select('name branding.displayName').lean();
  return new Map(rows.map((r) => [String(r._id), r.branding?.displayName || r.name]));
}

async function listQueues(now = new Date()) {
  const Subscription = require('../models/Subscription');
  const Shop = require('../models/Shop');
  const Order = require('../models/Order');
  const PlatformError = require('../models/PlatformError');

  const [trials, overdue, stuck, errors, badReviews] = await Promise.all([
    // Trial ending in ≤ 3 days (or ended) and no subscription started.
    Subscription.find({
      status: { $in: ['trialing', 'expired'] },
      trialEndsAt: { $lte: new Date(now.getTime() + 3 * DAY), $gte: new Date(now.getTime() - 14 * DAY) },
      $or: [{ providerSubscriptionId: null }, { provider: { $ne: 'Asaas' } }],
    })
      .select('shopId trialEndsAt planCode status')
      .sort({ trialEndsAt: 1 })
      .limit(100)
      .lean(),
    Subscription.find({ status: 'past_due' }).select('shopId updatedAt currentPeriodEnd planCode').sort({ updatedAt: 1 }).limit(100).lean(),
    // Signed up more than 7 days ago and never finished onboarding.
    Shop.find({ 'onboarding.completedAt': null, createdAt: { $lte: new Date(now.getTime() - 7 * DAY) }, status: 'active' })
      .select('name branding.displayName createdAt')
      .sort({ createdAt: 1 })
      .limit(100)
      .lean(),
    PlatformError.aggregate([
      { $match: { at: { $gte: new Date(now.getTime() - 2 * DAY) } } },
      { $group: { _id: { route: '$route', method: '$method', status: '$status' }, since: { $min: '$at' }, last: { $max: '$at' }, count: { $sum: { $ifNull: ['$count', 1] } }, message: { $last: '$message' } } },
      { $sort: { since: 1 } },
      { $limit: 50 },
    ]),
    Order.find({ 'feedback.score': { $lte: 2 }, 'feedback.createdAt': { $gte: new Date(now.getTime() - 30 * DAY) } })
      .select('shopId code feedback.score feedback.createdAt feedback.comment clientName')
      .sort({ 'feedback.createdAt': 1 })
      .limit(100)
      .lean(),
  ]);

  const names = await shopNames([...trials, ...overdue, ...badReviews].map((r) => r.shopId).filter(Boolean));
  const item = (o) => ({ ...o, ...slaOf(o.since, now) });

  const queues = [
    {
      key: 'trials',
      label: 'Teste acabando sem assinatura',
      hint: 'Faltam 3 dias ou menos e a loja ainda não escolheu a forma de pagamento.',
      items: trials.map((s) =>
        item({
          id: String(s._id),
          shopId: String(s.shopId),
          title: names.get(String(s.shopId)) || 'Loja',
          detail: `${s.status === 'expired' ? 'Teste encerrado' : 'Teste acaba'} em ${new Date(s.trialEndsAt).toLocaleDateString('pt-BR')}`,
          since: new Date(new Date(s.trialEndsAt).getTime() - 3 * DAY),
          action: 'extendTrial',
        })
      ),
    },
    {
      key: 'overdue',
      label: 'Pagamento atrasado',
      hint: 'A loja tem 5 dias de tolerância antes de bloquear.',
      items: overdue.map((s) =>
        item({
          id: String(s._id),
          shopId: String(s.shopId),
          title: names.get(String(s.shopId)) || 'Loja',
          detail: s.currentPeriodEnd ? `Venceu em ${new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')}` : 'Fatura vencida',
          since: s.currentPeriodEnd || s.updatedAt,
          action: 'openShop',
        })
      ),
    },
    {
      key: 'onboarding',
      label: 'Loja parada no onboarding',
      hint: 'Cadastrou há mais de 7 dias e não terminou a configuração.',
      items: stuck.map((s) =>
        item({
          id: String(s._id),
          shopId: String(s._id),
          title: s.branding?.displayName || s.name,
          detail: `Cadastro em ${new Date(s.createdAt).toLocaleDateString('pt-BR')}`,
          since: new Date(new Date(s.createdAt).getTime() + 7 * DAY),
          action: 'openShop',
        })
      ),
    },
    {
      key: 'errors',
      label: 'Erros 5xx novos',
      hint: 'Rotas com erro nas últimas 48 h.',
      items: errors.map((e) =>
        item({
          id: `${e._id.method} ${e._id.route} ${e._id.status}`,
          shopId: null,
          title: `${e._id.method} ${e._id.route}`,
          detail: `${e._id.status} · ${e.count}× · ${String(e.message || '').slice(0, 120)}`,
          since: e.since,
          action: 'metrics',
        })
      ),
    },
    {
      key: 'reviews',
      label: 'Avaliação ruim (1–2★)',
      hint: 'Clientes das lojas que deram nota baixa nos últimos 30 dias.',
      items: badReviews.map((o) =>
        item({
          id: String(o._id),
          shopId: String(o.shopId),
          title: `${names.get(String(o.shopId)) || 'Loja'} · #${o.code}`,
          detail: `${o.feedback.score}★${o.feedback.comment ? ` · ${String(o.feedback.comment).slice(0, 120)}` : ''}`,
          since: o.feedback.createdAt,
          action: 'openShop',
        })
      ),
    },
  ];
  return queues.map((q) => ({ ...q, ...summarize(q.items, now) }));
}

module.exports = { listQueues, slaOf, summarize };
