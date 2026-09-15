const { sendError } = require('./errors');

/** Simple in-memory rate limiter (per-process). Good enough for single-node v1. */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, keyFn } = {}) {
  const hits = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const key = String(keyFn ? keyFn(req) : req.ip || 'unknown');
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return sendError(res, 429, {
        title: 'Too Many Requests',
        detail: `Rate limit exceeded. Retry in ${retrySec}s`,
        code: 'RATE_LIMITED',
      });
    }
    return next();
  };
}

module.exports = { rateLimit };
