/**
 * Structured request log (JSON one line). Skip noisy health probes unless slow/error.
 */
function requestLog(req, res, next) {
  const start = process.hrtime.bigint();
  const path = String(req.originalUrl || req.url || '');
  const skipQuiet =
    path === '/health' ||
    path.startsWith('/health/') ||
    path === '/favicon.ico';

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const status = res.statusCode;
    if (skipQuiet && status < 400 && ms < 200) return;

    const line = {
      ts: new Date().toISOString(),
      level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
      msg: 'http',
      method: req.method,
      path,
      status,
      ms: Math.round(ms * 10) / 10,
      correlationId: req.correlationId || null,
      shopId: req.shopId ? String(req.shopId) : null,
      userId: req.auth?.userId || req.auth?.sub || req.user?.sub || null,
    };
    const out = JSON.stringify(line);
    if (status >= 500) console.error(out);
    else if (status >= 400) console.warn(out);
    else console.log(out);
  });

  next();
}

module.exports = { requestLog };
