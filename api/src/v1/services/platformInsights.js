/**
 * Automatic insights for the Worqera team. `collectFacts` reads the numbers;
 * `rules` is pure (testable) and turns them into cards with severity and a link.
 * Severities: critical · warn · info · positive.
 */
const { range } = require('../lib/periods');

const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 100) : null);
const n = (v) => Number(v || 0).toLocaleString('pt-BR');

function rules(f) {
  const out = [];
  const period = f.days === 1 ? 'hoje' : `nos últimos ${f.days} dias`;

  // Signups ±25% (only with a meaningful base)
  const signupChange = pct(f.signups.cur, f.signups.prev);
  if (signupChange != null && f.signups.prev >= 4 && Math.abs(signupChange) > 25) {
    const up = signupChange > 0;
    out.push({
      id: up ? 'signups-up' : 'signups-down',
      severity: up ? 'positive' : 'warn',
      title: up ? 'Cadastros de lojas subiram' : 'Cadastros de lojas caíram',
      detail: `${n(f.signups.cur)} lojas ${period} contra ${n(f.signups.prev)} no período anterior (${up ? '+' : ''}${signupChange}%).`,
      href: '/admin/metricas',
    });
  }

  // A route with error rate > 2% and > 2× the average
  for (const r of f.routes) {
    if (r.count < 20) continue;
    const rate = (r.errors5xx / r.count) * 100;
    if (rate > 2 && rate > 2 * (f.overallErrorRate || 0)) {
      out.push({
        id: `route-errors:${r.method} ${r.route}`,
        severity: rate >= 5 ? 'critical' : 'warn',
        title: `Erros em ${r.method} ${r.route}`,
        detail: `${Math.round(rate * 10) / 10}% das ${n(r.count)} chamadas deram erro 5xx (média geral ${Math.round((f.overallErrorRate || 0) * 10) / 10}%).`,
        href: '/admin/metricas',
      });
    }
    if (r.prevP95 && r.p95 >= 250 && r.p95 > r.prevP95 * 1.5) {
      out.push({
        id: `route-slow:${r.method} ${r.route}`,
        severity: 'warn',
        title: `${r.method} ${r.route} ficou mais lento`,
        detail: `p95 de ${n(r.prevP95)} ms para ${n(r.p95)} ms (+${pct(r.p95, r.prevP95)}%).`,
        href: '/admin/metricas',
      });
    }
  }

  // Activation (shops that created the first order) moved > 10 p.p.
  const a = f.activation;
  if (a.curBase >= 3 && a.prevBase >= 3 && Math.abs(a.curRate - a.prevRate) > 10) {
    const up = a.curRate > a.prevRate;
    out.push({
      id: up ? 'activation-up' : 'activation-down',
      severity: up ? 'positive' : 'warn',
      title: up ? 'Ativação de lojas melhorou' : 'Ativação de lojas piorou',
      detail: `${a.curRate}% das lojas novas lançaram o primeiro pedido, contra ${a.prevRate}% antes (${up ? '+' : ''}${a.curRate - a.prevRate} p.p.).`,
      href: '/admin/analises',
    });
  }

  // App rollout: > 30% of app users still on an older version
  if (f.app.latest && f.app.mobileUsers >= 10 && f.app.onLatestPct < 70) {
    out.push({
      id: 'app-rollout',
      severity: 'info',
      title: 'Versão antiga do app ainda em uso',
      detail: `${100 - f.app.onLatestPct}% dos ${n(f.app.mobileUsers)} usuários do app não estão na ${f.app.latest}.`,
      href: '/admin/metricas',
    });
  }

  if (f.stalledShops > 0) {
    out.push({
      id: 'shops-stalled',
      severity: 'warn',
      title: 'Lojas paradas',
      detail: `${n(f.stalledShops)} loja${f.stalledShops === 1 ? '' : 's'} em teste ou pagante sem ninguém usar há mais de 30 dias.`,
      href: '/admin/analises?tab=lojas',
    });
  }
  if (f.stuckOnboarding > 0) {
    out.push({
      id: 'onboarding-stuck',
      severity: 'info',
      title: 'Lojas presas no onboarding',
      detail: `${n(f.stuckOnboarding)} loja${f.stuckOnboarding === 1 ? '' : 's'} cadastrada${f.stuckOnboarding === 1 ? '' : 's'} há mais de 7 dias sem terminar a configuração.`,
      href: '/admin/operacao',
    });
  }

  for (const q of f.queues) {
    if (q.count > 0 && q.oldestHours >= 48) {
      out.push({
        id: `queue-${q.key}`,
        severity: q.oldestHours >= 96 ? 'critical' : 'warn',
        title: `Fila acima do prazo: ${q.label}`,
        detail: `${n(q.count)} item${q.count === 1 ? '' : 's'}; o mais antigo espera há ${n(q.oldestHours)} h.`,
        href: '/admin/operacao',
      });
    }
  }

  if (f.cancellations.cur >= 2 && f.cancellations.cur >= 2 * Math.max(1, f.cancellations.prev)) {
    out.push({
      id: 'churn-spike',
      severity: 'critical',
      title: 'Pico de cancelamentos',
      detail: `${n(f.cancellations.cur)} cancelamentos ${period} contra ${n(f.cancellations.prev)} no período anterior.`,
      href: '/admin/metricas',
    });
  }

  if (f.growth && f.growth.count >= 2) {
    out.push({
      id: 'growth',
      severity: 'positive',
      title: `${f.growth.label} foi o que mais cresceu`,
      detail: `${n(f.growth.count)} lojas novas ${period} nesse ramo.`,
      href: '/admin/metricas',
    });
  }

  const order = { critical: 0, warn: 1, info: 2, positive: 3 };
  return out.sort((x, y) => order[x.severity] - order[y.severity]);
}

const VERTICAL_LABEL = {
  footwear: 'Calçados',
  laundry: 'Lavanderia',
  repair: 'Assistência',
  auto: 'Automotivo',
  carpentry: 'Marcenaria',
  printing: 'Gráfica',
  production: 'Produção sob encomenda',
  general: 'Geral',
};

async function activation(from, to) {
  const Shop = require('../models/Shop');
  const Order = require('../models/Order');
  const shops = await Shop.find({ createdAt: { $gte: from, $lt: to } }).select('_id').lean();
  if (!shops.length) return { rate: 0, base: 0 };
  const ids = shops.map((s) => s._id);
  const withOrder = await Order.distinct('shopId', { shopId: { $in: ids }, clientName: { $ne: 'Cliente demonstração' } });
  return { rate: Math.round((withOrder.length / ids.length) * 100), base: ids.length };
}

async function collectFacts({ days }) {
  const Shop = require('../models/Shop');
  const Subscription = require('../models/Subscription');
  const WebhookEvent = require('../models/WebhookEvent');
  const ActiveAccount = require('../models/ActiveAccount');
  const metrics = require('./platformMetrics');
  const { listQueues } = require('./platformQueues');
  const p = range(days);

  const [tech, signupsCur, signupsPrev, actCur, actPrev, queues, cancelCur, cancelPrev, liveSubs, activeShops30, verticalGrowth] = await Promise.all([
    metrics.tech({ days, client: 'all' }),
    Shop.countDocuments({ createdAt: { $gte: p.from, $lt: p.to } }),
    Shop.countDocuments({ createdAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
    activation(p.from, p.to),
    activation(p.prevFrom, p.prevTo),
    listQueues(),
    WebhookEvent.countDocuments({ provider: 'Asaas', type: { $in: ['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'] }, processedAt: { $gte: p.from } }),
    WebhookEvent.countDocuments({ provider: 'Asaas', type: { $in: ['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'] }, processedAt: { $gte: p.prevFrom, $lt: p.prevTo } }),
    Subscription.find({ status: { $in: ['trialing', 'active', 'past_due'] } }).select('shopId createdAt').lean(),
    ActiveAccount.distinct('shopId', { dayDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    Shop.aggregate([{ $match: { createdAt: { $gte: p.from, $lt: p.to } } }, { $group: { _id: '$vertical', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 1 }]),
  ]);

  // Previous-period p95 per route, to catch slowdowns
  const prevP95 = new Map();
  const MetricBucket = require('../models/MetricBucket');
  const store = require('../lib/metricsStore');
  const prevRows = await MetricBucket.aggregate([
    { $match: { start: { $gte: p.prevFrom, $lt: p.prevTo } } },
    { $group: { _id: { method: '$method', route: '$route' }, maxMs: { $max: '$maxMs' }, h0: { $sum: '$h0' }, h1: { $sum: '$h1' }, h2: { $sum: '$h2' }, h3: { $sum: '$h3' }, h4: { $sum: '$h4' }, h5: { $sum: '$h5' }, h6: { $sum: '$h6' } } },
  ]);
  for (const r of prevRows) {
    prevP95.set(`${r._id.method} ${r._id.route}`, store.p95FromHistogram([r.h0, r.h1, r.h2, r.h3, r.h4, r.h5, r.h6], r.maxMs));
  }

  const active = new Set(activeShops30.map(String));
  const oldEnough = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stalled = liveSubs.filter((s) => new Date(s.createdAt).getTime() < oldEnough && !active.has(String(s.shopId))).length;
  const onboarding = queues.find((q) => q.key === 'onboarding');

  return {
    days,
    signups: { cur: signupsCur, prev: signupsPrev },
    routes: tech.topEndpoints.map((r) => ({ ...r, p95: r.p95Ms, prevP95: prevP95.get(`${r.method} ${r.route}`) || 0 })),
    overallErrorRate: tech.kpis.errorRate.value,
    activation: { curRate: actCur.rate, prevRate: actPrev.rate, curBase: actCur.base, prevBase: actPrev.base },
    app: { latest: tech.appVersions.latest, onLatestPct: tech.appVersions.onLatestPct, mobileUsers: tech.appVersions.mobileUsers },
    stalledShops: stalled,
    stuckOnboarding: onboarding?.count || 0,
    queues: queues.map((q) => ({ key: q.key, label: q.label, count: q.count, oldestHours: q.oldestHours })),
    cancellations: { cur: cancelCur, prev: cancelPrev },
    growth: verticalGrowth[0] ? { label: VERTICAL_LABEL[verticalGrowth[0]._id] || verticalGrowth[0]._id || 'Geral', count: verticalGrowth[0].count } : null,
    tech,
    queuesFull: queues,
  };
}

module.exports = { rules, collectFacts };
