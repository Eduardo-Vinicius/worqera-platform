const express = require('express');
const serviceController = require('../controllers/serviceController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, serviceController.list);
router.post('/', ...guard, requireRole('owner', 'admin'), serviceController.create);
router.patch('/:id', ...guard, requireRole('owner', 'admin'), serviceController.patch);
router.delete('/:id', ...guard, requireRole('owner', 'admin'), serviceController.remove);

module.exports = router;
