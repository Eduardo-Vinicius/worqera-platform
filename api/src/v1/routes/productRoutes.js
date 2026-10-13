const express = require('express');
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requirePlatformAdmin];

router.get('/', ...guard, productController.list);
router.get('/summary', ...guard, productController.summary);
router.post('/', ...guard, productController.create);
router.get('/:id/movements', ...guard, productController.movements);
router.post('/:id/adjust', ...guard, productController.adjust);
router.get('/:id', ...guard, productController.get);
router.patch('/:id', ...guard, productController.patch);
router.delete('/:id', ...guard, productController.remove);

module.exports = router;
