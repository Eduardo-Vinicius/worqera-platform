const Client = require('../models/Client');

async function listClients(shopId, { q } = {}) {
  const filter = { shopId };
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { cpf: new RegExp(q, 'i') },
      { phone: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }
  return Client.find(filter).sort({ name: 1 }).lean();
}

async function createClient(shopId, data) {
  return Client.create({
    shopId,
    name: data.name,
    cpf: data.cpf || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || {},
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
  ['name', 'cpf', 'phone', 'email', 'address'].forEach((k) => {
    if (updates[k] != null) client[k] = updates[k];
  });
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
