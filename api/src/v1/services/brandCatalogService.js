const BrandCatalog = require('../models/BrandCatalog');

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
  return BrandCatalog.findOne(query).lean();
}

async function listBrands(shopId) {
  return BrandCatalog.find({ shopId }).sort({ sortOrder: 1, name: 1 }).lean();
}

async function createBrand(shopId, data) {
  const name = String(data?.name || '').trim();
  if (!name) throw fail(400, 'VALIDATION_ERROR', 'Nome é obrigatório');
  const existing = await findByName(shopId, name);
  if (existing) return existing;
  const sortOrder =
    data?.sortOrder != null
      ? Number(data.sortOrder) || 0
      : await BrandCatalog.countDocuments({ shopId });
  return BrandCatalog.create({
    shopId,
    name,
    active: data?.active !== false,
    sortOrder,
  });
}

async function patchBrand(shopId, id, updates) {
  const brand = await BrandCatalog.findOne({ _id: id, shopId });
  if (!brand) throw fail(404, 'NOT_FOUND', 'Marca não encontrada');
  if (updates.name != null) {
    const name = String(updates.name || '').trim();
    if (!name) throw fail(400, 'VALIDATION_ERROR', 'Nome é obrigatório');
    if (await findByName(shopId, name, brand._id)) {
      throw fail(409, 'DUPLICATE', 'Já existe uma marca com esse nome');
    }
    brand.name = name;
  }
  if (updates.active != null) brand.active = Boolean(updates.active);
  if (updates.sortOrder != null) brand.sortOrder = Number(updates.sortOrder) || 0;
  await brand.save();
  return brand.toObject();
}

async function deleteBrand(shopId, id) {
  const brand = await BrandCatalog.findOneAndDelete({ _id: id, shopId }).lean();
  if (!brand) throw fail(404, 'NOT_FOUND', 'Marca não encontrada');
  return { deleted: true, id: String(brand._id) };
}

module.exports = { listBrands, createBrand, patchBrand, deleteBrand };
