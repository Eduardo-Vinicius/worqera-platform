const express = require('express');
const funcionarioController = require('../controllers/funcionarioController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', funcionarioController.listFuncionarios);
router.get('/:id', funcionarioController.getFuncionario);
router.post('/', funcionarioController.createFuncionario);
router.patch('/:id', funcionarioController.updateFuncionario);
router.delete('/:id', funcionarioController.deleteFuncionario);

module.exports = router;
