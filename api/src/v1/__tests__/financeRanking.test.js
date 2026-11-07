const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTopServicos, buildSectorValue, buildTopClients, buildTopOrders } = require('../services/metricsService');

const imported = {
  status: 'delivered',
  clientName: 'Cliente importado',
  pricing: { total: 5000 },
  items: [{ services: [{ id: 'import', name: 'Serviço (importação)', price: 5000 }] }],
};
const real = {
  _id: 'o1',
  code: '00001',
  status: 'delivered',
  clientName: 'Ana',
  pricing: { total: 300, expenses: 40 },
  items: [{ services: [{ name: 'Higienização', price: 100 }, { name: 'Pintura', price: 200 }] }],
};

test('top services: import placeholder and "Sem serviço" never rank; share of services revenue', () => {
  const rows = buildTopServicos([imported, real, { status: 'open', pricing: { total: 80 }, items: [] }]);
  assert.deepEqual(rows.map((r) => r.service), ['Pintura', 'Higienização']);
  assert.equal(rows[0].share, 66.7);
  assert.equal(rows[0].averageTicket, 200);
});

test('top clients and orders skip imported history', () => {
  assert.deepEqual(buildTopClients([imported, real]).map((r) => r.name), ['Ana']);
  const top = buildTopOrders([imported, real]);
  assert.equal(top.length, 1);
  assert.equal(top[0].net, 260);
});

test('sector value: open items in their current sector, order total spread by item weight', () => {
  const sectors = [
    { _id: 's1', name: 'Costura', order: 1 },
    { _id: 's2', name: 'Pronto', order: 2, isTerminal: true },
  ];
  const order = {
    status: 'in_progress',
    pricing: { total: 270 },
    items: [
      { currentSectorId: 's1', services: [{ name: 'A', price: 200 }] },
      { currentSectorId: 's2', services: [{ name: 'B', price: 100 }] },
    ],
  };
  const rows = buildSectorValue([order, { ...real }], sectors);
  assert.deepEqual(rows.map((r) => [r.name, r.items, r.value]), [['Costura', 1, 180], ['Pronto', 1, 90]]);
  assert.equal(rows[1].terminal, true);
});
