const Sector = require('../models/Sector');
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
  ['name', 'color', 'order', 'active', 'isTerminal', 'notifyEmailOnEnter'].forEach((k) => {
    if (updates[k] != null) sector[k] = updates[k];
  });
  if (updates.slug) sector.slug = slugify(updates.slug);
  await sector.save();
  return sector.toObject();
}

async function deleteSector(shopId, id) {
  const sector = await Sector.findOneAndUpdate(
    { _id: id, shopId },
    { $set: { active: false } },
    { new: true }
  ).lean();
  if (!sector) {
    const err = new Error('Sector not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return sector;
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
