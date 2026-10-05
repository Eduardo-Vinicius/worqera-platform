const User = require('../models/User');
const { redisCmd } = require('./redisClient');

function tvKey(userId) {
  return `tv:${userId}`;
}

async function readTokenVersion(userId) {
  if (!userId) return 0;
  const cached = await redisCmd((redis) => redis.get(tvKey(userId)));
  if (cached != null && cached !== '') return Number(cached) || 0;
  const user = await User.findById(userId).select('tokenVersion').lean();
  if (!user) return null;
  const tv = Number(user.tokenVersion) || 0;
  await redisCmd((redis) => redis.set(tvKey(userId), String(tv)));
  return tv;
}

async function writeTokenVersion(userId, version) {
  await redisCmd((redis) => redis.set(tvKey(userId), String(Number(version) || 0)));
}

module.exports = { readTokenVersion, writeTokenVersion };
