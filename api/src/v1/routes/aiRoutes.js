const express = require('express');
const aiController = require('../controllers/aiController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

const guard = [auth, shopContext, subscriptionGate];
const team = requireRole('owner', 'admin', 'atendimento');

router.get('/quota', ...guard, team, aiController.quota);
router.get('/receivables', ...guard, requireRole('owner', 'admin'), aiController.receivables);
router.get('/clients/:id/insight', ...guard, team, aiController.clientInsight);
router.post('/orders/:id/message', ...guard, team, aiController.improveMessage);

module.exports = router;
