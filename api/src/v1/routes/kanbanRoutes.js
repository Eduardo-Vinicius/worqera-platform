const express = require('express');
const kanbanController = require('../controllers/kanbanController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, kanbanController.getBoard);
router.post('/orders/:orderId/move', ...guard, kanbanController.moveOrder);

module.exports = router;
