const Employee = require('../models/Employee');

async function listEmployees(shopId, query = {}) {
  const filter = { shopId };
  if (query.sectorId) filter.sectorId = query.sectorId;
  if (query.active === 'true' || query.active === true) filter.active = true;
  else if (query.active === 'false' || query.active === false) filter.active = false;
  return Employee.find(filter).sort({ name: 1 }).lean();
}

async function getEmployee(shopId, id) {
  const employee = await Employee.findOne({ _id: id, shopId }).lean();
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return employee;
}

async function createEmployee(shopId, data) {
  const employee = await Employee.create({
    shopId,
    name: data.name || data.nome,
    sectorId: data.sectorId || data.setorId || null,
    phone: data.phone || data.telefone || null,
    email: data.email || null,
    active: data.active != null ? Boolean(data.active) : data.ativo != null ? Boolean(data.ativo) : true,
  });
  return employee.toObject();
}

async function patchEmployee(shopId, id, updates) {
  const employee = await Employee.findOne({ _id: id, shopId });
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (updates.name != null || updates.nome != null) employee.name = updates.name || updates.nome;
  if (updates.sectorId != null || updates.setorId != null) {
    employee.sectorId = updates.sectorId || updates.setorId;
  }
  if (updates.phone != null || updates.telefone != null) {
    employee.phone = updates.phone || updates.telefone;
  }
  if (updates.email != null) employee.email = updates.email;
  if (updates.active != null || updates.ativo != null) {
    employee.active = updates.active != null ? Boolean(updates.active) : Boolean(updates.ativo);
  }
  await employee.save();
  return employee.toObject();
}

async function deleteEmployee(shopId, id) {
  const employee = await Employee.findOne({ _id: id, shopId });
  if (!employee) {
    const err = new Error('Employee not found');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  employee.active = false;
  await employee.save();
  return employee.toObject();
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  patchEmployee,
  deleteEmployee,
};
