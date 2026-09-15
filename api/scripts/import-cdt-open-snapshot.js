#!/usr/bin/env node
/**
 * Reopen CdT orders from a snapshot CSV and place them on the correct kanban column.
 *
 * CSV headers (required): code,sectorSlug
 * Optional: status (open|in_progress|ready) — default in_progress
 *
 * Usage:
 *   node api/scripts/import-cdt-open-snapshot.js path/to/open.csv           # dry-run
 *   node api/scripts/import-cdt-open-snapshot.js path/to/open.csv --apply
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const { connectMongo } = require('../src/v1/db/mongo');
const Shop = require('../src/v1/models/Shop');
const Sector = require('../src/v1/models/Sector');
const Order = require('../src/v1/models/Order');
const Membership = require('../src/v1/models/Membership');
const User = require('../src/v1/models/User');

const APPLY = process.argv.includes('--apply');
const SHOP_SLUG = process.env.SHOP_SLUG || 'casa-do-tenis';
const csvPath = process.argv.find((a) => a.endsWith('.csv') || a.endsWith('.tsv'));

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(delim).map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] || '';
    });
    return row;
  });
}

async function resolveAdmin(shopId) {
  const mem = await Membership.findOne({ shopId, role: { $in: ['owner', 'admin'] }, active: true }).lean();
  if (mem?.userId) return mem.userId;
  const user = await User.findOne({
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@worqera.local').toLowerCase(),
  }).lean();
  return user?._id || null;
}

async function main() {
  if (!csvPath || !fs.existsSync(csvPath)) {
    console.error('Usage: node api/scripts/import-cdt-open-snapshot.js open.csv [--apply]');
    process.exit(1);
  }

  await connectMongo();
  const shop = await Shop.findOne({ slug: SHOP_SLUG }).lean();
  if (!shop) throw new Error(`Shop ${SHOP_SLUG} not found`);

  const sectors = await Sector.find({ shopId: shop._id }).lean();
  const bySlug = new Map(sectors.map((s) => [s.slug, s]));
  const adminId = await resolveAdmin(shop._id);
  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));

  const report = { mode: APPLY ? 'APPLY' : 'DRY-RUN', ok: [], missingOrder: [], badSector: [] };

  for (const row of rows) {
    const code = String(row.code || row.pedido || '').trim();
    const slug = String(row.sectorslug || row.sector || row.setor || '').trim();
    const status = String(row.status || 'in_progress').trim() || 'in_progress';
    if (!code) continue;

    const sector = bySlug.get(slug);
    if (!sector) {
      report.badSector.push({ code, slug });
      continue;
    }

    const order = await Order.findOne({ shopId: shop._id, code });
    if (!order) {
      report.missingOrder.push(code);
      continue;
    }

    if (APPLY) {
      const from = order.currentSectorId;
      order.status = ['open', 'in_progress', 'ready'].includes(status) ? status : 'in_progress';
      order.currentSectorId = sector._id;
      order.deliveredAt = null;
      order.sectorHistory = order.sectorHistory || [];
      order.sectorHistory.push({
        sectorId: sector._id,
        fromSectorId: from,
        enteredAt: new Date(),
        leftAt: null,
        movedByUserId: adminId,
        movedByName: 'Snapshot loja',
        note: 'reativado snapshot loja',
        action: 'move',
      });
      order.updatedByUserId = adminId;
      await order.save();
    }
    report.ok.push({ code, slug, status });
  }

  console.log(
    JSON.stringify(
      {
        ...report,
        counts: {
          ok: report.ok.length,
          missingOrder: report.missingOrder.length,
          badSector: report.badSector.length,
        },
      },
      null,
      2
    )
  );
  await require('mongoose').disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
