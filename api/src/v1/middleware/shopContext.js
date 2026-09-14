const mongoose = require('mongoose');
const Membership = require('../models/Membership');
const Shop = require('../models/Shop');
const { sendError } = require('./errors');

async function shopContext(req, res, next) {
  try {
    if (!req.auth?.userId) {
      return sendError(res, 401, {
        title: 'Unauthorized',
        detail: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const memberships = await Membership.find({
      userId: req.auth.userId,
      active: true,
    }).lean();

    if (!memberships.length) {
      return sendError(res, 403, {
        title: 'Forbidden',
        detail: 'No active shop membership',
        code: 'FORBIDDEN',
      });
    }

    const headerShop =
      req.headers['x-worqera-shop'] || req.headers['X-Worqera-Shop'] || null;
    let membership = null;

    if (headerShop) {
      if (!mongoose.Types.ObjectId.isValid(headerShop)) {
        return sendError(res, 400, {
          title: 'Bad Request',
          detail: 'Invalid X-Worqera-Shop header',
          code: 'VALIDATION_ERROR',
        });
      }
      membership = memberships.find((m) => String(m.shopId) === String(headerShop));
      if (!membership) {
        return sendError(res, 403, {
          title: 'Forbidden',
          detail: 'No membership for requested shop',
          code: 'FORBIDDEN',
        });
      }
    } else if (memberships.length === 1) {
      membership = memberships[0];
    } else {
      return sendError(res, 400, {
        title: 'Shop Required',
        detail: 'X-Worqera-Shop header required when user has multiple memberships',
        code: 'SHOP_REQUIRED',
      });
    }

    const shop = await Shop.findById(membership.shopId).lean();
    if (!shop || shop.status === 'suspended') {
      return sendError(res, 403, {
        title: 'Forbidden',
        detail: 'Shop unavailable',
        code: 'FORBIDDEN',
      });
    }

    req.shop = shop;
    req.membership = membership;
    req.shopId = membership.shopId;
    return next();
  } catch (err) {
    console.error('[shopContext]', err);
    return sendError(res, 500, {
      title: 'Internal Server Error',
      detail: err.message,
      code: 'INTERNAL_ERROR',
    });
  }
}

module.exports = { shopContext };
