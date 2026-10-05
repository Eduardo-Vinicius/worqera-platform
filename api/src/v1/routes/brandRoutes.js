const express = require('express');
const brandController = require('../controllers/brandController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, brandController.list);
router.post('/', ...guard, requireRole('owner', 'admin', 'atendimento'), brandController.create);
router.patch('/:id', ...guard, requireRole('owner', 'admin', 'atendimento'), brandController.patch);
router.delete('/:id', ...guard, requireRole('owner', 'admin', 'atendimento'), brandController.remove);

module.exports = router;
