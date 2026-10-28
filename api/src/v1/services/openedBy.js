const mongoose = require('mongoose');
const Employee = require('../models/Employee');

function badRequest(code, message) {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

function wantsOpenedBy(data) {
  return Boolean(data) && (Object.prototype.hasOwnProperty.call(data, 'openedByEmployeeId') || Object.prototype.hasOwnProperty.call(data, 'abertoPor'));
}

/**
 * "Aberto por" on the order. Forms that show the field always send the key, so an
 * empty value from them is a real omission. Callers that never send it (older app
 * builds, imports, quote prefill) keep working and count as "Não informado".
 *
 * @returns {Promise<{ id: ObjectId|null, name: string } | undefined>} undefined = not sent
 */
async function resolveOpenedBy(shopId, data) {
  if (!wantsOpenedBy(data)) return undefined;
  const raw = data.openedByEmployeeId ?? data.abertoPor ?? null;
  const id = raw ? String(raw).trim() : '';
  if (!id) {
    const attendants = await Employee.countDocuments({ shopId, active: true, attends: true });
    if (attendants > 0) throw badRequest('OPENED_BY_REQUIRED', 'Escolha quem abriu o pedido');
    return { id: null, name: '' };
  }
  if (!mongoose.isValidObjectId(id)) throw badRequest('INVALID_OPENED_BY', 'Funcionário inválido');
  const employee = await Employee.findOne({ _id: id, shopId, active: true }).select('name').lean();
  if (!employee) throw badRequest('INVALID_OPENED_BY', 'Funcionário não encontrado ou inativo');
  return { id: employee._id, name: employee.name };
}

module.exports = { resolveOpenedBy, wantsOpenedBy };
