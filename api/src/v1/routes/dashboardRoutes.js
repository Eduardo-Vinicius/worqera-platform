const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/', ...guard, dashboardController.dashboard);
router.get('/summary', ...guard, dashboardController.summary);
router.get('/sectors', ...guard, dashboardController.sectors);

module.exports = router;
