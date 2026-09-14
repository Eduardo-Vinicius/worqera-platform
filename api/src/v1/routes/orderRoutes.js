const express = require('express');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, orderController.list);
router.post('/', ...guard, orderController.create);
router.post(
  '/:id/photos',
  ...guard,
  orderController.uploadPhotosMiddleware,
  orderController.uploadPhotos
);
router.get('/:id/photos/zip', ...guard, orderController.zipPhotos);
router.post('/:id/pdf', ...guard, orderController.generatePdf);
router.get('/:id/pdfs', ...guard, orderController.listPdfs);
router.get('/:id', ...guard, orderController.get);
router.patch('/:id', ...guard, orderController.patch);
router.delete('/:id', ...guard, orderController.remove);

module.exports = router;
