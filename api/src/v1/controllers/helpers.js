function wrap(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      const { sendError } = require('../middleware/errors');
      const status = err.status || 500;
      return sendError(res, status, {
        title: err.title || (status >= 500 ? 'Internal Server Error' : 'Error'),
        detail: err.detail || err.message,
        code: err.code || (status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : undefined),
      });
    }
  };
}

module.exports = { wrap };
