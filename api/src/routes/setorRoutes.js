const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /setores - Lista todos os setores disponíveis
router.get('/', pedidoController.listarSetores);

module.exports = router;
