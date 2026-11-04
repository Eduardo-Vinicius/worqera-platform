/**
 * Records a platform admin action once the response is a success (2xx).
 * `describe(req)` returns `{ targetType, targetId, summary, changes }`.
 */
function audited(action, describe = () => ({})) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      let details = {};
      try {
        details = describe(req) || {};
      } catch {
        details = {};
      }
      require('../services/adminAudit').record(req, { action, ...details });
    });
    next();
  };
}

/** Keeps the audit readable and free of secrets. */
function safeChanges(body = {}) {
  const out = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (/token|secret|password|key/i.test(key)) continue;
    out[key] = typeof value === 'string' ? value.slice(0, 200) : value;
  }
  return out;
}

module.exports = { audited, safeChanges };
