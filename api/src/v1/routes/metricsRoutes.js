const express = require('express');
const metricsController = require('../controllers/metricsController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requireRole('owner', 'admin')];

router.get('/departments', ...guard, metricsController.departments);
router.get('/employees', ...guard, metricsController.employees);
router.get('/employees/performance', ...guard, metricsController.employeePerformance);
router.get('/delays', ...guard, metricsController.delays);
router.get('/summary', ...guard, metricsController.summary);
router.get('/finance', ...guard, metricsController.finance);
router.get('/overview', ...guard, metricsController.overview);

module.exports = router;
