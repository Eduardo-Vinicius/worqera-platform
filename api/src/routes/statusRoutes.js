const express = require('express');
const statusController = require('../controllers/statusController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/columns', statusController.getStatusColumns); // Agora retorna TODAS as colunas
router.get('/columns/filtered', statusController.getStatusColumnsFiltered); // Versão filtrada (compatibilidade)

module.exports = router;