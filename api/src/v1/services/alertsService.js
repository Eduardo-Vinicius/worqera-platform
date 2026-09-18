const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Membership = require('../models/Membership');
const User = require('../models/User');
const { sendMail } = require('./mailer');

async function listDelayAlerts(shopId) {
  const now = new Date();
  const orders = await Order.find({
    shopId,
    status: { $nin: ['delivered', 'cancelled'] },
    dueAt: { $lt: now },
  })
    .sort({ dueAt: 1 })
    .limit(50)
    .lean();

  const items = orders.map((o) => {
    const daysLate = Math.max(
      1,
      Math.ceil((now.getTime() - new Date(o.dueAt).getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      id: o._id,
      code: o.code,
      clientName: o.clientName,
      status: o.status,
      dueAt: o.dueAt,
      daysLate,
      currentSectorId: o.currentSectorId,
    };
  });

  return {
    total: items.length,
    items,
  };
}

async function sendDelayDigest(shopId) {
  const alerts = await listDelayAlerts(shopId);
  const shop = await Shop.findById(shopId).lean();
  const owners = await Membership.find({
    shopId,
    role: { $in: ['owner', 'admin'] },
    active: true,
  }).lean();
  const users = await User.find({ _id: { $in: owners.map((m) => m.userId) } }).lean();

  if (!alerts.total) {
    return { ok: true, sent: 0, total: 0 };
  }

  const lines = alerts.items
    .slice(0, 20)
    .map((i) => `• ${i.code} — ${i.clientName || '—'} — ${i.daysLate}d atraso`)
    .join('\n');

  let sent = 0;
  for (const u of users) {
    if (!u.email) continue;
    await sendMail({
      to: u.email,
      shop,
      subject: `${alerts.total} pedido(s) em atraso`,
      text: `Olá ${u.name || ''},\n\nHá ${alerts.total} pedido(s) atrasados:\n\n${lines}\n\nAbra o painel Worqera para agir.`,
      html: `<p>Há <strong>${alerts.total}</strong> pedido(s) atrasados.</p><pre style="font-family:monospace">${lines}</pre>`,
    });
    sent += 1;
  }

  await Shop.findByIdAndUpdate(shopId, { $set: { 'onboarding.lastDigestAt': new Date() } });
  return { ok: true, sent, total: alerts.total };
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function buildWeeklyStats(shopId, since) {
  const now = new Date();
  const openStatuses = ['open', 'in_progress', 'ready'];

  const [delivered, openCount, delays] = await Promise.all([
    Order.find({
      shopId,
      status: 'delivered',
      $or: [
        { deliveredAt: { $gte: since } },
        { deliveredAt: null, updatedAt: { $gte: since } },
      ],
    })
      .sort({ deliveredAt: -1, updatedAt: -1 })
      .limit(200)
      .select('code clientName pricing shoeModel deliveredAt updatedAt services items')
      .lean(),
    Order.countDocuments({ shopId, status: { $in: openStatuses } }),
    listDelayAlerts(shopId),
  ]);

  let revenue = 0;
  const tally = new Map();
  for (const o of delivered) {
    revenue += Number(o.pricing?.total) || 0;
    const flat = Array.isArray(o.services) ? o.services : [];
    for (const s of flat) {
      const name = s?.name || s?.nome;
      if (!name) continue;
      const cur = tally.get(name) || { name, count: 0 };
      cur.count += 1;
      tally.set(name, cur);
    }
    const items = Array.isArray(o.items) ? o.items : [];
    for (const item of items) {
      for (const s of item.services || []) {
        const name = s?.name || s?.nome;
        if (!name) continue;
        const cur = tally.get(name) || { name, count: 0 };
        cur.count += 1;
        tally.set(name, cur);
      }
    }
  }

  const topServices = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    since,
    until: now,
    deliveredCount: delivered.length,
    revenue,
    openCount,
    delaysTotal: delays.total,
    delaySample: delays.items.slice(0, 8),
    topServices,
    sampleDelivered: delivered.slice(0, 8).map((o) => ({
      code: o.code,
      clientName: o.clientName,
      total: o.pricing?.total ?? 0,
    })),
  };
}

async function sendWeeklyDigest(shopId) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const shop = await Shop.findById(shopId).lean();
  const stats = await buildWeeklyStats(shopId, since);

  const owners = await Membership.find({
    shopId,
    role: 'owner',
    active: true,
  }).lean();
  const users = await User.find({ _id: { $in: owners.map((m) => m.userId) } }).lean();

  const webBase = String(
    process.env.PUBLIC_WEB_URL || process.env.WORQERA_PublicWebUrl || 'https://worqera.com'
  ).replace(/\/$/, '');

  const topLines = stats.topServices.length
    ? stats.topServices.map((s) => `• ${s.name} — ${s.count}×`).join('\n')
    : '• (sem serviços destacados nesta semana)';

  const delayLines = stats.delaySample.length
    ? stats.delaySample
        .map((i) => `• ${i.code} — ${i.clientName || '—'} — ${i.daysLate}d`)
        .join('\n')
    : '• Nenhum atraso no momento';

  const deliveredLines = stats.sampleDelivered.length
    ? stats.sampleDelivered
        .map((i) => `• ${i.code} — ${i.clientName || '—'} — ${formatMoney(i.total)}`)
        .join('\n')
    : '• Nenhum pedido finalizado nos últimos 7 dias';

  const subject = `Resumo semanal · ${shop?.name || 'Worqera'} · ${stats.deliveredCount} finalizados`;

  const bodyText = [
    `Resumo dos últimos 7 dias — ${shop?.name || 'sua oficina'}:`,
    ``,
    `Finalizados: ${stats.deliveredCount}`,
    `Receita (finalizados): ${formatMoney(stats.revenue)}`,
    `Em aberto agora: ${stats.openCount}`,
    `Em atraso: ${stats.delaysTotal}`,
    ``,
    `Top serviços:`,
    topLines,
    ``,
    `Finalizados (amostra):`,
    deliveredLines,
    ``,
    `Atrasos:`,
    delayLines,
    ``,
    `Painel: ${webBase}/dashboard`,
    `Métricas: ${webBase}/admin/metrics`,
  ].join('\n');

  const html = `
    <p>Resumo dos <strong>últimos 7 dias</strong> — <strong>${shop?.name || 'sua oficina'}</strong></p>
    <ul>
      <li><strong>${stats.deliveredCount}</strong> finalizados</li>
      <li>Receita: <strong>${formatMoney(stats.revenue)}</strong></li>
      <li><strong>${stats.openCount}</strong> em aberto agora</li>
      <li><strong>${stats.delaysTotal}</strong> em atraso</li>
    </ul>
    <h3>Top serviços</h3>
    <pre style="font-family:monospace;white-space:pre-wrap">${topLines}</pre>
    <h3>Finalizados (amostra)</h3>
    <pre style="font-family:monospace;white-space:pre-wrap">${deliveredLines}</pre>
    <h3>Atrasos</h3>
    <pre style="font-family:monospace;white-space:pre-wrap">${delayLines}</pre>
    <p><a href="${webBase}/dashboard">Abrir painel</a> · <a href="${webBase}/admin/metrics">Métricas</a></p>
  `;

  let sent = 0;
  for (const u of users) {
    if (!u.email) continue;
    await sendMail({
      to: u.email,
      shop,
      subject,
      text: `Olá ${u.name || ''},\n\n${bodyText}`,
      html: `<p>Olá ${u.name || ''},</p>${html}`,
    });
    sent += 1;
  }

  await Shop.findByIdAndUpdate(shopId, {
    $set: { 'onboarding.lastWeeklyDigestAt': new Date() },
  });

  return {
    ok: true,
    sent,
    deliveredCount: stats.deliveredCount,
    openCount: stats.openCount,
    delaysTotal: stats.delaysTotal,
    revenue: stats.revenue,
  };
}

async function getOwnerInbox(shopId) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [feedbackItems, readyCount, reopenedCount] = await Promise.all([
    Order.find({
      shopId,
      'feedback.score': { $gte: 1 },
      'feedback.createdAt': { $gte: since },
    })
      .sort({ 'feedback.createdAt': -1 })
      .limit(20)
      .select('code clientName status feedback')
      .lean(),
    Order.countDocuments({ shopId, status: 'ready' }),
    Order.countDocuments({
      shopId,
      reopenedAt: { $ne: null },
      status: { $nin: ['delivered', 'cancelled'] },
    }),
  ]);

  return {
    readyCount,
    reopenedCount,
    feedbackCount: feedbackItems.length,
    feedback: feedbackItems.map((o) => ({
      id: String(o._id),
      code: o.code,
      clientName: o.clientName || '',
      status: o.status,
      score: o.feedback?.score,
      comment: o.feedback?.comment || '',
      tags: Array.isArray(o.feedback?.tags) ? o.feedback.tags : [],
      createdAt: o.feedback?.createdAt || null,
    })),
  };
}

module.exports = {
  listDelayAlerts,
  sendDelayDigest,
  buildWeeklyStats,
  sendWeeklyDigest,
  getOwnerInbox,
};
