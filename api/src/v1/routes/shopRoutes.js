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

module.exports = router;
