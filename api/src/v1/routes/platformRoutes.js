const express = require('express');
const platformController = require('../controllers/platformController');
const { auth } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

const router = express.Router();
const guard = [auth, requirePlatformAdmin];

router.get('/shops', ...guard, platformController.listShops);
router.get('/shops/:id', ...guard, platformController.getShop);
router.patch('/shops/:id', ...guard, platformController.patchShop);
router.get('/ops', ...guard, platformController.ops);
router.get('/config', ...guard, platformController.getConfig);
router.put('/config', ...guard, platformController.putConfig);
router.get('/notices', ...guard, platformController.listNotices);
router.post('/notices', ...guard, platformController.createNotice);
router.delete('/notices/:id', ...guard, platformController.deleteNotice);

module.exports = router;
