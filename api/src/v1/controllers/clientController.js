const clientService = require('../services/clientService');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const clients = await clientService.listClients(req.shopId, { q: req.query.q });
  res.status(200).json({ clients });
});

exports.create = wrap(async (req, res) => {
  const client = await clientService.createClient(req.shopId, req.body || {});
  res.status(201).json(client);
});

exports.get = wrap(async (req, res) => {
  const client = await clientService.getClient(req.shopId, req.params.id);
  res.status(200).json(client);
});

exports.patch = wrap(async (req, res) => {
  const client = await clientService.patchClient(req.shopId, req.params.id, req.body || {});
  res.status(200).json(client);
});

exports.remove = wrap(async (req, res) => {
  const client = await clientService.deleteClient(req.shopId, req.params.id);
  res.status(200).json(client);
});
