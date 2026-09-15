const authService = require('../services/authService');
const { wrap } = require('./helpers');
const { sendError } = require('../middleware/errors');

const REFRESH_COOKIE = 'wq_refresh';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: REFRESH_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, refreshToken) {
  if (!refreshToken) return;
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    path: '/api/v1/auth',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
}

exports.signup = wrap(async (req, res) => {
  const { email, password, name, shopName, shopSlug, partnerCode, ref } = req.body || {};
  if (!email || !password) {
    return sendError(res, 400, {
      title: 'Validation Error',
      detail: 'email and password are required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await authService.signup({
    email,
    password,
    name,
    shopName,
    shopSlug,
    partnerCode,
    ref: ref || req.query?.ref,
  });
  setRefreshCookie(res, result.refreshToken);
  return res.status(201).json(result);
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
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(result);
});

exports.refresh = wrap(async (req, res) => {
  const refreshToken =
    req.body?.refreshToken || req.cookies?.[REFRESH_COOKIE] || null;
  if (!refreshToken) {
    return sendError(res, 400, {
      title: 'Validation Error',
      detail: 'refreshToken is required',
      code: 'VALIDATION_ERROR',
    });
  }
  const result = await authService.refresh(refreshToken);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json(result);
});

exports.logout = wrap(async (_req, res) => {
  clearRefreshCookie(res);
  res.status(200).json({ ok: true });
});

exports.forgotPassword = wrap(async (req, res) => {
  const email = req.body?.email;
  const result = await authService.requestPasswordReset(email);
  res.status(200).json(result);
});

exports.resetPassword = wrap(async (req, res) => {
  const { token, password } = req.body || {};
  const result = await authService.resetPassword({ token, password });
  res.status(200).json(result);
});

exports.me = wrap(async (req, res) => {
  const result = await authService.me(req.auth.userId);
  res.status(200).json(result);
});
