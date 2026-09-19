#!/usr/bin/env node
/**
 * Incremental CdT load until today — merges report001 (2).pdf + (3).pdf
 * (or any --pdf), filters from --since, skips codes already in Mongo.
 *
 * Usage (repo root):
 *   make cdt-inc-dry
 *   make cdt-inc
 *
 * Or:
 *   node api/scripts/import-cdt-report001-incremental.js
 *   node api/scripts/import-cdt-report001-incremental.js --apply
 *
 * Options:
 *   --pdf PATH          (repeatable) default: report001 (2).pdf + report001 (3).pdf
 *   --since YYYY-MM-DD  default: 2026-09-14
 *   --until YYYY-MM-DD  optional (default: today)
 *   --apply             write Mongo
 *   --force-update      also refresh codes already in DB
 *
 * Env: MONGODB_URI / WORQERA_Mongo__Uri · SHOP_SLUG (casa-do-tenis)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { connectMongo } = require('../src/v1/db/mongo');
const Shop = require('../src/v1/models/Shop');
const Sector = require('../src/v1/models/Sector');
const User = require('../src/v1/models/User');
const Membership = require('../src/v1/models/Membership');
const Client = require('../src/v1/models/Client');
const Order = require('../src/v1/models/Order');
const OrderCounter = require('../src/v1/models/OrderCounter');

const ROOT = path.join(__dirname, '../..');
const DATA_DIR = path.join(__dirname, 'data');
const PREFIX = 'cdt-report001-inc';
const MERGED_JSONL = path.join(DATA_DIR, `${PREFIX}-orders.jsonl`);

function argValues(flag) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) {
      out.push(process.argv[i + 1]);
    }
  }
  return out;
}

function argValue(flag, fallback = '') {
  const vals = argValues(flag);
  return vals.length ? vals[vals.length - 1] : fallback;
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const APPLY = process.argv.includes('--apply');
const FORCE_UPDATE = process.argv.includes('--force-update');
const SINCE = argValue('--since', '2026-09-14');
const UNTIL = argValue('--until', todayIso());
const SHOP_SLUG = process.env.SHOP_SLUG || 'casa-do-tenis';

const DEFAULT_PDFS = [
  path.join(ROOT, 'report001 (2).pdf'),
  path.join(ROOT, 'report001 (3).pdf'),
].filter((p) => fs.existsSync(p));

const PDFS = argValues('--pdf').length
  ? argValues('--pdf').map((p) => (path.isAbsolute(p) ? p : path.join(ROOT, p)))
  : DEFAULT_PDFS;

function loadJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function dedupeByCode(rows) {
  const map = new Map();
  for (const row of rows) {
    const prev = map.get(row.code);
    if (!prev) {
      map.set(row.code, row);
      continue;
    }
    // Prefer later date; tie → later row (newer PDF wins)
    if (String(row.date || '') >= String(prev.date || '')) map.set(row.code, row);
  }
  return [...map.values()];
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
  const priceEach =
    n > 1 ? Number(row.services || row.total || 0) / n : Number(row.services || row.total || 0);
  return Array.from({ length: n }, () => ({
    shoeModel: '',
    services: [
      { id: 'import', name: 'Serviço (importação)', price: Math.round(priceEach * 100) / 100 },
    ],
    photos: [],
    notes: null,
  }));
}

function extractOne(pdf, idx) {
  const prefix = `${PREFIX}-p${idx}`;
  const args = [
    path.join(__dirname, 'extract-cdt-report001.py'),
    '--pdf',
    pdf,
    '--out-dir',
    DATA_DIR,
    '--out-prefix',
    prefix,
    '--since',
    SINCE,
    '--until',
    UNTIL,
    '--skip-full-qa',
  ];
  const res = spawnSync('python3', args, { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error('Extract failed for', pdf, 'status', res.status);
    process.exit(res.status || 1);
  }
  return path.join(DATA_DIR, `${prefix}-orders.jsonl`);
}

async function main() {
  if (!PDFS.length) {
    console.error('Nenhum PDF incremental encontrado.');
    console.error('Coloque na raiz: "report001 (2).pdf" e/ou "report001 (3).pdf"');
    console.error('Ou passe --pdf caminho');
    process.exit(1);
  }

  const parts = [];
  PDFS.forEach((pdf, i) => {
    if (!fs.existsSync(pdf)) {
      console.error('PDF missing:', pdf);
      process.exit(1);
    }
    parts.push({ pdf, file: extractOne(pdf, i + 1) });
  });

  let merged = [];
  for (const p of parts) {
    const rows = loadJsonl(p.file).map((r) => ({ ...r, _source: path.basename(p.pdf) }));
    merged = merged.concat(rows);
  }
  const rows = dedupeByCode(merged);
  fs.writeFileSync(
    MERGED_JSONL,
    rows.map((r) => JSON.stringify(r)).join('\n') + '\n',
    'utf8'
  );

  const bySource = {};
  for (const p of parts) {
    bySource[path.basename(p.pdf)] = loadJsonl(p.file).length;
  }

  await connectMongo();
  const shop = await Shop.findOne({ slug: SHOP_SLUG }).lean();
  if (!shop) {
    console.error(`Shop ${SHOP_SLUG} not found. Run: make api-seed`);
    process.exit(1);
  }

  const existing = await Order.find(
    { shopId: shop._id, code: { $in: rows.map((r) => r.code) } },
    { code: 1 }
  ).lean();
  const existingCodes = new Set(existing.map((o) => o.code));
  const toInsert = rows.filter((r) => !existingCodes.has(r.code));
  const toUpdate = rows.filter((r) => existingCodes.has(r.code));
  const workRows = FORCE_UPDATE ? rows : toInsert;

  const dates = [...new Set(rows.map((r) => r.date))].sort();
  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'APPLY' : 'DRY-RUN',
        pdfs: PDFS.map((p) => path.basename(p)),
        rowsPerPdf: bySource,
        since: SINCE,
        until: UNTIL,
        shop: SHOP_SLUG,
        mergedUnique: rows.length,
        dateMin: dates[0] || null,
        dateMax: dates[dates.length - 1] || null,
        alreadyInMongo: toUpdate.length,
        willInsert: toInsert.length,
        willUpdate: FORCE_UPDATE ? toUpdate.length : 0,
        sampleNew: toInsert.slice(0, 10).map((r) => `${r.code} ${r.date} ${r.clientName}`),
        mergedJsonl: MERGED_JSONL,
      },
      null,
      2
    )
  );

  if (!APPLY) {
    console.log('\nDry-run ok. Para gravar:\n  make cdt-inc\n  # ou: node api/scripts/import-cdt-report001-incremental.js --apply');
    await require('mongoose').disconnect();
    return;
  }

  if (!workRows.length) {
    console.log('Nada novo para inserir (tudo já está no Mongo). Use --force-update se quiser sobrescrever.');
    await require('mongoose').disconnect();
    return;
  }

  const sectors = await Sector.find({ shopId: shop._id, active: true }).sort({ order: 1 }).lean();
  if (!sectors.length) {
    console.error('No sectors — seed first');
    process.exit(1);
  }
  const terminal = sectors.find((s) => s.isTerminal) || sectors[sectors.length - 1];
  const plannedIds = sectors.map((s) => s._id);
  const adminId = await resolveAdminUser(shop._id);

  const nameToId = new Map();
  let clientsCreated = 0;
  let clientsReused = 0;

  for (const name of [...new Set(workRows.map((r) => sanitizeClientName(r.clientName)))]) {
    const found = await Client.findOne({ shopId: shop._id, name }).lean();
    if (found) {
      nameToId.set(name, found._id);
      clientsReused += 1;
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

  const { newPublicToken } = require('../src/v1/utils/publicOrderToken');
  const ops = [];
  for (const row of workRows) {
    const createdAt = new Date(`${row.date}T15:00:00.000Z`);
    const total = Number(row.total) || Number(row.services) || 0;
    const received = Number(row.received) || 0;
    const toReceive = Number(row.toReceive) || 0;
    const deposit =
      received > 0 ? received : toReceive === 0 ? total : Math.max(0, total - toReceive);
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
          movedByName: 'Carga incremental',
          note: `Pedido entregue — carga incremental ${SINCE}→${UNTIL}`,
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
      notes: `Carga incremental · ${SINCE}→${UNTIL} · ${(row._source || '').trim()}`,
      createdByUserId: adminId,
      updatedByUserId: adminId,
    };

    ops.push({
      updateOne: {
        filter: { shopId: shop._id, code: row.code },
        update: {
          $set: {
            ...doc,
            createdAt,
            updatedAt: createdAt,
          },
          $setOnInsert: {
            publicToken: newPublicToken(),
          },
        },
        upsert: true,
        timestamps: false,
      },
    });
  }

  const chunk = 200;
  for (let i = 0; i < ops.length; i += chunk) {
    await Order.bulkWrite(ops.slice(i, i + chunk), { ordered: false });
  }

  await OrderCounter.findOneAndUpdate(
    { shopId: shop._id, dayKey: 'shop' },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );

  const deliveredCount = await Order.countDocuments({ shopId: shop._id, status: 'delivered' });
  console.log(
    JSON.stringify(
      {
        clientsCreated,
        clientsReused,
        ordersWritten: ops.length,
        deliveredCountInShop: deliveredCount,
        tip: 'Kanban ignora delivered. Consulte /consultas/pedidos?tab=finalizados',
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
