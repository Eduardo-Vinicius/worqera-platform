const express = require('express');
const platformController = require('../controllers/platformController');
const { auth } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

const router = express.Router();
const guard = [auth, requirePlatformAdmin];

router.get('/shops', ...guard, platformController.listShops);
router.get('/shops/:id', ...guard, platformController.getShop);
router.patch('/shops/:id', ...guard, platformController.patchShop);

module.exports = router;
