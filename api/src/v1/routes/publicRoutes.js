const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();

router.get('/orders/:code', orderController.publicByCode);
router.get('/shops/:shopSlug/orders/:code', orderController.publicByCode);

module.exports = router;
