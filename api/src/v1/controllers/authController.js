const authService = require('../services/authService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');

exports.signup = wrap(async (req, res) => {
  const { email, password, name, shopName, shopSlug } = req.body || {};
  if (!email || !password) {
    return sendError(res, 400, {
      title: 'Validation Error',
      detail: 'email and password are required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await authService.signup({ email, password, name, shopName, shopSlug });
  res.status(201).json(result);
});

exports.login = wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return sendError(res, 400, {
      title: 'Validation Error',
      detail: 'email and password are required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await authService.login({ email, password });
  res.status(200).json(result);
});

exports.refresh = wrap(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return sendError(res, 400, {
      title: 'Validation Error',
      detail: 'refreshToken is required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await authService.refresh(refreshToken);
  res.status(200).json(result);
});

exports.logout = wrap(async (_req, res) => {
  res.status(200).json({ ok: true });
});

exports.me = wrap(async (req, res) => {
  const result = await authService.me(req.auth.userId);
  res.status(200).json(result);
});
