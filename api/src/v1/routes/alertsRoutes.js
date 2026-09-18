const express = require('express');
const alertsController = require('../controllers/alertsController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requireRole('owner', 'admin')];
const ownerGuard = [auth, shopContext, subscriptionGate, requireRole('owner')];

router.get('/delays', ...guard, alertsController.listDelays);
router.get('/inbox', ...guard, alertsController.inbox);
router.post('/delays/digest', ...guard, alertsController.sendDigest);
router.post('/weekly-digest', ...ownerGuard, alertsController.sendWeeklyDigest);

module.exports = router;
