const accessoryCatalogService = require('../services/accessoryCatalogService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const accessories = await accessoryCatalogService.listAccessories(req.shopId);
  res.status(200).json({ accessories });
});

exports.create = wrap(async (req, res) => {
  const accessory = await accessoryCatalogService.createAccessory(req.shopId, req.body || {});
  res.status(201).json(accessory);
});

exports.patch = wrap(async (req, res) => {
  const accessory = await accessoryCatalogService.patchAccessory(
    req.shopId,
    req.params.id,
    req.body || {}
  );
  res.status(200).json(accessory);
});

exports.remove = wrap(async (req, res) => {
  const result = await accessoryCatalogService.deleteAccessory(req.shopId, req.params.id);
  res.status(200).json(result);
});
