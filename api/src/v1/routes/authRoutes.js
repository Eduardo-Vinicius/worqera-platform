const express = require('express');
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

const signupLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SIGNUP_RATE_LIMIT_MAX || 8),
  keyFn: (req) => {
    const email = String(req.body?.email || '')
      .toLowerCase()
      .trim();
    return `signup:${req.ip || 'ip'}:${email || 'noemail'}`;
  },
});

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 30),
  keyFn: (req) => `login:${req.ip || 'ip'}`,
});

const forgotLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.FORGOT_RATE_LIMIT_MAX || 10),
  keyFn: (req) => `forgot:${req.ip || 'ip'}`,
});

// Own budget for the last step of signup: typos in the code must not use up "Esqueci a senha" (and vice versa).
const verifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.VERIFY_RATE_LIMIT_MAX || 30),
  keyFn: (req) => `verify:${req.ip || 'ip'}`,
});

const refreshLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.REFRESH_RATE_LIMIT_MAX || 60),
  keyFn: (req) => `refresh:${req.ip || 'ip'}`,
});

router.post('/signup', signupLimit, authController.signup);
router.post('/login', loginLimit, authController.login);
router.post('/apple', loginLimit, authController.apple);
router.post('/refresh', refreshLimit, authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', forgotLimit, authController.forgotPassword);
router.post('/reset-password', forgotLimit, authController.resetPassword);
router.post('/verify-email', verifyLimit, authController.verifyEmail);
router.get('/verify-email', verifyLimit, authController.verifyEmail);
router.post('/resend-verification', verifyLimit, authController.resendVerification);
router.get('/me', auth, authController.me);
router.delete('/account', auth, authController.deleteAccount);

module.exports = router;
