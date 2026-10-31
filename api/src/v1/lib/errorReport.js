/**
 * Sentry for the API. Off unless SENTRY_DSN is set, so dev and tests never send anything.
 * Only 5xx get reported; no request body, headers or user data leave the server
 * (shop id, route and correlation id are enough to find the case in our own logs).
 */
let Sentry = null;

function init() {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn || Sentry) return;
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend(event) {
        if (event.request) {
          delete event.request.headers;
          delete event.request.cookies;
          delete event.request.data;
          delete event.request.query_string;
        }
        delete event.user;
        return event;
      },
    });
    console.log('[Worqera API] Sentry on');
  } catch (err) {
    Sentry = null;
    console.error('[Worqera API] Sentry failed to start:', err?.message || err);
  }
}

function reportError(err, req) {
  if (!Sentry) return;
  try {
    Sentry.withScope((scope) => {
      if (req) {
        scope.setTag('method', req.method);
        scope.setTag('route', req.baseUrl ? `${req.baseUrl}${req.route?.path || ''}` : req.path);
        if (req.correlationId) scope.setTag('correlationId', String(req.correlationId));
        const shopId = req.auth?.shopId || req.shopId;
        if (shopId) scope.setTag('shopId', String(shopId));
      }
      Sentry.captureException(err instanceof Error ? err : new Error(String(err?.message || err)));
    });
  } catch {
    // Reporting must never break the response.
  }
}

module.exports = { init, reportError };
