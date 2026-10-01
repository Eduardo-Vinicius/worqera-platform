const Sector = require('../models/Sector');
const Order = require('../models/Order');
const ServiceCatalog = require('../models/ServiceCatalog');
const Membership = require('../models/Membership');
const Invite = require('../models/Invite');
const { slugify } = require('./authService');

async function listSectors(shopId, { includeInactive = false } = {}) {
  const filter = { shopId };
  if (!includeInactive) filter.active = true;
  return Sector.find(filter).sort({ order: 1 }).lean();
}

async function createSector(shopId, data) {
  const slug = slugify(data.slug || data.name);
  const max = await Sector.findOne({ shopId }).sort({ order: -1 }).lean();
  try {
    return await Sector.create({
      shopId,
      name: data.name,
      slug,
      order: data.order != null ? data.order : (max?.order || 0) + 1,
      color: data.color || '#2196F3',
      active: data.active != null ? data.active : true,
      isTerminal: !!data.isTerminal,
      notifyEmailOnEnter:
        data.notifyEmailOnEnter != null ? !!data.notifyEmailOnEnter : !!data.isTerminal,
      showOnPublic: data.showOnPublic != null ? !!data.showOnPublic : true,
    });
  } catch (e) {
    if (e.code === 11000) {
      const err = new Error('Sector slug conflict');
      err.status = 409;
      err.code = 'CONFLICT';
      throw err;
    }
    throw e;
  }
}

async function patchSector(shopId, id, updates) {
  const sector = await Sector.findOne({ _id: id, shopId });
  if (!sector) {
    const err = new Error('Sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  ['name', 'color', 'order', 'active', 'isTerminal', 'notifyEmailOnEnter', 'showOnPublic'].forEach(
    (k) => {
      if (updates[k] != null) sector[k] = updates[k];
    }
  );
  if (updates.slug) sector.slug = slugify(updates.slug);
  await sector.save();
  return sector.toObject();
}

async function deleteSector(shopId, id) {
  const sector = await Sector.findOne({ _id: id, shopId });
  if (!sector) {
    const err = new Error('Sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const inUse = await Order.countDocuments({
    shopId,
    status: { $in: ['open', 'in_progress', 'ready'] },
    $or: [{ currentSectorId: sector._id }, { 'items.currentSectorId': sector._id }],
  });
  if (inUse > 0) {
    const err = new Error('Ainda tem pedidos nesta coluna. Mova eles antes de apagar.');
    err.status = 409;
    err.code = 'SECTOR_IN_USE';
    throw err;
  }

  await ServiceCatalog.updateMany({ shopId }, { $pull: { sectorPathHint: sector._id } });
  await Membership.updateMany({ shopId }, { $pull: { sectorIds: sector._id } });
  await Invite.updateMany({ shopId }, { $pull: { sectorIds: sector._id } });
  await sector.deleteOne();
  return { deleted: true, id: String(sector._id) };
}

async function reorderSectors(shopId, items) {
  if (!Array.isArray(items)) {
    const err = new Error('Body must be [{id, order}]');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  await Promise.all(
    items.map((item) =>
      Sector.updateOne({ _id: item.id, shopId }, { $set: { order: item.order } })
    )
  );
  return listSectors(shopId, { includeInactive: true });
}

module.exports = {
  listSectors,
  createSector,
  patchSector,
  deleteSector,
  reorderSectors,
};
