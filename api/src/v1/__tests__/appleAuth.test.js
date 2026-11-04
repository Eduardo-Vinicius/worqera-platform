const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifyIdentityToken } = require('../lib/appleAuth');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256', use: 'sig' };
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

function token(claims = {}, { kid = 'test-kid', key = privateKey, expiresIn = '10m' } = {}) {
  return jwt.sign(
    { sub: '001234.abc', email: 'Ana@Privaterelay.AppleId.com', email_verified: 'true', is_private_email: 'true', ...claims },
    key,
    { algorithm: 'RS256', keyid: kid, issuer: 'https://appleid.apple.com', audience: 'com.worqera.worqeraMobile', expiresIn }
  );
}

test('valid Apple token → sub and normalized e-mail', async () => {
  const r = await verifyIdentityToken(token(), { keys: [jwk] });
  assert.deepEqual(r, { sub: '001234.abc', email: 'ana@privaterelay.appleid.com', emailVerified: true, privateEmail: true });
});

test('wrong audience, issuer, expired, unknown key or forged signature → 401', async () => {
  const bad = [
    jwt.sign({ sub: 'x' }, privateKey, { algorithm: 'RS256', keyid: 'test-kid', issuer: 'https://appleid.apple.com', audience: 'com.other.app', expiresIn: '10m' }),
    jwt.sign({ sub: 'x' }, privateKey, { algorithm: 'RS256', keyid: 'test-kid', issuer: 'https://evil.example', audience: 'com.worqera.worqeraMobile', expiresIn: '10m' }),
    token({}, { expiresIn: '-1m' }),
    token({}, { kid: 'unknown' }),
    token({}, { key: other.privateKey }),
    'not-a-jwt',
  ];
  for (const t of bad) {
    await assert.rejects(verifyIdentityToken(t, { keys: [jwk] }), (err) => err.status === 401 && err.code === 'APPLE_TOKEN_INVALID');
  }
});
