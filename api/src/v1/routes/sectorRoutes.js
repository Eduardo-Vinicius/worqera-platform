const express = require('express');
const sectorController = require('../controllers/sectorController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, sectorController.list);
router.get('/stats', ...guard, sectorController.stats);
router.post('/', ...guard, requireRole('owner', 'admin'), sectorController.create);
router.post('/reorder', ...guard, requireRole('owner', 'admin'), sectorController.reorder);
router.patch('/:id', ...guard, requireRole('owner', 'admin'), sectorController.patch);
router.delete('/:id', ...guard, requireRole('owner', 'admin'), sectorController.remove);

module.exports = router;
