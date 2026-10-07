const { effectiveItems } = require('./services/orderItems');
const { resolvePhotoUrl } = require('./services/storageService');

function idOf(doc) {
  if (!doc) return null;
  return String(doc._id || doc.id || '');
}

function serializeClient(client) {
  if (!client) return null;
  const id = idOf(client);
  const name = client.name || client.nome || '';
  const phone = client.phone || client.telefone || null;
  const address = client.address && typeof client.address === 'object' ? client.address : {};
  return {
    id,
    _id: client._id,
    shopId: client.shopId,
    name,
    phone,
    email: client.email || null,
    cpf: client.cpf || null,
    notes: client.notes || null,
    whatsappOptIn: Boolean(client.whatsappOptIn),
    address,
    // Flat PT aliases for current web forms
    nomeCompleto: name,
    telefone: phone,
    cep: address.cep || null,
    logradouro: address.logradouro || null,
    numero: address.numero || null,
    bairro: address.bairro || null,
    cidade: address.cidade || null,
    estado: address.estado || null,
    complemento: address.complemento || null,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function serializeOrderItem(it, { hidePrices = false } = {}) {
  return {
    id: it._id ? String(it._id) : undefined,
    shoeModel: it.shoeModel || '',
    brand: it.brand || '',
    services: (it.services || []).map((s) => ({
      id: s.id || null,
      name: s.name || '',
      ...(hidePrices ? {} : { price: Number(s.price) || 0 }),
    })),
    photos: (it.photos || []).map((p) => resolvePhotoUrl(p)).filter(Boolean),
    notes: it.notes || null,
    currentSectorId: it.currentSectorId
      ? String(it.currentSectorId._id || it.currentSectorId)
      : null,
    plannedSectorIds: Array.isArray(it.plannedSectorIds)
      ? it.plannedSectorIds.map((s) => String(s._id || s)).filter(Boolean)
      : [],
    sectorHistory: (it.sectorHistory || []).map(serializeSectorHistoryEntry).filter(Boolean),
  };
}

function serializeSectorHistoryEntry(h) {
  if (!h) return null;
  return {
    sectorId: h.sectorId ? String(h.sectorId._id || h.sectorId) : null,
    fromSectorId: h.fromSectorId ? String(h.fromSectorId._id || h.fromSectorId) : null,
    enteredAt: h.enteredAt || null,
    leftAt: h.leftAt || null,
    movedByUserId: h.movedByUserId ? String(h.movedByUserId._id || h.movedByUserId) : null,
    movedByName: h.movedByName || null,
    movedByEmail: h.movedByEmail || null,
    employeeId: h.employeeId ? String(h.employeeId._id || h.employeeId) : null,
    employeeName: h.employeeName || null,
    note: h.note || null,
    action: h.action || (h.note === 'created' ? 'create' : 'move'),
  };
}

function withoutMoney(warranty) {
  if (!warranty || typeof warranty !== 'object') return {};
  const { price, preco, amount, value, ...rest } = warranty;
  return rest;
}

function serializeOrder(order, { hidePrices = false } = {}) {
  if (!order) return null;
  const id = idOf(order);
  const code = order.code || order.codigo || '';
  const shoeModel = order.shoeModel || order.modeloTenis || '';
  const photos = Array.isArray(order.photos) ? order.photos : [];
  const photoUrls = photos.map((p) => resolvePhotoUrl(p)).filter(Boolean);
  const services = (Array.isArray(order.services) ? order.services : []).map((s) => ({
    id: s.id || null,
    name: s.name || s.nome || '',
    ...(hidePrices ? {} : { price: Number(s.price != null ? s.price : s.preco) || 0 }),
  }));
  const pricing = order.pricing || {};
  const total = pricing.total != null ? pricing.total : order.precoTotal || 0;
  const currentSectorId = order.currentSectorId
    ? String(order.currentSectorId._id || order.currentSectorId)
    : null;
  const clientId = order.clientId ? String(order.clientId._id || order.clientId) : null;
  const items = effectiveItems(order).map((it) => serializeOrderItem(it, { hidePrices }));
  const plannedSectorIds = Array.isArray(order.plannedSectorIds)
    ? order.plannedSectorIds.map((s) => String(s._id || s)).filter(Boolean)
    : [];

  return {
    id,
    _id: order._id,
    shopId: order.shopId,
    code,
    publicToken: order.publicToken || null,
    shoeModel,
    photos: photoUrls,
    ...(hidePrices
      ? {}
      : {
          pricing: {
            ...pricing,
            total,
          },
        }),
    services,
    items,
    itemCount: items.length,
    status: order.status,
    currentSectorId,
    plannedSectorIds,
    clientName: order.clientName || '',
    clientPhone: order.clientPhone || null,
    clientEmail: order.clientEmail || null,
    dueAt: order.dueAt || null,
    warranty: hidePrices ? withoutMoney(order.warranty) : order.warranty || {},
    garantia: hidePrices ? withoutMoney(order.warranty) : order.warranty || {},
    clientId,
    client: order.clientId && typeof order.clientId === 'object' ? serializeClient(order.clientId) : undefined,
    assigneeEmployeeId: order.assigneeEmployeeId || null,
    priority: order.priority || null,
    notes: order.notes || null,
    comments: Array.isArray(order.comments)
      ? order.comments
          .map((c) => ({
            id: String(c._id || c.id || ''),
            text: c.text || '',
            authorName: c.authorName || '',
            authorUserId: c.authorUserId ? String(c.authorUserId) : null,
            createdAt: c.createdAt || null,
          }))
          .filter((c) => c.text)
      : [],
    sectorHistory: (order.sectorHistory || []).map(serializeSectorHistoryEntry).filter(Boolean),
    sectorPath: Array.isArray(order.sectorPath)
      ? order.sectorPath.map((s) => String(s._id || s))
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveredAt: order.deliveredAt || null,
    deletedAt: order.deletedAt || null,
    reopenedAt: order.reopenedAt || null,
    photosPending: Boolean(
      order.photoNotify &&
        order.photoNotify.sent !== true &&
        Array.isArray(order.photoNotify.expected) &&
        order.photoNotify.expected.some((n) => Number(n) > 0)
    ),
    feedback: order.feedback?.score
      ? {
          score: order.feedback.score,
          comment: order.feedback.comment || '',
          tags: Array.isArray(order.feedback.tags) ? order.feedback.tags : [],
          createdAt: order.feedback.createdAt || null,
        }
      : null,
  };
}

function serializeEmployee(employee) {
  if (!employee) return null;
  const id = idOf(employee);
  return {
    id,
    _id: employee._id,
    shopId: employee.shopId,
    name: employee.name,
    phone: employee.phone || null,
    email: employee.email || null,
    active: employee.active !== false,
    sectorId: employee.sectorId || null,
    sectorIds: employee.sectorId ? [employee.sectorId] : employee.sectorIds || [],
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

function presentOrder(req, order) {
  const role = String(req?.membership?.role || '').toLowerCase();
  return serializeOrder(order, { hidePrices: role === 'sector' });
}

module.exports = {
  idOf,
  serializeClient,
  serializeOrder,
  presentOrder,
  serializeEmployee,
};
