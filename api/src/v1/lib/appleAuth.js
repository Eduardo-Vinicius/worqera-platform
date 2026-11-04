/**
 * Sign in with Apple: checks the identity token the app receives from Apple.
 * The token is a JWT signed with one of Apple's public keys (JWKS); we accept it only when
 * the signature, issuer, audience (our bundle id) and expiry are right.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ISSUER = 'https://appleid.apple.com';
const KEYS_URL = 'https://appleid.apple.com/auth/keys';
const KEYS_TTL_MS = 60 * 60 * 1000;

let cache = { at: 0, keys: [] };

function audiences() {
  return String(process.env.WORQERA_Apple__ClientIds || 'com.worqera.worqeraMobile')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function appleKeys(fetchImpl = fetch) {
  if (cache.keys.length && Date.now() - cache.at < KEYS_TTL_MS) return cache.keys;
  const res = await fetchImpl(KEYS_URL);
  if (!res.ok) throw new Error(`Apple keys ${res.status}`);
  const body = await res.json();
  cache = { at: Date.now(), keys: Array.isArray(body.keys) ? body.keys : [] };
  return cache.keys;
}

function invalid(message = 'Login com a Apple inválido. Tente de novo.') {
  const err = new Error(message);
  err.status = 401;
  err.code = 'APPLE_TOKEN_INVALID';
  return err;
}

/** Returns `{ sub, email, emailVerified, privateEmail }` or throws 401. */
async function verifyIdentityToken(identityToken, { keys, now } = {}) {
  const token = String(identityToken || '');
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded?.header?.kid) throw invalid();
  const list = keys || (await appleKeys());
  let jwk = list.find((k) => k.kid === decoded.header.kid);
  if (!jwk && !keys) {
    cache = { at: 0, keys: [] };
    jwk = (await appleKeys()).find((k) => k.kid === decoded.header.kid);
  }
  if (!jwk) throw invalid();
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  let claims;
  try {
    claims = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer: ISSUER,
      audience: audiences(),
      ...(now ? { clockTimestamp: Math.floor(now.getTime() / 1000) } : {}),
    });
  } catch {
    throw invalid();
  }
  if (!claims.sub) throw invalid();
  const email = claims.email ? String(claims.email).toLowerCase().trim() : null;
  return {
    sub: String(claims.sub),
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    privateEmail: claims.is_private_email === true || claims.is_private_email === 'true',
  };
}

module.exports = { verifyIdentityToken, audiences, ISSUER, _resetCache: () => (cache = { at: 0, keys: [] }) };
