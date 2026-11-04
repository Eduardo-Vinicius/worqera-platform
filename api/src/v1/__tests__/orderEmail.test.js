const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail } = require('../lib/email');

test('normalizeEmail trims and lowercases a valid address', () => {
  assert.equal(normalizeEmail('  Ana.Souza@Gmail.COM '), 'ana.souza@gmail.com');
});

test('normalizeEmail allows clearing the e-mail', () => {
  assert.equal(normalizeEmail(''), '');
  assert.equal(normalizeEmail('   '), '');
});

test('normalizeEmail refuses typos that would never deliver', () => {
  for (const bad of ['ana@gmail', 'ana.gmail.com', 'ana@@gmail.com', 'ana @gmail.com', 'ana@gmail.c']) {
    assert.throws(() => normalizeEmail(bad), (err) => err.status === 400 && err.code === 'VALIDATION_ERROR', bad);
  }
});
