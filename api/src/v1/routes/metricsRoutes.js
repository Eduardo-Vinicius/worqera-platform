const express = require('express');
const metricsController = require('../controllers/metricsController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requireRole('owner', 'admin')];

router.get('/departamentos', ...guard, metricsController.departamentos);
router.get('/funcionarios', ...guard, metricsController.funcionarios);
router.get('/funcionarios/desempenho', ...guard, metricsController.desempenho);
router.get('/atrasos', ...guard, metricsController.atrasos);
router.get('/resumo', ...guard, metricsController.resumo);
router.get('/financeiro', ...guard, metricsController.financeiro);
router.get('/overview', ...guard, metricsController.overview);

module.exports = router;
