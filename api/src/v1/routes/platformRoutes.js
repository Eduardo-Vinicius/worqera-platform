const express = require('express');
const platformController = require('../controllers/platformController');
const { auth } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

const router = express.Router();
const guard = [auth, requirePlatformAdmin];

router.get('/shops', ...guard, platformController.listShops);
router.get('/shops/:id', ...guard, platformController.getShop);
router.patch('/shops/:id', ...guard, platformController.patchShop);
router.patch('/shops/:id/whatsapp', ...guard, require('../controllers/whatsappController').platformUpdate);
router.patch('/shops/:id/ai', ...guard, require('../controllers/aiController').platformQuota);
router.get('/ops', ...guard, platformController.ops);
router.get('/config', ...guard, platformController.getConfig);
router.put('/config', ...guard, platformController.putConfig);
router.get('/notices', ...guard, platformController.listNotices);
router.post('/notices', ...guard, platformController.createNotice);
router.delete('/notices/:id', ...guard, platformController.deleteNotice);

const admin = require('../controllers/platformAdminController');
router.get('/metrics/tech', ...guard, admin.tech);
router.get('/metrics/business', ...guard, admin.business);
router.get('/metrics/product', ...guard, admin.product);
router.get('/insights', ...guard, admin.insights);
router.get('/queues', ...guard, admin.queues);
router.get('/overview', ...guard, admin.overview);
router.get('/analytics/funnel', ...guard, admin.funnel);
router.get('/analytics/cohorts', ...guard, admin.cohorts);
router.get('/analytics/engagement', ...guard, admin.engagement);
router.get('/analytics/adoption', ...guard, admin.adoption);
router.get('/analytics/transactions', ...guard, admin.transactions);
router.get('/shops-health', ...guard, admin.shopsHealth);
router.get('/accounts', ...guard, admin.accounts);
router.get('/accounts/:id', ...guard, admin.account);

module.exports = router;
