const brandCatalogService = require('../services/brandCatalogService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const brands = await brandCatalogService.listBrands(req.shopId);
  res.status(200).json({ brands });
});

exports.create = wrap(async (req, res) => {
  const brand = await brandCatalogService.createBrand(req.shopId, req.body || {});
  res.status(201).json(brand);
});

exports.patch = wrap(async (req, res) => {
  const brand = await brandCatalogService.patchBrand(req.shopId, req.params.id, req.body || {});
  res.status(200).json(brand);
});

exports.remove = wrap(async (req, res) => {
  const result = await brandCatalogService.deleteBrand(req.shopId, req.params.id);
  res.status(200).json(result);
});
