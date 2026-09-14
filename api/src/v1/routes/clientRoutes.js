const express = require('express');
const clientController = require('../controllers/clientController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, clientController.list);
router.post('/', ...guard, clientController.create);
router.get('/:id', ...guard, clientController.get);
router.patch('/:id', ...guard, clientController.patch);
router.delete('/:id', ...guard, clientController.remove);

module.exports = router;
