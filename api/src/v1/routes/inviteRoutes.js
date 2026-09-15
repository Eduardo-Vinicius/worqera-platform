const express = require('express');
const shopController = require('../controllers/shopController');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

const inviteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyFn: (req) => `invite:${req.ip || 'ip'}`,
});

router.get('/:token', inviteLimit, shopController.getInvite);
router.post('/:token/accept', inviteLimit, shopController.acceptInvite);

module.exports = router;
