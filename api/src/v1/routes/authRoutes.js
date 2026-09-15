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

router.post('/signup', signupLimit, authController.signup);
router.post('/login', loginLimit, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', forgotLimit, authController.forgotPassword);
router.post('/reset-password', forgotLimit, authController.resetPassword);
router.get('/me', auth, authController.me);

module.exports = router;
