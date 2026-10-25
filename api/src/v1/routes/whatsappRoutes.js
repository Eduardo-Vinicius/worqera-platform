const express = require('express');
const whatsappController = require('../controllers/whatsappController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];
const admin = [...guard, requireRole('owner', 'admin')];

router.get('/', ...guard, requireRole('owner', 'admin', 'atendimento'), whatsappController.status);
router.post('/connect', ...admin, whatsappController.connect);
router.patch('/', ...admin, whatsappController.update);
router.post('/disconnect', ...admin, whatsappController.disconnect);

module.exports = router;
