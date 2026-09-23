const kanbanService = require('../services/kanbanService');
const { serializeOrder } = require('../serializers');
const { wrap } = require('./helpers');

exports.getBoard = wrap(async (req, res) => {
  const board = await kanbanService.getKanban(req.shopId, req.membership);
  res.status(200).json(board);
});

exports.moveOrder = wrap(async (req, res) => {
  const order = await kanbanService.moveOrder(
    req.shopId,
    req.params.orderId,
    req.membership,
    req.auth.userId,
    req.body || {}
  );
  const { buildMoveWhatsAppSuggest } = require('../services/whatsappSuggest');
  const Sector = require('../models/Sector');
  const toSector = order.currentSectorId
    ? await Sector.findById(order.currentSectorId).lean()
    : null;
  const whatsappSuggest = await buildMoveWhatsAppSuggest(req.shopId, order, toSector).catch(
    () => null
  );
  res.status(200).json({
    ...serializeOrder(order),
    whatsappSuggest: whatsappSuggest || undefined,
  });
});

exports.moveOrderItem = wrap(async (req, res) => {
  const order = await kanbanService.moveOrderItem(
    req.shopId,
    req.params.orderId,
    req.params.itemId,
    req.membership,
    req.auth.userId,
    req.body || {}
  );
  const { buildMoveWhatsAppSuggest } = require('../services/whatsappSuggest');
  const Sector = require('../models/Sector');
  const toSectorId = req.body?.toSectorId;
  const toSector = toSectorId ? await Sector.findById(toSectorId).lean() : null;
  const whatsappSuggest =
    order.status === 'ready'
      ? await buildMoveWhatsAppSuggest(req.shopId, order, toSector).catch(() => null)
      : null;
  res.status(200).json({
    ...serializeOrder(order),
    whatsappSuggest: whatsappSuggest || undefined,
  });
});
