#!/usr/bin/env node
/**
 * Builds a compact payload for PRD load (no PDF on the server).
 *
 * Local only:
 *   python3 api/scripts/extract-cdt-report001.py
 *   node api/scripts/build-cdt-prd-payload.js
 *
 * Output: api/scripts/data/cdt-prd-payload.json  (gitignored — PII)
 */
const fs = require('fs');
const path = require('path');

const IN = path.join(__dirname, 'data/cdt-report001-orders.jsonl');
const OUT = path.join(__dirname, 'data/cdt-prd-payload.json');

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
    const prevBad = !prev.clientName || prev.clientName === 'Cliente importado';
    const nextBad = !row.clientName || row.clientName === 'Cliente importado';
    if (prevBad && !nextBad) map.set(row.code, row);
    else if (!prevBad && nextBad) {
      /* keep */
    } else map.set(row.code, row);
  }
  return [...map.values()];
}

if (!fs.existsSync(IN)) {
  console.error('Missing', IN, '— run extract-cdt-report001.py first');
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

const payload = {
  version: 1,
  shopSlug: 'casa-do-tenis',
  // Rótulo operacional gravado no payload (não cita arquivo interno)
  source: 'carga-historica-manual',
  sourceLabel: 'Carga histórica manual · processo de importação (jul–set/2026)',
  builtAt: new Date().toISOString(),
  orderCount: orders.length,
  orders,
};

fs.writeFileSync(OUT, JSON.stringify(payload));
const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(JSON.stringify({ out: OUT, orderCount: orders.length, sizeMb: mb }, null, 2));
