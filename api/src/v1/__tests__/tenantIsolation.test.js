const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { requireShopId, tenantFilter, tenantById } = require('../lib/tenant');

describe('tenant isolation helpers', () => {
  it('requireShopId rejects empty', () => {
    assert.throws(() => requireShopId(undefined), /shopId required/);
    assert.throws(() => requireShopId(''), /shopId required/);
  });

  it('tenantFilter always includes shopId', () => {
    const f = tenantFilter('shopA', { status: 'open' });
    assert.equal(f.shopId, 'shopA');
    assert.equal(f.status, 'open');
  });

  it('tenantById scopes id + shop', () => {
    const f = tenantById('shopA', 'ord1');
    assert.deepEqual(f, { shopId: 'shopA', _id: 'ord1' });
  });
});
