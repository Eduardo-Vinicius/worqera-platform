function sendError(res, status, { title, detail, code, type = 'about:blank', extras = {} }) {
  const correlationId = res.req?.correlationId || null;
  return res.status(status).json({
    type,
    title: title || statusTitle(status),
    status,
    detail: detail || title || statusTitle(status),
    code: code || defaultCode(status),
    correlationId,
    ...extras,
  });
}

function statusTitle(status) {
  const map = {
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
  };
  return map[status] || 'Error';
}

function defaultCode(status) {
  const map = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    402: 'SUBSCRIPTION_INACTIVE',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    500: 'INTERNAL_ERROR',
  };
  return map[status] || 'ERROR';
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  console.error('[v1] Unhandled error:', err);
  return sendError(res, err.status || 500, {
    title: err.title || 'Internal Server Error',
    detail: err.detail || err.message || 'Unexpected error',
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = { sendError, errorHandler };
