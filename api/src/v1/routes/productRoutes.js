const express = require('express');
const productController = require('../controllers/productController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];
const write = [...guard, requireRole('owner', 'admin')];

router.get('/', ...guard, productController.list);
router.get('/summary', ...write, productController.summary);
router.get('/report.csv', ...write, productController.report);
router.get('/restock', ...write, productController.restock);
router.post('/', ...write, productController.create);
router.get('/:id/movements', ...write, productController.movements);
router.post('/:id/adjust', ...write, productController.adjust);
router.post('/:id/restock', ...write, productController.restockOrder);
router.post('/:id/restock/arrived', ...write, productController.restockArrived);
router.delete('/:id/restock', ...write, productController.restockCancel);
router.get('/:id', ...guard, productController.get);
router.patch('/:id', ...write, productController.patch);
router.delete('/:id', ...write, productController.remove);

module.exports = router;
