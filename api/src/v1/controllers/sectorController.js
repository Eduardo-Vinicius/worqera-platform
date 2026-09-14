const sectorService = require('../services/sectorService');
const dashboardService = require('../services/dashboardService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const sectors = await sectorService.listSectors(req.shopId, { includeInactive });
  res.status(200).json({ sectors });
});

exports.stats = wrap(async (req, res) => {
  const includeOrders = req.query.includeOrders === 'true' || req.query.orders === '1';
  const data = await dashboardService.getSetoresStats(req.shopId, { includeOrders });
  res.status(200).json(data);
});

exports.create = wrap(async (req, res) => {
  const sector = await sectorService.createSector(req.shopId, req.body || {});
  res.status(201).json(sector);
});

exports.patch = wrap(async (req, res) => {
  const sector = await sectorService.patchSector(req.shopId, req.params.id, req.body || {});
  res.status(200).json(sector);
});

exports.remove = wrap(async (req, res) => {
  const sector = await sectorService.deleteSector(req.shopId, req.params.id);
  res.status(200).json(sector);
});

exports.reorder = wrap(async (req, res) => {
  const sectors = await sectorService.reorderSectors(req.shopId, req.body);
  res.status(200).json({ sectors });
});
