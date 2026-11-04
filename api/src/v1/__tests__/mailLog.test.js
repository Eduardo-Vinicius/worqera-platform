const test = require('node:test');
const assert = require('node:assert/strict');
const { outcome, statusOf, KINDS, GROUPS } = require('../services/mailLog');

test('outcome: real delivery is sent; console preview is skipped as smtp-off', () => {
  assert.deepEqual(outcome({ ok: true, provider: 'smtp' }), { ok: true, skipped: false, reason: '', error: '', provider: 'smtp' });
  assert.deepEqual(outcome({ ok: true, provider: 'console', preview: true }), { ok: false, skipped: true, reason: 'smtp-off', error: '', provider: 'console' });
  assert.equal(outcome({ ok: false, skipped: true, reason: 'no-recipient' }).reason, 'no-recipient');
  assert.equal(outcome({ ok: false, provider: 'smtp', error: 'auth' }).error, 'auth');
});

test('statusOf: sent, skipped, failed', () => {
  assert.equal(statusOf({ ok: true }), 'sent');
  assert.equal(statusOf({ ok: false, skipped: true }), 'skipped');
  assert.equal(statusOf({ ok: false, skipped: false }), 'failed');
});

test('every grouped kind has a label', () => {
  for (const kinds of Object.values(GROUPS)) for (const k of kinds) assert.ok(KINDS[k]?.label, k);
});
