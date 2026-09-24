const express = require('express');
const orderController = require('../controllers/orderController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, orderController.list);
router.post('/', ...guard, orderController.create);
router.get('/export.csv', ...guard, requireRole('owner'), orderController.exportCsv);
router.get('/export', ...guard, requireRole('owner'), orderController.exportCsv);
router.post(
  '/demo',
  ...guard,
  requireRole('owner', 'admin', 'atendimento'),
  orderController.createDemo
);
router.post(
  '/:id/photos',
  ...guard,
  orderController.uploadPhotosMiddleware,
  orderController.uploadPhotos
);
router.post(
  '/:id/items/:itemIndex/photos',
  ...guard,
  orderController.uploadPhotosMiddleware,
  orderController.uploadItemPhotos
);
router.delete(
  '/:id/items/:itemIndex/photos/:photoIndex',
  ...guard,
  orderController.deleteItemPhoto
);
router.patch('/:id/items/:itemIndex', ...guard, orderController.patchItem);
router.post('/:id/items', ...guard, orderController.addItem);
router.delete('/:id/items/:itemIndex', ...guard, orderController.deleteItem);
router.get('/:id/photos/zip', ...guard, orderController.zipPhotos);
router.post('/:id/pdf', ...guard, orderController.generatePdf);
router.get('/:id/pdfs', ...guard, orderController.listPdfs);
router.post('/:id/resend-email', ...guard, orderController.resendEmail);
router.get('/:id', ...guard, orderController.get);
router.patch('/:id', ...guard, orderController.patch);
router.post('/:id/reopen', ...guard, orderController.reopen);
router.post('/:id/restore', ...guard, orderController.restore);
router.delete('/:id/purge', ...guard, requireRole('owner', 'admin'), orderController.purge);
router.post('/:id/comments', ...guard, orderController.addComment);
router.delete('/:id', ...guard, orderController.remove);

module.exports = router;
