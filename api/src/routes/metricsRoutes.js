const express = require('express');
const metricsController = require('../controllers/metricsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/departamentos', metricsController.getDistribuicaoDepartamentos);
router.get('/funcionarios', metricsController.getDistribuicaoFuncionarios);
router.get('/funcionarios/desempenho', metricsController.getDesempenhoFuncionarios);
router.get('/atrasos', metricsController.getAtrasos);
router.get('/resumo', metricsController.getResumo);
router.get('/financeiro', metricsController.getFinanceiro);
router.get('/overview', metricsController.getOverview);

module.exports = router;
