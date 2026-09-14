const ServiceCatalog = require('../models/ServiceCatalog');

async function listServices(shopId) {
  return ServiceCatalog.find({ shopId }).sort({ sortOrder: 1, name: 1 }).lean();
}

async function createService(shopId, data) {
  return ServiceCatalog.create({
    shopId,
    name: data.name,
    defaultPrice: data.defaultPrice || 0,
    sectorPathHint: data.sectorPathHint || [],
    active: data.active != null ? data.active : true,
    sortOrder: data.sortOrder || 0,
  });
}

async function patchService(shopId, id, updates) {
  const service = await ServiceCatalog.findOne({ _id: id, shopId });
  if (!service) {
    const err = new Error('Service not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  ['name', 'defaultPrice', 'sectorPathHint', 'active', 'sortOrder'].forEach((k) => {
    if (updates[k] != null) service[k] = updates[k];
  });
  await service.save();
  return service.toObject();
}

async function deleteService(shopId, id) {
  const service = await ServiceCatalog.findOneAndUpdate(
    { _id: id, shopId },
    { $set: { active: false } },
    { new: true }
  ).lean();
  if (!service) {
    const err = new Error('Service not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return service;
}

module.exports = { listServices, createService, patchService, deleteService };
