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

function seesMoney(req) {
  const role = String(req.membership?.role || '').toLowerCase();
  return role === 'owner' || role === 'admin';
}

exports.get = wrap(async (req, res) => {
  const client = await clientService.getClient(req.shopId, req.params.id);
  // History + numbers inline: older app builds read `recentOrders` from this route.
  const overview = await require('../services/crmService')
    .clientOverview(req.shopId, req.params.id, { showMoney: seesMoney(req) })
    .catch(() => null);
  res.status(200).json({
    ...serializeClient(client),
    ...(overview ? { stats: overview.stats, recentOrders: overview.orders, orders: overview.orders } : {}),
  });
});

exports.overview = wrap(async (req, res) => {
  const overview = await require('../services/crmService').clientOverview(req.shopId, req.params.id, { showMoney: seesMoney(req) });
  res.status(200).json(overview);
});

exports.seesMoney = seesMoney;

exports.patch = wrap(async (req, res) => {
  const client = await clientService.patchClient(req.shopId, req.params.id, req.body || {});
  res.status(200).json(serializeClient(client));
});

exports.remove = wrap(async (req, res) => {
  const client = await clientService.deleteClient(req.shopId, req.params.id);
  res.status(200).json(serializeClient(client));
});
