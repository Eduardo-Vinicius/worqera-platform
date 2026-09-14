const { sendError } = require('./errors');

function requireRole(...roles) {
  const allowed = roles.map((r) => String(r).toLowerCase());
  return function requireRoleMiddleware(req, res, next) {
    const role = String(req.membership?.role || req.auth?.role || '').toLowerCase();
    if (!allowed.includes(role)) {
      return sendError(res, 403, {
        title: 'Forbidden',
        detail: `Requires one of roles: ${allowed.join(', ')}`,
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
}

module.exports = { requireRole };
