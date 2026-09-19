const express = require('express');
const employeeController = require('../controllers/employeeController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate, requireRole('owner', 'admin')];

router.get('/', ...guard, employeeController.list);
router.post('/', ...guard, employeeController.create);
router.get('/:id', ...guard, employeeController.get);
router.patch('/:id', ...guard, employeeController.patch);
router.delete('/:id', ...guard, employeeController.remove);

module.exports = router;
