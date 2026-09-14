const express = require('express');
const clienteController = require('../controllers/clienteController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/', clienteController.listClientes);
router.get('/:id', clienteController.getCliente);
router.post('/', clienteController.createCliente);
router.put('/:id', clienteController.updateCliente);
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
