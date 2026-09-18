const express = require('express');
const orderController = require('../controllers/orderController');
const fileController = require('../controllers/fileController');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

const publicReadLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyFn: (req) => `pub-read:${req.ip || 'unknown'}`,
});

const publicFeedbackLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `pub-fb:${req.ip || 'unknown'}`,
});

const publicFilesLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyFn: (req) => `pub-files:${req.ip || 'unknown'}`,
});

router.get('/orders/:code', publicReadLimit, orderController.publicByCode);
router.get('/shops/:shopSlug/orders/:code', publicReadLimit, orderController.publicByCode);
router.post(
  '/shops/:shopSlug/orders/:code/feedback',
  publicFeedbackLimit,
  orderController.publicFeedback
);

const publicFiles = express.Router();
publicFiles.get('/*', publicFilesLimit, fileController.getPublicFile);
router.use('/files', publicFiles);

module.exports = router;
