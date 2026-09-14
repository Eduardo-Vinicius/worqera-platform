const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /dashboard - Obter dados do dashboard (requer autenticação)
router.use(authMiddleware);
router.get('/', dashboardController.getDashboard);

module.exports = router;