/**
 * Carga incremental CdT no Mongo de PRD — SEM PDF no servidor.
 * Por padrão: SÓ INSERE códigos que ainda NÃO existem (não sobrescreve).
 *
 * Dry-run:
 *   PAYLOAD_PATH=/tmp/cdt/cdt-inc-payload.json \
 *     mongosh "$MONGODB_URI" --file apply-cdt-inc-payload.mongosh.js
 *
 * Apply:
 *   APPLY=1 PAYLOAD_PATH=/tmp/cdt/cdt-inc-payload.json \
 *     mongosh "$MONGODB_URI" --file apply-cdt-inc-payload.mongosh.js
 *
 * Forçar upsert (sobrescrever): FORCE_UPDATE=1
 */

const APPLY = String(process.env.APPLY || '0') === '1';
const FORCE_UPDATE = String(process.env.FORCE_UPDATE || '0') === '1';
const SHOP_SLUG = process.env.SHOP_SLUG || 'casa-do-tenis';
const PAYLOAD_PATH =
  process.env.PAYLOAD_PATH || `${pwd()}/cdt-inc-payload.json`;

function die(msg) {
  print(`ERROR: ${msg}`);
  quit(1);
}

print(`Reading payload: ${PAYLOAD_PATH}`);
let payload;
try {
  payload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf8'));
} catch (e) {
  die(`Não li o payload em ${PAYLOAD_PATH}: ${e}`);
}

if (!payload || !Array.isArray(payload.orders) || !payload.orders.length) {
  die('Payload inválido (orders vazio)');
}

const shop = db.shops.findOne({ slug: SHOP_SLUG });
if (!shop) die(`Shop '${SHOP_SLUG}' não encontrado — rode o seed antes`);

const sectors = db.sectors.find({ shopId: shop._id, active: true }).sort({ order: 1 }).toArray();
if (!sectors.length) die('Nenhum setor ativo — seed incompleto');

const terminal = sectors.find((s) => s.isTerminal) || sectors[sectors.length - 1];
const plannedIds = sectors.map((s) => s._id);

const mem = db.memberships.findOne({
  shopId: shop._id,
  role: { $in: ['owner', 'admin'] },
  active: true,
});
if (!mem || !mem.userId) die('Sem membership owner/admin — seed incompleto');
const adminId = mem.userId;

const codes = payload.orders.map((o) => o.code);
const existing = db.orders
  .find({ shopId: shop._id, code: { $in: codes } }, { projection: { code: 1 } })
  .toArray();
const existingCodes = {};
for (const o of existing) existingCodes[o.code] = true;

const toInsert = payload.orders.filter((o) => !existingCodes[o.code]);
const toSkip = payload.orders.filter((o) => existingCodes[o.code]);
const work = FORCE_UPDATE ? payload.orders : toInsert;

print(
  JSON.stringify(
    {
      mode: APPLY ? 'APPLY' : 'DRY-RUN',
      shop: SHOP_SLUG,
      shopId: String(shop._id),
      terminal: terminal.slug,
      adminUserId: String(adminId),
      ordersInPayload: payload.orders.length,
      alreadyInMongo: toSkip.length,
      willInsert: toInsert.length,
      willUpdate: FORCE_UPDATE ? toSkip.length : 0,
      forceUpdate: FORCE_UPDATE,
      source: payload.source,
      sourceLabel: payload.sourceLabel,
      sampleNew: toInsert.slice(0, 10).map((o) => `${o.code} ${o.date} ${o.clientName}`),
    },
    null,
    2
  )
);

if (!work.length) {
  print('Nada novo para inserir. OK.');
  quit(0);
}

const nameToId = {};
let clientsCreated = 0;
let clientsReused = 0;
let ordersWritten = 0;

const uniqueNames = [...new Set(work.map((o) => o.clientName).filter(Boolean))];

for (const name of uniqueNames) {
  const found = db.clients.findOne({ shopId: shop._id, name });
  if (found) {
    nameToId[name] = found._id;
    clientsReused += 1;
    continue;
  }
  if (!APPLY) {
    clientsCreated += 1;
    continue;
  }
  const inserted = db.clients.insertOne({
    shopId: shop._id,
    name,
    cpf: null,
    phone: null,
    email: null,
    whatsappOptIn: false,
    address: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  nameToId[name] = inserted.insertedId;
  clientsCreated += 1;
}

const ops = [];

for (const row of work) {
  const createdAt = new Date(`${row.date}T15:00:00.000Z`);
  const total = Number(row.total) || Number(row.services) || 0;
  const received = Number(row.received) || 0;
  const toReceive = Number(row.toReceive) || 0;
  const deposit = received > 0 ? received : toReceive === 0 ? total : Math.max(0, total - toReceive);
  const remaining = Math.max(0, total - deposit);
  const pairs = Math.max(1, Number(row.pairsHint) || 1);
  const priceEach = pairs > 1 ? total / pairs : Number(row.services) || total;
  const clientId = nameToId[row.clientName] || null;

  const items = [];
  for (let i = 0; i < pairs; i += 1) {
    items.push({
      shoeModel: '',
      services: [{ id: 'import', name: 'Serviço (importação)', price: Math.round(priceEach * 100) / 100 }],
      photos: [],
      notes: null,
    });
  }

  const doc = {
    shopId: shop._id,
    code: row.code,
    clientId,
    clientName: row.clientName,
    clientPhone: null,
    clientEmail: null,
    shoeModel: '',
    services: [{ id: 'import', name: 'Serviço (importação)', price: Number(row.services) || total }],
    accessories: [],
    warranty: {},
    pricing: { total, deposit, remaining, expenses: 0 },
    photos: [],
    items,
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
        movedByEmail: null,
        employeeId: null,
        employeeName: null,
        note: payload.sourceLabel || 'Pedido entregue — carga incremental',
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
    notes: payload.sourceLabel || payload.source || 'Carga incremental',
    createdByUserId: adminId,
    updatedByUserId: adminId,
    createdAt,
    updatedAt: createdAt,
  };

  ops.push({
    updateOne: {
      filter: { shopId: shop._id, code: row.code },
      update: { $set: doc },
      upsert: true,
    },
  });
  ordersWritten += 1;
}

if (APPLY) {
  const chunk = 200;
  for (let i = 0; i < ops.length; i += chunk) {
    db.orders.bulkWrite(ops.slice(i, i + chunk), { ordered: false });
    print(`bulkWrite ${Math.min(i + chunk, ops.length)}/${ops.length}`);
  }
  db.ordercounters.updateOne(
    { shopId: shop._id, dayKey: 'shop' },
    { $setOnInsert: { seq: 0 } },
    { upsert: true }
  );
}

const deliveredCount = APPLY
  ? db.orders.countDocuments({ shopId: shop._id, status: 'delivered' })
  : null;

print(
  JSON.stringify(
    {
      clientsCreated,
      clientsReused,
      ordersWritten,
      deliveredCountInShop: deliveredCount,
      tip: APPLY
        ? 'OK. Só novos. Kanban ignora delivered.'
        : 'Dry-run. Rode de novo com APPLY=1 para gravar.',
    },
    null,
    2
  )
);
