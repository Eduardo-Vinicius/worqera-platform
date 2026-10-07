const User = require('../models/User');

const cache = new Map();
const TTL_MS = 5000;

function remember(userId, version) {
  cache.set(String(userId), { tv: Number(version) || 0, exp: Date.now() + TTL_MS });
}

/**
 * Mongo is the source of truth. A short memory cache avoids a lookup on every
 * request. Redis is not consulted: a stale key was rejecting live logins.
 */
async function readTokenVersion(userId) {
  if (!userId) return 0;
  const key = String(userId);
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.tv;
  const user = await User.findById(userId).select('tokenVersion').lean();
  if (!user) {
    cache.delete(key);
    return null;
  }
  const tv = Number(user.tokenVersion) || 0;
  remember(key, tv);
  return tv;
}

async function writeTokenVersion(userId, version) {
  if (!userId) return;
  remember(userId, version);
}

module.exports = { readTokenVersion, writeTokenVersion };
