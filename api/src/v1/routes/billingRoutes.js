const express = require('express');
const billingController = require('../controllers/billingController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');

const router = express.Router();

// Billing does not require active subscription (needed to subscribe / view products)
const shopGuard = [auth, shopContext];

router.get('/products', ...shopGuard, billingController.listProducts);
router.get('/subscription', ...shopGuard, billingController.getSubscription);
router.post('/checkout-sessions', ...shopGuard, billingController.createCheckoutSession);
router.post('/dev/complete-checkout', ...shopGuard, billingController.completeCheckoutDev);

module.exports = router;
