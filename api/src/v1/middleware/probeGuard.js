/**
 * Paths outside the API are internet scanners (.env, .git, phpinfo, WordPress).
 * Answer 404 here so they never reach logs, metrics, or route handlers.
 * / , /health and /api/v1 stay untouched.
 */
function isScannerPath(url) {
  const path = String(url || '/').split('?')[0];
  if (path === '/' || path === '/favicon.ico') return false;
  if (path === '/health' || path.startsWith('/health/')) return false;
  if (path === '/api/v1' || path.startsWith('/api/v1/')) return false;
  return true;
}

function probeGuard(req, res, next) {
  if (!isScannerPath(req.originalUrl || req.url)) return next();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(404).type('text/plain').send('Not found');
}

module.exports = { isScannerPath, probeGuard };
