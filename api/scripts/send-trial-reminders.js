#!/usr/bin/env node
/**
 * Trial reminder emails: D-2 and D-0 (expired day).
 * Cron example: 0 10 * * * cd /app && node scripts/send-trial-reminders.js
 *
 * Env: WORQERA_Mongo__Uri / MONGODB_URI, SMTP via mailer, PUBLIC_WEB_URL
 */
require('dotenv').config();
const { connectMongo, mongoose } = require('../src/v1/db/mongo');

async function main() {
  await connectMongo();
  const Subscription = require('../src/v1/models/Subscription');
  const Membership = require('../src/v1/models/Membership');
  const User = require('../src/v1/models/User');
  const Shop = require('../src/v1/models/Shop');
  const { sendMail } = require('../src/v1/services/mailer');

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

  const inTwoDaysStart = new Date(startOfToday);
  inTwoDaysStart.setUTCDate(inTwoDaysStart.getUTCDate() + 2);
  const inTwoDaysEnd = new Date(inTwoDaysStart);
  inTwoDaysEnd.setUTCDate(inTwoDaysEnd.getUTCDate() + 1);

  const webBase = (process.env.PUBLIC_WEB_URL || process.env.WORQERA_PublicWebUrl || 'https://worqera.com').replace(
    /\/$/,
    ''
  );
  const billingUrl = `${webBase}/billing`;

  const batches = [
    {
      key: 'd2',
      label: 'acaba em 2 dias',
      filter: { status: 'trialing', trialEndsAt: { $gte: inTwoDaysStart, $lt: inTwoDaysEnd } },
      subject: 'Seu trial Worqera acaba em 2 dias',
    },
    {
      key: 'd0',
      label: 'acaba hoje',
      filter: { status: 'trialing', trialEndsAt: { $gte: startOfToday, $lt: endOfToday } },
      subject: 'Último dia do trial Worqera',
    },
  ];

  let sent = 0;
  for (const batch of batches) {
    const subs = await Subscription.find(batch.filter).lean();
    for (const sub of subs) {
      const shop = await Shop.findById(sub.shopId).lean();
      const owners = await Membership.find({
        shopId: sub.shopId,
        role: 'owner',
        active: true,
      }).lean();
      const users = await User.find({ _id: { $in: owners.map((m) => m.userId) } }).lean();
      for (const u of users) {
        if (!u.email) continue;
        await sendMail({
          to: u.email,
          shop,
          subject: batch.subject,
          text: `Olá ${u.name || ''},\n\nO trial da oficina ${shop?.name || ''} ${batch.label}.\nAssine em: ${billingUrl}\n`,
          html: `<p>Olá ${u.name || ''},</p><p>O trial de <strong>${shop?.name || 'sua oficina'}</strong> ${batch.label}.</p><p><a href="${billingUrl}">Ir para Billing</a></p>`,
        });
        sent += 1;
      }
    }
  }

  console.log(JSON.stringify({ ok: true, sent }));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
