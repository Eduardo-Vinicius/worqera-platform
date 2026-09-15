const { sendError } = require('./errors');

function platformAdminEmails() {
  return String(process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function isPlatformAdminEmail(email) {
  const list = platformAdminEmails();
  if (!list.length) return false;
  return list.includes(String(email || '').toLowerCase());
}

function requirePlatformAdmin(req, res, next) {
  const email = req.auth?.email;
  if (!isPlatformAdminEmail(email)) {
    return sendError(res, 403, {
      title: 'Forbidden',
      detail: 'Platform admin access required',
      code: 'FORBIDDEN',
    });
  }
  return next();
}

module.exports = {
  requirePlatformAdmin,
  isPlatformAdminEmail,
  platformAdminEmails,
};
