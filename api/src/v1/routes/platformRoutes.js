const express = require('express');
const platformController = require('../controllers/platformController');
const { auth } = require('../middleware/auth');
const { requirePlatformAdmin } = require('../middleware/platformAdmin');

const router = express.Router();
const { audited, safeChanges } = require('../middleware/platformAudit');
const { shopPatchSummary } = require('../services/adminAudit');

const guard = [auth, requirePlatformAdmin];
const shopTarget = (req) => ({ targetType: 'shop', targetId: req.params.id, changes: safeChanges(req.body) });

router.get('/shops', ...guard, platformController.listShops);
router.get('/shops/:id', ...guard, platformController.getShop);
router.patch('/shops/:id', ...guard, audited('shop.update', (req) => ({ ...shopTarget(req), summary: shopPatchSummary(req.body) })), platformController.patchShop);
router.patch('/shops/:id/whatsapp', ...guard, audited('shop.whatsapp', shopTarget), require('../controllers/whatsappController').platformUpdate);
router.patch('/shops/:id/ai', ...guard, audited('shop.ai', shopTarget), require('../controllers/aiController').platformQuota);
router.get('/ops', ...guard, platformController.ops);
router.get('/config', ...guard, platformController.getConfig);
router.put('/config', ...guard, audited('config.update', (req) => ({ targetType: 'config', changes: safeChanges(req.body) })), platformController.putConfig);
router.get('/notices', ...guard, platformController.listNotices);
router.post('/notices', ...guard, audited('notice.create', (req) => ({ targetType: 'notice', summary: `Aviso: ${String(req.body?.title || '').slice(0, 120)}` })), platformController.createNotice);
router.delete('/notices/:id', ...guard, audited('notice.delete', (req) => ({ targetType: 'notice', targetId: req.params.id })), platformController.deleteNotice);

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
router.post(
  '/accounts/:id/transfer-email',
  ...guard,
  audited('account.transfer_email', (req) => ({ targetType: 'account', targetId: req.params.id, summary: `E-mail da conta → ${String(req.body?.newEmail || '').trim().toLowerCase()}` })),
  admin.transferEmail
);
router.get('/subscriptions', ...guard, admin.subscriptions);
router.get('/ritual', ...guard, admin.ritual);
router.get('/emails', ...guard, admin.emails);
router.get('/audit', ...guard, admin.audit);
router.get('/errors', ...guard, admin.errors);

module.exports = router;
