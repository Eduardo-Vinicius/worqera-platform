#!/usr/bin/env node
/**
 * Weekly digest for all active shops (owners).
 * Cron example: 0 8 * * 1 cd /app && node scripts/send-weekly-digests.js
 */
require('dotenv').config();
const { connectMongo, mongoose } = require('../src/v1/db/mongo');

async function main() {
  await connectMongo();
  const Shop = require('../src/v1/models/Shop');
  const { sendWeeklyDigest } = require('../src/v1/services/alertsService');

  const shops = await Shop.find({ status: 'active' }).select('_id name slug').lean();
  const results = [];
  for (const shop of shops) {
    try {
      const r = await sendWeeklyDigest(shop._id);
      results.push({ shopId: String(shop._id), name: shop.name, ...r });
    } catch (err) {
      results.push({ shopId: String(shop._id), name: shop.name, ok: false, error: err.message });
    }
  }

  console.log(JSON.stringify({ ok: true, shops: results.length, results }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
