#!/usr/bin/env node
/**
 * Import Casa do Tênis historical orders from extracted JSONL.
 *
 * Usage:
 *   node api/scripts/import-cdt-report001.js           # dry-run
 *   node api/scripts/import-cdt-report001.js --apply
 *
 * Env: MONGODB_URI / WORQERA_Mongo__Uri (default localhost worqera)
 *      SHOP_SLUG (default casa-do-tenis)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { connectMongo } = require('../src/v1/db/mongo');
const Shop = require('../src/v1/models/Shop');
const Sector = require('../src/v1/models/Sector');
const User = require('../src/v1/models/User');
const Membership = require('../src/v1/models/Membership');
const Client = require('../src/v1/models/Client');
const Order = require('../src/v1/models/Order');
const OrderCounter = require('../src/v1/models/OrderCounter');

const APPLY = process.argv.includes('--apply');
const SHOP_SLUG = process.env.SHOP_SLUG || 'casa-do-tenis';
const DATA = path.join(__dirname, 'data/cdt-report001-orders.jsonl');

function loadRows() {
  const lines = fs.readFileSync(DATA, 'utf8').split('\n').filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

/** Prefer last occurrence when PDF repeats a shop code; keep best clientName if last is empty. */
function dedupeByCode(rows) {
  const map = new Map();
  const dups = [];
  for (const row of rows) {
    if (map.has(row.code)) dups.push(row.code);
    const prev = map.get(row.code);
    if (!prev) {
      map.set(row.code, row);
      continue;
    }
    const prevBad = !prev.clientName || prev.clientName === 'Cliente importado';
    const nextBad = !row.clientName || row.clientName === 'Cliente importado';
    if (prevBad && !nextBad) map.set(row.code, row);
    else if (!prevBad && nextBad) {
      /* keep prev */
    } else map.set(row.code, row);
  }
  return { rows: [...map.values()], dups: [...new Set(dups)] };
}

function sanitizeClientName(name) {
  let n = String(name || '')
    .replace(/R\$[\d.]+,\d{2}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n || /^cliente importado$/i.test(n)) return 'Cliente importado';
  return n;
}

async function resolveAdminUser(shopId) {
  const mem = await Membership.findOne({ shopId, role: { $in: ['owner', 'admin'] }, active: true })
    .sort({ role: 1 })
    .lean();
  if (mem?.userId) return mem.userId;
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@worqera.local').toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw new Error('No admin user for import (seed first)');
  return user._id;
}

function buildItems(row) {
  const n = Math.max(1, Number(row.pairsHint) || 1);
  const priceEach = n > 1 ? Number(row.services || row.total || 0) / n : Number(row.services || row.total || 0);
  return Array.from({ length: n }, () => ({
    shoeModel: '',
    services: [{ id: 'import', name: 'Serviço (importação)', price: Math.round(priceEach * 100) / 100 }],
    photos: [],
    notes: null,
  }));
}

async function main() {
  if (!fs.existsSync(DATA)) {
    console.error('Missing', DATA, '— run: python3 api/scripts/extract-cdt-report001.py');
    process.exit(1);
  }

  await connectMongo();
  const shop = await Shop.findOne({ slug: SHOP_SLUG }).lean();
  if (!shop) {
    console.error(`Shop ${SHOP_SLUG} not found. Run: make api-seed`);
    process.exit(1);
  }

  const sectors = await Sector.find({ shopId: shop._id, active: true }).sort({ order: 1 }).lean();
  if (!sectors.length) {
    console.error('No sectors — seed first');
    process.exit(1);
  }
  const terminal = sectors.find((s) => s.isTerminal) || sectors[sectors.length - 1];
  const plannedIds = sectors.map((s) => s._id);
  const adminId = await resolveAdminUser(shop._id);

  const raw = loadRows();
  const { rows, dups } = dedupeByCode(raw);

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'APPLY' : 'DRY-RUN',
        shop: SHOP_SLUG,
        shopId: String(shop._id),
        rawRows: raw.length,
        uniqueCodes: rows.length,
        duplicateCodesDropped: dups.length,
        terminalSector: terminal.slug,
        adminUserId: String(adminId),
      },
      null,
      2
    )
  );

  // Upsert clients by exact cleaned name
  const nameToId = new Map();
  let clientsCreated = 0;
  let clientsReused = 0;

  // Drop previous dirty import clients (R$ leaked into name)
  if (APPLY) {
    const dirty = await Client.deleteMany({ shopId: shop._id, name: /R\$/ });
    console.log('[cleanup] deleted dirty clients', dirty.deletedCount);
  }

  for (const name of [...new Set(rows.map((r) => sanitizeClientName(r.clientName)))]) {
    const existing = await Client.findOne({ shopId: shop._id, name }).lean();
    if (existing) {
      nameToId.set(name, existing._id);
      clientsReused += 1;
      continue;
    }
    if (!APPLY) {
      nameToId.set(name, null);
      clientsCreated += 1;
      continue;
    }
    const created = await Client.create({
      shopId: shop._id,
      name,
      cpf: null,
      phone: null,
      email: null,
      whatsappOptIn: false,
      address: {},
    });
    nameToId.set(name, created._id);
    clientsCreated += 1;
  }

  let ordersUpserted = 0;
  const ops = [];

  for (const row of rows) {
    const createdAt = new Date(`${row.date}T15:00:00.000Z`);
    const total = Number(row.total) || Number(row.services) || 0;
    const received = Number(row.received) || 0;
    const toReceive = Number(row.toReceive) || 0;
    const deposit = received > 0 ? received : toReceive === 0 ? total : Math.max(0, total - toReceive);
    const remaining = Math.max(0, total - deposit);
    const clientName = sanitizeClientName(row.clientName);
    const clientId = nameToId.get(clientName) || null;

    const doc = {
      shopId: shop._id,
      code: row.code,
      clientId,
      clientName,
      clientPhone: null,
      clientEmail: null,
      shoeModel: '',
      services: [{ id: 'import', name: 'Serviço (importação)', price: Number(row.services) || total }],
      accessories: [],
      warranty: {},
      pricing: { total, deposit, remaining, expenses: 0 },
      photos: [],
      items: buildItems(row),
      currentSectorId: terminal._id,
      plannedSectorIds: plannedIds,
      sectorPath: plannedIds,
      sectorHistory: [
        {
          sectorId: terminal._id,
          fromSectorId: null,
          enteredAt: createdAt,
          leftAt: null,
          movedByUserId: adminId,
          movedByName: 'Carga histórica',
          note: 'Pedido entregue — carga histórica manual',
          action: 'create',
        },
      ],
      comments: [],
      status: 'delivered',
      priority: 1,
      dueAt: null,
      deliveredAt: createdAt,
      assigneeEmployeeId: null,
      pdfUrl: null,
      notes: 'Carga histórica manual · processo de importação (jul–set/2026)',
      createdByUserId: adminId,
      updatedByUserId: adminId,
    };

    if (APPLY) {
      ops.push({
        updateOne: {
          filter: { shopId: shop._id, code: row.code },
          update: {
            $set: {
              ...doc,
              createdAt,
              updatedAt: createdAt,
            },
          },
          upsert: true,
          timestamps: false,
        },
      });
    }
    ordersUpserted += 1;
  }

  if (APPLY && ops.length) {
    const chunk = 200;
    for (let i = 0; i < ops.length; i += chunk) {
      await Order.bulkWrite(ops.slice(i, i + chunk), { ordered: false });
    }
    // New Worqera codes start at 0001 — do not advance counter from legacy NNNN-26
    await OrderCounter.findOneAndUpdate(
      { shopId: shop._id, dayKey: 'shop' },
      { $setOnInsert: { seq: 0 } },
      { upsert: true }
    );
  }

  const deliveredCount = APPLY
    ? await Order.countDocuments({ shopId: shop._id, status: 'delivered' })
    : null;
  const sumServices = rows.reduce((a, r) => a + (Number(r.services) || 0), 0);

  console.log(
    JSON.stringify(
      {
        clientsCreated,
        clientsReused,
        ordersUpserted,
        sumServices: Math.round(sumServices * 100) / 100,
        deliveredCountInShop: deliveredCount,
        tip: APPLY
          ? 'Done. Kanban ignores delivered. Reopen actives with import-cdt-open-snapshot.js'
          : 'Dry-run only. Re-run with --apply to write.',
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
