const PRODUCTION_ORIGINS = ['https://worqera.com', 'https://www.worqera.com'];

function configuredOrigins() {
  const raw = [
    process.env.PUBLIC_WEB_URL,
    process.env.WORQERA_PublicWebUrl,
    process.env.CORS_ORIGINS,
  ];
  const list = [];
  for (const value of raw) {
    String(value || '')
      .split(',')
      .map((part) => part.trim().replace(/\/+$/, ''))
      .filter(Boolean)
      .forEach((origin) => list.push(origin));
  }
  return list;
}

function originAllowed(origin) {
  if (!origin) return true;
  const normalized = String(origin).trim().replace(/\/+$/, '');
  const allowed = new Set([...PRODUCTION_ORIGINS, ...configuredOrigins()]);
  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
  }
  if (allowed.has(normalized)) return true;
  if (process.env.NODE_ENV === 'production') return false;
  try {
    const host = new URL(normalized).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

module.exports = { originAllowed, PRODUCTION_ORIGINS };
