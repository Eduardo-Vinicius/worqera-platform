const express = require('express');
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Rotas de pedidos
router.get('/', pedidoController.listPedidos);
router.get('/kanban/status', pedidoController.listPedidosStatus);
router.get('/consulta', pedidoController.searchPedidosConsulta);
router.get('/:id', pedidoController.getPedido);
router.post('/', pedidoController.createPedido);
router.put('/:id', pedidoController.updatePedido);
router.patch('/:id', pedidoController.patchPedido);
router.delete('/:id', pedidoController.deletePedido);
router.patch('/:id/status', pedidoController.updatePedidoStatus);

// Rotas de PDF
router.post('/document/pdf', pedidoController.generatePedidoPdf);
router.get('/:id/pdfs', pedidoController.listPedidoPdfs);
router.get('/:id/fotos/zip', pedidoController.downloadPedidoFotosZip);

// Rotas de WhatsApp (legado - mantido para compatibilidade)
router.post('/:id/enviar-pdf-whatsapp', pedidoController.enviarPdfWhatsApp);
router.post('/:id/enviar-detalhes-whatsapp', pedidoController.enviarDetalhesWhatsApp);

// ==========================================
// ROTAS DE SETORES
// ==========================================

// Mover pedido para um setor específico
router.post('/:id/mover-setor', pedidoController.moverParaSetor);

// Obter próximo setor no fluxo
router.get('/:id/proximo-setor', pedidoController.getProximoSetor);

module.exports = router;
