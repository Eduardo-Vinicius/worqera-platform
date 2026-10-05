const express = require('express');
const { auth } = require('../middleware/auth');
const { wrap } = require('../controllers/helpers');
const platformConsole = require('../services/platformConsoleService');

const router = express.Router();

router.get(
  '/config',
  auth,
  wrap(async (req, res) => {
    const platform = String(req.query.platform || 'web').toLowerCase();
    const allowed = ['web', 'ios', 'android'];
    const config = await platformConsole.buildRuntimeConfig({
      shopId: req.auth.shopId || null,
      platform: allowed.includes(platform) ? platform : 'web',
      version: String(req.query.version || '').slice(0, 32),
      region: String(req.query.region || '').slice(0, 80),
    });
    res.status(200).json(config);
  })
);

router.post(
  '/location',
  auth,
  wrap(async (req, res) => {
    const result = await platformConsole.saveLocation(req.auth.userId, req.body || {});
    res.status(200).json(result);
  })
);

module.exports = router;
