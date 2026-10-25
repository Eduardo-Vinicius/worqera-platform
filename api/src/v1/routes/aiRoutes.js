const express = require('express');
const aiController = require('../controllers/aiController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.get(
  '/quota',
  auth,
  shopContext,
  subscriptionGate,
  requireRole('owner', 'admin', 'atendimento'),
  aiController.quota
);

module.exports = router;
