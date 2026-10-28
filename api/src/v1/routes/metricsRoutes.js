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
router.get('/attendance', ...guard, metricsController.attendance);
router.get('/delays', ...guard, metricsController.delays);
router.get('/summary', ...guard, metricsController.summary);
router.get('/finance', ...guard, metricsController.finance);
router.get('/overview', ...guard, metricsController.overview);
router.get('/insights', ...guard, require('../controllers/aiController').insights);

module.exports = router;
