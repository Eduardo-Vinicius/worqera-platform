const test = require('node:test');
const assert = require('node:assert/strict');
const { renderOrderPdf, readable, hexToRgb } = require('../services/pdfLayout');

const base = {
  client: null,
  sector: null,
  logo: null,
  summaryText: '',
  photosFor: () => [],
  loadPhoto: async () => null,
  now: new Date('2026-11-07T15:00:00Z'),
};

test('renderOrderPdf: no logo, light brand colour, unpriced items, many items → valid PDF', async () => {
  const items = Array.from({ length: 9 }, (_, i) => ({ shoeModel: `Modelo ${i + 1}`, services: [{ name: 'Limpeza', price: 0 }] }));
  const doc = await renderOrderPdf({
    ...base,
    order: { code: '00007', status: 'open', createdAt: new Date(), items, pricing: { total: 0 } },
    shop: { name: 'Loja Amarela', branding: { primaryColor: '#FDE047' } },
    publicUrl: 'https://worqera.com/p/o/tok',
  });
  const bytes = Buffer.from(doc.output('arraybuffer'));
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(doc.internal.getNumberOfPages() >= 2, 'nine items spill onto a second page');
});

test('renderOrderPdf: minimal order without public link or items still renders', async () => {
  const doc = await renderOrderPdf({ ...base, order: { code: '1', items: [] }, shop: {}, publicUrl: '' });
  assert.equal(doc.internal.getNumberOfPages(), 1);
});

test('readable: light brand colours get dark enough for text on white', () => {
  const yellow = readable(hexToRgb('#FDE047'));
  assert.ok(yellow.every((c, i) => c <= hexToRgb('#FDE047')[i]));
  assert.deepEqual(readable(hexToRgb('#4F0FA6')), hexToRgb('#4F0FA6'), 'dark colours unchanged');
});
