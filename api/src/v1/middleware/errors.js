const GENERIC_500 = 'Erro interno. Tente de novo em instantes.';

function sendError(res, status, { title, detail, code, type = 'about:blank', extras = {} }) {
  const statusNum = Number(status) || 500;
  const correlationId = res.req?.correlationId || null;
  const resolvedCode = code || defaultCode(statusNum);
  const internalDetail = detail || title || statusTitle(statusNum);
  const publicDetail = statusNum >= 500 ? GENERIC_500 : internalDetail;
  res.locals.apiError = `${resolvedCode}: ${internalDetail}`.slice(0, 500);
  return res.status(statusNum).json({
    type,
    title: statusNum >= 500 ? 'Internal Server Error' : title || statusTitle(statusNum),
    status: statusNum,
    detail: publicDetail,
    code: resolvedCode,
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
  if ((err.status || 500) >= 500) res.locals.apiError = err.detail || err.message;
  return sendError(res, err.status || 500, {
    title: err.title || 'Internal Server Error',
    detail: err.detail || err.message || 'Unexpected error',
    code: err.code || 'INTERNAL_ERROR',
  });
}

module.exports = { sendError, errorHandler, GENERIC_500 };
