/**
 * Tenant isolation helpers — keep every operational query shop-scoped.
 */
function requireShopId(shopId) {
  if (shopId == null || shopId === '') {
    const err = new Error('shopId required for tenant query');
    err.status = 400;
    err.code = 'SHOP_REQUIRED';
    throw err;
  }
  return shopId;
}

function tenantFilter(shopId, extra = {}) {
  return { shopId: requireShopId(shopId), ...extra };
}

function tenantById(shopId, id, extra = {}) {
  return tenantFilter(shopId, { _id: id, ...extra });
}

module.exports = { requireShopId, tenantFilter, tenantById };
