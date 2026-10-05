function normalizeRoute(req) {
  if (req?.route) {
    const base = String(req.baseUrl || '');
    const path = req.route.path === '/' ? '' : String(req.route.path || '');
    const joined = `${base}${path}` || base || '/';
    return joined.replace(/\/+$/, '') || '/';
  }
  const raw = String(req?.originalUrl || req?.url || '/').split('?')[0];
  return raw
    .replace(/\/[a-f0-9]{24}/gi, '/:id')
    .replace(/\/\d+/g, '/:n');
}

function compareVersion(a, b) {
  const pa = String(a || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function noticeMatches(notice, { platform, version, region, now = new Date() }) {
  if (!notice || notice.active === false) return false;
  if (notice.startsAt && new Date(notice.startsAt) > now) return false;
  if (notice.endsAt && new Date(notice.endsAt) < now) return false;
  const plat = String(notice.platform || 'all').toLowerCase();
  const want = String(platform || 'web').toLowerCase();
  if (plat !== 'all' && plat !== want) return false;
  const regionWant = String(notice.region || '').trim().toLowerCase();
  if (regionWant && regionWant !== String(region || '').trim().toLowerCase()) return false;
  if ((notice.minVersion || notice.maxVersion) && !String(version || '').trim()) return false;
  if (notice.minVersion && compareVersion(version, notice.minVersion) < 0) return false;
  if (notice.maxVersion && compareVersion(version, notice.maxVersion) > 0) return false;
  return true;
}

module.exports = { normalizeRoute, compareVersion, noticeMatches };
