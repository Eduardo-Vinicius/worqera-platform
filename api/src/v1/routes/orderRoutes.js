const express = require('express');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, orderController.list);
router.post('/', ...guard, orderController.create);
router.get('/:id', ...guard, orderController.get);
router.patch('/:id', ...guard, orderController.patch);
router.delete('/:id', ...guard, orderController.remove);

module.exports = router;
