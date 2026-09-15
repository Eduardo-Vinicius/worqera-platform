const clientService = require('../services/clientService');
const { serializeClient } = require('../serializers');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const result = await clientService.listClients(req.shopId, {
    q: req.query.q,
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  const data = (result.clients || result.data || result).map(serializeClient);
  res.status(200).json({
    clients: data,
    data,
    nextToken: result.nextToken || null,
    count: data.length,
  });
});

exports.create = wrap(async (req, res) => {
  const client = await clientService.createClient(req.shopId, req.body || {});
  const obj = client.toObject ? client.toObject() : client;
  res.status(201).json(serializeClient(obj));
});

exports.get = wrap(async (req, res) => {
  const client = await clientService.getClient(req.shopId, req.params.id);
  res.status(200).json(serializeClient(client));
});

exports.patch = wrap(async (req, res) => {
  const client = await clientService.patchClient(req.shopId, req.params.id, req.body || {});
  res.status(200).json(serializeClient(client));
});

exports.remove = wrap(async (req, res) => {
  const client = await clientService.deleteClient(req.shopId, req.params.id);
  res.status(200).json(serializeClient(client));
});
