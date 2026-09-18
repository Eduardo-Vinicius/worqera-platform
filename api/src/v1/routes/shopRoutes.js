const express = require('express');
const shopController = require('../controllers/shopController');
const { auth } = require('../middleware/auth');
const { shopContext } = require('../middleware/shopContext');
const { subscriptionGate } = require('../middleware/subscriptionGate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();
const guard = [auth, shopContext, subscriptionGate];

router.get('/current', ...guard, shopController.getCurrent);
router.patch(
  '/current',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.patchCurrent
);
router.post(
  '/current/logo',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.uploadLogoMiddleware,
  shopController.uploadLogo
);
router.post(
  '/current/seed-catalog',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.seedCatalog
);
router.get(
  '/current/members',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.listMembers
);
router.post(
  '/current/members',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.addMember
);
router.patch(
  '/current/members/:id',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.patchMember
);
router.post(
  '/current/members/:id/reset-password',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.resetMemberPassword
);
router.post(
  '/current/invites',
  ...guard,
  requireRole('owner', 'admin'),
  shopController.createInvite
);

module.exports = router;
