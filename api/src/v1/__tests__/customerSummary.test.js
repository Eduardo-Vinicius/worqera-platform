const test = require('node:test');
const assert = require('node:assert/strict');
const { customerSummaryAiEnabled, publicCustomerSummary } = require('../lib/customerSummary');

const off = {};
const on = { WORQERA_AI__CustomerSummary: '1' };

test('customerSummaryAiEnabled: off unless the env turns it on', () => {
  assert.equal(customerSummaryAiEnabled(off), false);
  assert.equal(customerSummaryAiEnabled(on), true);
  assert.equal(customerSummaryAiEnabled({ WORQERA_AI__CustomerSummary: 'true' }), true);
});

test('publicCustomerSummary: AI text hidden while paused; team text always shown', () => {
  const ai = { customerSummary: { text: 'Texto da IA', ai: true, edited: false } };
  const team = { customerSummary: { text: 'Troca de sola e pintura', ai: false, edited: true } };
  assert.equal(publicCustomerSummary(ai, off), '');
  assert.equal(publicCustomerSummary(ai, on), 'Texto da IA');
  assert.equal(publicCustomerSummary(team, off), 'Troca de sola e pintura');
  assert.equal(publicCustomerSummary({}, off), '');
});
