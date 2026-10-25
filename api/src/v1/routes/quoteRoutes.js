const express = require('express');
const quoteController = require('../controllers/quoteController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const base = [auth, shopContext, subscriptionGate];
const guard = [...base, requireRole('owner', 'admin', 'atendimento')];

router.get('/', ...guard, quoteController.list);
router.post('/', ...guard, quoteController.create);
router.get('/:id', ...guard, quoteController.get);
router.patch('/:id', ...guard, quoteController.patch);
router.post('/:id/activity', ...guard, quoteController.activity);
router.post('/:id/suggest', ...guard, quoteController.suggest);
router.post('/:id/win', ...guard, quoteController.win);
router.post('/:id/whatsapp', ...guard, require('../controllers/whatsappController').quoteFollowUp);
router.delete('/:id', ...base, requireRole('owner', 'admin'), quoteController.remove);

module.exports = router;
