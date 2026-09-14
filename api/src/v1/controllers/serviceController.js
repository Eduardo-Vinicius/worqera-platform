const serviceCatalogService = require('../services/serviceCatalogService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const services = await serviceCatalogService.listServices(req.shopId);
  res.status(200).json({ services });
});

exports.create = wrap(async (req, res) => {
  const service = await serviceCatalogService.createService(req.shopId, req.body || {});
  res.status(201).json(service);
});

exports.patch = wrap(async (req, res) => {
  const service = await serviceCatalogService.patchService(
    req.shopId,
    req.params.id,
    req.body || {}
  );
  res.status(200).json(service);
});

exports.remove = wrap(async (req, res) => {
  const service = await serviceCatalogService.deleteService(req.shopId, req.params.id);
  res.status(200).json(service);
});
