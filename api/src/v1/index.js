const express = require('express');
const billingController = require('./controllers/billingController');

const router = express.Router();

router.use('/auth', require('./routes/authRoutes'));
router.use('/shops', require('./routes/shopRoutes'));
router.use('/sectors', require('./routes/sectorRoutes'));
router.use('/kanban', require('./routes/kanbanRoutes'));
router.use('/clients', require('./routes/clientRoutes'));
router.use('/orders', require('./routes/orderRoutes'));
router.use('/employees', require('./routes/employeeRoutes'));
router.use('/billing', require('./routes/billingRoutes'));
router.use('/dashboard', require('./routes/dashboardRoutes'));
router.use('/metrics', require('./routes/metricsRoutes'));
router.use('/files', require('./routes/fileRoutes'));
router.use('/public', require('./routes/publicRoutes'));
router.use('/services', require('./routes/serviceRoutes'));
router.use('/platform', require('./routes/platformRoutes'));
router.use('/alerts', require('./routes/alertsRoutes'));
router.use('/invites', require('./routes/inviteRoutes'));

// Webhook at /api/v1/webhooks/abacatepay
router.post('/webhooks/abacatepay', billingController.abacateWebhook);

module.exports = router;
