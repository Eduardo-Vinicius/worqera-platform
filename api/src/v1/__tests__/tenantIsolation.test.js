const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { requireShopId, tenantFilter, tenantById } = require('../lib/tenant');
const { authorizeWebhook, verifyWebhookHmac } = require('../services/billingService');
const crypto = require('crypto');

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

describe('AbacatePay webhook auth', () => {
  it('verifyWebhookHmac accepts base64 HMAC with public key', () => {
    const raw = '{"id":"evt1","type":"subscription.completed"}';
    const key =
      process.env.WORQERA_AbacatePay__PublicKey ||
      't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
    const sig = crypto.createHmac('sha256', key).update(Buffer.from(raw, 'utf8')).digest('base64');
    assert.equal(verifyWebhookHmac(raw, sig), true);
    assert.equal(verifyWebhookHmac(raw, 'bad'), false);
  });

  it('authorizeWebhook in non-prod accepts valid HMAC without secret', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ALLOW_INSECURE_WEBHOOK;
    process.env.WORQERA_AbacatePay__WebhookSecret = 'test-secret';
    const raw = '{"id":"evt2","type":"subscription.renewed"}';
    const key =
      't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
    const sig = crypto.createHmac('sha256', key).update(Buffer.from(raw, 'utf8')).digest('base64');
    assert.equal(authorizeWebhook({ querySecret: '', signatureHeader: sig, rawBody: raw }), true);
  });
});
