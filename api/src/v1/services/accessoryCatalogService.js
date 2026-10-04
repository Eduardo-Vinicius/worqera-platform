const AccessoryCatalog = require('../models/AccessoryCatalog');

function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findByName(shopId, name, exceptId) {
  const query = {
    shopId,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
  };
  if (exceptId) query._id = { $ne: exceptId };
  return AccessoryCatalog.findOne(query).lean();
}

async function listAccessories(shopId) {
  return AccessoryCatalog.find({ shopId }).sort({ sortOrder: 1, name: 1 }).lean();
}

async function createAccessory(shopId, data) {
  const name = String(data?.name || '').trim();
  if (!name) throw fail(400, 'VALIDATION_ERROR', 'Nome é obrigatório');
  if (await findByName(shopId, name)) {
    throw fail(409, 'DUPLICATE', 'Já existe um acessório com esse nome');
  }
  const sortOrder =
    data?.sortOrder != null
      ? Number(data.sortOrder) || 0
      : await AccessoryCatalog.countDocuments({ shopId });
  return AccessoryCatalog.create({
    shopId,
    name,
    active: data?.active !== false,
    sortOrder,
  });
}

async function patchAccessory(shopId, id, updates) {
  const accessory = await AccessoryCatalog.findOne({ _id: id, shopId });
  if (!accessory) throw fail(404, 'NOT_FOUND', 'Acessório não encontrado');
  if (updates.name != null) {
    const name = String(updates.name || '').trim();
    if (!name) throw fail(400, 'VALIDATION_ERROR', 'Nome é obrigatório');
    if (await findByName(shopId, name, accessory._id)) {
      throw fail(409, 'DUPLICATE', 'Já existe um acessório com esse nome');
    }
    accessory.name = name;
  }
  if (updates.active != null) accessory.active = Boolean(updates.active);
  if (updates.sortOrder != null) accessory.sortOrder = Number(updates.sortOrder) || 0;
  await accessory.save();
  return accessory.toObject();
}

async function deleteAccessory(shopId, id) {
  const accessory = await AccessoryCatalog.findOneAndDelete({ _id: id, shopId }).lean();
  if (!accessory) throw fail(404, 'NOT_FOUND', 'Acessório não encontrado');
  return { deleted: true, id: String(accessory._id) };
}

module.exports = {
  listAccessories,
  createAccessory,
  patchAccessory,
  deleteAccessory,
};
