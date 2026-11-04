const test = require('node:test');
const assert = require('node:assert/strict');
const { shopFlags } = require('../services/platformAnalytics');
const { shopPatchSummary } = require('../services/adminAudit');
const { safeChanges } = require('../middleware/platformAudit');

test('shopFlags: signals shown next to each shop', () => {
  const base = { active: true, atRisk: false, onboarded: true, ageDays: 30, trialLeft: null, pastDue: false, recentOrders: 5 };
  assert.deepEqual(shopFlags(base), []);
  assert.deepEqual(shopFlags({ ...base, onboarded: false }), ['no_onboarding']);
  assert.deepEqual(shopFlags({ ...base, onboarded: false, ageDays: 2 }), [], 'new shop has a week to finish');
  assert.deepEqual(shopFlags({ ...base, trialLeft: 2.5 }), ['trial_ending']);
  assert.deepEqual(shopFlags({ ...base, pastDue: true, recentOrders: 0, atRisk: true }), ['at_risk', 'past_due', 'no_orders_30d']);
  assert.deepEqual(shopFlags({ ...base, active: false, onboarded: false, recentOrders: 0 }), [], 'suspended shop only shows billing signals');
});

test('shopPatchSummary: one readable line per admin change', () => {
  assert.equal(shopPatchSummary({ extendTrialDays: 7 }), 'Estendeu o teste em 7 dias');
  assert.equal(shopPatchSummary({ status: 'suspended', adminNote: 'x' }), 'Suspendeu a loja, atualizou a nota interna');
  assert.equal(shopPatchSummary({ subscriptionStatus: 'active', planCode: 'WORQERA_PRO' }), 'Assinatura → ativa, plano → Pro');
  assert.equal(shopPatchSummary({}), 'Alterou a loja');
});

test('safeChanges never stores secrets', () => {
  assert.deepEqual(safeChanges({ planCode: 'WORQERA_PRO', accessToken: 'x', apiKey: 'y', password: 'z' }), { planCode: 'WORQERA_PRO' });
});
