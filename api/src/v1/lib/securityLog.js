/** Writes the security timeline in the background; a failure here never stops a login. */
const crypto = require('crypto');
const { clientOf } = require('./metricsStore');

function deviceOf(req) {
  const ua = String(req?.headers?.['user-agent'] || '').slice(0, 300);
  const { client, platform, appVersion } = clientOf(req || {});
  const label = platform ? `${platform === 'ios' ? 'iPhone/iPad' : 'Android'} · app ${appVersion || ''}`.trim() : ua.replace(/\s+/g, ' ').slice(0, 120);
  const hash = crypto.createHash('sha256').update(`${platform || ''}|${ua}`).digest('hex').slice(0, 16);
  const ip = String(req?.headers?.['x-forwarded-for'] || req?.ip || '').split(',')[0].trim().slice(0, 60);
  return { deviceHash: hash, device: label, ip, client };
}

async function write(userId, kind, req, extra = {}) {
  if (!userId) return;
  const SecurityEvent = require('../models/SecurityEvent');
  const device = deviceOf(req);
  let finalKind = kind;
  if (kind === 'login') {
    const known = await SecurityEvent.exists({ userId, deviceHash: device.deviceHash, kind: { $in: ['login', 'login_new_device'] } });
    if (!known) finalKind = 'login_new_device';
  }
  await SecurityEvent.create({ userId, kind: finalKind, at: new Date(), ...device, ...extra });
}

function record(userId, kind, req, extra) {
  write(userId, kind, req, extra).catch((err) => console.warn('[security] evento não gravado:', err.message));
}

module.exports = { record, deviceOf };
