const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * ROTAS DE LOGS DE EMAIL (AUDITORIA)
 * Todas requerem autenticação
 */

// GET /emails/logs - Buscar logs com filtros
router.get('/logs', authMiddleware, emailController.buscarLogsEmail);

// GET /emails/logs/resumo - Resumo rápido
router.get('/logs/resumo', authMiddleware, emailController.obterResumoEmails);

// GET /emails/logs/ultimos/:emailCliente - Últimos emails de um cliente
router.get('/logs/ultimos/:emailCliente', authMiddleware, emailController.obterUltimosEmails);

// GET /emails/logs/pedido/:pedidoId - Emails de um pedido
router.get('/logs/pedido/:pedidoId', authMiddleware, emailController.obterEmailsPorPedido);

// GET /emails/estatisticas - Estatísticas gerais
router.get('/estatisticas', authMiddleware, emailController.obterEstatisticas);

module.exports = router;
