const express = require('express');
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

// GET /api/v1/files/shops/.../foto-1.jpg
router.get('/*', ...guard, fileController.getFile);

module.exports = router;
