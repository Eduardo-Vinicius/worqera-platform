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

module.exports = { listDelayAlerts, sendDelayDigest };
