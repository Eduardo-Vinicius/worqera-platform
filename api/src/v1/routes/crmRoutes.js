const express = require('express');
const crmController = require('../controllers/crmController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requireRole('owner', 'admin', 'atendimento')];

router.get('/summary', ...guard, crmController.summary);
router.get('/list', ...guard, crmController.list);
router.get('/insight', ...guard, crmController.insight);

module.exports = router;
