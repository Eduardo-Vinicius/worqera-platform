const jwt = require('jsonwebtoken');
const { sendError } = require('./errors');
const { readTokenVersion } = require('../lib/sessionVersion');

const JWT_SECRET = () => process.env.JWT_SECRET || 'changeme';

async function auth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return sendError(res, 401, {
      title: 'Unauthorized',
      detail: 'Missing or invalid Authorization header',
      code: 'UNAUTHORIZED',
    });
  }
  const token = String(authHeader).slice(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET());
    const userId = decoded.sub || decoded.userId;
    const current = await readTokenVersion(userId);
    const tokenTv = Number(decoded.tv ?? 0);
    if (current == null || tokenTv !== current) {
      return sendError(res, 401, {
        title: 'Unauthorized',
        detail: 'Session revoked',
        code: 'UNAUTHORIZED',
      });
    }
    req.auth = {
      userId,
      email: decoded.email,
      role: decoded.role,
      shopId: decoded.shopId || null,
      membershipId: decoded.membershipId || null,
      platformAdmin: Boolean(decoded.platformAdmin),
      raw: decoded,
    };
    return next();
  } catch (err) {
    if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
      return sendError(res, 401, {
        title: 'Unauthorized',
        detail: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      });
    }
    return next(err);
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return next();
  }
  return auth(req, res, next);
}

module.exports = { auth, optionalAuth, JWT_SECRET };
