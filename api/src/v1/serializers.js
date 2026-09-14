function idOf(doc) {
  if (!doc) return null;
  return String(doc._id || doc.id || '');
}

function serializeClient(client) {
  if (!client) return null;
  const id = idOf(client);
  const name = client.name || client.nome || '';
  const phone = client.phone || client.telefone || null;
  return {
    ...client,
    id,
    _id: client._id,
    name,
    phone,
    nome: name,
    telefone: phone,
    nomeCompleto: name,
  };
}

function serializeOrder(order) {
  if (!order) return null;
  const id = idOf(order);
  const code = order.code || order.codigo || '';
  const shoeModel = order.shoeModel || order.modeloTenis || '';
  const photos = Array.isArray(order.photos) ? order.photos : [];
  const fotoUrls = photos
    .map((p) => (typeof p === 'string' ? p : p?.url))
    .filter(Boolean);
  const services = Array.isArray(order.services) ? order.services : [];
  const servicos = services.map((s) => ({
    id: s.id || null,
    nome: s.name || s.nome || '',
    preco: Number(s.price != null ? s.price : s.preco) || 0,
  }));
  const pricing = order.pricing || {};
  const total = pricing.total != null ? pricing.total : order.precoTotal || 0;
  const currentSectorId = order.currentSectorId
    ? String(order.currentSectorId._id || order.currentSectorId)
    : null;

  return {
    ...order,
    id,
    _id: order._id,
    code,
    codigo: code,
    shoeModel,
    modeloTenis: shoeModel,
    photos,
    fotos: fotoUrls,
    pricing,
    precoTotal: total,
    services,
    servicos,
    currentSectorId,
    setorAtual: currentSectorId,
    dueAt: order.dueAt || null,
    dataPrevistaEntrega: order.dueAt || null,
    clientId: order.clientId || null,
    clienteId: order.clientId ? String(order.clientId._id || order.clientId) : null,
  };
}

function serializeEmployee(employee) {
  if (!employee) return null;
  const id = idOf(employee);
  return {
    ...employee,
    id,
    _id: employee._id,
    nome: employee.name,
    telefone: employee.phone,
    ativo: employee.active,
  };
}

module.exports = {
  idOf,
  serializeClient,
  serializeOrder,
  serializeEmployee,
};
