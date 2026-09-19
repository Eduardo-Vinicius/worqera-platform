#!/usr/bin/env node
/**
 * Builds incremental CdT payload for PRD (no PDF on the server).
 *
 * Local:
 *   make cdt-inc-dry   # or extract already ran → data/cdt-report001-inc-orders.jsonl
 *   node api/scripts/build-cdt-inc-payload.js
 *
 * Output: api/scripts/data/cdt-inc-payload.json  (gitignored — PII)
 */
const fs = require('fs');
const path = require('path');

const SHOP_SLUG = process.env.SHOP_SLUG || 'casa-do-tenis';

const IN = path.join(__dirname, 'data/cdt-report001-inc-orders.jsonl');
const OUT = path.join(__dirname, 'data/cdt-inc-payload.json');

function sanitizeClientName(name) {
  let n = String(name || '')
    .replace(/R\$[\d.]+,\d{2}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n || /^cliente importado$/i.test(n)) return 'Cliente importado';
  return n;
}

function dedupeByCode(rows) {
  const map = new Map();
  for (const row of rows) {
    const prev = map.get(row.code);
    if (!prev) {
      map.set(row.code, row);
      continue;
    }
    if (String(row.date || '') >= String(prev.date || '')) map.set(row.code, row);
  }
  return [...map.values()];
}

if (!fs.existsSync(IN)) {
  console.error('Missing', IN);
  console.error('Rode antes: make cdt-inc-dry  (gera o JSONL mesclado)');
  process.exit(1);
}

const raw = fs
  .readFileSync(IN, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const rows = dedupeByCode(
  raw.map((r) => ({
    ...r,
    clientName: sanitizeClientName(r.clientName),
  }))
);

const orders = rows.map((r) => ({
  code: r.code,
  clientName: r.clientName,
  date: r.date,
  total: Number(r.total) || Number(r.services) || 0,
  services: Number(r.services) || Number(r.total) || 0,
  received: Number(r.received) || 0,
  toReceive: Number(r.toReceive) || 0,
  pairsHint: r.pairsHint || null,
}));

const dates = [...new Set(orders.map((o) => o.date))].sort();

const payload = {
  version: 1,
  shopSlug: SHOP_SLUG,
  source: 'carga-incremental-manual',
  sourceLabel: `Carga incremental · ${SHOP_SLUG} · ${dates[0] || '?'}→${dates[dates.length - 1] || '?'}`,
  builtAt: new Date().toISOString(),
  orderCount: orders.length,
  dateMin: dates[0] || null,
  dateMax: dates[dates.length - 1] || null,
  orders,
};

fs.writeFileSync(OUT, JSON.stringify(payload));
const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(3);
console.log(
  JSON.stringify(
    {
      out: OUT,
      shopSlug: SHOP_SLUG,
      orderCount: orders.length,
      dateMin: payload.dateMin,
      dateMax: payload.dateMax,
      sizeMb: mb,
      tip: 'No servidor use SHOP_SLUG=' + SHOP_SLUG + ' no docker exec',
    },
    null,
    2
  )
);
