const express = require('express');
const accessoryController = require('../controllers/accessoryController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, accessoryController.list);
router.post('/', ...guard, requireRole('owner', 'admin', 'atendimento'), accessoryController.create);
router.patch('/:id', ...guard, requireRole('owner', 'admin', 'atendimento'), accessoryController.patch);
router.delete('/:id', ...guard, requireRole('owner', 'admin', 'atendimento'), accessoryController.remove);

module.exports = router;
