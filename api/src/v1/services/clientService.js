const Client = require('../models/Client');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function accentPattern(term) {
  const classes = {
    a: '[aáàâãäAÁÀÂÃÄ]',
    e: '[eéèêëEÉÈÊË]',
    i: '[iíìîïIÍÌÎÏ]',
    o: '[oóòôõöOÓÒÔÕÖ]',
    u: '[uúùûüUÚÙÛÜ]',
    c: '[cçCÇ]',
    n: '[nñNÑ]',
  };
  return Array.from(String(term))
    .map((ch) => {
      const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      return classes[base] || escapeRegex(ch);
    })
    .join('');
}

function digitsFlexPattern(term) {
  const digits = String(term).replace(/\D/g, '');
  if (digits.length < 3) return null;
  return digits.split('').map((digit) => escapeRegex(digit)).join('\\D*');
}

async function listClients(shopId, { q, limit, cursor } = {}) {
  const filter = { shopId };
  if (q) {
    const term = String(q).trim();
    if (term) {
      const or = [
        { name: new RegExp(accentPattern(term), 'i') },
        { email: new RegExp(escapeRegex(term), 'i') },
      ];
      const flex = digitsFlexPattern(term);
      if (flex) {
        or.push({ phone: new RegExp(flex) }, { cpf: new RegExp(flex) });
      } else {
        const plain = new RegExp(escapeRegex(term), 'i');
        or.push({ phone: plain }, { cpf: plain });
      }
      filter.$or = or;
    }
  }

  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 200);
  if (cursor) {
    filter._id = { ...(filter._id || {}), $lt: cursor };
  }

  const clients = await Client.find(filter)
    .sort({ _id: -1 })
    .limit(pageSize + 1)
    .lean();

  let nextToken = null;
  let page = clients;
  if (clients.length > pageSize) {
    page = clients.slice(0, pageSize);
    nextToken = String(page[page.length - 1]._id);
  }

  return { data: page, clients: page, nextToken, count: page.length };
}

async function createClient(shopId, data) {
  const address =
    data.address ||
    data.endereco ||
    (data.cep || data.logradouro
      ? {
          cep: data.cep,
          logradouro: data.logradouro,
          numero: data.numero,
          bairro: data.bairro,
          cidade: data.cidade,
          estado: data.estado,
          complemento: data.complemento,
        }
      : {});

  return Client.create({
    shopId,
    name: data.name || data.nome || data.nomeCompleto,
    cpf: data.cpf || null,
    phone: data.phone || data.telefone || null,
    email: data.email || null,
    whatsappOptIn: Boolean(data.whatsappOptIn),
    address,
  });
}

async function getClient(shopId, id) {
  const client = await Client.findOne({ _id: id, shopId }).lean();
  if (!client) {
    const err = new Error('Client not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return client;
}

async function patchClient(shopId, id, updates) {
  const client = await Client.findOne({ _id: id, shopId });
  if (!client) {
    const err = new Error('Client not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const name = updates.name || updates.nome || updates.nomeCompleto;
  if (name != null) client.name = name;
  if (updates.cpf != null) client.cpf = updates.cpf || null;
  if (updates.phone != null || updates.telefone != null) {
    client.phone = updates.phone || updates.telefone || null;
  }
  if (updates.email != null) client.email = updates.email || null;
  if (updates.whatsappOptIn != null) client.whatsappOptIn = Boolean(updates.whatsappOptIn);
  if (updates.notes != null || updates.observacoes != null) {
    client.notes = updates.notes || updates.observacoes || null;
  }

  const hasAddressField =
    updates.address != null ||
    updates.cep != null ||
    updates.logradouro != null ||
    updates.numero != null ||
    updates.bairro != null ||
    updates.cidade != null ||
    updates.estado != null ||
    updates.complemento != null;

  if (hasAddressField) {
    const prev = client.address && typeof client.address === 'object' ? client.address : {};
    const next = updates.address && typeof updates.address === 'object' ? updates.address : {};
    client.address = {
      ...prev,
      ...next,
      ...(updates.cep != null ? { cep: updates.cep } : {}),
      ...(updates.logradouro != null ? { logradouro: updates.logradouro } : {}),
      ...(updates.numero != null ? { numero: updates.numero } : {}),
      ...(updates.bairro != null ? { bairro: updates.bairro } : {}),
      ...(updates.cidade != null ? { cidade: updates.cidade } : {}),
      ...(updates.estado != null ? { estado: updates.estado } : {}),
      ...(updates.complemento != null ? { complemento: updates.complemento } : {}),
    };
    client.markModified('address');
  }

  await client.save();
  return client.toObject();
}

async function deleteClient(shopId, id) {
  const result = await Client.findOneAndDelete({ _id: id, shopId }).lean();
  if (!result) {
    const err = new Error('Client not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return result;
}

module.exports = { listClients, createClient, getClient, patchClient, deleteClient };
