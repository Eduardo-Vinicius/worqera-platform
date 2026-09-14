const employeeService = require('../services/employeeService');
const { serializeEmployee } = require('../serializers');
const { wrap } = require('./helpers');

exports.list = wrap(async (req, res) => {
  const employees = await employeeService.listEmployees(req.shopId, req.query);
  res.status(200).json({ employees: employees.map(serializeEmployee), data: employees.map(serializeEmployee) });
});

exports.create = wrap(async (req, res) => {
  const employee = await employeeService.createEmployee(req.shopId, req.body || {});
  res.status(201).json(serializeEmployee(employee));
});

exports.get = wrap(async (req, res) => {
  const employee = await employeeService.getEmployee(req.shopId, req.params.id);
  res.status(200).json(serializeEmployee(employee));
});

exports.patch = wrap(async (req, res) => {
  const employee = await employeeService.patchEmployee(req.shopId, req.params.id, req.body || {});
  res.status(200).json(serializeEmployee(employee));
});

exports.remove = wrap(async (req, res) => {
  const employee = await employeeService.deleteEmployee(req.shopId, req.params.id);
  res.status(200).json(serializeEmployee(employee));
});
